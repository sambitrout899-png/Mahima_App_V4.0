﻿using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using System.Text.Json;
using Mahima.Api.v3.clean.Models;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly string? _connectionString;
        private readonly ILogger<UsersController> _logger;
        private readonly IHostEnvironment _env;

        public UsersController(IConfiguration configuration, ILogger<UsersController> logger, IHostEnvironment env)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection");
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _env = env ?? throw new ArgumentNullException(nameof(env));
        }

        // DTO used for admin reset via POST /api/users/{id}/reset-password
        public class ResetPasswordDto
        {
            public string? NewPassword { get; set; }
        }

        // DTO for enrichment fields (Birthday -> IsPastor)
        public class EnrichUserDto
        {
            public DateTime? Birthday { get; set; }
            public string? MaritalStatus { get; set; }
            public string? Sex { get; set; }
            public bool? IsBaptized { get; set; }
            public string? BaptismPlace { get; set; }
            public DateTime? BaptismDate { get; set; }
            public bool? IsBornAgain { get; set; }
            public bool? IsBeliever { get; set; }
            public int? Age { get; set; }
            public string? AadharNumber { get; set; }
            public string? HomeAddress { get; set; }
            public string? CurrentAddress { get; set; }
            public string? EmergencyContactPhone { get; set; }
            public bool? IsPastor { get; set; }
        }

        // GET api/users?search=&page=1&limit=50
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int limit = 50)
        {
            if (string.IsNullOrWhiteSpace(_connectionString))
            {
                _logger.LogError("Missing connection string 'DefaultConnection'.");
                return StatusCode(500, "Missing connection string 'DefaultConnection'.");
            }

            if (page < 1) page = 1;
            if (limit < 1 || limit > 500) limit = 50;
            var offset = (page - 1) * limit;

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                // ---------- NO SEARCH ----------
                if (string.IsNullOrWhiteSpace(search))
                {
                    await using var countCmd = new NpgsqlCommand(@"SELECT COUNT(*) FROM users", conn);
                    var totalObj = await countCmd.ExecuteScalarAsync();
                    var total = Convert.ToInt32(totalObj);

                    // Include enrichment + UserCode
                    await using var cmd = new NpgsqlCommand(@"
                        SELECT
                            id            AS ""Id"",
                            username      AS ""Username"",
                            ""UserCode"",
                            email         AS ""Email"",
                            displayname   AS ""DisplayName"",
                            role          AS ""Role"",
                            phone         AS ""Phone"",
                            joindate      AS ""JoinDate"",
                            lastlogin     AS ""LastLogin"",
                            ""Birthday"",
                            ""MaritalStatus"",
                            ""Sex"",
                            ""IsBaptized"",
                            ""BaptismPlace"",
                            ""BaptismDate"",
                            ""IsBornAgain"",
                            ""IsBeliever"",
                            ""Age"",
                            ""AadharNumber"",
                            ""HomeAddress"",
                            ""CurrentAddress"",
                            ""EmergencyContactPhone"",
                            ""IsPastor""
                        FROM users
                        ORDER BY COALESCE(displayname, username) ASC
                        LIMIT @limit OFFSET @offset;", conn);

                    cmd.Parameters.AddWithValue("limit", NpgsqlTypes.NpgsqlDbType.Integer, limit);
                    cmd.Parameters.AddWithValue("offset", NpgsqlTypes.NpgsqlDbType.Integer, offset);

                    var items = new List<object>();
                    await using (var rdr = await cmd.ExecuteReaderAsync())
                    {
                        while (await rdr.ReadAsync())
                        {
                            var idObj = rdr["Id"];
                            var idString = idObj is Guid g ? g.ToString() : idObj?.ToString() ?? string.Empty;

                            int? age = rdr["Age"] is DBNull ? (int?)null : Convert.ToInt32(rdr["Age"]);
                            bool? isBaptized = rdr["IsBaptized"] is DBNull ? (bool?)null : (bool)rdr["IsBaptized"];
                            bool? isBornAgain = rdr["IsBornAgain"] is DBNull ? (bool?)null : (bool)rdr["IsBornAgain"];
                            bool? isBeliever = rdr["IsBeliever"] is DBNull ? (bool?)null : (bool)rdr["IsBeliever"];
                            bool? isPastor = rdr["IsPastor"] is DBNull ? (bool?)null : (bool)rdr["IsPastor"];

                            items.Add(new
                            {
                                id = idString,
                                username = rdr["Username"] is DBNull ? null : rdr["Username"]?.ToString(),
                                UserCode = rdr["UserCode"] is DBNull ? null : rdr["UserCode"]?.ToString(),
                                email = rdr["Email"] is DBNull ? null : rdr["Email"]?.ToString(),
                                displayName = rdr["DisplayName"] is DBNull ? null : rdr["DisplayName"]?.ToString(),
                                role = rdr["Role"] is DBNull ? null : rdr["Role"]?.ToString(),
                                phone = rdr["Phone"] is DBNull ? null : rdr["Phone"]?.ToString(),
                                joinDate = rdr["JoinDate"] is DBNull ? null : rdr["JoinDate"]?.ToString(),
                                lastLogin = rdr["LastLogin"] is DBNull ? null : rdr["LastLogin"]?.ToString(),

                                birthday = rdr["Birthday"] is DBNull ? null : rdr["Birthday"]?.ToString(),
                                maritalStatus = rdr["MaritalStatus"] is DBNull ? null : rdr["MaritalStatus"]?.ToString(),
                                sex = rdr["Sex"] is DBNull ? null : rdr["Sex"]?.ToString(),
                                isBaptized,
                                baptismPlace = rdr["BaptismPlace"] is DBNull ? null : rdr["BaptismPlace"]?.ToString(),
                                baptismDate = rdr["BaptismDate"] is DBNull ? null : rdr["BaptismDate"]?.ToString(),
                                isBornAgain,
                                isBeliever,
                                age,
                                aadharNumber = rdr["AadharNumber"] is DBNull ? null : rdr["AadharNumber"]?.ToString(),
                                homeAddress = rdr["HomeAddress"] is DBNull ? null : rdr["HomeAddress"]?.ToString(),
                                currentAddress = rdr["CurrentAddress"] is DBNull ? null : rdr["CurrentAddress"]?.ToString(),
                                emergencyContactPhone = rdr["EmergencyContactPhone"] is DBNull ? null : rdr["EmergencyContactPhone"]?.ToString(),
                                isPastor
                            });
                        }
                    }

                    return Ok(new { items, total, page, limit });
                }

                // ---------- SEARCH PRESENT ----------
                var useFullText = search.Trim().Length >= 3;

                // ===== Full-text search (>= 3 chars) =====
                if (useFullText)
                {
                    var sql = @"
WITH q AS (
  SELECT websearch_to_tsquery('english', @q) AS query
)
SELECT COUNT(*) OVER() AS total,
       u.id          AS ""Id"",
       u.username    AS ""Username"",
       u.""UserCode"",
       u.email       AS ""Email"",
       u.displayname AS ""DisplayName"",
       u.role        AS ""Role"",
       u.phone       AS ""Phone"",
       u.joindate    AS ""JoinDate"",
       u.lastlogin   AS ""LastLogin"",
       u.""Birthday"",
       u.""MaritalStatus"",
       u.""Sex"",
       u.""IsBaptized"",
       u.""BaptismPlace"",
       u.""BaptismDate"",
       u.""IsBornAgain"",
       u.""IsBeliever"",
       u.""Age"",
       u.""AadharNumber"",
       u.""HomeAddress"",
       u.""CurrentAddress"",
       u.""EmergencyContactPhone"",
       u.""IsPastor"",
       ts_rank(
setweight(to_tsvector('english', coalesce(u.displayname,'')), 'A') ||
setweight(to_tsvector('english', coalesce(u.username,'')), 'A') ||
setweight(to_tsvector('english', coalesce(u.email,'')), 'B') ||
setweight(to_tsvector('english', coalesce(u.phone,'')), 'A'),
         q.query
       ) AS rank
FROM users u, q
WHERE (
         setweight(to_tsvector('english', coalesce(u.displayname,'')), 'A') ||
         setweight(to_tsvector('english', coalesce(u.username,'')), 'B') ||
         setweight(to_tsvector('english', coalesce(u.email,'')), 'C')
      ) @@ q.query
ORDER BY rank DESC, COALESCE(u.displayname, u.username) ASC
LIMIT @limit OFFSET @offset;
";
                    await using var cmd = new NpgsqlCommand(sql, conn);
                    cmd.Parameters.AddWithValue("q", NpgsqlTypes.NpgsqlDbType.Text, search);
                    cmd.Parameters.AddWithValue("limit", NpgsqlTypes.NpgsqlDbType.Integer, limit);
                    cmd.Parameters.AddWithValue("offset", NpgsqlTypes.NpgsqlDbType.Integer, offset);

                    var items = new List<object>();
                    int total = 0;
                    await using (var rdr = await cmd.ExecuteReaderAsync())
                    {
                        while (await rdr.ReadAsync())
                        {
                            if (total == 0)
                            {
                                var totVal = rdr["total"];
                                total = totVal is DBNull ? 0 : Convert.ToInt32(totVal);
                            }

                            var idObj = rdr["Id"];
                            var idString = idObj is Guid g ? g.ToString() : idObj?.ToString() ?? string.Empty;

                            int? age = rdr["Age"] is DBNull ? (int?)null : Convert.ToInt32(rdr["Age"]);
                            bool? isBaptized = rdr["IsBaptized"] is DBNull ? (bool?)null : (bool)rdr["IsBaptized"];
                            bool? isBornAgain = rdr["IsBornAgain"] is DBNull ? (bool?)null : (bool)rdr["IsBornAgain"];
                            bool? isBeliever = rdr["IsBeliever"] is DBNull ? (bool?)null : (bool)rdr["IsBeliever"];
                            bool? isPastor = rdr["IsPastor"] is DBNull ? (bool?)null : (bool)rdr["IsPastor"];

                            items.Add(new
                            {
                                id = idString,
                                username = rdr["Username"] is DBNull ? null : rdr["Username"]?.ToString(),
                                UserCode = rdr["UserCode"] is DBNull ? null : rdr["UserCode"]?.ToString(),
                                email = rdr["Email"] is DBNull ? null : rdr["Email"]?.ToString(),
                                displayName = rdr["DisplayName"] is DBNull ? null : rdr["DisplayName"]?.ToString(),
                                role = rdr["Role"] is DBNull ? null : rdr["Role"]?.ToString(),
                                phone = rdr["Phone"] is DBNull ? null : rdr["Phone"]?.ToString(),
                                joinDate = rdr["JoinDate"] is DBNull ? null : rdr["JoinDate"]?.ToString(),
                                lastLogin = rdr["LastLogin"] is DBNull ? null : rdr["LastLogin"]?.ToString(),

                                birthday = rdr["Birthday"] is DBNull ? null : rdr["Birthday"]?.ToString(),
                                maritalStatus = rdr["MaritalStatus"] is DBNull ? null : rdr["MaritalStatus"]?.ToString(),
                                sex = rdr["Sex"] is DBNull ? null : rdr["Sex"]?.ToString(),
                                isBaptized,
                                baptismPlace = rdr["BaptismPlace"] is DBNull ? null : rdr["BaptismPlace"]?.ToString(),
                                baptismDate = rdr["BaptismDate"] is DBNull ? null : rdr["BaptismDate"]?.ToString(),
                                isBornAgain,
                                isBeliever,
                                age,
                                aadharNumber = rdr["AadharNumber"] is DBNull ? null : rdr["AadharNumber"]?.ToString(),
                                homeAddress = rdr["HomeAddress"] is DBNull ? null : rdr["HomeAddress"]?.ToString(),
                                currentAddress = rdr["CurrentAddress"] is DBNull ? null : rdr["CurrentAddress"]?.ToString(),
                                emergencyContactPhone = rdr["EmergencyContactPhone"] is DBNull ? null : rdr["EmergencyContactPhone"]?.ToString(),
                                isPastor
                            });
                        }
                    }

                    return Ok(new { items, total, page, limit });
                }
                // ===== Short search (ILIKE) =====
                else
                {
                    var p = "%" + search.Replace("%", "\\%").Replace("_", "\\_") + "%";

                    var sql = @"
SELECT COUNT(*) OVER() AS total,
       u.id          AS ""Id"",
       u.username    AS ""Username"",
       u.""UserCode"",
       u.email       AS ""Email"",
       u.displayname AS ""DisplayName"",
       u.role        AS ""Role"",
       u.phone       AS ""Phone"",
       u.joindate    AS ""JoinDate"",
       u.lastlogin   AS ""LastLogin"",
       u.""Birthday"",
       u.""MaritalStatus"",
       u.""Sex"",
       u.""IsBaptized"",
       u.""BaptismPlace"",
       u.""BaptismDate"",
       u.""IsBornAgain"",
       u.""IsBeliever"",
       u.""Age"",
       u.""AadharNumber"",
       u.""HomeAddress"",
       u.""CurrentAddress"",
       u.""EmergencyContactPhone"",
       u.""IsPastor""
FROM users u
WHERE 
    u.username ILIKE @p 
    OR u.email ILIKE @p 
    OR u.displayname ILIKE @p
    OR u.phone ILIKE @p
ORDER BY COALESCE(u.displayname, u.username) ASC
ORDER BY u.id
LIMIT @limit OFFSET @offset;
";
                    await using var cmd = new NpgsqlCommand(sql, conn);
                    cmd.Parameters.AddWithValue("p", NpgsqlTypes.NpgsqlDbType.Text, p);
                    cmd.Parameters.AddWithValue("limit", NpgsqlTypes.NpgsqlDbType.Integer, limit);
                    cmd.Parameters.AddWithValue("offset", NpgsqlTypes.NpgsqlDbType.Integer, offset);

                    var items = new List<object>();
                    int total = 0;
                    await using (var rdr = await cmd.ExecuteReaderAsync())
                    {
                        while (await rdr.ReadAsync())
                        {
                            if (total == 0)
                            {
                                var totVal = rdr["total"];
                                total = totVal is DBNull ? 0 : Convert.ToInt32(totVal);
                            }

                            var idObj = rdr["Id"];
                            var idString = idObj is Guid g ? g.ToString() : idObj?.ToString() ?? string.Empty;

                            int? age = rdr["Age"] is DBNull ? (int?)null : Convert.ToInt32(rdr["Age"]);
                            bool? isBaptized = rdr["IsBaptized"] is DBNull ? (bool?)null : (bool)rdr["IsBaptized"];
                            bool? isBornAgain = rdr["IsBornAgain"] is DBNull ? (bool?)null : (bool)rdr["IsBornAgain"];
                            bool? isBeliever = rdr["IsBeliever"] is DBNull ? (bool?)null : (bool)rdr["IsBeliever"];
                            bool? isPastor = rdr["IsPastor"] is DBNull ? (bool?)null : (bool)rdr["IsPastor"];

                            items.Add(new
                            {
                                id = idString,
                                username = rdr["Username"] is DBNull ? null : rdr["Username"]?.ToString(),
                                UserCode = rdr["UserCode"] is DBNull ? null : rdr["UserCode"]?.ToString(),
                                email = rdr["Email"] is DBNull ? null : rdr["Email"]?.ToString(),
                                displayName = rdr["DisplayName"] is DBNull ? null : rdr["DisplayName"]?.ToString(),
                                role = rdr["Role"] is DBNull ? null : rdr["Role"]?.ToString(),
                                phone = rdr["Phone"] is DBNull ? null : rdr["Phone"]?.ToString(),
                                joinDate = rdr["JoinDate"] is DBNull ? null : rdr["JoinDate"]?.ToString(),
                                lastLogin = rdr["LastLogin"] is DBNull ? null : rdr["LastLogin"]?.ToString(),

                                birthday = rdr["Birthday"] is DBNull ? null : rdr["Birthday"]?.ToString(),
                                maritalStatus = rdr["MaritalStatus"] is DBNull ? null : rdr["MaritalStatus"]?.ToString(),
                                sex = rdr["Sex"] is DBNull ? null : rdr["Sex"]?.ToString(),
                                isBaptized,
                                baptismPlace = rdr["BaptismPlace"] is DBNull ? null : rdr["BaptismPlace"]?.ToString(),
                                baptismDate = rdr["BaptismDate"] is DBNull ? null : rdr["BaptismDate"]?.ToString(),
                                isBornAgain,
                                isBeliever,
                                age,
                                aadharNumber = rdr["AadharNumber"] is DBNull ? null : rdr["AadharNumber"]?.ToString(),
                                homeAddress = rdr["HomeAddress"] is DBNull ? null : rdr["HomeAddress"]?.ToString(),
                                currentAddress = rdr["CurrentAddress"] is DBNull ? null : rdr["CurrentAddress"]?.ToString(),
                                emergencyContactPhone = rdr["EmergencyContactPhone"] is DBNull ? null : rdr["EmergencyContactPhone"]?.ToString(),
                                isPastor
                            });
                        }
                    }

                    return Ok(new { items, total, page, limit });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving users with search.");
                if (_env.IsDevelopment())
                    return StatusCode(500, $"Error retrieving users: {ex.GetType().Name} - {ex.Message}");
                return StatusCode(500, "Error retrieving users.");
            }
        }

        // PUT api/users/{id}/enrich
        [HttpPut("{id:guid}/enrich")]
        [HttpPut("{id}/enrich")]
        //public async Task<IActionResult> EnrichUser(Guid id, [FromBody] EnrichUserDto dto)
        public async Task<IActionResult> EnrichUser(string id, [FromBody] EnrichUserDto dto)
        {
            if (string.IsNullOrWhiteSpace(_connectionString))
            {
                _logger.LogError("Missing connection string 'DefaultConnection'.");
                return StatusCode(500, "Missing connection string 'DefaultConnection'.");
            }

            if (dto == null)
                return BadRequest("Payload is required.");

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var cmd = new NpgsqlCommand
                {
                    Connection = conn,
                    CommandType = CommandType.Text,
                    CommandText = @"
UPDATE users SET
    ""Birthday""             = @Birthday,
    ""MaritalStatus""        = @MaritalStatus,
    ""Sex""                  = @Sex,
    ""IsBaptized""           = @IsBaptized,
    ""BaptismPlace""         = @BaptismPlace,
    ""BaptismDate""          = @BaptismDate,
    ""IsBornAgain""          = @IsBornAgain,
    ""IsBeliever""           = @IsBeliever,
    ""Age""                  = @Age,
    ""AadharNumber""         = @AadharNumber,
    ""HomeAddress""          = @HomeAddress,
    ""CurrentAddress""       = @CurrentAddress,
    ""EmergencyContactPhone""= @EmergencyContactPhone,
    ""IsPastor""             = @IsPastor
WHERE id = @Id;"
                };

                //cmd.Parameters.AddWithValue("Id", NpgsqlTypes.NpgsqlDbType.Uuid, id);
                var isGuid = Guid.TryParse(id, out var guidId);

        if (isGuid)
        cmd.Parameters.AddWithValue("Id", NpgsqlTypes.NpgsqlDbType.Uuid, guidId);
        else
        cmd.Parameters.AddWithValue("Id", NpgsqlTypes.NpgsqlDbType.Text, id);
                object DbNullIfNull(object? v) => v ?? DBNull.Value;

                cmd.Parameters.AddWithValue("Birthday",
                    dto.Birthday.HasValue
                        ? NpgsqlTypes.NpgsqlDbType.Date
                        : NpgsqlTypes.NpgsqlDbType.Date,
                    (object?)dto.Birthday ?? DBNull.Value);

                cmd.Parameters.AddWithValue("BaptismDate",
                    dto.BaptismDate.HasValue
                        ? NpgsqlTypes.NpgsqlDbType.Date
                        : NpgsqlTypes.NpgsqlDbType.Date,
                    (object?)dto.BaptismDate ?? DBNull.Value);

                cmd.Parameters.AddWithValue("MaritalStatus", NpgsqlTypes.NpgsqlDbType.Text, DbNullIfNull(dto.MaritalStatus));
                cmd.Parameters.AddWithValue("Sex", NpgsqlTypes.NpgsqlDbType.Text, DbNullIfNull(dto.Sex));
                cmd.Parameters.AddWithValue("BaptismPlace", NpgsqlTypes.NpgsqlDbType.Text, DbNullIfNull(dto.BaptismPlace));
                cmd.Parameters.AddWithValue("AadharNumber", NpgsqlTypes.NpgsqlDbType.Text, DbNullIfNull(dto.AadharNumber));
                cmd.Parameters.AddWithValue("HomeAddress", NpgsqlTypes.NpgsqlDbType.Text, DbNullIfNull(dto.HomeAddress));
                cmd.Parameters.AddWithValue("CurrentAddress", NpgsqlTypes.NpgsqlDbType.Text, DbNullIfNull(dto.CurrentAddress));
                cmd.Parameters.AddWithValue("EmergencyContactPhone", NpgsqlTypes.NpgsqlDbType.Text, DbNullIfNull(dto.EmergencyContactPhone));

                if (dto.Age.HasValue)
                    cmd.Parameters.AddWithValue("Age", NpgsqlTypes.NpgsqlDbType.Integer, dto.Age.Value);
                else
                    cmd.Parameters.AddWithValue("Age", NpgsqlTypes.NpgsqlDbType.Integer, DBNull.Value);

                if (dto.IsBaptized.HasValue)
                    cmd.Parameters.AddWithValue("IsBaptized", NpgsqlTypes.NpgsqlDbType.Boolean, dto.IsBaptized.Value);
                else
                    cmd.Parameters.AddWithValue("IsBaptized", NpgsqlTypes.NpgsqlDbType.Boolean, DBNull.Value);

                if (dto.IsBornAgain.HasValue)
                    cmd.Parameters.AddWithValue("IsBornAgain", NpgsqlTypes.NpgsqlDbType.Boolean, dto.IsBornAgain.Value);
                else
                    cmd.Parameters.AddWithValue("IsBornAgain", NpgsqlTypes.NpgsqlDbType.Boolean, DBNull.Value);

                if (dto.IsBeliever.HasValue)
                    cmd.Parameters.AddWithValue("IsBeliever", NpgsqlTypes.NpgsqlDbType.Boolean, dto.IsBeliever.Value);
                else
                    cmd.Parameters.AddWithValue("IsBeliever", NpgsqlTypes.NpgsqlDbType.Boolean, DBNull.Value);

                if (dto.IsPastor.HasValue)
                    cmd.Parameters.AddWithValue("IsPastor", NpgsqlTypes.NpgsqlDbType.Boolean, dto.IsPastor.Value);
                else
                    cmd.Parameters.AddWithValue("IsPastor", NpgsqlTypes.NpgsqlDbType.Boolean, DBNull.Value);

                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0) return NotFound();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error enriching user {Id}", id);
                if (_env.IsDevelopment())
                    return StatusCode(500, $"Error enriching user: {ex.GetType().Name} - {ex.Message}");
                return StatusCode(500, "Error enriching user.");
            }
        }

        // GET api/users/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            if (string.IsNullOrWhiteSpace(_connectionString))
            {
                _logger.LogError("Missing connection string 'DefaultConnection'.");
                return StatusCode(500, "Missing connection string 'DefaultConnection'.");
            }

            object? user = null;

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var isGuid = Guid.TryParse(id, out var guidId);
                var isInt = int.TryParse(id, out var intId);
                var isLong = long.TryParse(id, out var longId);

                NpgsqlCommand cmd;
                if (isGuid)
                {
                    cmd = new NpgsqlCommand(@"SELECT
                                                  id          AS ""Id"",
                                                  username    AS ""Username"",
                                                  email       AS ""Email"",
                                                  displayname AS ""DisplayName"",
                                                  phone       AS ""Phone"",
                                                  role        AS ""Role"",
                                                  joindate    AS ""JoinDate""
                                              FROM users
                                              WHERE id = @id", conn);
                    cmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Uuid, guidId);
                }
                else if (isInt)
                {
                    cmd = new NpgsqlCommand(@"SELECT
                                                  id          AS ""Id"",
                                                  username    AS ""Username"",
                                                  email       AS ""Email"",
                                                  displayname AS ""DisplayName"",
                                                  phone       AS ""Phone"",
                                                  role        AS ""Role"",
                                                  joindate    AS ""JoinDate""
                                              FROM users
                                              WHERE id = @id", conn);
                    cmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Integer, intId);
                }
                else if (isLong)
                {
                    cmd = new NpgsqlCommand(@"SELECT
                                                  id          AS ""Id"",
                                                  username    AS ""Username"",
                                                  email       AS ""Email"",
                                                  displayname AS ""DisplayName"",
                                                  phone       AS ""Phone"",
                                                  role        AS ""Role"",
                                                  joindate    AS ""JoinDate""
                                              FROM users
                                              WHERE id = @id", conn);
                    cmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Bigint, longId);
                }
                else
                {
                    cmd = new NpgsqlCommand(@"SELECT
                                                  id          AS ""Id"",
                                                  username    AS ""Username"",
                                                  email       AS ""Email"",
                                                  displayname AS ""DisplayName"",
                                                  phone       AS ""Phone"",
                                                  role        AS ""Role"",
                                                  joindate    AS ""JoinDate""
                                              FROM users
                                              WHERE cast(id as text) = @id", conn);
                    cmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Text, id);
                }

                await using var rdr = await cmd.ExecuteReaderAsync();
                if (await rdr.ReadAsync())
                {
                    var idObj = rdr["Id"];
                    string idString = idObj is Guid g ? g.ToString() : idObj?.ToString() ?? string.Empty;
                    var username = rdr["Username"] is DBNull ? null : rdr["Username"]?.ToString();
                    var email = rdr["Email"] is DBNull ? null : rdr["Email"]?.ToString();
                    var displayName = rdr["DisplayName"] is DBNull ? null : rdr["DisplayName"]?.ToString();
                    var phone = rdr["Phone"] is DBNull ? null : rdr["Phone"]?.ToString();
                    var role = rdr["Role"] is DBNull ? null : rdr["Role"]?.ToString();
                    var joinDate = rdr["JoinDate"] is DBNull ? null : rdr["JoinDate"]?.ToString();

                    user = new
                    {
                        id = idString,
                        username,
                        email,
                        displayName,
                        phone,
                        role,
                        joinDate
                    };
                }

                if (user == null) return NotFound();
                return Ok(user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving user by id {Id}.", id);
                if (_env.IsDevelopment())
                    return StatusCode(500, $"Error retrieving user: {ex.GetType().Name} - {ex.Message}");
                return StatusCode(500, "Error retrieving user.");
            }
        }

        // POST api/users
        [HttpPost]
public async Task<IActionResult> Create([FromBody] JsonElement body)
{
    if (string.IsNullOrWhiteSpace(_connectionString))
        return StatusCode(500, "Missing connection string");

    try
    {
        string? Get(JsonElement root, params string[] names)
        {
            foreach (var p in root.EnumerateObject())
            {
                foreach (var n in names)
                {
                    if (string.Equals(p.Name, n, StringComparison.OrdinalIgnoreCase))
                        return p.Value.GetString();
                }
            }
            return null;
        }

        var username = Get(body, "username");
        var email = Get(body, "email");
        var password = Get(body, "password");
	var phone = Get(body, "phone");
	var displayName = Get(body, "displayname", "displayName", "DisplayName", "name");
        if (string.IsNullOrWhiteSpace(username))
            return BadRequest("username required");

        if (string.IsNullOrWhiteSpace(password))
            return BadRequest("password required");

        // 🔥 HASH PASSWORD
        //var hasher = new Microsoft.AspNetCore.Identity.PasswordHasher<object>();
        //var hash = hasher.HashPassword(null, password);
		
		var hasher = new Microsoft.AspNetCore.Identity.PasswordHasher<string>();
		var hash = hasher.HashPassword(username, password);

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync();

const string sql = @"
    INSERT INTO users (username, email, passwordhash, role, joindate, phone, displayname)
    VALUES (@username, @email, @passwordhash, 'Member', NOW(), @phone, @displayname)
    RETURNING id;
";        await using var cmd = new NpgsqlCommand(sql, conn);

        cmd.Parameters.AddWithValue("username", username);
        cmd.Parameters.AddWithValue("email", (object?)email ?? DBNull.Value);
        cmd.Parameters.AddWithValue("passwordhash", hash);
	cmd.Parameters.AddWithValue("phone", (object?)phone ?? DBNull.Value);
	cmd.Parameters.AddWithValue(
    "displayname",
    !string.IsNullOrWhiteSpace(displayName)
        ? displayName
        : !string.IsNullOrWhiteSpace(username)
            ? username
            : DBNull.Value
);

        var id = await cmd.ExecuteScalarAsync();

    return Ok(new
{
    id,
    username,
    email,
    phone,
    displayName,
    role = "Member"
});   }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Create user failed");
        return StatusCode(500, ex.Message);
    }
}
        // DELETE api/users/{id}
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(string id)
        {
            if (string.IsNullOrWhiteSpace(_connectionString))
            {
                _logger.LogError("Missing connection string 'DefaultConnection'.");
                return StatusCode(500, "Missing connection string 'DefaultConnection'.");
            }

            try
            {
                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var isGuid = Guid.TryParse(id, out var guidId);
                var isInt = int.TryParse(id, out var intId);
                var isLong = long.TryParse(id, out var longId);

                var fkSql = @"
                SELECT kcu.table_schema, kcu.table_name, kcu.column_name, tc.constraint_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage ccu
                  ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'users';
                ";
                var referencing = new List<(string Schema, string Table, string Column, string Constraint)>();
                await using (var fkCmd = new NpgsqlCommand(fkSql, conn))
                await using (var fkRdr = await fkCmd.ExecuteReaderAsync())
                {
                    while (await fkRdr.ReadAsync())
                    {
                        referencing.Add((
                            fkRdr.GetString(0),
                            fkRdr.GetString(1),
                            fkRdr.GetString(2),
                            fkRdr.GetString(3)
                        ));
                    }
                }

                var blockers = new List<object>();
                foreach (var r in referencing)
                {
                    var countSql = $@"SELECT COUNT(*) FROM ""{r.Schema}"".""{r.Table}"" WHERE ""{r.Column}"" = @id";
                    await using var countCmd = new NpgsqlCommand(countSql, conn);

                    if (isGuid) countCmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Uuid, guidId);
                    else if (isInt) countCmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Integer, intId);
                    else if (isLong) countCmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Bigint, longId);
                    else countCmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Text, id);

                    var cntObj = await countCmd.ExecuteScalarAsync();
                    var cnt = cntObj is DBNull ? 0 : Convert.ToInt32(cntObj);
                    if (cnt > 0)
                    {
                        blockers.Add(new { table = r.Table, schema = r.Schema, column = r.Column, constraint = r.Constraint, count = cnt });
                    }
                }

                if (blockers.Count > 0)
                {
                    return Conflict(new
                    {
                        message = "Cannot delete user because other rows reference it.",
                        references = blockers,
                        help = "Reassign or delete the referencing rows first, or change the FK to ON DELETE SET NULL/CASCADE if appropriate."
                    });
                }

                await using var delCmd = new NpgsqlCommand { Connection = conn, CommandType = CommandType.Text };
                if (isGuid)
                {
                    delCmd.CommandText = @"DELETE FROM users WHERE id = @id";
                    delCmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Uuid, guidId);
                }
                else if (isInt)
                {
                    delCmd.CommandText = @"DELETE FROM users WHERE id = @id";
                    delCmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Integer, intId);
                }
                else if (isLong)
                {
                    delCmd.CommandText = @"DELETE FROM users WHERE id = @id";
                    delCmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Bigint, longId);
                }
                else
                {
                    delCmd.CommandText = @"DELETE FROM users WHERE cast(id as text) = @id";
                    delCmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Text, id);
                }

                var rows = await delCmd.ExecuteNonQueryAsync();
                if (rows == 0) return NotFound();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting user {Id}", id);
                if (_env.IsDevelopment())
                    return StatusCode(500, $"Error deleting user: {ex.GetType().Name} - {ex.Message}");
                return StatusCode(500, "Error deleting user.");
            }
        }

        // Reset password (admin-style). Supports GUID and non-GUID ids.
        [HttpPost("{id:guid}/reset-password")]
        [HttpPost("{id}/reset-password")]
        public async Task<IActionResult> ResetPassword(string id, [FromBody] ResetPasswordDto dto)
        {
            if (string.IsNullOrWhiteSpace(_connectionString))
            {
                _logger.LogError("Missing connection string 'DefaultConnection'.");
                return StatusCode(500, "Missing connection string 'DefaultConnection'.");
            }

            if (dto == null || string.IsNullOrWhiteSpace(dto.NewPassword))
                return BadRequest("newPassword is required.");

            if (dto.NewPassword!.Length < 6)
                return BadRequest("Password must be at least 6 characters long.");

            try
            {
                //var pwHasher = new Microsoft.AspNetCore.Identity.PasswordHasher<object>();
                //var newHash = pwHasher.HashPassword(null, dto.NewPassword);
				
				var pwHasher = new Microsoft.AspNetCore.Identity.PasswordHasher<string>();
				var newHash = pwHasher.HashPassword("reset", dto.NewPassword);

                await using var conn = new NpgsqlConnection(_connectionString);
                await conn.OpenAsync();

                var isGuid = Guid.TryParse(id, out var guidId);
                var isInt = int.TryParse(id, out var intId);
                var isLong = long.TryParse(id, out var longId);

                await using var cmd = new NpgsqlCommand { Connection = conn, CommandType = CommandType.Text };

                if (isGuid)
                {
                    cmd.CommandText = @"UPDATE users SET passwordhash = @ph WHERE id = @id";
                    cmd.Parameters.AddWithValue("ph", NpgsqlTypes.NpgsqlDbType.Text, newHash);
                    cmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Uuid, guidId);
                }
                else if (isInt)
                {
                    cmd.CommandText = @"UPDATE users SET passwordhash = @ph WHERE id = @id";
                    cmd.Parameters.AddWithValue("ph", NpgsqlTypes.NpgsqlDbType.Text, newHash);
                    cmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Integer, intId);
                }
                else if (isLong)
                {
                    cmd.CommandText = @"UPDATE users SET passwordhash = @ph WHERE id = @id";
                    cmd.Parameters.AddWithValue("ph", NpgsqlTypes.NpgsqlDbType.Text, newHash);
                    cmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Bigint, longId);
                }
                else
                {
                    cmd.CommandText = @"UPDATE users SET passwordhash = @ph WHERE cast(id as text) = @id";
                    cmd.Parameters.AddWithValue("ph", NpgsqlTypes.NpgsqlDbType.Text, newHash);
                    cmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Text, id);
                }

                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0) return NotFound();

                return Ok(new { message = "Password reset successfully (admin reset)." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting password for user {Id}", id);
                if (_env.IsDevelopment())
                    return StatusCode(500, $"Error resetting password: {ex.GetType().Name} - {ex.Message}");
                return StatusCode(500, "Error resetting password.");
            }
        }

        // Update: accept PUT or PATCH to support different frontend clients
        [HttpPut("{id:guid}")]
        [HttpPatch("{id:guid}")]
        public async Task<IActionResult> Update(string id)
        {
            if (string.IsNullOrWhiteSpace(_connectionString))
            {
                _logger.LogError("Missing connection string 'DefaultConnection'.");
                return StatusCode(500, "Missing connection string 'DefaultConnection'.");
            }

            string body;
            using (var sr = new System.IO.StreamReader(Request.Body))
            {
                body = await sr.ReadToEndAsync();
            }

            if (string.IsNullOrWhiteSpace(body))
                return BadRequest("Missing payload.");

            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;

            bool HasProp(string[] names)
            {
                foreach (var p in root.EnumerateObject())
                {
                    foreach (var name in names)
                    {
                        if (string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase))
                            return true;
                    }
                }
                return false;
            }

            string? GetString(string[] names)
            {
                foreach (var p in root.EnumerateObject())
                {
                    foreach (var name in names)
                    {
                        if (string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase))
                        {
                            if (p.Value.ValueKind == JsonValueKind.Null) return null;
                            return p.Value.ToString();
                        }
                    }
                }
                return null;
            }

            var wantDisplayName = HasProp(new[] { "displayName", "DisplayName", "name", "Name" });
            var wantUsername = HasProp(new[] { "username", "Username" });
            var wantEmail = HasProp(new[] { "email", "Email" });
            var wantRole = HasProp(new[] { "role", "Role" });
            var wantPhone = HasProp(new[] { "phone", "Phone" });
            var wantJoinDate = HasProp(new[] { "joinDate", "JoinDate" });

            if (!wantDisplayName && !wantUsername && !wantEmail && !wantRole && !wantPhone && !wantJoinDate)
                return BadRequest("Nothing to update.");

            var displayName = GetString(new[] { "displayName", "DisplayName", "name", "Name" });
            var username = GetString(new[] { "username", "Username" });
            var email = GetString(new[] { "email", "Email" });
            var role = GetString(new[] { "role", "Role" });
            var phone = GetString(new[] { "phone", "Phone" });
            var joinDateRaw = GetString(new[] { "joinDate", "JoinDate" });
            DateTime? joinDate = null;
            if (!string.IsNullOrWhiteSpace(joinDateRaw) && DateTime.TryParse(joinDateRaw, out var jd)) joinDate = jd;

            var setParts = new List<string>();
            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();

            var cmd = new NpgsqlCommand { CommandType = CommandType.Text, Connection = conn };

            if (wantDisplayName)
            {
                setParts.Add(@"displayname = @displayName");
                cmd.Parameters.AddWithValue("displayName", NpgsqlTypes.NpgsqlDbType.Text, (object?)displayName ?? DBNull.Value);
            }
            if (wantUsername)
            {
                setParts.Add(@"username = @username");
                cmd.Parameters.AddWithValue("username", NpgsqlTypes.NpgsqlDbType.Text, (object?)username ?? DBNull.Value);
            }
            if (wantEmail)
            {
                setParts.Add(@"email = @email");
                cmd.Parameters.AddWithValue("email", NpgsqlTypes.NpgsqlDbType.Text, (object?)email ?? DBNull.Value);
            }
            if (wantRole)
            {
                setParts.Add(@"role = @role");
                cmd.Parameters.AddWithValue("role", NpgsqlTypes.NpgsqlDbType.Text, (object?)role ?? DBNull.Value);
            }
            if (wantPhone)
            {
                setParts.Add(@"phone = @phone");
                cmd.Parameters.AddWithValue("phone", NpgsqlTypes.NpgsqlDbType.Text, (object?)phone ?? DBNull.Value);
            }
            if (wantJoinDate)
            {
                setParts.Add(@"joindate = @joinDate");

                if (joinDate.HasValue)
                {
                    var dt = joinDate.Value;
                    if (dt.Kind == DateTimeKind.Unspecified)
                    {
                        dt = DateTime.SpecifyKind(dt, DateTimeKind.Local).ToUniversalTime();
                    }
                    else if (dt.Kind == DateTimeKind.Local)
                    {
                        dt = dt.ToUniversalTime();
                    }

                    var p = cmd.Parameters.Add("joinDate", NpgsqlTypes.NpgsqlDbType.TimestampTz);
                    p.Value = dt;
                }
                else
                {
                    cmd.Parameters.AddWithValue("joinDate", DBNull.Value);
                }
            }

            if (setParts.Count == 0)
                return BadRequest("Nothing to update.");

            var isGuid = Guid.TryParse(id, out var guidId);
            var isInt = int.TryParse(id, out var intId);
            var isLong = long.TryParse(id, out var longId);

            var setClause = string.Join(", ", setParts);

            if (isGuid)
            {
                cmd.CommandText = $@"UPDATE users SET {setClause} WHERE id = @id";
                cmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Uuid, guidId);
            }
            else if (isInt)
            {
                cmd.CommandText = $@"UPDATE users SET {setClause} WHERE id = @id";
                cmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Integer, intId);
            }
            else if (isLong)
            {
                cmd.CommandText = $@"UPDATE users SET {setClause} WHERE id = @id";
                cmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Bigint, longId);
            }
            else
            {
                cmd.CommandText = $@"UPDATE users SET {setClause} WHERE cast(id as text) = @id";
                cmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Text, id);
            }

            try
            {
                var rows = await cmd.ExecuteNonQueryAsync();
                if (rows == 0) return NotFound();

                await using var fetchCmd = new NpgsqlCommand(@"
                        SELECT
                            id          AS ""Id"",
                            username    AS ""Username"",
                            email       AS ""Email"",
                            displayname AS ""DisplayName"",
                            role        AS ""Role"",
                            phone       AS ""Phone"",
                            joindate    AS ""JoinDate""
                        FROM users
                        WHERE " + (isGuid ? "id = @id" : isInt ? "id = @id" : isLong ? "id = @id" : "cast(id as text) = @id"), conn);

                if (isGuid) fetchCmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Uuid, guidId);
                else if (isInt) fetchCmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Integer, intId);
                else if (isLong) fetchCmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Bigint, longId);
                else fetchCmd.Parameters.AddWithValue("id", NpgsqlTypes.NpgsqlDbType.Text, id);

                await using var rdr = await fetchCmd.ExecuteReaderAsync();
                if (await rdr.ReadAsync())
                {
                    var idObj = rdr["Id"];
                    var idString = idObj is Guid g ? g.ToString() : idObj?.ToString() ?? string.Empty;
                    var usernameOut = rdr["Username"] is DBNull ? null : rdr["Username"]?.ToString();
                    var emailOut = rdr["Email"] is DBNull ? null : rdr["Email"]?.ToString();
                    var displayOut = rdr["DisplayName"] is DBNull ? null : rdr["DisplayName"]?.ToString();
                    var roleOut = rdr["Role"] is DBNull ? null : rdr["Role"]?.ToString();
                    var phoneOut = rdr["Phone"] is DBNull ? null : rdr["Phone"]?.ToString();
                    var jOut = rdr["JoinDate"] is DBNull ? null : rdr["JoinDate"]?.ToString();

                    return Ok(new
                    {
                        id = idString,
                        username = usernameOut,
                        email = emailOut,
                        displayName = displayOut,
                        role = roleOut,
                        phone = phoneOut,
                        joinDate = jOut
                    });
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user {Id}", id);
                if (_env.IsDevelopment())
                    return StatusCode(500, $"Error updating user: {ex.GetType().Name} - {ex.Message}");
                return StatusCode(500, "Error updating user.");
            }
        }
    }
}
