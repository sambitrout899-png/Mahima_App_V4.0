using Mahima.Api.v3.clean.Data;
// services/Counselling/TokenService.cs
using System;
using System.Linq;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Models.Counselling;

namespace Mahima.Api.v3.clean.services.Counselling
{
    public interface ITokenService
    {
        string GenerateTokenNumber(DateTime scheduledAt, CounsellingSessionType type);
        Task<string?> GenerateTokenPdfAsync(CounsellingSession session);
    }

    public class TokenService : ITokenService
    {
        private readonly MahimaDbContext _db;

        public TokenService(MahimaDbContext db)
        {
            _db = db;
        }

        public string GenerateTokenNumber(DateTime scheduledAt, CounsellingSessionType type)
        {
            var day = scheduledAt.ToString("yyyyMMdd");
            var prefix = type switch
            {
                CounsellingSessionType.InitialCounselling => "IC",
                CounsellingSessionType.LayHandsSession => "LH",
                CounsellingSessionType.SeniorPastorSession => "SP",
                _ => "CS"
            };

            // Simple daily sequence – Postgres-friendly LINQ
            var date = scheduledAt.Date;
            var countForDay = _db.CounsellingSessions
                .Count(s => s.ScheduledAt.HasValue &&
                            s.ScheduledAt.Value.Date == date);

            var seq = countForDay + 1;
            return $"MM-{prefix}-{day}-{seq:D3}";
        }

        public Task<string?> GenerateTokenPdfAsync(CounsellingSession session)
        {
            // For now we just return an HTML token page URL
            var url = $"/counselling/token/{session.Id}";
            return Task.FromResult<string?>(url);
        }
    }
}
