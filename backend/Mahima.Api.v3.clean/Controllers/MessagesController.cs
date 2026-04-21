using Mahima.Api.v3.clean.Data;
// Controllers/MessagesController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;
using System.Net;
using System.Net.Mail;
using Mahima.Api.v3.clean.Hubs;
using Mahima.Api.v3.clean.Models;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MessagesController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly ILogger<MessagesController> _logger;
        private readonly MahimaDbContext _db;
        private readonly IHubContext<ChatHub> _hub;

        public MessagesController(IConfiguration config, ILogger<MessagesController> logger, MahimaDbContext db, IHubContext<ChatHub> hub)
        {
            _config = config;
            _logger = logger;
            _db = db;
            _hub = hub;
        }

        // DTO used for message posting
        public class ChatMessageDto
        {
            public string Content { get; set; } = "";
            public string ContentType { get; set; } = "text";
            public string? AttachmentUrl { get; set; }
        }

        // ----------------------------------------------------------------------
        // 🟢 CHAT MESSAGING ENDPOINTS
        // ----------------------------------------------------------------------

        /// <summary>
        /// Get full chat history for a chat
        /// GET /api/messages/chat/{chatId}
        /// </summary>
        [HttpGet("chat/{chatId}")]
        public async Task<IActionResult> GetChatMessages(Guid chatId)
        {
            try
            {
                var messages = await _db.Messages
                    .Where(m => m.ChatId == chatId)
                    .OrderBy(m => m.CreatedAt)
                    .Select(m => new
                    {
                        id = m.Id,
                        chatId = m.ChatId,
                        senderId = m.SenderId,
                        content = m.Content,
                        contentType = m.ContentType,
                        attachmentUrl = m.AttachmentUrl,
                        createdAt = m.CreatedAt
                    })
                    .ToListAsync();

                return Ok(messages);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get messages for chat {ChatId}", chatId);
                return StatusCode(500, "Error loading chat messages.");
            }
        }

        /// <summary>
        /// Post a message to a specific chat
        /// POST /api/messages/chat/{chatId}
        /// Body: { "content": "Hello" }
        /// </summary>
        [HttpPost("chat/{chatId}")]
        public async Task<IActionResult> PostMessage(Guid chatId, [FromBody] ChatMessageDto dto)
        {
            try
            {
                if (chatId == Guid.Empty)
                    return BadRequest("Invalid chatId.");

                if (dto == null)
                    return BadRequest("Empty request body.");

                var content = dto.Content?.Trim();
                if (string.IsNullOrWhiteSpace(content))
                    return BadRequest("Message content is required.");

                // Try to extract senderId from JWT / Claims
                Guid senderId = Guid.Empty;
                try
                {
                    var subClaim = User?.Claims?.FirstOrDefault(c =>
                        string.Equals(c.Type, "sub", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(c.Type, "id", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(c.Type, "userid", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(c.Type, "userId", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(c.Type, System.Security.Claims.ClaimTypes.NameIdentifier, StringComparison.OrdinalIgnoreCase)
                    );

                    if (subClaim != null && Guid.TryParse(subClaim.Value, out var parsed))
                    {
                        senderId = parsed;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Claim parsing failed while extracting senderId.");
                }

                if (senderId == Guid.Empty)
                {
                    // Fallback for local/dev: generate a GUID so messages still save.
                    // In production you might want to return Unauthorized instead.
                    senderId = Guid.NewGuid();
                    _logger.LogWarning("senderId not found in token claims. Using fallback senderId {SenderId}.", senderId);
                }

                // Ensure chat exists and user is a member (optional: if you want to enforce membership)
                var chatExists = await _db.Chats.AnyAsync(c => c.Id == chatId);
                if (!chatExists)
                    return NotFound($"Chat {chatId} not found.");

                // IMPORTANT: Do NOT set Message.Id here. Message.Id is a long (bigint) generated by the DB.
                var msg = new Message
                {
                    ChatId = chatId,
                    SenderId = senderId,
                    Content = content,
                    ContentType = dto.ContentType ?? "text",
                    AttachmentUrl = dto.AttachmentUrl,
                    CreatedAt = DateTime.UtcNow
                };

                _db.Messages.Add(msg);
                await _db.SaveChangesAsync(); // after this, msg.Id (long) will be populated

                // Prepare a response object (avoid returning EF tracked entity directly)
                var responseObj = new
                {
                    id = msg.Id,
                    chatId = msg.ChatId,
                    senderId = msg.SenderId,
                    content = msg.Content,
                    contentType = msg.ContentType,
                    attachmentUrl = msg.AttachmentUrl,
                    createdAt = msg.CreatedAt
                };

                // Broadcast new message to SignalR group (live update)
                try
                {
                    await _hub.Clients.Group(chatId.ToString()).SendAsync("ReceiveMessage", responseObj);
                }
                catch (Exception hubEx)
                {
                    _logger.LogWarning(hubEx, "Failed to broadcast message to SignalR group {ChatId}", chatId);
                }

                return Ok(responseObj);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to post message for chat {ChatId}", chatId);
                return StatusCode(500, "Failed to send message.");
            }
        }

        // ----------------------------------------------------------------------
        // 🟠 BROADCAST / TWILIO / EMAIL MESSAGE FUNCTIONALITY (existing)
        // ----------------------------------------------------------------------

        public class BroadcastRequest
        {
            public string Type { get; set; } = "";
            public string Message { get; set; } = "";
            public List<string> UserIds { get; set; } = new();
            public Channels Channels { get; set; } = new();
        }

        public class Channels
        {
            public bool Email { get; set; }
            public bool Whatsapp { get; set; }
            public bool Sms { get; set; }
        }
[HttpPost("/api/tasks/{taskId}/send")]
public async Task<IActionResult> SendTaskNotification(int taskId)
{
    // TODO: replace this with your real lookup + SMS logic.
    // For now, this prevents 404 and can send whatever message you like.

    // Example pseudo-implementation:

    // 1. Look up the task and assignees from your DB (if you have a DbContext)
    // var task = await _dbContext.Tasks
    //     .Include(t => t.Assignees)
    //     .FirstOrDefaultAsync(t => t.Id == taskId);
    //
    // if (task == null)
    //     return NotFound();

    // 2. Build a message text
    // var body = $"Task #{task.Id}: {task.Title}\nDue: {task.DueDate:yyyy-MM-dd}";

    // 3. Use your existing Twilio/SMS sending helper here
    // foreach (var assignee in task.Assignees)
    // {
    //     if (string.IsNullOrWhiteSpace(assignee.PhoneNumber)) continue;
    //     await _smsService.SendAsync(assignee.PhoneNumber, body);
    // }

    // For now, just return 200 so the UI stops showing 404:
    return Ok(new { ok = true, taskId });
}
        [HttpPost("send")]
        public async Task<IActionResult> Send([FromBody] BroadcastRequest req)
        {
            if (req == null) return BadRequest("Missing payload.");
            if (string.IsNullOrWhiteSpace(req.Message)) return BadRequest("Message is required.");
            if (req.UserIds == null || req.UserIds.Count == 0) return BadRequest("No userIds provided.");

            var results = new List<object>();

            try
            {
                var connStr = _config.GetConnectionString("DefaultConnection");
                await using var conn = new NpgsqlConnection(connStr);
                await conn.OpenAsync();

                var sql = @"SELECT ""Id"", ""Email"", ""Phone"", ""DisplayName""
                            FROM ""Users""
                            WHERE CAST(""Id"" AS text) = ANY(@ids)";
                await using var cmd = new NpgsqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("ids", NpgsqlTypes.NpgsqlDbType.Array | NpgsqlTypes.NpgsqlDbType.Text, req.UserIds.ToArray());

                var recipients = new List<(string Id, string? Email, string? Phone, string? DisplayName)>();
                await using (var rdr = await cmd.ExecuteReaderAsync())
                {
                    while (await rdr.ReadAsync())
                    {
                        var idObj = rdr["Id"];
                        var id = idObj is Guid g ? g.ToString() : idObj?.ToString() ?? string.Empty;

                        recipients.Add((
                            id,
                            rdr["Email"] is DBNull ? null : rdr["Email"]?.ToString(),
                            rdr["Phone"] is DBNull ? null : rdr["Phone"]?.ToString(),
                            rdr["DisplayName"] is DBNull ? null : rdr["DisplayName"]?.ToString()
                        ));
                    }
                }

                if (recipients.Count == 0)
                    return BadRequest("No matching users found for provided userIds.");

                // SMTP config
                var smtpHost = _config["Smtp:Host"];
                var smtpPortParsed = int.TryParse(_config["Smtp:Port"], out var smtpPort) ? smtpPort : 587;
                var smtpUser = _config["Smtp:User"];
                var smtpPass = _config["Smtp:Pass"];
                var smtpFrom = _config["Smtp:From"] ?? smtpUser;

                // Twilio client (if configured) - using configured env is recommended
                var restClient = new Twilio.Clients.TwilioRestClient(
                    _config["Twilio:AccountSid"] ?? "AC-fallback",
                    _config["Twilio:AuthToken"] ?? "fallback"
                );

                foreach (var r in recipients)
                {
                    var errors = new List<string>();
                    bool emailOk = false, smsOk = false, waOk = false;

                    // EMAIL
                    if (req.Channels.Email && !string.IsNullOrWhiteSpace(r.Email) && !string.IsNullOrWhiteSpace(smtpHost))
                    {
                        try
                        {
                            using var mail = new MailMessage(smtpFrom ?? "no-reply@localhost", r.Email)
                            {
                                Subject = string.IsNullOrWhiteSpace(req.Type) ? "Message from Mahima" : $"[{req.Type}] Mahima Message",
                                Body = req.Message,
                                IsBodyHtml = false
                            };

                            using var client = new SmtpClient(smtpHost, smtpPortParsed) { EnableSsl = true };
                            if (!string.IsNullOrWhiteSpace(smtpUser))
                                client.Credentials = new NetworkCredential(smtpUser, smtpPass);

                            await client.SendMailAsync(mail);
                            emailOk = true;
                        }
                        catch (Exception ex)
                        {
                            errors.Add($"Email failed: {ex.Message}");
                            _logger.LogError(ex, "Email send failed to {Email}", r.Email);
                        }
                    }

                    // SMS
                    if (req.Channels.Sms && !string.IsNullOrWhiteSpace(r.Phone))
                    {
                        try
                        {
                            var msg = await MessageResource.CreateAsync(
                                to: new PhoneNumber(r.Phone),
                                from: new PhoneNumber(_config["Twilio:FromNumber"] ?? "+14059934588"),
                                body: "[Mahima SMS] " + req.Message,
                                client: restClient
                            );

                            smsOk = true;
                            _logger.LogInformation("SMS queued. SID: {Sid} To: {To}", msg?.Sid, r.Phone);
                        }
                        catch (Exception ex)
                        {
                            errors.Add($"SMS failed: {ex.Message}");
                            _logger.LogError(ex, "SMS send failed to {Phone}", r.Phone);
                        }
                    }

                    // WHATSAPP
                    if (req.Channels.Whatsapp && !string.IsNullOrWhiteSpace(r.Phone))
                    {
                        try
                        {
                            var msg = await MessageResource.CreateAsync(
                                to: new PhoneNumber($"whatsapp:{r.Phone}"),
                                from: new PhoneNumber(_config["Twilio:WhatsAppFrom"] ?? "whatsapp:+14155238886"),
                                body: "[Mahima WA] " + req.Message,
                                client: restClient
                            );

                            waOk = true;
                            _logger.LogInformation("WA queued. SID: {Sid} To: {To}", msg?.Sid, r.Phone);
                        }
                        catch (Exception ex)
                        {
                            errors.Add($"WhatsApp failed: {ex.Message}");
                            _logger.LogError(ex, "WhatsApp send failed to {Phone}", r.Phone);
                        }
                    }

                    results.Add(new
                    {
                        r.Id,
                        r.Email,
                        r.Phone,
                        r.DisplayName,
                        emailSent = emailOk,
                        smsSent = smsOk,
                        whatsappSent = waOk,
                        errors
                    });
                }

                return Ok(new { success = true, attempted = recipients.Count, results });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Broadcast send failed");
                return StatusCode(500, "Broadcast failed: " + ex.Message);
            }
        }
    }
}
