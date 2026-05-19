using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;

[ApiController]
[Route("api/accounting")]
[Authorize]
public class AccountingController : ControllerBase
{
    private static readonly HashSet<string> ValidAccountTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "ASSET",
        "LIABILITY",
        "EQUITY",
        "INCOME",
        "EXPENSE"
    };

    private static readonly HashSet<string> DebitNormalTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "ASSET",
        "EXPENSE"
    };

    private static readonly (string Name, string Type)[] StandardChartOfAccounts =
    {
        ("Cash", "ASSET"),
        ("Bank", "ASSET"),
        ("Accounts Receivable", "ASSET"),
        ("Advances and Deposits", "ASSET"),
        ("Fixed Assets", "ASSET"),
        ("Accounts Payable", "LIABILITY"),
        ("Payroll Payable", "LIABILITY"),
        ("Statutory Dues Payable", "LIABILITY"),
        ("Loans Payable", "LIABILITY"),
        ("Opening Balance Equity", "EQUITY"),
        ("General Fund / Corpus Fund", "EQUITY"),
        ("Retained Surplus", "EQUITY"),
        ("Tithes and Offerings", "INCOME"),
        ("Donations", "INCOME"),
        ("Grants", "INCOME"),
        ("Event Income", "INCOME"),
        ("Other Income", "INCOME"),
        ("Payroll Expense", "EXPENSE"),
        ("Rent Expense", "EXPENSE"),
        ("Utilities Expense", "EXPENSE"),
        ("Ministry Events Expense", "EXPENSE"),
        ("Outreach Expense", "EXPENSE"),
        ("Travel Expense", "EXPENSE"),
        ("Office and Administration Expense", "EXPENSE"),
        ("Bank Charges", "EXPENSE")
    };

    private readonly MahimaDbContext _db;

    public AccountingController(MahimaDbContext db)
    {
        _db = db;
    }

    [HttpPost("bootstrap")]
    public async Task<IActionResult> BootstrapChartOfAccounts()
    {
        var existingNames = await _db.Accounts
            .Select(a => a.Name.ToLower())
            .ToListAsync();

        var added = new List<Account>();

        foreach (var item in StandardChartOfAccounts)
        {
            if (existingNames.Contains(item.Name.ToLower()))
                continue;

            var account = new Account
            {
                Name = item.Name,
                Type = item.Type,
                CreatedAt = DateTime.UtcNow
            };

            _db.Accounts.Add(account);
            added.Add(account);
            existingNames.Add(item.Name.ToLower());
        }

        if (added.Count > 0)
            await _db.SaveChangesAsync();

        return Ok(new
        {
            added = added.Count,
            accounts = added.Select(a => new { a.Id, a.Name, a.Type })
        });
    }

    [HttpGet("accounts")]
    public async Task<IActionResult> GetAccounts()
    {
        var accounts = await _db.Accounts
            .AsNoTracking()
            .OrderBy(a => a.Type)
            .ThenBy(a => a.Name)
            .ToListAsync();

        return Ok(accounts.Select(a => new
        {
            a.Id,
            a.Name,
            Type = NormalizeType(a.Type),
            a.CreatedAt
        }));
    }

    [HttpPost("accounts")]
    public async Task<IActionResult> CreateAccount([FromBody] CreateAccountDto dto)
    {
        var name = (dto?.Name ?? string.Empty).Trim();
        var type = NormalizeType(dto?.Type);

        if (string.IsNullOrWhiteSpace(name))
            return BadRequest(new { message = "Account name is required." });

        if (!ValidAccountTypes.Contains(type))
            return BadRequest(new { message = "Account type must be ASSET, LIABILITY, EQUITY, INCOME, or EXPENSE." });

        var duplicate = await _db.Accounts.AnyAsync(a => a.Name.ToLower() == name.ToLower());
        if (duplicate)
            return Conflict(new { message = "An account with this name already exists." });

        var account = new Account
        {
            Name = name,
            Type = type,
            CreatedAt = DateTime.UtcNow
        };

        _db.Accounts.Add(account);
        await _db.SaveChangesAsync();

        return Ok(new { account.Id, account.Name, account.Type, account.CreatedAt });
    }

    [HttpGet("balances")]
    public async Task<IActionResult> GetBalances([FromQuery] DateTime? toDate = null)
    {
        var balances = await BuildBalancesAsync(null, NormalizeQueryDate(toDate));
        return Ok(balances);
    }

    [HttpGet("journal")]
    public async Task<IActionResult> GetJournalEntries(DateTime? fromDate, DateTime? toDate, int take = 100)
    {
        take = Math.Clamp(take, 1, 10000);

        var query = _db.JournalEntries
            .AsNoTracking()
            .Include(e => e.Lines)
            .ThenInclude(l => l.Account)
            .AsQueryable();

        var from = NormalizeQueryDate(fromDate);
        var to = NormalizeQueryDate(toDate);

        if (from.HasValue)
            query = query.Where(e => e.Date >= from.Value);

        if (to.HasValue)
            query = query.Where(e => e.Date <= to.Value);

        var entries = await query
            .OrderByDescending(e => e.Date)
            .ThenByDescending(e => e.Id)
            .Take(take)
            .ToListAsync();

        return Ok(new
        {
            items = entries.Select(ToJournalResponse),
            take
        });
    }

    [HttpGet("journal/{entryId:long}")]
    public async Task<IActionResult> GetJournalEntry(long entryId)
    {
        var entry = await _db.JournalEntries
            .AsNoTracking()
            .Include(e => e.Lines)
            .ThenInclude(l => l.Account)
            .FirstOrDefaultAsync(e => e.Id == entryId);

        if (entry == null)
            return NotFound(new { message = "Journal entry not found." });

        return Ok(ToJournalResponse(entry));
    }

    [HttpPost("journal")]
    public async Task<IActionResult> PostJournal([FromBody] JournalDto dto)
    {
        var validation = await ValidateJournalAsync(dto);
        if (!validation.Ok)
            return BadRequest(new { message = validation.Message });

        var entry = new JournalEntry
        {
            Date = ToUtc(dto.Date),
            Description = (dto.Description ?? string.Empty).Trim(),
            CreatedAt = DateTime.UtcNow,
            Lines = validation.Lines.Select(l => new JournalLine
            {
                AccountId = l.AccountId,
                Debit = l.Debit,
                Credit = l.Credit
            }).ToList()
        };

        _db.JournalEntries.Add(entry);
        await _db.SaveChangesAsync();

        return Ok(new { id = entry.Id });
    }

    [HttpPut("journal/{entryId:long}")]
    public async Task<IActionResult> UpdateJournal(long entryId, [FromBody] JournalDto dto)
    {
        var validation = await ValidateJournalAsync(dto);
        if (!validation.Ok)
            return BadRequest(new { message = validation.Message });

        var entry = await _db.JournalEntries
            .Include(e => e.Lines)
            .FirstOrDefaultAsync(e => e.Id == entryId);

        if (entry == null)
            return NotFound(new { message = "Journal entry not found." });

        entry.Date = ToUtc(dto.Date);
        entry.Description = (dto.Description ?? string.Empty).Trim();

        _db.JournalLines.RemoveRange(entry.Lines);
        entry.Lines = validation.Lines.Select(l => new JournalLine
        {
            JournalEntryId = entry.Id,
            AccountId = l.AccountId,
            Debit = l.Debit,
            Credit = l.Credit
        }).ToList();

        await _db.SaveChangesAsync();
        return Ok(new { id = entry.Id });
    }

    [HttpDelete("journal/{entryId:long}")]
    public async Task<IActionResult> DeleteJournal(long entryId)
    {
        var entry = await _db.JournalEntries
            .Include(e => e.Lines)
            .FirstOrDefaultAsync(e => e.Id == entryId);

        if (entry == null)
            return NotFound(new { message = "Journal entry not found." });

        _db.JournalLines.RemoveRange(entry.Lines);
        _db.JournalEntries.Remove(entry);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("opening-balance")]
    public async Task<IActionResult> SetOpeningBalance([FromBody] OpeningBalanceDto dto)
    {
        if (dto == null || dto.AccountId <= 0)
            return BadRequest(new { message = "Account is required." });

        var amount = Money(dto.Amount);
        if (amount <= 0)
            return BadRequest(new { message = "Opening balance must be greater than zero." });

        var account = await _db.Accounts.FindAsync(dto.AccountId);
        if (account == null)
            return NotFound(new { message = "Account not found." });

        var equity = await _db.Accounts
            .FirstOrDefaultAsync(a => a.Name == "Opening Balance Equity" || a.Name == "Opening Balance");

        if (equity == null)
        {
            equity = new Account
            {
                Name = "Opening Balance Equity",
                Type = "EQUITY",
                CreatedAt = DateTime.UtcNow
            };
            _db.Accounts.Add(equity);
            await _db.SaveChangesAsync();
        }

        if (!string.Equals(NormalizeType(equity.Type), "EQUITY", StringComparison.OrdinalIgnoreCase))
            equity.Type = "EQUITY";

        var targetIsDebitNormal = IsDebitNormal(account.Type);

        var entry = new JournalEntry
        {
            Date = DateTime.UtcNow,
            Description = $"Opening balance - {account.Name}",
            CreatedAt = DateTime.UtcNow,
            Lines = new List<JournalLine>
            {
                new()
                {
                    AccountId = account.Id,
                    Debit = targetIsDebitNormal ? amount : 0,
                    Credit = targetIsDebitNormal ? 0 : amount
                },
                new()
                {
                    AccountId = equity.Id,
                    Debit = targetIsDebitNormal ? 0 : amount,
                    Credit = targetIsDebitNormal ? amount : 0
                }
            }
        };

        _db.JournalEntries.Add(entry);
        await _db.SaveChangesAsync();

        return Ok(new { id = entry.Id });
    }

    [HttpGet("ledger/{accountId:long}")]
    public async Task<IActionResult> GetLedger(long accountId, DateTime? fromDate, DateTime? toDate)
    {
        var account = await _db.Accounts.AsNoTracking().FirstOrDefaultAsync(a => a.Id == accountId);
        if (account == null)
            return NotFound(new { message = "Account not found." });

        var from = NormalizeQueryDate(fromDate);
        var to = NormalizeQueryDate(toDate);

        var allLines = _db.JournalLines
            .AsNoTracking()
            .Include(l => l.JournalEntry)
            .Where(l => l.AccountId == accountId);

        decimal openingRaw = 0;
        if (from.HasValue)
        {
            openingRaw = await allLines
                .Where(l => l.JournalEntry.Date < from.Value)
                .SumAsync(l => l.Debit - l.Credit);
        }

        var query = allLines;

        if (from.HasValue)
            query = query.Where(l => l.JournalEntry.Date >= from.Value);

        if (to.HasValue)
            query = query.Where(l => l.JournalEntry.Date <= to.Value);

        var lines = await query
            .OrderBy(l => l.JournalEntry.Date)
            .ThenBy(l => l.JournalEntryId)
            .ThenBy(l => l.Id)
            .ToListAsync();

        var runningRaw = openingRaw;
        var rows = lines.Select(l =>
        {
            runningRaw += l.Debit - l.Credit;
            return new
            {
                l.Id,
                l.JournalEntryId,
                l.AccountId,
                Date = l.JournalEntry.Date,
                Description = l.JournalEntry.Description,
                Debit = Money(l.Debit),
                Credit = Money(l.Credit),
                Balance = NaturalBalance(account.Type, runningRaw)
            };
        }).ToList();

        return Ok(new
        {
            account = new
            {
                account.Id,
                account.Name,
                Type = NormalizeType(account.Type),
                normalSide = IsDebitNormal(account.Type) ? "DEBIT" : "CREDIT"
            },
            openingBalance = NaturalBalance(account.Type, openingRaw),
            closingBalance = rows.LastOrDefault()?.Balance ?? NaturalBalance(account.Type, openingRaw),
            items = rows
        });
    }

    [HttpGet("trial-balance")]
    public async Task<IActionResult> GetTrialBalance(DateTime? toDate)
    {
        var balances = await BuildBalancesAsync(null, NormalizeQueryDate(toDate));

        var accounts = balances.Select(b =>
        {
            var debitBalance = b.RawBalance > 0 ? Money(b.RawBalance) : 0;
            var creditBalance = b.RawBalance < 0 ? Money(Math.Abs(b.RawBalance)) : 0;
            return new
            {
                b.AccountId,
                Account = b.AccountName,
                b.Type,
                Debit = debitBalance,
                Credit = creditBalance,
                Balance = b.Balance
            };
        }).ToList();

        var totalDebit = Money(accounts.Sum(a => a.Debit));
        var totalCredit = Money(accounts.Sum(a => a.Credit));

        return Ok(new
        {
            accounts,
            items = accounts,
            totalDebit,
            totalCredit,
            difference = Money(totalDebit - totalCredit),
            isBalanced = Math.Abs(totalDebit - totalCredit) < 0.01m
        });
    }

    [HttpGet("pnl")]
    public async Task<IActionResult> GetPnL(DateTime? fromDate, DateTime? toDate)
    {
        var report = await BuildPnlReportAsync(NormalizeQueryDate(fromDate), NormalizeQueryDate(toDate));
        return Ok(report);
    }

    [HttpGet("income-expense")]
    public async Task<IActionResult> GetIncomeExpense(DateTime? fromDate, DateTime? toDate)
    {
        var report = await BuildPnlReportAsync(NormalizeQueryDate(fromDate), NormalizeQueryDate(toDate));
        return Ok(new
        {
            report.TotalIncome,
            report.TotalExpense,
            report.Net,
            totalIncome = report.TotalIncome,
            totalExpense = report.TotalExpense,
            net = report.Net
        });
    }

    [HttpGet("balance-sheet")]
    public async Task<IActionResult> GetBalanceSheet(DateTime? toDate)
    {
        var cutoff = NormalizeQueryDate(toDate);
        var balances = await BuildBalancesAsync(null, cutoff);
        var pnl = await BuildPnlReportAsync(null, cutoff);

        var assets = balances.Where(b => b.Type == "ASSET").ToList();
        var liabilities = balances.Where(b => b.Type == "LIABILITY").ToList();
        var equityAccounts = balances.Where(b => b.Type == "EQUITY").ToList();

        var totalAssets = Money(assets.Sum(a => a.Balance));
        var totalLiabilities = Money(liabilities.Sum(a => a.Balance));
        var equityBeforeSurplus = Money(equityAccounts.Sum(a => a.Balance));
        var totalEquity = Money(equityBeforeSurplus + pnl.Net);
        var liabilitiesAndEquity = Money(totalLiabilities + totalEquity);
        var difference = Money(totalAssets - liabilitiesAndEquity);

        return Ok(new
        {
            asOf = cutoff ?? DateTime.UtcNow,
            assets,
            liabilities,
            equityAccounts,
            currentYearSurplus = pnl.Net,
            totalAssets,
            totalLiabilities,
            equityBeforeSurplus,
            totalEquity,
            liabilitiesAndEquity,
            difference,
            isBalanced = Math.Abs(difference) < 0.01m
        });
    }

    [HttpGet("pnl/pdf")]
    public async Task<IActionResult> GetPnLPdf([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var report = await BuildPnlReportAsync(NormalizeQueryDate(fromDate), NormalizeQueryDate(toDate));

        var pdf = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(24);

                page.Header().Column(col =>
                {
                    col.Item().Text("Mahima Ministries").FontSize(20).Bold().AlignCenter();
                    col.Item().Text("Profit and Loss Statement").FontSize(14).AlignCenter();
                    col.Item().Text($"Period: {FormatDate(report.FromDate)} to {FormatDate(report.ToDate)}")
                        .FontSize(9)
                        .AlignCenter();
                });

                page.Content().PaddingTop(18).Column(col =>
                {
                    col.Item().Text("Income").FontSize(12).Bold();
                    foreach (var row in report.IncomeAccounts)
                        col.Item().Row(r =>
                        {
                            r.RelativeItem().Text(row.AccountName).FontSize(9);
                            r.ConstantItem(120).AlignRight().Text(FormatMoney(row.Amount)).FontSize(9);
                        });

                    col.Item().PaddingTop(8).LineHorizontal(0.5f);
                    col.Item().Row(r =>
                    {
                        r.RelativeItem().Text("Total Income").Bold();
                        r.ConstantItem(120).AlignRight().Text(FormatMoney(report.TotalIncome)).Bold();
                    });

                    col.Item().PaddingTop(16).Text("Expenses").FontSize(12).Bold();
                    foreach (var row in report.ExpenseAccounts)
                        col.Item().Row(r =>
                        {
                            r.RelativeItem().Text(row.AccountName).FontSize(9);
                            r.ConstantItem(120).AlignRight().Text(FormatMoney(row.Amount)).FontSize(9);
                        });

                    col.Item().PaddingTop(8).LineHorizontal(0.5f);
                    col.Item().Row(r =>
                    {
                        r.RelativeItem().Text("Total Expenses").Bold();
                        r.ConstantItem(120).AlignRight().Text(FormatMoney(report.TotalExpense)).Bold();
                    });

                    col.Item().PaddingTop(14).Background("#F8FAFC").Padding(8).Row(r =>
                    {
                        r.RelativeItem().Text("Net Surplus / (Deficit)").Bold();
                        r.ConstantItem(120).AlignRight().Text(FormatMoney(report.Net)).Bold();
                    });
                });

                page.Footer().AlignCenter().Text($"Generated on {DateTime.Now:dd-MM-yyyy HH:mm}");
            });
        }).GeneratePdf();

        return File(pdf, "application/pdf", "PNL_Report.pdf");
    }

    private async Task<IReadOnlyList<AccountBalanceRow>> BuildBalancesAsync(DateTime? fromDate, DateTime? toDate)
    {
        var accounts = await _db.Accounts
            .AsNoTracking()
            .OrderBy(a => a.Type)
            .ThenBy(a => a.Name)
            .ToListAsync();

        var lineQuery = _db.JournalLines
            .AsNoTracking()
            .Include(l => l.JournalEntry)
            .AsQueryable();

        if (fromDate.HasValue)
            lineQuery = lineQuery.Where(l => l.JournalEntry.Date >= fromDate.Value);

        if (toDate.HasValue)
            lineQuery = lineQuery.Where(l => l.JournalEntry.Date <= toDate.Value);

        var totals = await lineQuery
            .GroupBy(l => l.AccountId)
            .Select(g => new
            {
                AccountId = g.Key,
                Debit = g.Sum(x => x.Debit),
                Credit = g.Sum(x => x.Credit)
            })
            .ToDictionaryAsync(x => x.AccountId);

        return accounts.Select(account =>
        {
            totals.TryGetValue(account.Id, out var total);
            var debit = Money(total?.Debit ?? 0);
            var credit = Money(total?.Credit ?? 0);
            var raw = Money(debit - credit);
            var type = NormalizeType(account.Type);

            return new AccountBalanceRow
            {
                AccountId = account.Id,
                AccountName = account.Name,
                Type = type,
                NormalSide = IsDebitNormal(type) ? "DEBIT" : "CREDIT",
                Debit = debit,
                Credit = credit,
                RawBalance = raw,
                Balance = NaturalBalance(type, raw)
            };
        }).ToList();
    }

    private async Task<PnlReport> BuildPnlReportAsync(DateTime? fromDate, DateTime? toDate)
    {
        var balances = await BuildBalancesAsync(fromDate, toDate);

        var incomeAccounts = balances
            .Where(b => b.Type == "INCOME")
            .Select(b => new PnlAccountRow
            {
                AccountId = b.AccountId,
                AccountName = b.AccountName,
                Amount = Money(b.Balance)
            })
            .Where(b => Math.Abs(b.Amount) >= 0.01m)
            .OrderByDescending(b => b.Amount)
            .ToList();

        var expenseAccounts = balances
            .Where(b => b.Type == "EXPENSE")
            .Select(b => new PnlAccountRow
            {
                AccountId = b.AccountId,
                AccountName = b.AccountName,
                Amount = Money(b.Balance)
            })
            .Where(b => Math.Abs(b.Amount) >= 0.01m)
            .OrderByDescending(b => b.Amount)
            .ToList();

        var totalIncome = Money(incomeAccounts.Sum(x => x.Amount));
        var totalExpense = Money(expenseAccounts.Sum(x => x.Amount));

        return new PnlReport
        {
            FromDate = fromDate,
            ToDate = toDate,
            IncomeAccounts = incomeAccounts,
            ExpenseAccounts = expenseAccounts,
            TotalIncome = totalIncome,
            TotalExpense = totalExpense,
            Income = totalIncome,
            Expense = totalExpense,
            Net = Money(totalIncome - totalExpense),
            NetSurplus = Money(totalIncome - totalExpense)
        };
    }

    private async Task<JournalValidationResult> ValidateJournalAsync(JournalDto dto)
    {
        if (dto == null)
            return JournalValidationResult.Fail("Journal payload is required.");

        if (dto.Date == default)
            return JournalValidationResult.Fail("Journal date is required.");

        if (string.IsNullOrWhiteSpace(dto.Description))
            return JournalValidationResult.Fail("Journal description is required.");

        if (dto.Lines == null || dto.Lines.Count < 2)
            return JournalValidationResult.Fail("A journal entry must contain at least two lines.");

        var normalizedLines = new List<NormalizedJournalLine>();

        foreach (var line in dto.Lines)
        {
            var debit = Money(line.Debit);
            var credit = Money(line.Credit);

            if (line.AccountId <= 0)
                return JournalValidationResult.Fail("Every journal line must have an account.");

            if (debit < 0 || credit < 0)
                return JournalValidationResult.Fail("Debit and credit amounts cannot be negative.");

            if (debit > 0 && credit > 0)
                return JournalValidationResult.Fail("A single journal line cannot have both debit and credit.");

            if (debit == 0 && credit == 0)
                return JournalValidationResult.Fail("Every journal line must have either a debit or a credit amount.");

            normalizedLines.Add(new NormalizedJournalLine(line.AccountId, debit, credit));
        }

        var totalDebit = Money(normalizedLines.Sum(l => l.Debit));
        var totalCredit = Money(normalizedLines.Sum(l => l.Credit));

        if (Math.Abs(totalDebit - totalCredit) >= 0.01m)
            return JournalValidationResult.Fail($"Debit total {FormatMoney(totalDebit)} must equal credit total {FormatMoney(totalCredit)}.");

        if (normalizedLines.Select(l => l.AccountId).Distinct().Count() < 2)
            return JournalValidationResult.Fail("A journal entry must affect at least two different accounts.");

        var accountIds = normalizedLines.Select(l => l.AccountId).Distinct().ToList();
        var existingCount = await _db.Accounts.CountAsync(a => accountIds.Contains(a.Id));

        if (existingCount != accountIds.Count)
            return JournalValidationResult.Fail("One or more journal accounts do not exist.");

        return JournalValidationResult.Success(normalizedLines);
    }

    private static object ToJournalResponse(JournalEntry entry)
    {
        return new
        {
            entry.Id,
            entry.Date,
            entry.Description,
            entry.CreatedAt,
            totalDebit = Money(entry.Lines.Sum(l => l.Debit)),
            totalCredit = Money(entry.Lines.Sum(l => l.Credit)),
            lines = entry.Lines
                .OrderBy(l => l.Id)
                .Select(l => new
                {
                    l.Id,
                    l.AccountId,
                    accountName = l.Account?.Name,
                    accountType = NormalizeType(l.Account?.Type),
                    debit = Money(l.Debit),
                    credit = Money(l.Credit)
                })
        };
    }

    private static string NormalizeType(string? type)
    {
        return (type ?? string.Empty).Trim().ToUpperInvariant();
    }

    private static bool IsDebitNormal(string? accountType)
    {
        return DebitNormalTypes.Contains(NormalizeType(accountType));
    }

    private static decimal NaturalBalance(string? accountType, decimal rawDebitMinusCredit)
    {
        var raw = Money(rawDebitMinusCredit);
        return IsDebitNormal(accountType) ? raw : Money(-raw);
    }

    private static decimal Money(decimal value)
    {
        return Math.Round(value, 2, MidpointRounding.AwayFromZero);
    }

    private static DateTime ToUtc(DateTime date)
    {
        return date.Kind switch
        {
            DateTimeKind.Utc => date,
            DateTimeKind.Local => date.ToUniversalTime(),
            _ => DateTime.SpecifyKind(date, DateTimeKind.Utc)
        };
    }

    private static DateTime? NormalizeQueryDate(DateTime? date)
    {
        return date.HasValue ? ToUtc(date.Value) : null;
    }

    private static string FormatMoney(decimal amount)
    {
        return $"INR {Money(amount):N2}";
    }

    private static string FormatDate(DateTime? value)
    {
        return value.HasValue ? value.Value.ToString("dd-MM-yyyy") : "Start";
    }

    private sealed record NormalizedJournalLine(long AccountId, decimal Debit, decimal Credit);

    private sealed class JournalValidationResult
    {
        public bool Ok { get; private init; }
        public string Message { get; private init; } = string.Empty;
        public IReadOnlyList<NormalizedJournalLine> Lines { get; private init; } = Array.Empty<NormalizedJournalLine>();

        public static JournalValidationResult Success(IReadOnlyList<NormalizedJournalLine> lines)
        {
            return new JournalValidationResult { Ok = true, Lines = lines };
        }

        public static JournalValidationResult Fail(string message)
        {
            return new JournalValidationResult { Ok = false, Message = message };
        }
    }

    private sealed class AccountBalanceRow
    {
        public long AccountId { get; init; }
        public string AccountName { get; init; } = string.Empty;
        public string Type { get; init; } = string.Empty;
        public string NormalSide { get; init; } = string.Empty;
        public decimal Debit { get; init; }
        public decimal Credit { get; init; }
        public decimal RawBalance { get; init; }
        public decimal Balance { get; init; }
    }

    private sealed class PnlAccountRow
    {
        public long AccountId { get; init; }
        public string AccountName { get; init; } = string.Empty;
        public decimal Amount { get; init; }
    }

    private sealed class PnlReport
    {
        public DateTime? FromDate { get; init; }
        public DateTime? ToDate { get; init; }
        public List<PnlAccountRow> IncomeAccounts { get; init; } = new();
        public List<PnlAccountRow> ExpenseAccounts { get; init; } = new();
        public decimal TotalIncome { get; init; }
        public decimal TotalExpense { get; init; }
        public decimal Income { get; init; }
        public decimal Expense { get; init; }
        public decimal Net { get; init; }
        public decimal NetSurplus { get; init; }
    }
}
