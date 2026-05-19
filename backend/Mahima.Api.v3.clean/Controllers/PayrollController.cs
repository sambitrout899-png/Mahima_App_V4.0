using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Mahima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PayrollController : ControllerBase
    {
        private readonly MahimaDbContext _db;
        private readonly IWebHostEnvironment _env;

        // QuestPDF's bundled Lato font does not include the rupee glyph (U+20B9),
        // which causes the generated PDF to be unreadable in some viewers
        // (e.g. Adobe Reader: "An error occurred"). "Rs." is universally
        // compatible. If you register a font that supports U+20B9 in Program.cs
        // via FontManager.RegisterFont(...), you can swap this back to the glyph.
        private const string RUPEE = "Rs.";

        public PayrollController(MahimaDbContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
        }

        // ---------- helpers ----------------------------------------------
        private string? GetActorIdString() =>
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirst("sub")?.Value;

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

            var simple = User.FindFirst("role")?.Value?.ToLowerInvariant();
            return simple == "admin" || simple == "administrator";
        }

        private void AddAudit(string action, string entityType, string entityId, object? details)
        {
            _db.AuditLogs.Add(new AuditLog
            {
                Action     = action,
                EntityType = entityType,
                EntityId   = entityId,
                Details    = details != null ? JsonSerializer.Serialize(details) : null,
                CreatedAt  = DateTime.UtcNow
            });
        }

        private IQueryable<Timesheet> FilterTimesheets(string userId, DateTime from, DateTime to)
        {
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

        // Resolve a friendly display name from the Users table (best-effort).
        // Users.Id is a Guid in this project, so we parse the string first.
        private async Task<string> ResolveDisplayNameAsync(string userId)
        {
            try
            {
                if (!Guid.TryParse(userId, out var userGuid))
                    return userId;

                var user = await _db.Users
                                    .AsNoTracking()
                                    .FirstOrDefaultAsync(u => u.Id == userGuid);
                if (user == null) return userId;

                // Common name fields — fall through whichever is populated.
                return
                    NotBlank(user.DisplayName) ??
                    NotBlank(user.Username) ??
                    NotBlank(user.Email) ??
                    userId;
            }
            catch
            {
                // If the Users table doesn't exist or schema differs, just
                // return the id so the slip still renders.
                return userId;
            }

            static string? NotBlank(string? s) =>
                string.IsNullOrWhiteSpace(s) ? null : s;
        }

        /// <summary>
        /// CORRECT formula:
        ///   Gross = FixedAmount + (Hours × Rate) + Allowances
        ///   Net   = max(0, Gross - Deductions)
        /// </summary>
        private static PayrollSummaryDto BuildSummary(
            string userId,
            string? displayName,
            DateTime from,
            DateTime to,
            decimal totalHours,
            StaffPayrollSetting? setting)
        {
            var hourlyRate  = setting?.HourlyRate ?? 0m;
            var fixedAmount = setting?.MonthlyFixedAmount ?? 0m;
            var allowances  = setting?.Allowances ?? 0m;
            var deductions  = setting?.Deductions ?? 0m;

            var hoursAmount = totalHours * hourlyRate;
            var gross       = fixedAmount + hoursAmount + allowances;
            var net         = Math.Max(0m, gross - deductions);

            return new PayrollSummaryDto
            {
                UserId       = userId,
                DisplayName  = displayName,
                From         = from.Date,
                To           = to.Date,
                TotalHours   = totalHours,
                HourlyRate   = hourlyRate,
                FixedAmount  = fixedAmount,
                HourlyAmount = hoursAmount,
                Allowances   = allowances,
                Deductions   = deductions,
                GrossAmount  = gross,
                NetAmount    = net
            };
        }

        private static PayrollRunDto ToRunDto(PayrollRun run, string? displayName = null) => new PayrollRunDto
        {
            Id           = run.Id,
            UserId       = run.UserId,
            DisplayName  = displayName,
            From         = run.From,
            To           = run.To,
            TotalHours   = run.TotalHours,
            HourlyRate   = run.HourlyRate,
            FixedAmount  = run.FixedAmount,
            HourlyAmount = run.TotalHours * run.HourlyRate,
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

        // ---------- SETTINGS ---------------------------------------------
        [AllowAnonymous]
        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings()
        {
            var list = await _db.StaffPayrollSettings
                                .OrderBy(x => x.UserId)
                                .ToListAsync();
            return Ok(list);
        }

        [AllowAnonymous]
        [HttpPost("settings")]
        public async Task<IActionResult> UpsertSetting([FromBody] StaffPayrollSetting dto)
        {
            if (string.IsNullOrWhiteSpace(dto.UserId))
                return BadRequest("UserId is required.");

            if (dto.HourlyRate < 0 || dto.MonthlyFixedAmount < 0 ||
                dto.Allowances < 0 || dto.Deductions < 0)
                return BadRequest("Amounts cannot be negative.");

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

        // ---------- SUMMARY ----------------------------------------------
        [AllowAnonymous]
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary(
            [FromQuery] string? userId,
            [FromQuery] DateTime from,
            [FromQuery] DateTime to)
        {
            if (from == default || to == default || from > to)
                return BadRequest("Valid 'from' and 'to' dates are required.");
            if (string.IsNullOrWhiteSpace(userId))
                return BadRequest("userId is required.");

            var timesheets = await FilterTimesheets(userId, from, to).ToListAsync();
            var totalHours = timesheets.Sum(t => t.Hours);

            var setting     = await GetPayrollSettingAsync(userId);
            var displayName = await ResolveDisplayNameAsync(userId);
            var summary     = BuildSummary(userId, displayName, from, to, totalHours, setting);

            AddAudit("Payroll.Summary", "Payroll", userId, new { from, to, summary });
            await _db.SaveChangesAsync();
            return Ok(summary);
        }

        // ---------- RUNS -------------------------------------------------
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

            // Resolve names in one query. Users.Id is a Guid, so we parse the
            // string ids first and discard any that don't parse.
            var idGuids = runs
                .Select(r => r.UserId)
                .Distinct()
                .Select(s => Guid.TryParse(s, out var g) ? (Guid?)g : null)
                .Where(g => g.HasValue)
                .Select(g => g!.Value)
                .ToList();

            Dictionary<string, string?> nameMap;
            try
            {
                nameMap = await _db.Users
                    .AsNoTracking()
                    .Where(u => idGuids.Contains(u.Id))
                    .ToDictionaryAsync(
                        u => u.Id.ToString(),
                        u => (string?)(NotBlank(u.DisplayName) ?? NotBlank(u.Username) ?? NotBlank(u.Email))
                    );
            }
            catch
            {
                nameMap = new Dictionary<string, string?>();
            }

            var dtos = runs.Select(r =>
                ToRunDto(r, nameMap.TryGetValue(r.UserId, out var n) ? n : null)
            ).ToList();

            return Ok(dtos);

            static string? NotBlank(string? s) => string.IsNullOrWhiteSpace(s) ? null : s;
        }

        [AllowAnonymous]
        [HttpPost("~/api/payroll/runs")]
        public async Task<IActionResult> CreateRun([FromBody] PayrollRunRequest dto)
        {
            if (dto == null) return BadRequest("Body is required.");
            if (dto.From == default || dto.To == default || dto.From > dto.To)
                return BadRequest("Valid 'from' and 'to' dates are required.");
            if (string.IsNullOrWhiteSpace(dto.UserId))
                return BadRequest("userId is required.");

            // Reject silly numbers
            if (dto.TotalHours < 0 || dto.HourlyRate < 0 ||
                dto.GrossAmount < 0 || dto.NetAmount < 0)
                return BadRequest("Amounts cannot be negative.");

            var run = new PayrollRun
            {
                UserId      = dto.UserId,
                From        = DateTime.SpecifyKind(dto.From.Date, DateTimeKind.Utc),
                To          = DateTime.SpecifyKind(dto.To.Date,   DateTimeKind.Utc),
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

            var displayName = await ResolveDisplayNameAsync(run.UserId);
            return Ok(ToRunDto(run, displayName));
        }

        [AllowAnonymous]
        [HttpDelete("~/api/payroll/runs/{id:guid}")]
        public async Task<IActionResult> DeleteRun(Guid id)
        {
            var run = await _db.PayrollRuns.FindAsync(id);
            if (run == null) return NotFound();

            _db.PayrollRuns.Remove(run);
            AddAudit("Payroll.Run.Delete", "PayrollRun", run.Id.ToString(),
                new { run.UserId, run.From, run.To });
            await _db.SaveChangesAsync();
            return NoContent();
        }

        [AllowAnonymous]
        [HttpGet("~/api/payroll/runs/{id:guid}/slip")]
        public async Task<IActionResult> GetRunSlip(Guid id)
        {
            var run = await _db.PayrollRuns.FindAsync(id);
            if (run == null) return NotFound();

            var displayName = await ResolveDisplayNameAsync(run.UserId);

            var summary = new PayrollSummaryDto
            {
                UserId       = run.UserId,
                DisplayName  = displayName,
                From         = run.From,
                To           = run.To,
                TotalHours   = run.TotalHours,
                HourlyRate   = run.HourlyRate,
                FixedAmount  = run.FixedAmount,
                HourlyAmount = run.TotalHours * run.HourlyRate,
                Allowances   = run.Allowances,
                Deductions   = run.Deductions,
                GrossAmount  = run.GrossAmount,
                NetAmount    = run.NetAmount
            };

            var pdfBytes = GenerateSalarySlipPdf(summary, GetLogoPath());
            var fileName = SafeFileName($"SalarySlip_{summary.DisplayName ?? summary.UserId}_{summary.From:yyyyMM}.pdf");

            AddAudit("Payroll.Run.Slip", "PayrollRun", run.Id.ToString(), summary);
            await _db.SaveChangesAsync();
            return File(pdfBytes, "application/pdf", fileName);
        }

        // ---------- LEGACY SLIP BY PERIOD --------------------------------
        [AllowAnonymous]
        [HttpGet("slip")]
        public async Task<IActionResult> GetSalarySlipPdf(
            [FromQuery] string? userId,
            [FromQuery] DateTime from,
            [FromQuery] DateTime to)
        {
            if (from == default || to == default || from > to)
                return BadRequest("Valid 'from' and 'to' dates are required.");
            if (string.IsNullOrWhiteSpace(userId))
                return BadRequest("userId is required.");

            var timesheets = await FilterTimesheets(userId, from, to)
                                   .OrderBy(t => t.Date)
                                   .ToListAsync();
            var totalHours  = timesheets.Sum(t => t.Hours);
            var setting     = await GetPayrollSettingAsync(userId);
            var displayName = await ResolveDisplayNameAsync(userId);

            var summary  = BuildSummary(userId, displayName, from, to, totalHours, setting);
            var pdfBytes = GenerateSalarySlipPdf(summary, GetLogoPath());
            var fileName = SafeFileName($"SalarySlip_{summary.DisplayName ?? summary.UserId}_{summary.From:yyyyMM}.pdf");

            AddAudit("Payroll.Slip.Generate", "Payroll", userId, new { from, to, summary });
            await _db.SaveChangesAsync();
            return File(pdfBytes, "application/pdf", fileName);
        }

        private static string SafeFileName(string name)
        {
            foreach (var c in System.IO.Path.GetInvalidFileNameChars())
                name = name.Replace(c, '_');
            return name;
        }

        // ---------- PDF GENERATOR ----------------------------------------
        // Minimal QuestPDF usage. Only basic Text in a Column. No images,
        // no backgrounds, no borders, no tables, no rows. If even THIS
        // doesn't open, the problem is outside QuestPDF (build not
        // redeployed, content-type wrong, exception before bytes return,
        // etc.). The try/catch returns a tiny "error" PDF so we always
        // produce valid bytes.
        private static byte[] GenerateSalarySlipPdf(PayrollSummaryDto s, string logoPath)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            var inr = CultureInfo.GetCultureInfo("en-IN");
            string Money(decimal v) => $"{RUPEE} {v.ToString("N2", inr)}";

            try
            {
                return Document.Create(doc =>
                {
                    doc.Page(page =>
                    {
                        page.Size(PageSizes.A4);
                        page.Margin(40);
                        page.DefaultTextStyle(t => t.FontSize(11));

                        page.Content().Column(col =>
                        {
                            col.Spacing(8);

                            col.Item().Text("Mahima Ministry").FontSize(20).Bold();
                            col.Item().Text("Salary Slip").FontSize(13).SemiBold();
                            col.Item().Text($"Period: {s.From:dd MMM yyyy} to {s.To:dd MMM yyyy}");

                            col.Item().PaddingTop(10).Text("Employee").Bold();
                            col.Item().Text($"Name: {s.DisplayName ?? s.UserId}");
                            col.Item().Text($"ID:   {s.UserId}");

                            col.Item().PaddingTop(10).Text("Earnings").Bold();
                            col.Item().Text($"Fixed monthly:        {Money(s.FixedAmount)}");
                            col.Item().Text($"Daily compensation:   {Money(s.HourlyAmount)} ({s.TotalHours:N0} days x {Money(s.HourlyRate)})");
                            col.Item().Text($"Allowances:           {Money(s.Allowances)}");
                            col.Item().Text($"Gross:                {Money(s.GrossAmount)}").Bold();

                            col.Item().PaddingTop(10).Text("Deductions").Bold();
                            col.Item().Text($"Fines + advances:     {Money(s.Deductions)}");

                            col.Item().PaddingTop(14).Text($"NET PAY: {Money(s.NetAmount)}").FontSize(16).Bold();
                            col.Item().Text($"In words: {NumberToWordsIndian((long)Math.Round(s.NetAmount, 0))} rupees only");

                            col.Item().PaddingTop(20).Text("This is a system-generated payslip.").FontSize(9);
                            col.Item().Text($"Generated on {DateTime.UtcNow:dd MMM yyyy HH:mm} UTC").FontSize(9);
                        });
                    });
                }).GeneratePdf();
            }
            catch (Exception ex)
            {
                return Document.Create(doc =>
                {
                    doc.Page(page =>
                    {
                        page.Size(PageSizes.A4);
                        page.Margin(40);
                        page.Content().Column(col =>
                        {
                            col.Item().Text("Salary slip could not be generated").FontSize(16).Bold();
                            col.Item().PaddingTop(8).Text(ex.GetType().FullName ?? "Exception").Bold();
                            col.Item().PaddingTop(2).Text(ex.Message ?? "");
                            col.Item().PaddingTop(20).Text("Stack trace:").Bold().FontSize(9);
                            col.Item().Text(ex.ToString()).FontSize(7);
                        });
                    });
                }).GeneratePdf();
            }
        }

        // -----------------------------------------------------------------
        //  Indian numbering "amount in words" — handles up to crores.
        //  Returns capitalized phrase, e.g. "Twelve thousand three hundred".
        // -----------------------------------------------------------------
        private static string NumberToWordsIndian(long n)
        {
            if (n == 0) return "Zero";
            if (n < 0) return "Minus " + NumberToWordsIndian(-n);

            string[] ones =
            {
                "", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
                "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
                "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
            };
            string[] tens =
            {
                "", "", "Twenty", "Thirty", "Forty", "Fifty",
                "Sixty", "Seventy", "Eighty", "Ninety"
            };

            string TwoDigits(long x) =>
                x < 20 ? ones[x] : tens[x / 10] + (x % 10 != 0 ? " " + ones[x % 10] : "");

            string ThreeDigits(long x)
            {
                var sb = new StringBuilder();
                if (x >= 100)
                {
                    sb.Append(ones[x / 100]).Append(" Hundred");
                    x %= 100;
                    if (x != 0) sb.Append(' ');
                }
                if (x > 0) sb.Append(TwoDigits(x));
                return sb.ToString();
            }

            var parts = new StringBuilder();
            long crore = n / 10000000; n %= 10000000;
            long lakh  = n / 100000;   n %= 100000;
            long thou  = n / 1000;     n %= 1000;
            long rest  = n;

            if (crore > 0) parts.Append(ThreeDigits(crore)).Append(" Crore ");
            if (lakh  > 0) parts.Append(TwoDigits(lakh)).Append(" Lakh ");
            if (thou  > 0) parts.Append(TwoDigits(thou)).Append(" Thousand ");
            if (rest  > 0) parts.Append(ThreeDigits(rest));

            return parts.ToString().Trim();
        }
    }

    // ---------- DTOs -----------------------------------------------------
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