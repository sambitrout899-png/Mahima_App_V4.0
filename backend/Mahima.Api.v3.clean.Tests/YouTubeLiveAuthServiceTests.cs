using Mahima.Api.v3.clean.Services;
using Microsoft.Extensions.Configuration;

namespace Mahima.Api.v3.clean.Tests;

public sealed class YouTubeLiveAuthServiceTests
{
    [Fact]
    public void StatusExplainsMissingServerConfiguration()
    {
        var service = new YouTubeLiveAuthService(new ConfigurationBuilder().Build(), new TestHttpClientFactory());
        var status = service.Status("admin-1");
        Assert.False(status.Configured);
        Assert.False(status.Connected);
        Assert.Contains("YouTubeOAuth:ClientId", status.Message);
    }

    [Fact]
    public void AuthorizationUrlUsesStateOfflineAccessAndYouTubeScope()
    {
        var settings = new Dictionary<string, string?>
        {
            ["YouTubeOAuth:ClientId"] = "client-id",
            ["YouTubeOAuth:ClientSecret"] = "client-secret",
            ["YouTubeOAuth:RedirectUri"] = "https://example.test/api/live-broadcast/youtube/callback"
        };
        var service = new YouTubeLiveAuthService(
            new ConfigurationBuilder().AddInMemoryCollection(settings).Build(),
            new TestHttpClientFactory());

        var url = service.CreateAuthorizationUrl("admin-1");
        Assert.StartsWith("https://accounts.google.com/o/oauth2/v2/auth?", url);
        Assert.Contains("access_type=offline", url);
        Assert.Contains("scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutube", url);
        Assert.Contains("state=", url);
    }

    private sealed class TestHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new();
    }
}
