// Dtos/ChatSummaryDto.cs
namespace Mahima.Api.v3.clean.Dtos
{
    public record ChatSummaryDto(
        Guid Id,                  // Chat Id is Guid
        string? Name,
        bool IsGroup,
        MessageDto? LastMessage,
        int UnreadCount
    );
}
