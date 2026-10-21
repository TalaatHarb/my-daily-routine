namespace MyDailyRoutine.Api.Models;

public interface IAudited
{
    DateTimeOffset CreatedAt { get; set; }
    DateTimeOffset UpdatedAt { get; set; }
}

public sealed class User : IAudited
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Subject { get; set; }
    public string? Username { get; set; }
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Locale { get; set; }
    public string? TimeZone { get; set; }
    public string Theme { get; set; } = "system";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public enum DurationUnit { Minutes, Hours, Days, Weeks }
public enum TaskStatus { Todo, InProgress, Done }

public sealed class TaskItem : IAudited
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public DateOnly PlannedDate { get; set; }
    public TimeOnly? StartTime { get; set; }
    public int Duration { get; set; }
    public DurationUnit DurationUnit { get; set; }
    public TaskStatus Status { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public int Impact { get; set; }
    public int Resources { get; set; }
    public Guid? CategoryId { get; set; }
    public Category? Category { get; set; }
    public int SortOrder { get; set; }
    public Dictionary<string, string> Metadata { get; set; } = [];
    public List<TaskTag> TaskTags { get; set; } = [];
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public interface ILabel : IAudited
{
    Guid Id { get; set; }
    Guid UserId { get; set; }
    string Name { get; set; }
    string NormalizedName { get; set; }
    string Color { get; set; }
}

public sealed class Category : ILabel
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public string NormalizedName { get; set; } = "";
    public string Color { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class Tag : ILabel
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public string NormalizedName { get; set; } = "";
    public string Color { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class TaskTag
{
    public Guid TaskId { get; set; }
    public TaskItem Task { get; set; } = null!;
    public Guid TagId { get; set; }
    public Tag Tag { get; set; } = null!;
    public Guid UserId { get; set; }
}
