using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MyDailyRoutine.Api.Models;

namespace MyDailyRoutine.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<TaskTag> TaskTags => Set<TaskTag>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.HasDefaultSchema("app");
        var user = model.Entity<User>();
        user.ToTable("users");
        user.HasKey(x => x.Id);
        user.Property(x => x.Subject).IsRequired();
        user.HasIndex(x => x.Subject).IsUnique();
        user.Property(x => x.Theme).HasDefaultValue("system");
        ConfigureLabel(model.Entity<Category>(), "categories");
        ConfigureLabel(model.Entity<Tag>(), "tags");
        var task = model.Entity<TaskItem>();
        task.ToTable("tasks", table =>
        {
            table.HasCheckConstraint("ck_tasks_duration", "duration >= 0");
            table.HasCheckConstraint("ck_tasks_impact", "impact BETWEEN 0 AND 100");
            table.HasCheckConstraint("ck_tasks_resources", "resources >= 0");
        });
        task.HasKey(x => x.Id);
        task.Property(x => x.Name).IsRequired().HasMaxLength(200);
        task.Property(x => x.Description).HasMaxLength(4000);
        task.Property(x => x.Duration).HasDefaultValue(0);
        task.Property(x => x.Impact).HasDefaultValue(0);
        task.Property(x => x.Resources).HasDefaultValue(0);
        task.Property(x => x.DurationUnit).HasConversion<string>().HasDefaultValue(DurationUnit.Minutes);
        task.Property(x => x.Status).HasConversion<string>().HasDefaultValue(Models.TaskStatus.Todo);
        task.HasIndex(x => new { x.UserId, x.PlannedDate });
        task.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        task.HasOne(x => x.Category).WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.SetNull);
        task.Property(x => x.Metadata).HasColumnType("jsonb")
            .HasConversion(v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<Dictionary<string, string>>(v, (JsonSerializerOptions?)null)!)
            .Metadata.SetValueComparer(new ValueComparer<Dictionary<string, string>>(
                (a, b) => EqualMetadata(a, b), v => MetadataHash(v), v => new Dictionary<string, string>(v)));
        var join = model.Entity<TaskTag>();
        join.ToTable("task_tags");
        join.HasKey(x => new { x.TaskId, x.TagId });
        join.HasOne(x => x.Task).WithMany(x => x.TaskTags).HasForeignKey(x => x.TaskId).OnDelete(DeleteBehavior.Cascade);
        join.HasOne(x => x.Tag).WithMany().HasForeignKey(x => x.TagId).OnDelete(DeleteBehavior.Cascade);
        join.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureLabel<T>(EntityTypeBuilder<T> entity, string table) where T : class, ILabel
    {
        entity.ToTable(table);
        entity.HasKey(x => x.Id);
        entity.Property(x => x.Name).IsRequired().HasMaxLength(100);
        entity.Property(x => x.NormalizedName).IsRequired().HasMaxLength(100);
        entity.Property(x => x.Color).IsRequired().HasMaxLength(7);
        entity.HasIndex(x => new { x.UserId, x.NormalizedName }).IsUnique();
        entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }

    private static bool EqualMetadata(Dictionary<string, string>? a, Dictionary<string, string>? b) =>
        ReferenceEquals(a, b) || (a is not null && b is not null && a.Count == b.Count && a.All(p => b.TryGetValue(p.Key, out var v) && v == p.Value));
    private static int MetadataHash(Dictionary<string, string> value) =>
        value.OrderBy(x => x.Key, StringComparer.Ordinal).Aggregate(0, (hash, p) => HashCode.Combine(hash, p.Key, p.Value));

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        Stamp();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }
    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        Stamp();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }
    private void Stamp()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var entry in ChangeTracker.Entries<IAudited>())
        {
            if (entry.State == EntityState.Added) entry.Entity.CreatedAt = now;
            if (entry.State is EntityState.Added or EntityState.Modified) entry.Entity.UpdatedAt = now;
        }
    }
}
