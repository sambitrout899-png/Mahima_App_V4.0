using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/link-preview")]
    public class LinkPreviewController : ControllerBase
    {
        private const int MaxHtmlBytes = 512 * 1024;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<LinkPreviewController> _logger;

        public LinkPreviewController(IHttpClientFactory httpClientFactory, ILogger<LinkPreviewController> logger)
        {
            _httpClientFactory = httpClientFactory ?? throw new ArgumentNullException(nameof(httpClientFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] string url, CancellationToken ct)
        {
            if (!TryNormalizeUrl(url, out var target, out var error))
                return BadRequest(error);

            if (!await IsPublicHostAsync(target.Host, ct))
                return BadRequest("This link cannot be previewed.");

            try
            {
                var client = _httpClientFactory.CreateClient("LinkPreview");
                using var request = new HttpRequestMessage(HttpMethod.Get, target);
                request.Headers.UserAgent.ParseAdd("MahimaLinkPreview/1.0");
                request.Headers.Accept.ParseAdd("text/html,application/xhtml+xml");

                using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
                if (!response.IsSuccessStatusCode)
                    return StatusCode((int)response.StatusCode, "Could not load link preview.");

                var contentType = response.Content.Headers.ContentType?.MediaType ?? "";
                if (!contentType.Contains("html", StringComparison.OrdinalIgnoreCase)
                    && !contentType.Contains("text", StringComparison.OrdinalIgnoreCase))
                {
                    return Ok(new LinkPreviewDto
                    {
                        Url = target.ToString(),
                        SiteName = target.Host,
                        Title = target.Host
                    });
                }

                await using var stream = await response.Content.ReadAsStreamAsync(ct);
                var buffer = new byte[MaxHtmlBytes];
                var total = 0;
                while (total < buffer.Length)
                {
                    var read = await stream.ReadAsync(buffer.AsMemory(total, buffer.Length - total), ct);
                    if (read <= 0) break;
                    total += read;
                }

                var html = System.Text.Encoding.UTF8.GetString(buffer, 0, total);
                var preview = BuildPreview(target, html);
                return Ok(preview);
            }
            catch (OperationCanceledException)
            {
                return StatusCode(504, "Preview request timed out.");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Link preview failed for {Url}", target);
                return StatusCode(502, "Could not load link preview.");
            }
        }

        private static LinkPreviewDto BuildPreview(Uri target, string html)
        {
            var title = FirstMeta(html, "og:title")
                ?? FirstMeta(html, "twitter:title")
                ?? HtmlTitle(html)
                ?? target.Host;
            var description = FirstMeta(html, "og:description")
                ?? FirstMeta(html, "twitter:description")
                ?? FirstMeta(html, "description")
                ?? "";
            var image = FirstMeta(html, "og:image")
                ?? FirstMeta(html, "twitter:image")
                ?? "";
            var siteName = FirstMeta(html, "og:site_name") ?? target.Host;

            return new LinkPreviewDto
            {
                Url = target.ToString(),
                SiteName = Clean(siteName),
                Title = Clean(title),
                Description = Clean(description),
                ImageUrl = Absolutize(target, Clean(image))
            };
        }

        private static bool TryNormalizeUrl(string value, out Uri uri, out string error)
        {
            uri = null!;
            error = "";
            var raw = (value ?? "").Trim();
            if (raw.Length > 2048)
            {
                error = "URL is too long.";
                return false;
            }

            if (!Uri.TryCreate(raw, UriKind.Absolute, out var parsed)
                || (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps))
            {
                error = "Only http and https URLs can be previewed.";
                return false;
            }

            uri = parsed;
            return true;
        }

        private static async Task<bool> IsPublicHostAsync(string host, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(host)) return false;
            if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase)) return false;

            IPAddress[] addresses;
            try
            {
                addresses = await Dns.GetHostAddressesAsync(host, ct);
            }
            catch
            {
                return false;
            }

            return addresses.Length > 0 && addresses.All(IsPublicAddress);
        }

        private static bool IsPublicAddress(IPAddress address)
        {
            if (IPAddress.IsLoopback(address)) return false;
            if (address.AddressFamily == AddressFamily.InterNetwork)
            {
                var b = address.GetAddressBytes();
                if (b[0] == 10) return false;
                if (b[0] == 127) return false;
                if (b[0] == 169 && b[1] == 254) return false;
                if (b[0] == 172 && b[1] >= 16 && b[1] <= 31) return false;
                if (b[0] == 192 && b[1] == 168) return false;
                return true;
            }
            if (address.AddressFamily == AddressFamily.InterNetworkV6)
            {
                return !(address.IsIPv6LinkLocal || address.IsIPv6SiteLocal || address.IsIPv6Multicast);
            }
            return false;
        }

        private static string? FirstMeta(string html, string name)
        {
            var escaped = Regex.Escape(name);
            var patterns = new[]
            {
                $@"<meta[^>]+(?:property|name)=[""']{escaped}[""'][^>]+content=[""'](?<v>.*?)[""'][^>]*>",
                $@"<meta[^>]+content=[""'](?<v>.*?)[""'][^>]+(?:property|name)=[""']{escaped}[""'][^>]*>"
            };
            foreach (var pattern in patterns)
            {
                var match = Regex.Match(html, pattern, RegexOptions.IgnoreCase | RegexOptions.Singleline);
                if (match.Success) return WebUtility.HtmlDecode(match.Groups["v"].Value);
            }
            return null;
        }

        private static string? HtmlTitle(string html)
        {
            var match = Regex.Match(html, @"<title[^>]*>(?<v>.*?)</title>", RegexOptions.IgnoreCase | RegexOptions.Singleline);
            return match.Success ? WebUtility.HtmlDecode(match.Groups["v"].Value) : null;
        }

        private static string Clean(string value)
        {
            return Regex.Replace(value ?? "", @"\s+", " ").Trim();
        }

        private static string Absolutize(Uri page, string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return "";
            return Uri.TryCreate(page, value, out var resolved) ? resolved.ToString() : value;
        }

        public class LinkPreviewDto
        {
            public string Url { get; set; } = "";
            public string SiteName { get; set; } = "";
            public string Title { get; set; } = "";
            public string Description { get; set; } = "";
            public string ImageUrl { get; set; } = "";
        }
    }
}
