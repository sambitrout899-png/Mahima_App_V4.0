using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Models;
using Mahima.Api.v3.clean.Dtos.Expenses;
using Microsoft.EntityFrameworkCore;
using ModelJournalEntry = Mahima.Api.v3.clean.Models.JournalEntry;
using ModelJournalLine = Mahima.Api.v3.clean.Models.JournalLine;

public class AccountingService
{
    private readonly MahimaDbContext _db;

    public AccountingService(MahimaDbContext db)
    {
        _db = db;
    }

    public async Task CreateExpenseEntry(Guid tenantId, CreateUpdateExpenseDto dto)
    {
        // 🔹 Find expense account
        var expenseAccountName = dto.Category switch
        {
            "PAYROLL" => "Salary Expense",
            "RENT" => "Rent Expense",
            "UTILITIES" => "Utilities Expense",
            _ => "General Expense"
        };

        var expenseAccount = await _db.Accounts
            .FirstAsync(a => a.TenantId == tenantId && a.Name == expenseAccountName);

        var bankAccount = await _db.Accounts
            .FirstAsync(a => a.TenantId == tenantId && a.Name == "Bank");

        // 🔹 Create Journal Entry
        var entry = new Mahima.Api.v3.clean.Models.JournalEntry
	//var entry = new JournalEntry
        {
            TenantId = tenantId,
            Date = dto.Date,
            Description = dto.Description
        };

        _db.JournalEntries.Add(entry);
        await _db.SaveChangesAsync();

        // 🔹 Create Journal Lines (DOUBLE ENTRY)
        _db.JournalLines.AddRange(
            //new JournalLine
            new ModelJournalLine
		{
                JournalEntryId = entry.Id,
                AccountId = expenseAccount.Id,
                Debit = dto.Amount,
                Credit = 0
            },
            //new JournalLine
            new Mahima.Api.v3.clean.Models.JournalLine
		{
                JournalEntryId = entry.Id,
                AccountId = bankAccount.Id,
                Debit = 0,
                Credit = dto.Amount
            }
        );

        await _db.SaveChangesAsync();
    }
}
