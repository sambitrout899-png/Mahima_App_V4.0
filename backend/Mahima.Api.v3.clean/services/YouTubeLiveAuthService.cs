using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Text.Json;

namespace Mahima.Api.v3.clean.Services;

public sealed record YouTubeConnectionStatus(bool Configured, bool Connected, string? ChannelTitle = null, string? Message = null);

public sealed class YouTubeLiveAuthService
{
    private sealed record PendingLogin(string UserId, DateTimeOffset Expires);
    private sealed record UserToken(string AccessToken, string? RefreshToken, DateTimeOffset Expires, string? ChannelTitle);
    private readonly ConcurrentDictionary<string, PendingLogin> _pending = new();
    private readonly ConcurrentDictionary<string, UserToken> _tokens = new();
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _clients;

    public YouTubeLiveAuthService(IConfiguration configuration, IHttpClientFactory clients)
    {
        _configuration = configuration;
        _clients = clients;
    }

    public YouTubeConnectionStatus Status(string userId)
    {
        if (!IsConfigured) return new(false, false, Message: "Set YouTubeOAuth:ClientId, ClientSecret, and RedirectUri on the API server.");
        return _tokens.TryGetValue(userId, out var token)
            ? new(true, true, token.ChannelTitle, "YouTube channel connected for this server session.")
            : new(true, false);
    }

    public string CreateAuthorizationUrl(string userId)
    {
        if (!IsConfigured) throw new InvalidOperationException("YouTube OAuth is not configured on the API server.");
        var state = Guid.NewGuid().ToString("N");
        _pending[state] = new(userId, DateTimeOffset.UtcNow.AddMinutes(10));
        var values = new Dictionary<string, string?>
        {
            ["client_id"] = ClientId, ["redirect_uri"] = RedirectUri, ["response_type"] = "code",
            ["scope"] = "https://www.googleapis.com/auth/youtube", ["access_type"] = "offline",
            ["include_granted_scopes"] = "true", ["prompt"] = "consent", ["state"] = state
        };
        return "https://accounts.google.com/o/oauth2/v2/auth?" + string.Join('&', values.Select(x => $"{Uri.EscapeDataString(x.Key)}={Uri.EscapeDataString(x.Value ?? "")}"));
    }

    public async Task CompleteAsync(string state, string code, CancellationToken cancellationToken)
    {
        if (!_pending.TryRemove(state, out var pending) || pending.Expires < DateTimeOffset.UtcNow)
            throw new ArgumentException("The YouTube login request expired. Start the connection again.");
        using var response = await _clients.CreateClient().PostAsync("https://oauth2.googleapis.com/token", new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = ClientId!, ["client_secret"] = ClientSecret!, ["code"] = code,
            ["grant_type"] = "authorization_code", ["redirect_uri"] = RedirectUri!
        }), cancellationToken);
        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException("Google did not accept the YouTube authorization code.");
        using var payload = JsonDocument.Parse(json);
        var root = payload.RootElement;
        var accessToken = root.GetProperty("access_token").GetString()!;
        var refreshToken = root.TryGetProperty("refresh_token", out var refresh) ? refresh.GetString() : null;
        var expires = root.TryGetProperty("expires_in", out var seconds) ? seconds.GetInt32() : 3600;
        var title = await ReadChannelTitle(accessToken, cancellationToken);
        _tokens[pending.UserId] = new(accessToken, refreshToken, DateTimeOffset.UtcNow.AddSeconds(expires), title);
    }

    public void Disconnect(string userId) => _tokens.TryRemove(userId, out _);

    private async Task<string?> ReadChannelTitle(string accessToken, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        using var response = await _clients.CreateClient().SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode) return null;
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        return json.RootElement.GetProperty("items").EnumerateArray().FirstOrDefault().TryGetProperty("snippet", out var snippet) && snippet.TryGetProperty("title", out var title) ? title.GetString() : null;
    }

    private bool IsConfigured => !string.IsNullOrWhiteSpace(ClientId) && !string.IsNullOrWhiteSpace(ClientSecret) && !string.IsNullOrWhiteSpace(RedirectUri);
    private string? ClientId => _configuration["YouTubeOAuth:ClientId"];
    private string? ClientSecret => _configuration["YouTubeOAuth:ClientSecret"];
    private string? RedirectUri => _configuration["YouTubeOAuth:RedirectUri"];
}
