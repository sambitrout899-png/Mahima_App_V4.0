// Models/PayrollRun.cs
using System;

namespace Mahima.Api.v3.clean.Models
{
    /// <summary>
    /// Stores each executed payroll calculation so that
    /// PDFs can be regenerated later with the exact same numbers.
    /// </summary>
    public class PayrollRun
    {
        public Guid Id { get; set; }

        // FK to Users table (string id you’re already using elsewhere)
        public string UserId { get; set; } = default!;

        // Cached display name at the time of the run
        public string? StaffName { get; set; }

        public DateTime From { get; set; }
        public DateTime To   { get; set; }

        public decimal TotalHours   { get; set; }
        public decimal HourlyRate   { get; set; }
        public decimal FixedAmount  { get; set; }
        public decimal Allowances   { get; set; }
        public decimal Deductions   { get; set; }
        public decimal GrossAmount  { get; set; }
        public decimal NetAmount    { get; set; }
        public decimal PreviousArrears { get; set; }
        public decimal PayableAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal BalanceAmount { get; set; }
        public string PaymentStatus { get; set; } = "UNPAID";
        public string? PaymentNotes { get; set; }
        public DateTime? PaidAtUtc { get; set; }

	public DateTime RunAt { get; set; } = DateTime.UtcNow;
	public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

     }
}
