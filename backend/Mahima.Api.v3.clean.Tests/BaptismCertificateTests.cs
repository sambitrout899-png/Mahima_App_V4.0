using Mahima.Api.v3.clean.Controllers;
using System.Text;

namespace Mahima.Api.v3.clean.Tests;

public sealed class BaptismCertificateTests
{
    [Fact]
    public void AcceptsSupportedCertificateFormats()
    {
        Assert.Equal("application/pdf", BaptismsController.SignedCertificateContentType("signed.PDF", Encoding.ASCII.GetBytes("%PDF-1.7\n")));
        Assert.Equal("image/png", BaptismsController.SignedCertificateContentType("signed.png", new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }));
        Assert.Equal("image/jpeg", BaptismsController.SignedCertificateContentType("signed.jpeg", new byte[] { 255, 216, 255, 224 }));
    }

    [Theory]
    [InlineData("signed.pdf", "<html>not a certificate</html>")]
    [InlineData("signed.png", "%PDF-1.7")]
    [InlineData("signed.exe", "%PDF-1.7")]
    [InlineData("signed.pdf", "")]
    [InlineData("signed.pdf", "%PD")]
    public void RejectsDisallowedMismatchedAndEmptyFiles(string filename, string contents)
    {
        Assert.Null(BaptismsController.SignedCertificateContentType(filename, Encoding.ASCII.GetBytes(contents)));
    }
}
