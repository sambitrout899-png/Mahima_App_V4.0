using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MailKit;
using MailKit.Net.Imap;
using MailKit.Security;
using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Models;
using MimeKit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Authorize(Roles = "admin,ADMIN")]
    [Route("api/email-client")]
    public class EmailClientController : ControllerBase
    {
        private const string SettingsKey = "EmailClientSettings";
        private const string Mask = "********";
        private const long MaxTotalAttachmentBytes = 50L * 1024L * 1024L;
        private readonly MahimaDbContext _db;
        private readonly IDataProtector _protector;
        private readonly IConfiguration _config;
        private readonly ILogger<EmailClientController> _logger;

        public EmailClientController(
            MahimaDbContext db,
            IDataProtectionProvider dataProtectionProvider,
            IConfiguration config,
            ILogger<EmailClientController> logger)
        {
            _db = db;
            _protector = dataProtectionProvider.CreateProtector("Mahima.EmailClient.Settings.v1");
            _config = config;
            _logger = logger;
        }

        public class EmailClientSettingsDto
        {
            public string? SmtpHost { get; set; }
            public int SmtpPort { get; set; } = 587;
            public bool SmtpUseSsl { get; set; } = true;
            public string? SmtpUsername { get; set; }
            public string? SmtpPassword { get; set; }
            public string? FromAddress { get; set; }
            public string? FromName { get; set; }
            public string? ImapHost { get; set; }
            public int ImapPort { get; set; } = 993;
            public bool ImapUseSsl { get; set; } = true;
        }

        public class SendEmailDto
        {
            public string To { get; set; } = string.Empty;
            public string? Cc { get; set; }
            public string? Bcc { get; set; }
            public string Subject { get; set; } = string.Empty;
            public string Body { get; set; } = string.Empty;
        }

        public class SendEmailFormDto
        {
            public string To { get; set; } = string.Empty;
            public string? Cc { get; set; }
            public string? Bcc { get; set; }
            public string Subject { get; set; } = string.Empty;
            public string Body { get; set; } = string.Empty;
        }

        public class EmailFolderDto
        {
            public string Name { get; set; } = string.Empty;
            public string FullName { get; set; } = string.Empty;
            public bool IsInbox { get; set; }
            public bool IsSent { get; set; }
            public bool IsDrafts { get; set; }
            public bool IsTrash { get; set; }
        }

        public class EmailMessageSummaryDto
        {
            public string Uid { get; set; } = string.Empty;
            public string From { get; set; } = string.Empty;
            public string To { get; set; } = string.Empty;
            public string Cc { get; set; } = string.Empty;
            public string Subject { get; set; } = string.Empty;
            public DateTimeOffset? Date { get; set; }
            public bool Seen { get; set; }
            public bool HasAttachments { get; set; }
            public long? Size { get; set; }
        }

        public class EmailMessageDetailDto : EmailMessageSummaryDto
        {
            public string HtmlBody { get; set; } = string.Empty;
            public string TextBody { get; set; } = string.Empty;
            public List<EmailAttachmentDto> Attachments { get; set; } = new();
        }

        public class EmailAttachmentDto
        {
            public int Index { get; set; }
            public string FileName { get; set; } = string.Empty;
            public string ContentType { get; set; } = string.Empty;
            public long? Size { get; set; }
        }

        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings()
        {
            var settings = await ReadSettingsAsync();
            return Ok(ToClient(settings));
        }

        [HttpPut("settings")]
        public async Task<IActionResult> SaveSettings([FromBody] EmailClientSettingsDto dto)
        {
            var current = await ReadSettingsAsync();
            var settings = new EmailClientSettingsDto
            {
                SmtpHost = dto.SmtpHost?.Trim(),
                SmtpPort = dto.SmtpPort <= 0 ? 587 : dto.SmtpPort,
                SmtpUseSsl = dto.SmtpUseSsl,
                SmtpUsername = dto.SmtpUsername?.Trim(),
                SmtpPassword = IsMasked(dto.SmtpPassword) ? current.SmtpPassword : dto.SmtpPassword,
                FromAddress = dto.FromAddress?.Trim(),
                FromName = string.IsNullOrWhiteSpace(dto.FromName) ? "Mahima Ministries" : dto.FromName.Trim(),
                ImapHost = dto.ImapHost?.Trim(),
                ImapPort = dto.ImapPort <= 0 ? 993 : dto.ImapPort,
                ImapUseSsl = dto.ImapUseSsl
            };

            await WriteSettingsAsync(settings);
            return Ok(ToClient(settings));
        }

        [HttpPost("test")]
        public async Task<IActionResult> Test(CancellationToken cancellationToken)
        {
            var settings = await ReadSettingsAsync();
            try
            {
                ValidateSmtp(settings);
                var to = settings.FromAddress ?? settings.SmtpUsername ?? "";
                await SendAndSaveAsync(settings, to, null, null, "Mahima email connectivity test", "<p>Jai Masih Di. Email connectivity is working.</p>", Array.Empty<IFormFile>(), cancellationToken);
                return Ok(new { sent = true });
            }
            catch (TimeoutException ex)
            {
                _logger.LogWarning(ex, "SMTP test timed out.");
                return StatusCode(504, ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SMTP test failed.");
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("send")]
        public async Task<IActionResult> Send([FromBody] SendEmailDto dto, CancellationToken cancellationToken)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.To))
                return BadRequest("Recipient is required.");
            if (string.IsNullOrWhiteSpace(dto.Subject))
                return BadRequest("Subject is required.");

                var settings = await ReadSettingsAsync();
            try
            {
                ValidateSmtp(settings);
                var savedToSent = await SendAndSaveAsync(settings, dto.To, dto.Cc, dto.Bcc, dto.Subject, dto.Body, Array.Empty<IFormFile>(), cancellationToken);
                return Ok(new { sent = true, savedToSent });
            }
            catch (TimeoutException ex)
            {
                _logger.LogWarning(ex, "SMTP send timed out for {To}", dto.To);
                return StatusCode(504, ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SMTP send failed for {To}", dto.To);
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("send-with-attachments")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(MaxTotalAttachmentBytes + (2L * 1024L * 1024L))]
        [RequestFormLimits(MultipartBodyLengthLimit = MaxTotalAttachmentBytes + (2L * 1024L * 1024L))]
        public async Task<IActionResult> SendWithAttachments([FromForm] SendEmailFormDto dto, CancellationToken cancellationToken)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.To))
                return BadRequest("Recipient is required.");
            if (string.IsNullOrWhiteSpace(dto.Subject))
                return BadRequest("Subject is required.");

            var files = Request.Form.Files ?? new FormFileCollection();
            var totalBytes = files.Sum(f => f.Length);
            if (totalBytes > MaxTotalAttachmentBytes)
                return BadRequest("Attachments are too large. Maximum total attachment size is 50 MB.");

            var settings = await ReadSettingsAsync();
            try
            {
                ValidateSmtp(settings);
                var savedToSent = await SendAndSaveAsync(settings, dto.To, dto.Cc, dto.Bcc, dto.Subject, dto.Body, files, cancellationToken);
                return Ok(new { sent = true, savedToSent, attachments = files.Count });
            }
            catch (TimeoutException ex)
            {
                _logger.LogWarning(ex, "SMTP send with attachments timed out for {To}", dto.To);
                return StatusCode(504, ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SMTP send with attachments failed for {To}", dto.To);
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("folders")]
        public async Task<IActionResult> GetFolders(CancellationToken cancellationToken)
        {
            var settings = await ReadSettingsAsync();
            try
            {
                ValidateImap(settings);
                return Ok(new { folders = await FetchFoldersAsync(settings, cancellationToken) });
            }
            catch (TimeoutException ex)
            {
                _logger.LogWarning(ex, "IMAP folder fetch timed out.");
                return StatusCode(504, ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "IMAP folder fetch failed.");
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("inbox")]
        public async Task<IActionResult> GetInbox([FromQuery] int take = 25, [FromQuery] int skip = 0, [FromQuery] string folder = "INBOX", CancellationToken cancellationToken = default)
        {
            take = Math.Clamp(take, 1, 500);
            skip = Math.Max(skip, 0);

            var settings = await ReadSettingsAsync();
            try
            {
                ValidateImap(settings);
                var result = await FetchInboxAsync(settings, folder, take, skip, cancellationToken);
                return Ok(result);
            }
            catch (TimeoutException ex)
            {
                _logger.LogWarning(ex, "IMAP inbox fetch timed out.");
                return StatusCode(504, ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "IMAP inbox fetch failed.");
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("message/{uid}")]
        public async Task<IActionResult> GetMessage(string uid, [FromQuery] string folder = "INBOX", [FromQuery] bool markRead = false, CancellationToken cancellationToken = default)
        {
            if (!uint.TryParse(uid, out var uidValue))
                return BadRequest("Invalid message uid.");

            var settings = await ReadSettingsAsync();
            try
            {
                ValidateImap(settings);
                var result = await FetchMessageAsync(settings, folder, new UniqueId(uidValue), markRead, cancellationToken);
                return Ok(result);
            }
            catch (TimeoutException ex)
            {
                _logger.LogWarning(ex, "IMAP message fetch timed out.");
                return StatusCode(504, ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "IMAP message fetch failed for {Uid}", uid);
                return BadRequest(ex.Message);
            }
        }

        private async Task<EmailClientSettingsDto> ReadSettingsAsync()
        {
            var row = await _db.MinistryAutomationSettings.FirstOrDefaultAsync(s => s.Key == SettingsKey);
            if (row == null || string.IsNullOrWhiteSpace(row.Value))
                return FromConfiguration();

            try
            {
                var stored = JsonSerializer.Deserialize<EmailClientSettingsDto>(row.Value, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                             ?? new EmailClientSettingsDto();
                stored.SmtpPassword = Unprotect(stored.SmtpPassword);
                return stored;
            }
            catch
            {
                return FromConfiguration();
            }
        }

        private async Task WriteSettingsAsync(EmailClientSettingsDto settings)
        {
            var stored = new EmailClientSettingsDto
            {
                SmtpHost = settings.SmtpHost,
                SmtpPort = settings.SmtpPort,
                SmtpUseSsl = settings.SmtpUseSsl,
                SmtpUsername = settings.SmtpUsername,
                SmtpPassword = Protect(settings.SmtpPassword),
                FromAddress = settings.FromAddress,
                FromName = settings.FromName,
                ImapHost = settings.ImapHost,
                ImapPort = settings.ImapPort,
                ImapUseSsl = settings.ImapUseSsl
            };

            var json = JsonSerializer.Serialize(stored);
            var row = await _db.MinistryAutomationSettings.FirstOrDefaultAsync(s => s.Key == SettingsKey);
            if (row == null)
            {
                _db.MinistryAutomationSettings.Add(new MinistryAutomationSetting
                {
                    Key = SettingsKey,
                    Value = json,
                    UpdatedAtUtc = DateTime.UtcNow
                });
            }
            else
            {
                row.Value = json;
                row.UpdatedAtUtc = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
        }

        private static EmailClientSettingsDto ToClient(EmailClientSettingsDto settings)
        {
            return new EmailClientSettingsDto
            {
                SmtpHost = settings.SmtpHost,
                SmtpPort = settings.SmtpPort,
                SmtpUseSsl = settings.SmtpUseSsl,
                SmtpUsername = settings.SmtpUsername,
                SmtpPassword = string.IsNullOrWhiteSpace(settings.SmtpPassword) ? "" : Mask,
                FromAddress = settings.FromAddress,
                FromName = settings.FromName,
                ImapHost = settings.ImapHost,
                ImapPort = settings.ImapPort,
                ImapUseSsl = settings.ImapUseSsl
            };
        }

        private void ValidateSmtp(EmailClientSettingsDto settings)
        {
            if (string.IsNullOrWhiteSpace(settings.SmtpHost))
                throw new InvalidOperationException("SMTP host is not configured.");
            if (string.IsNullOrWhiteSpace(settings.SmtpUsername) || string.IsNullOrWhiteSpace(settings.SmtpPassword))
                throw new InvalidOperationException("SMTP username/password are not configured.");
            if (string.IsNullOrWhiteSpace(settings.FromAddress))
                throw new InvalidOperationException("From address is not configured.");
        }

        private static void ValidateImap(EmailClientSettingsDto settings)
        {
            if (string.IsNullOrWhiteSpace(settings.ImapHost))
                throw new InvalidOperationException("IMAP host is not configured.");
            if (settings.ImapPort <= 0)
                throw new InvalidOperationException("IMAP port is not configured.");
            if (string.IsNullOrWhiteSpace(settings.SmtpUsername) || string.IsNullOrWhiteSpace(settings.SmtpPassword))
                throw new InvalidOperationException("Email username/password are not configured.");
        }

        private EmailClientSettingsDto FromConfiguration()
        {
            var section = _config.GetSection("Email");
            return new EmailClientSettingsDto
            {
                SmtpHost = section["Host"] ?? "",
                SmtpPort = int.TryParse(section["Port"], out var port) ? port : 587,
                SmtpUseSsl = !bool.TryParse(section["UseSsl"], out var ssl) || ssl,
                SmtpUsername = section["Username"] ?? "",
                SmtpPassword = section["Password"] ?? "",
                FromAddress = section["FromAddress"] ?? section["Username"] ?? "",
                FromName = section["FromName"] ?? "Mahima Ministries",
                ImapHost = section["ImapHost"] ?? "",
                ImapPort = int.TryParse(section["ImapPort"], out var imapPort) ? imapPort : 993,
                ImapUseSsl = !bool.TryParse(section["ImapUseSsl"], out var imapSsl) || imapSsl
            };
        }

        private async Task<bool> SendAndSaveAsync(
            EmailClientSettingsDto settings,
            string to,
            string? cc,
            string? bcc,
            string subject,
            string body,
            IReadOnlyList<IFormFile> files,
            CancellationToken cancellationToken)
        {
            var message = await BuildMessageAsync(settings, to, cc, bcc, subject, body, files, cancellationToken);
            await SendSmtpAsync(settings, message, cancellationToken);
            return await TryAppendToSentAsync(settings, message, cancellationToken);
        }

        private static async Task<MimeMessage> BuildMessageAsync(
            EmailClientSettingsDto settings,
            string to,
            string? cc,
            string? bcc,
            string subject,
            string body,
            IReadOnlyList<IFormFile> files,
            CancellationToken cancellationToken)
        {
            var message = new MimeMessage
            {
                Subject = subject,
                Date = DateTimeOffset.UtcNow
            };

            message.From.Add(new MailboxAddress(settings.FromName ?? "Mahima Ministries", settings.FromAddress!));
            AddRecipients(message.To, to);
            AddRecipients(message.Cc, cc);
            AddRecipients(message.Bcc, bcc);

            if (message.To.Count == 0)
                throw new InvalidOperationException("At least one valid recipient is required.");

            var builder = new BodyBuilder
            {
                HtmlBody = string.IsNullOrWhiteSpace(body) ? subject : body.Replace("\n", "<br />"),
                TextBody = string.IsNullOrWhiteSpace(body) ? subject : body
            };

            foreach (var file in files.Where(f => f.Length > 0))
            {
                var fileName = SanitizeAttachmentFileName(file.FileName);
                using var stream = file.OpenReadStream();
                using var memory = new MemoryStream();
                await stream.CopyToAsync(memory, cancellationToken);
                builder.Attachments.Add(fileName, memory.ToArray(), GetAttachmentContentType(file));
            }

            message.Body = builder.ToMessageBody();
            return message;
        }

        private static async Task SendSmtpAsync(EmailClientSettingsDto settings, MimeMessage message, CancellationToken cancellationToken)
        {
            using var client = new MailKit.Net.Smtp.SmtpClient();
            var secureSocketOptions = GetSmtpSecureSocketOptions(settings);

            var connectTask = client.ConnectAsync(settings.SmtpHost, settings.SmtpPort, secureSocketOptions, cancellationToken);
            var timeoutTask = Task.Delay(TimeSpan.FromSeconds(25), cancellationToken);
            var completed = await Task.WhenAny(connectTask, timeoutTask);

            if (completed != connectTask)
                throw new TimeoutException("SMTP connection timed out after 25 seconds. For Hostinger, use smtp.hostinger.com with port 465 SSL/TLS or port 587 STARTTLS.");

            await connectTask;

            try
            {
                await client.AuthenticateAsync(settings.SmtpUsername, settings.SmtpPassword, cancellationToken);
                await client.SendAsync(message, cancellationToken);
            }
            finally
            {
                if (client.IsConnected)
                    await client.DisconnectAsync(true, cancellationToken);
            }
        }

        private async Task<bool> TryAppendToSentAsync(EmailClientSettingsDto settings, MimeMessage message, CancellationToken cancellationToken)
        {
            try
            {
                ValidateImap(settings);

                using var client = new ImapClient();
                await ConnectAndAuthenticateImapAsync(client, settings, cancellationToken);

                try
                {
                    var sentFolder = await FindSentFolderAsync(client, cancellationToken);
                    if (sentFolder == null)
                    {
                        _logger.LogWarning("Email was sent but no IMAP Sent folder was found.");
                        return false;
                    }

                    await sentFolder.AppendAsync(message, MessageFlags.Seen, cancellationToken);
                    return true;
                }
                finally
                {
                    if (client.IsConnected)
                        await client.DisconnectAsync(true, cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Email was sent but could not be saved to the Sent folder.");
                return false;
            }
        }

        private static string SanitizeAttachmentFileName(string? fileName)
        {
            var clean = Path.GetFileName(fileName ?? "").Trim();
            return string.IsNullOrWhiteSpace(clean) ? "attachment" : clean;
        }

        private static ContentType GetAttachmentContentType(IFormFile file)
        {
            try
            {
                if (!string.IsNullOrWhiteSpace(file.ContentType))
                    return ContentType.Parse(file.ContentType);
            }
            catch
            {
                // Ignore malformed browser content types and fall back to a safe binary MIME type.
            }

            return new ContentType("application", "octet-stream");
        }

        private static void AddRecipients(InternetAddressList list, string? addresses)
        {
            foreach (var recipient in (addresses ?? string.Empty).Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries).Select(v => v.Trim()))
            {
                if (!string.IsNullOrWhiteSpace(recipient))
                    list.Add(MailboxAddress.Parse(recipient));
            }
        }

        private static SecureSocketOptions GetSmtpSecureSocketOptions(EmailClientSettingsDto settings)
        {
            if (!settings.SmtpUseSsl)
                return SecureSocketOptions.None;

            return settings.SmtpPort == 465
                ? SecureSocketOptions.SslOnConnect
                : SecureSocketOptions.StartTls;
        }

        private static async Task<object> FetchInboxAsync(EmailClientSettingsDto settings, string folderName, int take, int skip, CancellationToken cancellationToken)
        {
            using var client = new ImapClient();
            var connectTask = client.ConnectAsync(
                settings.ImapHost,
                settings.ImapPort,
                settings.ImapUseSsl ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTlsWhenAvailable,
                cancellationToken);
            var timeoutTask = Task.Delay(TimeSpan.FromSeconds(25), cancellationToken);
            var completed = await Task.WhenAny(connectTask, timeoutTask);
            if (completed != connectTask)
                throw new TimeoutException("IMAP connection timed out after 25 seconds. Check IMAP host, port, SSL/TLS, firewall, and username/password.");
            await connectTask;

            try
            {
                await client.AuthenticateAsync(settings.SmtpUsername, settings.SmtpPassword, cancellationToken);

                var mailFolder = string.Equals(folderName, "INBOX", StringComparison.OrdinalIgnoreCase)
                    ? client.Inbox
                    : await client.GetFolderAsync(folderName, cancellationToken);

                await mailFolder.OpenAsync(FolderAccess.ReadOnly, cancellationToken);

                var total = mailFolder.Count;
                var end = total - 1 - skip;
                var start = Math.Max(0, end - take + 1);
                var messages = new List<EmailMessageSummaryDto>();

                if (end >= 0 && start <= end)
                {
                    var summaries = await mailFolder.FetchAsync(
                        start,
                        end,
                        MessageSummaryItems.UniqueId |
                        MessageSummaryItems.Envelope |
                        MessageSummaryItems.Flags |
                        MessageSummaryItems.InternalDate |
                        MessageSummaryItems.Size |
                        MessageSummaryItems.BodyStructure,
                        cancellationToken);

                    messages = summaries
                        .OrderByDescending(s => s.Index)
                        .Select(s => new EmailMessageSummaryDto
                        {
                            Uid = s.UniqueId.Id.ToString(),
                            From = FormatAddresses(s.Envelope?.From),
                            To = FormatAddresses(s.Envelope?.To),
                            Cc = FormatAddresses(s.Envelope?.Cc),
                            Subject = s.Envelope?.Subject ?? "(No subject)",
                            Date = s.Date != default ? s.Date : s.InternalDate,
                            Seen = s.Flags?.HasFlag(MessageFlags.Seen) == true,
                            HasAttachments = s.Attachments?.Any() == true,
                            Size = s.Size
                        })
                        .ToList();
                }

                return new
                {
                    folder = mailFolder.FullName,
                    total,
                    skip,
                    take,
                    messages
                };
            }
            finally
            {
                if (client.IsConnected)
                    await client.DisconnectAsync(true, cancellationToken);
            }
        }

        private static async Task<List<EmailFolderDto>> FetchFoldersAsync(EmailClientSettingsDto settings, CancellationToken cancellationToken)
        {
            using var client = new ImapClient();
            await ConnectAndAuthenticateImapAsync(client, settings, cancellationToken);

            try
            {
                var folders = new List<EmailFolderDto>
                {
                    MapFolder(client.Inbox)
                };

                foreach (var ns in client.PersonalNamespaces)
                {
                    var root = client.GetFolder(ns);
                    var children = await GetAllSubfoldersAsync(root, cancellationToken);
                    folders.AddRange(children.Select(MapFolder));
                }

                return folders
                    .GroupBy(f => f.FullName, StringComparer.OrdinalIgnoreCase)
                    .Select(g => g.First())
                    .OrderByDescending(f => f.IsInbox)
                    .ThenByDescending(f => f.IsSent)
                    .ThenBy(f => f.Name, StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }
            finally
            {
                if (client.IsConnected)
                    await client.DisconnectAsync(true, cancellationToken);
            }
        }

        private static EmailFolderDto MapFolder(IMailFolder folder)
        {
            var fullName = folder.FullName ?? folder.Name ?? "INBOX";
            var name = folder.Name ?? fullName;
            var lower = fullName.ToLowerInvariant();

            return new EmailFolderDto
            {
                Name = string.IsNullOrWhiteSpace(name) ? fullName : name,
                FullName = fullName,
                IsInbox = string.Equals(fullName, "INBOX", StringComparison.OrdinalIgnoreCase),
                IsSent = IsSentFolderName(fullName) || lower.Contains("sent"),
                IsDrafts = lower.Contains("draft"),
                IsTrash = lower.Contains("trash") || lower.Contains("deleted")
            };
        }

        private static async Task<List<IMailFolder>> GetAllSubfoldersAsync(IMailFolder root, CancellationToken cancellationToken)
        {
            var folders = new List<IMailFolder>();
            foreach (var child in await root.GetSubfoldersAsync(false, cancellationToken))
            {
                folders.Add(child);
                folders.AddRange(await GetAllSubfoldersAsync(child, cancellationToken));
            }

            return folders;
        }

        private static async Task<IMailFolder?> FindSentFolderAsync(ImapClient client, CancellationToken cancellationToken)
        {
            var folders = new List<IMailFolder> { client.Inbox };
            foreach (var ns in client.PersonalNamespaces)
            {
                var root = client.GetFolder(ns);
                folders.AddRange(await GetAllSubfoldersAsync(root, cancellationToken));
            }

            return folders
                .GroupBy(f => f.FullName, StringComparer.OrdinalIgnoreCase)
                .Select(g => g.First())
                .FirstOrDefault(f => IsSentFolderName(f.FullName) || IsSentFolderName(f.Name));
        }

        private static bool IsSentFolderName(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return false;
            var lower = value.ToLowerInvariant();
            return lower == "sent" ||
                   lower.EndsWith("/sent") ||
                   lower.EndsWith(".sent") ||
                   lower.Contains("sent mail") ||
                   lower.Contains("sent items") ||
                   lower.Contains("sent messages");
        }

        private static async Task<EmailMessageDetailDto> FetchMessageAsync(EmailClientSettingsDto settings, string folderName, UniqueId uid, bool markRead, CancellationToken cancellationToken)
        {
            using var client = new ImapClient();
            await ConnectAndAuthenticateImapAsync(client, settings, cancellationToken);

            try
            {
                var mailFolder = string.Equals(folderName, "INBOX", StringComparison.OrdinalIgnoreCase)
                    ? client.Inbox
                    : await client.GetFolderAsync(folderName, cancellationToken);

                await mailFolder.OpenAsync(markRead ? FolderAccess.ReadWrite : FolderAccess.ReadOnly, cancellationToken);
                var message = await mailFolder.GetMessageAsync(uid, cancellationToken);

                if (markRead)
                    await mailFolder.AddFlagsAsync(uid, MessageFlags.Seen, true, cancellationToken);

                var attachments = message.Attachments
                    .Select((attachment, index) => new EmailAttachmentDto
                    {
                        Index = index,
                        FileName = attachment.ContentDisposition?.FileName ?? attachment.ContentType.Name ?? $"attachment-{index + 1}",
                        ContentType = attachment.ContentType?.MimeType ?? "application/octet-stream",
                        Size = null
                    })
                    .ToList();

                return new EmailMessageDetailDto
                {
                    Uid = uid.Id.ToString(),
                    From = FormatAddresses(message.From),
                    To = FormatAddresses(message.To),
                    Cc = FormatAddresses(message.Cc),
                    Subject = message.Subject ?? "(No subject)",
                    Date = message.Date != default ? message.Date : null,
                    Seen = true,
                    HasAttachments = attachments.Count > 0,
                    HtmlBody = message.HtmlBody ?? "",
                    TextBody = message.TextBody ?? "",
                    Attachments = attachments
                };
            }
            finally
            {
                if (client.IsConnected)
                    await client.DisconnectAsync(true, cancellationToken);
            }
        }

        private static async Task ConnectAndAuthenticateImapAsync(ImapClient client, EmailClientSettingsDto settings, CancellationToken cancellationToken)
        {
            var connectTask = client.ConnectAsync(
                settings.ImapHost,
                settings.ImapPort,
                settings.ImapUseSsl ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTlsWhenAvailable,
                cancellationToken);
            var timeoutTask = Task.Delay(TimeSpan.FromSeconds(25), cancellationToken);
            var completed = await Task.WhenAny(connectTask, timeoutTask);
            if (completed != connectTask)
                throw new TimeoutException("IMAP connection timed out after 25 seconds. Check IMAP host, port, SSL/TLS, firewall, and username/password.");
            await connectTask;
            await client.AuthenticateAsync(settings.SmtpUsername, settings.SmtpPassword, cancellationToken);
        }

        private static string FormatAddresses(InternetAddressList? addresses)
        {
            if (addresses == null || addresses.Count == 0) return "";
            return string.Join(", ", addresses.OfType<MailboxAddress>().Select(m =>
                string.IsNullOrWhiteSpace(m.Name) ? m.Address : $"{m.Name} <{m.Address}>"));
        }

        private string Protect(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? "" : _protector.Protect(value);
        }

        private string Unprotect(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return "";
            try { return _protector.Unprotect(value); }
            catch { return value; }
        }

        private static bool IsMasked(string? value) =>
            string.IsNullOrWhiteSpace(value) || value.Trim() == Mask;
    }
}
