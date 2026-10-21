using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace MyDailyRoutine.Api.Infrastructure;

public sealed class NotFoundException() : Exception("Resource not found.");
public sealed class ConflictException(string message) : Exception(message);
public sealed class ValidationException(string field, string message) : Exception(message)
{
    public Dictionary<string, string[]> Errors { get; } = new() { [field] = [message] };
}

public sealed class GlobalExceptionHandler(IProblemDetailsService problems, ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        var (status, title) = exception switch
        {
            ValidationException => (400, "Validation failed"),
            NotFoundException => (404, "Not found"),
            ConflictException => (409, "Conflict"),
            UnauthorizedAccessException => (401, "Unauthorized"),
            _ => (500, "An unexpected error occurred")
        };
        if (status == 500) logger.LogError(exception, "Unhandled request error");
        context.Response.StatusCode = status;
        ProblemDetails detail = exception is ValidationException validation
            ? new ValidationProblemDetails(validation.Errors) : new ProblemDetails();
        detail.Status = status;
        detail.Title = title;
        detail.Detail = status == 500 ? null : exception.Message;
        detail.Instance = context.Request.Path;
        return await problems.TryWriteAsync(new ProblemDetailsContext { HttpContext = context, ProblemDetails = detail, Exception = exception });
    }
}
