// Mahima.Api/Dtos/AttachmentDto.cs
using System;

namespace Mahima.Api.v3.clean.Dtos
{
    public class AttachmentDto
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = "application/octet-stream"; // e.g., image/png, audio/webm
        public string Url  { get; set; } = string.Empty;
        public long? Size  { get; set; }

        public AttachmentDto() { }

        public AttachmentDto(string name, string type, string url, long? size = null)
        {
            Name = name ?? string.Empty;
            Type = string.IsNullOrWhiteSpace(type) ? "application/octet-stream" : type;
            Url  = url  ?? string.Empty;
            Size = size;
        }
    }
}
