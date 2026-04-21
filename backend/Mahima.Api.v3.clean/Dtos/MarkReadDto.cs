namespace Mahima.Api.v3.clean.Dtos
{
    public class MarkReadDto
    {
        public Guid LastMessageId { get; set; } // ✅ must be Guid now
    }
}