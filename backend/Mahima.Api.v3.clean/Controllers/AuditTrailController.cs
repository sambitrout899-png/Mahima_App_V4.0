using System;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/audit-trail")]
    [Authorize(Roles = "ADMIN,Admin,admin")]
    public class AuditTrailController : ControllerBase
    {
        private readonly MahimaDbContext _db;

        public AuditTrailController(MahimaDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> Search(
            [FromQuery] Guid? actorId = null,
            [FromQuery] string? action = null,
            [FromQuery] string? entityType = null,
            [FromQuery] string? entityId = null,
            [FromQuery] DateTime? fromUtc = null,
            [FromQuery] DateTime? toUtc = null,
            [FromQuery] string? q = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 100)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 500);

            var query = BuildQuery(actorId, action, entityType, entityId, fromUtc, toUtc, q);
            var total = await query.CountAsync(HttpContext.RequestAborted);
            var items = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new
                {
                    a.Id,
                    a.ActorId,
                    a.Action,
                    a.EntityType,
                    a.EntityId,
                    a.Details,
                    a.CreatedAt
                })
                .ToListAsync(HttpContext.RequestAborted);

            return Ok(new
            {
                items,
                total,
                page,
                pageSize,
                totalPages = pageSize <= 0 ? 0 : (int)Math.Ceiling((double)total / pageSize)
            });
        }

        [HttpGet("export.csv")]
        public async Task<IActionResult> ExportCsv(
            [FromQuery] Guid? actorId = null,
            [FromQuery] string? action = null,
            [FromQuery] string? entityType = null,
            [FromQuery] string? entityId = null,
            [FromQuery] DateTime? fromUtc = null,
            [FromQuery] DateTime? toUtc = null,
            [FromQuery] string? q = null)
        {
            var rows = await BuildQuery(actorId, action, entityType, entityId, fromUtc, toUtc, q)
                .OrderByDescending(a => a.CreatedAt)
                .Take(10000)
                .ToListAsync(HttpContext.RequestAborted);

            var csv = new StringBuilder();
            csv.AppendLine("Id,CreatedAtUtc,ActorId,Action,EntityType,EntityId,Details");
            foreach (var row in rows)
            {
                csv.Append(row.Id).Append(',')
                    .Append(Csv(row.CreatedAt.ToUniversalTime().ToString("O"))).Append(',')
                    .Append(Csv(row.ActorId?.ToString())).Append(',')
                    .Append(Csv(row.Action)).Append(',')
                    .Append(Csv(row.EntityType)).Append(',')
                    .Append(Csv(row.EntityId)).Append(',')
                    .Append(Csv(row.Details))
                    .AppendLine();
            }

            return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"audit-trail-{DateTime.UtcNow:yyyyMMddHHmmss}.csv");
        }

        private IQueryable<AuditLog> BuildQuery(
            Guid? actorId,
            string? action,
            string? entityType,
            string? entityId,
            DateTime? fromUtc,
            DateTime? toUtc,
            string? q)
        {
            var query = _db.AuditLogs.AsNoTracking().AsQueryable();

            if (actorId.HasValue) query = query.Where(a => a.ActorId == actorId.Value);
            if (!string.IsNullOrWhiteSpace(action))
                query = query.Where(a => EF.Functions.ILike(a.Action, $"%{action.Trim()}%"));
            if (!string.IsNullOrWhiteSpace(entityType))
                query = query.Where(a => EF.Functions.ILike(a.EntityType ?? "", $"%{entityType.Trim()}%"));
            if (!string.IsNullOrWhiteSpace(entityId))
                query = query.Where(a => a.EntityId == entityId.Trim());
            if (fromUtc.HasValue) query = query.Where(a => a.CreatedAt >= DateTime.SpecifyKind(fromUtc.Value, DateTimeKind.Utc));
            if (toUtc.HasValue) query = query.Where(a => a.CreatedAt <= DateTime.SpecifyKind(toUtc.Value, DateTimeKind.Utc));
            if (!string.IsNullOrWhiteSpace(q))
            {
                var pattern = $"%{q.Trim()}%";
                query = query.Where(a =>
                    EF.Functions.ILike(a.Action, pattern) ||
                    EF.Functions.ILike(a.EntityType ?? "", pattern) ||
                    EF.Functions.ILike(a.EntityId ?? "", pattern) ||
                    EF.Functions.ILike(a.Details ?? "", pattern));
            }

            return query;
        }

        private static string Csv(string? value)
        {
            var s = value ?? "";
            return "\"" + s.Replace("\"", "\"\"") + "\"";
        }
    }
}
