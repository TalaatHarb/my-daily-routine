using Microsoft.EntityFrameworkCore;
using MyDailyRoutine.Api.Data;
using MyDailyRoutine.Api.Models;
using Npgsql;

namespace MyDailyRoutine.Api.Repositories;

public interface IUserRepository
{
    Task<User?> FindBySubjectAsync(string subject, CancellationToken ct);
    Task<User> AddOrGetAsync(User user, CancellationToken ct);
    Task SaveAsync(CancellationToken ct);
}
public sealed class UserRepository(AppDbContext db) : IUserRepository
{
    public Task<User?> FindBySubjectAsync(string subject, CancellationToken ct) => db.Users.SingleOrDefaultAsync(x => x.Subject == subject, ct);
    public async Task<User> AddOrGetAsync(User user, CancellationToken ct)
    {
        db.Users.Add(user);
        try { await db.SaveChangesAsync(ct); return user; }
        catch (DbUpdateException ex) when (DatabaseErrors.IsUnique(ex))
        {
            db.Entry(user).State = EntityState.Detached;
            return await FindBySubjectAsync(user.Subject, ct) ?? throw new InvalidOperationException("Concurrent user creation could not be resolved.");
        }
    }
    public async Task SaveAsync(CancellationToken ct) => await db.SaveChangesAsync(ct);
}
internal static class DatabaseErrors
{
    public static bool IsUnique(DbUpdateException ex) => ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
}
