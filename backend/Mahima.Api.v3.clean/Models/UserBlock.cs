using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mahima.Api.v3.clean.Models
{
    public class UserBlock
    {
        public Guid BlockerId { get; set; }
        public Guid BlockedId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(BlockerId))]
        public virtual User? Blocker { get; set; }

        [ForeignKey(nameof(BlockedId))]
        public virtual User? Blocked { get; set; }
    }
}
