using System;
using System.Threading;
using System.Threading.Tasks;

namespace Mahima.Api.v3.clean.Services
{
    public interface ILicensingService
    {
        Task EnsureCatalogSeededAsync(CancellationToken ct = default);
        Task<bool> HasModuleAsync(Guid tenantId, string moduleCode, CancellationToken ct = default);
        Task ActivateModuleAsync(Guid tenantId, string moduleCode, decimal priceInr, string source, Guid? paymentId = null, CancellationToken ct = default);
    }
}
