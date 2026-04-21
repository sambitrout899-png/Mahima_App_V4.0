using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mahima.Api.v3.clean.Models
{
    [Table("AttendanceRecords")]
    public class AttendanceRecord
    {
        [Key]
        [Column("Id")]
        public int Id { get; set; }              // <-- int

        [Column("UserId")]
        public string UserId { get; set; } = string.Empty;

        [Column("Date")]
        public DateTime Date { get; set; }

        [Column("Status")]
        public string Status { get; set; } = string.Empty;
    }
}
