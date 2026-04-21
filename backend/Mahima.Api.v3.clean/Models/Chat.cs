using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mahima.Api.v3.clean.Models
{
    public class Chat
    {
        // Chat primary key as Guid
        public Guid Id { get; set; } = Guid.NewGuid();

        public string? Name { get; set; }
        public bool IsGroup { get; set; }

        // FK stored in DB as createdby
        public Guid CreatedBy { get; set; }

        // navigation to user who created the chat
        [ForeignKey(nameof(CreatedBy))]
        public virtual User? Creator { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation collections
        public virtual ICollection<ChatMember> Members { get; set; } = new List<ChatMember>();
        public virtual ICollection<Message> Messages { get; set; } = new List<Message>();
    }
}
