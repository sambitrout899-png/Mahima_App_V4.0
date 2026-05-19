using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Data;
using Mahima.Api.v3.clean.Dtos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Mahima.Api.v3.clean.Services
{
    public interface IMobilePushNotificationService
    {
        Task NotifyChatMessageAsync(Guid chatId, Guid senderId, IEnumerable<Guid> memberIds, MessageDto message);
    }

    public class MobilePushNotificationService : IMobilePushNotificationService
    {
        private const string DeviceTokenPrefix = "DeviceToken:";
        private readonly MahimaDbContext _db;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<MobilePushNotificationService> _logger;

        public MobilePushNotificationService(
            MahimaDbContext db,
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<MobilePushNotificationService> logger)
        {
            _db = db;
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task NotifyChatMessageAsync(Guid chatId, Guid senderId, IEnumerable<Guid> memberIds, MessageDto message)
        {
            var fcmServerKey = _configuration["MobilePush:FcmServerKey"] ?? Environment.GetEnvironmentVariable("MAHIMA_FCM_SERVER_KEY");
            if (string.IsNullOrWhiteSpace(fcmServerKey))
            {
                _logger.LogDebug("Skipping mobile push: MobilePush:FcmServerKey / MAHIMA_FCM_SERVER_KEY is not configured.");
                return;
            }

            var recipientIds = memberIds
                .Where(id => id != Guid.Empty && id != senderId)
                .Distinct()
                .ToList();
            if (recipientIds.Count == 0) return;

            var tokens = await ReadTokensAsync(recipientIds);
            if (tokens.Count == 0) return;

            var senderName = await _db.Users
                .AsNoTracking()
                .Where(u => u.Id == senderId)
                .Select(u => !string.IsNullOrWhiteSpace(u.DisplayName) ? u.DisplayName : u.Username)
                .FirstOrDefaultAsync() ?? "Jai Masih";

            var preview = BuildPreview(message);
            var payload = new
            {
                registration_ids = tokens,
                priority = "high",
                notification = new
                {
                    title = "Jai Masih Di",
                    body = $"{senderName}: {preview}",
                    sound = "default"
                },
                data = new
                {
                    kind = "message",
                    chatId = chatId.ToString(),
                    messageId = message.Id.ToString(),
                    senderId = senderId.ToString(),
                    senderName,
                    preview
                }
            };

            var client = _httpClientFactory.CreateClient();
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://fcm.googleapis.com/fcm/send");
            request.Headers.TryAddWithoutValidation("Authorization", $"key={fcmServerKey.Trim()}");
            request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            try
            {
                using var response = await client.SendAsync(request);
                if (!response.IsSuccessStatusCode)
                {
                    var body = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("FCM push failed: {Status} {Body}", response.StatusCode, body);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "FCM push request failed.");
            }
        }

        private async Task<List<string>> ReadTokensAsync(IEnumerable<Guid> userIds)
        {
            var prefixes = userIds.Select(id => $"{DeviceTokenPrefix}{id}:").ToList();
            var rows = await _db.MinistryAutomationSettings
                .AsNoTracking()
                .Where(s => s.Key.StartsWith(DeviceTokenPrefix))
                .ToListAsync();

            return rows
                .Where(row => prefixes.Any(prefix => row.Key.StartsWith(prefix)))
                .Select(row => ReadString(row.Value, "token"))
                .Where(token => !string.IsNullOrWhiteSpace(token))
                .Distinct()
                .ToList();
        }

        private static string BuildPreview(MessageDto message)
        {
            if (!string.IsNullOrWhiteSpace(message.Content))
                return message.Content.Length > 120 ? message.Content.Substring(0, 120) : message.Content;

            if (message.Attachments != null && message.Attachments.Any() || !string.IsNullOrWhiteSpace(message.AttachmentUrl))
                return "Attachment";

            return "New message";
        }

        private static string ReadString(string json, string property)
        {
            try
            {
                using var doc = JsonDocument.Parse(json);
                return doc.RootElement.TryGetProperty(property, out var prop) ? prop.ToString() : "";
            }
            catch
            {
                return "";
            }
        }
    }
}
