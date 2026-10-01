using Mahima.Api.v3.clean.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace Mahima.Api.v3.clean.Tests;

public class SmsCostPolicyTests
{
    [Theory]
    [InlineData('a', 160, 1)]
    [InlineData('a', 161, 2)]
    [InlineData('^', 80, 1)]
    [InlineData('^', 81, 2)]
    [InlineData('ਮ', 70, 1)]
    [InlineData('ਮ', 71, 2)]
    [InlineData('ਮ', 536, 8)]
    public void CountsBillingSegments(char character, int count, int expected) =>
        Assert.Equal(expected, SmsCostPolicy.Segments(new string(character, count)));

    [Theory]
    [InlineData("daily-word")]
    [InlineData("night-prayer")]
    [InlineData("welcome")]
    [InlineData("custom")]
    public void NotificationsIncludingSenderFitOneSegment(string type)
    {
        var body = Assert.Single(TwilioSmsService.BuildParts(SmsCostPolicy.Notification(type)));
        Assert.StartsWith("महिमा: ", body);
        Assert.DoesNotContain("STOP", body);
        Assert.DoesNotContain("HELP", body);
        Assert.True(body.Length <= 70);
        Assert.Equal(1, SmsCostPolicy.Segments(body));
    }

    [Fact]
    public void ApprovedSundayTemplateIsPreservedAndUsesThreeSegments()
    {
        var message = SmsCostPolicy.Notification("sunday-church-reminder");
        Assert.Equal(message, SmsCostPolicy.Compact(message));
        Assert.Equal(message, SmsCostPolicy.Notification("saturday-church-reminder"));
        var body = Assert.Single(TwilioSmsService.BuildParts(message));
        Assert.Equal("महिमा: रविवार आराधना सभा - Universal School, Gurunanak Nagar - Jalandhar 144008 - ऑनलाइन जुड़ें: https://www.youtube.com/@MahimaMinistry-r8h-", body);
        Assert.Equal(141, body.Length);
        Assert.Equal(3, SmsCostPolicy.Segments(body));
        Assert.Equal(3, SmsCostPolicy.SegmentLimit(message));
        Assert.Equal(1, SmsCostPolicy.SegmentLimit(message + " extra"));
        Assert.Equal(1, SmsCostPolicy.SegmentLimit(SmsCostPolicy.Notification("daily-word")));
    }

    [Fact]
    public async Task ApprovedSundayPassesSegmentGateWithoutSendingWithMissingCredentials()
    {
        var service = new TwilioSmsService(new ConfigurationBuilder().Build(), NullLogger<TwilioSmsService>.Instance);
        var result = await service.SendAsync("+919876543210", SmsCostPolicy.Notification("sunday-church-reminder"));
        Assert.Equal("failed", result.Status);
        Assert.Contains("AccountSid", result.Error);
        Assert.Empty(result.MessageSids);
    }

    [Fact]
    public void ReproducesEightSegmentSundayMessage()
    {
        var languages = new[] { ("en", "English"), ("hi", "Hindi"), ("pa", "Punjabi") };
        var body = string.Join("\n\n", languages.Select(l => $"{l.Item2} ({l.Item1.ToUpperInvariant()}):\n{MinistryMessageFactory.Build("sunday-church-reminder", DateTime.Today, l.Item1)}"));
        var original = $"Mahima Ministry: {body}\nReply STOP to unsubscribe, HELP for help.";
        Assert.Equal(8, SmsCostPolicy.Segments(original));
        Assert.Equal(1, TwilioSmsService.BuildParts(SmsCostPolicy.Compact(body)).Sum(SmsCostPolicy.Segments));
    }

    [Fact]
    public async Task LongSmsBlockedBeforeProviderEvenWithConfiguredCredentials()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
            ["Twilio:AccountSid"] = "AC" + new string('a',32),
            ["Twilio:AuthToken"] = "test", ["Twilio:FromNumber"] = "+12025550123"
        }).Build();
        var service = new TwilioSmsService(config, NullLogger<TwilioSmsService>.Instance);
        var result = await service.SendAsync("+919876543210", new string('ਮ', 500));
        Assert.Equal("skipped", result.Status);
        Assert.Contains("billable segments", result.Error);
        Assert.Empty(result.MessageSids);
    }
}
