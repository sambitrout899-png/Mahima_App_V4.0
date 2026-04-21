using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Dtos;
using Mahima.Api.v3.clean.Models;

namespace Mahima.Api.v3.clean.Services
{
    public interface IChatService
    {
        Task<IEnumerable<ChatSummaryDto>> GetUserChatsAsync(Guid userId);

        Task<PaginatedResult<MessageDto>> GetMessagesAsync(Guid chatId, int page = 1, int size = 50);

        Task<MessageDto> AddMessageAsync(
            Guid chatId,
            Guid senderId,
            string content,
            string contentType = "text",
            string? attachmentUrl = null,
            List<AttachmentDto>? attachments = null);

        // ✅ Correct signature (Message.Id is GUID)
        Task MarkReadAsync(Guid chatId, Guid userId, Guid lastMessageId);

        Task<Chat> CreateOrGetDirectChatAsync(Guid currentUserId, string usernameOrEmail);
        Task<Chat> CreateOrGetDirectChatAsync(Guid userA, Guid userB);

        Task<IEnumerable<Guid>> GetChatMemberIdsAsync(Guid chatId);

        Task<Chat> CreateGroupChatAsync(Guid userId, string name, Guid[] memberIds);

        Task DeleteChatAsync(Guid chatId, Guid requestedBy);

        Task SoftDeleteChatAsync(Guid chatId, Guid requestedBy);
    }
}
