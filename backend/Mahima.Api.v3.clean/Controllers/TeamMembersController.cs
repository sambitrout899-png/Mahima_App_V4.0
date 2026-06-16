using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Mahima.Api.v3.clean.Controllers
{
    public class TeamMembersBulkDto
    {
        public Guid? LeaderId { get; set; }
        public List<Guid> Members { get; set; } = new();
    }

    [ApiController]
    [Route("api/teams/{teamId}/members")]
    public class TeamMembersController : ControllerBase
    {
        private readonly string _connectionString;
        private readonly ILogger<TeamMembersController> _logger;

        public TeamMembersController(IConfiguration configuration, ILogger<TeamMembersController> logger)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
            _logger = logger;
        }

        public class MemberCreateDto
        {
            public Guid? UserId { get; set; }
            public string? RoleInTeam { get; set; }
            public bool? IsLeader { get; set; }
        }

        public class MemberDto
        {
            public long TeamId { get; set; }
            public Guid UserId { get; set; }
            public string? RoleInTeam { get; set; }
            public DateTime? JoinedAt { get; set; }
            public bool IsLeader { get; set; }
        }

        // ================= REPLACE ALL =================
        [HttpPut]
        public async Task<IActionResult> ReplaceAll(string teamId, [FromBody] TeamMembersBulkDto dto)
        {
            if (!long.TryParse(teamId, out var teamLong))
                return BadRequest("Invalid teamId");

            dto ??= new TeamMembersBulkDto();

            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var tx = await conn.BeginTransactionAsync();

            // DELETE
            await using (var delCmd = conn.CreateCommand())
            {
                delCmd.Transaction = tx;
                delCmd.CommandText = @"DELETE FROM teammembers WHERE teamid = @teamId;";
                delCmd.Parameters.AddWithValue("teamId", teamLong);
                await delCmd.ExecuteNonQueryAsync();
            }

            // INSERT
            if (dto.Members?.Count > 0)
            {
                await using var insCmd = conn.CreateCommand();
                insCmd.Transaction = tx;
                insCmd.CommandText = @"
INSERT INTO teammembers (teamid, userid, ""RoleInTeam"", ""JoinedAt"", ""IsLeader"")
VALUES (@teamId, @userId, @role, now(), @isLeader);";

                var pUser = new NpgsqlParameter("userId", NpgsqlTypes.NpgsqlDbType.Uuid);
                var pRole = new NpgsqlParameter("role", NpgsqlTypes.NpgsqlDbType.Text) { Value = DBNull.Value };
                var pLeader = new NpgsqlParameter("isLeader", NpgsqlTypes.NpgsqlDbType.Boolean);

                insCmd.Parameters.AddWithValue("teamId", teamLong);
                insCmd.Parameters.Add(pUser);
                insCmd.Parameters.Add(pRole);
                insCmd.Parameters.Add(pLeader);

                foreach (var u in dto.Members)
                {
                    pUser.Value = u;
                    pLeader.Value = dto.LeaderId == u;
                    await insCmd.ExecuteNonQueryAsync();
                }
            }

            // UPDATE TEAM LEADER (FIXED)
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = @"UPDATE ""Teams""
SET ""LeadUserId"" = @leaderId
WHERE ""Id"" = @teamId;";
                cmd.Parameters.AddWithValue("teamId", teamLong);
                cmd.Parameters.AddWithValue("leaderId", dto.LeaderId ?? (object)DBNull.Value);
                await cmd.ExecuteNonQueryAsync();
            }

            await tx.CommitAsync();
            return Ok();
        }

        // ================= GET =================
        [HttpGet]
        public async Task<IActionResult> GetAll(string teamId)
        {
            if (!long.TryParse(teamId, out var teamLong))
                return BadRequest();

            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();

            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
SELECT teamid, userid, ""RoleInTeam"", ""JoinedAt"", ""IsLeader""
FROM teammembers
WHERE teamid = @teamId
ORDER BY ""JoinedAt"" DESC;";
            cmd.Parameters.AddWithValue("teamId", teamLong);

            var list = new List<MemberDto>();
            await using var rdr = await cmd.ExecuteReaderAsync();

            while (await rdr.ReadAsync())
            {
                list.Add(new MemberDto
                {
                    TeamId = Convert.ToInt64(rdr["teamid"]),
                    UserId = (Guid)rdr["userid"],
                    RoleInTeam = rdr["RoleInTeam"]?.ToString(),
                    JoinedAt = rdr["JoinedAt"] as DateTime?,
                    IsLeader = rdr["IsLeader"] is bool b && b
                });
            }

            return Ok(list);
        }

        // ================= CREATE =================
        [HttpPost]
        public async Task<IActionResult> Create(string teamId, [FromBody] MemberCreateDto dto)
        {
            if (!long.TryParse(teamId, out var teamLong) || dto?.UserId == null)
                return BadRequest();

            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var tx = await conn.BeginTransactionAsync();

            if (dto.IsLeader == true)
            {
                await using var clear = conn.CreateCommand();
                clear.Transaction = tx;
                clear.CommandText = @"UPDATE teammembers SET ""IsLeader"" = FALSE WHERE teamid = @teamId;";
                clear.Parameters.AddWithValue("teamId", teamLong);
                await clear.ExecuteNonQueryAsync();
            }

            await using var upsert = conn.CreateCommand();
            upsert.Transaction = tx;
            upsert.CommandText = @"
INSERT INTO teammembers (teamid, userid, ""RoleInTeam"", ""JoinedAt"", ""IsLeader"")
VALUES (@teamId, @userId, @role, now(), @isLeader)
ON CONFLICT (teamid, userid)
DO UPDATE SET
    ""RoleInTeam"" = EXCLUDED.""RoleInTeam"",
    ""IsLeader"" = EXCLUDED.""IsLeader""
RETURNING teamid, userid, ""RoleInTeam"", ""JoinedAt"", ""IsLeader"";";
            upsert.Parameters.AddWithValue("teamId", teamLong);
            upsert.Parameters.AddWithValue("userId", dto.UserId.Value);
            upsert.Parameters.AddWithValue("role", (object?)dto.RoleInTeam ?? DBNull.Value);
            upsert.Parameters.AddWithValue("isLeader", dto.IsLeader == true);

            await using var rdr = await upsert.ExecuteReaderAsync();
            await rdr.ReadAsync();

await rdr.CloseAsync();
	
            if (dto.IsLeader == true)
            {
                await using var setLead = conn.CreateCommand();
                setLead.Transaction = tx;
                setLead.CommandText = @"UPDATE ""Teams""
SET ""LeadUserId"" = @userId
WHERE ""Id"" = @teamId;";
                setLead.Parameters.AddWithValue("teamId", teamLong);
                setLead.Parameters.AddWithValue("userId", dto.UserId.Value);
                await setLead.ExecuteNonQueryAsync();
            }

            await tx.CommitAsync();
            return Ok();
        }

        // ================= UPDATE ONE =================
        [HttpPut("{userId}")]
        public async Task<IActionResult> UpdateOne(string teamId, string userId, [FromBody] MemberCreateDto dto)
        {
            if (!long.TryParse(teamId, out var teamLong) || !Guid.TryParse(userId, out var userGuid))
                return BadRequest(new { error = "Invalid team or user id" });

            dto ??= new MemberCreateDto();
            var makeLeader = dto.IsLeader == true;

            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var tx = await conn.BeginTransactionAsync();

            try
            {
                if (makeLeader)
                {
                    await using var clear = conn.CreateCommand();
                    clear.Transaction = tx;
                    clear.CommandText = @"UPDATE teammembers SET ""IsLeader"" = FALSE WHERE teamid = @teamId;";
                    clear.Parameters.AddWithValue("teamId", teamLong);
                    await clear.ExecuteNonQueryAsync();
                }

                await using var upsert = conn.CreateCommand();
                upsert.Transaction = tx;
                upsert.CommandText = @"
INSERT INTO teammembers (teamid, userid, ""RoleInTeam"", ""JoinedAt"", ""IsLeader"")
VALUES (@teamId, @userId, @role, now(), @isLeader)
ON CONFLICT (teamid, userid)
DO UPDATE SET
    ""RoleInTeam"" = COALESCE(EXCLUDED.""RoleInTeam"", teammembers.""RoleInTeam""),
    ""IsLeader"" = EXCLUDED.""IsLeader""
RETURNING teamid, userid, ""RoleInTeam"", ""JoinedAt"", ""IsLeader"";";
                upsert.Parameters.AddWithValue("teamId", teamLong);
                upsert.Parameters.AddWithValue("userId", userGuid);
                upsert.Parameters.AddWithValue("role", (object?)dto.RoleInTeam ?? DBNull.Value);
                upsert.Parameters.AddWithValue("isLeader", makeLeader);

                MemberDto? updated = null;
                await using (var rdr = await upsert.ExecuteReaderAsync())
                {
                    if (await rdr.ReadAsync())
                    {
                        updated = new MemberDto
                        {
                            TeamId = Convert.ToInt64(rdr["teamid"]),
                            UserId = (Guid)rdr["userid"],
                            RoleInTeam = rdr["RoleInTeam"]?.ToString(),
                            JoinedAt = rdr["JoinedAt"] as DateTime?,
                            IsLeader = rdr["IsLeader"] is bool b && b
                        };
                    }
                }

                if (makeLeader)
                {
                    await using var setLead = conn.CreateCommand();
                    setLead.Transaction = tx;
                    setLead.CommandText = @"UPDATE ""Teams""
SET ""LeadUserId"" = @userId
WHERE ""Id"" = @teamId;";
                    setLead.Parameters.AddWithValue("teamId", teamLong);
                    setLead.Parameters.AddWithValue("userId", userGuid);
                    await setLead.ExecuteNonQueryAsync();
                }
                else
                {
                    await using var clearLead = conn.CreateCommand();
                    clearLead.Transaction = tx;
                    clearLead.CommandText = @"UPDATE ""Teams""
SET ""LeadUserId"" = NULL
WHERE ""Id"" = @teamId AND ""LeadUserId"" = @userId;";
                    clearLead.Parameters.AddWithValue("teamId", teamLong);
                    clearLead.Parameters.AddWithValue("userId", userGuid);
                    await clearLead.ExecuteNonQueryAsync();
                }

                await tx.CommitAsync();
                return Ok(updated);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                _logger.LogError(ex, "Error updating team member {UserId} on team {TeamId}", userId, teamId);
                return StatusCode(500, new { error = "Error updating team member." });
            }
        }
        // ================= DELETE =================
        [HttpDelete("{userId}")]
        public async Task<IActionResult> Delete(string teamId, string userId)
        {
            if (!long.TryParse(teamId, out var teamLong) || !Guid.TryParse(userId, out var userGuid))
                return BadRequest();

            await using var conn = new NpgsqlConnection(_connectionString);
            await conn.OpenAsync();

            await using var tx = await conn.BeginTransactionAsync();

            await using var cmd = conn.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = @"DELETE FROM teammembers WHERE teamid = @teamId AND userid = @userId;";
            cmd.Parameters.AddWithValue("teamId", teamLong);
            cmd.Parameters.AddWithValue("userId", userGuid);

            await cmd.ExecuteNonQueryAsync();

            await using var clearLead = conn.CreateCommand();
            clearLead.Transaction = tx;
            clearLead.CommandText = @"UPDATE ""Teams""
SET ""LeadUserId"" = NULL
WHERE ""Id"" = @teamId AND ""LeadUserId"" = @userId;";
            clearLead.Parameters.AddWithValue("teamId", teamLong);
            clearLead.Parameters.AddWithValue("userId", userGuid);
            await clearLead.ExecuteNonQueryAsync();

            await tx.CommitAsync();
            return NoContent();
        }
    }
}


