// Dtos/AccountingDtos.cs

public class OpeningBalanceDto
{
    public long AccountId { get; set; }
    public decimal Amount { get; set; }
}

public class JournalDto
{
    public DateTime Date { get; set; }
    public string Description { get; set; } = string.Empty;
    public List<JournalLineDto> Lines { get; set; } = new();
}

public class JournalLineDto
{
    public long AccountId { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
}

public class CreateAccountDto
{
    public string? Name { get; set; }
    public string? Type { get; set; }
}
