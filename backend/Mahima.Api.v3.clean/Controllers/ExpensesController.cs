using Mahima.Api.v3.clean.Data;
// Mahima.Api/Controllers/ExpensesController.cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Dtos.Expenses;
using Mahima.Api.v3.clean.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/expenses")]  // <-- EXACT route your frontend is calling
    [Authorize]              // all endpoints require login
    //public class ExpensesController : ControllerBase
    //{
        //private readonly MahimaDbContext _db;
public class ExpensesController : ControllerBase
{
    private readonly MahimaDbContext _db;
    private readonly AccountingService _accountingService;
    private static readonly Guid RootTenantId = Guid.Parse("00000000-0000-0000-0000-000000000001");
//        public ExpensesController(MahimaDbContext db)
  //      {
    //        _db = db;
      //  }
public ExpensesController(MahimaDbContext db, AccountingService accountingService)
{
    _db = db;
    _accountingService = accountingService;
}

        private Guid GetCurrentTenantId() =>
            Guid.TryParse(User.FindFirstValue("tenant_id"), out var id)
                ? id
                : RootTenantId;

        // GET: /api/expenses?month=2025-11&category=PAYROLL
	[AllowAnonymous]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ExpenseDto>>> GetExpenses(
            [FromQuery] string? month,
            [FromQuery] string? category,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            var tenantId = GetCurrentTenantId();
            var query = _db.Expenses.Where(e => e.TenantId == tenantId);

            if (fromDate.HasValue)
            {
                query = query.Where(e => e.Date >= fromDate.Value.Date);
            }

            if (toDate.HasValue)
            {
                query = query.Where(e => e.Date <= toDate.Value.Date);
            }

            if (!fromDate.HasValue && !toDate.HasValue && !string.IsNullOrWhiteSpace(month))
            {
                // month expected format: "YYYY-MM"
                if (DateTime.TryParse(month + "-01", out var firstDay))
                {
                    var nextMonth = firstDay.AddMonths(1);
                    query = query.Where(e => e.Date >= firstDay && e.Date < nextMonth);
                }
            }

            if (!string.IsNullOrWhiteSpace(category))
            {
                query = query.Where(e => e.Category == category);
            }

            query = query
                .OrderByDescending(e => e.Date)
                .ThenByDescending(e => e.Id);

            var list = await query.ToListAsync();
            var result = list.Select(ToDto).ToList();
            return Ok(result);
        }

        // GET: /api/expenses/5
	[AllowAnonymous]
        [HttpGet("{id:long}")]
        public async Task<ActionResult<ExpenseDto>> GetExpense(long id)
        {
            var tenantId = GetCurrentTenantId();
            var exp = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.TenantId == tenantId);
            if (exp == null) return NotFound();
            return Ok(ToDto(exp));
        }

        // POST: /api/expenses
        [HttpPost]
        public async Task<ActionResult<ExpenseDto>> CreateExpense(
            [FromBody] CreateUpdateExpenseDto dto)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var exp = new Expense();
            Apply(dto, exp);

           var tenantId = GetCurrentTenantId();
           exp.TenantId = tenantId;
            exp.CreatedAt = DateTime.UtcNow;
            exp.UpdatedAt = DateTime.UtcNow;
            exp.CreatedByUserId = GetCurrentUserId();

            _db.Expenses.Add(exp);
            await _db.SaveChangesAsync();
		
	   await _accountingService.CreateExpenseEntry(tenantId, dto);

            var result = ToDto(exp);
            return CreatedAtAction(nameof(GetExpense), new { id = exp.Id }, result);
        }

        // PUT: /api/expenses/5
        [HttpPut("{id:long}")]
        public async Task<ActionResult<ExpenseDto>> UpdateExpense(
            long id,
            [FromBody] CreateUpdateExpenseDto dto)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var tenantId = GetCurrentTenantId();
            var exp = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.TenantId == tenantId);
            if (exp == null) return NotFound();

            Apply(dto, exp);
            exp.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(ToDto(exp));
        }

        // DELETE: /api/expenses/5
        [HttpDelete("{id:long}")]
        public async Task<IActionResult> DeleteExpense(long id)
        {
            var tenantId = GetCurrentTenantId();
            var exp = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.TenantId == tenantId);
            if (exp == null) return NotFound();

            _db.Expenses.Remove(exp);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ========= Helper methods =========

        private long? GetCurrentUserId()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                            ?? User.FindFirstValue("sub");
            if (long.TryParse(userIdStr, out var id)) return id;
            return null;
        }

        private static ExpenseDto ToDto(Expense e) => new ExpenseDto
        {
            Id = e.Id,
            Description = e.Description,
            Category = e.Category,
            Amount = e.Amount,
            Date = e.Date,
            Vendor = e.Vendor,
            Notes = e.Notes,
            PayrollPerson = e.PayrollPerson,
            PayrollMonth = e.PayrollMonth,
            CreatedAt = e.CreatedAt,
            UpdatedAt = e.UpdatedAt
        };

        private static void Apply(CreateUpdateExpenseDto dto, Expense e)
        {
            e.Description = dto.Description.Trim();
            e.Category = dto.Category?.Trim().ToUpperInvariant() ?? "OTHER";
            e.Amount = dto.Amount;
            e.Date = dto.Date.Date;
            e.Vendor = dto.Vendor?.Trim();
            e.Notes = dto.Notes?.Trim();
            e.PayrollPerson = dto.PayrollPerson?.Trim();
            e.PayrollMonth = string.IsNullOrWhiteSpace(dto.PayrollMonth)
                ? null
                : dto.PayrollMonth.Trim(); // frontend sends YYYY-MM
        }
    }
}
