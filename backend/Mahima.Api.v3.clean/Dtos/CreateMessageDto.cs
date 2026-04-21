// File: Mahima.Api/Dtos/CreateMessageDto.cs
using System.ComponentModel.DataAnnotations;

namespace Mahima.Api.v3.clean.Dtos
{public class CreateMessageDto
    {
        public string Content { get; set; } = string.Empty;
        public string? ContentType { get; set; } = "text"; // text/image/file/audio
        public string? AttachmentUrl { get; set; } // legacy single-URL
        public List<AttachmentDto>? Attachments { get; set; } // modern multi-attachments
    }
}
