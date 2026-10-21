using System.Security.Claims;
using System.Text.Json;
using MyDailyRoutine.Api.Auth;
using MyDailyRoutine.Api.Dtos;
using MyDailyRoutine.Api.Infrastructure;
using MyDailyRoutine.Api.Models;
using MyDailyRoutine.Api.Repositories;

namespace MyDailyRoutine.Api.Services;

public interface ICurrentUserService
{
    Task<User> GetOrCreateAsync(CancellationToken ct = default);
}
public interface IUserService
{
    Task<UserDto> GetAsync(CancellationToken ct);
    Task<UserDto> UpdateAsync(UpdateUserRequest request, CancellationToken ct);
}
public sealed class UserService(ICurrentUser current, IUserRepository repository) : IUserService, ICurrentUserService
{
    private User? cached;
    public async Task<User> GetOrCreateAsync(CancellationToken ct = default)
    {
        if (cached is not null) return cached;
        var subject = current.Subject;
        var p = current.Principal;
        var username = p.FindFirstValue("preferred_username");
        var email = p.FindFirstValue("email");
        var first = p.FindFirstValue("given_name");
        var last = p.FindFirstValue("family_name");
        var user = await repository.FindBySubjectAsync(subject, ct);
        if (user is null)
        {
            var locale = p.FindFirstValue("locale");
            user = await repository.AddOrGetAsync(new User
            {
                Subject = subject, Username = username, Email = email, FirstName = first, LastName = last,
                DisplayName = p.FindFirstValue("name") ?? username,
                Locale = locale is "en" or "ar" ? locale : null
            }, ct);
        }
        if (user.Username != username || user.Email != email || user.FirstName != first || user.LastName != last)
        {
            user.Username = username; user.Email = email; user.FirstName = first; user.LastName = last;
            await repository.SaveAsync(ct);
        }
        return cached = user;
    }
    public async Task<UserDto> GetAsync(CancellationToken ct) => (await GetOrCreateAsync(ct)).ToDto();
    public async Task<UserDto> UpdateAsync(UpdateUserRequest request, CancellationToken ct)
    {
        var user = await GetOrCreateAsync(ct);
        if (request.DisplayName.ValueKind != JsonValueKind.Undefined) user.DisplayName = Text(request.DisplayName, "displayName")?.Trim();
        if (request.Locale.ValueKind != JsonValueKind.Undefined)
        {
            var locale = Text(request.Locale, "locale");
            if (locale is not (null or "en" or "ar")) throw new ValidationException("locale", "Locale must be en, ar, or null.");
            user.Locale = locale;
        }
        if (request.Theme.ValueKind != JsonValueKind.Undefined)
        {
            var theme = Text(request.Theme, "theme");
            if (theme is not ("system" or "light" or "dark")) throw new ValidationException("theme", "Theme must be system, light, or dark.");
            user.Theme = theme;
        }
        if (request.TimeZone.ValueKind != JsonValueKind.Undefined)
        {
            var zone = Text(request.TimeZone, "timeZone");
            if (zone is not null && (!TimeZoneInfo.TryFindSystemTimeZoneById(zone, out var info) ||
                    (!info.HasIanaId && !TimeZoneInfo.TryConvertIanaIdToWindowsId(zone, out _))))
                throw new ValidationException("timeZone", "Time zone must be a valid IANA identifier or null.");
            user.TimeZone = zone;
        }
        await repository.SaveAsync(ct);
        return user.ToDto();
    }
    private static string? Text(JsonElement value, string field) => value.ValueKind switch
    {
        JsonValueKind.Null => null,
        JsonValueKind.String => value.GetString(),
        _ => throw new ValidationException(field, "Expected a string or null.")
    };
}

public static class UserDate
{
    public static DateOnly Today(User user, TimeProvider clock)
    {
        var now = clock.GetUtcNow();
        if (user.TimeZone is { } zone && TimeZoneInfo.TryFindSystemTimeZoneById(zone, out var tz))
            now = TimeZoneInfo.ConvertTime(now, tz);
        return DateOnly.FromDateTime(now.DateTime);
    }
}
