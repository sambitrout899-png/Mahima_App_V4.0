using System;
using System.Linq;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Data;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;

namespace Mahima.Api.v3.clean.Services
{
    public class TenantDomainVerificationService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IConfiguration _config;
        private readonly ILogger<TenantDomainVerificationService> _logger;

        public TenantDomainVerificationService(
            IServiceScopeFactory scopeFactory,
            IConfiguration config,
            ILogger<TenantDomainVerificationService> logger)
        {
            _scopeFactory = scopeFactory;
            _config = config;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await VerifyPendingDomainsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Tenant custom-domain background verification failed.");
                }

                var minutes = int.TryParse(_config["Saas:DomainCheckIntervalMinutes"], out var configured)
                    ? Math.Clamp(configured, 5, 1440)
                    : 30;
                await Task.Delay(TimeSpan.FromMinutes(minutes), stoppingToken);
            }
        }

        private async Task VerifyPendingDomainsAsync(CancellationToken ct)
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<MahimaDbContext>();
            var expectedIp = NormalizeNullable(_config["Saas:DomainTargetIp"]);

            var tenants = await db.Tenants
                .Where(t => t.Domain != null && t.Domain != "" && t.Status == "active" && t.DomainStatus == "pending")
                .Take(50)
                .ToListAsync(ct);

            foreach (var tenant in tenants)
            {
                tenant.DomainLastCheckedAtUtc = DateTime.UtcNow;
                try
                {
                    var addresses = await Dns.GetHostAddressesAsync(tenant.Domain!, ct);
                    var ok = addresses.Length > 0 &&
                        (string.IsNullOrWhiteSpace(expectedIp) ||
                         addresses.Any(a => string.Equals(a.ToString(), expectedIp, StringComparison.OrdinalIgnoreCase)));

                    if (ok)
                    {
                        tenant.DomainStatus = "verified";
                        tenant.DomainVerifiedAtUtc = DateTime.UtcNow;
                        tenant.UpdatedAtUtc = DateTime.UtcNow;
                        _logger.LogInformation("Tenant domain verified in background. TenantId={TenantId} Domain={Domain}", tenant.Id, tenant.Domain);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Tenant domain not ready yet. TenantId={TenantId} Domain={Domain}", tenant.Id, tenant.Domain);
                }
            }

            if (tenants.Count > 0)
                await db.SaveChangesAsync(ct);
        }

        private static string? NormalizeNullable(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
