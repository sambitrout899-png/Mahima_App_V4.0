using Mahima.Api.v3.clean.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace Mahima.Api.v3.clean.Tests;

public class MinistryMessagingTests
{
    [Fact]
    public void WorshipRunsOnSundayOnlyAndKeepsSavedTime()
    {
        var service = new MinistryChatAutomationService(null!, null!, new ConfigurationBuilder().Build(), NullLogger<MinistryChatAutomationService>.Instance);
        var settings = new Dictionary<string, string> { ["SundayReminderTime"] = "09:00" };
        var sunday = new DateTime(2026, 9, 20, 9, 15, 0);
        var schedule = Assert.Single(service.BuildSchedules(sunday, settings).Where(s => s.Key == "sunday-church-reminder"));
        Assert.True(service.IsDue(sunday, schedule, settings));
        Assert.False(service.IsDue(sunday.AddDays(-1), schedule, settings));
        Assert.False(service.IsDue(sunday.AddHours(-1), schedule, settings));
        Assert.False(service.IsDue(sunday.AddHours(2), schedule, settings));
    }

    [Fact]
    public void ExistingSaturdaySettingsAreMigratedWithoutOverwritingSundaySettings()
    {
        var settings = new Dictionary<string, string> { ["SaturdayReminderTime"] = "08:30", ["SaturdayReminderEnabled"] = "false" };
        MinistryChatAutomationService.MigrateSundaySettings(settings);
        Assert.Equal("08:30", settings["SundayReminderTime"]);
        Assert.Equal("false", settings["SundayReminderEnabled"]);
        settings["SundayReminderTime"] = "10:00";
        MinistryChatAutomationService.MigrateSundaySettings(settings);
        Assert.Equal("10:00", settings["SundayReminderTime"]);
    }

    [Theory]
    [InlineData("en", "Sunday")]
    [InlineData("hi", "रविवार")]
    [InlineData("pa", "ਐਤਵਾਰ")]
    public void WorshipTextAndLegacyTriggerUseSunday(string language, string expected)
    {
        var content = MinistryMessageFactory.Build("sunday-church-reminder", DateTime.Today, language);
        Assert.Contains(expected, content);
        Assert.Equal(content, MinistryMessageFactory.Build("saturday-church-reminder", DateTime.Today, language));
    }

    [Fact]
    public void LongUnicodeMessagesPreserveContentAndStayWithinProviderLimit()
    {
        var content = new string('a', 1399) + "🙏" + new string('ਮ', 2500);
        var parts = TwilioSmsService.BuildParts(content);
        Assert.True(parts.Count > 1);
        var restored = string.Concat(parts.Select(p => p[(p.IndexOf(": ", StringComparison.Ordinal) + 2)..]));
        Assert.Equal(content, restored);
        Assert.All(parts, p => { Assert.True(p.Length <= 1600); Assert.DoesNotContain("Reply STOP", p); Assert.DoesNotContain("HELP", p); });
    }

    [Fact]
    public void MessagingServiceCanReplaceFromNumber()
    {
        Assert.Null(TwilioSmsService.ValidateCredentials("AC" + new string('a', 32), "token", null, "MG" + new string('b', 32)));
        Assert.NotNull(TwilioSmsService.ValidateCredentials("SK" + new string('a', 32), "token", "+12025550123", null));
        Assert.NotNull(TwilioSmsService.ValidateCredentials("AC" + new string('a', 32), "token", null, null));
    }

    [Fact]
    public async Task MissingCredentialsAndInvalidPhoneNeverReachDatabaseOrProvider()
    {
        var service = new TwilioSmsService(new ConfigurationBuilder().Build(), NullLogger<TwilioSmsService>.Instance);
        Assert.Equal("skipped", (await service.SendAsync("12345", "Hello")).Status);
        var failure = await service.SendAsync("+12025550123", "Hello");
        Assert.Equal("failed", failure.Status);
        Assert.Contains("AccountSid", failure.Error);
        Assert.Empty(failure.MessageSids);
    }

    [Fact]
    public void PartialAcceptanceIsNotReportedAsSuccess()
    {
        var partial = new SmsDelivery("partial", "Provider failure", new() { "SM-test" });
        Assert.False(partial.Queued);
        var summary = new MinistrySmsSummary(true, new() {
            new(Guid.NewGuid(), partial),
            new(Guid.NewGuid(), SmsDelivery.Skip("Segment limit exceeded")),
            new(Guid.NewGuid(), new SmsDelivery("queued", null, new() { "SM-other" }))
        });
        Assert.Equal(1, summary.Queued);
        Assert.Equal(1, summary.Failed);
        Assert.Equal(1, summary.Skipped);
    }
}
