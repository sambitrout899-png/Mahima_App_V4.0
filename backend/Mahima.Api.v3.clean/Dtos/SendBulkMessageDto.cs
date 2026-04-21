// Mahima.Api/Dtos/SendBulkMessageDto.cs
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Mahima.Api.v3.clean.Dtos
{
    public class SendBulkMessageDto
    {
        [Required]
        public IEnumerable<Guid> RecipientIds { get; set; } = Array.Empty<Guid>();

        [Required]
        [MaxLength(2000)]
        public string Message { get; set; } = string.Empty;

        // optionally, support content type/attachment
        public string? ContentType { get; set; } = "text";
        public string? AttachmentUrl { get; set; }
        public string? Subject { get; set; }
        public Guid? TaskId { get; set; }
    }
}
