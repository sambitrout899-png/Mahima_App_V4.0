using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mahima.Api.v3.clean.Models
{
    [Table("prayerresponses", Schema = "public")]
    public class PrayerResponse
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public long Id { get; set; }   // matches prayerresponses.id (bigint)

        // matches DB column prayerrequestid (bigint)
        [Required]
        [Column("prayerrequestid")]
        public long PrayerRequestId { get; set; }

        [Column("userid")]
        public Guid? UserId { get; set; }

        // Map ResponseText to existing DB column 'message'
        [Required]
        [Column("message")]
        public string ResponseText { get; set; } = string.Empty;

        // Map RespondedBy to existing DB column 'author'
        [Column("author")]
        [MaxLength(200)]
        public string? RespondedBy { get; set; }

        // Map RespondedAt to existing DB column 'createdat' (which already has default now())
        [Column("createdat")]
        public DateTime RespondedAt { get; set; } = DateTime.UtcNow;

        // There is no isdeleted column in the DB currently.
        // Keep the property for code usage but mark NotMapped so EF won't expect a column.
        [NotMapped]
        public bool IsDeleted { get; set; } = false;

        // -------------------------------
        // Friendly aliases for backward compatibility
        // -------------------------------
        [NotMapped]
        public string Author
        {
            get => RespondedBy ?? string.Empty;
            set => RespondedBy = value;
        }

        [NotMapped]
        public string Message
        {
            get => ResponseText;
            set => ResponseText = value;
        }

        // The DB uses 'createdat' and 'updatedat' already — UpdatedAt maps to the DB column.
        [Column("updatedat")]
        public DateTime? UpdatedAt { get; set; }

        // -------------------------------
        // Navigation property
        // -------------------------------
        [ForeignKey(nameof(PrayerRequestId))]
        public virtual PrayerRequest? PrayerRequest { get; set; }
    }
}
