using System;
using System.Collections.Generic;

namespace Mahima.Api.v3.clean.Dtos
{
    public class MessageDto
    {
        public Guid Id { get; set; }          // Guid (‼)
        public Guid ChatId { get; set; }
        public Guid SenderId { get; set; }
        public string? Content { get; set; }
        public DateTime CreatedAt { get; set; }

        public string ContentType { get; set; } = "text";
        public string? AttachmentUrl { get; set; }
        public List<AttachmentDto>? Attachments { get; set; }

        public MessageDto() { }

        // 5-arg ctor used in projections
        public MessageDto(Guid id, Guid chatId, Guid senderId, string? content, DateTime createdAt)
        {
            Id = id;
            ChatId = chatId;
            SenderId = senderId;
            Content = content;
            CreatedAt = createdAt;
        }

        // 8-arg ctor (your ChatService uses this)
        public MessageDto(
            Guid id,
            Guid chatId,
            Guid senderId,
            string? content,
            DateTime createdAt,
            string contentType,
            string? attachmentUrl,
            List<AttachmentDto>? attachments)
        {
            Id = id;
            ChatId = chatId;
            SenderId = senderId;
            Content = content;
            CreatedAt = createdAt;
            ContentType = string.IsNullOrWhiteSpace(contentType) ? "text" : contentType;
            AttachmentUrl = attachmentUrl;
            Attachments = attachments;
        }
    }
}
