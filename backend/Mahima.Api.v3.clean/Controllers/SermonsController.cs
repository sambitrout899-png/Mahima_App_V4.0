using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using NpgsqlTypes;
using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.Threading.Tasks;

namespace Mahima.Api.v3.clean.Controllers
{
    /// <summary>
    /// Resource library controller. Handles three resource types — sermons,
    /// books, articles — all stored in the legacy "Sermons" table.
    ///
    /// Endpoints:
    ///   GET    /api/sermons                   — list with optional ?type=&search=&page=&pageSize=
    ///   GET    /api/sermons/{id}              — single record
    ///   POST   /api/sermons                   — create
    ///   PUT    /api/sermons/{id}              — update
    ///   DELETE /api/sermons/{id}              — delete
    ///   GET    /api/sermons/types             — list distinct types
    ///
    /// On startup the constructor ensures a "Type" column exists on the
    /// Sermons table (added automatically if missing) so books/articles
    /// can coexist with sermons.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class SermonsController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly ILogger<SermonsController> _logger;
        private readonly IWebHostEnvironment _env;

        // Allowed resource types. Anything else is normalised to "sermon".
        private static readonly HashSet<string> AllowedTypes =
            new(StringComparer.OrdinalIgnoreCase) { "sermon", "book", "article" };

        // Self-healing schema state. Once we confirm the Type column exists
        // (either it already did, or our migration succeeded) we set this
        // and never check again. Until then, every request does a cheap
        // information_schema lookup to decide which SQL to run.
        private static volatile bool _typeColumnExists = false;

        public SermonsController(IConfiguration config, ILogger<SermonsController> logger, IWebHostEnvironment env)
        {
            _logger = logger;
            _env = env;
            _connectionString = config.GetConnectionString("DefaultConnection") ?? config["DefaultConnection"];
        }

        /* =================================================================
           Helpers
           ================================================================= */

        private static string NormaliseType(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return "sermon";
            var v = raw.Trim().ToLowerInvariant();
            return AllowedTypes.Contains(v) ? v : "sermon";
        }

        // Returns true if the "Type" column exists on the "Sermons" table.
        // Tries to add it once if missing. Caches success in a static so we
        // only do the work the first few requests, but never falsely caches
        // success when the migration didn't run.
        private async Task<bool> EnsureSchemaAsync(NpgsqlConnection conn)
        {
            if (_typeColumnExists) return true;

            // Cheap read-only existence check.
            bool exists;
            const string check = @"
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'Sermons' AND column_name = 'Type'
                );";
            try
            {
                await using var cmd = new NpgsqlCommand(check, conn);
                exists = (bool)(await cmd.ExecuteScalarAsync() ?? false);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "EnsureSchemaAsync: column existence check failed.");
                return false;
            }

            if (exists)
            {
                _typeColumnExists = true;
                return true;
            }

            // Try to add it. If this fails (e.g. DB user lacks ALTER),
            // we just continue without — every SQL builder below adapts.
            try
            {
                const string add = @"ALTER TABLE ""Sermons"" ADD COLUMN ""Type"" text NOT NULL DEFAULT 'sermon';";
                await using var cmd = new NpgsqlCommand(add, conn);
                await cmd.ExecuteNonQueryAsync();
                _typeColumnExists = true;
                _logger.LogInformation("Sermons.Type column added by EnsureSchemaAsync.");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "EnsureSchemaAsync: could not add Type column (likely DB permission). " +
                    "Run this manually: ALTER TABLE \"Sermons\" ADD COLUMN \"Type\" text NOT NULL DEFAULT 'sermon';");
                return false;
            }
        }

        private bool ConnectionMissing(out IActionResult? failure)
        {
            if (string.IsNullOrWhiteSpace(_connectionString))
            {
                _logger.LogError("Missing connection string 'DefaultConnection'.");
                failure = StatusCode(500, "Missing connection string 'DefaultConnection'.");
                return true;
            }
            failure = null;
            return false;
        }

        private IActionResult Fail(Exception ex, string opLabel)
        {
            _logger.LogError(ex, "Sermons: {Op}", opLabel);
            if (_env.IsDevelopment())
                return StatusCode(500, $"{opLabel}: {ex.GetType().Name} - {ex.Message}");
            return StatusCode(500, opLabel);
        }

        // Convert any incoming date string to a Kind=Unspecified DateTime
        // suitable for an Npgsql `timestamp` column. Returns null if the
        // input is null or unparseable.
        private static DateTime? ParseDate(string? input)
        {
            if (string.IsNullOrWhiteSpace(input)) return null;
            if (!DateTime.TryParse(input, CultureInfo.InvariantCulture,
                                   DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                                   out var dt))
                return null;
            return DateTime.SpecifyKind(dt, DateTimeKind.Unspecified);
        }

        // Map a reader row to the JSON DTO the frontend expects.
        private static object MapRow(NpgsqlDataReader r)
        {
            DateTime? publishedAt = null;
            if (r["PublishedAt"] != DBNull.Value)
                publishedAt = r.GetFieldValue<DateTime>(r.GetOrdinal("PublishedAt"));

            int? duration = r["DurationSeconds"] != DBNull.Value
                ? r.GetInt32(r.GetOrdinal("DurationSeconds"))
                : null;

            return new
            {
                id           = r["Id"],
                title        = r["Title"] as string,
                description  = r["Description"] as string,
                s3Key        = r["S3Key"] as string,
                durationSeconds = duration,
                speaker      = r["Speaker"] as string,
                publishedAt  = publishedAt?.ToString("o"),
                youtubeUrl   = r["YoutubeUrl"] as string,
                type         = (r["Type"] as string) ?? "sermon",
            };
        }

        /* =================================================================
           GET /api/sermons
           ================================================================= */
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? type = null,
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 100,
            [FromQuery] string? sort = "date_desc")
        {
            if (ConnectionMissing(out var fail)) return fail!;

            try
            {
                if (page < 1) page = 1;
                if (pageSize < 1) pageSize = 100;
                if (pageSize > 500) pageSize = 500; // sanity cap
                var offset = (page - 1) * pageSize;

                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                var hasType = await EnsureSchemaAsync(conn);

                // Build WHERE
                var where = " WHERE 1=1 ";
                if (!string.IsNullOrWhiteSpace(type) && hasType)
                {
                    where += @" AND COALESCE(""Type"", 'sermon') = @type ";
                }
                else if (!string.IsNullOrWhiteSpace(type) && !hasType
                         && !string.Equals(NormaliseType(type), "sermon", StringComparison.OrdinalIgnoreCase))
                {
                    // No Type column means everything is implicitly a sermon.
                    // If the caller asked for books/articles, return nothing.
                    return Ok(new { items = Array.Empty<object>(), total = 0, page, pageSize, totalPages = 0 });
                }

                if (!string.IsNullOrWhiteSpace(search))
                {
                    where += @" AND (
                        ""Title""    ILIKE @q OR
                        COALESCE(""Speaker"", '')     ILIKE @q OR
                        COALESCE(""Description"", '') ILIKE @q
                    )";
                }

                // ORDER BY
                var orderBy = sort?.ToLowerInvariant() switch
                {
                    "date_asc"   => @"""PublishedAt"" ASC NULLS LAST, ""Id"" ASC",
                    "title_asc"  => @"""Title"" ASC",
                    "title_desc" => @"""Title"" DESC",
                    _            => @"""PublishedAt"" DESC NULLS LAST, ""Id"" DESC",
                };

                // Total count
                var countSql = $@"SELECT COUNT(*) FROM ""Sermons"" {where};";
                int total;
                await using (var countCmd = new NpgsqlCommand(countSql, conn))
                {
                    if (!string.IsNullOrWhiteSpace(type) && hasType)
                        countCmd.Parameters.AddWithValue("type", NpgsqlDbType.Text, NormaliseType(type));
                    if (!string.IsNullOrWhiteSpace(search))
                        countCmd.Parameters.AddWithValue("q", NpgsqlDbType.Text, $"%{search.Trim()}%");
                    total = Convert.ToInt32(await countCmd.ExecuteScalarAsync());
                }

                // SELECT — only reference Type column when it exists.
                var typeExpr = hasType ? @"COALESCE(""Type"", 'sermon')" : @"'sermon'";

                // Page
                var sql = $@"
                    SELECT
                        ""Id"", ""Title"", ""Description"", ""S3Key"", ""DurationSeconds"",
                        ""Speaker"", ""PublishedAt"", ""YoutubeUrl"",
                        {typeExpr} AS ""Type""
                    FROM ""Sermons""
                    {where}
                    ORDER BY {orderBy}
                    LIMIT @limit OFFSET @offset;";

                var items = new List<object>();
                await using (var cmd = new NpgsqlCommand(sql, conn))
                {
                    if (!string.IsNullOrWhiteSpace(type))
                        cmd.Parameters.AddWithValue("type", NpgsqlDbType.Text, NormaliseType(type));
                    if (!string.IsNullOrWhiteSpace(search))
                        cmd.Parameters.AddWithValue("q", NpgsqlDbType.Text, $"%{search.Trim()}%");
                    cmd.Parameters.AddWithValue("limit", NpgsqlDbType.Integer, pageSize);
                    cmd.Parameters.AddWithValue("offset", NpgsqlDbType.Integer, offset);

                    await using var reader = await cmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                        items.Add(MapRow(reader));
                }

                return Ok(new
                {
                    items,
                    total,
                    page,
                    pageSize,
                    totalPages = (int)Math.Ceiling(total / (double)pageSize),
                });
            }
            catch (Exception ex)
            {
                return Fail(ex, "Error fetching sermons");
            }
        }

        /* =================================================================
           GET /api/sermons/types
           Distinct list of types currently in the table — useful for tabs
           that should hide categories with zero entries.
           ================================================================= */
        [HttpGet("types")]
        public async Task<IActionResult> GetTypes()
        {
            if (ConnectionMissing(out var fail)) return fail!;
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                var hasType = await EnsureSchemaAsync(conn);

                var sql = hasType
                    ? @"SELECT COALESCE(""Type"", 'sermon') AS t, COUNT(*) AS c
                        FROM ""Sermons""
                        GROUP BY COALESCE(""Type"", 'sermon')
                        ORDER BY t;"
                    : @"SELECT 'sermon' AS t, COUNT(*) AS c FROM ""Sermons"";";

                var rows = new List<object>();
                await using var cmd = new NpgsqlCommand(sql, conn);
                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    rows.Add(new
                    {
                        type = reader.GetString(0),
                        count = reader.GetInt64(1),
                    });
                }
                return Ok(rows);
            }
            catch (Exception ex)
            {
                return Fail(ex, "Error fetching types");
            }
        }

        /* =================================================================
           GET /api/sermons/{id}
           ================================================================= */
        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int id)
        {
            if (ConnectionMissing(out var fail)) return fail!;

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                var hasType = await EnsureSchemaAsync(conn);

                var typeExpr = hasType ? @"COALESCE(""Type"", 'sermon')" : @"'sermon'";
                var sql = $@"
                    SELECT
                        ""Id"", ""Title"", ""Description"", ""S3Key"", ""DurationSeconds"",
                        ""Speaker"", ""PublishedAt"", ""YoutubeUrl"",
                        {typeExpr} AS ""Type""
                    FROM ""Sermons""
                    WHERE ""Id"" = @id
                    LIMIT 1;";
                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("id", NpgsqlDbType.Integer, id);

                await using var reader = await cmd.ExecuteReaderAsync();
                if (!await reader.ReadAsync()) return NotFound();
                return Ok(MapRow(reader));
            }
            catch (Exception ex)
            {
                return Fail(ex, "Error fetching sermon");
            }
        }

        /* =================================================================
           POST /api/sermons
           ================================================================= */
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] SermonDto dto)
        {
            if (ConnectionMissing(out var fail)) return fail!;
            if (dto == null) return BadRequest("Empty payload.");
            if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                var hasType = await EnsureSchemaAsync(conn);

                // Build INSERT column/value lists conditionally so we don't
                // reference Type when it's missing.
                var cols = @"""Title"", ""Description"", ""S3Key"", ""DurationSeconds"", ""Speaker"", ""PublishedAt"", ""YoutubeUrl""";
                var vals = "@title, @desc, @s3key, @duration, @speaker, @publishedAt, @youtube";
                if (hasType)
                {
                    cols += @", ""Type""";
                    vals += ", @type";
                }
                var sql = $@"INSERT INTO ""Sermons"" ({cols}) VALUES ({vals}) RETURNING ""Id"";";

                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("title", NpgsqlDbType.Text, dto.Title.Trim());
                cmd.Parameters.AddWithValue("desc", NpgsqlDbType.Text,
                    string.IsNullOrWhiteSpace(dto.Description ?? dto.Content)
                        ? (object)DBNull.Value
                        : (dto.Description ?? dto.Content)!.Trim());
                cmd.Parameters.AddWithValue("s3key", NpgsqlDbType.Text, dto.S3Key ?? string.Empty);
                cmd.Parameters.Add("duration", NpgsqlDbType.Integer).Value =
                    dto.DurationSeconds.HasValue ? dto.DurationSeconds.Value : (object)DBNull.Value;
                cmd.Parameters.Add("speaker", NpgsqlDbType.Text).Value =
                    string.IsNullOrWhiteSpace(dto.Speaker ?? dto.Preacher)
                        ? (object)DBNull.Value
                        : (dto.Speaker ?? dto.Preacher)!.Trim();
                cmd.Parameters.Add("publishedAt", NpgsqlDbType.Timestamp).Value =
                    (object?)ParseDate(dto.Date) ?? DBNull.Value;
                cmd.Parameters.Add("youtube", NpgsqlDbType.Text).Value =
                    string.IsNullOrWhiteSpace(dto.YoutubeUrl) ? (object)DBNull.Value : dto.YoutubeUrl.Trim();
                if (hasType)
                    cmd.Parameters.AddWithValue("type", NpgsqlDbType.Text, NormaliseType(dto.Type));

                var newIdObj = await cmd.ExecuteScalarAsync();
                if (newIdObj == null) return StatusCode(500, "Insert failed.");
                var newId = Convert.ToInt32(newIdObj);

                return CreatedAtAction(nameof(Get), new { id = newId }, new
                {
                    id = newId,
                    title = dto.Title?.Trim(),
                    speaker = dto.Speaker ?? dto.Preacher,
                    type = NormaliseType(dto.Type),
                    publishedAt = ParseDate(dto.Date)?.ToString("o"),
                    youtubeUrl = dto.YoutubeUrl,
                    description = dto.Description ?? dto.Content,
                    s3Key = dto.S3Key ?? string.Empty,
                    durationSeconds = dto.DurationSeconds,
                });
            }
            catch (Exception ex)
            {
                return Fail(ex, "Error creating sermon");
            }
        }

        /* =================================================================
           PUT /api/sermons/{id}
           ================================================================= */
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] SermonDto dto)
        {
            if (ConnectionMissing(out var fail)) return fail!;
            if (dto == null) return BadRequest("Empty payload.");

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                var hasType = await EnsureSchemaAsync(conn);

                // SET clause and RETURNING expression depend on whether the
                // Type column actually exists.
                var setClause = @"
                    ""Title""           = @title,
                    ""Description""     = @desc,
                    ""S3Key""           = @s3key,
                    ""DurationSeconds"" = @duration,
                    ""Speaker""         = @speaker,
                    ""PublishedAt""     = @publishedAt,
                    ""YoutubeUrl""      = @youtube";
                if (hasType) setClause += @",
                    ""Type""            = @type";

                var typeExpr = hasType ? @"COALESCE(""Type"", 'sermon')" : @"'sermon'";
                var sql = $@"
                    UPDATE ""Sermons"" SET {setClause}
                    WHERE ""Id"" = @id
                    RETURNING ""Id"", ""Title"", ""Description"", ""S3Key"", ""DurationSeconds"",
                              ""Speaker"", ""PublishedAt"", ""YoutubeUrl"",
                              {typeExpr} AS ""Type"";";

                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("id", NpgsqlDbType.Integer, id);
                cmd.Parameters.Add("title", NpgsqlDbType.Text).Value =
                    string.IsNullOrWhiteSpace(dto.Title) ? (object)DBNull.Value : dto.Title!.Trim();
                cmd.Parameters.Add("desc", NpgsqlDbType.Text).Value =
                    string.IsNullOrWhiteSpace(dto.Description ?? dto.Content)
                        ? (object)DBNull.Value
                        : (dto.Description ?? dto.Content)!.Trim();
                cmd.Parameters.AddWithValue("s3key", NpgsqlDbType.Text, dto.S3Key ?? string.Empty);
                cmd.Parameters.Add("duration", NpgsqlDbType.Integer).Value =
                    dto.DurationSeconds.HasValue ? dto.DurationSeconds.Value : (object)DBNull.Value;
                cmd.Parameters.Add("speaker", NpgsqlDbType.Text).Value =
                    string.IsNullOrWhiteSpace(dto.Speaker ?? dto.Preacher)
                        ? (object)DBNull.Value
                        : (dto.Speaker ?? dto.Preacher)!.Trim();
                cmd.Parameters.Add("publishedAt", NpgsqlDbType.Timestamp).Value =
                    (object?)ParseDate(dto.Date) ?? DBNull.Value;
                cmd.Parameters.Add("youtube", NpgsqlDbType.Text).Value =
                    string.IsNullOrWhiteSpace(dto.YoutubeUrl) ? (object)DBNull.Value : dto.YoutubeUrl.Trim();
                if (hasType)
                    cmd.Parameters.AddWithValue("type", NpgsqlDbType.Text, NormaliseType(dto.Type));

                await using var reader = await cmd.ExecuteReaderAsync();
                if (!await reader.ReadAsync()) return NotFound();
                return Ok(MapRow(reader));
            }
            catch (Exception ex)
            {
                return Fail(ex, "Error updating sermon");
            }
        }

        /* =================================================================
           DELETE /api/sermons/{id}
           ================================================================= */
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            if (ConnectionMissing(out var fail)) return fail!;
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                const string sql = @"DELETE FROM ""Sermons"" WHERE ""Id"" = @id;";
                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("id", NpgsqlDbType.Integer, id);

                var affected = await cmd.ExecuteNonQueryAsync();
                if (affected == 0) return NotFound();
                return NoContent();
            }
            catch (Exception ex)
            {
                return Fail(ex, "Error deleting sermon");
            }
        }

        /* =================================================================
           DTO
           ================================================================= */
        public class SermonDto
        {
            public string? Title { get; set; }
            // Either Speaker (preferred) or legacy Preacher accepted.
            public string? Speaker { get; set; }
            public string? Preacher { get; set; }
            public string? Date { get; set; }            // ISO-8601 string
            public string? YoutubeUrl { get; set; }
            // Either Description (preferred) or legacy Content accepted.
            public string? Description { get; set; }
            public string? Content { get; set; }
            public string? S3Key { get; set; }
            public int? DurationSeconds { get; set; }
            public string? Type { get; set; }            // sermon | book | article
        }
    }
}