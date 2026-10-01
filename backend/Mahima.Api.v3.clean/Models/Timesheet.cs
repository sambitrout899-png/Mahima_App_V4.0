using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mahima.Api.v3.clean.Models
{
    [Table("Timesheets")]
    public class Timesheet
    {
        [Key]
        [Column("Id")]
        public int Id { get; set; }          // <-- int, NOT Guid

        [Column("TenantId")]
        public Guid TenantId { get; set; } = Guid.Parse("00000000-0000-0000-0000-000000000001");

        [Column("UserId")]
        public string UserId { get; set; } = string.Empty;

        [Column("Date")]
        public DateTime Date { get; set; }

        [Column("Hours")]
        public decimal Hours { get; set; }

        [Column("Task")]
        public string? Task { get; set; }

        [Column("Notes")]
        public string? Notes { get; set; }
    }
}
