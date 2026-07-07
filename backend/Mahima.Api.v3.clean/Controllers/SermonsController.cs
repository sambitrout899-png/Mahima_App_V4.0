<<<<<<< HEAD
﻿using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using Npgsql;
using NpgsqlTypes;
using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Mahima.Api.v3.clean.Controllers
{
    /// <summary>
    /// Resource library controller. Handles three resource types â€” sermons,
    /// books, articles â€” all stored in the legacy "Sermons" table.
    ///
    /// Endpoints:
    ///   GET    /api/sermons                   â€” list with optional ?type=&search=&page=&pageSize=
    ///   GET    /api/sermons/{id}              â€” single record
    ///   POST   /api/sermons                   â€” create
    ///   PUT    /api/sermons/{id}              â€” update
    ///   DELETE /api/sermons/{id}              â€” delete
    ///   GET    /api/sermons/types             â€” list distinct types
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
        private readonly IConfiguration _config;
        private readonly ILogger<SermonsController> _logger;
        private readonly IWebHostEnvironment _env;
        private const long MaxResourceBytes = 2L * 1024L * 1024L * 1024L;

        // Allowed resource types. Anything else is normalised to "sermon".
        private static readonly HashSet<string> AllowedTypes =
            new(StringComparer.OrdinalIgnoreCase) { "sermon", "book", "article" };

        // Self-healing schema state. Once we confirm the Type column exists
        // (either it already did, or our migration succeeded) we set this
        // and never check again. Until then, every request does a cheap
        // information_schema lookup to decide which SQL to run.
        private static volatile bool _typeColumnExists = false;
        private static volatile bool _resourceColumnsExist = false;
        private static volatile bool _purchaseTableExists = false;

        public SermonsController(IConfiguration config, ILogger<SermonsController> logger, IWebHostEnvironment env)
        {
            _config = config;
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
            if (_typeColumnExists)
            {
                await EnsureResourceColumnsAsync(conn);
                return true;
            }

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
                await EnsureResourceColumnsAsync(conn);
                return true;
            }

            // Try to add it. If this fails (e.g. DB user lacks ALTER),
            // we just continue without â€” every SQL builder below adapts.
            try
            {
                const string add = @"ALTER TABLE ""Sermons"" ADD COLUMN ""Type"" text NOT NULL DEFAULT 'sermon';";
                await using var cmd = new NpgsqlCommand(add, conn);
                await cmd.ExecuteNonQueryAsync();
                _typeColumnExists = true;
                _logger.LogInformation("Sermons.Type column added by EnsureSchemaAsync.");
                await EnsureResourceColumnsAsync(conn);
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

        private async Task<bool> EnsureResourceColumnsAsync(NpgsqlConnection conn)
        {
            if (_resourceColumnsExist) return true;

            try
            {
                const string add = @"
                    ALTER TABLE ""Sermons""
                        ADD COLUMN IF NOT EXISTS ""DigitalFilePath"" text,
                        ADD COLUMN IF NOT EXISTS ""DigitalFileName"" text,
                        ADD COLUMN IF NOT EXISTS ""DigitalContentType"" text,
                        ADD COLUMN IF NOT EXISTS ""DigitalSizeBytes"" bigint,
                        ADD COLUMN IF NOT EXISTS ""IsFree"" boolean NOT NULL DEFAULT true,
                        ADD COLUMN IF NOT EXISTS ""PriceAmount"" numeric(18,2) NOT NULL DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS ""Currency"" text NOT NULL DEFAULT 'INR';";
                await using var cmd = new NpgsqlCommand(add, conn);
                await cmd.ExecuteNonQueryAsync();
                _resourceColumnsExist = true;
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "EnsureResourceColumnsAsync: could not add resource columns. " +
                    "Run ALTER TABLE \"Sermons\" to add DigitalFilePath, DigitalFileName, DigitalContentType, DigitalSizeBytes, IsFree, PriceAmount, Currency.");
                return false;
            }
        }

        private async Task EnsurePurchaseTableAsync(NpgsqlConnection conn)
        {
            if (_purchaseTableExists) return;
            const string sql = @"
                CREATE TABLE IF NOT EXISTS public.resource_purchases (
                    id bigserial PRIMARY KEY,
                    resource_id integer NOT NULL,
                    user_id uuid NOT NULL,
                    razorpay_order_id text,
                    razorpay_payment_id text,
                    amount numeric(18,2) NOT NULL DEFAULT 0,
                    currency text NOT NULL DEFAULT 'INR',
                    created_at_utc timestamp without time zone NOT NULL DEFAULT now()
                );
                CREATE UNIQUE INDEX IF NOT EXISTS ux_resource_purchases_resource_user
                    ON public.resource_purchases(resource_id, user_id);";
            await using var cmd = new NpgsqlCommand(sql, conn);
            await cmd.ExecuteNonQueryAsync();
            _purchaseTableExists = true;
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
            long? digitalSize = r["DigitalSizeBytes"] != DBNull.Value
                ? r.GetInt64(r.GetOrdinal("DigitalSizeBytes"))
                : null;
            var isFree = r["IsFree"] == DBNull.Value || r.GetBoolean(r.GetOrdinal("IsFree"));
            var priceAmount = r["PriceAmount"] == DBNull.Value ? 0m : r.GetDecimal(r.GetOrdinal("PriceAmount"));
            var digitalFilePath = r["DigitalFilePath"] as string;
            var digitalContentType = r["DigitalContentType"] as string;

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
                hasDigitalFile = !string.IsNullOrWhiteSpace(digitalFilePath),
                digitalFileName = r["DigitalFileName"] as string,
                digitalContentType,
                digitalSizeBytes = digitalSize,
                digitalFileKind = GetDigitalFileKind(digitalContentType),
                isFree,
                priceAmount,
                currency = (r["Currency"] as string) ?? "INR",
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
                var hasResourceColumns = _resourceColumnsExist;

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

                // SELECT â€” only reference Type column when it exists.
                var typeExpr = hasType ? @"COALESCE(""Type"", 'sermon')" : @"'sermon'";
                var resourceExpr = hasResourceColumns
                    ? @"""DigitalFilePath"", ""DigitalFileName"", ""DigitalContentType"", ""DigitalSizeBytes"", ""IsFree"", ""PriceAmount"", ""Currency"""
                    : @"NULL::text AS ""DigitalFilePath"", NULL::text AS ""DigitalFileName"", NULL::text AS ""DigitalContentType"", NULL::bigint AS ""DigitalSizeBytes"", true AS ""IsFree"", 0::numeric AS ""PriceAmount"", 'INR'::text AS ""Currency""";

                // Page
                var sql = $@"
                    SELECT
                        ""Id"", ""Title"", ""Description"", ""S3Key"", ""DurationSeconds"",
                        ""Speaker"", ""PublishedAt"", ""YoutubeUrl"",
                        {typeExpr} AS ""Type"",
                        {resourceExpr}
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
           Distinct list of types currently in the table â€” useful for tabs
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
                var hasResourceColumns = _resourceColumnsExist;

                var typeExpr = hasType ? @"COALESCE(""Type"", 'sermon')" : @"'sermon'";
                var resourceExpr = hasResourceColumns
                    ? @"""DigitalFilePath"", ""DigitalFileName"", ""DigitalContentType"", ""DigitalSizeBytes"", ""IsFree"", ""PriceAmount"", ""Currency"""
                    : @"NULL::text AS ""DigitalFilePath"", NULL::text AS ""DigitalFileName"", NULL::text AS ""DigitalContentType"", NULL::bigint AS ""DigitalSizeBytes"", true AS ""IsFree"", 0::numeric AS ""PriceAmount"", 'INR'::text AS ""Currency""";
                var sql = $@"
                    SELECT
                        ""Id"", ""Title"", ""Description"", ""S3Key"", ""DurationSeconds"",
                        ""Speaker"", ""PublishedAt"", ""YoutubeUrl"",
                        {typeExpr} AS ""Type"",
                        {resourceExpr}
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
        [Microsoft.AspNetCore.Authorization.Authorize]
=======
﻿using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using NpgsqlTypes;
using System;
using System.Collections.Generic;
using System.Data;
using System.Globalization;
using System.Security.Claims;
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
        private static readonly Guid RootTenantId = Guid.Parse("00000000-0000-0000-0000-000000000001");

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

        private Guid GetCurrentTenantId() =>
            Guid.TryParse(User.FindFirstValue("tenant_id"), out var id)
                ? id
                : RootTenantId;

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
                var where = @" WHERE ""TenantId"" = @tenantId ";
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
                    countCmd.Parameters.AddWithValue("tenantId", NpgsqlDbType.Uuid, GetCurrentTenantId());
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
                    cmd.Parameters.AddWithValue("tenantId", NpgsqlDbType.Uuid, GetCurrentTenantId());
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
                        WHERE ""TenantId"" = @tenantId
                        GROUP BY COALESCE(""Type"", 'sermon')
                        ORDER BY t;"
                    : @"SELECT 'sermon' AS t, COUNT(*) AS c FROM ""Sermons"" WHERE ""TenantId"" = @tenantId;";

                var rows = new List<object>();
                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("tenantId", NpgsqlDbType.Uuid, GetCurrentTenantId());
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
                    WHERE ""Id"" = @id AND ""TenantId"" = @tenantId
                    LIMIT 1;";
                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("id", NpgsqlDbType.Integer, id);
                cmd.Parameters.AddWithValue("tenantId", NpgsqlDbType.Uuid, GetCurrentTenantId());

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
>>>>>>> 6b902a41 (Update Mahima app server files and related changes)
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
                if (!await CanManageMediaAsync(conn)) return Forbid();
                var hasType = await EnsureSchemaAsync(conn);
<<<<<<< HEAD
                var hasResourceColumns = _resourceColumnsExist;

                // Build INSERT column/value lists conditionally so we don't
                // reference Type when it's missing.
                var cols = @"""Title"", ""Description"", ""S3Key"", ""DurationSeconds"", ""Speaker"", ""PublishedAt"", ""YoutubeUrl""";
                var vals = "@title, @desc, @s3key, @duration, @speaker, @publishedAt, @youtube";
                if (hasType)
                {
                    cols += @", ""Type""";
                    vals += ", @type";
                }
                if (hasResourceColumns)
                {
                    cols += @", ""IsFree"", ""PriceAmount"", ""Currency""";
                    vals += ", @isFree, @priceAmount, @currency";
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
                if (hasResourceColumns)
                {
                    var isFree = dto.IsFree ?? dto.PriceAmount.GetValueOrDefault() <= 0m;
                    var price = isFree ? 0m : Math.Max(0m, dto.PriceAmount.GetValueOrDefault());
                    cmd.Parameters.AddWithValue("isFree", NpgsqlDbType.Boolean, isFree);
                    cmd.Parameters.AddWithValue("priceAmount", NpgsqlDbType.Numeric, price);
                    cmd.Parameters.AddWithValue("currency", NpgsqlDbType.Text, string.IsNullOrWhiteSpace(dto.Currency) ? "INR" : dto.Currency.Trim().ToUpperInvariant());
                }

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
                    isFree = dto.IsFree ?? dto.PriceAmount.GetValueOrDefault() <= 0m,
                    priceAmount = dto.PriceAmount.GetValueOrDefault(),
                    currency = string.IsNullOrWhiteSpace(dto.Currency) ? "INR" : dto.Currency.Trim().ToUpperInvariant(),
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
        [Microsoft.AspNetCore.Authorization.Authorize]
=======

                // Build INSERT column/value lists conditionally so we don't
                // reference Type when it's missing.
                var cols = @"""TenantId"", ""Title"", ""Description"", ""S3Key"", ""DurationSeconds"", ""Speaker"", ""PublishedAt"", ""YoutubeUrl""";
                var vals = "@tenantId, @title, @desc, @s3key, @duration, @speaker, @publishedAt, @youtube";
                if (hasType)
                {
                    cols += @", ""Type""";
                    vals += ", @type";
                }
                var sql = $@"INSERT INTO ""Sermons"" ({cols}) VALUES ({vals}) RETURNING ""Id"";";

                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("tenantId", NpgsqlDbType.Uuid, GetCurrentTenantId());
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
>>>>>>> 6b902a41 (Update Mahima app server files and related changes)
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] SermonDto dto)
        {
            if (ConnectionMissing(out var fail)) return fail!;
            if (dto == null) return BadRequest("Empty payload.");

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                if (!await CanManageMediaAsync(conn)) return Forbid();
                var hasType = await EnsureSchemaAsync(conn);
<<<<<<< HEAD
                var hasResourceColumns = _resourceColumnsExist;

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
                if (hasResourceColumns) setClause += @",
                    ""IsFree""          = @isFree,
                    ""PriceAmount""     = @priceAmount,
                    ""Currency""        = @currency";

                var typeExpr = hasType ? @"COALESCE(""Type"", 'sermon')" : @"'sermon'";
                var resourceExpr = hasResourceColumns
                    ? @"""DigitalFilePath"", ""DigitalFileName"", ""DigitalContentType"", ""DigitalSizeBytes"", ""IsFree"", ""PriceAmount"", ""Currency"""
                    : @"NULL::text AS ""DigitalFilePath"", NULL::text AS ""DigitalFileName"", NULL::text AS ""DigitalContentType"", NULL::bigint AS ""DigitalSizeBytes"", true AS ""IsFree"", 0::numeric AS ""PriceAmount"", 'INR'::text AS ""Currency""";
                var sql = $@"
                    UPDATE ""Sermons"" SET {setClause}
                    WHERE ""Id"" = @id
                    RETURNING ""Id"", ""Title"", ""Description"", ""S3Key"", ""DurationSeconds"",
                              ""Speaker"", ""PublishedAt"", ""YoutubeUrl"",
                              {typeExpr} AS ""Type"",
                              {resourceExpr};";

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
                if (hasResourceColumns)
                {
                    var isFree = dto.IsFree ?? dto.PriceAmount.GetValueOrDefault() <= 0m;
                    var price = isFree ? 0m : Math.Max(0m, dto.PriceAmount.GetValueOrDefault());
                    cmd.Parameters.AddWithValue("isFree", NpgsqlDbType.Boolean, isFree);
                    cmd.Parameters.AddWithValue("priceAmount", NpgsqlDbType.Numeric, price);
                    cmd.Parameters.AddWithValue("currency", NpgsqlDbType.Text, string.IsNullOrWhiteSpace(dto.Currency) ? "INR" : dto.Currency.Trim().ToUpperInvariant());
                }

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
        [Microsoft.AspNetCore.Authorization.Authorize]
=======

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
                    WHERE ""Id"" = @id AND ""TenantId"" = @tenantId
                    RETURNING ""Id"", ""Title"", ""Description"", ""S3Key"", ""DurationSeconds"",
                              ""Speaker"", ""PublishedAt"", ""YoutubeUrl"",
                              {typeExpr} AS ""Type"";";

                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("id", NpgsqlDbType.Integer, id);
                cmd.Parameters.AddWithValue("tenantId", NpgsqlDbType.Uuid, GetCurrentTenantId());
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
>>>>>>> 6b902a41 (Update Mahima app server files and related changes)
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            if (ConnectionMissing(out var fail)) return fail!;
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                if (!await CanManageMediaAsync(conn)) return Forbid();

<<<<<<< HEAD
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

        [Microsoft.AspNetCore.Authorization.Authorize]
        [HttpPost("{id:int}/digital-file")]
        [RequestSizeLimit(MaxResourceBytes)]
        [RequestFormLimits(MultipartBodyLengthLimit = MaxResourceBytes)]
        public async Task<IActionResult> UploadDigitalFile(int id, [FromForm] IFormFile file)
=======
                const string sql = @"DELETE FROM ""Sermons"" WHERE ""Id"" = @id AND ""TenantId"" = @tenantId;";
                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("id", NpgsqlDbType.Integer, id);
                cmd.Parameters.AddWithValue("tenantId", NpgsqlDbType.Uuid, GetCurrentTenantId());

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
>>>>>>> 6b902a41 (Update Mahima app server files and related changes)
        {
            if (ConnectionMissing(out var fail)) return fail!;
            if (file == null || file.Length == 0) return BadRequest("Digital file is required.");

            var extension = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(extension)) return BadRequest("File extension is required.");

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                if (!await CanManageMediaAsync(conn)) return Forbid();
                await EnsureSchemaAsync(conn);
                if (!_resourceColumnsExist) return StatusCode(500, "Resource file columns are not available.");

                var resource = await LoadResourceAccessAsync(conn, id);
                if (resource == null) return NotFound();
                var resourceType = NormaliseType(resource.Type);
                if (!IsAllowedResourceUpload(resourceType, extension))
                    return BadRequest(resourceType == "sermon"
                        ? "Sermons support MP3, WAV, M4A, MP4, MOV, WEBM, PDF, Word, text, or ZIP files."
                        : "Books and articles support PDF, EPUB, MOBI, Word, text, or ZIP files.");

                string root;
                try
                {
                    root = GetResourceFileRoot();
                }
                catch (UnauthorizedAccessException ex)
                {
                    _logger.LogError(ex, "Resource file storage is not writable.");
                    return StatusCode(500, "Resource file storage is not writable. Please set ServerFiles:Root or MAHIMA_DOWNLOADS_ROOT to a writable folder or fix folder permissions.");
                }
                var typeFolder = Path.Combine(root, resourceType);
                Directory.CreateDirectory(typeFolder);
                var storedName = $"{id}-{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
                var storedPath = Path.Combine(resourceType, storedName).Replace('\\', '/');
                var fullPath = Path.Combine(typeFolder, storedName);

                await using (var stream = System.IO.File.Create(fullPath))
                {
                    await file.CopyToAsync(stream, HttpContext.RequestAborted);
                }

                const string sql = @"
                    UPDATE ""Sermons""
                    SET ""DigitalFilePath"" = @path,
                        ""DigitalFileName"" = @name,
                        ""DigitalContentType"" = @contentType,
                        ""DigitalSizeBytes"" = @size
                    WHERE ""Id"" = @id;";
                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("id", NpgsqlDbType.Integer, id);
                cmd.Parameters.AddWithValue("path", NpgsqlDbType.Text, storedPath);
                cmd.Parameters.AddWithValue("name", NpgsqlDbType.Text, string.IsNullOrWhiteSpace(file.FileName) ? storedName : Path.GetFileName(file.FileName));
                cmd.Parameters.AddWithValue("contentType", NpgsqlDbType.Text, string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType);
                cmd.Parameters.AddWithValue("size", NpgsqlDbType.Bigint, file.Length);
                var affected = await cmd.ExecuteNonQueryAsync();
                if (affected == 0) return NotFound();

                return Ok(new
                {
                    hasDigitalFile = true,
                    digitalFileName = file.FileName,
                    digitalContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
                    digitalSizeBytes = file.Length,
                    digitalFileKind = GetDigitalFileKind(string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType),
                    serverFilesPath = $"Resources/{storedPath}"
                });
            }
            catch (Exception ex)
            {
                return Fail(ex, "Error uploading digital file");
            }
        }

        [Microsoft.AspNetCore.Authorization.Authorize]
        [HttpGet("{id:int}/download")]
        public async Task<IActionResult> DownloadDigitalFile(int id)
        {
            if (ConnectionMissing(out var fail)) return fail!;
            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                await EnsureSchemaAsync(conn);
                var resource = await LoadResourceAccessAsync(conn, id);
                if (resource == null) return NotFound();
                if (string.IsNullOrWhiteSpace(resource.DigitalFilePath)) return NotFound("No digital file has been uploaded for this resource.");

                var userId = CurrentUserId();
                var allowed = resource.IsFree || IsAdminUser() || (userId.HasValue && await HasPurchasedAsync(conn, id, userId.Value));
                if (!allowed) return StatusCode(402, "Payment is required before download.");

                var root = GetResourceFileRoot();
                var fullPath = Path.GetFullPath(Path.Combine(root, resource.DigitalFilePath));
                var rootPath = Path.GetFullPath(root);
                if (!fullPath.StartsWith(rootPath, StringComparison.OrdinalIgnoreCase) || !System.IO.File.Exists(fullPath))
                {
                    var legacyPath = Path.GetFullPath(Path.Combine(GetLegacyResourceFileRoot(), resource.DigitalFilePath));
                    var legacyRoot = Path.GetFullPath(GetLegacyResourceFileRoot());
                    if (!legacyPath.StartsWith(legacyRoot, StringComparison.OrdinalIgnoreCase) || !System.IO.File.Exists(legacyPath))
                        return NotFound("Digital file is missing from storage.");
                    fullPath = legacyPath;
                }

                return PhysicalFile(fullPath, resource.DigitalContentType ?? "application/octet-stream", resource.DigitalFileName ?? Path.GetFileName(fullPath), enableRangeProcessing: true);
            }
            catch (Exception ex)
            {
                return Fail(ex, "Error downloading digital file");
            }
        }

        [Microsoft.AspNetCore.Authorization.Authorize]
        [HttpPost("{id:int}/razorpay-order")]
        public async Task<IActionResult> CreateRazorpayOrder(int id)
        {
            if (ConnectionMissing(out var fail)) return fail!;
            var keyId = _config["Razorpay:KeyId"] ?? Environment.GetEnvironmentVariable("RAZORPAY_KEY_ID");
            var keySecret = _config["Razorpay:KeySecret"] ?? Environment.GetEnvironmentVariable("RAZORPAY_KEY_SECRET");
            if (string.IsNullOrWhiteSpace(keyId) || string.IsNullOrWhiteSpace(keySecret))
                return StatusCode(500, "Razorpay is not configured.");

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                await EnsureSchemaAsync(conn);
                var resource = await LoadResourceAccessAsync(conn, id);
                if (resource == null) return NotFound();
                if (resource.IsFree || resource.PriceAmount <= 0) return BadRequest("This resource is free.");
                if (string.IsNullOrWhiteSpace(resource.DigitalFilePath)) return BadRequest("No digital file has been uploaded for this resource.");

                var amountPaise = (int)Math.Round(resource.PriceAmount * 100m, MidpointRounding.AwayFromZero);
                var payload = JsonSerializer.Serialize(new
                {
                    amount = amountPaise,
                    currency = resource.Currency,
                    receipt = $"resource-{id}-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}",
                    notes = new { resourceId = id, resourceTitle = resource.Title ?? "Mahima resource" }
                });

                using var http = new HttpClient();
                var auth = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{keyId}:{keySecret}"));
                http.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", auth);
                using var content = new StringContent(payload, Encoding.UTF8, "application/json");
                using var response = await http.PostAsync("https://api.razorpay.com/v1/orders", content, HttpContext.RequestAborted);
                var body = await response.Content.ReadAsStringAsync(HttpContext.RequestAborted);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Razorpay order failed for resource {ResourceId}: {Status} {Body}", id, response.StatusCode, body);
                    return StatusCode(502, "Could not create Razorpay order.");
                }

                using var doc = JsonDocument.Parse(body);
                var orderId = doc.RootElement.GetProperty("id").GetString();
                return Ok(new
                {
                    keyId,
                    orderId,
                    amount = amountPaise,
                    currency = resource.Currency,
                    name = resource.Title,
                    description = "Mahima Ministry digital resource"
                });
            }
            catch (Exception ex)
            {
                return Fail(ex, "Error creating Razorpay order");
            }
        }

        [Microsoft.AspNetCore.Authorization.Authorize]
        [HttpPost("{id:int}/razorpay-verify")]
        public async Task<IActionResult> VerifyRazorpayPayment(int id, [FromBody] RazorpayVerifyDto dto)
        {
            if (ConnectionMissing(out var fail)) return fail!;
            if (dto == null || string.IsNullOrWhiteSpace(dto.RazorpayOrderId) ||
                string.IsNullOrWhiteSpace(dto.RazorpayPaymentId) || string.IsNullOrWhiteSpace(dto.RazorpaySignature))
                return BadRequest("Razorpay payment details are required.");

            var keySecret = _config["Razorpay:KeySecret"] ?? Environment.GetEnvironmentVariable("RAZORPAY_KEY_SECRET");
            if (string.IsNullOrWhiteSpace(keySecret)) return StatusCode(500, "Razorpay is not configured.");

            var expected = HmacSha256($"{dto.RazorpayOrderId}|{dto.RazorpayPaymentId}", keySecret);
            if (!FixedTimeEquals(expected, dto.RazorpaySignature))
                return BadRequest("Invalid Razorpay signature.");

            var userId = CurrentUserId();
            if (!userId.HasValue) return Unauthorized();

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();
                await EnsureSchemaAsync(conn);
                await EnsurePurchaseTableAsync(conn);
                var resource = await LoadResourceAccessAsync(conn, id);
                if (resource == null) return NotFound();

                const string sql = @"
                    INSERT INTO public.resource_purchases
                        (resource_id, user_id, razorpay_order_id, razorpay_payment_id, amount, currency, created_at_utc)
                    VALUES
                        (@resourceId, @userId, @orderId, @paymentId, @amount, @currency, now())
                    ON CONFLICT (resource_id, user_id) DO UPDATE
                    SET razorpay_order_id = EXCLUDED.razorpay_order_id,
                        razorpay_payment_id = EXCLUDED.razorpay_payment_id,
                        amount = EXCLUDED.amount,
                        currency = EXCLUDED.currency,
                        created_at_utc = now();";
                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("resourceId", NpgsqlDbType.Integer, id);
                cmd.Parameters.AddWithValue("userId", NpgsqlDbType.Uuid, userId.Value);
                cmd.Parameters.AddWithValue("orderId", NpgsqlDbType.Text, dto.RazorpayOrderId.Trim());
                cmd.Parameters.AddWithValue("paymentId", NpgsqlDbType.Text, dto.RazorpayPaymentId.Trim());
                cmd.Parameters.AddWithValue("amount", NpgsqlDbType.Numeric, resource.PriceAmount);
                cmd.Parameters.AddWithValue("currency", NpgsqlDbType.Text, resource.Currency);
                await cmd.ExecuteNonQueryAsync();

                return Ok(new { paid = true, canDownload = true });
            }
            catch (Exception ex)
            {
                return Fail(ex, "Error verifying Razorpay payment");
            }
        }

        private string GetResourceFileRoot()
        {
            var configured =
                _config["Resources:FileRoot"] ??
                Environment.GetEnvironmentVariable("MAHIMA_RESOURCE_FILE_ROOT");

            if (string.IsNullOrWhiteSpace(configured))
                configured = Path.Combine(GetServerFilesRoot(), "Resources");

            Directory.CreateDirectory(configured);
            return Path.GetFullPath(configured);
        }

        private string GetServerFilesRoot()
        {
            var configured = _config["ServerFiles:Root"]
                ?? Environment.GetEnvironmentVariable("MAHIMA_DOWNLOADS_ROOT");

            if (string.IsNullOrWhiteSpace(configured))
            {
                configured = OperatingSystem.IsLinux()
                    ? "/var/www/mahima-downloads"
                    : Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "downloads");
            }

            Directory.CreateDirectory(configured);
            return Path.GetFullPath(configured);
        }

        private string GetLegacyResourceFileRoot()
        {
            var configured =
                _config["Resources:FileRoot"] ??
                Environment.GetEnvironmentVariable("MAHIMA_RESOURCE_FILE_ROOT") ??
                Path.Combine(_env.ContentRootPath, "App_Data", "resource-files");
            return Path.GetFullPath(configured);
        }

        private static bool IsAllowedResourceUpload(string resourceType, string extension)
        {
            var documentExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                ".pdf", ".epub", ".mobi", ".doc", ".docx", ".txt", ".zip"
            };
            var sermonMediaExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                ".mp3", ".wav", ".m4a", ".aac", ".ogg", ".mp4", ".mov", ".m4v", ".webm"
            };

            return documentExtensions.Contains(extension) ||
                   (string.Equals(resourceType, "sermon", StringComparison.OrdinalIgnoreCase) && sermonMediaExtensions.Contains(extension));
        }

        private static string GetDigitalFileKind(string? contentType)
        {
            if (string.IsNullOrWhiteSpace(contentType)) return "file";
            if (contentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase)) return "video";
            if (contentType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase)) return "audio";
            if (contentType.Contains("pdf", StringComparison.OrdinalIgnoreCase)) return "pdf";
            return "file";
        }

        private Guid? CurrentUserId()
        {
            var raw =
                User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                User.FindFirstValue("sub") ??
                User.FindFirstValue("nameid");
            return Guid.TryParse(raw, out var id) ? id : null;
        }
<<<<<<< HEAD

        private static string NormalizeAccessName(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;
            return new string(value.ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray());
        }

        private static bool IsMediaManagerRoleName(string? value)
        {
            var role = NormalizeAccessName(value);
            return role is "admin" or "administrator" or "superadmin" or "superadministrator" or "mediamanager";
        }

        private bool IsAdminUser()
        {
            return User.IsInRole("admin") ||
                   User.IsInRole("ADMIN") ||
                   User.IsInRole("Media Manager") ||
                   User.Claims.Any(c =>
                       (c.Type == ClaimTypes.Role || c.Type.EndsWith("/role", StringComparison.OrdinalIgnoreCase) || c.Type == "role") &&
                       IsMediaManagerRoleName(c.Value));
        }

        private async Task<bool> CanManageMediaAsync(NpgsqlConnection conn)
        {
            if (IsAdminUser()) return true;

            var userId = CurrentUserId();
            if (!userId.HasValue) return false;

            const string ensureUserRoles = @"
                CREATE TABLE IF NOT EXISTS public.user_roles (
                    user_id uuid NOT NULL,
                    role_id integer NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
                    assigned_at timestamp without time zone NOT NULL DEFAULT now(),
                    assigned_by uuid NULL,
                    PRIMARY KEY (user_id, role_id)
                );";
            await using (var guard = new NpgsqlCommand(ensureUserRoles, conn))
            {
                await guard.ExecuteNonQueryAsync();
            }

            const string sql = @"
                SELECT EXISTS (
                    SELECT 1
                    FROM public.user_roles ur
                    JOIN public.roles r ON r.id = ur.role_id
                    WHERE ur.user_id = @userId
                      AND regexp_replace(lower(coalesce(r.name, '')), '[^a-z0-9]', '', 'g')
                          IN ('admin', 'administrator', 'superadmin', 'superadministrator', 'mediamanager')
                )
                OR EXISTS (
                    SELECT 1
                    FROM public.users u
                    LEFT JOIN public.roles r ON r.id::text = u.role::text
                    WHERE u.id = @userId
                      AND (
                          regexp_replace(lower(coalesce(u.role, '')), '[^a-z0-9]', '', 'g')
                              IN ('admin', 'administrator', 'superadmin', 'superadministrator', 'mediamanager')
                          OR regexp_replace(lower(coalesce(r.name, '')), '[^a-z0-9]', '', 'g')
                              IN ('admin', 'administrator', 'superadmin', 'superadministrator', 'mediamanager')
                      )
                );";
            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("userId", NpgsqlDbType.Uuid, userId.Value);
            return (bool)(await cmd.ExecuteScalarAsync() ?? false);
        }

        private async Task<ResourceAccess?> LoadResourceAccessAsync(NpgsqlConnection conn, int id)
        {
            await EnsureSchemaAsync(conn);
            if (!_resourceColumnsExist) return null;

            var hasType = _typeColumnExists;
            var typeExpr = hasType ? @"COALESCE(""Type"", 'sermon')" : @"'sermon'";
            var sql = $@"
                SELECT ""Id"", ""Title"", ""DigitalFilePath"", ""DigitalFileName"", ""DigitalContentType"",
                       ""IsFree"", ""PriceAmount"", ""Currency"", {typeExpr} AS ""Type""
                FROM ""Sermons""
                WHERE ""Id"" = @id
                LIMIT 1;";
            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("id", NpgsqlDbType.Integer, id);
            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;

            return new ResourceAccess
            {
                Id = Convert.ToInt32(reader["Id"]),
                Title = reader["Title"] as string,
                DigitalFilePath = reader["DigitalFilePath"] as string,
                DigitalFileName = reader["DigitalFileName"] as string,
                DigitalContentType = reader["DigitalContentType"] as string,
                IsFree = reader["IsFree"] == DBNull.Value || reader.GetBoolean(reader.GetOrdinal("IsFree")),
                PriceAmount = reader["PriceAmount"] == DBNull.Value ? 0m : reader.GetDecimal(reader.GetOrdinal("PriceAmount")),
                Currency = (reader["Currency"] as string) ?? "INR",
                Type = (reader["Type"] as string) ?? "sermon"
            };
        }

        private async Task<bool> HasPurchasedAsync(NpgsqlConnection conn, int resourceId, Guid userId)
        {
            await EnsurePurchaseTableAsync(conn);
            const string sql = @"
                SELECT EXISTS (
                    SELECT 1
                    FROM public.resource_purchases
                    WHERE resource_id = @resourceId AND user_id = @userId
                );";
            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("resourceId", NpgsqlDbType.Integer, resourceId);
            cmd.Parameters.AddWithValue("userId", NpgsqlDbType.Uuid, userId);
            return (bool)(await cmd.ExecuteScalarAsync() ?? false);
        }

        private static string HmacSha256(string value, string secret)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(value));
            return Convert.ToHexString(hash).ToLowerInvariant();
        }

        private static bool FixedTimeEquals(string left, string right)
        {
            var leftBytes = Encoding.UTF8.GetBytes(left ?? "");
            var rightBytes = Encoding.UTF8.GetBytes(right ?? "");
            return leftBytes.Length == rightBytes.Length &&
                   CryptographicOperations.FixedTimeEquals(leftBytes, rightBytes);
        }

        private sealed class ResourceAccess
        {
            public int Id { get; set; }
            public string? Title { get; set; }
            public string? DigitalFilePath { get; set; }
            public string? DigitalFileName { get; set; }
            public string? DigitalContentType { get; set; }
            public bool IsFree { get; set; }
            public decimal PriceAmount { get; set; }
            public string Currency { get; set; } = "INR";
            public string Type { get; set; } = "sermon";
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
            public bool? IsFree { get; set; }
            public decimal? PriceAmount { get; set; }
            public string? Currency { get; set; }
        }

        public class RazorpayVerifyDto
        {
            public string? RazorpayOrderId { get; set; }
            public string? RazorpayPaymentId { get; set; }
            public string? RazorpaySignature { get; set; }
        }
    }
}


=======
    }
}
>>>>>>> 6b902a41 (Update Mahima app server files and related changes)
