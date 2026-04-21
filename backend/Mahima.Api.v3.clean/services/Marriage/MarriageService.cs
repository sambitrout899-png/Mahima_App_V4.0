using Mahima.Api.v3.clean.Data;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Dtos;
using Mahima.Api.v3.clean.Models;
using Mahima.Api.v3.clean.Models.Marriage;
using Microsoft.EntityFrameworkCore;

namespace Mahima.Api.v3.clean.services.Marriage
{
    public interface IMarriageService
    {
        Task<MarriageApplicationSummaryDto> CreateAsync(
            CreateMarriageApplicationDto dto,
            CancellationToken ct = default);

        Task<IReadOnlyList<MarriageApplicationSummaryDto>> GetAsync(
            string? status,
            CancellationToken ct = default);

        Task<MarriageApplicationSummaryDto> ApproveAsync(
            Guid id,
            ApproveMarriageDto dto,
            string? approverUserId,
            CancellationToken ct = default);

        Task<MarriageApplicationSummaryDto> ScheduleAsync(
            Guid id,
            ScheduleMarriageDto dto,
            CancellationToken ct = default);

        Task CompleteAsync(
            Guid id,
            CompleteMarriageDto dto,
            CancellationToken ct = default);
    }

    public class MarriageService : IMarriageService
    {
        private readonly MahimaDbContext _db;

        public MarriageService(MahimaDbContext db)
        {
            _db = db;
        }

        private static DateTime ToUtc(DateTime dt)
        {
            return dt.Kind switch
            {
                DateTimeKind.Utc => dt,
                DateTimeKind.Local => dt.ToUniversalTime(),
                _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc)
            };
        }

        public async Task<MarriageApplicationSummaryDto> CreateAsync(
            CreateMarriageApplicationDto dto,
            CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;

            var entity = new MarriageApplication
            {
                Id = Guid.NewGuid(),
                GroomFullName = dto.GroomFullName,
                BrideFullName = dto.BrideFullName,
                GroomPhone = dto.GroomPhone,
                BridePhone = dto.BridePhone,
                GroomEmail = dto.GroomEmail,
                BrideEmail = dto.BrideEmail,
                Address = dto.Address,
                GroomIsMember = dto.GroomIsMember,
                BrideIsMember = dto.BrideIsMember,
                GroomMemberId = dto.GroomMemberId,
                BrideMemberId = dto.BrideMemberId,
                PreferredDate = dto.PreferredDate.HasValue ? ToUtc(dto.PreferredDate.Value) : null,
                PreferredService = dto.PreferredService,
                Status = MarriageApplicationStatuses.PendingReview,
                CreatedAt = now,
                UpdatedAt = now
            };

            _db.MarriageApplications.Add(entity);
            await _db.SaveChangesAsync(ct);

            return Map(entity);
        }

        public async Task<IReadOnlyList<MarriageApplicationSummaryDto>> GetAsync(
            string? status,
            CancellationToken ct = default)
        {
            IQueryable<MarriageApplication> q = _db.MarriageApplications;

            if (!string.IsNullOrWhiteSpace(status))
            {
                q = q.Where(m => m.Status == status);
            }

            var list = await q
                .OrderByDescending(m => m.CreatedAt)
                .Take(200)
                .ToListAsync(ct);

            return list.Select(Map).ToList();
        }

        public async Task<MarriageApplicationSummaryDto> ApproveAsync(
            Guid id,
            ApproveMarriageDto dto,
            string? approverUserId,
            CancellationToken ct = default)
        {
            var entity = await _db.MarriageApplications
                .FirstOrDefaultAsync(m => m.Id == id, ct);

            if (entity == null)
                throw new InvalidOperationException($"Application {id} not found.");

            entity.Status = MarriageApplicationStatuses.Approved;
            entity.ApprovedAt = DateTime.UtcNow;
            entity.ApprovedByUserId = approverUserId;
            entity.Notes = dto.Notes;
            entity.UpdatedAt = DateTime.UtcNow;

            // Short printable token, safe under varchar(50)
            var shortId = entity.Id.ToString("N").Substring(0, 8);
            entity.Token = $"M-{shortId}-{DateTime.UtcNow:yyyyMMdd}";

            await _db.SaveChangesAsync(ct);
            return Map(entity);
        }

        public async Task<MarriageApplicationSummaryDto> ScheduleAsync(
            Guid id,
            ScheduleMarriageDto dto,
            CancellationToken ct = default)
        {
            var entity = await _db.MarriageApplications
                .FirstOrDefaultAsync(m => m.Id == id, ct);

            if (entity == null)
                throw new InvalidOperationException($"Application {id} not found.");

            entity.ScheduledAt = ToUtc(dto.ScheduledAt);
            entity.CeremonyLocation = dto.CeremonyLocation;
            entity.Status = MarriageApplicationStatuses.Scheduled;
            entity.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Map(entity);
        }

        public async Task CompleteAsync(
            Guid id,
            CompleteMarriageDto dto,
            CancellationToken ct = default)
        {
            var entity = await _db.MarriageApplications
                .FirstOrDefaultAsync(m => m.Id == id, ct);

            if (entity == null)
                throw new InvalidOperationException($"Application {id} not found.");

            entity.Status = MarriageApplicationStatuses.Completed;
            entity.CompletedAt = DateTime.UtcNow;
            entity.Notes = string.IsNullOrWhiteSpace(dto.Notes)
                ? entity.Notes
                : dto.Notes;
            entity.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
        }

        private static MarriageApplicationSummaryDto Map(MarriageApplication m)
        {
            return new MarriageApplicationSummaryDto
            {
                Id = m.Id,
                GroomFullName = m.GroomFullName,
                BrideFullName = m.BrideFullName,
                GroomPhone = m.GroomPhone,
                BridePhone = m.BridePhone,
                GroomEmail = m.GroomEmail,
                BrideEmail = m.BrideEmail,
                Status = m.Status,
                PreferredDate = m.PreferredDate,
                ScheduledAt = m.ScheduledAt,
                CeremonyLocation = m.CeremonyLocation,
                Token = m.Token,
                CreatedAt = m.CreatedAt
            };
        }
    }
}
