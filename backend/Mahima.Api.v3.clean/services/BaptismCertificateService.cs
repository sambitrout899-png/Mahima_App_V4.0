using System;
using System.IO;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Mahima.Api.v3.clean.Services
{
    public class BaptismCertificateService : IBaptismCertificateService
    {
        public async Task<string> GenerateCertificateAsync(BaptismRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            // QuestPDF license
            QuestPDF.Settings.License = LicenseType.Community;

            // --------- Paths ---------
            var baseDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var certDir = Path.Combine(baseDir, "certificates", "baptisms");
            Directory.CreateDirectory(certDir);

            var fileName = $"BaptismCertificate_{request.Id}_{DateTime.UtcNow:yyyyMMddHHmmss}.pdf";
            var filePath = Path.Combine(certDir, fileName);

            // --------- Logo (optional) ---------
            byte[]? logoBytes = null;
            //var logoPath = Path.Combine(baseDir, "assets", "mahima-logo.png");
            var logoPath = "/var/www/mahima/assets/mahima-logo-DceKaDuH.png";
	    if (File.Exists(logoPath))
            {
                logoBytes = await File.ReadAllBytesAsync(logoPath);
            }

            // --------- Data / text ---------
            var fullName = string.IsNullOrWhiteSpace(request.FullName)
                ? "BAPTISM CANDIDATE"
                : request.FullName.ToUpperInvariant();

            var baptismDate = request.BaptismDate?.ToLocalTime().ToString("dd MMMM yyyy")
                              ?? "________________";

            var baptismPlace = string.IsNullOrWhiteSpace(request.BaptismPlace)
                ? "________________"
                : request.BaptismPlace;

            var verse =
                "“Therefore we are buried with him by baptism into death: " +
                "that like as Christ was raised up from the dead by the glory of the Father, " +
                "even so we also should walk in newness of life.” (Romans 6:4)";

            // --------- Document definition ---------
            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4.Landscape());
                    page.Margin(40);
                    page.PageColor(Colors.White);

                    page.Content().Element(content =>
                    {
                        content.Column(col =>
                        {
                            // Global spacing between items
                            col.Spacing(10);

                            // Logo (if present) - CONSTRAINED & SCALED
                            col.Item().Element(c =>
                            {
                                if (logoBytes is not null)
                                {
                                    c.AlignCenter()
                                     .MaxWidth(120)
                                     .MaxHeight(60)
                                     .Image(logoBytes)
                                     .FitArea();
                                }
                            });

                            // Ministry name
                            col.Item().Element(c =>
                            {
                                c.Text("Mahima Ministry")
                                 .FontSize(20)
                                 .SemiBold()
                                 .AlignCenter();
                            });

                            // Title
                            col.Item().Element(c =>
                            {
                                c.Text("Certificate of Baptism")
                                 .FontSize(28)
                                 .SemiBold()
                                 .AlignCenter();
                            });

                            // Subtitle
                            col.Item().Element(c =>
                            {
                                c.Text("Born of Water and the Spirit")
                                 .FontSize(16)
                                 .Italic()
                                 .AlignCenter();
                            });

                            // Extra space before main body
                            col.Item().Height(20);

                            // Main body text
                            col.Item().Element(c =>
                            {
                                c.AlignCenter().Text(text =>
                                {
                                    text.Span("This certifies that ").FontSize(14);
                                    text.Span(fullName + " ")
                                        .FontSize(18)
                                        .SemiBold();
                                    text.Span("has publicly confessed faith in our Lord Jesus Christ " +
                                              "and was baptized in the name of the Father, and of the Son, " +
                                              "and of the Holy Spirit.")
                                        .FontSize(14);
                                });
                            });

                            // Details
                            col.Item().Element(c =>
                            {
                                c.Text($"Baptism Date: {baptismDate}")
                                 .FontSize(12);
                            });

                            col.Item().Element(c =>
                            {
                                c.Text($"Place: {baptismPlace}")
                                 .FontSize(12);
                            });

                            if (!string.IsNullOrWhiteSpace(request.Token))
                            {
                                col.Item().Element(c =>
                                {
                                    c.Text("Baptism ID / Token: " + request.Token)
                                     .FontSize(12);
                                });
                            }

                            // Verse
                            col.Item().Element(c =>
                            {
                                c.Text(verse)
                                 .FontSize(11)
                                 .Italic()
                                 .AlignCenter();
                            });

                            // Extra space before signatures
                            col.Item().Height(20);

                            // Signature lines
                            col.Item().Element(c =>
                            {
                                c.Text("_____________________________")
                                 .AlignLeft();
                            });
                            col.Item().Element(c =>
                            {
                                c.Text("Baptized By / Pastor")
                                 .FontSize(11);
                            });

                            col.Item().Height(15);

                            col.Item().Element(c =>
                            {
                                c.Text("_____________________________")
                                 .AlignLeft();
                            });
                            col.Item().Element(c =>
                            {
                                c.Text("Witness / Elder")
                                 .FontSize(11);
                            });

                            col.Item().Height(15);

                            col.Item().Element(c =>
                            {
                                c.Text("_____________________________")
                                 .AlignLeft();
                            });
                            col.Item().Element(c =>
                            {
                                c.Text("Date Issued")
                                 .FontSize(11);
                            });

                            col.Item().Height(10);

                            // Footer info
                            col.Item().Element(c =>
                            {
                                c.Text("Issued on " + DateTime.UtcNow.ToLocalTime().ToString("dd MMMM yyyy"))
                                 .FontSize(10);
                            });

                            if (!string.IsNullOrWhiteSpace(request.Token))
                            {
                                col.Item().Element(c =>
                                {
                                    c.Text("Internal Reference: " + request.Token)
                                     .FontSize(10);
                                });
                            }
                        });
                    });
                });
            });

            // Generate PDF file on disk
            document.GeneratePdf(filePath);

            // Return relative URL to store in DB & serve via controller
            var relativeUrl = "/certificates/baptisms/" + fileName;
            return relativeUrl;
        }
    }
}
