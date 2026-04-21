using Mahima.Api.v3.clean.Data;
﻿using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Mahima.Api.v3.clean;
using Mahima.Api.v3.clean.Hubs;
using Mahima.Api.v3.clean.Models;
using Mahima.Api.v3.clean.Models.Dtos;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    // Support both /api/PrayerRequests and /prayerrequests
    [Route("api/[controller]")]
    [Route("prayerrequests")]
    public class PrayerRequestsController : ControllerBase
    {
        private readonly MahimaDbContext _db;
        private readonly IHubContext<ChatHub> _hub;
        private readonly ILogger<PrayerRequestsController> _logger;

        private static readonly Guid SuperUserGuid = Guid.Parse("ae9dfc94-07d8-469a-a8f6-a4c5aedcf3a9");

        public PrayerRequestsController(
            MahimaDbContext db,
            IHubContext<ChatHub> hub,
            ILogger<PrayerRequestsController> logger)
        {
            _db = db;
            _hub = hub;
            _logger = logger;
        }

        // ---------- CREATE NEW PRAYER REQUEST ----------
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreatePrayerRequest([FromBody] CreatePrayerRequestDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Message))
                return BadRequest("Message is required.");

            var userId = GetCurrentUserGuid();
            var userName = GetCurrentUserName() ?? (dto.Anonymous ? "Anonymous" : "Unknown");

            var request = new PrayerRequest
            {
                Title = string.IsNullOrWhiteSpace(dto.Title) ? null : dto.Title.Trim(),
                Message = dto.Message.Trim(),
                UserId = userId,
                CreatedBy = dto.Anonymous ? "Anonymous" : userName,
                CreatedAt = DateTime.UtcNow,
                Status = string.IsNullOrWhiteSpace(dto.Status) ? "new" : dto.Status,
                Anonymous = dto.Anonymous,
                AssignedTo = dto.AssignedTo
            };

            _db.PrayerRequests.Add(request);
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving PrayerRequest");
                return StatusCode(500, "Error saving prayer request");
            }

            var result = new
            {
                id = request.Id,
                userId = request.UserId,
                createdBy = request.CreatedBy,
                title = request.Title,
                message = request.Message,
                anonymous = request.Anonymous,
                status = request.Status,
                assignedTo = request.AssignedTo,
                createdAt = request.CreatedAt,
                closeComment = GetCloseCommentValue(request),
                responses = Array.Empty<object>()
            };

            return Ok(result);
        }

        // ---------- PATCH / PUT STATUS + CLOSE COMMENT ----------
        [HttpPatch("{id:long}")]
        [Authorize]
        public async Task<IActionResult> PatchStatus(long id, [FromBody] UpdatePrayerRequestStatusDto dto)
            => await UpdateStatusInternal(id, dto);

        [HttpPut("{id:long}")]
        [Authorize]
        public async Task<IActionResult> PutStatus(long id, [FromBody] UpdatePrayerRequestStatusDto dto)
            => await UpdateStatusInternal(id, dto);

        private async Task<IActionResult> UpdateStatusInternal(long id, UpdatePrayerRequestStatusDto dto)
        {
            // we allow updating either Status, or CloseComment, or both
            bool hasStatus = dto != null && !string.IsNullOrWhiteSpace(dto.Status);
            bool hasCloseComment = dto != null && dto.CloseComment != null;

            if (!hasStatus && !hasCloseComment)
                return BadRequest("Status or CloseComment value is required.");

            var req = await _db.PrayerRequests.FindAsync(id);
            if (req == null)
                return NotFound();

            var currentUserId = GetCurrentUserGuid();
            var roles = GetCurrentUserRoles().ToList();
            bool isPrivileged = IsPrivilegedUser(roles);
            if (currentUserId != null && currentUserId == SuperUserGuid) isPrivileged = true;

            if (!isPrivileged && currentUserId != null)
            {
                try
                {
                    var user = await _db.Users.AsNoTracking()
                        .Where(u => u.Id == currentUserId)
                        .Select(u => new { u.Role })
                        .FirstOrDefaultAsync();

                    if (user != null && !string.IsNullOrWhiteSpace(user.Role))
                    {
                        var parsed = ParseRolesFromString(user.Role);
                        if (IsPrivilegedUser(parsed)) isPrivileged = true;
                    }
                }
                catch
                {
                    // ignore lookup failures
                }
            }

            if (!isPrivileged)
                return Forbid("Only administrators can update prayer request state.");

            // ---- apply updates ----
            if (hasStatus)
            {
                req.Status = dto!.Status!.Trim();
            }

            if (hasCloseComment)
            {
                // Use reflection to avoid hard dependency on CloseComment property.
                var closeCommentProp = req.GetType().GetProperty("CloseComment");
                if (closeCommentProp != null && closeCommentProp.CanWrite)
                {
                    closeCommentProp.SetValue(req, dto!.CloseComment);
                }
            }

            // optional UpdatedAt support
            var updatedAtProp = req.GetType().GetProperty("UpdatedAt");
            if (updatedAtProp != null && updatedAtProp.CanWrite)
            {
                updatedAtProp.SetValue(req, DateTime.UtcNow);
            }

            await _db.SaveChangesAsync();

            return Ok(new
            {
                id = req.Id,
                status = req.Status,
                closeComment = GetCloseCommentValue(req)
            });
        }

        // ---------- GET ALL REQUESTS ----------
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAll([FromQuery] bool includeResponses = false)
        {
            var currentUserId = GetCurrentUserGuid();
            var roles = GetCurrentUserRoles().ToList();
            bool isPrivileged = IsPrivilegedUser(roles);
            if (currentUserId != null && currentUserId == SuperUserGuid) isPrivileged = true;

            IQueryable<PrayerRequest> query = _db.PrayerRequests.AsNoTracking();
            if (!isPrivileged)
            {
                if (currentUserId == null)
                    return Forbid();
                query = query.Where(p => p.UserId == currentUserId);
            }

            var list = await query.OrderByDescending(p => p.CreatedAt).ToListAsync();
            var responsesMap = new Dictionary<long, List<object>>();

            if (includeResponses && list.Any())
            {
                var reqIds = list.Select(p => p.Id).ToList();
                responsesMap = await LoadResponsesByRawSqlAsync(reqIds);
            }

            var dto = list.Select(p =>
            {
                var closeComment = GetCloseCommentValue(p);

                return new
                {
                    id = p.Id,
                    userId = p.UserId,
                    createdBy = p.CreatedBy,
                    title = p.Title,
                    message = p.Message,
                    anonymous = p.Anonymous,
                    status = p.Status,
                    assignedTo = p.AssignedTo,
                    createdAt = p.CreatedAt,
                    closeComment = closeComment,
                    responses = responsesMap.TryGetValue(p.Id, out var found)
                        ? found.ToArray()
                        : Array.Empty<object>()
                };
            });

            return Ok(dto);
        }

        // helper to safely read CloseComment via reflection (or null)
        private static string? GetCloseCommentValue(object obj)
        {
            if (obj == null) return null;
            var prop = obj.GetType().GetProperty("CloseComment");
            if (prop == null) return null;
            var val = prop.GetValue(obj);
            return val?.ToString();
        }

        // ---------- RAW SQL FALLBACK WITH AUTO COLUMN DETECTION ----------
        private async Task<Dictionary<long, List<object>>> LoadResponsesByRawSqlAsync(List<long> requestIds)
        {
            var map = new Dictionary<long, List<object>>();
            if (requestIds == null || !requestIds.Any()) return map;

            var conn = _db.Database.GetDbConnection();
            try
            {
                if (conn.State != ConnectionState.Open)
                    await conn.OpenAsync();

                var existingCols = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                using (var colCmd = conn.CreateCommand())
                {
                    colCmd.CommandText = @"SELECT column_name FROM information_schema.columns WHERE table_name = 'prayerresponses';";
                    using var rdr = await colCmd.ExecuteReaderAsync();
                    while (await rdr.ReadAsync())
                        existingCols.Add(rdr.GetString(0));
                }

                string msgCol = existingCols.Contains("message") ? "message" :
                                existingCols.Contains("response_text") ? "response_text" :
                                existingCols.Contains("ResponseText") ? "\"ResponseText\"" :
                                existingCols.Contains("responsetext") ? "responsetext" : "''";

                string authCol = existingCols.Contains("author") ? "author" :
                                 existingCols.Contains("respondedby") ? "respondedby" :
                                 existingCols.Contains("responded_by") ? "responded_by" :
                                 existingCols.Contains("RespondedBy") ? "\"RespondedBy\"" : "''";

                string createdCol = existingCols.Contains("createdat") ? "createdat" :
                                    existingCols.Contains("respondedat") ? "respondedat" :
                                    existingCols.Contains("responded_at") ? "responded_at" :
                                    existingCols.Contains("RespondedAt") ? "\"RespondedAt\"" : "NOW()";

                string isDeletedCol = existingCols.Contains("isdeleted") ? "isdeleted" :
                                      existingCols.Contains("IsDeleted") ? "\"IsDeleted\"" : "false";

                using var cmd = conn.CreateCommand();
                var paramNames = new List<string>();
                for (int i = 0; i < requestIds.Count; i++)
                {
                    var p = cmd.CreateParameter();
                    p.ParameterName = $"@p{i}";
                    p.Value = requestIds[i];
                    cmd.Parameters.Add(p);
                    paramNames.Add(p.ParameterName);
                }

                cmd.CommandText = $@"
                    SELECT id,
                           prayerrequestid,
                           COALESCE({msgCol}, '') AS message,
                           COALESCE({authCol}, '') AS author,
                           COALESCE({createdCol}, NOW()) AS createdat,
                           COALESCE({isDeletedCol}, false) AS isdeleted
                    FROM prayerresponses
                    WHERE prayerrequestid IN ({string.Join(",", paramNames)})
                      AND COALESCE({isDeletedCol}, false) = false
                    ORDER BY createdat ASC;
                ";

                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var id = reader.IsDBNull(0) ? 0L : reader.GetInt64(0);
                    var pid = reader.IsDBNull(1) ? 0L : reader.GetInt64(1);
                    var msg = reader.IsDBNull(2) ? "" : reader.GetString(2);
                    var auth = reader.IsDBNull(3) ? "" : reader.GetString(3);
                    var created = reader.IsDBNull(4) ? DateTime.UtcNow : reader.GetDateTime(4);

                    if (!map.TryGetValue(pid, out var list))
                        map[pid] = list = new List<object>();

                    list.Add(new { id = id, author = auth, message = msg, createdAt = created });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Dynamic column detection or response load failed.");
            }
            finally
            {
                try { conn.Close(); } catch { }
            }

            return map;
        }

        // ---------- GET RESPONSES ----------
        [HttpGet("{id:long}/responses")]
        [AllowAnonymous]
        public async Task<IActionResult> GetResponses(long id)
        {
            var exists = await _db.PrayerRequests.AnyAsync(p => p.Id == id);
            if (!exists) return NotFound();

            var dict = await LoadResponsesByRawSqlAsync(new List<long> { id });
            if (dict.TryGetValue(id, out var list))
                return Ok(list);

            return Ok(Array.Empty<object>());
        }

        // ---------- ADD RESPONSE ----------
        [HttpPost("{id:long}/responses")]
        [Authorize]
        public async Task<IActionResult> AddResponse(long id, [FromBody] PrayerResponseDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.ResponseText))
                return BadRequest("ResponseText is required.");

            var request = await _db.PrayerRequests.FindAsync(id);
            if (request == null)
                return NotFound();

            var respondedBy = GetCurrentUserName() ?? dto.RespondedBy ?? "Mahima Ministry";

            var response = new PrayerResponse
            {
                PrayerRequestId = id,
                ResponseText = dto.ResponseText.Trim(),
                RespondedBy = respondedBy,
                RespondedAt = DateTime.UtcNow,
                IsDeleted = false
            };

            _db.PrayerResponses.Add(response);
            await _db.SaveChangesAsync();

            try
            {
                await _hub.Clients.All.SendAsync("PrayerResponseCreated", new
                {
                    id = response.Id,
                    prayerRequestId = response.PrayerRequestId,
                    responseText = response.ResponseText,
                    respondedBy = response.RespondedBy,
                    respondedAt = response.RespondedAt
                });
            }
            catch
            {
                // ignore hub failures
            }

            return Ok(new
            {
                id = response.Id,
                prayerRequestId = response.PrayerRequestId,
                responseText = response.ResponseText,
                respondedBy = response.RespondedBy,
                respondedAt = response.RespondedAt
            });
        }

        // ---------- DELETE RESPONSE ----------
        [HttpDelete("{id:long}/responses/{responseId:long}")]
        [Authorize]
        public async Task<IActionResult> DeleteResponse(long id, long responseId)
        {
            var currentUserId = GetCurrentUserGuid();
            var roles = GetCurrentUserRoles().ToList();
            bool isPrivileged = IsPrivilegedUser(roles);
            if (currentUserId != null && currentUserId == SuperUserGuid) isPrivileged = true;

            if (!isPrivileged)
                return Forbid("Only administrators can delete responses.");

            var resp = await _db.PrayerResponses
                .FirstOrDefaultAsync(r => r.Id == responseId && r.PrayerRequestId == id);
            if (resp == null) return NotFound();

            resp.IsDeleted = true;
            await _db.SaveChangesAsync();

            try
            {
                await _hub.Clients.All.SendAsync("PrayerResponseDeleted", new { id = resp.Id, prayerRequestId = id });
            }
            catch
            {
                // ignore hub failures
            }

            _logger.LogInformation("PrayerResponse {ResponseId} soft-deleted by {User}", responseId, currentUserId?.ToString() ?? "(null)");
            return NoContent();
        }

        // ---------- DELETE PRAYER REQUEST (and its responses) ----------
        [HttpDelete("{id:long}")]
        [Authorize]
        public async Task<IActionResult> DeletePrayerRequest(long id)
        {
            var currentUserId = GetCurrentUserGuid();
            var roles = GetCurrentUserRoles().ToList();
            bool isPrivileged = IsPrivilegedUser(roles);
            if (currentUserId == SuperUserGuid) isPrivileged = true;

            var request = await _db.PrayerRequests.FirstOrDefaultAsync(p => p.Id == id);
            if (request == null) return NotFound();

            if (!isPrivileged && request.UserId != currentUserId)
                return Forbid("You are not allowed to delete this prayer request.");

            var strategy = _db.Database.CreateExecutionStrategy();

            try
            {
                await strategy.ExecuteAsync(async () =>
                {
                    using var tx = await _db.Database.BeginTransactionAsync();

                    var responses = await _db.PrayerResponses
                        .Where(r => r.PrayerRequestId == id)
                        .ToListAsync();

                    var respHasIsDeleted = responses.FirstOrDefault()?.GetType().GetProperty("IsDeleted") != null;
                    if (respHasIsDeleted)
                    {
                        foreach (var resp in responses)
                        {
                            var prop = resp.GetType().GetProperty("IsDeleted");
                            if (prop != null) prop.SetValue(resp, true);
                        }
                        await _db.SaveChangesAsync();
                    }
                    else if (responses.Any())
                    {
                        _db.PrayerResponses.RemoveRange(responses);
                        await _db.SaveChangesAsync();
                    }

                    var reqIsDeletedProp = request.GetType().GetProperty("IsDeleted");
                    if (reqIsDeletedProp != null)
                    {
                        reqIsDeletedProp.SetValue(request, true);
                        _db.PrayerRequests.Update(request);
                    }
                    else
                    {
                        _db.PrayerRequests.Remove(request);
                    }

                    await _db.SaveChangesAsync();
                    await tx.CommitAsync();

                    try
                    {
                        await _hub.Clients.All.SendAsync("PrayerRequestDeleted", new { id });
                        foreach (var resp in responses)
                        {
                            var idProp = resp.GetType().GetProperty("Id");
                            long respId = 0;
                            if (idProp != null)
                            {
                                var val = idProp.GetValue(resp);
                                if (val != null) respId = Convert.ToInt64(val);
                            }
                            await _hub.Clients.All.SendAsync("PrayerResponseDeleted", new { id = respId, prayerRequestId = id });
                        }
                    }
                    catch
                    {
                        // ignore hub failures
                    }
                });

                _logger.LogInformation("PrayerRequest {Id} deleted by user {UserId}", id, currentUserId?.ToString() ?? "(null)");
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting PrayerRequest {Id}", id);
                return StatusCode(500, "Error deleting prayer request: " + ex.Message);
            }
        }

        // ---------- HELPERS ----------
        private Guid? GetCurrentUserGuid()
        {
            var idClaim = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                          ?? User?.FindFirst("sub")?.Value
                          ?? User?.FindFirst("userid")?.Value;

            return Guid.TryParse(idClaim, out var g) ? g : (Guid?)null;
        }

        private string? GetCurrentUserName()
        {
            return User?.FindFirst(ClaimTypes.Name)?.Value
                ?? User?.FindFirst("preferred_username")?.Value
                ?? User?.FindFirst("username")?.Value;
        }

        private IEnumerable<string> GetCurrentUserRoles()
        {
            var roles = new List<string>();
            if (User == null) return roles;

            roles.AddRange(User.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value ?? ""));
            roles.AddRange(User.Claims.Where(c => string.Equals(c.Type, "role", StringComparison.OrdinalIgnoreCase)).Select(c => c.Value ?? ""));
            return roles.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.OrdinalIgnoreCase);
        }

        private static List<string> ParseRolesFromString(string? roleValue)
        {
            var results = new List<string>();
            if (string.IsNullOrWhiteSpace(roleValue)) return results;
            if (roleValue.Contains(','))
                results.AddRange(roleValue.Split(',').Select(x => x.Trim()));
            else
                results.Add(roleValue.Trim());
            return results.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        }

        private static bool IsPrivilegedUser(IEnumerable<string>? roles)
        {
            if (roles == null) return false;
            foreach (var r in roles)
            {
                if (string.IsNullOrWhiteSpace(r)) continue;
                var low = r.Trim().ToLowerInvariant();
                if (low == "admin" || low == "administrator" || low == "staff" || low == "superuser" || low == "manager")
                    return true;
                if (low.Contains("admin") || low.Contains("staff"))
                    return true;
            }
            return false;
        }
    }

    // DTOs
    public class CreatePrayerRequestDto
    {
        public string? Title { get; set; }
        public string Message { get; set; } = "";
        public bool Anonymous { get; set; } = false;
        public string? Status { get; set; } = "new";
        public Guid? AssignedTo { get; set; }
    }

    public class PrayerResponseDto
    {
        public string? ResponseText { get; set; }
        public string? RespondedBy { get; set; }
    }

    public class UpdatePrayerRequestStatusDto
    {
        public string? Status { get; set; }

        // NEW: closing / admin comment; may be null to clear
        public string? CloseComment { get; set; }
    }
}
