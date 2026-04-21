// Mahima.Api/Dtos/CreateChatDto.cs
using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Mahima.Api.v3.clean.Dtos
{
    public class CreateChatDto
    {
        // For direct chat: usernameOrEmail is required.
        [JsonPropertyName("usernameOrEmail")]
        public string? UsernameOrEmail { get; set; }

        // Optional display/name for a group
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("isGroup")]
        public bool IsGroup { get; set; } = false;

        // optional explicit member ids for group creation (guids from frontend)
        [JsonPropertyName("memberIds")]
        public Guid[]? MemberIds { get; set; }
    }
}
