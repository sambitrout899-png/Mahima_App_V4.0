using System.Threading.Tasks;
using Mahima.Api.v3.clean.Models;

namespace Mahima.Api.v3.clean.Services
{
    public interface IBaptismCertificateService
    {
        /// <summary>
        /// Generates a baptism certificate PDF for the given request,
        /// saves it under wwwroot, and returns the relative URL path
        /// (e.g. "/certificates/baptisms/BaptismCertificate_1_20251121030000.pdf").
        /// </summary>
        Task<string> GenerateCertificateAsync(BaptismRequest request);
    }
}
