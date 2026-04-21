public class CreateLayhandCounsellingRequestDto
{
    public Guid MemberId { get; set; }
    public string Channel { get; set; } = "callcenter";
    public string? InitialNotes { get; set; }
}

public class UpdateLayhandCounsellingStatusDto
{
    public LayhandCounsellingStatus Status { get; set; }
    public DateTime? InitialCounsellingDateTime { get; set; }
    public Guid? CounsellorId { get; set; }

    public bool? LayhandRequired { get; set; }
    public DateOnly? LayhandDate { get; set; }
    public string? LayhandServiceSlot { get; set; }
    public Guid? LayhandPastorId { get; set; }

    public string? ClosureNotes { get; set; }
}