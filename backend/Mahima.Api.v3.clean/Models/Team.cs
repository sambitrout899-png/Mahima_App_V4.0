using System;
using System.Collections.Generic;

namespace Mahima.Api.v3.clean.Models
{
    public class Team
    {
        public Guid TenantId { get; set; } = Guid.Parse("00000000-0000-0000-0000-000000000001");
        public long Id { get; set; }
        public string Name { get; set; } = "";
        public string? Description { get; set; }

        public Guid? LeadUserId { get; set; }
        public User? LeadUser { get; set; }

        public ICollection<TeamMember>? Members { get; set; }
        public ICollection<TaskItem>? Tasks { get; set; }
    }
}
