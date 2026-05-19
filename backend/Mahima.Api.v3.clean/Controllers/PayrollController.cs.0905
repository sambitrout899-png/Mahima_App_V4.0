using System;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Mahima.Api.v3.clean.Data;

namespace Mahima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // default: auth required
    public class PayrollController : ControllerBase
    {
        private readonly MahimaDbContext _db;
        private readonly IWebHostEnvironment _env;

        public PayrollController(MahimaDbContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
        }

        // ---------- helpers ----------

        private string? GetActorIdString()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? User.FindFirst("sub")?.Value;
            return id;
        }

        private bool IsAdmin()
        {
            if (User.IsInRole("Admin") || User.IsInRole("Administrator"))
                return true;

            var roleClaims = User.FindAll(ClaimTypes.Role)
                                 .Select(c => c.Value?.ToLowerInvariant())
                                 .Where(v => !string.IsNullOrWhiteSpace(v))
                                 .ToList();

            if (roleClaims.Contains("admin") || roleClaims.Contains("administrator"))
                return true;

            var simpleRole = User.FindFirst("role")?.Value?.ToLowerInvariant();
            if (simpleRole == "admin" || simpleRole == "administrator")
                return true;

            return false;
        }

        private void AddAudit(string action, string entityType, string entityId, object? details)
        {
            var log = new AuditLog
            {
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                Details = details != null ? JsonSerializer.Serialize(details) : null,
                CreatedAt = DateTime.UtcNow
            };

            _db.AuditLogs.Add(log);
        }

       private IQueryable<Timesheet> FilterTimesheets(string userId, DateTime from, DateTime to)
{
    // Work purely with dates and let EF use the same mapping as the Timesheet.Date property
    var fromDate = from.Date;
    var toDate   = to.Date;

    return _db.Timesheets
              .AsNoTracking()
              .Where(x => x.UserId == userId &&
                          x.Date >= fromDate &&
                          x.Date <= toDate);
}

        private async Task<StaffPayrollSetting?> GetPayrollSettingAsync(string userId)
        {
            return await _db.StaffPayrollSettings
                            .AsNoTracking()
                            .FirstOrDefaultAsync(x => x.UserId == userId && x.IsActive);
        }

        private static PayrollSummaryDto BuildSummary(
            string userId,
            string? displayName,
            DateTime from,
            DateTime to,
            decimal totalHours,
            StaffPayrollSetting? setting)
        {
            var hourlyRate = setting?.HourlyRate ?? 0m;
            var fixedAmount = setting?.MonthlyFixedAmount ?? 0m;
            var allowances = setting?.Allowances ?? 0m;
            var deductions = setting?.Deductions ?? 0m;

            var hoursAmount = totalHours * hourlyRate;

            // Match frontend formula: Gross = TotalHours * HourlyRate
            var gross = hoursAmount;
            var net = gross - deductions;

            return new PayrollSummaryDto
            {
                UserId = userId,
                DisplayName = displayName,
                From = from.Date,
                To = to.Date,
                TotalHours = totalHours,
                HourlyRate = hourlyRate,
                FixedAmount = fixedAmount,
                HourlyAmount = hoursAmount,
                Allowances = allowances,
                Deductions = deductions,
                GrossAmount = gross,
                NetAmount = net
            };
        }

        private static PayrollRunDto ToRunDto(PayrollRun run) => new PayrollRunDto
        {
            Id           = run.Id,
            UserId       = run.UserId,
            DisplayName  = null,
            From         = run.From,
            To           = run.To,
            TotalHours   = run.TotalHours,
            HourlyRate   = run.HourlyRate,
            FixedAmount  = run.FixedAmount,
            HourlyAmount = 0,
            Allowances   = run.Allowances,
            Deductions   = run.Deductions,
            GrossAmount  = run.GrossAmount,
            NetAmount    = run.NetAmount
        };

        private string GetLogoPath()
        {
            var root = _env.WebRootPath ?? string.Empty;
            return System.IO.Path.Combine(root, "images", "mahima-logo.png");
        }

        // ---------- SETTINGS CRUD (temporarily open) ----------

        // GET: /api/payroll/settings
        // NOTE: AllowAnonymous overrides controller-level [Authorize]
        [AllowAnonymous]
        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings()
        {
            var list = await _db.StaffPayrollSettings
                .OrderBy(x => x.UserId)
                .ToListAsync();

            return Ok(list);
        }

        // POST: /api/payroll/settings
        [AllowAnonymous]
        [HttpPost("settings")]
        public async Task<IActionResult> UpsertSetting([FromBody] StaffPayrollSetting dto)
        {
            if (string.IsNullOrWhiteSpace(dto.UserId))
                return BadRequest("UserId is required.");

            var existing = await _db.StaffPayrollSettings
                                    .FirstOrDefaultAsync(x => x.UserId == dto.UserId);

            if (existing == null)
            {
                dto.Id = 0;
                _db.StaffPayrollSettings.Add(dto);
                AddAudit("Payroll.Settings.Create", "StaffPayrollSetting", dto.UserId, dto);
            }
            else
            {
                existing.HourlyRate         = dto.HourlyRate;
                existing.MonthlyFixedAmount = dto.MonthlyFixedAmount;
                existing.Allowances         = dto.Allowances;
                existing.Deductions         = dto.Deductions;
                existing.IsActive           = dto.IsActive;

                AddAudit("Payroll.Settings.Update", "StaffPayrollSetting", dto.UserId, dto);
            }

            await _db.SaveChangesAsync();
            return Ok(dto);
        }

        // ---------- PAYROLL SUMMARY (still requires auth) ----------

        // GET: /api/payroll/summary?userId={id}&from=YYYY-MM-DD&to=YYYY-MM-DD
	 [AllowAnonymous]
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary(
            [FromQuery] string? userId,
            [FromQuery] DateTime from,
            [FromQuery] DateTime to)
        {
            if (from == default || to == default || from > to)
                return BadRequest("Valid 'from' and 'to' dates are required.");

            var isAdmin = IsAdmin();
            var actorId = GetActorIdString();

            //if (!isAdmin)
            //{
              //  if (string.IsNullOrWhiteSpace(actorId))
                //    return Forbid();

         //       if (!string.IsNullOrWhiteSpace(userId) &&
           //         !string.Equals(userId, actorId, StringComparison.OrdinalIgnoreCase))
             //       return Forbid();

//                userId = actorId;
  //          }

            if (string.IsNullOrWhiteSpace(userId))
                return BadRequest("userId is required for payroll summary.");

            var timesheetsQuery = FilterTimesheets(userId, from, to);
            var timesheets = await timesheetsQuery.ToListAsync();

            var totalHours = timesheets.Sum(t => t.Hours);
            var setting = await GetPayrollSettingAsync(userId);
            var displayName = userId;

            var summary = BuildSummary(userId, displayName, from, to, totalHours, setting);

            AddAudit(
                action: "Payroll.Summary",
                entityType: "Payroll",
                entityId: userId,
                details: new { from, to, summary });

            await _db.SaveChangesAsync();

            return Ok(summary);
        }

        // ---------- PAYROLL RUNS (history) ----------

        // GET: /api/payroll/runs?userId={id}
        [AllowAnonymous]
        [HttpGet("~/api/payroll/runs")]
        public async Task<IActionResult> GetRuns([FromQuery] string? userId)
        {
            var query = _db.PayrollRuns.AsQueryable();

            if (!string.IsNullOrWhiteSpace(userId))
                query = query.Where(r => r.UserId == userId);

            var runs = await query
                .OrderByDescending(r => r.From)
                .ThenByDescending(r => r.Id)
                .ToListAsync();

            var dtos = runs.Select(ToRunDto).ToList();
            return Ok(dtos);
        }

        // POST: /api/payroll/runs
        [AllowAnonymous]
        [HttpPost("~/api/payroll/runs")]
        public async Task<IActionResult> CreateRun([FromBody] PayrollRunRequest dto)
        {
            if (dto == null)
                return BadRequest("Body is required.");

            if (dto.From == default || dto.To == default || dto.From > dto.To)
                return BadRequest("Valid 'from' and 'to' dates are required.");

            if (string.IsNullOrWhiteSpace(dto.UserId))
                return BadRequest("userId is required.");

            var fromUtc = DateTime.SpecifyKind(dto.From.Date, DateTimeKind.Utc);
            var toUtc   = DateTime.SpecifyKind(dto.To.Date, DateTimeKind.Utc);

            var run = new PayrollRun
            {
                UserId      = dto.UserId,
                From        = fromUtc,
                To          = toUtc,
                TotalHours  = dto.TotalHours,
                HourlyRate  = dto.HourlyRate,
                FixedAmount = dto.FixedAmount,
                Allowances  = dto.Allowances,
                Deductions  = dto.Deductions,
                GrossAmount = dto.GrossAmount,
                NetAmount   = dto.NetAmount
            };

            _db.PayrollRuns.Add(run);
            AddAudit("Payroll.Run.Create", "PayrollRun", dto.UserId, run);

            await _db.SaveChangesAsync();

            var result = ToRunDto(run);
            return Ok(result);
        }

        // DELETE: /api/payroll/runs/{id}
        [AllowAnonymous]
        [HttpDelete("~/api/payroll/runs/{id:guid}")]
        public async Task<IActionResult> DeleteRun(Guid id)
        {
            var run = await _db.PayrollRuns.FindAsync(id);
            if (run == null) return NotFound();

            _db.PayrollRuns.Remove(run);
            AddAudit("Payroll.Run.Delete", "PayrollRun", run.Id.ToString(), new
            {
                run.UserId,
                run.From,
                run.To
            });

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // GET: /api/payroll/runs/{id}/slip
        [AllowAnonymous]
        [HttpGet("~/api/payroll/runs/{id:guid}/slip")]
        public async Task<IActionResult> GetRunSlip(Guid id)
        {
            var run = await _db.PayrollRuns.FindAsync(id);
            if (run == null) return NotFound();

            var summary = new PayrollSummaryDto
            {
                UserId      = run.UserId,
                DisplayName = null,
                From        = run.From,
                To          = run.To,
                TotalHours  = run.TotalHours,
                HourlyRate  = run.HourlyRate,
                FixedAmount = run.FixedAmount,
                HourlyAmount = run.TotalHours * run.HourlyRate,
                Allowances  = run.Allowances,
                Deductions  = run.Deductions,
                GrossAmount = run.GrossAmount,
                NetAmount   = run.NetAmount
            };

            var logoPath = GetLogoPath();
            var pdfBytes = GenerateSalarySlipPdf(summary, logoPath);

            var fileName =
                $"SalarySlip_{(summary.DisplayName ?? summary.UserId)}_{summary.From:yyyyMM}.pdf";

            AddAudit("Payroll.Run.Slip", "PayrollRun", run.Id.ToString(), summary);
            await _db.SaveChangesAsync();

            return File(pdfBytes, "application/pdf", fileName);
        }

        // ---------- LEGACY: salary slip by period ----------

        // GET: /api/payroll/slip?userId={id}&from=YYYY-MM-DD&to=YYYY-MM-DD
	[AllowAnonymous]
        [HttpGet("slip")]
        public async Task<IActionResult> GetSalarySlipPdf(
            [FromQuery] string? userId,
            [FromQuery] DateTime from,
            [FromQuery] DateTime to)
        {
            if (from == default || to == default || from > to)
                return BadRequest("Valid 'from' and 'to' dates are required.");

            //var isAdmin = IsAdmin();
           // var actorId = GetActorIdString();

            //if (!isAdmin)
            //{
               // if (string.IsNullOrWhiteSpace(actorId))
                   // return Forbid();

                //if (!string.IsNullOrWhiteSpace(userId) &&
                   // !string.Equals(userId, actorId, StringComparison.OrdinalIgnoreCase))
                    //return Forbid();

                //userId = actorId;
           // }

            if (string.IsNullOrWhiteSpace(userId))
                return BadRequest("userId is required for salary slip.");

            var timesheetsQuery = FilterTimesheets(userId, from, to);
            var timesheets = await timesheetsQuery
                .OrderBy(t => t.Date)
                .ToListAsync();

            var totalHours = timesheets.Sum(t => t.Hours);
            var setting = await GetPayrollSettingAsync(userId);
            var displayName = userId;

            var summary = BuildSummary(userId, displayName, from, to, totalHours, setting);

            var logoPath = GetLogoPath();
            var pdfBytes = GenerateSalarySlipPdf(summary, logoPath);

            var fileName =
                $"SalarySlip_{(summary.DisplayName ?? summary.UserId)}_{summary.From:yyyyMM}.pdf";

            AddAudit(
                action: "Payroll.Slip.Generate",
                entityType: "Payroll",
                entityId: userId,
                details: new { from, to, summary });

            await _db.SaveChangesAsync();

            return File(pdfBytes, "application/pdf", fileName);
        }

        // ---------- PDF generator ----------

        private static byte[] GenerateSalarySlipPdf(
            PayrollSummaryDto summary,
            string logoPath)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            var bytes = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(30);
                    page.Size(PageSizes.A4);
                    page.PageColor(Colors.White);

                    page.Header().Element(header =>
                    {
                        header.Row(row =>
                        {
                            if (!string.IsNullOrEmpty(logoPath) && System.IO.File.Exists(logoPath))
                            {
                                row.ConstantItem(80).Image(logoPath);
                            }

                            row.RelativeItem().Column(col =>
                            {
                                col.Item().Text("Mahima Ministry")
                                    .FontSize(18).Bold();

                                col.Item().Text("Restoration • Healing • Mission")
                                    .FontSize(10).FontColor(Colors.Grey.Darken2);

                                col.Item().Text(
                                        $"Salary Slip ({summary.From:dd MMM yyyy} - {summary.To:dd MMM yyyy})")
                                    .FontSize(12).Bold();
                            });
                        });
                    });

                    page.Content().PaddingVertical(10).Column(col =>
                    {
                        col.Spacing(8);

                        col.Item().BorderBottom(1).BorderColor(Colors.Grey.Lighten2)
                            .PaddingBottom(5)
                            .Row(row =>
                            {
                                row.RelativeItem().Column(c =>
                                {
                                    c.Item().Text("Staff Details").Bold();
                                    c.Item().Text($"Name / Id: {summary.DisplayName ?? summary.UserId}");
                                    c.Item().Text(
                                        $"Period: {summary.From:dd MMM yyyy} - {summary.To:dd MMM yyyy}");
                                });

                                row.RelativeItem().Column(c =>
                                {
                                    c.Item().Text("Payroll Summary").Bold();
                                    c.Item().Text($"Total Hours: {summary.TotalHours:N2}");
                                    c.Item().Text($"Hourly Rate: ₹ {summary.HourlyRate:N2}");
                                });
                            });

                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(3);
                                columns.RelativeColumn(1);
                                columns.RelativeColumn(1);
                            });

                            table.Header(header =>
                            {
                                header.Cell().Element(CellHeader).Text("Component");
                                header.Cell().Element(CellHeader).AlignRight().Text("Amount (₹)");
                                header.Cell().Element(CellHeader).AlignRight().Text("Type");

                                static IContainer CellHeader(IContainer container) =>
                                    container.DefaultTextStyle(x => x.SemiBold())
                                             .Padding(4)
                                             .Background(Colors.Grey.Lighten3);
                            });

                            void AddRow(string label, decimal amount, string type)
                            {
                                if (amount == 0) return;

                                table.Cell().Element(CellBody).Text(label);
                                table.Cell().Element(CellBody).AlignRight().Text($"{amount:N2}");
                                table.Cell().Element(CellBody).AlignRight().Text(type);
                            }

                            static IContainer CellBody(IContainer container) =>
                                container.Padding(4).BorderBottom(1).BorderColor(Colors.Grey.Lighten4);

                            AddRow("Fixed Monthly Amount", summary.FixedAmount, "Earning");
                            AddRow("Hourly Compensation", summary.HourlyAmount, "Earning");
                            AddRow("Allowances", summary.Allowances, "Earning");
                            AddRow("Deductions (Fines + Advances)", summary.Deductions, "Deduction");

                            table.Cell().Element(c =>
                                    c.Padding(4)
                                     .Background(Colors.Grey.Lighten3)
                                     .DefaultTextStyle(t => t.SemiBold()))
                                .Text("Net Pay");

                            table.Cell().Element(c =>
                                    c.Padding(4)
                                     .Background(Colors.Grey.Lighten3)
                                     .AlignRight())
                                .Text($"₹ {summary.NetAmount:N2}");

                            table.Cell().Element(c =>
                                    c.Padding(4)
                                     .Background(Colors.Grey.Lighten3)
                                     .AlignRight())
                                .Text(string.Empty);
                        });

                        col.Item().PaddingTop(15)
                            .Text(
                                "This is a system generated salary slip and does not require a physical signature.")
                            .FontSize(9)
                            .FontColor(Colors.Grey.Darken2);
                    });

                    page.Footer().AlignCenter().Text(txt =>
                    {
                        txt.Span("Mahima Ministry • Generated on ");
                        txt.Span(DateTime.UtcNow.ToString("dd MMM yyyy")).SemiBold();
                    });
                });
            }).GeneratePdf();

            return bytes;
        }
    }

    // ---------- DTOs ----------

    public class PayrollSummaryDto
    {
        public string UserId { get; set; } = default!;
        public string? DisplayName { get; set; }

        public DateTime From { get; set; }
        public DateTime To { get; set; }

        public decimal TotalHours { get; set; }
        public decimal HourlyRate { get; set; }

        public decimal FixedAmount { get; set; }
        public decimal HourlyAmount { get; set; }

        public decimal Allowances { get; set; }
        public decimal Deductions { get; set; }

        public decimal GrossAmount { get; set; }
        public decimal NetAmount { get; set; }
    }

    public class PayrollRunRequest
    {
        public string UserId { get; set; } = default!;
        public string? DisplayName { get; set; }

        public DateTime From { get; set; }
        public DateTime To { get; set; }

        public decimal TotalHours { get; set; }
        public decimal HourlyRate { get; set; }

        public decimal FixedAmount { get; set; }
        public decimal HourlyAmount { get; set; }

        public decimal Allowances { get; set; }
        public decimal Deductions { get; set; }

        public decimal GrossAmount { get; set; }
        public decimal NetAmount { get; set; }
    }

    public class PayrollRunDto : PayrollRunRequest
    {
        public Guid Id { get; set; }
    }
}
