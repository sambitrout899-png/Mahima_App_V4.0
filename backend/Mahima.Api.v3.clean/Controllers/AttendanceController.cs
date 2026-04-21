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

       // private bool IsAdmin()
       // {
         //   if (User.IsInRole("Admin") || User.IsInRole("Administrator"))
            //    return true;

           // var roleClaims = User.FindAll(ClaimTypes.Role)
                                 //.Select(c => c.Value?.ToLowerInvariant())
                                 //.Where(v => !string.IsNullOrWhiteSpace(v))
                                 //.ToList();

            //if (roleClaims.Contains("admin") || roleClaims.Contains("administrator"))
              //  return true;

           // var simpleRole = User.FindFirst("role")?.Value?.ToLowerInvariant();
          //  if (simpleRole == "admin" || simpleRole == "administrator")
             //   return true;

           // return false;
   //     }

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
        [AllowAnonymous]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AttendanceRecord>>> Get(
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] string? userId)
        {
            //var isAdmin = IsAdmin();
            var actorId = GetActorIdString();

            //if (!isAdmin)
            //{
                //if (string.IsNullOrWhiteSpace(actorId))
                   // return Forbid();

                //if (!string.IsNullOrWhiteSpace(userId) && userId != actorId)
                    //return Forbid();

                //userId = actorId;
          //  }

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
            //var isAdmin = IsAdmin();
            var actorId = GetActorIdString();

           // if (!isAdmin)
           // {
                //if (string.IsNullOrWhiteSpace(actorId))
                   // return Forbid();

                //dto.UserId = actorId;
            //}

            if (string.IsNullOrWhiteSpace(dto.UserId))
                return BadRequest("UserId is required.");

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
	[AllowAnonymous]
        [HttpGet("{id:int}")]
        public async Task<ActionResult<AttendanceRecord>> GetById(int id)
        {
            var item = await _db.AttendanceRecords.FindAsync(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        // ---------- PUT  /api/attendance/{id} ----------

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] AttendanceRecord dto)
        {
            var existing = await _db.AttendanceRecords.FindAsync(id);
            if (existing == null) return NotFound();

            //var isAdmin = IsAdmin();
            var actorId = GetActorIdString();

           // if (!isAdmin)
            //{
               // if (string.IsNullOrWhiteSpace(actorId) || existing.UserId != actorId)
                   // return Forbid();
        //    }

            var before = new
            {
                existing.UserId,
                existing.Date,
                existing.Status
            };

            // Admin may reassign; staff cannot
           // if (isAdmin && !string.IsNullOrWhiteSpace(dto.UserId))
               // existing.UserId = dto.UserId;

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

            //var isAdmin = IsAdmin();
            //var actorId = GetActorIdString();

           // if (!isAdmin)
           // {
               // if (string.IsNullOrWhiteSpace(actorId) || existing.UserId != actorId)
                  //  return Forbid();
           // }

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
