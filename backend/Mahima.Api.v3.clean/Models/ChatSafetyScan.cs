using System;

namespace Mahima.Api.v3.clean.Models
{
    public class ChatSafetyScan
    {
        public Guid MessageId { get; set; }
        public DateTime ScannedAtUtc { get; set; } = DateTime.UtcNow;
        public string Engine { get; set; } = "heuristic-ai";
    }
}
