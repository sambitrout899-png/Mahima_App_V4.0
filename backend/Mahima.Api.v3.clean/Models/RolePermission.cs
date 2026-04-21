using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Mahima.Api.v3.clean.Models
{
    [Table("role_permissions")]
    public class RolePermission
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("role_id")]
        public int RoleId { get; set; }

        [Column("page_key")]
        public string PageKey { get; set; } = string.Empty;

        // navigation
        [ForeignKey(nameof(RoleId))]
        public Role? Role { get; set; }
    }
}
