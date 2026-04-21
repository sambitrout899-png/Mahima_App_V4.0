using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mahima.Api.v3.clean.Models
{
    public class ChatMember
    {
        // Composite PK configured in DbContext
        public Guid ChatId { get; set; }

        // Explicit FK property (non-nullable here; change to Guid? if allowed)
        public Guid UserId { get; set; }

        // navigation props
        [ForeignKey(nameof(ChatId))]
        public virtual Chat? Chat { get; set; }

        [ForeignKey(nameof(UserId))]
        public virtual User? User { get; set; }

        [MaxLength(50)]
        public string Role { get; set; } = string.Empty;

        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }
}
