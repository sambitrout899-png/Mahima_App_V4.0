using System;
using System.Collections.Generic;

namespace Mahima.Api.v3.clean.Dtos
{
    public class ChatDto
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
        public bool IsGroup { get; set; }
        public Guid? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }

        // convenience fields for client
        public object? LastMessage { get; set; }
        public int UnreadCount { get; set; }

        // Controller uses this flag to decide 200 vs 201
        public bool Created { get; set; } = false;

        // Member ids (optional)
        public IEnumerable<Guid>? MemberIds { get; set; }
    }
}
