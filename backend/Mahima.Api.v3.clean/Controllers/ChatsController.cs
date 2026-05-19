using System;
using System.Linq;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Mahima.Api.v3.clean.Dtos;
using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Extensions;
using Mahima.Api.v3.clean.Services;
using Mahima.Api.v3.clean.Hubs;
using Mahima.Api.v3.clean.Models;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ChatsController : ControllerBase
    {
        private readonly IChatService _chatService;
        private readonly MahimaDbContext _db;
        private readonly IHubContext<ChatHub> _hub;
        private readonly IMobilePushNotificationService? _mobilePush;
        private readonly ILogger<ChatsController> _logger;

        public ChatsController(IChatService chatService, MahimaDbContext db, IHubContext<ChatHub> hub, IEnumerable<IMobilePushNotificationService> mobilePushServices, ILogger<ChatsController> logger)
        {
            _chatService = chatService ?? throw new ArgumentNullException(nameof(chatService));
            _db = db ?? throw new ArgumentNullException(nameof(db));
            _hub = hub ?? throw new ArgumentNullException(nameof(hub));
            _mobilePush = mobilePushServices?.FirstOrDefault();
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        private async Task<List<Guid>?> GetAuthorizedMemberIdsAsync(Guid chatId, Guid currentUserId)
        {
            if (chatId == Guid.Empty || currentUserId == Guid.Empty) return null;

            var memberIds = (await _chatService.GetChatMemberIdsAsync(chatId)).Distinct().ToList();
            return memberIds.Contains(currentUserId) ? memberIds : null;
        }

        private Task NotifyChatMembersAsync(IEnumerable<Guid> memberIds, string eventName, object payload)
        {
            var userIds = memberIds.Select(id => id.ToString()).Distinct().ToList();
            return userIds.Count == 0
                ? Task.CompletedTask
                : _hub.Clients.Users(userIds).SendAsync(eventName, payload);
        }

        private async Task<ChatSummaryDto?> GetChatSummaryForUserAsync(Guid userId, Guid chatId)
        {
            var chats = await _chatService.GetUserChatsAsync(userId);
            return chats.FirstOrDefault(c => c.Id == chatId);
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
                await NotifyChatMembersAsync(memberIds, "ChatSoftDeleted", new { ChatId = chatId });
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
                var memberIds = await _chatService.GetChatMemberIdsAsync(chatId);
                await NotifyChatMembersAsync(memberIds, "ReceiveMessage", createdMsg);
                if (_mobilePush != null)
                    await _mobilePush.NotifyChatMessageAsync(chatId, fromUserId, memberIds, createdMsg);
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
                await NotifyChatMembersAsync(memberIds, "ChatDeleted", new { ChatId = chatId });
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

        [HttpGet("contacts")]
        public async Task<IActionResult> GetChatContacts([FromQuery] string? search = null, [FromQuery] int page = 1, [FromQuery] int limit = 500)
        {
            var currentUserId = User.GetUserIdGuid();
            if (currentUserId == Guid.Empty) return Unauthorized();

            page = Math.Max(1, page);
            limit = Math.Clamp(limit, 1, 1000);

            var query = _db.Users
                .AsNoTracking()
                .Where(u => u.Id != currentUserId);

            var term = search?.Trim();
            if (!string.IsNullOrWhiteSpace(term))
            {
                var pattern = $"%{term}%";
                query = query.Where(u =>
                    EF.Functions.ILike(u.DisplayName ?? string.Empty, pattern) ||
                    EF.Functions.ILike(u.Username ?? string.Empty, pattern) ||
                    EF.Functions.ILike(u.Email ?? string.Empty, pattern) ||
                    EF.Functions.ILike(u.Phone ?? string.Empty, pattern) ||
                    EF.Functions.ILike(u.Role ?? string.Empty, pattern));
            }

            var total = await query.CountAsync();
            var items = await query
                .OrderBy(u => u.DisplayName ?? u.Username ?? u.Email)
                .Skip((page - 1) * limit)
                .Take(limit)
                .Select(u => new
                {
                    id = u.Id.ToString(),
                    username = u.Username,
                    email = u.Email,
                    displayName = u.DisplayName,
                    name = u.DisplayName ?? u.Username ?? u.Email ?? u.Phone,
                    profilePhotoUrl = u.ProfilePhotoUrl,
                    phone = u.Phone,
                    role = u.Role
                })
                .ToListAsync();

            return Ok(new { items, total, page, limit });
        }

        [HttpPost]
        public async Task<IActionResult> CreateChat([FromBody] JsonElement body)
        {
            string? identifier = null;
            Guid targetUserId = Guid.Empty;

            try
            {
                foreach (var key in new[] { "userId", "UserId", "id", "Id", "targetUserId", "TargetUserId" })
                {
                    if (body.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.String)
                    {
                        var raw = v.GetString()?.Trim();
                        if (Guid.TryParse(raw, out targetUserId)) break;
                    }
                }

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

            var currentUserId = User.GetUserIdGuid();
            if (currentUserId == Guid.Empty) return Unauthorized();

            if (targetUserId == Guid.Empty && !string.IsNullOrWhiteSpace(identifier) && Guid.TryParse(identifier, out var parsedIdentifierId))
                targetUserId = parsedIdentifierId;

            if (targetUserId == Guid.Empty && string.IsNullOrWhiteSpace(identifier))
                return BadRequest("userId or usernameOrEmail is required.");

            Chat createdChat;
            try
            {
                createdChat = targetUserId != Guid.Empty
                    ? await _chatService.CreateOrGetDirectChatAsync(currentUserId, targetUserId)
                    : await _chatService.CreateOrGetDirectChatAsync(currentUserId, identifier!);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create direct chat for {UserId} target {TargetUserId} identifier {Identifier}", currentUserId, targetUserId, identifier);
                return StatusCode(500, "Failed to create/find chat.");
            }

            var summary = await GetChatSummaryForUserAsync(currentUserId, createdChat.Id)
                ?? new ChatSummaryDto(createdChat.Id, createdChat.Name, createdChat.IsGroup, null, 0);

            try
            {
                var memberIds = await _chatService.GetChatMemberIdsAsync(createdChat.Id);
                await NotifyChatMembersAsync(memberIds.Where(id => id != currentUserId), "ChatCreated", summary);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "ChatCreated notification failed for chat {ChatId}", createdChat.Id);
            }

            return Ok(summary);
        }

        [HttpGet("{chatId}/messages")]
        public async Task<IActionResult> GetMessages(Guid chatId, int page = 1, int size = 50, int? take = null)
        {
            var userId = User.GetUserIdGuid();
            if (userId == Guid.Empty) return Unauthorized();

            var memberIds = await GetAuthorizedMemberIdsAsync(chatId, userId);
            if (memberIds == null) return Forbid();

            if (take.HasValue && take.Value > 0) size = take.Value;
            size = Math.Clamp(size, 1, 100);
            page = Math.Max(page, 1);

            var messages = await _chatService.GetMessagesAsync(chatId, page, size);
            return Ok(messages);
        }

        [HttpPost("{chatId}/messages")]
        public async Task<IActionResult> PostMessage(Guid chatId, [FromBody] CreateMessageDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = User.GetUserIdGuid();
            if (userId == Guid.Empty) return Unauthorized();

            var memberIds = await GetAuthorizedMemberIdsAsync(chatId, userId);
            if (memberIds == null) return Forbid();

            MessageDto created;
            try
            {
                created = await _chatService.AddMessageAsync(
                    chatId, userId, dto.Content, dto.ContentType ?? "text", dto.AttachmentUrl, dto.Attachments);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(403, ex.Message);
            }

        try
        {
            await NotifyChatMembersAsync(memberIds, "ReceiveMessage", created);
            if (_mobilePush != null)
                await _mobilePush.NotifyChatMessageAsync(chatId, userId, memberIds, created);
        }
        catch { }

            return Ok(created);
        }

        [HttpGet("{chatId:guid}/block-status")]
        public async Task<IActionResult> GetBlockStatus(Guid chatId)
        {
            var userId = User.GetUserIdGuid();
            if (userId == Guid.Empty) return Unauthorized();

            try
            {
                var status = await _chatService.GetBlockStatusAsync(chatId, userId);
                return Ok(status);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpPost("{chatId:guid}/block")]
        public async Task<IActionResult> BlockChatUser(Guid chatId)
        {
            var userId = User.GetUserIdGuid();
            if (userId == Guid.Empty) return Unauthorized();

            try
            {
                var before = await _chatService.GetBlockStatusAsync(chatId, userId);
                var status = await _chatService.BlockChatUserAsync(chatId, userId);

                if (before.OtherUserId.HasValue)
                {
                    await NotifyChatMembersAsync(new[] { userId, before.OtherUserId.Value }, "ChatBlockChanged", new
                    {
                        chatId,
                        blockerId = userId,
                        blockedId = before.OtherUserId.Value,
                        isBlocked = true,
                        at = DateTime.UtcNow
                    });
                }

                return Ok(status);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpDelete("{chatId:guid}/block")]
        public async Task<IActionResult> UnblockChatUser(Guid chatId)
        {
            var userId = User.GetUserIdGuid();
            if (userId == Guid.Empty) return Unauthorized();

            try
            {
                var before = await _chatService.GetBlockStatusAsync(chatId, userId);
                var status = await _chatService.UnblockChatUserAsync(chatId, userId);

                if (before.OtherUserId.HasValue)
                {
                    await NotifyChatMembersAsync(new[] { userId, before.OtherUserId.Value }, "ChatBlockChanged", new
                    {
                        chatId,
                        blockerId = userId,
                        blockedId = before.OtherUserId.Value,
                        isBlocked = false,
                        at = DateTime.UtcNow
                    });
                }

                return Ok(status);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpDelete("{chatId:guid}/messages/{messageId:guid}/everyone")]
        public async Task<IActionResult> DeleteMessageForEveryone(Guid chatId, Guid messageId)
        {
            var userId = User.GetUserIdGuid();
            if (userId == Guid.Empty) return Unauthorized();

            var memberIds = await GetAuthorizedMemberIdsAsync(chatId, userId);
            if (memberIds == null) return Forbid();

            await _chatService.DeleteMessageForEveryoneAsync(chatId, messageId, userId);

            try
            {
                await NotifyChatMembersAsync(memberIds, "MessageDeleted", new
                {
                    chatId,
                    messageId,
                    deletedBy = userId,
                    scope = "everyone",
                    at = DateTime.UtcNow
                });
            }
            catch { }

            return NoContent();
        }

       [HttpPost("{chatId}/read")]
public async Task<IActionResult> MarkRead(Guid chatId, [FromBody] MarkReadDto dto)
{
    if (!ModelState.IsValid) return BadRequest(ModelState);

    var userId = User.GetUserIdGuid();
    if (userId == Guid.Empty) return Unauthorized();

    var memberIds = await GetAuthorizedMemberIdsAsync(chatId, userId);
    if (memberIds == null) return Forbid();

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
        await NotifyChatMembersAsync(memberIds.Where(id => id != userId), "ReadReceipt", new
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

