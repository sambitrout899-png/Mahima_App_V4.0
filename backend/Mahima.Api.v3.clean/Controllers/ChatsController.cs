using System;
using System.Linq;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Mahima.Api.v3.clean.Dtos;
using Mahima.Api.v3.clean.Extensions;
using Mahima.Api.v3.clean.Services;
using Mahima.Api.v3.clean.Hubs;
using System.Text.Json;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ChatsController : ControllerBase
    {
        private readonly IChatService _chatService;
        private readonly IHubContext<ChatHub> _hub;
        private readonly ILogger<ChatsController> _logger;

        public ChatsController(IChatService chatService, IHubContext<ChatHub> hub, ILogger<ChatsController> logger)
        {
            _chatService = chatService ?? throw new ArgumentNullException(nameof(chatService));
            _hub = hub ?? throw new ArgumentNullException(nameof(hub));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        [HttpPatch("{chatId:guid}/soft-delete")]
        public async Task<IActionResult> SoftDeleteChat(Guid chatId)
        {
            var currentUserId = User.GetUserIdGuid();
            if (currentUserId == Guid.Empty) return Unauthorized();

            await _chatService.SoftDeleteChatAsync(chatId, currentUserId);

            try
            {
                var memberIds = await _chatService.GetChatMemberIdsAsync(chatId);
                foreach (var memberId in memberIds)
                {
                    try { await _hub.Clients.User(memberId.ToString()).SendAsync("ChatSoftDeleted", new { ChatId = chatId }); }
                    catch { }
                }
            }
            catch { }

            return NoContent();
        }

        [HttpPost("send-bulk")]
        public async Task<IActionResult> SendBulk([FromBody] SendBulkMessageDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var fromUserId = User.GetUserIdGuid();
            if (fromUserId == Guid.Empty) return Unauthorized();

            var recipientIds = dto.RecipientIds?.Where(id => id != Guid.Empty).Distinct().ToList() ?? new List<Guid>();
            if (!recipientIds.Any()) return BadRequest("recipientIds required.");

            var results = new List<object>();

            foreach (var recipientId in recipientIds)
            {
                if (recipientId == fromUserId)
                {
                    results.Add(new { recipient = recipientId, status = "skipped", reason = "cannot message self" });
                    continue;
                }

                try
                {
                    var chat = await _chatService.CreateOrGetDirectChatAsync(fromUserId, recipientId);
                    if (chat == null)
                    {
                        results.Add(new { recipient = recipientId, status = "failed", reason = "could not create/find chat" });
                        continue;
                    }

                    var chatId = chat.Id;

                    var createdMsg = await _chatService.AddMessageAsync(
                        chatId, fromUserId, dto.Message, dto.ContentType ?? "text", dto.AttachmentUrl);

                    try
                    {
                        await _hub.Clients.User(recipientId.ToString()).SendAsync("ReceiveMessage", createdMsg);
                        await _hub.Clients.Group(chatId.ToString()).SendAsync("ReceiveMessage", createdMsg);
                    }
                    catch (Exception notifyEx)
                    {
                        _logger.LogWarning(notifyEx, "Notify failed recipient {Recipient} chat {ChatId}", recipientId, chatId);
                    }

                    results.Add(new { recipient = recipientId, status = "ok", chatId, messageId = createdMsg.Id });
                }
                catch (Exception innerEx)
                {
                    _logger.LogWarning(innerEx, "Bulk send failed to {Recipient} from {User}", recipientId, fromUserId);
                    results.Add(new { recipient = recipientId, status = "failed", reason = innerEx.Message });
                }
            }

            var sent = results.Count(r =>
            {
                var statusProp = r.GetType().GetProperty("status");
                var val = statusProp?.GetValue(r) as string;
                return string.Equals(val, "ok", StringComparison.Ordinal);
            });

            return Ok(new { sent, results });
        }

        [HttpDelete("{chatId:guid}")]
        public async Task<IActionResult> DeleteChat(Guid chatId)
        {
            var currentUserId = User.GetUserIdGuid();
            if (currentUserId == Guid.Empty) return Unauthorized();

            await _chatService.DeleteChatAsync(chatId, currentUserId);

            try
            {
                var memberIds = await _chatService.GetChatMemberIdsAsync(chatId);
                foreach (var memberId in memberIds)
                {
                    try { await _hub.Clients.User(memberId.ToString()).SendAsync("ChatDeleted", new { ChatId = chatId }); }
                    catch { }
                }
            }
            catch { }

            return NoContent();
        }

        [HttpGet]
        public async Task<IActionResult> GetChats()
        {
            var userId = User.GetUserIdGuid();
            if (userId == Guid.Empty) return Unauthorized();

            var chats = await _chatService.GetUserChatsAsync(userId);
            return Ok(chats);
        }

        [HttpPost]
        public async Task<IActionResult> CreateChat([FromBody] JsonElement body)
        {
            string? identifier = null;

            try
            {
                foreach (var key in new[] { "usernameOrEmail", "UsernameOrEmail", "username", "email" })
                {
                    if (body.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.String)
                    {
                        identifier = v.GetString()?.Trim();
                        break;
                    }
                }
            }
            catch { }

            if (string.IsNullOrWhiteSpace(identifier))
                return BadRequest("usernameOrEmail is required.");

            var currentUserId = User.GetUserIdGuid();
            if (currentUserId == Guid.Empty) return Unauthorized();

            var createdChat = await _chatService.CreateOrGetDirectChatAsync(currentUserId, identifier);
            if (createdChat == null) return StatusCode(500, "Failed to create/find chat.");

            // Notify others (Option B, reflection flexible)
            try
            {
                var chatType = createdChat.GetType();
                var membersProp = chatType.GetProperty("Members", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                var members = membersProp?.GetValue(createdChat) as IEnumerable;

                if (members != null)
                {
                    foreach (var member in members)
                    {
                        var idProp = member.GetType().GetProperty("UserId") ?? member.GetType().GetProperty("Id");
                        if (idProp == null) continue;

                        var memberId = idProp.GetValue(member)?.ToString();
                        if (string.IsNullOrWhiteSpace(memberId) || memberId == currentUserId.ToString()) continue;

                        try { await _hub.Clients.User(memberId).SendAsync("ChatCreated", createdChat); }
                        catch { }
                    }
                }
            }
            catch { }

            return Ok(createdChat);
        }

        [HttpGet("{chatId}/messages")]
        public async Task<IActionResult> GetMessages(Guid chatId, int page = 1, int size = 50)
        {
            var messages = await _chatService.GetMessagesAsync(chatId, page, size);
            return Ok(messages);
        }

        [HttpPost("{chatId}/messages")]
        public async Task<IActionResult> PostMessage(Guid chatId, [FromBody] CreateMessageDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = User.GetUserIdGuid();
            if (userId == Guid.Empty) return Unauthorized();

            var created = await _chatService.AddMessageAsync(
                chatId, userId, dto.Content, dto.ContentType ?? "text", dto.AttachmentUrl, dto.Attachments);

            try { await _hub.Clients.Group(chatId.ToString()).SendAsync("ReceiveMessage", created); }
            catch { }

            return Ok(created);
        }

       [HttpPost("{chatId}/read")]
public async Task<IActionResult> MarkRead(Guid chatId, [FromBody] MarkReadDto dto)
{
    if (!ModelState.IsValid) return BadRequest(ModelState);

    var userId = User.GetUserIdGuid();
    if (userId == Guid.Empty) return Unauthorized();

    Guid lastMessageId = dto?.LastMessageId ?? Guid.Empty;

    // If client didn't send messageId → fallback to *latest* message in chat
    if (lastMessageId == Guid.Empty)
    {
        var page = await _chatService.GetMessagesAsync(chatId, page: 1, size: 1);
        var latest = page?.Items?.LastOrDefault();
        if (latest != null)
            lastMessageId = latest.Id; // Guid ✅
    }

    if (lastMessageId == Guid.Empty)
        return Ok(new { marked = 0 });

    await _chatService.MarkReadAsync(chatId, userId, lastMessageId);

    try
    {
        await _hub.Clients.Group(chatId.ToString()).SendAsync("ReadReceipt", new
        {
            chatId,
            userId,
            lastMessageId,
            at = DateTime.UtcNow
        });
    }
    catch { }

    return Ok(new { marked = 1, lastMessageId });
}

    }
}
