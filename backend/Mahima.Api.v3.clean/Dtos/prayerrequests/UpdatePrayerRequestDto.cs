// dtos/prayerrequests/UpdatePrayerRequestDto.cs
namespace Mahima.Api.v3.clean.Dtos.PrayerRequests
{
    public class UpdatePrayerRequestDto
    {
        public string? Status { get; set; }          // "new", "open", "prayed", "closed"
        public string? CloseComment { get; set; }    // admin notes when closing
    }
}
