namespace Mahima.Api.v3.clean.Models
{
    public class UserDto
    {
        public Guid? Id { get; set; }           // matches your DB PK (UUID in Postgres)
        public string? DisplayName { get; set; }
        public string? Username { get; set; }   // must match case expected by your API
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Role { get; set; }
        public DateTime? JoinDate { get; set; }
    }
}
