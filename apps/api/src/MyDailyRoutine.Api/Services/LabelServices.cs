using MyDailyRoutine.Api.Dtos;
using MyDailyRoutine.Api.Infrastructure;
using MyDailyRoutine.Api.Models;
using MyDailyRoutine.Api.Repositories;

namespace MyDailyRoutine.Api.Services;

public interface ILabelService<T> where T : class, ILabel
{
    Task<IReadOnlyList<LabelSummaryDto>> ListAsync(string? search, int? limit, CancellationToken ct);
    Task<LabelDto> CreateAsync(LabelRequest request, CancellationToken ct);
    Task<LabelDto> UpdateAsync(Guid id, LabelRequest request, CancellationToken ct);
    Task DeleteAsync(Guid id, CancellationToken ct);
    Task<T?> ResolveAsync(Guid userId, string? name, CancellationToken ct);
}
public interface ICategoryService : ILabelService<Category>;
public interface ITagService : ILabelService<Tag>;

public abstract class LabelService<T>(ICurrentUserService users, ILabelRepository<T> repository) : ILabelService<T> where T : class, ILabel, new()
{
    public async Task<IReadOnlyList<LabelSummaryDto>> ListAsync(string? search, int? limit, CancellationToken ct)
    {
        if (limit is <= 0) throw new ValidationException("limit", "Limit must be positive.");
        return await repository.ListAsync((await users.GetOrCreateAsync(ct)).Id, search?.Trim().ToLowerInvariant() ?? "", Math.Min(limit ?? 50, 200), ct);
    }
    public async Task<LabelDto> CreateAsync(LabelRequest request, CancellationToken ct)
    {
        var name = ValidateName(request.Name);
        var normalized = name.ToLowerInvariant();
        var color = ColorPalette.Resolve(request.Color, normalized);
        var userId = (await users.GetOrCreateAsync(ct)).Id;
        if (await repository.FindByNameAsync(userId, normalized, ct) is not null) throw new ConflictException("A label with that name already exists.");
        return (await repository.InsertAsync(new T { UserId = userId, Name = name, NormalizedName = normalized, Color = color }, false, ct)).ToDto();
    }
    public async Task<LabelDto> UpdateAsync(Guid id, LabelRequest request, CancellationToken ct)
    {
        var userId = (await users.GetOrCreateAsync(ct)).Id;
        var label = await repository.FindAsync(userId, id, ct) ?? throw new NotFoundException();
        var name = ValidateName(request.Name);
        var normalized = name.ToLowerInvariant();
        var color = ColorPalette.Resolve(request.Color ?? label.Color, normalized);
        if (await repository.FindByNameAsync(userId, normalized, ct) is { } other && other.Id != id)
            throw new ConflictException("A label with that name already exists.");
        label.Name = name; label.NormalizedName = normalized; label.Color = color;
        await repository.SaveAsync(ct);
        return label.ToDto();
    }
    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var userId = (await users.GetOrCreateAsync(ct)).Id;
        var label = await repository.FindAsync(userId, id, ct) ?? throw new NotFoundException();
        await repository.DeleteAsync(label, ct);
    }
    public async Task<T?> ResolveAsync(Guid userId, string? name, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(name)) return null;
        name = ValidateName(name);
        var normalized = name.ToLowerInvariant();
        return await repository.FindByNameAsync(userId, normalized, ct)
            ?? await repository.InsertAsync(new T { UserId = userId, Name = name, NormalizedName = normalized, Color = ColorPalette.ForName(normalized) }, true, ct);
    }
    public static string ValidateName(string? name)
    {
        name = name?.Trim();
        if (string.IsNullOrEmpty(name) || name.Length > 100) throw new ValidationException("name", "Label name must contain 1 to 100 characters.");
        return name;
    }
}
public sealed class CategoryService(ICurrentUserService users, ICategoryRepository repository) : LabelService<Category>(users, repository), ICategoryService;
public sealed class TagService(ICurrentUserService users, ITagRepository repository) : LabelService<Tag>(users, repository), ITagService;
