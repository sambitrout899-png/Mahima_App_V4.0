using Mahima.Api.v3.clean.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
[ApiController]
[Route("api/accounting")]
[AllowAnonymous]
public class AccountingController : ControllerBase
{
    private readonly MahimaDbContext _db;

    public AccountingController(MahimaDbContext db)
    {
        _db = db;
    }
[HttpGet("pnl")]
public async Task<IActionResult> GetPnL(DateTime? fromDate, DateTime? toDate)
{
    var accounts = await _db.Accounts.ToListAsync();

    decimal income = 0;
    decimal expense = 0;

    foreach (var acc in accounts)
    {
        var lines = await _db.JournalLines
            .Include(l => l.JournalEntry)
            .Where(l => l.AccountId == acc.Id &&
                (!fromDate.HasValue || l.JournalEntry.Date >= fromDate) &&
                (!toDate.HasValue || l.JournalEntry.Date <= toDate))
            .ToListAsync();

        var balance = lines.Sum(l => l.Debit - l.Credit);

        if (acc.Type == "INCOME")
            income += (-balance);

        if (acc.Type == "EXPENSE")
            expense += balance;
    }

    return Ok(new
    {
        income = income,
        expense = expense,
        net = income - expense
    });
}

[HttpGet("accounts")]
[AllowAnonymous]
public async Task<IActionResult> GetAccounts()
{
    var accounts = await _db.Accounts
        .OrderBy(a => a.Name)
        .ToListAsync();

    return Ok(accounts);
}

// ================= CREATE ACCOUNT =================
[HttpPost("accounts")]
public async Task<IActionResult> CreateAccount([FromBody] Mahima.Api.v3.clean.Models.Account dto)
{
    _db.Accounts.Add(dto);
    await _db.SaveChangesAsync();
    return Ok(dto);
}
[HttpPost("journal")]
public async Task<IActionResult> PostJournal([FromBody] JournalDto dto)
{

if (dto == null || dto.Lines == null || !dto.Lines.Any())
        return BadRequest("Invalid payload");

    if (dto.Lines.Sum(l => l.Debit) != dto.Lines.Sum(l => l.Credit))
        return BadRequest("Debit and Credit must match");

    /*var entry = new Mahima.Api.v3.clean.Models.JournalEntry
    {
        Date = dto.Date,
        Description = dto.Description
    };*/
var entry = new Mahima.Api.v3.clean.Models.JournalEntry
{
    Date = DateTime.SpecifyKind(dto.Date, DateTimeKind.Utc),
    Description = dto.Description
};

    _db.JournalEntries.Add(entry);
    await _db.SaveChangesAsync();

    foreach (var line in dto.Lines)
    {
        _db.JournalLines.Add(new Mahima.Api.v3.clean.Models.JournalLine
        {
            JournalEntryId = entry.Id,
            AccountId = line.AccountId,
            Debit = line.Debit,
            Credit = line.Credit
        });
    }

    await _db.SaveChangesAsync();
    return Ok();
}

/*[HttpGet("pnl/pdf")]
public IActionResult GeneratePnLPdf()
{
    var doc = Document.Create(container =>
    {
        container.Page(page =>
        {
            page.Content().Column(col =>
            {
                col.Item().Text("Mahima Ministries - P&L Report").FontSize(20);

                col.Item().Text("Income: ...");
                col.Item().Text("Expense: ...");
                col.Item().Text("Net: ...");
            });
        });
    });

    var pdf = doc.GeneratePdf();

    return File(pdf, "application/pdf", "PnL.pdf");
}*/
[HttpGet("pnl/pdf")]
public IActionResult GetPnLPdf([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
{
    var lines = _db.JournalLines
        .Include(l => l.JournalEntry)
        .Include(l => l.Account)
        .AsQueryable();

    if (fromDate.HasValue)
        lines = lines.Where(x => x.JournalEntry.Date >= fromDate.Value);

    if (toDate.HasValue)
        lines = lines.Where(x => x.JournalEntry.Date <= toDate.Value);

    var data = lines.ToList();

    decimal income = 0;
    decimal expense = 0;

    foreach (var l in data)
    {
        var balance = l.Debit - l.Credit;

        if (l.Account.Type == "INCOME")
            income += (-balance);

        if (l.Account.Type == "EXPENSE")
            expense += balance;
    }

    var net = income - expense;

    var pdf = Document.Create(container =>
    {
        container.Page(page =>
        {
            page.Margin(20);

            page.Header().Text("Mahima Ministries")
                .FontSize(20)
                .Bold()
                .AlignCenter();

            page.Content().Column(col =>
            {
                col.Item().Text("Profit & Loss Report").FontSize(16).Bold();

                col.Item().Text($"From: {fromDate?.ToString("dd-MM-yyyy") ?? "Start"}");
                col.Item().Text($"To: {toDate?.ToString("dd-MM-yyyy") ?? "Today"}");

                col.Item().PaddingTop(10);

                col.Item().Text($"Total Income: ₹{income}");
                col.Item().Text($"Total Expense: ₹{expense}");
                col.Item().Text($"Net Profit: ₹{net}");
            });

            page.Footer()
                .AlignCenter()
                .Text(x =>
                {
                    x.Span("Generated on ");
                    x.Span(DateTime.Now.ToString("dd-MM-yyyy HH:mm"));
                });
        });
    }).GeneratePdf();

    return File(pdf, "application/pdf", "PNL_Report.pdf");
}

[HttpGet("balance-sheet")]
public async Task<IActionResult> GetBalanceSheet()
{
    var accounts = await _db.Accounts.ToListAsync();

    var result = new List<object>();

    foreach (var acc in accounts)
    {
        var balance = await _db.JournalLines
            .Where(l => l.AccountId == acc.Id)
            .SumAsync(l => l.Debit - l.Credit);

        result.Add(new
        {
            Account = acc.Name,
            Type = acc.Type,
            Balance = balance
        });
    }

    return Ok(result);
}

[HttpPost("opening-balance")]
public async Task<IActionResult> SetOpeningBalance([FromBody] OpeningBalanceDto dto)
{
    var account = await _db.Accounts.FindAsync(dto.AccountId);
    if (account == null) return NotFound();

    var entry = new Mahima.Api.v3.clean.Models.JournalEntry
    {
        Date = DateTime.UtcNow,
        Description = "Opening Balance"
    };

    _db.JournalEntries.Add(entry);
    await _db.SaveChangesAsync();

    // Debit selected account
    _db.JournalLines.Add(new Mahima.Api.v3.clean.Models.JournalLine
    {
        JournalEntryId = entry.Id,
        AccountId = dto.AccountId,
        Debit = dto.Amount,
        Credit = 0
    });

    // Credit Opening Balance Equity
    var equity = await _db.Accounts.FirstOrDefaultAsync(a => a.Name == "Opening Balance");

    if (equity == null)
    {
        equity = new Mahima.Api.v3.clean.Models.Account
        {
            Name = "Opening Balance",
            Type = "LIABILITY"
        };
        _db.Accounts.Add(equity);
        await _db.SaveChangesAsync();
    }

    _db.JournalLines.Add(new Mahima.Api.v3.clean.Models.JournalLine
    {
        JournalEntryId = entry.Id,
        AccountId = equity.Id,
        Debit = 0,
        Credit = dto.Amount
    });

    await _db.SaveChangesAsync();
    return Ok();
}
[HttpGet("balances")]
public async Task<IActionResult> GetBalances()
{
    var accounts = await _db.Accounts.ToListAsync();

    var result = new List<object>();

    foreach (var acc in accounts)
    {
        var lines = await _db.JournalLines
            .Where(l => l.AccountId == acc.Id)
            .ToListAsync();

        var balance = lines.Sum(l => l.Debit - l.Credit);

        result.Add(new
        {
            AccountId = acc.Id,
            AccountName = acc.Name,
            Type = acc.Type,
            Balance = balance
        });
    }

    return Ok(result);
}

[HttpGet("trial-balance")]
public async Task<IActionResult> GetTrialBalance()
{
    var accounts = await _db.Accounts.ToListAsync();

    var result = new List<object>();

    decimal totalDebit = 0;
    decimal totalCredit = 0;

    foreach (var acc in accounts)
    {
        var lines = await _db.JournalLines
            .Where(l => l.AccountId == acc.Id)
            .ToListAsync();

        var debit = lines.Sum(l => l.Debit);
        var credit = lines.Sum(l => l.Credit);

        totalDebit += debit;
        totalCredit += credit;

        result.Add(new
        {
            Account = acc.Name,
            Debit = debit,
            Credit = credit
        });
    }

    return Ok(new
    {
        Accounts = result,
        TotalDebit = totalDebit,
        TotalCredit = totalCredit
    });
}

[HttpGet("income-expense")]
public async Task<IActionResult> GetIncomeExpense()
{
    var accounts = await _db.Accounts.ToListAsync();

    decimal totalIncome = 0;
    decimal totalExpense = 0;

    foreach (var acc in accounts)
    {
        var lines = await _db.JournalLines
            .Where(l => l.AccountId == acc.Id)
            .ToListAsync();

        var balance = lines.Sum(l => l.Debit - l.Credit);

        if (acc.Type == "INCOME")
            totalIncome += (-balance);

        if (acc.Type == "EXPENSE")
            totalExpense += balance;
    }

    return Ok(new
    {
        TotalIncome = totalIncome,
        TotalExpense = totalExpense,
        Net = totalIncome - totalExpense
    });
}


    // 🔥 Ledger API
  /* [HttpGet("ledger/{accountId}")]
    public async Task<IActionResult> GetLedger(long accountId)
    {
        var lines = await _db.JournalLines
            .Include(l => l.JournalEntry)
            .Where(l => l.AccountId == accountId)
            .OrderBy(l => l.JournalEntry.Date)
            .ThenBy(l => l.Id)
            .ToListAsync();

        decimal balance = 0;

        var result = lines.Select(l =>
        {
            balance += l.Debit - l.Credit;

            return new
            {
                Date = l.JournalEntry.Date,
                Description = l.JournalEntry.Description,
                Debit = l.Debit,
                Credit = l.Credit,
                Balance = balance
            };
        });

        return Ok(result);
    }*/

[HttpGet("ledger/{accountId}")]
public async Task<IActionResult> GetLedger(long accountId, DateTime? fromDate, DateTime? toDate)
{
    var query = _db.JournalLines
        .Include(l => l.JournalEntry)
        .Where(l => l.AccountId == accountId);

    if (fromDate.HasValue)
        query = query.Where(l => l.JournalEntry.Date >= fromDate.Value);

    if (toDate.HasValue)
        query = query.Where(l => l.JournalEntry.Date <= toDate.Value);

    var lines = await query
        .OrderBy(l => l.JournalEntry.Date)
        .ToListAsync();

    decimal balance = 0;

    var result = lines.Select(l =>
    {
        balance += l.Debit - l.Credit;

        return new
        {
            Date = l.JournalEntry.Date,
            Description = l.JournalEntry.Description,
            Debit = l.Debit,
            Credit = l.Credit,
            Balance = balance
        };
    });

    return Ok(result);
}


}
