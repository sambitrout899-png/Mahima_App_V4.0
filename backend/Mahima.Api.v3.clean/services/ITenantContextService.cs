using System;
using System.Threading;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Models;

namespace Mahima.Api.v3.clean.Services
{
    public interface ITenantContextService
    {
        Task<Tenant?> GetCurrentTenantAsync(CancellationToken ct = default);
        Task<Tenant> GetOrCreateRootTenantAsync(CancellationToken ct = default);
    }
}
