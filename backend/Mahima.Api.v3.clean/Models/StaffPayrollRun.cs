using System;

namespace Mahima.Api.v3.clean.Models
{
    public class StaffPayrollRun
    {
        public int Id { get; set; }

        public string UserId { get; set; } = default!;
        public string? DisplayName { get; set; }

        public DateTime From { get; set; }
        public DateTime To { get; set; }

        public decimal TotalHours { get; set; }
        public decimal HourlyRate { get; set; }
        public decimal FixedAmount { get; set; }
        public decimal HourlyAmount { get; set; }
        public decimal Allowances { get; set; }
        public decimal Deductions { get; set; }
        public decimal GrossAmount { get; set; }
        public decimal NetAmount { get; set; }

        public DateTime CreatedAt { get; set; }
        public Guid? CreatedBy { get; set; }
    }
}
