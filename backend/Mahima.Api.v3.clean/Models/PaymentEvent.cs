using System;

namespace Mahima.Api.v3.clean.Models
{
    public class PaymentEvent
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid PaymentIntentId { get; set; }
        public string EventType { get; set; } = string.Empty;
        public string? ProviderEventId { get; set; }
        public string? PayloadJson { get; set; }
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public PaymentIntent? PaymentIntent { get; set; }
    }
}
