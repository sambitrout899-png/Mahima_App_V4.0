using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mahima.Api.v3.clean.Models
{
    [Table("pages")]
    public class Page
    {
        // your pages table stores key (string) and also has 'id' (you appear to have both).
        // We'll map the numeric id as well as key properties.
        [Column("id")]
        public int? Id { get; set; }

        [Key]
        [Column("key")]
        [MaxLength(200)]
        public string Key { get; set; } = string.Empty;

        [Column("title")]
        public string? Title { get; set; }

        [Column("description")]
        public string? Description { get; set; }

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }
    }
}
