// Mahima.Api/Models/Expense.cs
using System;

namespace Mahima.Api.v3.clean.Models
{
    public class Expense
    {
        public long Id { get; set; }
        public Guid TenantId { get; set; } = Guid.Parse("00000000-0000-0000-0000-000000000001");

        public string Description { get; set; } = string.Empty;

        /// <summary>
        /// Category string: PAYROLL, RENT, UTILITIES, MINISTRY_EVENT, OUTREACH, ADMIN, OTHER...
        /// </summary>
        public string Category { get; set; } = "OTHER";

        public decimal Amount { get; set; }

        /// <summary>
        /// Accounting date of the expense.
        /// </summary>
        public DateTime Date { get; set; }

        public string? Vendor { get; set; }

        public string? Notes { get; set; }

        /// <summary>
        /// For payroll: person / staff name.
        /// </summary>
        public string? PayrollPerson { get; set; }

        /// <summary>
        /// For payroll: month in format "YYYY-MM".
        /// </summary>
        public string? PayrollMonth { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public long? CreatedByUserId { get; set; }
        // optional: navigation if you have a User entity
        // public User? CreatedByUser { get; set; }
    }
	
	public class Account
{
    public long Id { get; set; }
    public Guid TenantId { get; set; } = Guid.Parse("00000000-0000-0000-0000-000000000001");
    public string Name { get; set; } = "";
    public string Type { get; set; } = ""; 
    // ASSET | LIABILITY | INCOME | EXPENSE

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class JournalEntry
{
    public long Id { get; set; }
    public Guid TenantId { get; set; } = Guid.Parse("00000000-0000-0000-0000-000000000001");
    public DateTime Date { get; set; }
    public string Description { get; set; } = "";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<JournalLine> Lines { get; set; } = new();
}

public class JournalLine
{
    public long Id { get; set; }

    public long JournalEntryId { get; set; }
    public JournalEntry JournalEntry { get; set; }

    public long AccountId { get; set; }
    public Account Account { get; set; }

    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    //public JournalEntry JournalEntry { get; set; }
}
}
