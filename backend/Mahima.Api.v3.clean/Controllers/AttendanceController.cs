// Controllers/AttendanceController.cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Models;
using Mahima.Api.v3.clean.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Mahima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AttendanceController : ControllerBase
    {
        private readonly MahimaDbContext _db;

        public AttendanceController(MahimaDbContext db)
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

        // ---------- GET  /api/attendance ----------
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AttendanceRecord>>> Get(
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] string? userId)
        {
            var canManageOthers = CanManageOthers();
            var actorId = GetActorIdString();

            if (!canManageOthers)
            {
                if (string.IsNullOrWhiteSpace(actorId))
                    return Forbid();

                if (!string.IsNullOrWhiteSpace(userId) && !string.Equals(userId, actorId, StringComparison.OrdinalIgnoreCase))
                    return Forbid();

                userId = actorId;
            }

            IQueryable<AttendanceRecord> query = _db.AttendanceRecords;

            if (from.HasValue)
            {
                var f = DateTime.SpecifyKind(from.Value, DateTimeKind.Unspecified);
                query = query.Where(a => a.Date >= f);
            }

            if (to.HasValue)
            {
                var t = DateTime.SpecifyKind(to.Value, DateTimeKind.Unspecified);
                query = query.Where(a => a.Date <= t);
            }

            if (!string.IsNullOrWhiteSpace(userId))
            {
                query = query.Where(a => a.UserId == userId);
            }

            var items = await query
                .OrderByDescending(a => a.Date)
                .ToListAsync();

            return Ok(items);
        }

        // ---------- POST  /api/attendance ----------

        [HttpPost]
        public async Task<ActionResult<AttendanceRecord>> Create([FromBody] AttendanceRecord dto)
        {
            if (dto == null)
                return BadRequest("Attendance payload is required.");

            var canManageOthers = CanManageOthers();
            var actorId = GetActorIdString();

            if (string.IsNullOrWhiteSpace(dto.UserId))
                dto.UserId = actorId;

            if (string.IsNullOrWhiteSpace(dto.UserId))
                return BadRequest("UserId is required.");

            if (!canManageOthers && !IsActor(dto.UserId))
                return Forbid();

            dto.Date = DateTime.SpecifyKind(dto.Date, DateTimeKind.Unspecified);

            _db.AttendanceRecords.Add(dto);
            await _db.SaveChangesAsync();   // generate Id

            // AUDIT
            AddAudit(
                action: "Attendance.Create",
                entityType: "AttendanceRecord",
                entityId: dto.Id.ToString(),
                details: dto
            );
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
        }

        // ---------- GET  /api/attendance/{id} ----------
        [HttpGet("{id:int}")]
        public async Task<ActionResult<AttendanceRecord>> GetById(int id)
        {
            var item = await _db.AttendanceRecords.FindAsync(id);
            if (item == null) return NotFound();
            if (!CanManageOthers() && !IsActor(item.UserId)) return Forbid();
            return Ok(item);
        }

        // ---------- PUT  /api/attendance/{id} ----------

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] AttendanceRecord dto)
        {
            var existing = await _db.AttendanceRecords.FindAsync(id);
            if (existing == null) return NotFound();

            var canManageOthers = CanManageOthers();
            if (!canManageOthers && !IsActor(existing.UserId))
                return Forbid();

            var before = new
            {
                existing.UserId,
                existing.Date,
                existing.Status
            };

            if (canManageOthers && !string.IsNullOrWhiteSpace(dto.UserId))
                existing.UserId = dto.UserId;

            existing.Date = DateTime.SpecifyKind(dto.Date, DateTimeKind.Unspecified);
            existing.Status = dto.Status;

            var after = new
            {
                existing.UserId,
                existing.Date,
                existing.Status
            };

            // AUDIT
            AddAudit(
                action: "Attendance.Update",
                entityType: "AttendanceRecord",
                entityId: id.ToString(),
                details: new { before, after }
            );

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ---------- DELETE  /api/attendance/{id} ----------

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existing = await _db.AttendanceRecords.FindAsync(id);
            if (existing == null) return NotFound();

            if (!CanManageOthers() && !IsActor(existing.UserId))
                return Forbid();

            var snapshot = new
            {
                existing.UserId,
                existing.Date,
                existing.Status
            };

            _db.AttendanceRecords.Remove(existing);

            // AUDIT
            AddAudit(
                action: "Attendance.Delete",
                entityType: "AttendanceRecord",
                entityId: id.ToString(),
                details: snapshot
            );

            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
