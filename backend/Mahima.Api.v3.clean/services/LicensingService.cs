using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Models;
using Microsoft.EntityFrameworkCore;

namespace Mahima.Api.v3.clean.Services
{
    public class LicensingService : ILicensingService
    {
        public const string BaseModule = "base";
        public const string ChatModule = "chat";
        public const string OperationsModule = "operations";
        public const string CareMinistryModule = "care_ministry";
        public const string AdminToolsModule = "admin_tools";
        public const string CommunicationsModule = "communications";

        private readonly MahimaDbContext _db;

        public LicensingService(MahimaDbContext db)
        {
            _db = db;
        }

        public async Task EnsureCatalogSeededAsync(CancellationToken ct = default)
        {
            var modules = new[]
            {
                new ModuleCatalogItem { Code = BaseModule, Name = "Free Essentials", Description = "Home, public landing page, landing editor, users, prayer requests, sermons, and teams.", MonthlyPriceInr = 0, IsBaseModule = true, DisplayOrder = 10 },
                new ModuleCatalogItem { Code = ChatModule, Name = "Jai Masih Chat", Description = "Direct chat, group chat, voice notes, calls, and chat safety.", MonthlyPriceInr = 499, IsBaseModule = false, DisplayOrder = 20 },
                new ModuleCatalogItem { Code = OperationsModule, Name = "Operations Suite", Description = "Tasks, attendance, payroll, costs, accounting, reports, and audit trail.", MonthlyPriceInr = 799, IsBaseModule = false, DisplayOrder = 30 },
                new ModuleCatalogItem { Code = CareMinistryModule, Name = "Care Ministry Suite", Description = "AI Pastor, marriage, baptism, counselling, and pastoral care workflows.", MonthlyPriceInr = 599, IsBaseModule = false, DisplayOrder = 40 },
                new ModuleCatalogItem { Code = AdminToolsModule, Name = "Administration Suite", Description = "Roles, pages, admin dashboard, live users, languages, and multi-tenant administration.", MonthlyPriceInr = 699, IsBaseModule = false, DisplayOrder = 50 },
                new ModuleCatalogItem { Code = CommunicationsModule, Name = "Communications Suite", Description = "Message center, email, Google Drive, server files, and app downloads.", MonthlyPriceInr = 599, IsBaseModule = false, DisplayOrder = 60 },
            };

            foreach (var module in modules)
            {
                var existing = await _db.ModuleCatalog.FirstOrDefaultAsync(m => m.Code == module.Code, ct);
                if (existing == null)
                {
                    _db.ModuleCatalog.Add(module);
                    continue;
                }

                existing.Name = module.Name;
                existing.Description = module.Description;
                existing.MonthlyPriceInr = module.MonthlyPriceInr;
                existing.IsBaseModule = module.IsBaseModule;
                existing.DisplayOrder = module.DisplayOrder;
                existing.Enabled = true;
                existing.UpdatedAtUtc = DateTime.UtcNow;
            }

            var legacyCodes = new[] { "payroll", "accounting", "automation" };
            var legacyModules = await _db.ModuleCatalog
                .Where(m => legacyCodes.Contains(m.Code))
                .ToListAsync(ct);
            foreach (var legacy in legacyModules)
            {
                legacy.Enabled = false;
                legacy.UpdatedAtUtc = DateTime.UtcNow;
            }

            var basePlan = await _db.SubscriptionPlans.FirstOrDefaultAsync(p => p.Code == "base-free", ct);
            if (basePlan == null)
            {
                basePlan = new SubscriptionPlan
                {
                    Code = "base-free",
                    Name = "Base Free",
                    Description = "Zero-priced plan matching today's member experience.",
                    MonthlyPriceInr = 0,
                    IsBaseFreePlan = true,
                    DisplayOrder = 10,
                };
                _db.SubscriptionPlans.Add(basePlan);
                await _db.SaveChangesAsync(ct);
            }

            var existingBasePlanModule = await _db.SubscriptionPlanModules
                .AnyAsync(pm => pm.PlanId == basePlan.Id && pm.ModuleCode == BaseModule, ct);
            if (!existingBasePlanModule)
                _db.SubscriptionPlanModules.Add(new SubscriptionPlanModule { PlanId = basePlan.Id, ModuleCode = BaseModule });

            await _db.SaveChangesAsync(ct);
        }

        public async Task<bool> HasModuleAsync(Guid tenantId, string moduleCode, CancellationToken ct = default)
        {
            if (tenantId == Guid.Empty || string.IsNullOrWhiteSpace(moduleCode)) return false;
            var code = moduleCode.Trim().ToLowerInvariant();

            var module = await _db.ModuleCatalog.AsNoTracking().FirstOrDefaultAsync(m => m.Code == code && m.Enabled, ct);
            if (module?.IsBaseModule == true) return true;

            var now = DateTime.UtcNow;
            return await _db.TenantModuleLicenses.AsNoTracking().AnyAsync(l =>
                l.TenantId == tenantId &&
                l.ModuleCode == code &&
                l.Status == "active" &&
                l.StartsAtUtc <= now &&
                (l.EndsAtUtc == null || l.EndsAtUtc > now), ct);
        }

        public async Task ActivateModuleAsync(Guid tenantId, string moduleCode, decimal priceInr, string source, Guid? paymentId = null, CancellationToken ct = default)
        {
            if (tenantId == Guid.Empty) throw new ArgumentException("tenantId is required", nameof(tenantId));
            if (string.IsNullOrWhiteSpace(moduleCode)) throw new ArgumentException("moduleCode is required", nameof(moduleCode));

            var code = moduleCode.Trim().ToLowerInvariant();
            var now = DateTime.UtcNow;
            var existing = await _db.TenantModuleLicenses
                .FirstOrDefaultAsync(l => l.TenantId == tenantId && l.ModuleCode == code && l.Status == "active", ct);

            if (existing == null)
            {
                _db.TenantModuleLicenses.Add(new TenantModuleLicense
                {
                    TenantId = tenantId,
                    ModuleCode = code,
                    Status = "active",
                    PriceInr = priceInr,
                    Source = string.IsNullOrWhiteSpace(source) ? "manual" : source.Trim().ToLowerInvariant(),
                    ActivatedByPaymentId = paymentId,
                    StartsAtUtc = now,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                });
            }
            else
            {
                existing.PriceInr = priceInr;
                existing.Source = string.IsNullOrWhiteSpace(source) ? existing.Source : source.Trim().ToLowerInvariant();
                existing.ActivatedByPaymentId = paymentId ?? existing.ActivatedByPaymentId;
                existing.EndsAtUtc = null;
                existing.UpdatedAtUtc = now;
            }

            await _db.SaveChangesAsync(ct);
        }
    }
}
