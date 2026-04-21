// Mahima.Api/Dtos/Expenses/ExpenseDto.cs
using System;

namespace Mahima.Api.v3.clean.Dtos.Expenses
{
    public class ExpenseDto
    {
        public long Id { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = "OTHER";
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public string? Vendor { get; set; }
        public string? Notes { get; set; }
        public string? PayrollPerson { get; set; }
        public string? PayrollMonth { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
	
	public class Account
{
    public long Id { get; set; }
    public string Name { get; set; } = "";
    public string Type { get; set; } = ""; 
    // ASSET | LIABILITY | INCOME | EXPENSE

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class JournalEntry
{
    public long Id { get; set; }
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
}

}
