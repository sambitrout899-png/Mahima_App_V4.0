using System.ComponentModel.DataAnnotations;

namespace Mahima.Api.v3.clean.Dtos
{
    public class AppLanguageDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NativeName { get; set; } = string.Empty;
        public bool Enabled { get; set; } = true;
        public bool IsDefault { get; set; } = false;
        public int DisplayOrder { get; set; } = 0;
        public bool Rtl { get; set; } = false;
    }

    public class CreateAppLanguageDto
    {
        [Required, MaxLength(8)]
        public string Code { get; set; } = string.Empty;

        [Required, MaxLength(80)]
        public string Name { get; set; } = string.Empty;

        [Required, MaxLength(80)]
        public string NativeName { get; set; } = string.Empty;

        public bool Enabled { get; set; } = true;
        public bool IsDefault { get; set; } = false;
        public int DisplayOrder { get; set; } = 0;
        public bool Rtl { get; set; } = false;
    }

    public class UpdateAppLanguageDto
    {
        public string? Name { get; set; }
        public string? NativeName { get; set; }
        public bool?   Enabled { get; set; }
        public bool?   IsDefault { get; set; }
        public int?    DisplayOrder { get; set; }
        public bool?   Rtl { get; set; }
    }
}
