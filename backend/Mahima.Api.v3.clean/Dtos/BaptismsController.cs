public class BaptismRequestCreateDto
{
    public string FullName { get; set; }
    public string FatherName { get; set; }
    public string MotherName { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string ContactNumber { get; set; }
    public string Email { get; set; }
    public string Address { get; set; }
    public DateTime? PreferredDate { get; set; }
    public string PreferredService { get; set; }
}

public class BaptismRequestResponseDto
{
    public int Id { get; set; }
    public string Token { get; set; }
    public string FullName { get; set; }
    public bool ChurchVerified { get; set; }
    public bool ConsentSigned { get; set; }
    public string Status { get; set; }
    public string CertificatePdfUrl { get; set; }
}
