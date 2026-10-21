using System.Security.Claims;

namespace MyDailyRoutine.Api.Auth;

public interface ICurrentUser
{
    ClaimsPrincipal Principal { get; }
    string Subject { get; }
}
public sealed class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public ClaimsPrincipal Principal => accessor.HttpContext?.User ?? new ClaimsPrincipal();
    public string Subject => Principal.FindFirstValue("sub") is { Length: > 0 } subject
        ? subject : throw new UnauthorizedAccessException("A subject claim is required.");
}
