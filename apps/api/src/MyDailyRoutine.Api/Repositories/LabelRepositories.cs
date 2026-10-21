using Microsoft.EntityFrameworkCore;
using MyDailyRoutine.Api.Data;
using MyDailyRoutine.Api.Dtos;
using MyDailyRoutine.Api.Infrastructure;
using MyDailyRoutine.Api.Models;

namespace MyDailyRoutine.Api.Repositories;

public interface ILabelRepository<T> where T : class, ILabel
{
    Task<T?> FindAsync(Guid userId, Guid id, CancellationToken ct);
    Task<T?> FindByNameAsync(Guid userId, string normalized, CancellationToken ct);
    Task<IReadOnlyList<LabelSummaryDto>> ListAsync(Guid userId, string search, int limit, CancellationToken ct);
    Task<T> InsertAsync(T label, bool returnExisting, CancellationToken ct);
    Task SaveAsync(CancellationToken ct);
    Task DeleteAsync(T label, CancellationToken ct);
}
public interface ICategoryRepository : ILabelRepository<Category>;
public interface ITagRepository : ILabelRepository<Tag>;

public abstract class LabelRepository<T>(AppDbContext db) : ILabelRepository<T> where T : class, ILabel
{
    protected AppDbContext Db { get; } = db;
    public Task<T?> FindAsync(Guid userId, Guid id, CancellationToken ct) =>
        Db.Set<T>().SingleOrDefaultAsync(x => x.UserId == userId && x.Id == id, ct);
    public Task<T?> FindByNameAsync(Guid userId, string normalized, CancellationToken ct) =>
        Db.Set<T>().SingleOrDefaultAsync(x => x.UserId == userId && x.NormalizedName == normalized, ct);
    public abstract Task<IReadOnlyList<LabelSummaryDto>> ListAsync(Guid userId, string search, int limit, CancellationToken ct);
    protected IQueryable<T> Filter(Guid userId, string search, int limit) => Db.Set<T>().AsNoTracking()
        .Where(x => x.UserId == userId && x.NormalizedName.Contains(search))
        .OrderByDescending(x => x.NormalizedName.StartsWith(search)).ThenBy(x => x.NormalizedName).Take(limit);
    public async Task<T> InsertAsync(T label, bool returnExisting, CancellationToken ct)
    {
        Db.Set<T>().Add(label);
        try { await Db.SaveChangesAsync(ct); return label; }
        catch (DbUpdateException ex) when (DatabaseErrors.IsUnique(ex))
        {
            Db.Entry(label).State = EntityState.Detached;
            if (returnExisting && await FindByNameAsync(label.UserId, label.NormalizedName, ct) is { } existing) return existing;
            throw new ConflictException("A label with that name already exists.");
        }
    }
    public async Task SaveAsync(CancellationToken ct)
    {
        try { await Db.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (DatabaseErrors.IsUnique(ex)) { throw new ConflictException("A label with that name already exists."); }
    }
    public abstract Task DeleteAsync(T label, CancellationToken ct);
}
public sealed class CategoryRepository(AppDbContext db) : LabelRepository<Category>(db), ICategoryRepository
{
    public override async Task<IReadOnlyList<LabelSummaryDto>> ListAsync(Guid userId, string search, int limit, CancellationToken ct) =>
        await Filter(userId, search, limit).Select(x => new LabelSummaryDto(x.Id, x.Name, x.Color,
            Db.Tasks.Count(t => t.UserId == userId && t.CategoryId == x.Id))).ToListAsync(ct);
    public override async Task DeleteAsync(Category label, CancellationToken ct)
    {
        foreach (var task in await Db.Tasks.Where(x => x.UserId == label.UserId && x.CategoryId == label.Id).ToListAsync(ct)) task.CategoryId = null;
        Db.Categories.Remove(label);
        await Db.SaveChangesAsync(ct);
    }
}
public sealed class TagRepository(AppDbContext db) : LabelRepository<Tag>(db), ITagRepository
{
    public override async Task<IReadOnlyList<LabelSummaryDto>> ListAsync(Guid userId, string search, int limit, CancellationToken ct) =>
        await Filter(userId, search, limit).Select(x => new LabelSummaryDto(x.Id, x.Name, x.Color,
            Db.TaskTags.Count(t => t.UserId == userId && t.TagId == x.Id))).ToListAsync(ct);
    public override async Task DeleteAsync(Tag label, CancellationToken ct)
    {
        Db.TaskTags.RemoveRange(await Db.TaskTags.Where(x => x.UserId == label.UserId && x.TagId == label.Id).ToListAsync(ct));
        Db.Tags.Remove(label);
        await Db.SaveChangesAsync(ct);
    }
}
