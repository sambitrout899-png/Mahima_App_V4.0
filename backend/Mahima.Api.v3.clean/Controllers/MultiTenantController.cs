using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net;
using System.Data;
using System.IO;
using System.Collections.Generic;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Dtos;
using Mahima.Api.v3.clean.Helpers;
using Mahima.Api.v3.clean.Hubs;
using Mahima.Api.v3.clean.Models;
using Mahima.Api.v3.clean.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using NpgsqlTypes;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    public class MultiTenantController : ControllerBase
    {
        private readonly MahimaDbContext _db;
        private readonly ITenantContextService _tenantContext;
        private readonly ILicensingService _licensing;
        private readonly IConfiguration _config;
        private readonly IWebHostEnvironment _env;
        private readonly IEmailService _email;
        private readonly IChatService _chat;
        private readonly IHubContext<ChatHub> _hub;
        private readonly IMobilePushNotificationService? _mobilePush;
        private readonly ILogger<MultiTenantController> _logger;

        public MultiTenantController(
            MahimaDbContext db,
            ITenantContextService tenantContext,
            ILicensingService licensing,
            IConfiguration config,
            IWebHostEnvironment env,
            IEmailService email,
            IChatService chat,
            IHubContext<ChatHub> hub,
            IEnumerable<IMobilePushNotificationService> mobilePushServices,
            ILogger<MultiTenantController> logger)
        {
            _db = db;
            _tenantContext = tenantContext;
            _licensing = licensing;
            _config = config;
            _env = env;
            _email = email;
            _chat = chat;
            _hub = hub;
            _mobilePush = mobilePushServices?.FirstOrDefault();
            _logger = logger;
        }

        private async Task<bool> CurrentTenantIsRootAsync(CancellationToken ct)
        {
            var tenantIdText = User.FindFirstValue("tenant_id");
            if (Guid.TryParse(tenantIdText, out var tenantId))
            {
                return await _db.Tenants
                    .AsNoTracking()
                    .Where(t => t.Id == tenantId)
                    .Select(t => t.IsRootTenant)
                    .FirstOrDefaultAsync(ct);
            }

            var tenant = await _tenantContext.GetCurrentTenantAsync(ct);
            return tenant?.IsRootTenant == true;
        }

        public record CreateTenantRequest(
            string Name,
            string? Slug,
            string? Domain,
            string? ContactName,
            string? ContactEmail,
            string? ContactPhone,
            string? UserCodePrefix,
            string? AdminUsername,
            string? AdminDisplayName,
            string? AdminEmail,
            string? AdminPhone,
            string? AdminPassword);
        public record UpsertModuleRequest(string Code, string Name, string? Description, decimal MonthlyPriceInr, bool IsBaseModule, bool Enabled, int DisplayOrder);
        public record ActivateModuleRequest(
            decimal? PriceInr,
            string? Source,
            DateTime? EndsAtUtc,
            string? ReceiptNumber,
            string? Note,
            string? ApprovedBy);
        public record RevokeModuleRequest(string? Note, string? ApprovedBy);
        public record UpdateTenantStatusRequest(string Status, string? Reason, string? ApprovedBy);
        public record ResetTenantAdminPasswordRequest(string Password, string? Note, string? ApprovedBy);
        public record CreateTenantAdminUserRequest(
            string Username,
            string? DisplayName,
            string? Email,
            string? Phone,
            string Password,
            string? Note,
            string? ApprovedBy);
        public record UpdateTenantProfileRequest(
            string? Name,
            string? Slug,
            string? Domain,
            string? ContactName,
            string? ContactEmail,
            string? ContactPhone,
            string? UserCodePrefix,
            IFormFile? Logo);
        public record LandingConfigRequest(
            string? LogoUrl,
            string? HeroImageUrl,
            string HeroTitle,
            string? HeroSubtitle,
            string? PrimaryColor,
            string? AccentColor,
            string? ContactEmail,
            string? ContactPhone,
            string? Address,
            JsonElement? ServiceTimes,
            JsonElement? SocialLinks,
            JsonElement? Sections,
            bool Published);
        public record CreatePaymentIntentRequest(string? Provider, string? UpiVpa, string? UpiPayeeName);
        public record SubmitDonationDetailsRequest(
            string? UpiTransactionNumber,
            string? PayerName,
            string? PayerPhone,
            string? PayerEmail,
            decimal? AmountInr,
            string? Note);
        public record MarkPaymentPaidRequest(string? ProviderPaymentId, string? PayloadJson);
        public record VerifyModulePaymentRequest(string RazorpayOrderId, string RazorpayPaymentId, string RazorpaySignature);
        public record GenerateInvoicesRequest(string? Month);
        public record ApplyInvoicePaymentRequest(Guid? PaymentIntentId, decimal? AmountInr, string? ProviderPaymentId, string? Note);
        public record ReviewModuleRequest(string? Note, string? ApprovedBy);
        public record PublicRegisterTenantRequest(
            string ChurchName,
            string? Slug,
            string? Domain,
            string? ContactName,
            string? ContactEmail,
            string? ContactPhone,
            string? AdminUsername,
            string? AdminPassword,
            string? UserCodePrefix,
            IFormFile? Logo,
            string? MemberUsername,
            string? MemberPassword);

        [AllowAnonymous]
        [HttpGet("/api/public/tenants/{slug}/landing")]
        public async Task<IActionResult> PublicLanding(string slug, CancellationToken ct)
        {
            var normalized = NormalizeSlug(slug);
            var tenant = await _db.Tenants
                .AsNoTracking()
                .Include(t => t.LandingConfig)
                .FirstOrDefaultAsync(t => t.Slug == normalized && t.Status == "active", ct);
            if (tenant == null || tenant.LandingConfig?.Published == false) return NotFound();

            return Ok(new
            {
                tenant = new { tenant.Id, tenant.Name, tenant.Slug, tenant.Domain },
                landing = ToLandingDto(tenant.LandingConfig)
            });
        }

        [AllowAnonymous]
        [HttpGet("/api/public/modules")]
        public async Task<IActionResult> PublicModules(CancellationToken ct)
        {
            await _licensing.EnsureCatalogSeededAsync(ct);
            var modules = await _db.ModuleCatalog
                .AsNoTracking()
                .Where(m => m.Enabled)
                .OrderBy(m => m.DisplayOrder)
                .Select(m => new
                {
                    m.Code,
                    m.Name,
                    m.Description,
                    m.MonthlyPriceInr,
                    m.IsBaseModule
                })
                .ToListAsync(ct);

            return Ok(new { modules });
        }

        [AllowAnonymous]
        [HttpGet("/api/public/tenant-by-host")]
        public async Task<IActionResult> PublicTenantByHost([FromQuery] string? host, CancellationToken ct)
        {
            var normalizedHost = NormalizeDomain(host ?? Request.Host.Host);
            if (string.IsNullOrWhiteSpace(normalizedHost)) return NotFound();

            var tenant = await _db.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(t =>
                    t.Domain == normalizedHost &&
                    t.Status == "active" &&
                    (t.DomainStatus == "verified" || t.DomainStatus == "active"), ct);
            if (tenant == null) return NotFound();

            return Ok(new
            {
                tenant.Id,
                tenant.Name,
                tenant.Slug,
                tenant.Domain,
                tenant.DomainStatus,
                PublicUrl = BuildTenantPublicUrl(tenant),
                LoginUrl = BuildTenantLoginUrl(tenant)
            });
        }

        [AllowAnonymous]
        [HttpGet("/api/public/domain-check")]
        public async Task<IActionResult> PublicDomainCheck([FromQuery] string? domain, CancellationToken ct)
        {
            var normalizedDomain = NormalizeDomain(domain ?? Request.Query["host"].FirstOrDefault() ?? Request.Host.Host);
            if (string.IsNullOrWhiteSpace(normalizedDomain)) return NotFound();

            var exists = await _db.Tenants
                .AsNoTracking()
                .AnyAsync(t =>
                    t.Domain == normalizedDomain &&
                    t.Status == "active" &&
                    (t.DomainStatus == "verified" || t.DomainStatus == "active"), ct);

            return exists ? Ok(new { allowed = true }) : NotFound(new { allowed = false });
        }

        [AllowAnonymous]
        [HttpPost("/api/public/tenants/register")]
        public async Task<IActionResult> PublicRegisterTenant([FromForm] PublicRegisterTenantRequest dto, CancellationToken ct)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.ChurchName))
                return BadRequest(new { message = "Church name is required." });

            var adminPassword = string.IsNullOrWhiteSpace(dto.AdminPassword) ? "NewPass@123" : dto.AdminPassword.Trim();
            var memberPassword = string.IsNullOrWhiteSpace(dto.MemberPassword) ? "Member@123" : dto.MemberPassword.Trim();
            if (adminPassword.Length < 6 || memberPassword.Length < 6)
                return BadRequest(new { message = "Passwords must be at least 6 characters." });

            await _licensing.EnsureCatalogSeededAsync(ct);
            var slug = NormalizeSlug(string.IsNullOrWhiteSpace(dto.Slug) ? dto.ChurchName : dto.Slug);
            if (await _db.Tenants.AnyAsync(t => t.Slug == slug, ct))
                return Conflict(new { message = "This church URL slug is already taken. Please choose another slug." });
            var requestedDomain = NormalizeDomain(dto.Domain);
            if (!string.IsNullOrWhiteSpace(requestedDomain) &&
                await _db.Tenants.AnyAsync(t => t.Domain == requestedDomain, ct))
                return Conflict(new { message = "This church domain is already configured for another tenant." });
            var userCodePrefix = NormalizeUserCodePrefix(dto.UserCodePrefix, slug);

            var adminUsername = NormalizeUsername(string.IsNullOrWhiteSpace(dto.AdminUsername) ? $"{slug}-admin" : dto.AdminUsername);
            var memberUsername = NormalizeUsername(string.IsNullOrWhiteSpace(dto.MemberUsername) ? $"{slug}-member" : dto.MemberUsername);
            if (adminUsername.Equals(memberUsername, StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Admin username and member username must be different." });

            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync<IActionResult>(async () =>
            {
                await using var tx = await _db.Database.BeginTransactionAsync(ct);
                if (await _db.Tenants.AnyAsync(t => t.Slug == slug, ct))
                    return Conflict(new { message = "This church URL slug is already taken. Please choose another slug." });

                var tenant = new Tenant
                {
                    Name = dto.ChurchName.Trim(),
                    Slug = slug,
                    Domain = requestedDomain,
                    DomainStatus = string.IsNullOrWhiteSpace(requestedDomain) ? "none" : "pending",
                    DomainVerificationToken = string.IsNullOrWhiteSpace(requestedDomain) ? null : NewDomainVerificationToken(),
                    ContactName = NormalizeNullable(dto.ContactName),
                    ContactEmail = NormalizeNullable(dto.ContactEmail),
                    ContactPhone = NormalizeNullable(dto.ContactPhone),
                    UserCodePrefix = userCodePrefix,
                    Status = "active",
                };

                _db.Tenants.Add(tenant);
                await _db.SaveChangesAsync(ct);

                await _licensing.ActivateModuleAsync(tenant.Id, LicensingService.BaseModule, 0, "beta-free", null, ct);

                string? logoUrl;
                try
                {
                    logoUrl = await SaveTenantLogoAsync(dto.Logo, slug, ct);
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest(new { message = ex.Message });
                }
                var landingConfig = new TenantLandingConfig
                {
                    TenantId = tenant.Id,
                    LogoUrl = logoUrl,
                    HeroTitle = tenant.Name,
                    HeroSubtitle = $"Welcome to {tenant.Name}.",
                    PrimaryColor = "#0f766e",
                    AccentColor = "#f59e0b",
                    ContactEmail = tenant.ContactEmail,
                    ContactPhone = tenant.ContactPhone,
                    ServiceTimesJson = JsonSerializer.Serialize(new[]
                    {
                        new { day = "Sunday", title = "Worship Service", time = "10:00 AM", note = "Update from Landing Page." },
                        new { day = "Wednesday", title = "Prayer Meeting", time = "7:00 PM", note = "Update from Landing Page." }
                    }),
                    SocialLinksJson = "[]",
                    SectionsJson = JsonSerializer.Serialize(new object[]
                    {
                        new
                        {
                            type = "feature-grid",
                            eyebrow = "Welcome",
                            title = "Start your church page",
                            subtitle = "Edit this content from the Landing Page module.",
                            items = new[]
                            {
                                new { title = "Prayer", text = "Receive and manage prayer requests." },
                                new { title = "Sermons", text = "Publish sermons for members." },
                                new { title = "Teams", text = "Organize your ministry groups." }
                            }
                        }
                    }),
                    Published = true
                };
                _db.TenantLandingConfigs.Add(landingConfig);
                await _db.SaveChangesAsync(ct);

                var adminUserId = await CreateTenantUserAsync(
                    tenant.Id,
                    adminUsername,
                    NormalizeNullable(dto.ContactName) ?? $"{tenant.Name} Admin",
                    NormalizeNullable(dto.ContactEmail),
                    NormalizeNullable(dto.ContactPhone),
                    adminPassword,
                    "admin",
                    ct);
                var memberUserId = await CreateTenantUserAsync(
                    tenant.Id,
                    memberUsername,
                    $"{tenant.Name} Member",
                    null,
                    null,
                    memberPassword,
                    "member",
                    ct);
                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                return Ok(new
                {
                    tenant = new
                    {
                        tenant.Id,
                        tenant.Name,
                        tenant.Slug,
                        tenant.Domain,
                        tenant.DomainStatus,
                        tenant.DomainVerificationToken,
                        publicUrl = BuildTenantPublicUrl(tenant),
                        loginUrl = BuildTenantLoginUrl(tenant),
                        dns = BuildDomainSetupInstructions(tenant)
                    },
                    landing = ToLandingDto(landingConfig),
                    adminUser = new { id = adminUserId, username = adminUsername, password = adminPassword },
                    memberUser = new { id = memberUserId, username = memberUsername, password = memberPassword },
                    freeModules = new[] { LicensingService.BaseModule }
                });
            });
        }

        [AllowAnonymous]
        [HttpGet("/api/public/landing/current")]
        public async Task<IActionResult> PublicLandingForCurrentDomain(CancellationToken ct)
        {
            var tenant = await _tenantContext.GetCurrentTenantAsync(ct);
            if (tenant == null) return NotFound();
            if (tenant.IsRootTenant != true &&
                !string.Equals(tenant.Status, "active", StringComparison.OrdinalIgnoreCase))
                return NotFound();

            var landing = await _db.TenantLandingConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.TenantId == tenant.Id, ct);

            if (landing?.Published == false) return NotFound();

            return Ok(new
            {
                tenant = new { tenant.Id, tenant.Name, tenant.Slug, tenant.Domain },
                landing = ToLandingDto(landing ?? new TenantLandingConfig { TenantId = tenant.Id, HeroTitle = tenant.Name })
            });
        }

        [Authorize]
        [HttpGet("/api/tenants/current/entitlements")]
        public async Task<IActionResult> CurrentEntitlements(CancellationToken ct)
        {
            await _licensing.EnsureCatalogSeededAsync(ct);
            await EnsureTenantModuleRequestsTableAsync(ct);
            var tenant = await _tenantContext.GetCurrentTenantAsync(ct);
            if (tenant == null) return NotFound("Tenant not found.");
            var landing = await _db.TenantLandingConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.TenantId == tenant.Id, ct);

            var modules = await _db.ModuleCatalog
                .AsNoTracking()
                .Where(m => m.Enabled)
                .OrderBy(m => m.DisplayOrder)
                .Select(m => new
                {
                    m.Code,
                    m.Name,
                    m.Description,
                    m.MonthlyPriceInr,
                    m.IsBaseModule,
                    pendingRequest = _db.TenantModuleRequests.Any(r =>
                        r.TenantId == tenant.Id &&
                        r.ModuleCode == m.Code &&
                        r.Status == "pending"),
                    licensed = m.IsBaseModule || _db.TenantModuleLicenses.Any(l =>
                        l.TenantId == tenant.Id &&
                        l.ModuleCode == m.Code &&
                        l.Status == "active" &&
                        l.StartsAtUtc <= DateTime.UtcNow &&
                        (l.EndsAtUtc == null || l.EndsAtUtc > DateTime.UtcNow))
                })
                .ToListAsync(ct);

            return Ok(new
            {
                tenant = new
                {
                    tenant.Id,
                    tenant.Name,
                    tenant.Slug,
                    logoUrl = landing?.LogoUrl,
                    heroTitle = landing?.HeroTitle
                },
                modules
            });
        }

        [Authorize]
        [HttpPost("/api/tenants/current/modules/{moduleCode}/beta-enable")]
        public async Task<IActionResult> BetaEnableCurrentTenantModule(string moduleCode, CancellationToken ct)
        {
            await _licensing.EnsureCatalogSeededAsync(ct);
            await EnsureTenantModuleRequestsTableAsync(ct);
            var tenant = await _tenantContext.GetCurrentTenantAsync(ct);
            if (tenant == null) return NotFound(new { message = "Tenant not found." });

            var code = NormalizeCode(moduleCode);
            var module = await _db.ModuleCatalog.AsNoTracking().FirstOrDefaultAsync(m => m.Code == code && m.Enabled, ct);
            if (module == null) return NotFound(new { message = "Module not found." });

            if (module.IsBaseModule)
                return Ok(new { tenantId = tenant.Id, moduleCode = code, status = "active", message = "Base module is already active." });

            var alreadyLicensed = await _licensing.HasModuleAsync(tenant.Id, code, ct);
            if (alreadyLicensed)
                return Ok(new { tenantId = tenant.Id, moduleCode = code, status = "active", message = "Module is already active." });

            var existing = await _db.TenantModuleRequests
                .FirstOrDefaultAsync(r => r.TenantId == tenant.Id && r.ModuleCode == code && r.Status == "pending", ct);
            if (existing != null)
                return Ok(new { tenantId = tenant.Id, moduleCode = code, status = "pending", requestId = existing.Id, message = "Request already sent to Mahima admin." });

            var requesterId = GetCurrentUserId();
            var requester = requesterId == Guid.Empty
                ? null
                : await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == requesterId, ct);

            var request = new TenantModuleRequest
            {
                TenantId = tenant.Id,
                ModuleCode = code,
                RequestedByUserId = requesterId == Guid.Empty ? null : requesterId,
                RequestedByName = requester?.DisplayName ?? requester?.Username,
                RequestedByEmail = requester?.Email,
                Status = "pending",
                RequestedAtUtc = DateTime.UtcNow
            };
            _db.TenantModuleRequests.Add(request);
            await _db.SaveChangesAsync(ct);

            var sambit = await FindSambitAsync(ct);
            await AddModuleRequestNotificationAsync(request, tenant, module, sambit?.Id, ct);
            request.NotificationEmailSent = await TrySendModuleRequestEmailAsync(request, tenant, module);
            request.JaiMasihMessageSent = await TrySendModuleRequestChatAsync(request, requesterId, sambit?.Id);
            await _db.SaveChangesAsync(ct);

            return Ok(new
            {
                tenantId = tenant.Id,
                moduleCode = code,
                status = "pending",
                requestId = request.Id,
                message = "Request sent to Mahima admin for approval."
            });
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpGet("/api/platform/modules")]
        public async Task<IActionResult> Modules(CancellationToken ct)
        {
            if (!await CurrentTenantIsRootAsync(ct)) return Forbid();
            await _licensing.EnsureCatalogSeededAsync(ct);
            var modules = await _db.ModuleCatalog.AsNoTracking().OrderBy(m => m.DisplayOrder).ToListAsync(ct);
            return Ok(modules);
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpPost("/api/platform/modules")]
        public async Task<IActionResult> UpsertModule([FromBody] UpsertModuleRequest dto, CancellationToken ct)
        {
            if (!await CurrentTenantIsRootAsync(ct)) return Forbid();
            if (string.IsNullOrWhiteSpace(dto.Code) || string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest("code and name are required.");

            var code = NormalizeCode(dto.Code);
            var module = await _db.ModuleCatalog.FirstOrDefaultAsync(m => m.Code == code, ct);
            if (module == null)
            {
                module = new ModuleCatalogItem { Code = code, CreatedAtUtc = DateTime.UtcNow };
                _db.ModuleCatalog.Add(module);
            }

            module.Name = dto.Name.Trim();
            module.Description = dto.Description;
            module.MonthlyPriceInr = Math.Max(0, dto.MonthlyPriceInr);
            module.IsBaseModule = dto.IsBaseModule;
            module.Enabled = dto.Enabled;
            module.DisplayOrder = dto.DisplayOrder;
            module.UpdatedAtUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return Ok(module);
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpGet("/api/platform/tenants")]
        public async Task<IActionResult> Tenants(CancellationToken ct)
        {
            if (!await CurrentTenantIsRootAsync(ct)) return Forbid();
            var tenants = await _db.Tenants
                .AsNoTracking()
                .Include(t => t.LandingConfig)
                .OrderBy(t => t.Name)
                .Select(t => new
                {
                    t.Id,
                    t.Name,
                    t.Slug,
                    t.Domain,
                    t.DomainStatus,
                    t.DomainVerificationToken,
                    t.DomainVerifiedAtUtc,
                    t.DomainLastCheckedAtUtc,
                    t.Status,
            t.IsRootTenant,
                    t.UserCodePrefix,
            t.ContactName,
                    t.ContactEmail,
                    t.ContactPhone,
                    LogoUrl = t.LandingConfig != null ? t.LandingConfig.LogoUrl : null,
                    t.CreatedAtUtc,
                    t.UpdatedAtUtc
                })
                .ToListAsync(ct);

            var countsByTenant = await ReadTenantUserCountsAsync(ct);
            var adminsByTenant = await ReadTenantAdminsAsync(ct);

            return Ok(tenants.Select(t => new
            {
                t.Id,
                t.Name,
                t.Slug,
                t.Domain,
                t.DomainStatus,
                t.DomainVerificationToken,
                t.DomainVerifiedAtUtc,
                t.DomainLastCheckedAtUtc,
                t.Status,
                t.IsRootTenant,
                t.UserCodePrefix,
                t.ContactName,
                t.ContactEmail,
                t.ContactPhone,
                t.LogoUrl,
                t.CreatedAtUtc,
                t.UpdatedAtUtc,
                PublicUrl = BuildTenantPublicUrl(t.Slug, t.Domain),
                LoginUrl = BuildTenantLoginUrl(t.Slug, t.Domain),
                DomainSetup = BuildDomainSetupInstructions(t.Domain, t.DomainStatus, t.DomainVerificationToken),
                UserCounts = countsByTenant.TryGetValue(t.Id, out var counts) ? counts : new TenantUserCounts(),
                AdminUsers = adminsByTenant.TryGetValue(t.Id, out var admins) ? admins : new List<TenantAdminUser>()
            }));
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpPut("/api/platform/tenants/{tenantId:guid}")]
        public async Task<IActionResult> UpdateTenantProfile(Guid tenantId, [FromForm] UpdateTenantProfileRequest dto, CancellationToken ct)
        {
            if (!await CurrentTenantIsRootAsync(ct)) return Forbid();
            if (dto == null) return BadRequest("tenant profile data is required.");

            var tenant = await _db.Tenants
                .Include(t => t.LandingConfig)
                .FirstOrDefaultAsync(t => t.Id == tenantId, ct);
            if (tenant == null) return NotFound("tenant not found.");

            var nextName = NormalizeNullable(dto.Name) ?? tenant.Name;
            if (string.IsNullOrWhiteSpace(nextName)) return BadRequest("name is required.");

            var requestedSlug = NormalizeNullable(dto.Slug);
            var nextSlug = string.IsNullOrWhiteSpace(requestedSlug) ? tenant.Slug : NormalizeSlug(requestedSlug);
            if (!string.Equals(nextSlug, tenant.Slug, StringComparison.OrdinalIgnoreCase) &&
                await _db.Tenants.AnyAsync(t => t.Id != tenantId && t.Slug == nextSlug, ct))
                return Conflict(new { message = "tenant slug already exists." });

            var nextDomain = NormalizeDomain(dto.Domain);
            if (!string.IsNullOrWhiteSpace(nextDomain) &&
                !string.Equals(nextDomain, tenant.Domain, StringComparison.OrdinalIgnoreCase) &&
                await _db.Tenants.AnyAsync(t => t.Id != tenantId && t.Domain == nextDomain, ct))
                return Conflict(new { message = "tenant domain already exists." });

            var now = DateTime.UtcNow;
            tenant.Name = nextName.Trim();
            tenant.Slug = nextSlug;
            var domainChanged = !string.Equals(nextDomain, tenant.Domain, StringComparison.OrdinalIgnoreCase);
            tenant.Domain = nextDomain;
            if (domainChanged)
            {
                tenant.DomainStatus = string.IsNullOrWhiteSpace(nextDomain) ? "none" : "pending";
                tenant.DomainVerificationToken = string.IsNullOrWhiteSpace(nextDomain) ? null : NewDomainVerificationToken();
                tenant.DomainVerifiedAtUtc = null;
                tenant.DomainLastCheckedAtUtc = null;
            }
            tenant.ContactName = NormalizeNullable(dto.ContactName);
            tenant.ContactEmail = NormalizeNullable(dto.ContactEmail);
            tenant.ContactPhone = NormalizeNullable(dto.ContactPhone);
            tenant.UserCodePrefix = NormalizeUserCodePrefix(dto.UserCodePrefix, tenant.Slug);
            tenant.UpdatedAtUtc = now;

            if (tenant.LandingConfig == null)
            {
                tenant.LandingConfig = new TenantLandingConfig
                {
                    TenantId = tenant.Id,
                    CreatedAtUtc = now,
                    HeroTitle = tenant.Name,
                    Published = true
                };
                _db.TenantLandingConfigs.Add(tenant.LandingConfig);
            }

            string? logoUrl = tenant.LandingConfig.LogoUrl;
            if (dto.Logo != null && dto.Logo.Length > 0)
            {
                try
                {
                    logoUrl = await SaveTenantLogoAsync(dto.Logo, tenant.Slug, ct);
                }
                catch (InvalidOperationException ex)
                {
                    return BadRequest(new { message = ex.Message });
                }
                tenant.LandingConfig.LogoUrl = logoUrl;
            }
            tenant.LandingConfig.ContactEmail = tenant.ContactEmail;
            tenant.LandingConfig.ContactPhone = tenant.ContactPhone;
            if (string.IsNullOrWhiteSpace(tenant.LandingConfig.HeroTitle))
                tenant.LandingConfig.HeroTitle = tenant.Name;
            tenant.LandingConfig.UpdatedAtUtc = now;

            var approvedBy = User.FindFirstValue(ClaimTypes.Name)
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? "root-admin";
            var payloadJson = JsonSerializer.Serialize(new
            {
                tenant = tenant.Slug,
                tenantId,
                tenant.Name,
                tenant.Domain,
                tenant.DomainStatus,
                tenant.DomainVerificationToken,
                tenant.DomainVerifiedAtUtc,
                tenant.DomainLastCheckedAtUtc,
                tenant.ContactName,
                tenant.ContactEmail,
                tenant.ContactPhone,
                tenant.UserCodePrefix,
                logoUrl,
                approvedBy,
                updatedAtUtc = now
            });
            _db.PaymentIntents.Add(new PaymentIntent
            {
                TenantId = tenant.Id,
                Purpose = "tenant_profile_update",
                AmountInr = 0,
                Provider = "root_admin",
                Status = "paid",
                PaidAtUtc = now,
                MetadataJson = payloadJson
            });

            await _db.SaveChangesAsync(ct);
            return Ok(new
            {
                tenant.Id,
                tenant.Name,
                tenant.Slug,
                tenant.Domain,
                tenant.DomainStatus,
                tenant.DomainVerificationToken,
                tenant.DomainVerifiedAtUtc,
                tenant.DomainLastCheckedAtUtc,
                tenant.Status,
                tenant.IsRootTenant,
                tenant.UserCodePrefix,
                tenant.ContactName,
                tenant.ContactEmail,
                tenant.ContactPhone,
                LogoUrl = tenant.LandingConfig.LogoUrl,
                tenant.CreatedAtUtc,
                tenant.UpdatedAtUtc,
                PublicUrl = BuildTenantPublicUrl(tenant),
                LoginUrl = BuildTenantLoginUrl(tenant),
                DomainSetup = BuildDomainSetupInstructions(tenant)
            });
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpPost("/api/platform/tenants/{tenantId:guid}/status")]
        public async Task<IActionResult> UpdateTenantStatus(Guid tenantId, [FromBody] UpdateTenantStatusRequest dto, CancellationToken ct)
        {
            if (!await CurrentTenantIsRootAsync(ct)) return Forbid();
            var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, ct);
            if (tenant == null) return NotFound("tenant not found.");
            if (tenant.IsRootTenant) return BadRequest("root tenant status cannot be changed from this page.");

            var status = NormalizeCode(dto.Status);
            var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "active", "suspended", "expired", "blocked" };
            if (!allowed.Contains(status))
                return BadRequest("status must be active, suspended, expired, or blocked.");

            var reason = NormalizeNullable(dto.Reason);
            var approvedBy = NormalizeNullable(dto.ApprovedBy)
                ?? User.FindFirstValue(ClaimTypes.Name)
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? "root-admin";

            tenant.Status = status;
            tenant.UpdatedAtUtc = DateTime.UtcNow;

            var payloadJson = JsonSerializer.Serialize(new
            {
                tenant = tenant.Slug,
                status,
                reason,
                approvedBy,
                changedAtUtc = tenant.UpdatedAtUtc
            });
            var intent = new PaymentIntent
            {
                TenantId = tenant.Id,
                Purpose = "tenant_status",
                AmountInr = 0,
                Provider = "root_admin",
                Status = "paid",
                PaidAtUtc = tenant.UpdatedAtUtc,
                MetadataJson = payloadJson
            };
            _db.PaymentIntents.Add(intent);
            _db.PaymentEvents.Add(new PaymentEvent
            {
                PaymentIntentId = intent.Id,
                EventType = $"tenant_{status}",
                ProviderEventId = tenant.Id.ToString(),
                PayloadJson = payloadJson
            });

            await _db.SaveChangesAsync(ct);
            return Ok(new
            {
                tenant.Id,
                tenant.Name,
                tenant.Slug,
                tenant.Status,
                tenant.UpdatedAtUtc,
                reason,
                approvedBy
            });
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpPost("/api/platform/tenants/{tenantId:guid}/domain/verify")]
        public async Task<IActionResult> VerifyTenantDomain(Guid tenantId, CancellationToken ct)
        {
            var currentTenant = await _tenantContext.GetCurrentTenantAsync(ct);
            var canManage = currentTenant?.IsRootTenant == true || currentTenant?.Id == tenantId;
            if (!canManage) return Forbid();

            var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, ct);
            if (tenant == null) return NotFound("tenant not found.");
            if (string.IsNullOrWhiteSpace(tenant.Domain))
                return BadRequest(new { message = "No custom domain is configured for this tenant." });

            tenant.Domain = NormalizeDomain(tenant.Domain);
            tenant.DomainLastCheckedAtUtc = DateTime.UtcNow;

            var resolved = await DomainResolvesToExpectedTargetAsync(tenant.Domain, ct);
            if (!resolved.ok)
            {
                tenant.DomainStatus = "pending";
                tenant.UpdatedAtUtc = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);
                return BadRequest(new
                {
                    message = resolved.message,
                    tenant.Domain,
                    tenant.DomainStatus,
                    tenant.DomainVerificationToken,
                    DomainSetup = BuildDomainSetupInstructions(tenant)
                });
            }

            tenant.DomainStatus = "verified";
            tenant.DomainVerifiedAtUtc = DateTime.UtcNow;
            tenant.UpdatedAtUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);

            return Ok(new
            {
                tenant.Id,
                tenant.Name,
                tenant.Slug,
                tenant.Domain,
                tenant.DomainStatus,
                tenant.DomainVerifiedAtUtc,
                PublicUrl = BuildTenantPublicUrl(tenant),
                LoginUrl = BuildTenantLoginUrl(tenant),
                DomainSetup = BuildDomainSetupInstructions(tenant)
            });
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpPost("/api/platform/tenants/{tenantId:guid}/admins")]
        public async Task<IActionResult> CreateTenantAdminUser(
            Guid tenantId,
            [FromBody] CreateTenantAdminUserRequest dto,
            CancellationToken ct)
        {
            if (!await CurrentTenantIsRootAsync(ct)) return Forbid();
            if (dto == null || string.IsNullOrWhiteSpace(dto.Username))
                return BadRequest("username is required.");
            if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Trim().Length < 6)
                return BadRequest("password must be at least 6 characters.");

            var tenant = await _db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
            if (tenant == null) return NotFound("tenant not found.");

            var username = NormalizeUsername(dto.Username);
            var email = NormalizeNullable(dto.Email);
            var phone = NormalizeNullable(dto.Phone);
            var displayName = NormalizeNullable(dto.DisplayName) ?? username;
            var password = dto.Password.Trim();

            if (await UserExistsInTenantAsync(tenantId, username, email, ct))
                return Conflict("admin username or email already exists for this tenant.");

            var userId = await CreateTenantAdminUserAsync(
                tenantId,
                username,
                displayName,
                email,
                phone,
                password,
                ct);

            var approvedBy = NormalizeNullable(dto.ApprovedBy)
                ?? User.FindFirstValue(ClaimTypes.Name)
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? "root-admin";
            var note = NormalizeNullable(dto.Note);
            var now = DateTime.UtcNow;
            var payloadJson = JsonSerializer.Serialize(new
            {
                tenant = tenant.Slug,
                userId,
                username,
                displayName,
                email,
                phone,
                note,
                approvedBy,
                createdAtUtc = now
            });

            _db.PaymentIntents.Add(new PaymentIntent
            {
                TenantId = tenantId,
                Purpose = "tenant_admin_user_created",
                AmountInr = 0,
                Provider = "root_admin",
                Status = "paid",
                PaidAtUtc = now,
                MetadataJson = payloadJson
            });
            await _db.SaveChangesAsync(ct);

            return Ok(new
            {
                tenantId,
                userId,
                username,
                displayName,
                email,
                phone,
                role = "admin",
                initialPassword = password,
                approvedBy,
                note,
                createdAtUtc = now
            });
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpPost("/api/platform/tenants/{tenantId:guid}/admins/{userId:guid}/reset-password")]
        public async Task<IActionResult> ResetTenantAdminPassword(
            Guid tenantId,
            Guid userId,
            [FromBody] ResetTenantAdminPasswordRequest dto,
            CancellationToken ct)
        {
            if (!await CurrentTenantIsRootAsync(ct)) return Forbid();
            if (dto == null || string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest("password is required.");

            var password = dto.Password.Trim();
            if (password.Length < 6)
                return BadRequest("password must be at least 6 characters.");

            var tenant = await _db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
            if (tenant == null) return NotFound("tenant not found.");

            var conn = (NpgsqlConnection)_db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync(ct);

            await using var lookup = new NpgsqlCommand(@"
SELECT id, username, displayname, email, role::text
FROM public.users
WHERE id = @user_id
  AND tenant_id = @tenant_id
  AND lower(role::text) IN ('admin', '1')
LIMIT 1;", conn);
            lookup.Parameters.AddWithValue("user_id", NpgsqlDbType.Uuid, userId);
            lookup.Parameters.AddWithValue("tenant_id", NpgsqlDbType.Uuid, tenantId);

            string? username;
            string? displayName;
            string? email;
            await using (var rdr = await lookup.ExecuteReaderAsync(ct))
            {
                if (!await rdr.ReadAsync(ct)) return NotFound("tenant admin user not found.");
                username = rdr["username"] as string;
                displayName = rdr["displayname"] as string;
                email = rdr["email"] as string;
            }

            var passwordHash = new PasswordHasher<object>().HashPassword(null!, password);
            await using var update = new NpgsqlCommand(@"
UPDATE public.users
SET passwordhash = @passwordhash
WHERE id = @user_id
  AND tenant_id = @tenant_id;", conn);
            update.Parameters.AddWithValue("passwordhash", NpgsqlDbType.Text, passwordHash);
            update.Parameters.AddWithValue("user_id", NpgsqlDbType.Uuid, userId);
            update.Parameters.AddWithValue("tenant_id", NpgsqlDbType.Uuid, tenantId);
            var affected = await update.ExecuteNonQueryAsync(ct);
            if (affected == 0) return NotFound("tenant admin user not found.");

            var approvedBy = NormalizeNullable(dto.ApprovedBy)
                ?? User.FindFirstValue(ClaimTypes.Name)
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? "root-admin";
            var note = NormalizeNullable(dto.Note);
            var now = DateTime.UtcNow;
            var payloadJson = JsonSerializer.Serialize(new
            {
                tenant = tenant.Slug,
                userId,
                username,
                displayName,
                email,
                note,
                approvedBy,
                resetAtUtc = now
            });

            _db.PaymentIntents.Add(new PaymentIntent
            {
                TenantId = tenantId,
                Purpose = "tenant_admin_password_reset",
                AmountInr = 0,
                Provider = "root_admin",
                Status = "paid",
                PaidAtUtc = now,
                MetadataJson = payloadJson
            });
            await _db.SaveChangesAsync(ct);

            return Ok(new
            {
                tenantId,
                userId,
                username,
                displayName,
                email,
                resetAtUtc = now,
                approvedBy,
                note
            });
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpGet("/api/platform/tenants/{tenantId:guid}/entitlements")]
        public async Task<IActionResult> TenantEntitlements(Guid tenantId, CancellationToken ct)
        {
            if (!await CurrentTenantIsRootAsync(ct)) return Forbid();
            await _licensing.EnsureCatalogSeededAsync(ct);
            var tenant = await _db.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == tenantId, ct);
            if (tenant == null) return NotFound("tenant not found.");

            var now = DateTime.UtcNow;
            var modules = await _db.ModuleCatalog
                .AsNoTracking()
                .Where(m => m.Enabled)
                .OrderBy(m => m.DisplayOrder)
                .Select(m => new
                {
                    m.Code,
                    m.Name,
                    m.Description,
                    m.MonthlyPriceInr,
                    m.IsBaseModule,
                    License = _db.TenantModuleLicenses
                        .Where(l =>
                            l.TenantId == tenantId &&
                            l.ModuleCode == m.Code &&
                            l.Status == "active" &&
                            l.StartsAtUtc <= now &&
                            (l.EndsAtUtc == null || l.EndsAtUtc > now))
                        .OrderByDescending(l => l.UpdatedAtUtc)
                        .Select(l => new
                        {
                            l.Id,
                            l.Status,
                            l.PriceInr,
                            l.Source,
                            l.StartsAtUtc,
                            l.EndsAtUtc,
                            l.ActivatedByPaymentId
                        })
                        .FirstOrDefault()
                })
                .ToListAsync(ct);

            return Ok(new
            {
                tenant = new { tenant.Id, tenant.Name, tenant.Slug, tenant.Status },
                modules = modules.Select(m => new
                {
                    m.Code,
                    m.Name,
                    m.Description,
                    m.MonthlyPriceInr,
                    m.IsBaseModule,
                    licensed = m.IsBaseModule || m.License != null,
                    license = m.License
                })
            });
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpGet("/api/platform/module-requests")]
        public async Task<IActionResult> ModuleRequests([FromQuery] string? status = "pending", [FromQuery] Guid? tenantId = null, [FromQuery] int limit = 100, CancellationToken ct = default)
        {
            if (!await CurrentTenantIsRootAsync(ct)) return Forbid();
            await EnsureTenantModuleRequestsTableAsync(ct);
            limit = Math.Clamp(limit, 1, 500);

            var query = _db.TenantModuleRequests
                .AsNoTracking()
                .Include(r => r.Tenant)
                .Include(r => r.Module)
                .AsQueryable();

            if (tenantId.HasValue && tenantId.Value != Guid.Empty)
                query = query.Where(r => r.TenantId == tenantId.Value);

            var normalizedStatus = NormalizeNullable(status)?.ToLowerInvariant();
            if (!string.IsNullOrWhiteSpace(normalizedStatus))
                query = query.Where(r => r.Status == normalizedStatus);

            var items = await query
                .OrderByDescending(r => r.RequestedAtUtc)
                .Take(limit)
                .Select(r => new
                {
                    r.Id,
                    r.TenantId,
                    TenantName = r.Tenant != null ? r.Tenant.Name : null,
                    TenantSlug = r.Tenant != null ? r.Tenant.Slug : null,
                    r.ModuleCode,
                    ModuleName = r.Module != null ? r.Module.Name : r.ModuleCode,
                    ModulePriceInr = r.Module != null ? r.Module.MonthlyPriceInr : 0,
                    r.RequestedByUserId,
                    r.RequestedByName,
                    r.RequestedByEmail,
                    r.Status,
                    r.AdminNotes,
                    r.RequestedAtUtc,
                    r.ReviewedAtUtc,
                    r.ReviewedByUserId,
                    r.NotificationEmailSent,
                    r.JaiMasihMessageSent
                })
                .ToListAsync(ct);

            return Ok(new { items, total = items.Count });
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpPost("/api/platform/module-requests/{requestId:guid}/approve")]
        public async Task<IActionResult> ApproveModuleRequest(Guid requestId, [FromBody] ReviewModuleRequest? dto, CancellationToken ct)
        {
            if (!await CurrentTenantIsRootAsync(ct)) return Forbid();
            await EnsureBillingTablesAsync(ct);
            await EnsureTenantModuleRequestsTableAsync(ct);

            var request = await _db.TenantModuleRequests
                .Include(r => r.Tenant)
                .Include(r => r.Module)
                .FirstOrDefaultAsync(r => r.Id == requestId, ct);
            if (request == null) return NotFound("module request not found.");
            if (request.Status != "pending") return BadRequest("request is no longer pending.");

            var module = request.Module ?? await _db.ModuleCatalog.AsNoTracking().FirstOrDefaultAsync(m => m.Code == request.ModuleCode, ct);
            if (module == null) return NotFound("module not found.");
            var tenant = request.Tenant ?? await _db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == request.TenantId, ct);
            if (tenant == null) return NotFound("tenant not found.");

            var reviewerId = GetCurrentUserId();
            var approvedBy = NormalizeNullable(dto?.ApprovedBy)
                ?? User.FindFirstValue(ClaimTypes.Name)
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? "root-admin";
            var note = NormalizeNullable(dto?.Note);
            var now = DateTime.UtcNow;
            var payloadJson = JsonSerializer.Serialize(new
            {
                tenant = tenant.Slug,
                tenantId = tenant.Id,
                module = request.ModuleCode,
                requestId = request.Id,
                note,
                approvedBy,
                approvedAtUtc = now
            });

            var intent = new PaymentIntent
            {
                TenantId = request.TenantId,
                Purpose = "module_request_approval",
                ModuleCode = request.ModuleCode,
                AmountInr = module.MonthlyPriceInr,
                Provider = "root_admin_request_approval",
                Status = "paid",
                PaidAtUtc = now,
                MetadataJson = payloadJson
            };
            _db.PaymentIntents.Add(intent);
            _db.PaymentEvents.Add(new PaymentEvent
            {
                PaymentIntentId = intent.Id,
                EventType = "module_request_approved",
                ProviderEventId = request.Id.ToString(),
                PayloadJson = payloadJson
            });
            await _db.SaveChangesAsync(ct);

            await _licensing.ActivateModuleAsync(request.TenantId, request.ModuleCode, module.MonthlyPriceInr, "request_approved", intent.Id, ct);
            await EnsureCurrentMonthBillingForModuleAsync(request.TenantId, request.ModuleCode, module.Name, module.MonthlyPriceInr, intent.Id, ct);

            request.Status = "approved";
            request.AdminNotes = note;
            request.ReviewedAtUtc = now;
            request.ReviewedByUserId = reviewerId == Guid.Empty ? null : reviewerId;
            await _db.SaveChangesAsync(ct);

            return Ok(new { status = "approved", requestId = request.Id, tenantId = request.TenantId, moduleCode = request.ModuleCode, paymentIntentId = intent.Id });
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpPost("/api/platform/module-requests/{requestId:guid}/reject")]
        public async Task<IActionResult> RejectModuleRequest(Guid requestId, [FromBody] ReviewModuleRequest? dto, CancellationToken ct)
        {
            if (!await CurrentTenantIsRootAsync(ct)) return Forbid();
            await EnsureTenantModuleRequestsTableAsync(ct);

            var request = await _db.TenantModuleRequests.FirstOrDefaultAsync(r => r.Id == requestId, ct);
            if (request == null) return NotFound("module request not found.");
            if (request.Status != "pending") return BadRequest("request is no longer pending.");

            request.Status = "rejected";
            request.AdminNotes = NormalizeNullable(dto?.Note);
            request.ReviewedAtUtc = DateTime.UtcNow;
            var reviewerId = GetCurrentUserId();
            request.ReviewedByUserId = reviewerId == Guid.Empty ? null : reviewerId;
            await _db.SaveChangesAsync(ct);

            return Ok(new { status = "rejected", requestId = request.Id, tenantId = request.TenantId, moduleCode = request.ModuleCode });
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpPost("/api/platform/tenants")]
        public async Task<IActionResult> CreateTenant([FromBody] CreateTenantRequest dto, CancellationToken ct)
        {
            if (!await CurrentTenantIsRootAsync(ct)) return Forbid();
            if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("name is required.");
            var initialAdminPassword = string.IsNullOrWhiteSpace(dto.AdminPassword)
                ? "NewPass@123"
                : dto.AdminPassword.Trim();
            if (initialAdminPassword.Length < 6)
                return BadRequest("adminPassword must be at least 6 characters.");

            await _licensing.EnsureCatalogSeededAsync(ct);
            var slug = NormalizeSlug(string.IsNullOrWhiteSpace(dto.Slug) ? dto.Name : dto.Slug);
            if (await _db.Tenants.AnyAsync(t => t.Slug == slug, ct)) return Conflict("tenant slug already exists.");
            var requestedDomain = NormalizeDomain(dto.Domain);
            if (!string.IsNullOrWhiteSpace(requestedDomain) &&
                await _db.Tenants.AnyAsync(t => t.Domain == requestedDomain, ct))
                return Conflict("tenant domain already exists.");
            var adminUsername = NormalizeUsername(string.IsNullOrWhiteSpace(dto.AdminUsername) ? $"{slug}-admin" : dto.AdminUsername);
            var adminEmail = NormalizeNullable(dto.AdminEmail) ?? NormalizeNullable(dto.ContactEmail);

            var tenant = new Tenant
            {
                Name = dto.Name.Trim(),
                Slug = slug,
                Domain = requestedDomain,
                DomainStatus = string.IsNullOrWhiteSpace(requestedDomain) ? "none" : "pending",
                DomainVerificationToken = string.IsNullOrWhiteSpace(requestedDomain) ? null : NewDomainVerificationToken(),
                ContactName = NormalizeNullable(dto.ContactName),
                ContactEmail = NormalizeNullable(dto.ContactEmail),
                ContactPhone = NormalizeNullable(dto.ContactPhone),
                UserCodePrefix = NormalizeUserCodePrefix(dto.UserCodePrefix, slug),
                Status = "active",
            };

            _db.Tenants.Add(tenant);
            await _db.SaveChangesAsync(ct);

            if (await UserExistsInTenantAsync(tenant.Id, adminUsername, adminEmail, ct))
                return Conflict("admin username or email already exists for this tenant.");

            await _licensing.ActivateModuleAsync(tenant.Id, LicensingService.BaseModule, 0, "base-free", null, ct);
            var landingConfig = new TenantLandingConfig
            {
                TenantId = tenant.Id,
                HeroTitle = tenant.Name,
                HeroSubtitle = $"Welcome to {tenant.Name}.",
                PrimaryColor = "#0f766e",
                AccentColor = "#f59e0b",
                ContactEmail = tenant.ContactEmail,
                ContactPhone = tenant.ContactPhone,
                ServiceTimesJson = JsonSerializer.Serialize(new[]
                {
                    new { day = "Sunday", title = "Worship Service", time = "10:00 AM", note = "Configure this for your church." },
                    new { day = "Wednesday", title = "Prayer Meeting", time = "7:00 PM", note = "Configure this for your church." }
                }),
                SocialLinksJson = "[]",
                SectionsJson = JsonSerializer.Serialize(new object[]
                {
                    new
                    {
                        type = "story",
                        eyebrow = "Welcome",
                        title = $"Welcome to {tenant.Name}",
                        text = "Write this church's story, pastor welcome, and vision from the Landing Page editor.",
                        imageUrl = ""
                    },
                    new
                    {
                        type = "feature-grid",
                        eyebrow = "Ministry",
                        title = "Ministries",
                        subtitle = "Show the ministries and groups this church offers.",
                        items = new[]
                        {
                            new { title = "Prayer", text = "Prayer support and care." },
                            new { title = "Worship", text = "Weekly worship gatherings." },
                            new { title = "Community", text = "Fellowship and discipleship." }
                        }
                    },
                    new
                    {
                        type = "cta",
                        title = "Plan your visit",
                        text = "Tell visitors what to do next.",
                        buttonLabel = "Member Login",
                        buttonHref = "/#/login"
                    }
                }),
                Published = true
            };
            _db.TenantLandingConfigs.Add(landingConfig);
            await _db.SaveChangesAsync(ct);

            var adminDisplayName = NormalizeNullable(dto.AdminDisplayName) ?? NormalizeNullable(dto.ContactName) ?? $"{tenant.Name} Admin";
            var adminPhone = NormalizeNullable(dto.AdminPhone) ?? NormalizeNullable(dto.ContactPhone);
            var adminUserId = await CreateTenantAdminUserAsync(
                tenant.Id,
                adminUsername,
                adminDisplayName,
                adminEmail,
                adminPhone,
                initialAdminPassword,
                ct);
            await _db.SaveChangesAsync(ct);

            return Ok(new
            {
                tenant.Id,
                tenant.Name,
                tenant.Slug,
                tenant.Domain,
                tenant.DomainStatus,
                tenant.DomainVerificationToken,
                tenant.ContactName,
                tenant.ContactEmail,
                tenant.ContactPhone,
                tenant.Status,
                tenant.IsRootTenant,
                tenant.CreatedAtUtc,
                tenant.UpdatedAtUtc,
                PublicUrl = BuildTenantPublicUrl(tenant),
                LoginUrl = BuildTenantLoginUrl(tenant),
                DomainSetup = BuildDomainSetupInstructions(tenant),
                landingConfig = ToLandingDto(landingConfig),
                adminUser = new
                {
                    id = adminUserId,
                    username = adminUsername,
                    displayName = adminDisplayName,
                    email = adminEmail,
                    phone = adminPhone,
                    role = "admin",
                    initialPassword = initialAdminPassword
                }
            });
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpPost("/api/platform/tenants/{tenantId:guid}/modules/{moduleCode}/activate")]
        public async Task<IActionResult> ActivateModule(Guid tenantId, string moduleCode, [FromBody] ActivateModuleRequest? dto, CancellationToken ct)
        {
            if (!await CurrentTenantIsRootAsync(ct)) return Forbid();
            await EnsureBillingTablesAsync(ct);
            dto ??= new ActivateModuleRequest(null, null, null, null, null, null);
            var code = NormalizeCode(moduleCode);
            var module = await _db.ModuleCatalog.AsNoTracking().FirstOrDefaultAsync(m => m.Code == code, ct);
            if (module == null) return NotFound("module not found.");
            var tenant = await _db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
            if (tenant == null) return NotFound("tenant not found.");

            var source = NormalizeCode(NormalizeNullable(dto.Source) ?? "admin_override");
            var isPaidActivation = source is "payment" or "manual-receipt" or "manual_receipt" or "paid";
            var price = isPaidActivation ? dto.PriceInr ?? module.MonthlyPriceInr : 0;
            var receipt = NormalizeNullable(dto.ReceiptNumber);
            var note = NormalizeNullable(dto.Note);
            var approvedBy = NormalizeNullable(dto.ApprovedBy)
                ?? User.FindFirstValue(ClaimTypes.Name)
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? "root-admin";

            var intent = new PaymentIntent
            {
                TenantId = tenantId,
                Purpose = "module_activation",
                ModuleCode = code,
                AmountInr = Math.Max(0, price),
                Provider = source == "payment" ? "manual_receipt" : source,
                Status = "paid",
                ProviderPaymentId = receipt,
                PaidAtUtc = DateTime.UtcNow,
                MetadataJson = JsonSerializer.Serialize(new
                {
                    tenant = tenant.Slug,
                    module = code,
                    source,
                    receiptNumber = receipt,
                    note,
                    approvedBy,
                    overrideByRootAdmin = true
                })
            };
            _db.PaymentIntents.Add(intent);
            _db.PaymentEvents.Add(new PaymentEvent
            {
                PaymentIntentId = intent.Id,
                EventType = "admin_override",
                ProviderEventId = receipt,
                PayloadJson = intent.MetadataJson ?? "{}"
            });
            await _db.SaveChangesAsync(ct);

            await _licensing.ActivateModuleAsync(tenantId, code, price, source, intent.Id, ct);
            await EnsureCurrentMonthBillingForModuleAsync(tenantId, code, module.Name, price, intent.Id, ct);
            if (dto.EndsAtUtc.HasValue)
            {
                var license = await _db.TenantModuleLicenses
                    .OrderByDescending(l => l.CreatedAtUtc)
                    .FirstOrDefaultAsync(l => l.TenantId == tenantId && l.ModuleCode == code && l.Status == "active", ct);
                if (license != null)
                {
                    license.EndsAtUtc = dto.EndsAtUtc.Value.ToUniversalTime();
                    await _db.SaveChangesAsync(ct);
                }
            }

            return Ok(new { tenantId, moduleCode = code, status = "active", paymentIntentId = intent.Id, receiptNumber = receipt, note, approvedBy });
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpPost("/api/platform/tenants/{tenantId:guid}/modules/{moduleCode}/revoke")]
        public async Task<IActionResult> RevokeModule(Guid tenantId, string moduleCode, [FromBody] RevokeModuleRequest dto, CancellationToken ct)
        {
            if (!await CurrentTenantIsRootAsync(ct)) return Forbid();
            var code = NormalizeCode(moduleCode);
            var tenant = await _db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
            if (tenant == null) return NotFound("tenant not found.");

            var now = DateTime.UtcNow;
            var license = await _db.TenantModuleLicenses
                .OrderByDescending(l => l.UpdatedAtUtc)
                .FirstOrDefaultAsync(l =>
                    l.TenantId == tenantId &&
                    l.ModuleCode == code &&
                    l.Status == "active" &&
                    l.StartsAtUtc <= now &&
                    (l.EndsAtUtc == null || l.EndsAtUtc > now), ct);

            if (license == null) return NotFound("active license not found.");

            var note = NormalizeNullable(dto.Note);
            var approvedBy = NormalizeNullable(dto.ApprovedBy)
                ?? User.FindFirstValue(ClaimTypes.Name)
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? "root-admin";

            var payloadJson = JsonSerializer.Serialize(new
            {
                tenant = tenant.Slug,
                module = code,
                note,
                approvedBy,
                revokedAtUtc = now,
                revokedLicenseId = license.Id,
                previousPaymentIntentId = license.ActivatedByPaymentId
            });

            var intent = new PaymentIntent
            {
                TenantId = tenantId,
                Purpose = "module_revocation",
                ModuleCode = code,
                AmountInr = 0,
                Provider = "admin_revoke",
                Status = "paid",
                PaidAtUtc = now,
                MetadataJson = payloadJson
            };
            _db.PaymentIntents.Add(intent);
            _db.PaymentEvents.Add(new PaymentEvent
            {
                PaymentIntentId = intent.Id,
                EventType = "admin_revoke",
                PayloadJson = payloadJson
            });

            license.Status = "revoked";
            license.EndsAtUtc = now;
            license.UpdatedAtUtc = now;

            await _db.SaveChangesAsync(ct);
            return Ok(new { tenantId, moduleCode = code, status = "revoked", revokedAtUtc = now, note, approvedBy });
        }

        [Authorize]
        [HttpGet("/api/tenant-admin/landing")]
        public async Task<IActionResult> GetLanding(CancellationToken ct)
        {
            var tenant = await _tenantContext.GetCurrentTenantAsync(ct);
            if (tenant == null) return NotFound("tenant not found.");
            var config = await _db.TenantLandingConfigs.AsNoTracking().FirstOrDefaultAsync(c => c.TenantId == tenant.Id, ct);
            return Ok(ToLandingDto(config ?? new TenantLandingConfig { TenantId = tenant.Id, HeroTitle = tenant.Name }));
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpPut("/api/tenant-admin/landing")]
        public async Task<IActionResult> SaveLanding([FromBody] LandingConfigRequest dto, CancellationToken ct)
        {
            var tenant = await _tenantContext.GetCurrentTenantAsync(ct);
            if (tenant == null) return NotFound("tenant not found.");

            var config = await _db.TenantLandingConfigs.FirstOrDefaultAsync(c => c.TenantId == tenant.Id, ct);
            if (config == null)
            {
                config = new TenantLandingConfig { TenantId = tenant.Id, CreatedAtUtc = DateTime.UtcNow };
                _db.TenantLandingConfigs.Add(config);
            }

            config.LogoUrl = NormalizeNullable(dto.LogoUrl);
            config.HeroImageUrl = NormalizeNullable(dto.HeroImageUrl);
            config.HeroTitle = string.IsNullOrWhiteSpace(dto.HeroTitle) ? tenant.Name : dto.HeroTitle.Trim();
            config.HeroSubtitle = NormalizeNullable(dto.HeroSubtitle);
            config.PrimaryColor = NormalizeNullable(dto.PrimaryColor);
            config.AccentColor = NormalizeNullable(dto.AccentColor);
            config.ContactEmail = NormalizeNullable(dto.ContactEmail);
            config.ContactPhone = NormalizeNullable(dto.ContactPhone);
            config.Address = NormalizeNullable(dto.Address);
            config.ServiceTimesJson = JsonOrNull(dto.ServiceTimes);
            config.SocialLinksJson = JsonOrNull(dto.SocialLinks);
            config.SectionsJson = JsonOrNull(dto.Sections);
            config.Published = dto.Published;
            config.UpdatedAtUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);

            return Ok(ToLandingDto(config));
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpPost("/api/billing/tenants/{tenantId:guid}/modules/{moduleCode}/payment-intents")]
        public async Task<IActionResult> CreatePaymentIntent(Guid tenantId, string moduleCode, [FromBody] CreatePaymentIntentRequest dto, CancellationToken ct)
        {
            if (!await CurrentTenantIsRootAsync(ct)) return Forbid();
            await _licensing.EnsureCatalogSeededAsync(ct);
            var tenant = await _db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
            if (tenant == null) return NotFound("tenant not found.");
            var code = NormalizeCode(moduleCode);
            var module = await _db.ModuleCatalog.AsNoTracking().FirstOrDefaultAsync(m => m.Code == code && m.Enabled, ct);
            if (module == null) return NotFound("module not found.");
            if (module.MonthlyPriceInr <= 0)
            {
                await _licensing.ActivateModuleAsync(tenantId, code, 0, "base-free", null, ct);
                return Ok(new { status = "activated", tenantId, moduleCode = code, amountInr = 0 });
            }

            var provider = NormalizeCode(NormalizeNullable(dto.Provider) ?? _config["Billing:DefaultProvider"] ?? "upi");
            var vpa = NormalizeNullable(dto.UpiVpa) ?? _config["Billing:UpiVpa"] ?? "merchant@upi";
            var payee = NormalizeNullable(dto.UpiPayeeName) ?? _config["Billing:UpiPayeeName"] ?? "Mahima Ministries";
            var intent = new PaymentIntent
            {
                TenantId = tenantId,
                Purpose = "module_activation",
                ModuleCode = code,
                AmountInr = module.MonthlyPriceInr,
                Provider = provider,
                Status = "pending",
                UpiVpa = vpa,
                UpiPayeeName = payee,
                ExpiresAtUtc = DateTime.UtcNow.AddHours(24),
                MetadataJson = JsonSerializer.Serialize(new { tenant = tenant.Slug, module = code })
            };

            string? razorpayKeyId = null;
            if (provider == "razorpay")
            {
                var order = await CreateRazorpayOrderAsync(intent, tenant.Slug, code, ct);
                intent.ProviderOrderId = order.orderId;
                intent.MetadataJson = JsonSerializer.Serialize(new
                {
                    tenant = tenant.Slug,
                    module = code,
                    razorpayOrderId = order.orderId
                });
                razorpayKeyId = order.keyId;
            }
            else
            {
                intent.Provider = "upi";
                intent.UpiDeepLink = BuildUpiLink(vpa, payee, intent.AmountInr, intent.Id.ToString("N"), $"{tenant.Slug}-{code}");
            }

            _db.PaymentIntents.Add(intent);
            _db.PaymentEvents.Add(new PaymentEvent { PaymentIntentId = intent.Id, EventType = "created", PayloadJson = "{}" });
            await _db.SaveChangesAsync(ct);

            return Ok(new
            {
                intent.Id,
                intent.TenantId,
                intent.ModuleCode,
                intent.AmountInr,
                intent.Currency,
                intent.Provider,
                intent.Status,
                intent.ProviderOrderId,
                razorpayOrderId = intent.ProviderOrderId,
                razorpayKeyId,
                intent.UpiVpa,
                intent.UpiPayeeName,
                intent.UpiDeepLink,
                intent.ExpiresAtUtc
            });
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpPost("/api/billing/payment-intents/{paymentIntentId:guid}/mark-paid")]
        public async Task<IActionResult> MarkPaid(Guid paymentIntentId, [FromBody] MarkPaymentPaidRequest dto, CancellationToken ct)
        {
            if (!await CurrentTenantIsRootAsync(ct)) return Forbid();
            await EnsureBillingTablesAsync(ct);
            await _licensing.EnsureCatalogSeededAsync(ct);

            try
            {
                var strategy = _db.Database.CreateExecutionStrategy();
                return await strategy.ExecuteAsync<IActionResult>(async () =>
                {
                    await using var tx = await _db.Database.BeginTransactionAsync(ct);

                    var intent = await _db.PaymentIntents.FirstOrDefaultAsync(p => p.Id == paymentIntentId, ct);
                    if (intent == null) return NotFound("payment intent not found.");
                    if (string.IsNullOrWhiteSpace(intent.ModuleCode)) return BadRequest("payment intent has no module.");
                    if (string.Equals(intent.Status, "paid", StringComparison.OrdinalIgnoreCase))
                        return Ok(new { intent.Id, intent.Status, activatedModule = intent.ModuleCode, intent.TenantId });

                    var providerPaymentId = NormalizeNullable(dto?.ProviderPaymentId) ?? intent.ProviderPaymentId;

                    intent.Status = "paid";
                    intent.ProviderPaymentId = providerPaymentId;
                    intent.PaidAtUtc = DateTime.UtcNow;
                    _db.PaymentEvents.Add(new PaymentEvent
                    {
                        PaymentIntentId = intent.Id,
                        EventType = "paid",
                        ProviderEventId = $"admin-confirmed:{intent.Id:N}",
                        PayloadJson = string.IsNullOrWhiteSpace(dto?.PayloadJson) ? "{}" : dto.PayloadJson
                    });

                    await _licensing.ActivateModuleAsync(intent.TenantId, intent.ModuleCode, intent.AmountInr, "payment", intent.Id, ct);
                    await ApplyPaymentToOpenInvoicesAsync(intent, ct);
                    await _db.SaveChangesAsync(ct);
                    await tx.CommitAsync(ct);
                    return Ok(new { intent.Id, intent.Status, activatedModule = intent.ModuleCode, intent.TenantId });
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Could not confirm billing donation payment intent {PaymentIntentId}", paymentIntentId);
                return StatusCode(500, new
                {
                    message = "Could not confirm donation and activate module.",
                    detail = ex.GetBaseException().Message
                });
            }
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpPost("/api/billing/tenants/current/modules/{moduleCode}/payment-intents")]
        public async Task<IActionResult> CreateCurrentTenantPaymentIntent(string moduleCode, [FromBody] CreatePaymentIntentRequest dto, CancellationToken ct)
        {
            await _licensing.EnsureCatalogSeededAsync(ct);
            var tenant = await _tenantContext.GetCurrentTenantAsync(ct);
            if (tenant == null) return NotFound(new { message = "Tenant not found." });

            var code = NormalizeCode(moduleCode);
            var module = await _db.ModuleCatalog.AsNoTracking().FirstOrDefaultAsync(m => m.Code == code && m.Enabled, ct);
            if (module == null) return NotFound(new { message = "Module not found." });

            if (module.IsBaseModule || module.MonthlyPriceInr <= 0)
            {
                await _licensing.ActivateModuleAsync(tenant.Id, code, 0, "base-free", null, ct);
                return Ok(new { status = "activated", tenantId = tenant.Id, moduleCode = code, amountInr = 0 });
            }

            if (await _licensing.HasModuleAsync(tenant.Id, code, ct))
                return Ok(new { status = "active", tenantId = tenant.Id, moduleCode = code, amountInr = module.MonthlyPriceInr });

            var provider = NormalizeCode(NormalizeNullable(dto.Provider) ?? "upi");
            if (provider != "razorpay") provider = "upi";
            var vpa = NormalizeNullable(dto.UpiVpa) ?? _config["Billing:UpiVpa"] ?? "merchant@upi";
            var payee = NormalizeNullable(dto.UpiPayeeName) ?? _config["Billing:UpiPayeeName"] ?? "Mahima Ministries Welfare Society";

            var intent = new PaymentIntent
            {
                TenantId = tenant.Id,
                Purpose = "module_donation",
                ModuleCode = code,
                AmountInr = module.MonthlyPriceInr,
                Provider = provider,
                Status = "pending",
                UpiVpa = vpa,
                UpiPayeeName = payee,
                ExpiresAtUtc = DateTime.UtcNow.AddHours(24),
                MetadataJson = JsonSerializer.Serialize(new { tenant = tenant.Slug, module = code, source = "tenant_admin_subscription_donation" })
            };

            string? razorpayKeyId = null;
            if (provider == "razorpay")
            {
                var order = await CreateRazorpayOrderAsync(intent, tenant.Slug, code, ct);
                intent.ProviderOrderId = order.orderId;
                intent.MetadataJson = JsonSerializer.Serialize(new
                {
                    tenant = tenant.Slug,
                    module = code,
                    razorpayOrderId = order.orderId,
                    source = "tenant_admin_subscription_donation"
                });
                razorpayKeyId = order.keyId;
            }
            else
            {
                intent.UpiDeepLink = BuildUpiLink(vpa, payee, intent.AmountInr, intent.Id.ToString("N"), $"{tenant.Slug}-{code}-donation");
            }

            _db.PaymentIntents.Add(intent);
            _db.PaymentEvents.Add(new PaymentEvent { PaymentIntentId = intent.Id, EventType = "created", PayloadJson = "{}" });
            await _db.SaveChangesAsync(ct);

            return Ok(new
            {
                intent.Id,
                intent.TenantId,
                intent.ModuleCode,
                intent.AmountInr,
                intent.Currency,
                intent.Provider,
                intent.Status,
                intent.ProviderOrderId,
                razorpayOrderId = intent.ProviderOrderId,
                razorpayKeyId,
                intent.UpiVpa,
                intent.UpiPayeeName,
                intent.UpiDeepLink,
                intent.ExpiresAtUtc
            });
        }

        [Authorize]
        [HttpPost("/api/billing/payment-intents/{paymentIntentId:guid}/donation-details")]
        public async Task<IActionResult> SubmitDonationDetails(Guid paymentIntentId, [FromBody] SubmitDonationDetailsRequest dto, CancellationToken ct)
        {
            var intent = await _db.PaymentIntents.FirstOrDefaultAsync(p => p.Id == paymentIntentId, ct);
            if (intent == null) return NotFound(new { message = "Donation request not found." });

            var currentTenant = await _tenantContext.GetCurrentTenantAsync(ct);
            var root = await CurrentTenantIsRootAsync(ct);
            if (!root && currentTenant?.Id != intent.TenantId) return Forbid();
            if (intent.Status == "paid") return BadRequest(new { message = "This donation is already confirmed." });

            var upiTransactionNumber = NormalizeNullable(dto.UpiTransactionNumber);
            var payerName = NormalizeNullable(dto.PayerName);
            if (string.IsNullOrWhiteSpace(upiTransactionNumber))
                return BadRequest(new { message = "UPI transaction number is required." });
            if (string.IsNullOrWhiteSpace(payerName))
                return BadRequest(new { message = "Name is required." });

            var donation = new
            {
                upiTransactionNumber,
                payerName,
                payerPhone = NormalizeNullable(dto.PayerPhone),
                payerEmail = NormalizeNullable(dto.PayerEmail),
                amountInr = dto.AmountInr.GetValueOrDefault(intent.AmountInr),
                note = NormalizeNullable(dto.Note),
                submittedAtUtc = DateTime.UtcNow
            };

            intent.Provider = "upi";
            intent.Status = "submitted";
            intent.ProviderPaymentId = upiTransactionNumber;
            intent.MetadataJson = JsonSerializer.Serialize(new
            {
                previous = intent.MetadataJson,
                donation
            });

            _db.PaymentEvents.Add(new PaymentEvent
            {
                PaymentIntentId = intent.Id,
                EventType = "donation.details.submitted",
                ProviderEventId = upiTransactionNumber,
                PayloadJson = JsonSerializer.Serialize(donation)
            });
            await LinkPaymentIntentToOpenInvoiceAsync(intent, ct);
            await _db.SaveChangesAsync(ct);

            return Ok(new
            {
                intent.Id,
                intent.TenantId,
                intent.ModuleCode,
                intent.AmountInr,
                intent.Currency,
                intent.Provider,
                intent.Status,
                intent.ProviderPaymentId,
                donation
            });
        }

        [Authorize]
        [HttpPost("/api/billing/payment-intents/{paymentIntentId:guid}/razorpay-verify")]
        public async Task<IActionResult> VerifyModulePayment(Guid paymentIntentId, [FromBody] VerifyModulePaymentRequest dto, CancellationToken ct)
        {
            var intent = await _db.PaymentIntents.FirstOrDefaultAsync(p => p.Id == paymentIntentId, ct);
            if (intent == null) return NotFound(new { message = "Payment intent not found." });

            var currentTenant = await _tenantContext.GetCurrentTenantAsync(ct);
            var root = await CurrentTenantIsRootAsync(ct);
            if (!root && currentTenant?.Id != intent.TenantId) return Forbid();

            if (string.IsNullOrWhiteSpace(intent.ProviderOrderId) ||
                !string.Equals(intent.ProviderOrderId, dto.RazorpayOrderId, StringComparison.Ordinal))
                return BadRequest(new { message = "Razorpay order does not match this payment intent." });

            var keySecret = _config["Billing:RazorpayKeySecret"];
            if (string.IsNullOrWhiteSpace(keySecret))
                return StatusCode(503, new { message = "Razorpay key secret is not configured." });

            if (!IsValidRazorpayCheckoutSignature(dto.RazorpayOrderId, dto.RazorpayPaymentId, dto.RazorpaySignature, keySecret))
                return Unauthorized(new { message = "Invalid Razorpay payment signature." });

            if (intent.Status != "paid")
            {
                intent.Status = "paid";
                intent.ProviderPaymentId = NormalizeNullable(dto.RazorpayPaymentId);
                intent.PaidAtUtc = DateTime.UtcNow;
                _db.PaymentEvents.Add(new PaymentEvent
                {
                    PaymentIntentId = intent.Id,
                    EventType = "razorpay.checkout.verified",
                    ProviderEventId = intent.ProviderPaymentId,
                    PayloadJson = JsonSerializer.Serialize(dto)
                });

                if (!string.IsNullOrWhiteSpace(intent.ModuleCode))
                    await _licensing.ActivateModuleAsync(intent.TenantId, intent.ModuleCode, intent.AmountInr, "payment", intent.Id, ct);

                await ApplyPaymentToOpenInvoicesAsync(intent, ct);
                await _db.SaveChangesAsync(ct);
            }

            return Ok(new { intent.Id, intent.Status, activatedModule = intent.ModuleCode, intent.TenantId });
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpGet("/api/billing/invoices")]
        public async Task<IActionResult> ListInvoices([FromQuery] string? month, [FromQuery] string? status, [FromQuery] Guid? tenantId, CancellationToken ct)
        {
            if (!await CurrentTenantIsRootAsync(ct)) return Forbid();
            await EnsureBillingTablesAsync(ct);

            var query = _db.BillingInvoices
                .AsNoTracking()
                .Include(i => i.Tenant)
                .Include(i => i.Lines)
                .Include(i => i.PaymentIntent)
                    .ThenInclude(p => p!.Events)
                .AsQueryable();

            var period = ParseInvoiceMonth(month);
            if (period.HasValue)
            {
                query = query.Where(i => i.PeriodStartUtc == period.Value.start);
            }

            if (tenantId.HasValue) query = query.Where(i => i.TenantId == tenantId.Value);
            var normalizedStatus = NormalizeNullable(status)?.ToLowerInvariant();
            if (!string.IsNullOrWhiteSpace(normalizedStatus)) query = query.Where(i => i.Status == normalizedStatus);

            var invoices = await query
                .OrderByDescending(i => i.PeriodStartUtc)
                .ThenBy(i => i.Tenant!.Name)
                .Take(500)
                .ToListAsync(ct);

            var allForSummary = await _db.BillingInvoices.AsNoTracking().ToListAsync(ct);
            var donationRecords = await _db.PaymentIntents
                .AsNoTracking()
                .Include(p => p.Tenant)
                .Include(p => p.Module)
                .Where(p => p.Purpose == "module_donation" && p.Status == "submitted")
                .OrderByDescending(p => p.CreatedAtUtc)
                .Take(200)
                .ToListAsync(ct);

            return Ok(new
            {
                summary = new
                {
                    invoiceCount = allForSummary.Count,
                    openAmountInr = allForSummary.Where(i => i.Status != "paid").Sum(i => i.TotalInr - i.PaidInr),
                    paidAmountInr = allForSummary.Sum(i => i.PaidInr),
                    monthlyRecurringInr = await _db.TenantModuleLicenses.AsNoTracking()
                        .Where(l => l.Status == "active" && l.PriceInr > 0 && (l.EndsAtUtc == null || l.EndsAtUtc > DateTime.UtcNow))
                        .SumAsync(l => l.PriceInr, ct)
                },
                items = invoices.Select(ToInvoiceDto),
                donationRecords = donationRecords.Select(ToDonationRecordDto)
            });
        }

        [Authorize]
        [HttpGet("/api/billing/tenants/current/invoices")]
        public async Task<IActionResult> ListCurrentTenantInvoices([FromQuery] string? month, [FromQuery] string? status, CancellationToken ct)
        {
            await EnsureBillingTablesAsync(ct);
            var tenant = await _tenantContext.GetCurrentTenantAsync(ct);
            if (tenant == null) return NotFound(new { message = "Tenant not found." });

            var query = _db.BillingInvoices
                .AsNoTracking()
                .Include(i => i.Tenant)
                .Include(i => i.Lines)
                .Include(i => i.PaymentIntent)
                    .ThenInclude(p => p!.Events)
                .Where(i => i.TenantId == tenant.Id);

            var period = ParseInvoiceMonth(month);
            if (period.HasValue) query = query.Where(i => i.PeriodStartUtc == period.Value.start);

            var normalizedStatus = NormalizeNullable(status)?.ToLowerInvariant();
            if (!string.IsNullOrWhiteSpace(normalizedStatus)) query = query.Where(i => i.Status == normalizedStatus);

            var invoices = await query
                .OrderByDescending(i => i.PeriodStartUtc)
                .Take(36)
                .ToListAsync(ct);

            return Ok(new
            {
                tenant = new { tenant.Id, tenant.Name, tenant.Slug },
                items = invoices.Select(ToInvoiceDto)
            });
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpPost("/api/billing/invoices/generate")]
        public async Task<IActionResult> GenerateMonthlyInvoices([FromBody] GenerateInvoicesRequest dto, CancellationToken ct)
        {
            if (!await CurrentTenantIsRootAsync(ct)) return Forbid();
            await EnsureBillingTablesAsync(ct);
            await _licensing.EnsureCatalogSeededAsync(ct);

            var period = ParseInvoiceMonth(dto.Month) ?? CurrentInvoiceMonth();
            var tenants = await _db.Tenants
                .AsNoTracking()
                .Where(t => !t.IsRootTenant && t.Status == "active")
                .OrderBy(t => t.Name)
                .ToListAsync(ct);

            var created = 0;
            var updated = 0;
            foreach (var tenant in tenants)
            {
                var licenses = await _db.TenantModuleLicenses
                    .AsNoTracking()
                    .Include(l => l.Module)
                    .Where(l =>
                        l.TenantId == tenant.Id &&
                        l.Status == "active" &&
                        l.StartsAtUtc < period.end &&
                        (l.EndsAtUtc == null || l.EndsAtUtc > period.start))
                    .OrderBy(l => l.ModuleCode)
                    .ToListAsync(ct);
                if (!licenses.Any()) continue;

                var invoice = await _db.BillingInvoices
                    .Include(i => i.Lines)
                    .FirstOrDefaultAsync(i => i.TenantId == tenant.Id && i.PeriodStartUtc == period.start, ct);
                if (invoice == null)
                {
                    invoice = new BillingInvoice
                    {
                        TenantId = tenant.Id,
                        InvoiceNumber = $"MIC-{period.start:yyyyMM}-{tenant.Slug}".ToUpperInvariant(),
                        PeriodStartUtc = period.start,
                        PeriodEndUtc = period.end,
                        Status = "open",
                        Currency = "INR",
                        CreatedAtUtc = DateTime.UtcNow,
                        UpdatedAtUtc = DateTime.UtcNow
                    };
                    _db.BillingInvoices.Add(invoice);
                    created++;
                }
                else
                {
                    updated++;
                }

                foreach (var license in licenses)
                {
                    var existingLine = invoice.Lines.FirstOrDefault(l => l.ModuleCode == license.ModuleCode);
                    if (existingLine == null)
                    {
                        invoice.Lines.Add(new BillingInvoiceLine
                        {
                            ModuleCode = license.ModuleCode,
                            Description = license.Module?.Name ?? license.ModuleCode,
                            Quantity = 1,
                            UnitPriceInr = license.PriceInr,
                            AmountInr = license.PriceInr
                        });
                    }
                    else
                    {
                        existingLine.Description = license.Module?.Name ?? license.ModuleCode;
                        existingLine.UnitPriceInr = license.PriceInr;
                        existingLine.AmountInr = license.PriceInr;
                    }
                }

                invoice.SubtotalInr = invoice.Lines.Sum(l => l.AmountInr);
                invoice.TaxInr = 0;
                invoice.TotalInr = invoice.SubtotalInr + invoice.TaxInr;
                invoice.PaidInr = invoice.TotalInr == 0 ? 0 : Math.Min(invoice.PaidInr, invoice.TotalInr);
                invoice.Status = invoice.TotalInr == 0 ? "paid" : invoice.PaidInr >= invoice.TotalInr ? "paid" : invoice.PaidInr > 0 ? "partial" : "open";
                invoice.UpdatedAtUtc = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync(ct);
            return Ok(new { created, updated, periodStartUtc = period.start, periodEndUtc = period.end });
        }

        [Authorize(Roles = "admin,ADMIN")]
        [HttpPost("/api/billing/invoices/{invoiceId:guid}/payments")]
        public async Task<IActionResult> ApplyInvoicePayment(Guid invoiceId, [FromBody] ApplyInvoicePaymentRequest dto, CancellationToken ct)
        {
            if (!await CurrentTenantIsRootAsync(ct)) return Forbid();
            await EnsureBillingTablesAsync(ct);
            var invoice = await _db.BillingInvoices.FirstOrDefaultAsync(i => i.Id == invoiceId, ct);
            if (invoice == null) return NotFound(new { message = "Invoice not found." });

            PaymentIntent? intent = null;
            if (dto.PaymentIntentId.HasValue)
            {
                intent = await _db.PaymentIntents.FirstOrDefaultAsync(p => p.Id == dto.PaymentIntentId.Value, ct);
                if (intent == null) return NotFound(new { message = "Payment intent not found." });
                if (intent.TenantId != invoice.TenantId) return BadRequest(new { message = "Payment belongs to another tenant." });
            }

            var amount = dto.AmountInr ?? intent?.AmountInr ?? Math.Max(0, invoice.TotalInr - invoice.PaidInr);
            invoice.PaidInr = Math.Min(invoice.TotalInr, invoice.PaidInr + Math.Max(0, amount));
            invoice.Status = invoice.PaidInr >= invoice.TotalInr ? "paid" : invoice.PaidInr > 0 ? "partial" : "open";
            invoice.PaymentIntentId = intent?.Id ?? invoice.PaymentIntentId;
            invoice.UpdatedAtUtc = DateTime.UtcNow;

            if (intent != null && intent.Status != "paid")
            {
                intent.Status = "paid";
                intent.ProviderPaymentId = NormalizeNullable(dto.ProviderPaymentId) ?? intent.ProviderPaymentId;
                intent.PaidAtUtc = DateTime.UtcNow;
                _db.PaymentEvents.Add(new PaymentEvent
                {
                    PaymentIntentId = intent.Id,
                    EventType = "invoice.payment.applied",
                    ProviderEventId = intent.ProviderPaymentId,
                    PayloadJson = JsonSerializer.Serialize(new { invoiceId, dto.AmountInr, dto.Note })
                });
            }

            await _db.SaveChangesAsync(ct);
            return Ok(ToInvoiceDto(invoice));
        }

        private async Task<(string orderId, string keyId)> CreateRazorpayOrderAsync(PaymentIntent intent, string tenantSlug, string moduleCode, CancellationToken ct)
        {
            var keyId = _config["Billing:RazorpayKeyId"];
            var keySecret = _config["Billing:RazorpayKeySecret"];
            if (string.IsNullOrWhiteSpace(keyId) || string.IsNullOrWhiteSpace(keySecret))
                throw new InvalidOperationException("Razorpay key id/secret are not configured.");

            using var client = new HttpClient();
            var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{keyId}:{keySecret}"));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);

            var payload = new
            {
                amount = decimal.ToInt32(decimal.Round(intent.AmountInr * 100, 0)),
                currency = intent.Currency,
                receipt = intent.Id.ToString("N"),
                notes = new
                {
                    paymentIntentId = intent.Id.ToString(),
                    tenant = tenantSlug,
                    module = moduleCode
                }
            };

            using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            using var response = await client.PostAsync("https://api.razorpay.com/v1/orders", content, ct);
            var body = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"Razorpay order creation failed: {(int)response.StatusCode} {body}");

            using var doc = JsonDocument.Parse(body);
            var orderId = doc.RootElement.TryGetProperty("id", out var idNode) ? idNode.GetString() : null;
            if (string.IsNullOrWhiteSpace(orderId))
                throw new InvalidOperationException("Razorpay order response did not include order id.");

            return (orderId, keyId);
        }

        private async Task<bool> UserExistsInTenantAsync(Guid tenantId, string username, string? email, CancellationToken ct)
        {
            var conn = (NpgsqlConnection)_db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync(ct);
            var tx = (NpgsqlTransaction?)_db.Database.CurrentTransaction?.GetDbTransaction();

            await using var cmd = new NpgsqlCommand(@"
SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE tenant_id = @tenant_id
      AND (
          lower(trim(username)) = lower(trim(@username))
          OR (@email IS NOT NULL AND lower(trim(email)) = lower(trim(@email)))
      )
);", conn, tx);
            cmd.Parameters.AddWithValue("tenant_id", NpgsqlDbType.Uuid, tenantId);
            cmd.Parameters.AddWithValue("username", NpgsqlDbType.Text, username);
            cmd.Parameters.AddWithValue("email", NpgsqlDbType.Text, (object?)email ?? DBNull.Value);
            var result = await cmd.ExecuteScalarAsync(ct);
            return result is bool exists && exists;
        }

        private sealed record TenantUserCounts(int Total = 0, int Admins = 0, int Staff = 0, int Members = 0, int Volunteers = 0, int Other = 0);
        private sealed record TenantAdminUser(Guid Id, string? UserCode, string? Username, string? DisplayName, string? Email, string? Phone, string? Role);

        private async Task<Dictionary<Guid, TenantUserCounts>> ReadTenantUserCountsAsync(CancellationToken ct)
        {
            var result = new Dictionary<Guid, TenantUserCounts>();
            var conn = (NpgsqlConnection)_db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync(ct);

            await using var cmd = new NpgsqlCommand(@"
SELECT
    tenant_id,
    count(*)::int AS total,
    count(*) FILTER (WHERE lower(role::text) IN ('admin', '1'))::int AS admins,
    count(*) FILTER (WHERE lower(role::text) IN ('staff', '2'))::int AS staff,
    count(*) FILTER (WHERE lower(role::text) IN ('member', '3'))::int AS members,
    count(*) FILTER (WHERE lower(role::text) IN ('volunteer', '4'))::int AS volunteers,
    count(*) FILTER (WHERE lower(role::text) NOT IN ('admin', '1', 'staff', '2', 'member', '3', 'volunteer', '4'))::int AS other
FROM public.users
WHERE tenant_id IS NOT NULL
GROUP BY tenant_id;", conn);

            await using var rdr = await cmd.ExecuteReaderAsync(ct);
            while (await rdr.ReadAsync(ct))
            {
                var tenantId = rdr.GetGuid(0);
                result[tenantId] = new TenantUserCounts(
                    rdr.GetInt32(1),
                    rdr.GetInt32(2),
                    rdr.GetInt32(3),
                    rdr.GetInt32(4),
                    rdr.GetInt32(5),
                    rdr.GetInt32(6));
            }

            return result;
        }

        private async Task<Dictionary<Guid, List<TenantAdminUser>>> ReadTenantAdminsAsync(CancellationToken ct)
        {
            var result = new Dictionary<Guid, List<TenantAdminUser>>();
            var conn = (NpgsqlConnection)_db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync(ct);

            await using var cmd = new NpgsqlCommand(@"
SELECT id, tenant_id, ""UserCode"", username, displayname, email, phone, role::text
FROM public.users
WHERE tenant_id IS NOT NULL
  AND lower(role::text) IN ('admin', '1')
ORDER BY tenant_id, username;", conn);

            await using var rdr = await cmd.ExecuteReaderAsync(ct);
            while (await rdr.ReadAsync(ct))
            {
                var tenantId = rdr.GetGuid(1);
                if (!result.TryGetValue(tenantId, out var admins))
                {
                    admins = new List<TenantAdminUser>();
                    result[tenantId] = admins;
                }

                admins.Add(new TenantAdminUser(
                    rdr.GetGuid(0),
                    rdr["UserCode"] as string,
                    rdr["username"] as string,
                    rdr["displayname"] as string,
                    rdr["email"] as string,
                    rdr["phone"] as string,
                    rdr["role"] as string));
            }

            return result;
        }

        private async Task<Guid> CreateTenantAdminUserAsync(
            Guid tenantId,
            string username,
            string displayName,
            string? email,
            string? phone,
            string password,
            CancellationToken ct)
        {
            var conn = (NpgsqlConnection)_db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync(ct);
            var tx = (NpgsqlTransaction?)_db.Database.CurrentTransaction?.GetDbTransaction();

            var roleId = await ResolveAdminRoleIdAsync(conn, tx, ct);
            var passwordHash = new PasswordHasher<object>().HashPassword(null!, password);
            var prefix = await ReadTenantUserCodePrefixAsync(conn, tx, tenantId, ct);
            var userCode = await GenerateTenantUserCodeAsync(conn, tx, prefix, ct);

            await using var cmd = new NpgsqlCommand(@"
INSERT INTO public.users
    (id, tenant_id, ""UserCode"", username, email, phone, displayname, passwordhash, role, joindate)
VALUES
    (gen_random_uuid(), @tenant_id, @user_code, @username, @email, @phone, @displayname, @passwordhash, @role, now())
RETURNING id;", conn, tx);

            cmd.Parameters.AddWithValue("tenant_id", NpgsqlDbType.Uuid, tenantId);
            cmd.Parameters.AddWithValue("user_code", NpgsqlDbType.Text, userCode);
            cmd.Parameters.AddWithValue("username", NpgsqlDbType.Text, username);
            cmd.Parameters.AddWithValue("email", NpgsqlDbType.Text, (object?)email ?? DBNull.Value);
            cmd.Parameters.AddWithValue("phone", NpgsqlDbType.Text, (object?)phone ?? DBNull.Value);
            cmd.Parameters.AddWithValue("displayname", NpgsqlDbType.Text, displayName);
            cmd.Parameters.AddWithValue("passwordhash", NpgsqlDbType.Text, passwordHash);
            cmd.Parameters.AddWithValue("role", NpgsqlDbType.Integer, roleId);

            var id = await cmd.ExecuteScalarAsync(ct);
            return Guid.TryParse(id?.ToString(), out var userId) ? userId : Guid.Empty;
        }

        private async Task<Guid> CreateTenantUserAsync(
            Guid tenantId,
            string username,
            string displayName,
            string? email,
            string? phone,
            string password,
            string roleName,
            CancellationToken ct)
        {
            var conn = (NpgsqlConnection)_db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync(ct);
            var tx = (NpgsqlTransaction?)_db.Database.CurrentTransaction?.GetDbTransaction();

            var roleId = await ResolveRoleIdAsync(conn, tx, roleName, roleName == "admin" ? 1 : 3, ct);
            var passwordHash = new PasswordHasher<object>().HashPassword(null!, password);
            var prefix = await ReadTenantUserCodePrefixAsync(conn, tx, tenantId, ct);
            var userCode = await GenerateTenantUserCodeAsync(conn, tx, prefix, ct);

            await using var cmd = new NpgsqlCommand(@"
INSERT INTO public.users
    (id, tenant_id, ""UserCode"", username, email, phone, displayname, passwordhash, role, joindate)
VALUES
    (gen_random_uuid(), @tenant_id, @user_code, @username, @email, @phone, @displayname, @passwordhash, @role, now())
RETURNING id;", conn, tx);

            cmd.Parameters.AddWithValue("tenant_id", NpgsqlDbType.Uuid, tenantId);
            cmd.Parameters.AddWithValue("user_code", NpgsqlDbType.Text, userCode);
            cmd.Parameters.AddWithValue("username", NpgsqlDbType.Text, username);
            cmd.Parameters.AddWithValue("email", NpgsqlDbType.Text, (object?)email ?? DBNull.Value);
            cmd.Parameters.AddWithValue("phone", NpgsqlDbType.Text, (object?)phone ?? DBNull.Value);
            cmd.Parameters.AddWithValue("displayname", NpgsqlDbType.Text, displayName);
            cmd.Parameters.AddWithValue("passwordhash", NpgsqlDbType.Text, passwordHash);
            cmd.Parameters.AddWithValue("role", NpgsqlDbType.Integer, roleId);

            var id = await cmd.ExecuteScalarAsync(ct);
            return Guid.TryParse(id?.ToString(), out var userId) ? userId : Guid.Empty;
        }

        private static async Task<string> GenerateTenantUserCodeAsync(NpgsqlConnection conn, NpgsqlTransaction? tx, string? prefix, CancellationToken ct)
        {
            var cleanPrefix = NormalizeUserCodePrefix(prefix, null);
            for (var attempt = 0; attempt < 50; attempt++)
            {
                var code = $"{cleanPrefix}{Random.Shared.Next(1, 999999):D6}";
                await using var cmd = new NpgsqlCommand(
                    @"SELECT COUNT(*) FROM public.users WHERE ""UserCode"" = @code;",
                    conn,
                    tx);
                cmd.Parameters.AddWithValue("code", NpgsqlDbType.Text, code);
                var exists = Convert.ToInt32(await cmd.ExecuteScalarAsync(ct)) > 0;
                if (!exists) return code;
            }

            return $"{cleanPrefix}{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() % 100000000:D8}";
        }

        private static async Task<string> ReadTenantUserCodePrefixAsync(NpgsqlConnection conn, NpgsqlTransaction? tx, Guid tenantId, CancellationToken ct)
        {
            await using var columnCmd = new NpgsqlCommand(@"
SELECT 1
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tenants'
  AND column_name = 'user_code_prefix'
LIMIT 1;", conn, tx);
            var hasColumn = await columnCmd.ExecuteScalarAsync(ct) != null;
            if (!hasColumn) return "MHN";

            await using var cmd = new NpgsqlCommand(@"
SELECT user_code_prefix
FROM public.tenants
WHERE id = @tenant_id
LIMIT 1;", conn, tx);
            cmd.Parameters.AddWithValue("tenant_id", NpgsqlDbType.Uuid, tenantId);
            var value = await cmd.ExecuteScalarAsync(ct);
            return NormalizeUserCodePrefix(value?.ToString(), null);
        }

        private static async Task<int> ResolveAdminRoleIdAsync(NpgsqlConnection conn, NpgsqlTransaction? tx, CancellationToken ct)
        {
            return await ResolveRoleIdAsync(conn, tx, "admin", 1, ct);
        }

        private static async Task<int> ResolveRoleIdAsync(NpgsqlConnection conn, NpgsqlTransaction? tx, string roleName, int fallbackRoleId, CancellationToken ct)
        {
            await using var cmd = new NpgsqlCommand(@"
SELECT id
FROM public.roles
WHERE lower(trim(name)) = lower(trim(@role_name))
ORDER BY id
LIMIT 1;", conn, tx);
            cmd.Parameters.AddWithValue("role_name", NpgsqlDbType.Text, roleName);
            var result = await cmd.ExecuteScalarAsync(ct);
            return int.TryParse(result?.ToString(), out var roleId) ? roleId : fallbackRoleId;
        }

        private static object ToLandingDto(TenantLandingConfig? config) => new
        {
            logoUrl = config?.LogoUrl,
            heroImageUrl = config?.HeroImageUrl,
            heroTitle = config?.HeroTitle,
            heroSubtitle = config?.HeroSubtitle,
            primaryColor = config?.PrimaryColor,
            accentColor = config?.AccentColor,
            contactEmail = config?.ContactEmail,
            contactPhone = config?.ContactPhone,
            address = config?.Address,
            serviceTimes = ParseJson(config?.ServiceTimesJson),
            socialLinks = ParseJson(config?.SocialLinksJson),
            sections = ParseJson(config?.SectionsJson),
            published = config?.Published ?? false,
            updatedAtUtc = config?.UpdatedAtUtc
        };

        private static (DateTime start, DateTime end) CurrentInvoiceMonth()
        {
            var now = DateTime.UtcNow;
            var start = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            return (start, start.AddMonths(1));
        }

        private static (DateTime start, DateTime end)? ParseInvoiceMonth(string? month)
        {
            if (string.IsNullOrWhiteSpace(month)) return null;
            var value = month.Trim();
            if (DateTime.TryParse($"{value}-01", out var parsed) || DateTime.TryParse(value, out parsed))
            {
                var start = new DateTime(parsed.Year, parsed.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                return (start, start.AddMonths(1));
            }
            return null;
        }

        private async Task EnsureCurrentMonthBillingForModuleAsync(
            Guid tenantId,
            string moduleCode,
            string moduleName,
            decimal priceInr,
            Guid? paymentIntentId,
            CancellationToken ct)
        {
            var period = CurrentInvoiceMonth();
            var tenant = await _db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId, ct);
            if (tenant == null) return;

            var invoice = await _db.BillingInvoices
                .Include(i => i.Lines)
                .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.PeriodStartUtc == period.start, ct);

            if (invoice == null)
            {
                invoice = new BillingInvoice
                {
                    TenantId = tenantId,
                    InvoiceNumber = $"MIC-{period.start:yyyyMM}-{tenant.Slug}".ToUpperInvariant(),
                    PeriodStartUtc = period.start,
                    PeriodEndUtc = period.end,
                    Currency = "INR",
                    Status = "open",
                    PaymentIntentId = paymentIntentId,
                    CreatedAtUtc = DateTime.UtcNow,
                    UpdatedAtUtc = DateTime.UtcNow
                };
                _db.BillingInvoices.Add(invoice);
            }
            else if (paymentIntentId.HasValue && invoice.PaymentIntentId == null)
            {
                invoice.PaymentIntentId = paymentIntentId;
            }

            var code = NormalizeCode(moduleCode);
            var line = invoice.Lines.FirstOrDefault(l => l.ModuleCode == code);
            if (line == null)
            {
                invoice.Lines.Add(new BillingInvoiceLine
                {
                    ModuleCode = code,
                    Description = string.IsNullOrWhiteSpace(moduleName) ? code : moduleName,
                    Quantity = 1,
                    UnitPriceInr = Math.Max(0, priceInr),
                    AmountInr = Math.Max(0, priceInr),
                    CreatedAtUtc = DateTime.UtcNow
                });
            }
            else
            {
                line.Description = string.IsNullOrWhiteSpace(moduleName) ? code : moduleName;
                line.UnitPriceInr = Math.Max(0, priceInr);
                line.AmountInr = Math.Max(0, priceInr);
            }

            invoice.SubtotalInr = invoice.Lines.Sum(l => l.AmountInr);
            invoice.TaxInr = 0;
            invoice.TotalInr = invoice.SubtotalInr + invoice.TaxInr;
            invoice.PaidInr = invoice.TotalInr == 0 ? 0 : Math.Min(invoice.PaidInr, invoice.TotalInr);
            invoice.Status = invoice.TotalInr == 0 ? "paid" : invoice.PaidInr >= invoice.TotalInr ? "paid" : invoice.PaidInr > 0 ? "partial" : "open";
            invoice.UpdatedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
        }

        private static object ToInvoiceDto(BillingInvoice invoice) => new
        {
            invoice.Id,
            invoice.InvoiceNumber,
            invoice.TenantId,
            tenantName = invoice.Tenant?.Name,
            tenantSlug = invoice.Tenant?.Slug,
            invoice.PeriodStartUtc,
            invoice.PeriodEndUtc,
            invoice.SubtotalInr,
            invoice.TaxInr,
            invoice.TotalInr,
            invoice.PaidInr,
            balanceInr = invoice.TotalInr - invoice.PaidInr,
            invoice.Currency,
            invoice.Status,
            invoice.PaymentIntentId,
            invoice.CreatedAtUtc,
            invoice.UpdatedAtUtc,
            lines = (invoice.Lines ?? new List<BillingInvoiceLine>()).Select(line => new
            {
                line.Id,
                line.ModuleCode,
                line.Description,
                line.Quantity,
                line.UnitPriceInr,
                line.AmountInr
            }),
            paymentRecords = invoice.PaymentIntent == null
                ? Array.Empty<object>()
                : new object[]
                {
                    new
                    {
                        invoice.PaymentIntent.Id,
                        invoice.PaymentIntent.Purpose,
                        invoice.PaymentIntent.ModuleCode,
                        invoice.PaymentIntent.AmountInr,
                        invoice.PaymentIntent.Currency,
                        invoice.PaymentIntent.Provider,
                        invoice.PaymentIntent.Status,
                        invoice.PaymentIntent.ProviderPaymentId,
                        invoice.PaymentIntent.MetadataJson,
                        invoice.PaymentIntent.CreatedAtUtc,
                        invoice.PaymentIntent.PaidAtUtc,
                        events = (invoice.PaymentIntent.Events ?? new List<PaymentEvent>())
                            .OrderByDescending(e => e.CreatedAtUtc)
                            .Select(e => new
                            {
                                e.Id,
                                e.EventType,
                                e.ProviderEventId,
                                e.PayloadJson,
                                e.CreatedAtUtc
                            })
                    }
                }
        };

        private static object ToDonationRecordDto(PaymentIntent intent) => new
        {
            intent.Id,
            intent.TenantId,
            tenantName = intent.Tenant?.Name,
            tenantSlug = intent.Tenant?.Slug,
            intent.ModuleCode,
            moduleName = intent.Module?.Name,
            intent.AmountInr,
            intent.Currency,
            intent.Provider,
            intent.Status,
            intent.ProviderPaymentId,
            intent.MetadataJson,
            intent.CreatedAtUtc,
            intent.ExpiresAtUtc
        };

        private async Task LinkPaymentIntentToOpenInvoiceAsync(PaymentIntent intent, CancellationToken ct)
        {
            var invoice = await _db.BillingInvoices
                .Where(i => i.TenantId == intent.TenantId && i.Status != "paid")
                .OrderBy(i => i.PeriodStartUtc)
                .FirstOrDefaultAsync(ct);

            if (invoice == null)
            {
                var period = CurrentInvoiceMonth();
                invoice = await _db.BillingInvoices
                    .Include(i => i.Lines)
                    .FirstOrDefaultAsync(i => i.TenantId == intent.TenantId && i.PeriodStartUtc == period.start, ct);
                if (invoice == null)
                {
                    var tenant = await _db.Tenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == intent.TenantId, ct);
                    var module = !string.IsNullOrWhiteSpace(intent.ModuleCode)
                        ? await _db.ModuleCatalog.AsNoTracking().FirstOrDefaultAsync(m => m.Code == intent.ModuleCode, ct)
                        : null;
                    invoice = new BillingInvoice
                    {
                        TenantId = intent.TenantId,
                        InvoiceNumber = $"MIC-{period.start:yyyyMM}-{tenant?.Slug ?? intent.TenantId.ToString("N").Substring(0, 8)}".ToUpperInvariant(),
                        PeriodStartUtc = period.start,
                        PeriodEndUtc = period.end,
                        Status = "open",
                        SubtotalInr = intent.AmountInr,
                        TotalInr = intent.AmountInr,
                        PaidInr = 0,
                        Currency = intent.Currency
                    };
                    invoice.Lines.Add(new BillingInvoiceLine
                    {
                        InvoiceId = invoice.Id,
                        ModuleCode = intent.ModuleCode ?? "donation",
                        Description = module?.Name ?? intent.ModuleCode ?? "Module donation",
                        Quantity = 1,
                        UnitPriceInr = intent.AmountInr,
                        AmountInr = intent.AmountInr
                    });
                    _db.BillingInvoices.Add(invoice);
                }
            }

            invoice.PaymentIntentId = intent.Id;
            invoice.UpdatedAtUtc = DateTime.UtcNow;
        }

        private async Task ApplyPaymentToOpenInvoicesAsync(PaymentIntent intent, CancellationToken ct)
        {
            var invoice = await _db.BillingInvoices
                .Where(i => i.TenantId == intent.TenantId && i.Status != "paid")
                .OrderBy(i => i.PeriodStartUtc)
                .FirstOrDefaultAsync(ct);
            if (invoice == null) return;

            invoice.PaidInr = Math.Min(invoice.TotalInr, invoice.PaidInr + intent.AmountInr);
            invoice.PaymentIntentId = intent.Id;
            invoice.Status = invoice.PaidInr >= invoice.TotalInr ? "paid" : "partial";
            invoice.UpdatedAtUtc = DateTime.UtcNow;
        }

        private static bool IsValidRazorpayCheckoutSignature(string orderId, string paymentId, string signature, string secret)
        {
            if (string.IsNullOrWhiteSpace(orderId) ||
                string.IsNullOrWhiteSpace(paymentId) ||
                string.IsNullOrWhiteSpace(signature)) return false;

            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var payload = $"{orderId}|{paymentId}";
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var computed = Convert.ToHexString(hash).ToLowerInvariant();
            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(computed),
                Encoding.UTF8.GetBytes(signature.Trim().ToLowerInvariant()));
        }

        private async Task EnsureBillingTablesAsync(CancellationToken ct)
        {
            await _db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS public.billing_invoices (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    invoice_number varchar(80) NOT NULL UNIQUE,
    period_start_utc timestamptz NOT NULL,
    period_end_utc timestamptz NOT NULL,
    subtotal_inr numeric(12,2) NOT NULL DEFAULT 0,
    tax_inr numeric(12,2) NOT NULL DEFAULT 0,
    total_inr numeric(12,2) NOT NULL DEFAULT 0,
    paid_inr numeric(12,2) NOT NULL DEFAULT 0,
    currency varchar(8) NOT NULL DEFAULT 'INR',
    status varchar(32) NOT NULL DEFAULT 'open',
    payment_intent_id uuid NULL REFERENCES public.payment_intents(id) ON DELETE SET NULL,
    created_at_utc timestamptz NOT NULL DEFAULT now(),
    updated_at_utc timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_invoices_tenant_period
    ON public.billing_invoices (tenant_id, period_start_utc);
CREATE INDEX IF NOT EXISTS ix_billing_invoices_status
    ON public.billing_invoices (status);

CREATE TABLE IF NOT EXISTS public.billing_invoice_lines (
    id uuid PRIMARY KEY,
    invoice_id uuid NOT NULL REFERENCES public.billing_invoices(id) ON DELETE CASCADE,
    module_code varchar(64) NOT NULL REFERENCES public.module_catalog(code) ON DELETE RESTRICT,
    description text NOT NULL,
    quantity integer NOT NULL DEFAULT 1,
    unit_price_inr numeric(12,2) NOT NULL DEFAULT 0,
    amount_inr numeric(12,2) NOT NULL DEFAULT 0,
    created_at_utc timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_billing_invoice_lines_invoice
    ON public.billing_invoice_lines (invoice_id);
", ct);
        }

        private async Task EnsureTenantModuleRequestsTableAsync(CancellationToken ct)
        {
            await _db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS public.tenant_module_requests (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    module_code varchar(64) NOT NULL REFERENCES public.module_catalog(code) ON DELETE RESTRICT,
    requested_by_user_id uuid NULL,
    requested_by_name text NULL,
    requested_by_email text NULL,
    status varchar(32) NOT NULL DEFAULT 'pending',
    admin_notes text NULL,
    requested_at_utc timestamptz NOT NULL DEFAULT now(),
    reviewed_at_utc timestamptz NULL,
    reviewed_by_user_id uuid NULL,
    notification_email_sent boolean NOT NULL DEFAULT false,
    jai_masih_message_sent boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_module_requests_pending
    ON public.tenant_module_requests (tenant_id, module_code)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS ix_tenant_module_requests_status_requested
    ON public.tenant_module_requests (status, requested_at_utc DESC);
", ct);
        }

        private Guid GetCurrentUserId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? User.FindFirstValue("nameid");
            return Guid.TryParse(id, out var parsed) ? parsed : Guid.Empty;
        }

        private async Task<User?> FindSambitAsync(CancellationToken ct)
        {
            const string email = "sambit.rout@mahimaministries.in";
            const string username = "sambitr";
            return await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u =>
                    (u.Email != null && u.Email.ToLower() == email) ||
                    (u.Username != null && u.Username.ToLower() == username) ||
                    (u.UserCode != null && u.UserCode.ToUpper() == "SAMBITR") ||
                    (u.DisplayName != null && u.DisplayName.ToLower() == username), ct);
        }

        private async Task AddModuleRequestNotificationAsync(
            TenantModuleRequest request,
            Tenant tenant,
            ModuleCatalogItem module,
            Guid? sambitUserId,
            CancellationToken ct)
        {
            var data = JsonSerializer.Serialize(new
            {
                requestId = request.Id,
                tenantId = request.TenantId,
                tenantName = tenant.Name,
                tenantSlug = tenant.Slug,
                moduleCode = request.ModuleCode,
                moduleName = module.Name,
                monthlyPriceInr = module.MonthlyPriceInr,
                requestedByUserId = request.RequestedByUserId,
                requestedByName = request.RequestedByName,
                requestedByEmail = request.RequestedByEmail
            });

            _db.AdminNotifications.Add(new AdminNotification
            {
                TenantId = tenant.Id,
                UserId = sambitUserId,
                Type = "TenantModuleRequest",
                Message = $"{tenant.Name} requested {module.Name}.",
                Data = data,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync(ct);
        }

        private async Task<bool> TrySendModuleRequestEmailAsync(TenantModuleRequest request, Tenant tenant, ModuleCatalogItem module)
        {
            try
            {
                var tenantUrl = BuildTenantPublicUrl(tenant);
                var subject = $"Tenant subscription request: {tenant.Name} - {module.Name}";
                var html = $@"
<h2>New tenant subscription request</h2>
<p><strong>Tenant:</strong> {WebUtility.HtmlEncode(tenant.Name)} ({WebUtility.HtmlEncode(tenant.Slug)})</p>
<p><strong>Tenant URL:</strong> {WebUtility.HtmlEncode(tenantUrl)}</p>
<p><strong>Package:</strong> {WebUtility.HtmlEncode(module.Name)} - Rs {module.MonthlyPriceInr:0}/mo</p>
<p><strong>Requested by:</strong> {WebUtility.HtmlEncode(request.RequestedByName ?? "")} {WebUtility.HtmlEncode(request.RequestedByEmail ?? "")}</p>
<p>Open Mahima Tenant Administration to approve or reject this request.</p>";
                await _email.SendAsync("sambit.rout@mahimaministries.in", subject, html);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Tenant module request email failed for request {RequestId}", request.Id);
                return false;
            }
        }

        private async Task<bool> TrySendModuleRequestChatAsync(TenantModuleRequest request, Guid requesterId, Guid? sambitUserId)
        {
            if (!sambitUserId.HasValue || requesterId == Guid.Empty || requesterId == sambitUserId.Value)
                return false;

            try
            {
                var chat = await _chat.CreateOrGetDirectChatAsync(requesterId, sambitUserId.Value);
                var message = await _chat.AddMessageAsync(
                    chat.Id,
                    requesterId,
                    $"Subscription approval needed: {request.RequestedByName ?? "Tenant admin"} requested {request.ModuleCode}. Please approve it from Tenant Administration.",
                    "text");

                var members = (await _chat.GetChatMemberIdsAsync(chat.Id)).Distinct().ToList();
                await _hub.Clients.Users(members.Select(id => id.ToString())).SendAsync("ReceiveMessage", message);
                if (_mobilePush != null)
                    await _mobilePush.NotifyChatMessageAsync(chat.Id, requesterId, members, message);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Jai Masih module request message failed for request {RequestId}", request.Id);
                return false;
            }
        }

        private static JsonElement? ParseJson(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return null;
            try
            {
                return JsonDocument.Parse(json).RootElement.Clone();
            }
            catch
            {
                return null;
            }
        }

        private static string? JsonOrNull(JsonElement? element)
        {
            if (!element.HasValue || element.Value.ValueKind == JsonValueKind.Null || element.Value.ValueKind == JsonValueKind.Undefined)
                return null;
            return element.Value.GetRawText();
        }

        private static string NormalizeSlug(string? value)
        {
            var raw = string.IsNullOrWhiteSpace(value) ? "tenant" : value.Trim().ToLowerInvariant();
            var chars = raw.Select(ch => char.IsLetterOrDigit(ch) ? ch : '-').ToArray();
            return string.Join("-", new string(chars).Split('-', StringSplitOptions.RemoveEmptyEntries));
        }

        private static string NormalizeUserCodePrefix(string? value, string? fallbackSlug)
        {
            var raw = string.IsNullOrWhiteSpace(value) ? fallbackSlug : value;
            var cleaned = new string((raw ?? "MHN").ToUpperInvariant().Where(char.IsLetterOrDigit).ToArray());
            if (cleaned.Length < 2)
                cleaned = "MHN";
            return cleaned.Length > 12 ? cleaned[..12] : cleaned;
        }

        private static string NormalizeUsername(string? value)
        {
            var raw = string.IsNullOrWhiteSpace(value) ? "church-admin" : value.Trim().ToLowerInvariant();
            var chars = raw.Select(ch => char.IsLetterOrDigit(ch) || ch == '.' || ch == '_' || ch == '-' ? ch : '-').ToArray();
            return string.Join("-", new string(chars).Split('-', StringSplitOptions.RemoveEmptyEntries));
        }

        private static string NormalizeCode(string value)
        {
            var raw = string.IsNullOrWhiteSpace(value) ? "" : value.Trim().ToLowerInvariant();
            var chars = raw.Select(ch => char.IsLetterOrDigit(ch) ? ch : ch == '_' || ch == '-' ? '_' : '_').ToArray();
            return string.Join("_", new string(chars).Split('_', StringSplitOptions.RemoveEmptyEntries));
        }
        private static string? NormalizeNullable(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        private static string? NormalizeDomain(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            var domain = value.Trim().ToLowerInvariant();
            if (domain.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                domain.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                if (Uri.TryCreate(domain, UriKind.Absolute, out var uri))
                    domain = uri.Host;
            }
            domain = domain.Trim().Trim('/').Trim('.');
            if (domain.StartsWith("www.", StringComparison.Ordinal)) domain = domain[4..];
            return domain.Length == 0 ? null : domain;
        }

        private static string NewDomainVerificationToken()
        {
            return $"mahima-verify-{Guid.NewGuid():N}";
        }

        private object? BuildDomainSetupInstructions(Tenant tenant)
        {
            return BuildDomainSetupInstructions(tenant.Domain, tenant.DomainStatus, tenant.DomainVerificationToken);
        }

        private object? BuildDomainSetupInstructions(string? domain, string? domainStatus, string? verificationToken)
        {
            if (string.IsNullOrWhiteSpace(domain)) return null;
            var targetHost = NormalizeNullable(_config["Saas:DomainCnameTarget"])
                ?? NormalizeNullable(_config["Saas:PublicHost"])
                ?? "beta.mahimaministries.in";
            var targetIp = NormalizeNullable(_config["Saas:DomainTargetIp"]);
            return new
            {
                Domain = NormalizeDomain(domain),
                DomainStatus = domainStatus,
                DomainVerificationToken = verificationToken,
                txt = new
                {
                    type = "TXT",
                    host = "_mahima",
                    value = verificationToken
                },
                cname = new
                {
                    type = "CNAME",
                    host = "app",
                    value = targetHost,
                    note = "Use this if the tenant wants a subdomain such as app.churchdomain.org."
                },
                a = new
                {
                    type = "A",
                    host = "@",
                    value = targetIp,
                    note = string.IsNullOrWhiteSpace(targetIp)
                        ? "Set Saas:DomainTargetIp on the server to show the exact root-domain A record target."
                        : "Use this if the tenant wants the root domain itself."
                }
            };
        }

        private async Task<(bool ok, string message)> DomainResolvesToExpectedTargetAsync(string? domain, CancellationToken ct)
        {
            var normalized = NormalizeDomain(domain);
            if (string.IsNullOrWhiteSpace(normalized))
                return (false, "Domain is missing.");

            try
            {
                var addresses = await Dns.GetHostAddressesAsync(normalized, ct);
                if (addresses.Length == 0)
                    return (false, "Domain does not resolve yet. Please wait for DNS propagation.");

                var expectedIp = NormalizeNullable(_config["Saas:DomainTargetIp"]);
                if (!string.IsNullOrWhiteSpace(expectedIp) &&
                    !addresses.Any(a => string.Equals(a.ToString(), expectedIp, StringComparison.OrdinalIgnoreCase)))
                    return (false, $"Domain resolves, but not to the configured server IP {expectedIp}.");

                return (true, "Domain DNS is ready.");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Domain verification DNS lookup failed for {Domain}", normalized);
                return (false, "Domain does not resolve yet. Please check DNS records and try again.");
            }
        }

        private string BuildTenantPublicUrl(Tenant tenant)
        {
            return BuildTenantPublicUrl(tenant.Slug, tenant.Domain);
        }

        private string BuildTenantLoginUrl(Tenant tenant)
        {
            return BuildTenantLoginUrl(tenant.Slug, tenant.Domain);
        }

        private string BuildTenantPublicUrl(string slug, string? domain)
        {
            if (!string.IsNullOrWhiteSpace(domain))
                return $"https://{NormalizeDomain(domain)}/";
            return BuildTenantPublicUrl(slug);
        }

        private string BuildTenantLoginUrl(string slug, string? domain)
        {
            if (!string.IsNullOrWhiteSpace(domain))
                return $"https://{NormalizeDomain(domain)}/#/login";
            return $"{BuildTenantPublicUrl(slug).Split('#')[0]}#/login?tenantSlug={Uri.EscapeDataString(slug)}";
        }

        private string BuildTenantPublicUrl(string slug)
        {
            var baseUrl = NormalizeNullable(_config["Saas:PublicBaseUrl"])
                ?? (Request?.Host.HasValue == true ? $"{Request.Scheme}://{Request.Host.Value}" : null)
                ?? "https://beta.mahimaministries.in";
            return $"{baseUrl.TrimEnd('/')}/#/t/{Uri.EscapeDataString(slug)}";
        }

        private async Task<string?> SaveTenantLogoAsync(IFormFile? logo, string slug, CancellationToken ct)
        {
            if (logo == null || logo.Length == 0) return null;
            if (logo.Length > 5 * 1024 * 1024)
                throw new InvalidOperationException("Church logo must be 5 MB or smaller.");

            var contentType = (logo.ContentType ?? "").ToLowerInvariant();
            if (!contentType.StartsWith("image/"))
                throw new InvalidOperationException("Church logo must be an image file.");

            var extension = Path.GetExtension(logo.FileName ?? "").ToLowerInvariant();
            var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { ".png", ".jpg", ".jpeg", ".webp", ".gif" };
            if (!allowed.Contains(extension))
                extension = contentType switch
                {
                    "image/png" => ".png",
                    "image/webp" => ".webp",
                    "image/gif" => ".gif",
                    _ => ".jpg"
                };

            var uploadRoot = _config["Uploads:Root"]
                ?? Environment.GetEnvironmentVariable("MAHIMA_UPLOADS_ROOT")
                ?? (OperatingSystem.IsLinux()
                    ? "/var/www/mahima-uploads"
                    : Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "uploads"));
            var folder = Path.Combine(uploadRoot, "tenant-logos", NormalizeSlug(slug));
            Directory.CreateDirectory(folder);

            var fileName = $"{Guid.NewGuid():N}{extension}";
            var path = Path.Combine(folder, fileName);
            await using var stream = System.IO.File.Create(path);
            await logo.CopyToAsync(stream, ct);

            return $"/api/uploads/tenant-logos/{NormalizeSlug(slug)}/{fileName}";
        }

        private static string BuildUpiLink(string vpa, string payee, decimal amount, string txnRef, string note)
        {
            return "upi://pay" +
                   $"?pa={WebUtility.UrlEncode(vpa)}" +
                   $"&pn={WebUtility.UrlEncode(payee)}" +
                   $"&am={WebUtility.UrlEncode(amount.ToString("0.00"))}" +
                   "&cu=INR" +
                   $"&tr={WebUtility.UrlEncode(txnRef)}" +
                   $"&tn={WebUtility.UrlEncode(note)}";
        }
    }
}
