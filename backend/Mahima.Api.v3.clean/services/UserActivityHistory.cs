using Npgsql;

namespace Mahima.Api.v3.clean.Services;

public static class UserActivityHistory
{
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, bool> Initialized = new();
    private static readonly SemaphoreSlim SchemaLock = new(1, 1);
    public record Interval(Guid UserId, DateTime Start, DateTime End);
    public record Period(string Key, string Label, DateTime Start, DateTime End);

    public static async Task EnsureAsync(NpgsqlConnection connection)
    {
        var database = $"{connection.Host}:{connection.Port}/{connection.Database}";
        if (Initialized.ContainsKey(database)) return;
        await SchemaLock.WaitAsync();
        try
        {
        if (Initialized.ContainsKey(database)) return;
        await using var transaction = await connection.BeginTransactionAsync();
        await using var schemaLock = new NpgsqlCommand("SELECT pg_advisory_xact_lock(728403192)", connection, transaction);
        await schemaLock.ExecuteNonQueryAsync();
        await using var command = new NpgsqlCommand("""
            CREATE TABLE IF NOT EXISTS user_activity_history (
                id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                user_id uuid NOT NULL, client_id uuid NOT NULL,
                started_at timestamptz NOT NULL, last_seen_at timestamptz NOT NULL);
            CREATE INDEX IF NOT EXISTS ix_user_activity_client ON user_activity_history(user_id, client_id, last_seen_at DESC);
            CREATE INDEX IF NOT EXISTS ix_user_activity_time ON user_activity_history(last_seen_at);
            CREATE TABLE IF NOT EXISTS user_activity_tracking (id integer PRIMARY KEY, started_at timestamptz NOT NULL);
            INSERT INTO user_activity_tracking VALUES (1, now()) ON CONFLICT DO NOTHING;
            """, connection, transaction);
        await command.ExecuteNonQueryAsync();
        await transaction.CommitAsync();
        Initialized[database] = true;
        }
        finally { SchemaLock.Release(); }
    }

    public static async Task RecordAsync(NpgsqlConnection connection, Guid userId, Guid clientId)
    {
        await EnsureAsync(connection);
        await using var transaction = await connection.BeginTransactionAsync();
        // Serialize requests from the same browser, including retries and multiple API instances.
        await using var command = new NpgsqlCommand("""
            SELECT pg_advisory_xact_lock(hashtextextended(@user::text || @client::text, 0));
            WITH updated AS (
                UPDATE user_activity_history SET last_seen_at = clock_timestamp()
                WHERE id = (SELECT id FROM user_activity_history
                    WHERE user_id = @user AND client_id = @client
                    AND last_seen_at >= clock_timestamp() - interval '45 seconds'
                    ORDER BY last_seen_at DESC LIMIT 1)
                RETURNING id)
            INSERT INTO user_activity_history(user_id, client_id, started_at, last_seen_at)
            SELECT @user, @client, clock_timestamp(), clock_timestamp()
            WHERE NOT EXISTS (SELECT 1 FROM updated);
            """, connection, transaction);
        command.Parameters.AddWithValue("user", userId);
        command.Parameters.AddWithValue("client", clientId);
        await command.ExecuteNonQueryAsync();
        await transaction.CommitAsync();
    }

    public static Period[] Periods(DateTime now)
    {
        var today = now.AddHours(5.5).Date;
        var week = today.AddDays(-((int)today.DayOfWeek + 6) % 7);
        var month = new DateTime(today.Year, today.Month, 1);
        DateTime Utc(DateTime local) => DateTime.SpecifyKind(local.AddHours(-5.5), DateTimeKind.Utc);
        return new[] {
            new Period("today", "Today", Utc(today), now),
            new Period("yesterday", "Yesterday", Utc(today.AddDays(-1)), Utc(today)),
            new Period("thisWeek", "This week", Utc(week), now),
            new Period("lastWeek", "Last week", Utc(week.AddDays(-7)), Utc(week)),
            new Period("thisMonth", "This month", Utc(month), now),
            new Period("lastMonth", "Last month", Utc(month.AddMonths(-1)), Utc(month))
        };
    }

    public static double ActiveSeconds(IEnumerable<Interval> intervals, Period period)
    {
        // Union overlapping tabs/devices so the same user's time is never counted twice.
        var total = 0d;
        var end = period.Start;
        foreach (var interval in intervals.OrderBy(i => i.Start))
        {
            var start = interval.Start > end ? interval.Start : end;
            var stop = interval.End < period.End ? interval.End : period.End;
            if (stop <= start) continue;
            total += (stop - start).TotalSeconds;
            end = stop;
        }
        return Math.Floor(total);
    }
}
