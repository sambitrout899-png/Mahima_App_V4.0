using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Dtos;
using Mahima.Api.v3.clean.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace Mahima.Api.v3.clean.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private static readonly ConcurrentDictionary<Guid, ConcurrentDictionary<string, byte>> OnlineConnections = new();

        private readonly ILogger<ChatHub> _logger;
        private readonly IChatService _chatService;
        private readonly IMobilePushNotificationService? _mobilePush;

        public ChatHub(ILogger<ChatHub> logger, IChatService chatService, IEnumerable<IMobilePushNotificationService> mobilePushServices)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _chatService = chatService ?? throw new ArgumentNullException(nameof(chatService));
            _mobilePush = mobilePushServices?.FirstOrDefault();
        }

        public override async Task OnConnectedAsync()
        {
            var userId = GetUserId();
            if (userId != Guid.Empty)
            {
                var connections = OnlineConnections.GetOrAdd(userId, _ => new ConcurrentDictionary<string, byte>());
                var wasOffline = connections.IsEmpty;
                connections[Context.ConnectionId] = 1;

                await Clients.Caller.SendAsync("PresenceSnapshot", OnlineUserIds());
                if (wasOffline)
                {
                    await Clients.All.SendAsync("UserPresence", new { userId, isOnline = true, at = DateTime.UtcNow });
                }
            }

            _logger.LogDebug("Connection established: ConnectionId={ConnectionId}, UserId={UserId}, User={User}", Context.ConnectionId, userId, Context?.User?.Identity?.Name);
            await base.OnConnectedAsync();
        }

        private Guid GetUserId() =>
            Guid.TryParse(Context.User?.FindFirstValue(ClaimTypes.NameIdentifier), out var g) ? g : Guid.Empty;

        private async Task<IReadOnlyList<Guid>> RequireChatMembershipAsync(Guid chatId, Guid userId)
        {
            if (chatId == Guid.Empty || userId == Guid.Empty)
                throw new HubException("Unauthorized");

            var members = (await _chatService.GetChatMemberIdsAsync(chatId)).Distinct().ToList();
            if (!members.Contains(userId))
                throw new HubException("You are not a member of this chat.");

            return members;
        }

        private static IReadOnlyList<string> UserIds(IEnumerable<Guid> userIds) =>
            userIds.Select(id => id.ToString()).Distinct().ToList();

        private static IReadOnlyList<string> OnlineUserIds() =>
            OnlineConnections.Keys.Select(id => id.ToString()).Distinct().ToList();

        public Task<IReadOnlyList<string>> GetOnlineUsers() =>
            Task.FromResult(OnlineUserIds());

        public class SendMessagePayload
        {
            public Guid ChatId { get; set; }
            public string? Text { get; set; }
            public string? ContentType { get; set; } = "text";
            public string? AttachmentUrl { get; set; }
            public List<AttachmentDto>? Attachments { get; set; }
        }

        public async Task<object> SendMessage(SendMessagePayload payload)
        {
            if (payload == null || payload.ChatId == Guid.Empty)
                throw new HubException("chatId is required.");

            var userId = GetUserId();
            if (userId == Guid.Empty) throw new HubException("Unauthorized");
            var members = await RequireChatMembershipAsync(payload.ChatId, userId);
            try
            {
                await _chatService.EnsureCanSendDirectChatAsync(payload.ChatId, userId);
            }
            catch (Exception ex) when (ex is UnauthorizedAccessException || ex is InvalidOperationException)
            {
                throw new HubException(ex.Message);
            }

            string? attachmentUrl = payload.AttachmentUrl ?? payload.Attachments?.FirstOrDefault()?.Url;
            var created = await _chatService.AddMessageAsync(
                payload.ChatId,
                userId,
                payload.Text ?? string.Empty,
                payload.ContentType ?? "text",
                attachmentUrl,
                payload.Attachments
            );

            await Clients.Users(UserIds(members)).SendAsync("ReceiveMessage", created);
            try
            {
                if (_mobilePush != null)
                    await _mobilePush.NotifyChatMessageAsync(payload.ChatId, userId, members, created);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Mobile push failed for chat {ChatId}", payload.ChatId);
            }
            return created;
        }

        public class TypingPayload { public Guid ChatId { get; set; } }

        public async Task Typing(TypingPayload p)
        {
            if (p == null || p.ChatId == Guid.Empty) return;
            var userId = GetUserId();
            var members = await RequireChatMembershipAsync(p.ChatId, userId);
            await Clients.Users(UserIds(members.Where(id => id != userId))).SendAsync("UserTyping", new { chatId = p.ChatId, fromUserId = userId, at = DateTime.UtcNow });
        }

        public class CallOffer { public Guid ChatId { get; set; } public string Sdp { get; set; } = string.Empty; }
        public class CallSignalMsg { public Guid ChatId { get; set; } public string Type { get; set; } = "ice"; public string Data { get; set; } = string.Empty; }

        public async Task StartCall(CallOffer offer)
        {
            var userId = GetUserId();
            var members = await RequireChatMembershipAsync(offer.ChatId, userId);
            try
            {
                await _chatService.EnsureCanSendDirectChatAsync(offer.ChatId, userId);
            }
            catch (Exception ex) when (ex is UnauthorizedAccessException || ex is InvalidOperationException)
            {
                throw new HubException(ex.Message);
            }

            await Clients.Users(UserIds(members.Where(id => id != userId))).SendAsync("IncomingCall", new { chatId = offer.ChatId, fromUserId = userId, sdp = offer.Sdp, at = DateTime.UtcNow });
        }

        public async Task CallSignal(CallSignalMsg s)
        {
            var userId = GetUserId();
            var members = await RequireChatMembershipAsync(s.ChatId, userId);
            try
            {
                await _chatService.EnsureCanSendDirectChatAsync(s.ChatId, userId);
            }
            catch (Exception ex) when (ex is UnauthorizedAccessException || ex is InvalidOperationException)
            {
                throw new HubException(ex.Message);
            }

            await Clients.Users(UserIds(members.Where(id => id != userId))).SendAsync("CallSignal", new { chatId = s.ChatId, fromUserId = userId, type = s.Type, data = s.Data });
        }

        public async Task EndCall(Guid chatId)
        {
            var userId = GetUserId();
            var members = await RequireChatMembershipAsync(chatId, userId);
            await Clients.Users(UserIds(members.Where(id => id != userId))).SendAsync("CallEnded", new { chatId, fromUserId = userId });
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = GetUserId();
            if (userId != Guid.Empty && OnlineConnections.TryGetValue(userId, out var connections))
            {
                connections.TryRemove(Context.ConnectionId, out _);
                if (connections.IsEmpty)
                {
                    OnlineConnections.TryRemove(userId, out _);
                    await Clients.All.SendAsync("UserPresence", new { userId, isOnline = false, at = DateTime.UtcNow });
                }
            }

            _logger.LogDebug(exception == null
                ? "Connection disconnected: ConnectionId={ConnectionId}, UserId={UserId}"
                : "Connection disconnected with error: ConnectionId={ConnectionId}, UserId={UserId} Error={Error}",
                Context.ConnectionId,
                userId,
                exception?.Message);

            await base.OnDisconnectedAsync(exception);
        }

        public async Task JoinGroup(string chatId)
        {
            if (string.IsNullOrWhiteSpace(chatId))
            {
                _logger.LogWarning("JoinGroup called with empty chatId. ConnectionId={ConnectionId}", Context.ConnectionId);
                return;
            }

            try
            {
                if (!Guid.TryParse(chatId, out var parsedChatId))
                {
                    _logger.LogWarning("JoinGroup called with invalid chatId {ChatId}. ConnectionId={ConnectionId}", chatId, Context.ConnectionId);
                    return;
                }

                await RequireChatMembershipAsync(parsedChatId, GetUserId());
                await Groups.AddToGroupAsync(Context.ConnectionId, parsedChatId.ToString());
                _logger.LogInformation("Connection {ConnectionId} joined group {ChatId}", Context.ConnectionId, chatId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to add connection {ConnectionId} to group {ChatId}", Context.ConnectionId, chatId);
            }
        }

        public async Task LeaveGroup(string chatId)
        {
            if (string.IsNullOrWhiteSpace(chatId))
            {
                _logger.LogWarning("LeaveGroup called with empty chatId. ConnectionId={ConnectionId}", Context.ConnectionId);
                return;
            }

            try
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, chatId);
                _logger.LogInformation("Connection {ConnectionId} left group {ChatId}", Context.ConnectionId, chatId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to remove connection {ConnectionId} from group {ChatId}", Context.ConnectionId, chatId);
            }
        }

        public async Task SendToGroup(string chatId, string text)
        {
            if (string.IsNullOrWhiteSpace(chatId)) return;
            if (!Guid.TryParse(chatId, out var parsedChatId)) return;

            var userId = GetUserId();
            var members = await RequireChatMembershipAsync(parsedChatId, userId);

            var created = await _chatService.AddMessageAsync(parsedChatId, userId, text ?? string.Empty, "text");
            _logger.LogDebug("SendToGroup persisted encrypted message for chat {ChatId}", chatId);
            await Clients.Users(UserIds(members)).SendAsync("ReceiveMessage", created);
        }
    }
}



