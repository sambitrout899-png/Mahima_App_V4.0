using Mahima.Api.v3.clean.Data;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Mahima.Api.v3.clean;
using Mahima.Api.v3.clean.Models;
using Mahima.Api.v3.clean.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Mahima.Api.v3.clean.Controllers
{
    public class BaptismRequestCreateDto
    {
        public string FullName { get; set; } = string.Empty;
        public string? FatherName { get; set; }
        public string? MotherName { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? ContactNumber { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public DateTime? PreferredDate { get; set; }
        public string? PreferredService { get; set; }
    }

    public class BaptismRequestListItemDto
    {
        public int Id { get; set; }
        public string? Token { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? FatherName { get; set; }
        public string? MotherName { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? ContactNumber { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public DateTime? PreferredDate { get; set; }
        public string? PreferredService { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool ChurchVerified { get; set; }
        public bool ConsentSigned { get; set; }
        public string? CertificatePdfUrl { get; set; }
        public DateTime? BaptismDate { get; set; }
        public string? BaptismPlace { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class BaptismRequestDetailDto : BaptismRequestListItemDto
    {
        public DateTime? ChurchVerifiedAt { get; set; }
        public DateTime? ConsentSignedAt { get; set; }
    }

    // (Currently unused, but kept for future if you want to set date/place on complete)
    public class BaptismCompleteDto
    {
        public DateTime? BaptismDate { get; set; }
        public string? BaptismPlace { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class BaptismsController : ControllerBase
    {
        private readonly MahimaDbContext _db;
        private readonly IBaptismCertificateService _certificateService;

        public BaptismsController(MahimaDbContext db, IBaptismCertificateService certificateService)
        {
            _db = db;
            _certificateService = certificateService;
        }

        // ---------- helpers ----------

        private static DateTime ToUtc(DateTime dt)
        {
            return dt.Kind switch
            {
                DateTimeKind.Utc => dt,
                DateTimeKind.Local => dt.ToUniversalTime(),
                DateTimeKind.Unspecified => DateTime.SpecifyKind(dt, DateTimeKind.Utc),
                _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc)
            };
        }

        private static DateTime? ToUtc(DateTime? dt)
        {
            return dt.HasValue ? ToUtc(dt.Value) : null;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.Claims.FirstOrDefault(c => c.Type == "sub" || c.Type == "userId");
            if (claim == null) return null;
            return int.TryParse(claim.Value, out var id) ? id : (int?)null;
        }

        private static BaptismRequestListItemDto ToListItem(BaptismRequest e) =>
            new()
            {
                Id = e.Id,
                Token = e.Token,
                FullName = e.FullName,
                FatherName = e.FatherName,
                MotherName = e.MotherName,
                DateOfBirth = e.DateOfBirth,
                ContactNumber = e.ContactNumber,
                Email = e.Email,
                Address = e.Address,
                PreferredDate = e.PreferredDate,
                PreferredService = e.PreferredService,
                Status = e.Status,
                ChurchVerified = e.ChurchVerified,
                ConsentSigned = e.ConsentSigned,
                CertificatePdfUrl = e.CertificatePdfUrl,
                BaptismDate = e.BaptismDate,
                BaptismPlace = e.BaptismPlace,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt
            };

        private static BaptismRequestDetailDto ToDetail(BaptismRequest e) =>
            new()
            {
                Id = e.Id,
                Token = e.Token,
                FullName = e.FullName,
                ContactNumber = e.ContactNumber,
                Status = e.Status,
                ChurchVerified = e.ChurchVerified,
                ConsentSigned = e.ConsentSigned,
                CertificatePdfUrl = e.CertificatePdfUrl,
                FatherName = e.FatherName,
                MotherName = e.MotherName,
                DateOfBirth = e.DateOfBirth,
                Email = e.Email,
                Address = e.Address,
                PreferredDate = e.PreferredDate,
                PreferredService = e.PreferredService,
                BaptismDate = e.BaptismDate,
                BaptismPlace = e.BaptismPlace,
                ChurchVerifiedAt = e.ChurchVerifiedAt,
                ConsentSignedAt = e.ConsentSignedAt
            };

        private static IReadOnlyList<string> NormalizeStatusAliases(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return Array.Empty<string>();

            var key = status.Trim().Replace(" ", "", StringComparison.Ordinal).Replace("-", "", StringComparison.Ordinal).ToLowerInvariant();
            return key switch
            {
                "all" or "any" => Array.Empty<string>(),
                "pending" or "new" => new[] { "Pending", "New" },
                "churchverified" or "verified" => new[] { "ChurchVerified", "Verified" },
                "awaitingverification" or "awaitingchurchverification" => new[] { "AwaitingChurchVerification", "AwaitingVerification" },
                "readyfortoken" => new[] { "ReadyForToken" },
                "tokengenerated" or "tokenissued" => new[] { "TokenGenerated", "TokenIssued" },
                "completed" or "complete" => new[] { "Completed", "Closed" },
                _ => new[] { status.Trim() }
            };
        }

        // ---------- endpoints ----------

        // GET /api/baptisms?status=Pending
        [HttpGet]
        public async Task<ActionResult> GetList([FromQuery] string? status = null)
        {
            var query = _db.BaptismRequests.AsNoTracking().AsQueryable();
            var statusAliases = NormalizeStatusAliases(status);

            if (statusAliases.Count > 0)
                query = query.Where(b => statusAliases.Contains(b.Status));

            var list = await query
                .OrderByDescending(b => b.CreatedAt)
                .Select(b => ToListItem(b))
                .ToListAsync();

            return Ok(list);
        }

        // GET /api/baptisms/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult> GetById(int id)
        {
            var entity = await _db.BaptismRequests.FindAsync(id);
            if (entity == null) return NotFound();

            return Ok(ToDetail(entity));
        }

        // POST /api/baptisms
        [HttpPost]
        public async Task<ActionResult> Create([FromBody] BaptismRequestCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var nowUtc = DateTime.UtcNow;

            var entity = new BaptismRequest
            {
                FullName = dto.FullName,
                FatherName = dto.FatherName,
                MotherName = dto.MotherName,
                DateOfBirth = ToUtc(dto.DateOfBirth),
                ContactNumber = dto.ContactNumber,
                Email = dto.Email,
                Address = dto.Address,
                PreferredDate = ToUtc(dto.PreferredDate),
                PreferredService = dto.PreferredService,
                Status = "Pending",
                ChurchVerified = false,
                ConsentSigned = false,
                CreatedAt = nowUtc,
                UpdatedAt = nowUtc
            };

            _db.BaptismRequests.Add(entity);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, ToDetail(entity));
        }

        // POST /api/baptisms/{id}/verify-church
        [HttpPost("{id:int}/verify-church")]
        public async Task<ActionResult> VerifyChurch(int id)
        {
            var entity = await _db.BaptismRequests.FindAsync(id);
            if (entity == null) return NotFound();

            var nowUtc = DateTime.UtcNow;
            var userId = GetCurrentUserId();

            entity.ChurchVerified = true;
            entity.ChurchVerifiedAt = nowUtc;
            entity.ChurchVerifiedBy = userId;
            entity.UpdatedAt = nowUtc;

            entity.Status = entity.ConsentSigned ? "ReadyForToken" : "ChurchVerified";

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // POST /api/baptisms/{id}/sign-consent
        [HttpPost("{id:int}/sign-consent")]
        [AllowAnonymous]
        public async Task<ActionResult> SignConsent(int id)
        {
            var entity = await _db.BaptismRequests.FindAsync(id);
            if (entity == null) return NotFound();

            var nowUtc = DateTime.UtcNow;

            entity.ConsentSigned = true;
            entity.ConsentSignedAt = nowUtc;
            entity.UpdatedAt = nowUtc;

            entity.Status = entity.ChurchVerified ? "ReadyForToken" : "AwaitingChurchVerification";

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // POST /api/baptisms/{id}/generate-token
        [HttpPost("{id:int}/generate-token")]
        public async Task<ActionResult> GenerateToken(int id)
        {
            var entity = await _db.BaptismRequests.FindAsync(id);
            if (entity == null) return NotFound();

            if (!entity.ChurchVerified || !entity.ConsentSigned)
                return BadRequest("Church verification and consent must be completed before token generation.");

            if (string.IsNullOrWhiteSpace(entity.Token))
            {
                entity.Token = await GenerateBaptismTokenAsync();
            }

            // Normalize any dates we touch to UTC
            entity.PreferredDate = ToUtc(entity.PreferredDate);

            if (!entity.BaptismDate.HasValue)
            {
                var effectiveDate = entity.PreferredDate ?? DateTime.UtcNow;
                entity.BaptismDate = ToUtc(effectiveDate);
            }
            else
            {
                entity.BaptismDate = ToUtc(entity.BaptismDate);
            }

            if (string.IsNullOrWhiteSpace(entity.BaptismPlace))
                entity.BaptismPlace = "Mahima Ministry";

            // Generate and store certificate
            var pdfUrl = await _certificateService.GenerateCertificateAsync(entity);
            entity.CertificatePdfUrl = pdfUrl; // usually "/certificates/baptisms/<file>.pdf"

            entity.Status = "TokenGenerated";
            entity.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(ToDetail(entity));
        }

        // PUT /api/baptisms/{id}/complete   (close the workflow)
        [HttpPut("{id:int}/complete")]
        public async Task<ActionResult> MarkCompleted(int id)
        {
            var entity = await _db.BaptismRequests.FindAsync(id);
            if (entity == null) return NotFound();

            // optional guard: only allow if token already generated
            if (entity.Status != "TokenGenerated" && entity.Status != "Completed")
            {
                return BadRequest("Only baptisms with generated tokens can be completed.");
            }

            entity.Status = "Completed";
            entity.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // GET /api/baptisms/{id}/certificate  (serve PDF by streaming the file)
        [HttpGet("{id:int}/certificate")]
        [AllowAnonymous]
        public async Task<IActionResult> DownloadCertificate(int id)
        {
            var entity = await _db.BaptismRequests.FindAsync(id);
            if (entity == null)
                return NotFound("Baptism request not found.");

            // Base folder: <project>/wwwroot/certificates/baptisms
            var baseDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var certDir = Path.Combine(baseDir, "certificates", "baptisms");

            if (!Directory.Exists(certDir))
                return Content("Certificate directory not found.");

            string? physicalPath = null;

            // 1) Try to use the path stored in the DB (CertificatePdfUrl)
            if (!string.IsNullOrWhiteSpace(entity.CertificatePdfUrl))
            {
                var certPath = entity.CertificatePdfUrl.Trim();

                if (Path.IsPathRooted(certPath))
                {
                    // e.g. "C:\Projects\...\BaptismCertificate_2_....pdf"
                    physicalPath = certPath;
                }
                else
                {
                    // e.g. "/certificates/baptisms/BaptismCertificate_2_....pdf"
                    // or "certificates/baptisms/..." or just "BaptismCertificate_2_....pdf"
                    var fileName = Path.GetFileName(certPath);
                    physicalPath = Path.Combine(certDir, fileName);
                }
            }

            // 2) If that file doesn’t exist, fall back to pattern search
            if (string.IsNullOrEmpty(physicalPath) || !System.IO.File.Exists(physicalPath))
            {
                var pattern = $"BaptismCertificate_{id}_*.pdf";
                var matches = Directory.GetFiles(certDir, pattern, SearchOption.TopDirectoryOnly);

                if (matches.Length == 0)
                    return Content("Certificate PDF file could not be found on the server.");

                physicalPath = matches[0];
            }

            // 3) Stream the PDF back
            var bytes = await System.IO.File.ReadAllBytesAsync(physicalPath);
            var downloadName = Path.GetFileName(physicalPath);
            return File(bytes, "application/pdf", downloadName);
        }

        private async Task<string> GenerateBaptismTokenAsync()
        {
            var year = DateTime.UtcNow.Year;
            var prefix = $"BAP-{year}-";

            var countThisYear = await _db.BaptismRequests
                .Where(b => b.Token != null && b.Token.StartsWith(prefix))
                .CountAsync();

            var next = countThisYear + 1;
            var seq = next.ToString("D4");

            return $"{prefix}{seq}";
        }
    }
}
