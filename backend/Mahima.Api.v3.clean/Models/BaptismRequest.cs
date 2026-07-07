using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mahima.Api.v3.clean.Models
{
    [Table("baptism_requests", Schema = "public")]
    public class BaptismRequest
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("tenant_id")]
        public Guid TenantId { get; set; } = Guid.Parse("00000000-0000-0000-0000-000000000001");

        [Column("token")]
        public string? Token { get; set; }

        [Required]
        [Column("full_name")]
        public string FullName { get; set; } = string.Empty;

        [Column("father_name")]
        public string? FatherName { get; set; }

        [Column("mother_name")]
        public string? MotherName { get; set; }

        [Column("date_of_birth")]
        public DateTime? DateOfBirth { get; set; }

        [Column("contact_number")]
        public string? ContactNumber { get; set; }

        [Column("email")]
        public string? Email { get; set; }

        [Column("address")]
        public string? Address { get; set; }

        [Column("church_member_id")]
        public int? ChurchMemberId { get; set; }

        [Column("preferred_date")]
        public DateTime? PreferredDate { get; set; }

        [Column("preferred_service")]
        public string? PreferredService { get; set; }

        [Column("church_verified")]
        public bool ChurchVerified { get; set; }

        [Column("church_verified_by")]
        public int? ChurchVerifiedBy { get; set; }

        [Column("church_verified_at")]
        public DateTime? ChurchVerifiedAt { get; set; }

        [Column("consent_signed")]
        public bool ConsentSigned { get; set; }

        [Column("consent_signed_at")]
        public DateTime? ConsentSignedAt { get; set; }

        [Column("consent_signed_by")]
        public int? ConsentSignedBy { get; set; }

        [Required]
        [Column("status")]
        public string Status { get; set; } = "Pending";

        [Column("certificate_pdf_url")]
        public string? CertificatePdfUrl { get; set; }

        [Column("baptism_date")]
        public DateTime? BaptismDate { get; set; }

        [Column("baptism_place")]
        public string? BaptismPlace { get; set; }

        [Column("baptized_by_user_id")]
        public int? BaptizedByUserId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }
}
