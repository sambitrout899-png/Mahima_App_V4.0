using System;

namespace Mahima.Api.v3.clean.Models
{
    public class TeamMember
    {
        public long TeamId { get; set; }
        public Team Team { get; set; } = null!;

        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        public string? RoleInTeam { get; set; }
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }
}
