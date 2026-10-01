// Models/Counselling/Candidate.cs
using System;
using System.Collections.Generic;

namespace Mahima.Api.v3.clean.Models.Counselling
{
    public class Candidate
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; } = Guid.Parse("00000000-0000-0000-0000-000000000001");

        public string FullName { get; set; } = default!;
        public string? Email { get; set; }
        public string Phone { get; set; } = default!;
        public bool IsChurchMember { get; set; }
        public string? MemberId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<CounsellingCase> CounsellingCases { get; set; } =
            new List<CounsellingCase>();
    }
}
