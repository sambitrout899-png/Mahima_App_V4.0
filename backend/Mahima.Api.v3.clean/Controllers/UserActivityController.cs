using System.Security.Claims;
using Mahima.Api.v3.clean.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace Mahima.Api.v3.clean.Controllers;

[ApiController]
[Authorize]
[Route("api/user-activity")]
public class UserActivityController(IConfiguration configuration) : ControllerBase
{
    public record Heartbeat(Guid ClientId);
    private NpgsqlConnection Connection() => new(configuration.GetConnectionString("DefaultConnection"));

    [HttpPost("heartbeat")]
    public async Task<IActionResult> Record(Heartbeat heartbeat)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var userId))
            return Unauthorized();
        if (heartbeat.ClientId == Guid.Empty) return BadRequest();
        await using var connection = Connection();
        await connection.OpenAsync();
        await UserActivityHistory.RecordAsync(connection, userId, heartbeat.ClientId);
        return NoContent();
    }

    [HttpGet("summary")]
    [Authorize(Roles = "ADMIN,Admin,admin")]
    public async Task<IActionResult> Summary()
    {
        await using var connection = Connection();
        await connection.OpenAsync();
        await UserActivityHistory.EnsureAsync(connection);
        var now = DateTime.UtcNow;
        var periods = UserActivityHistory.Periods(now);
        await using var command = new NpgsqlCommand("SELECT user_id, started_at, last_seen_at FROM user_activity_history WHERE last_seen_at >= @start AND started_at <= @now", connection);
        command.Parameters.AddWithValue("start", periods.Min(p => p.Start));
        command.Parameters.AddWithValue("now", now);
        var intervals = new List<UserActivityHistory.Interval>();
        await using (var reader = await command.ExecuteReaderAsync())
            while (await reader.ReadAsync())
                intervals.Add(new(reader.GetGuid(0), reader.GetDateTime(1).ToUniversalTime(), reader.GetDateTime(2).ToUniversalTime()));
        await using var coverage = new NpgsqlCommand("SELECT started_at FROM user_activity_tracking WHERE id = 1", connection);
        var trackingStartedAt = ((DateTime)(await coverage.ExecuteScalarAsync())!).ToUniversalTime();
        var users = intervals.GroupBy(i => i.UserId).ToArray();
        return Ok(new {
            generatedAt = now, trackingStartedAt, timeZone = "Asia/Kolkata",
            periods = periods.Select(p => new {
                p.Key, p.Label, p.Start, p.End,
                userCount = users.Count(g => g.Any(i => i.Start < p.End && i.End >= p.Start)),
                activeSeconds = users.Sum(g => UserActivityHistory.ActiveSeconds(g, p))
            }),
            users = users.Select(g => new {
                userId = g.Key,
                periods = periods.ToDictionary(p => p.Key, p => new {
                    loggedIn = g.Any(i => i.Start < p.End && i.End >= p.Start),
                    activeSeconds = UserActivityHistory.ActiveSeconds(g, p)
                })
            })
        });
    }
}
