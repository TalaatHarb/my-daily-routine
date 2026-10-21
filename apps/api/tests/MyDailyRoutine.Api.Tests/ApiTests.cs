using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MyDailyRoutine.Api.Data;

namespace MyDailyRoutine.Api.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("Database:MigrateOnStartup", "false");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<AppDbContext>();
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("api-tests-" + GetHashCode()));
            services.RemoveAll<TimeProvider>(); services.AddSingleton<TimeProvider>(new FixedClock());
            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = "Test"; options.DefaultChallengeScheme = "Test";
            }).AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { });
        });
    }
    public HttpClient Client(string? subject = null)
    {
        var client = CreateClient();
        if (subject is not null) client.DefaultRequestHeaders.Add("X-Test-Sub", subject);
        return client;
    }
}
public sealed class TestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-Test-Sub", out var subject)) return Task.FromResult(AuthenticateResult.NoResult());
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim("sub", subject.ToString()), new Claim("preferred_username", "test-user") }, Scheme.Name));
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme.Name)));
    }
}
public sealed class ApiTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static string Unique() => Guid.NewGuid().ToString();
    [Fact]
    public async Task HealthIsAnonymousAndTasksRequireAuth()
    {
        using var client = factory.Client();
        var health = await client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, health.StatusCode);
        Assert.Equal("ok", (await health.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString());
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health/ready")).StatusCode);
        var unauthorized = await client.GetAsync("/tasks");
        Assert.Equal(HttpStatusCode.Unauthorized, unauthorized.StatusCode);
        Assert.Equal("application/problem+json", unauthorized.Content.Headers.ContentType?.MediaType);
    }
    [Fact]
    public async Task CreateBeforeMeWorksAndJsonContractRoundTrips()
    {
        using var client = factory.Client(Unique());
        var created = await client.PostAsJsonAsync("/tasks", new { name = "  API task ", startTime = "08:15:00", category = "Work", tags = new[] { "Focus", "FOCUS" }, metadata = new { source = "test" } });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var task = await created.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("API task", task.GetProperty("name").GetString());
        Assert.Equal("2026-10-21", task.GetProperty("plannedDate").GetString());
        Assert.Equal("08:15", task.GetProperty("startTime").GetString());
        Assert.Equal("todo", task.GetProperty("status").GetString());
        Assert.Equal("minutes", task.GetProperty("durationUnit").GetString());
        Assert.Single(task.GetProperty("tags").EnumerateArray());
        var list = await client.GetFromJsonAsync<JsonElement[]>("/tasks");
        Assert.Equal(task.GetProperty("id").GetGuid(), Assert.Single(list!).GetProperty("id").GetGuid());
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(created.Headers.Location)).StatusCode);
        using var other = factory.Client(Unique());
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync(created.Headers.Location)).StatusCode);
    }
    [Theory]
    [InlineData("http://localhost:5173", true)]
    [InlineData("https://evil.example", false)]
    public async Task CorsPreflightOnlyAllowsConfiguredOrigins(string origin, bool allowed)
    {
        using var client = factory.Client();
        using var request = new HttpRequestMessage(HttpMethod.Options, "/tasks");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "POST");
        request.Headers.Add("Access-Control-Request-Headers", "authorization,content-type");
        var response = await client.SendAsync(request);
        Assert.Equal(allowed, response.Headers.Contains("Access-Control-Allow-Origin"));
        if (allowed)
        {
            Assert.Equal(origin, Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
            Assert.Equal("600", Assert.Single(response.Headers.GetValues("Access-Control-Max-Age")));
            Assert.False(response.Headers.Contains("Access-Control-Allow-Credentials"));
        }
    }
    [Theory]
    [InlineData("""{"name":" "}""")]
    [InlineData("""{"name":"Task","impact":101}""")]
    [InlineData("""{"name":"Task","status":"invalid"}""")]
    [InlineData("""{"name":"Task","status":2}""")]
    [InlineData("""{"name":"Task","startTime":"8:15"}""")]
    [InlineData("""{"name":"Task","duration":-1}""")]
    public async Task InvalidRequestsReturnValidationProblems(string json)
    {
        using var client = factory.Client(Unique());
        var response = await client.PostAsync("/tasks", new StringContent(json, System.Text.Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.True((await response.Content.ReadFromJsonAsync<JsonElement>()).TryGetProperty("errors", out _));
    }
    [Fact]
    public async Task TaskLifecycleAndLabelEndpointsWork()
    {
        using var client = factory.Client(Unique());
        var catResponse = await client.PostAsJsonAsync("/categories", new { name = "Work", color = "#ABCDEF" });
        Assert.Equal(HttpStatusCode.Created, catResponse.StatusCode);
        var category = await catResponse.Content.ReadFromJsonAsync<JsonElement>();
        var tagResponse = await client.PostAsJsonAsync("/tags", new { name = "Focus" });
        var tag = await tagResponse.Content.ReadFromJsonAsync<JsonElement>();
        var created = await client.PostAsJsonAsync("/tasks", new { name = "Task", category = "work", tags = new[] { "focus" } });
        var url = created.Headers.Location!.ToString();
        var done = await client.PatchAsJsonAsync(url + "/status", new { status = "done" });
        Assert.Equal("done", (await done.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString());
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsync(url + "/duplicate", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync(url + "/move", new { plannedDate = "2026-11-01" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync(url, new { name = "Replaced", plannedDate = "2026-10-21", status = "inProgress" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PatchAsJsonAsync(url + "/status", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync(url, new { name = "Missing date" })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/categories", new { name = "WORK" })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/tags", new { name = "FOCUS" })).StatusCode);
        foreach (var (route, label) in new[] { ("categories", category), ("tags", tag) })
        {
            Assert.Single((await client.GetFromJsonAsync<JsonElement[]>($"/{route}?limit=1"))!);
            var id = label.GetProperty("id").GetGuid();
            Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/{route}/{id}", new { name = "Renamed", color = "#123456" })).StatusCode);
            Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/{route}/{id}")).StatusCode);
        }
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync(url)).StatusCode);
    }
    [Fact]
    public async Task MeAndOpenApiAreAvailable()
    {
        using var client = factory.Client(Unique());
        var me = await client.GetFromJsonAsync<JsonElement>("/me");
        Assert.Equal("test-user", me.GetProperty("username").GetString());
        var updated = await client.PutAsJsonAsync("/me", new { displayName = "Custom", locale = "ar", timeZone = "Asia/Riyadh", theme = "dark" });
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        Assert.Equal("Custom", (await updated.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("displayName").GetString());
        using var anonymous = factory.Client();
        Assert.Equal(HttpStatusCode.OK, (await anonymous.GetAsync("/openapi/v1.json")).StatusCode);
    }
}
