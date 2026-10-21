using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MyDailyRoutine.Api.Auth;
using MyDailyRoutine.Api.Data;
using MyDailyRoutine.Api.Dtos;
using MyDailyRoutine.Api.Infrastructure;
using MyDailyRoutine.Api.Models;
using MyDailyRoutine.Api.Repositories;
using MyDailyRoutine.Api.Services;
using TaskStatus = MyDailyRoutine.Api.Models.TaskStatus;

namespace MyDailyRoutine.Api.Tests;

public sealed class FixedClock : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => new(2026, 10, 21, 23, 30, 0, TimeSpan.Zero);
}
internal sealed class TestCurrentUser(string subject, params Claim[] claims) : ICurrentUser
{
    public string Subject => subject;
    public ClaimsPrincipal Principal { get; } = new(new ClaimsIdentity(new[] { new Claim("sub", subject), new Claim("preferred_username", "tester") }.Concat(claims), "Test"));
}
internal sealed class ServiceHarness : IDisposable
{
    public AppDbContext Db { get; } = new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    public UserService Users(string subject = "alice", params Claim[] claims) => new(new TestCurrentUser(subject, claims), new UserRepository(Db));
    public TaskService Tasks(string subject = "alice")
    {
        var user = Users(subject);
        return new(user, new TaskRepository(Db), new CategoryService(user, new CategoryRepository(Db)), new TagService(user, new TagRepository(Db)), new FixedClock());
    }
    public CategoryService Categories(string subject = "alice") => new(Users(subject), new CategoryRepository(Db));
    public TagService Tags(string subject = "alice") => new(Users(subject), new TagRepository(Db));
    public void Dispose() => Db.Dispose();
}
public sealed class ServiceTests
{
    [Fact]
    public async Task UserIsCreatedFromClaimsAndRefreshedWithoutOverwritingDisplayName()
    {
        using var h = new ServiceHarness();
        var first = await h.Users("alice", new("name", "Alice Name"), new("email", "old@example.test"), new("given_name", "Alice"), new("family_name", "Name"), new("locale", "ar")).GetOrCreateAsync();
        Assert.Equal("tester", first.Username);
        Assert.Equal("Alice Name", first.DisplayName);
        Assert.Equal("Alice", first.FirstName);
        Assert.Equal("Name", first.LastName);
        Assert.Equal("ar", first.Locale);
        Assert.Equal("system", first.Theme);
        Assert.NotEqual(default, first.CreatedAt);
        first.DisplayName = "Edited";
        await h.Db.SaveChangesAsync();
        var second = await h.Users("alice", new("name", "Different"), new("email", "new@example.test")).GetOrCreateAsync();
        Assert.Equal(first.Id, second.Id);
        Assert.Equal("new@example.test", second.Email);
        Assert.Equal("Edited", second.DisplayName);
        Assert.Single(h.Db.Users);
    }
    [Fact]
    public async Task DefaultDateUsesUserTimeZoneAndUtcFallback()
    {
        using var h = new ServiceHarness();
        var users = h.Users();
        var user = await users.GetOrCreateAsync();
        user.TimeZone = "Asia/Tokyo";
        await h.Db.SaveChangesAsync();
        var task = await h.Tasks().CreateAsync(new("Tomorrow locally"));
        Assert.Equal(new DateOnly(2026, 10, 22), task.PlannedDate);
        user.TimeZone = "not-a-zone";
        await h.Db.SaveChangesAsync();
        Assert.Equal(new DateOnly(2026, 10, 21), (await h.Tasks().CreateAsync(new("UTC fallback"))).PlannedDate);
    }
    [Fact]
    public async Task OrderingIsDateThenTimeWithNullTimesLastThenSortOrder()
    {
        using var h = new ServiceHarness(); var s = h.Tasks(); var date = new DateOnly(2026, 10, 21);
        await s.CreateAsync(new("No time", date));
        await s.CreateAsync(new("Late", date, new TimeOnly(20, 0)));
        await s.CreateAsync(new("Early one", date, new TimeOnly(8, 0)));
        await s.CreateAsync(new("Early two", date, new TimeOnly(8, 0)));
        await s.CreateAsync(new("Previous", date.AddDays(-1)));
        Assert.Equal(new[] { "Previous", "Early one", "Early two", "Late", "No time" }, (await s.ListAsync(new() { All = true })).Select(x => x.Name));
    }
    [Fact]
    public async Task LabelsResolveCaseInsensitivelyAndColorsAreDeterministic()
    {
        using var h = new ServiceHarness(); var s = h.Tasks();
        var a = await s.CreateAsync(new("A", Category: " Work ", Tags: [" Focus ", "FOCUS", "", "  "]));
        var b = await s.CreateAsync(new("B", Category: "work", Tags: ["focus"]));
        Assert.Equal(a.Category!.Id, b.Category!.Id);
        Assert.Single(a.Tags);
        Assert.Equal(a.Tags[0].Id, b.Tags[0].Id);
        Assert.Equal(ColorPalette.ForName("work"), a.Category.Color);
        Assert.Equal("#ef4444", ColorPalette.ForName("work"));
        Assert.Equal(ColorPalette.ForName("focus"), a.Tags[0].Color);
        Assert.Single(h.Db.Categories); Assert.Single(h.Db.Tags);
    }
    [Fact]
    public async Task DoneSetsCompletionAndLeavingDoneClearsIt()
    {
        using var h = new ServiceHarness(); var s = h.Tasks();
        var task = await s.CreateAsync(new("Task"));
        Assert.Null(task.CompletedAt);
        var done = await s.SetStatusAsync(task.Id, TaskStatus.Done);
        Assert.Equal(new FixedClock().GetUtcNow(), done.CompletedAt);
        Assert.Equal(done.CompletedAt, (await s.SetStatusAsync(task.Id, TaskStatus.Done)).CompletedAt);
        Assert.Null((await s.SetStatusAsync(task.Id, TaskStatus.InProgress)).CompletedAt);
        Assert.NotNull((await s.CreateAsync(new("Already done", Status: TaskStatus.Done))).CompletedAt);
    }
    [Fact]
    public async Task MoveAppendsAndDuplicateResetsCompletionAndCopiesMetadata()
    {
        using var h = new ServiceHarness(); var s = h.Tasks(); var target = new DateOnly(2026, 11, 1);
        var end = await s.CreateAsync(new("Existing", target));
        var original = await s.CreateAsync(new("Original", Category: "Work", Tags: ["tag"], Metadata: new() { ["key"] = "value" }));
        await s.SetStatusAsync(original.Id, TaskStatus.Done);
        var moved = await s.MoveAsync(original.Id, target);
        Assert.Equal(target, moved.PlannedDate); Assert.True(moved.SortOrder > end.SortOrder);
        var copy = await s.DuplicateAsync(original.Id);
        Assert.Equal(TaskStatus.Todo, copy.Status); Assert.Null(copy.CompletedAt);
        Assert.Equal(original.Name, copy.Name); Assert.Equal(original.Category, copy.Category);
        Assert.Equal(original.Tags, copy.Tags); Assert.Equal(original.Metadata, copy.Metadata);
        Assert.True(copy.SortOrder > moved.SortOrder);
        copy.Metadata["key"] = "changed";
        Assert.Equal("value", (await s.GetAsync(original.Id)).Metadata["key"]);
    }
    [Fact]
    public async Task OtherUsersResourcesAreNotFoundAndListsAreScoped()
    {
        using var h = new ServiceHarness(); var alice = h.Tasks(); var bob = h.Tasks("bob");
        var task = await alice.CreateAsync(new("Secret", Category: "Work", Tags: ["private"]));
        Assert.Empty(await bob.ListAsync(new() { All = true }));
        await Assert.ThrowsAsync<NotFoundException>(() => bob.GetAsync(task.Id));
        await Assert.ThrowsAsync<NotFoundException>(() => bob.SetStatusAsync(task.Id, TaskStatus.Done));
        await Assert.ThrowsAsync<NotFoundException>(() => bob.MoveAsync(task.Id, task.PlannedDate));
        await Assert.ThrowsAsync<NotFoundException>(() => bob.DuplicateAsync(task.Id));
        await Assert.ThrowsAsync<NotFoundException>(() => bob.DeleteAsync(task.Id));
        await Assert.ThrowsAsync<NotFoundException>(() => h.Categories("bob").DeleteAsync(task.Category!.Id, default));
        await Assert.ThrowsAsync<NotFoundException>(() => h.Tags("bob").DeleteAsync(task.Tags[0].Id, default));
    }
    [Fact]
    public async Task FiltersCombineAndDateSelectionHasRequiredPrecedence()
    {
        using var h = new ServiceHarness(); var s = h.Tasks(); var today = new DateOnly(2026, 10, 21);
        var yesterday = await s.CreateAsync(new("Work yesterday", today.AddDays(-1), Description: "Needle", Category: "work", Tags: ["focus"]));
        await s.CreateAsync(new("Done yesterday", today.AddDays(-1), Status: TaskStatus.Done));
        await s.CreateAsync(new("Today", today));
        await s.CreateAsync(new("Tomorrow", today.AddDays(1)));
        Assert.Equal("Today", Assert.Single(await s.ListAsync(new())).Name);
        Assert.Equal(yesterday.Id, Assert.Single(await s.ListAsync(new() { Overdue = true, All = true })).Id);
        Assert.Equal("Today", Assert.Single(await s.ListAsync(new() { Date = today, From = today.AddDays(-2), To = today.AddDays(2), Overdue = true, All = true })).Name);
        Assert.Equal("Today", Assert.Single(await s.ListAsync(new() { Date = today, From = today.AddDays(2), To = today.AddDays(-2) })).Name);
        Assert.Equal(2, (await s.ListAsync(new() { From = today, Overdue = true })).Count);
        Assert.Equal(yesterday.Id, Assert.Single(await s.ListAsync(new() { All = true, Search = "nEedle", Tag = " FOCUS ", CategoryId = yesterday.Category!.Id, Status = TaskStatus.Todo })).Id);
    }
    [Fact]
    public async Task ReplaceUpdatesTagsAndDeletingLabelsMaintainsTasks()
    {
        using var h = new ServiceHarness(); var s = h.Tasks();
        var task = await s.CreateAsync(new("Task", Category: "work", Tags: ["old", "keep"]));
        var result = await s.ReplaceAsync(task.Id, new("Replaced", task.PlannedDate, Category: "work", Tags: ["keep", "new"], Metadata: new() { ["a"] = "b" }));
        Assert.Equal(new[] { "keep", "new" }, result.Tags.Select(x => x.Name));
        await h.Categories().DeleteAsync(task.Category!.Id, default);
        await h.Tags().DeleteAsync(result.Tags.First(x => x.Name == "new").Id, default);
        var remaining = await s.GetAsync(task.Id);
        Assert.Null(remaining.Category); Assert.Equal("keep", Assert.Single(remaining.Tags).Name);
        await s.ReplaceAsync(task.Id, new("Cleared", task.PlannedDate));
        var cleared = await s.GetAsync(task.Id);
        Assert.Empty(cleared.Metadata); Assert.Empty(cleared.Tags);
        Assert.Empty(h.Db.TaskTags);
    }
    [Fact]
    public async Task LabelCrudChecksDuplicatesAndSummaryCountsAndSearchRanking()
    {
        using var h = new ServiceHarness(); var cats = h.Categories();
        var work = await cats.CreateAsync(new("Work", "#ABCDEF"), default);
        Assert.Equal("#abcdef", work.Color);
        await cats.CreateAsync(new("Homework", null), default);
        await Assert.ThrowsAsync<ConflictException>(() => cats.CreateAsync(new(" WORK ", null), default));
        await Assert.ThrowsAsync<ConflictException>(() => cats.UpdateAsync(work.Id, new("homework", null), default));
        await h.Tasks().CreateAsync(new("Task", Category: "Work"));
        var list = await cats.ListAsync("work", 500, default);
        Assert.Equal("Work", list[0].Name); Assert.Equal(1, list[0].TaskCount); Assert.Equal(0, list[1].TaskCount);
        Assert.Equal("Renamed", (await cats.UpdateAsync(work.Id, new(" Renamed ", "#123456"), default)).Name);
    }
    [Theory]
    [InlineData(-1, 0, 0)] [InlineData(0, -1, 0)] [InlineData(0, 101, 0)] [InlineData(0, 0, -1)]
    public async Task NumericValidationRejectsInvalidValues(int duration, int impact, int resources)
    {
        using var h = new ServiceHarness();
        await Assert.ThrowsAsync<ValidationException>(() => h.Tasks().CreateAsync(new("Invalid", Duration: duration, Impact: impact, Resources: resources)));
    }
    [Fact]
    public async Task InvalidNamesMetadataEnumsAndColorsAreRejected()
    {
        using var h = new ServiceHarness(); var s = h.Tasks();
        foreach (var r in new[] { new CreateTaskRequest(" "), new(new string('x', 201)), new("Task", Description: new string('x', 4001)),
            new("Task", Metadata: new() { [""] = "x" }), new("Task", Metadata: new() { ["x"] = new string('x', 1001) }),
            new("Task", Metadata: Enumerable.Range(0, 51).ToDictionary(x => x.ToString(), _ => "v")), new("Task", DurationUnit: (DurationUnit)99), new("Task", Tags: [new string('x', 101)]) })
            await Assert.ThrowsAsync<ValidationException>(() => s.CreateAsync(r));
        await Assert.ThrowsAsync<ValidationException>(() => h.Categories().CreateAsync(new("Work", "red"), default));
        Assert.Empty(h.Db.Tasks); Assert.Empty(h.Db.Categories);
    }
    [Fact]
    public async Task ProfileValidatesAndPreservesOmittedFields()
    {
        using var h = new ServiceHarness(); var users = h.Users();
        static UpdateUserRequest Parse(string json) => JsonSerializer.Deserialize<UpdateUserRequest>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        var updated = await users.UpdateAsync(Parse("""{"displayName":"Custom","locale":"ar","timeZone":"Asia/Riyadh","theme":"dark"}"""), default);
        Assert.Equal("Custom", updated.DisplayName); Assert.Equal("Asia/Riyadh", updated.TimeZone);
        var cleared = await users.UpdateAsync(Parse("""{"locale":null,"timeZone":null}"""), default);
        Assert.Null(cleared.Locale); Assert.Null(cleared.TimeZone); Assert.Equal("dark", cleared.Theme); Assert.Equal("Custom", cleared.DisplayName);
        foreach (var json in new[] { """{"theme":"bad"}""", """{"theme":null}""", """{"locale":"fr"}""", """{"timeZone":"not-a-zone"}""", """{"timeZone":"Pacific Standard Time"}""" })
            await Assert.ThrowsAsync<ValidationException>(() => users.UpdateAsync(Parse(json), default));
    }
}
