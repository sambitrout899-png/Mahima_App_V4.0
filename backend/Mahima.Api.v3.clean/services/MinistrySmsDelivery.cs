using Mahima.Api.v3.clean.Data;
using Microsoft.EntityFrameworkCore;

namespace Mahima.Api.v3.clean.Services;

public record MinistrySmsResult(Guid UserId, SmsDelivery Delivery);
public record MinistrySmsSummary(bool Enabled, List<MinistrySmsResult> Results)
{
    public int Queued => Results.Count(r => r.Delivery.Queued);
    public int Skipped => Results.Count(r => r.Delivery.Status == "skipped");
    public int Failed => Results.Count(r => r.Delivery.Status is "failed" or "partial");
}

public class MinistrySmsDelivery(MahimaDbContext db, ITwilioSmsService sms, ILogger<MinistrySmsDelivery> logger)
{
    public async Task<MinistrySmsSummary> SendAsync(string message, IEnumerable<Guid> userIds, CancellationToken ct = default)
    {
        var setting = await db.MinistryAutomationSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == "SmsEnabled", ct);
        if (setting != null && bool.TryParse(setting.Value, out var enabled) && !enabled)
            return new(false, new());
        message = SmsCostPolicy.Compact(message);
        var ids = userIds.Distinct().ToArray();
        var users = await db.Users.AsNoTracking().Where(u => ids.Contains(u.Id))
            .Select(u => new { u.Id, u.Phone }).ToListAsync(ct);
        var results = new List<MinistrySmsResult>();
        var phones = new HashSet<string>();
        foreach (var user in users)
        {
            var phone = SmsPhone.NormalizePhone(user.Phone);
            var result = phone != null && !phones.Add(phone)
                ? SmsDelivery.Skip("Duplicate phone number in this broadcast.")
                : await sms.SendAsync(user.Phone, message, ct);
            results.Add(new(user.Id, result));
            if (!result.Queued)
                logger.LogWarning("Ministry SMS for user {UserId}: {Status}; {Reason}", user.Id, result.Status, result.Error);
        }
        var summary = new MinistrySmsSummary(true, results);
        logger.LogInformation("Ministry SMS: {Queued} queued, {Skipped} skipped, {Failed} failed", summary.Queued, summary.Skipped, summary.Failed);
        return summary;
    }

    public async Task<MinistrySmsSummary> SendToChatAsync(Guid chatId, string message, CancellationToken ct = default) =>
        await SendAsync(message, await db.ChatMembers.AsNoTracking().Where(m => m.ChatId == chatId).Select(m => m.UserId).ToListAsync(ct), ct);
}
