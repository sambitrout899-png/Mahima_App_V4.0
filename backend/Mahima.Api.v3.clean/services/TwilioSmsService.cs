using System.Text.RegularExpressions;
using Twilio.Clients;
using Twilio.Exceptions;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace Mahima.Api.v3.clean.Services;

public record SmsDelivery(string Status, string? Error, List<string> MessageSids)
{
    public bool Queued => Status == "queued";
    public static SmsDelivery Skip(string reason) => new("skipped", reason, new());
}

public interface ITwilioSmsService
{
    Task<SmsDelivery> SendAsync(string? phone, string body, CancellationToken ct = default);
}

public class TwilioSmsService(IConfiguration config, ILogger<TwilioSmsService> logger) : ITwilioSmsService
{
    internal static string? ValidateCredentials(string? sid, string? token, string? from, string? service)
    {
        if (!Regex.IsMatch(sid ?? "", "^AC[0-9a-fA-F]{32}$") || string.IsNullOrWhiteSpace(token))
            return "Twilio credentials missing or invalid. Configure AccountSid (AC...) and the matching AuthToken.";
        if (!string.IsNullOrEmpty(service))
            return Regex.IsMatch(service, "^MG[0-9a-fA-F]{32}$") ? null : "Twilio MessagingServiceSid must be an MG SID.";
        return SmsPhone.NormalizePhone(from) != null ? null : "Configure Twilio FromNumber or MessagingServiceSid.";
    }

    internal static IReadOnlyList<string> BuildParts(string body)
    {
        // Hindi notifications include a compact sender name; segment limits are checked below.
        if (SmsCostPolicy.IsNotification(body))
            return new[] { $"महिमा: {body}" };
        var parts = new List<string>();
        // Leave space for sender identification and part number.
        while (body.Length > 0)
        {
            var length = Math.Min(1400, body.Length);
            if (length < body.Length && char.IsHighSurrogate(body[length - 1])) length--;
            parts.Add(body[..length]);
            body = body[length..];
        }
        return parts.Select((part, i) => $"Mahima Ministry{(parts.Count > 1 ? $" ({i + 1}/{parts.Count})" : "")}: {part}").ToList();
    }

    public async Task<SmsDelivery> SendAsync(string? phone, string body, CancellationToken ct = default)
    {
        var normalized = SmsPhone.NormalizePhone(phone);
        if (normalized == null) return SmsDelivery.Skip("Missing or invalid phone number. Include the country code (+...).");
        if (string.IsNullOrWhiteSpace(body)) return SmsDelivery.Skip("Message is empty.");
        var parts = BuildParts(body);
        var segments = parts.Sum(SmsCostPolicy.Segments);
        var limit = SmsCostPolicy.SegmentLimit(body, config.GetValue<int?>("Twilio:MaxSegmentsPerMessage") ?? 1);
        if (segments > limit)
            return SmsDelivery.Skip($"SMS needs {segments} billable segments; configured limit is {limit}. Shorten the message or use in-app delivery.");
        var sid = config["Twilio:AccountSid"]?.Trim();
        var token = config["Twilio:AuthToken"]?.Trim();
        var from = config["Twilio:FromNumber"]?.Trim();
        var service = config["Twilio:MessagingServiceSid"]?.Trim();
        var error = ValidateCredentials(sid, token, from, service);
        if (error != null) return new("failed", error, new());
        var queued = new List<string>();
        try
        {
            var client = new TwilioRestClient(sid!, token!);
            foreach (var part in parts)
            {
                ct.ThrowIfCancellationRequested();
                var message = await MessageResource.CreateAsync(
                    to: new PhoneNumber(normalized),
                    from: string.IsNullOrEmpty(service) ? new PhoneNumber(SmsPhone.NormalizePhone(from)!) : null,
                    messagingServiceSid: string.IsNullOrEmpty(service) ? null : service,
                    body: part, client: client);
                if (message.ErrorCode.HasValue || message.Status == MessageResource.StatusEnum.Failed || message.Status == MessageResource.StatusEnum.Undelivered)
                    return new(queued.Count == 0 ? "failed" : "partial", $"Twilio {message.ErrorCode}: {message.ErrorMessage}", queued);
                queued.Add(message.Sid);
                logger.LogInformation("Twilio accepted {MessageSid}; estimated billable segments={Segments}", message.Sid, SmsCostPolicy.Segments(part));
            }
            return new("queued", null, queued);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            logger.LogError(ex, "Twilio SMS submission failed after {Parts} accepted parts", queued.Count);
            var reason = ex is ApiException api ? $"Twilio {api.Code}: {api.Message}" : "SMS service unavailable. Check server configuration and logs.";
            return new(queued.Count == 0 ? "failed" : "partial", reason, queued);
        }
    }
}
