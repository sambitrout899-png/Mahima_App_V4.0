using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mahima.Api.v3.clean.Models
{
    public class Message
    {
        // Primary key (GUID)
        public Guid Id { get; set; } = Guid.NewGuid();

        // Foreign keys
        public Guid ChatId { get; set; }
        public Guid SenderId { get; set; }

        // Content
        public string? Content { get; set; }
        public string ContentType { get; set; } = "text";
        public string? AttachmentUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey(nameof(ChatId))]
        public virtual Chat? Chat { get; set; }

        [ForeignKey(nameof(SenderId))]
        public virtual User? Sender { get; set; }

        public virtual ICollection<MessageRead> Reads { get; set; } = new List<MessageRead>();
    }
}