// Mahima.Api/Dtos/Expenses/CreateUpdateExpenseDto.cs
using System;
using System.ComponentModel.DataAnnotations;

namespace Mahima.Api.v3.clean.Dtos.Expenses
{
    public class CreateUpdateExpenseDto
    {
        [Required]
        [MaxLength(512)]
        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(64)]
        public string Category { get; set; } = "OTHER";

        [Required]
        [Range(0.01, 999999999)]
        public decimal Amount { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [MaxLength(256)]
        public string? Vendor { get; set; }

        [MaxLength(2000)]
        public string? Notes { get; set; }

        [MaxLength(256)]
        public string? PayrollPerson { get; set; }

        /// <summary>
        /// "YYYY-MM" e.g. 2025-11
        /// </summary>
        [MaxLength(7)]
        public string? PayrollMonth { get; set; }
    }
}
