// Dtos/AccountingDtos.cs

public class OpeningBalanceDto
{
    public long AccountId { get; set; }
    public decimal Amount { get; set; }
}

public class JournalDto
{
    public DateTime Date { get; set; }
    public string Description { get; set; }
    public List<JournalLineDto> Lines { get; set; }
}

public class JournalLineDto
{
    public long AccountId { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
}
