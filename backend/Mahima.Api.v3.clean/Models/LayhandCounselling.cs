public enum LayhandCounsellingStatus
{
    InitialCounselling = 0,
    CounsellingSuccessful = 1,
    RequiresLayhand = 2,
    Closed = 3
}

public class LayhandCounsellingRequest
{
    public Guid Id { get; set; }
    public Guid MemberId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public LayhandCounsellingStatus Status { get; set; }
    public string Channel { get; set; } = "callcenter"; // or "inperson"
    public string? InitialNotes { get; set; }

    public DateTime? InitialCounsellingDateTime { get; set; }
    public Guid? CounsellorId { get; set; }

    public bool LayhandRequired { get; set; }
    public DateOnly? LayhandDate { get; set; }
    public string? LayhandServiceSlot { get; set; }
    public Guid? LayhandPastorId { get; set; }

    public string? TokenNumber { get; set; }
    public string? TokenPdfPath { get; set; }

    public string? ClosureNotes { get; set; }
}