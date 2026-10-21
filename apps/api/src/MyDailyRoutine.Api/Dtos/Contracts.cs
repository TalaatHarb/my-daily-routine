using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using MyDailyRoutine.Api.Models;
using TaskStatus = MyDailyRoutine.Api.Models.TaskStatus;

namespace MyDailyRoutine.Api.Dtos;

public sealed record UserDto(Guid Id, string Subject, string? Username, string? Email, string? DisplayName,
    string? FirstName, string? LastName, string? Locale, string? TimeZone, string Theme, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record UpdateUserRequest(JsonElement DisplayName, JsonElement Locale, JsonElement TimeZone, JsonElement Theme);
public sealed record LabelDto(Guid Id, string Name, string Color);
public sealed record LabelSummaryDto(Guid Id, string Name, string Color, int TaskCount);
public sealed record LabelRequest([Required] string Name, string? Color);
public sealed record TaskDto(Guid Id, string Name, string? Description, DateOnly PlannedDate, TimeOnly? StartTime,
    int Duration, DurationUnit DurationUnit, TaskStatus Status, DateTimeOffset? CompletedAt, int Impact, int Resources,
    LabelDto? Category, LabelDto[] Tags, Dictionary<string, string> Metadata, int SortOrder, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);

public sealed record CreateTaskRequest(
    [Required] string Name, DateOnly? PlannedDate = null, TimeOnly? StartTime = null, string? Description = null,
    int Duration = 0, DurationUnit DurationUnit = DurationUnit.Minutes, TaskStatus Status = TaskStatus.Todo,
    int Impact = 0, int Resources = 0, string? Category = null, string[]? Tags = null, Dictionary<string, string>? Metadata = null);
public sealed record ReplaceTaskRequest(
    [Required] string Name, [Required] DateOnly? PlannedDate, TimeOnly? StartTime = null, string? Description = null,
    int Duration = 0, DurationUnit DurationUnit = DurationUnit.Minutes, TaskStatus Status = TaskStatus.Todo,
    int Impact = 0, int Resources = 0, string? Category = null, string[]? Tags = null, Dictionary<string, string>? Metadata = null);
public sealed record StatusRequest([Required] TaskStatus? Status);
public sealed record MoveTaskRequest([Required] DateOnly? PlannedDate);
public sealed class TaskQuery
{
    public DateOnly? Date { get; set; }
    public DateOnly? From { get; set; }
    public DateOnly? To { get; set; }
    public bool Overdue { get; set; }
    public bool All { get; set; }
    public TaskStatus? Status { get; set; }
    public Guid? CategoryId { get; set; }
    public string? Tag { get; set; }
    public string? Search { get; set; }
}

public static class DtoMapping
{
    public static UserDto ToDto(this User u) => new(u.Id, u.Subject, u.Username, u.Email, u.DisplayName, u.FirstName,
        u.LastName, u.Locale, u.TimeZone, u.Theme, u.CreatedAt, u.UpdatedAt);
    public static LabelDto ToDto(this ILabel l) => new(l.Id, l.Name, l.Color);
    public static TaskDto ToDto(this TaskItem t) => new(t.Id, t.Name, t.Description, t.PlannedDate, t.StartTime,
        t.Duration, t.DurationUnit, t.Status, t.CompletedAt, t.Impact, t.Resources, t.Category?.ToDto(),
        t.TaskTags.Select(x => x.Tag.ToDto()).OrderBy(x => x.Name, StringComparer.OrdinalIgnoreCase).ToArray(),
        new(t.Metadata), t.SortOrder, t.CreatedAt, t.UpdatedAt);
}
