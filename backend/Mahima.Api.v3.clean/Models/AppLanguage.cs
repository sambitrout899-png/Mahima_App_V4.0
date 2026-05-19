using System;
using System.ComponentModel.DataAnnotations;

namespace Mahima.Api.v3.clean.Models
{
    /// <summary>
    /// Admin-managed application language.
    /// Drives the picker in Admin → Languages, the UI language list in
    /// LanguageContext, and the per-recipient language routing for the
    /// message center.
    /// </summary>
    public class AppLanguage
    {
        /// <summary>ISO 639-1 code, optionally with region suffix (e.g. "en", "hi", "pa", "pt-BR").</summary>
        [Key]
        [MaxLength(8)]
        public string Code { get; set; } = string.Empty;

        /// <summary>English display name, e.g. "Hindi".</summary>
        [MaxLength(80)]
        public string Name { get; set; } = string.Empty;

        /// <summary>Self-name in that language, e.g. "हिन्दी".</summary>
        [MaxLength(80)]
        public string NativeName { get; set; } = string.Empty;

        public bool Enabled { get; set; } = true;

        public bool IsDefault { get; set; } = false;

        public int DisplayOrder { get; set; } = 0;

        public bool Rtl { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
