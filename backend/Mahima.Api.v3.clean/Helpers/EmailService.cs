using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Mahima.Api.v3.clean.Helpers
{
    public interface IEmailService
    {
        Task SendAsync(string toEmail, string subject, string htmlBody, string? textBody = null);
    }

    /// <summary>
    /// Sends transactional email through SMTP. Configured via appsettings.json:
    ///
    ///   "Email": {
    ///     "Host":       "smtp.hostinger.com",
    ///     "Port":       465,
    ///     "UseSsl":     true,
    ///     "Username":   "sambit.rout@mahimaministries.in",
    ///     "Password":   "...",
    ///     "FromAddress":"sambit.rout@mahimaministries.in",
    ///     "FromName":   "Mahima Ministries"
    ///   }
    ///
    /// Hostinger requires implicit-SSL on port 465. System.Net.Mail's SmtpClient
    /// historically struggled with implicit SSL on .NET Framework, but .NET 5+
    /// supports it correctly via EnableSsl + port 465.
    /// </summary>
    public class SmtpEmailService : IEmailService
    {
        private readonly ILogger<SmtpEmailService> _logger;
        private readonly string _host;
        private readonly int _port;
        private readonly bool _useSsl;
        private readonly string _username;
        private readonly string _password;
        private readonly string _fromAddress;
        private readonly string _fromName;

        public SmtpEmailService(IConfiguration config, ILogger<SmtpEmailService> logger)
        {
            _logger = logger;
            var section = config.GetSection("Email");

            _host        = section["Host"]        ?? "smtp.hostinger.com";
            _port        = int.TryParse(section["Port"], out var p) ? p : 465;
            _useSsl      = !bool.TryParse(section["UseSsl"], out var ssl) || ssl; // default true
            _username    = section["Username"]    ?? "";
            _password    = section["Password"]    ?? "";
            _fromAddress = section["FromAddress"] ?? _username;
            _fromName    = section["FromName"]    ?? "Mahima Ministries";
        }

        public async Task SendAsync(string toEmail, string subject, string htmlBody, string? textBody = null)
        {
            if (string.IsNullOrWhiteSpace(toEmail))
                throw new ArgumentException("Recipient email is required.", nameof(toEmail));

            if (string.IsNullOrWhiteSpace(_username) || string.IsNullOrWhiteSpace(_password))
            {
                _logger.LogWarning("Email not sent — SMTP credentials missing in Email config.");
                throw new InvalidOperationException("Email service is not configured (Email:Username / Email:Password).");
            }

            using var message = new MailMessage();
            message.From = new MailAddress(_fromAddress, _fromName);
            message.To.Add(new MailAddress(toEmail));
            message.Subject = subject;
            message.IsBodyHtml = true;
            message.Body = htmlBody;

            if (!string.IsNullOrWhiteSpace(textBody))
            {
                var plain = AlternateView.CreateAlternateViewFromString(textBody, null, "text/plain");
                var html  = AlternateView.CreateAlternateViewFromString(htmlBody, null, "text/html");
                message.AlternateViews.Add(plain);
                message.AlternateViews.Add(html);
                message.Body = textBody; // overridden by alternates
                message.IsBodyHtml = false;
            }

            using var client = new SmtpClient(_host, _port)
            {
                EnableSsl = _useSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(_username, _password),
                Timeout = 30000,
            };

            try
            {
                await client.SendMailAsync(message);
                _logger.LogInformation("Email sent to {To} subject='{Subject}'", toEmail, subject);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email to {To}", toEmail);
                throw;
            }
        }
    }
}
