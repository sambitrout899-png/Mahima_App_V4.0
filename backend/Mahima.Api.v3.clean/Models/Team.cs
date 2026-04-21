using System;
using System.Collections.Generic;

namespace Mahima.Api.v3.clean.Models
{
    public class Team
    {
        public long Id { get; set; }
        public string Name { get; set; } = "";
        public string? Description { get; set; }

        public Guid? LeadUserId { get; set; }
        public User? LeadUser { get; set; }

        public ICollection<TeamMember>? Members { get; set; }
        public ICollection<TaskItem>? Tasks { get; set; }
    }
}
