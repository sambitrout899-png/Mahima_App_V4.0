using System;

namespace Mahima.Api.v3.clean.Models
{
    public class Meeting
    {
        public Guid TenantId { get; set; } = Guid.Parse("00000000-0000-0000-0000-000000000001");
        public long Id { get; set; }
        public string Title { get; set; } = "";
        public string? Description { get; set; }
        public string? Location { get; set; }
        public decimal? LocationLat { get; set; }
        public decimal? LocationLng { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public bool RsvpRequired { get; set; } = false;
    }
}
