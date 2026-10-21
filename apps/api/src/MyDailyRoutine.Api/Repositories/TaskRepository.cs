using Microsoft.EntityFrameworkCore;
using MyDailyRoutine.Api.Data;
using MyDailyRoutine.Api.Dtos;
using MyDailyRoutine.Api.Models;
using TaskStatus = MyDailyRoutine.Api.Models.TaskStatus;

namespace MyDailyRoutine.Api.Repositories;

public interface ITaskRepository
{
    Task<IReadOnlyList<TaskItem>> ListAsync(Guid userId, TaskQuery filter, DateOnly today, CancellationToken ct);
    Task<TaskItem?> FindAsync(Guid userId, Guid id, CancellationToken ct);
    Task<int> NextSortOrderAsync(Guid userId, DateOnly date, CancellationToken ct);
    Task AddAsync(TaskItem task, CancellationToken ct);
    Task SaveAsync(CancellationToken ct);
    Task DeleteAsync(TaskItem task, CancellationToken ct);
}
public sealed class TaskRepository(AppDbContext db) : ITaskRepository
{
    private IQueryable<TaskItem> Loaded => db.Tasks.Include(x => x.Category).Include(x => x.TaskTags).ThenInclude(x => x.Tag);
    public Task<TaskItem?> FindAsync(Guid userId, Guid id, CancellationToken ct) => Loaded.SingleOrDefaultAsync(x => x.UserId == userId && x.Id == id, ct);
    public async Task<IReadOnlyList<TaskItem>> ListAsync(Guid userId, TaskQuery filter, DateOnly today, CancellationToken ct)
    {
        var query = Loaded.AsNoTracking().Where(x => x.UserId == userId);
        if (filter.Date is { } date) query = query.Where(x => x.PlannedDate == date);
        else if (filter.From.HasValue || filter.To.HasValue)
        {
            if (filter.From is { } from) query = query.Where(x => x.PlannedDate >= from);
            if (filter.To is { } to) query = query.Where(x => x.PlannedDate <= to);
        }
        else if (filter.Overdue) query = query.Where(x => x.PlannedDate < today && x.Status != TaskStatus.Done);
        else if (!filter.All) query = query.Where(x => x.PlannedDate == today);
        if (filter.Status is { } status) query = query.Where(x => x.Status == status);
        if (filter.CategoryId is { } category) query = query.Where(x => x.CategoryId == category);
        if (!string.IsNullOrWhiteSpace(filter.Tag))
        {
            var tag = filter.Tag.Trim().ToLowerInvariant();
            query = query.Where(x => x.TaskTags.Any(t => t.UserId == userId && t.Tag.NormalizedName == tag));
        }
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLowerInvariant();
            query = query.Where(x => x.Name.ToLower().Contains(search) || (x.Description != null && x.Description.ToLower().Contains(search)));
        }
        return await query.OrderBy(x => x.PlannedDate).ThenBy(x => x.StartTime == null).ThenBy(x => x.StartTime)
            .ThenBy(x => x.SortOrder).ThenBy(x => x.CreatedAt).ToListAsync(ct);
    }
    public async Task<int> NextSortOrderAsync(Guid userId, DateOnly date, CancellationToken ct) =>
        (await db.Tasks.Where(x => x.UserId == userId && x.PlannedDate == date).MaxAsync(x => (int?)x.SortOrder, ct) ?? 0) + 1;
    public async Task AddAsync(TaskItem task, CancellationToken ct) { db.Tasks.Add(task); await db.SaveChangesAsync(ct); }
    public async Task SaveAsync(CancellationToken ct) => await db.SaveChangesAsync(ct);
    public async Task DeleteAsync(TaskItem task, CancellationToken ct) { db.Tasks.Remove(task); await db.SaveChangesAsync(ct); }
}
