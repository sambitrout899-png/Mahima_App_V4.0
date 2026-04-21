// Models/Counselling/CounsellingCase.cs
using System;
using System.Collections.Generic;

namespace Mahima.Api.v3.clean.Models.Counselling
{
    public class CounsellingCase
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid CandidateId { get; set; }
        public Candidate Candidate { get; set; } = default!;

        public string IssueCategory { get; set; } = default!;
        public string? Description { get; set; }

        public CounsellingCaseStatus Status { get; set; } = CounsellingCaseStatus.New;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ClosedAt { get; set; }
        public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<CounsellingSession> Sessions { get; set; } =
            new List<CounsellingSession>();
    }
}
