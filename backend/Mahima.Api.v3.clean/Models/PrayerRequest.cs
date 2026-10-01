using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mahima.Api.v3.clean.Models
{
    public class PrayerRequest
    {
        public long Id { get; set; }
        public Guid TenantId { get; set; } = Guid.Parse("00000000-0000-0000-0000-000000000001");
        public Guid? UserId { get; set; }
        public string? Title { get; set; }
        public string Message { get; set; } = "";
        public bool Anonymous { get; set; }
        public string Status { get; set; } = "new";
        public Guid? AssignedTo { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }

        // NEW — map to actual db column
        [Column("closecomment")]
        public string? CloseComment { get; set; }
    }
}
