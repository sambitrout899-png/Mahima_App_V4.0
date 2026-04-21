using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Dtos;
using Mahima.Api.v3.clean.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace Mahima.Api.v3.clean.Hubs
{
    public class ChatHub : Hub
    {
        private readonly ILogger<ChatHub> _logger;
        private readonly IChatService _chatService;

        public ChatHub(ILogger<ChatHub> logger, IChatService chatService)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _chatService = chatService ?? throw new ArgumentNullException(nameof(chatService));
        }

        public override Task OnConnectedAsync()
        {
            _logger.LogDebug("Connection established: ConnectionId={ConnectionId}, User={User}", Context.ConnectionId, Context?.User?.Identity?.Name);
            return base.OnConnectedAsync();
        }

        private Guid GetUserId() =>
            Guid.TryParse(Context.User?.FindFirstValue(ClaimTypes.NameIdentifier), out var g) ? g : Guid.Empty;

        public class SendMessagePayload
        {
            public Guid ChatId { get; set; }
            public string? Text { get; set; }
            public string? ContentType { get; set; } = "text";
            public List<AttachmentDto>? Attachments { get; set; }
        }

        public async Task SendMessage(SendMessagePayload payload)
        {
            if (payload == null || payload.ChatId == Guid.Empty) return;
            var userId = GetUserId();
            if (userId == Guid.Empty) throw new HubException("Unauthorized");

            string? attachmentUrl = payload.Attachments?.FirstOrDefault()?.Url;
            var created = await _chatService.AddMessageAsync(
                payload.ChatId,
                userId,
                payload.Text ?? string.Empty,
                payload.ContentType ?? "text",
                attachmentUrl,
                payload.Attachments
            );

            await Clients.Group(payload.ChatId.ToString()).SendAsync("ReceiveMessage", created);

            var members = await _chatService.GetChatMemberIdsAsync(payload.ChatId);
            foreach (var uid in members)
            {
                await Clients.User(uid.ToString()).SendAsync("ReceiveMessage", created);
            }
        }

        public class TypingPayload { public Guid ChatId { get; set; } }

        public Task Typing(TypingPayload p)
        {
            if (p == null || p.ChatId == Guid.Empty) return Task.CompletedTask;
            var userId = GetUserId();
            return Clients.Group(p.ChatId.ToString()).SendAsync("UserTyping", new { chatId = p.ChatId, fromUserId = userId, at = DateTime.UtcNow });
        }

        public class CallOffer { public Guid ChatId { get; set; } public string Sdp { get; set; } = string.Empty; }
        public class CallSignalMsg { public Guid ChatId { get; set; } public string Type { get; set; } = "ice"; public string Data { get; set; } = string.Empty; }

        public async Task StartCall(CallOffer offer)
        {
            var userId = GetUserId();
            await Clients.Group(offer.ChatId.ToString()).SendAsync("IncomingCall", new { chatId = offer.ChatId, fromUserId = userId, sdp = offer.Sdp, at = DateTime.UtcNow });
        }

        public Task CallSignal(CallSignalMsg s)
        {
            var userId = GetUserId();
            return Clients.Group(s.ChatId.ToString()).SendAsync("CallSignal", new { chatId = s.ChatId, fromUserId = userId, type = s.Type, data = s.Data });
        }

        public Task EndCall(Guid chatId)
        {
            var userId = GetUserId();
            return Clients.Group(chatId.ToString()).SendAsync("CallEnded", new { chatId, fromUserId = userId });
        }

        public override Task OnDisconnectedAsync(Exception? exception)
        {
            _logger.LogDebug(exception == null
                ? "Connection disconnected: ConnectionId={ConnectionId}"
                : "Connection disconnected with error: ConnectionId={ConnectionId} Error={Error}",
                Context.ConnectionId,
                exception?.Message);

            return base.OnDisconnectedAsync(exception);
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
                await Groups.AddToGroupAsync(Context.ConnectionId, chatId);
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

        public Task SendToGroup(string chatId, string text)
        {
            if (string.IsNullOrWhiteSpace(chatId)) return Task.CompletedTask;
            _logger.LogDebug("SendToGroup invoked for chat {ChatId}: {Text}", chatId, text);
            return Clients.Group(chatId).SendAsync("ReceiveMessage", new
            {
                chatId,
                content = text,
                createdAt = DateTime.UtcNow,
                senderName = "SYSTEM"
            });
        }
    }
}
