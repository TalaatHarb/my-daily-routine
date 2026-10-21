using MyDailyRoutine.Api.Dtos;
using MyDailyRoutine.Api.Infrastructure;
using MyDailyRoutine.Api.Models;
using MyDailyRoutine.Api.Repositories;
using TaskStatus = MyDailyRoutine.Api.Models.TaskStatus;

namespace MyDailyRoutine.Api.Services;

public interface ITaskService
{
    Task<IReadOnlyList<TaskDto>> ListAsync(TaskQuery query, CancellationToken ct = default);
    Task<TaskDto> GetAsync(Guid id, CancellationToken ct = default);
    Task<TaskDto> CreateAsync(CreateTaskRequest request, CancellationToken ct = default);
    Task<TaskDto> ReplaceAsync(Guid id, ReplaceTaskRequest request, CancellationToken ct = default);
    Task<TaskDto> SetStatusAsync(Guid id, TaskStatus status, CancellationToken ct = default);
    Task<TaskDto> MoveAsync(Guid id, DateOnly date, CancellationToken ct = default);
    Task<TaskDto> DuplicateAsync(Guid id, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
public sealed class TaskService(ICurrentUserService users, ITaskRepository repository,
    ICategoryService categories, ITagService tags, TimeProvider clock) : ITaskService
{
    public async Task<IReadOnlyList<TaskDto>> ListAsync(TaskQuery query, CancellationToken ct = default)
    {
        if (query.Date is null && query.From > query.To) throw new ValidationException("from", "From must not be after to.");
        if (query.Status is { } status && !Enum.IsDefined(status)) throw new ValidationException("status", "Invalid task status.");
        var user = await users.GetOrCreateAsync(ct);
        return (await repository.ListAsync(user.Id, query, UserDate.Today(user, clock), ct)).Select(x => x.ToDto()).ToArray();
    }
    private async Task<TaskItem> FindAsync(Guid id, CancellationToken ct) =>
        await repository.FindAsync((await users.GetOrCreateAsync(ct)).Id, id, ct) ?? throw new NotFoundException();
    public async Task<TaskDto> GetAsync(Guid id, CancellationToken ct = default) => (await FindAsync(id, ct)).ToDto();
    public async Task<TaskDto> CreateAsync(CreateTaskRequest request, CancellationToken ct = default)
    {
        Validate(request);
        var user = await users.GetOrCreateAsync(ct);
        var date = request.PlannedDate ?? UserDate.Today(user, clock);
        var task = new TaskItem { UserId = user.Id, Name = request.Name.Trim(), PlannedDate = date,
            SortOrder = await repository.NextSortOrderAsync(user.Id, date, ct) };
        await ApplyAsync(task, request, ct);
        await repository.AddAsync(task, ct);
        return task.ToDto();
    }
    public async Task<TaskDto> ReplaceAsync(Guid id, ReplaceTaskRequest request, CancellationToken ct = default)
    {
        var task = await FindAsync(id, ct);
        if (request.PlannedDate is null) throw new ValidationException("plannedDate", "Planned date is required.");
        var values = new CreateTaskRequest(request.Name, request.PlannedDate, request.StartTime, request.Description,
            request.Duration, request.DurationUnit, request.Status, request.Impact, request.Resources, request.Category, request.Tags, request.Metadata);
        Validate(values);
        if (task.PlannedDate != request.PlannedDate)
            task.SortOrder = await repository.NextSortOrderAsync(task.UserId, request.PlannedDate.Value, ct);
        await ApplyAsync(task, values, ct);
        await repository.SaveAsync(ct);
        return task.ToDto();
    }
    private async Task ApplyAsync(TaskItem task, CreateTaskRequest request, CancellationToken ct)
    {
        // Resolve labels before modifying tracked tasks: a new label may trigger SaveChanges.
        var category = await categories.ResolveAsync(task.UserId, request.Category, ct);
        var resolvedTags = new List<Tag>();
        foreach (var name in (request.Tags ?? []).Where(x => !string.IsNullOrWhiteSpace(x)).DistinctBy(x => x.Trim().ToLowerInvariant()))
        {
            if (await tags.ResolveAsync(task.UserId, name, ct) is { } tag) resolvedTags.Add(tag);
        }
        task.Name = request.Name.Trim(); task.Description = request.Description;
        task.PlannedDate = request.PlannedDate ?? task.PlannedDate; task.StartTime = request.StartTime;
        task.Duration = request.Duration; task.DurationUnit = request.DurationUnit;
        task.Impact = request.Impact; task.Resources = request.Resources;
        task.Metadata = request.Metadata is null ? [] : new(request.Metadata);
        task.Category = category; task.CategoryId = category?.Id;
        task.TaskTags.RemoveAll(x => !resolvedTags.Any(t => t.Id == x.TagId));
        foreach (var tag in resolvedTags.Where(t => task.TaskTags.All(x => x.TagId != t.Id)))
            task.TaskTags.Add(new TaskTag { TaskId = task.Id, Task = task, TagId = tag.Id, Tag = tag, UserId = task.UserId });
        SetStatus(task, request.Status);
    }
    public async Task<TaskDto> SetStatusAsync(Guid id, TaskStatus status, CancellationToken ct = default)
    {
        if (!Enum.IsDefined(status)) throw new ValidationException("status", "Invalid task status.");
        var task = await FindAsync(id, ct);
        SetStatus(task, status);
        await repository.SaveAsync(ct);
        return task.ToDto();
    }
    private void SetStatus(TaskItem task, TaskStatus status)
    {
        if (status == TaskStatus.Done && (task.Status != TaskStatus.Done || task.CompletedAt is null)) task.CompletedAt = clock.GetUtcNow();
        else if (status != TaskStatus.Done) task.CompletedAt = null;
        task.Status = status;
    }
    public async Task<TaskDto> MoveAsync(Guid id, DateOnly date, CancellationToken ct = default)
    {
        var task = await FindAsync(id, ct);
        task.SortOrder = await repository.NextSortOrderAsync(task.UserId, date, ct);
        task.PlannedDate = date;
        await repository.SaveAsync(ct);
        return task.ToDto();
    }
    public async Task<TaskDto> DuplicateAsync(Guid id, CancellationToken ct = default)
    {
        var source = await FindAsync(id, ct);
        var copy = new TaskItem { UserId = source.UserId, Name = source.Name, Description = source.Description,
            PlannedDate = source.PlannedDate, StartTime = source.StartTime, Duration = source.Duration, DurationUnit = source.DurationUnit,
            Impact = source.Impact, Resources = source.Resources, CategoryId = source.CategoryId, Category = source.Category,
            Metadata = new(source.Metadata), SortOrder = await repository.NextSortOrderAsync(source.UserId, source.PlannedDate, ct) };
        copy.TaskTags = source.TaskTags.Select(x => new TaskTag { TaskId = copy.Id, Task = copy, TagId = x.TagId, Tag = x.Tag, UserId = copy.UserId }).ToList();
        await repository.AddAsync(copy, ct);
        return copy.ToDto();
    }
    public async Task DeleteAsync(Guid id, CancellationToken ct = default) => await repository.DeleteAsync(await FindAsync(id, ct), ct);
    private static void Validate(CreateTaskRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name) || r.Name.Trim().Length > 200) throw new ValidationException("name", "Name must contain 1 to 200 characters.");
        if (r.Description?.Length > 4000) throw new ValidationException("description", "Description cannot exceed 4000 characters.");
        if (r.Duration < 0) throw new ValidationException("duration", "Duration must be nonnegative.");
        if (r.Impact is < 0 or > 100) throw new ValidationException("impact", "Impact must be between 0 and 100.");
        if (r.Resources < 0) throw new ValidationException("resources", "Resources must be nonnegative.");
        if (!Enum.IsDefined(r.DurationUnit)) throw new ValidationException("durationUnit", "Invalid duration unit.");
        if (!Enum.IsDefined(r.Status)) throw new ValidationException("status", "Invalid task status.");
        if (r.Metadata is { } metadata && (metadata.Count > 50 || metadata.Any(x => string.IsNullOrWhiteSpace(x.Key) || x.Key.Length > 100 || x.Value is null || x.Value.Length > 1000)))
            throw new ValidationException("metadata", "Metadata allows 50 entries, nonempty keys up to 100 characters, and string values up to 1000 characters.");
        if (!string.IsNullOrWhiteSpace(r.Category)) LabelService<Category>.ValidateName(r.Category);
        foreach (var tag in r.Tags ?? []) if (!string.IsNullOrWhiteSpace(tag)) LabelService<Tag>.ValidateName(tag);
    }
}
