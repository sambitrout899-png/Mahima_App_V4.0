// Controllers/TimesheetsController.cs
using System;
using Mahima.Api.v3.clean.Data;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Mahima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TimesheetsController : ControllerBase
    {
        private readonly MahimaDbContext _db;

        public TimesheetsController(MahimaDbContext db)
        {
            _db = db;
        }

        // ---------- helpers ----------

        private Guid? GetActorId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? User.FindFirst("sub")?.Value;

            if (Guid.TryParse(id, out var guid))
                return guid;

            return null;
        }

        private string? GetActorIdString() => GetActorId()?.ToString();

        private bool HasAnyRole(params string[] roles)
        {
            var allowed = roles
                .Select(r => r.Trim().ToLowerInvariant())
                .Where(r => !string.IsNullOrWhiteSpace(r))
                .ToHashSet();

            if (allowed.Count == 0)
                return false;

            if (roles.Any(role => User.IsInRole(role)))
                return true;

            var roleClaims = User.FindAll(ClaimTypes.Role)
                .Concat(User.FindAll("role"))
                .Select(c => c.Value?.Trim().ToLowerInvariant())
                .Where(v => !string.IsNullOrWhiteSpace(v));

            return roleClaims.Any(role => allowed.Contains(role!));
        }

        private bool CanManageOthers() => HasAnyRole("admin", "administrator", "finance");

        private bool IsActor(string? userId)
        {
            var actorId = GetActorIdString();
            return !string.IsNullOrWhiteSpace(actorId)
                && !string.IsNullOrWhiteSpace(userId)
                && string.Equals(actorId, userId, StringComparison.OrdinalIgnoreCase);
        }

        private void AddAudit(string action, string entityType, string entityId, object? details)
        {
            var log = new AuditLog
            {
                ActorId = GetActorId(),
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                Details = details != null ? JsonSerializer.Serialize(details) : null,
                CreatedAt = DateTime.UtcNow
            };

            _db.AuditLogs.Add(log);
        }

        // ---------- GET  /api/timesheets ----------

        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] string? userId,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to)
        {
            var canManageOthers = CanManageOthers();
            var actorId = GetActorIdString();

            // Only Admin and Finance can see records for other staff.
            if (!canManageOthers)
            {
                if (string.IsNullOrWhiteSpace(actorId))
                    return Forbid();

                if (!string.IsNullOrWhiteSpace(userId) && !string.Equals(userId, actorId, StringComparison.OrdinalIgnoreCase))
                    return Forbid();

                userId = actorId;
            }

            var query = _db.Timesheets.AsQueryable();

            if (!string.IsNullOrEmpty(userId))
                query = query.Where(x => x.UserId == userId);

            if (from.HasValue)
            {
                var f = DateTime.SpecifyKind(from.Value, DateTimeKind.Unspecified);
                query = query.Where(x => x.Date >= f);
            }

            if (to.HasValue)
            {
                var t = DateTime.SpecifyKind(to.Value, DateTimeKind.Unspecified);
                query = query.Where(x => x.Date <= t);
            }

            var list = await query
                .OrderByDescending(x => x.Date)
                .ToListAsync();

            return Ok(list);
        }

        // ---------- POST  /api/timesheets ----------

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] Timesheet model)
        {
            var canManageOthers = CanManageOthers();
            var actorId = GetActorIdString();

            if (string.IsNullOrWhiteSpace(model.UserId))
                model.UserId = actorId;

            if (string.IsNullOrWhiteSpace(model.UserId))
                return BadRequest("UserId is required.");

            if (!canManageOthers)
            {
                if (string.IsNullOrWhiteSpace(actorId))
                    return Forbid();
                if (!IsActor(model.UserId))
                    return Forbid();
            }

            model.Date = DateTime.SpecifyKind(model.Date, DateTimeKind.Unspecified);

            _db.Timesheets.Add(model);
            await _db.SaveChangesAsync(); // generate Id

            // AUDIT
            AddAudit(
                action: "Timesheet.Create",
                entityType: "Timesheet",
                entityId: model.Id.ToString(),
                details: model
            );
            await _db.SaveChangesAsync();

            return Ok(model);
        }

        // ---------- PUT  /api/timesheets/{id} ----------

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Put(int id, [FromBody] Timesheet model)
        {
            var existing = await _db.Timesheets.FindAsync(id);
            if (existing == null) return NotFound();

            var canManageOthers = CanManageOthers();

            if (!canManageOthers && !IsActor(existing.UserId))
                return Forbid();

            var before = new
            {
                existing.UserId,
                existing.Date,
                existing.Hours,
                existing.Task,
                existing.Notes
            };

            existing.Date = DateTime.SpecifyKind(model.Date, DateTimeKind.Unspecified);
            existing.Hours = model.Hours;
            existing.Task = model.Task;
            existing.Notes = model.Notes;

            if (canManageOthers && !string.IsNullOrWhiteSpace(model.UserId))
            {
                existing.UserId = model.UserId;
            }

            var after = new
            {
                existing.UserId,
                existing.Date,
                existing.Hours,
                existing.Task,
                existing.Notes
            };

            // AUDIT
            AddAudit(
                action: "Timesheet.Update",
                entityType: "Timesheet",
                entityId: id.ToString(),
                details: new { before, after }
            );

            await _db.SaveChangesAsync();
            return Ok(existing);
        }

        // ---------- DELETE  /api/timesheets/{id} ----------

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existing = await _db.Timesheets.FindAsync(id);
            if (existing == null) return NotFound();

            if (!CanManageOthers() && !IsActor(existing.UserId))
                return Forbid();

            var snapshot = new
            {
                existing.UserId,
                existing.Date,
                existing.Hours,
                existing.Task,
                existing.Notes
            };

            _db.Timesheets.Remove(existing);

            // AUDIT
            AddAudit(
                action: "Timesheet.Delete",
                entityType: "Timesheet",
                entityId: id.ToString(),
                details: snapshot
            );

            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
