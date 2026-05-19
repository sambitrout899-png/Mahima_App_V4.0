using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Mahima.Api.v3.clean.Extensions;
using Mahima.Api.v3.clean.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Mahima.Api.v3.clean.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/today-updates")]
    public class TodayUpdatesController : ControllerBase
    {
        private static readonly CultureInfo Invariant = CultureInfo.InvariantCulture;

        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IPastorBotService _pastorBot;
        private readonly ILogger<TodayUpdatesController> _logger;

        public TodayUpdatesController(
            IHttpClientFactory httpClientFactory,
            IPastorBotService pastorBot,
            ILogger<TodayUpdatesController> logger)
        {
            _httpClientFactory = httpClientFactory;
            _pastorBot = pastorBot;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] double? lat, [FromQuery] double? lon, [FromQuery] string? timezone)
        {
            if (lat.HasValue && (lat < -90 || lat > 90)) return BadRequest("Invalid latitude.");
            if (lon.HasValue && (lon < -180 || lon > 180)) return BadRequest("Invalid longitude.");

            var ct = HttpContext.RequestAborted;
            var client = _httpClientFactory.CreateClient("PastorBot");
            client.Timeout = TimeSpan.FromSeconds(18);

            var location = await ResolveLocationAsync(client, lat, lon, timezone, ct);
            var weather = await ResolveWeatherAsync(client, lat, lon, ct);
            var articles = await FetchChristianArticlesAsync(client, location, ct);
            var christianUpdate = await BuildChristianUpdateAsync(location, articles, ct);

            return Ok(new TodayUpdateResponse
            {
                Location = location,
                Weather = weather,
                ChristianUpdate = christianUpdate,
                GeneratedAtUtc = DateTime.UtcNow
            });
        }

        private async Task<LocationDto> ResolveLocationAsync(HttpClient client, double? lat, double? lon, string? timezone, CancellationToken ct)
        {
            var fallback = new LocationDto
            {
                Label = string.IsNullOrWhiteSpace(timezone) ? "your area" : timezone.Replace("_", " "),
                Timezone = timezone
            };

            if (!lat.HasValue || !lon.HasValue) return fallback;

            try
            {
                var url = $"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat.Value.ToString(Invariant)}&longitude={lon.Value.ToString(Invariant)}&localityLanguage=en";
                var json = await client.GetStringAsync(url, ct);
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                var city = GetString(root, "city") ?? GetString(root, "locality");
                var state = GetString(root, "principalSubdivision");
                var country = GetString(root, "countryName");
                var labelParts = new[] { city, state, country }
                    .Where(part => !string.IsNullOrWhiteSpace(part))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                return new LocationDto
                {
                    City = city,
                    State = state,
                    Country = country,
                    Label = labelParts.Count > 0 ? string.Join(", ", labelParts) : fallback.Label,
                    Timezone = timezone
                };
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Location lookup failed.");
                return fallback;
            }
        }

        private async Task<WeatherDto?> ResolveWeatherAsync(HttpClient client, double? lat, double? lon, CancellationToken ct)
        {
            if (!lat.HasValue || !lon.HasValue) return null;

            try
            {
                var url = "https://api.open-meteo.com/v1/forecast"
                    + $"?latitude={lat.Value.ToString(Invariant)}"
                    + $"&longitude={lon.Value.ToString(Invariant)}"
                    + "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code"
                    + "&timezone=auto";

                var json = await client.GetStringAsync(url, ct);
                using var doc = JsonDocument.Parse(json);
                if (!doc.RootElement.TryGetProperty("current", out var current)) return null;

                var codeValue = GetDouble(current, "weather_code");
                var code = codeValue.HasValue ? Convert.ToInt32(codeValue.Value) : (int?)null;
                return new WeatherDto
                {
                    TemperatureC = GetDouble(current, "temperature_2m"),
                    FeelsLikeC = GetDouble(current, "apparent_temperature"),
                    Humidity = GetDouble(current, "relative_humidity_2m"),
                    WindKph = GetDouble(current, "wind_speed_10m"),
                    Code = code,
                    Summary = WeatherSummary(code)
                };
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Weather lookup failed.");
                return null;
            }
        }

        private async Task<IReadOnlyList<ArticleDto>> FetchChristianArticlesAsync(HttpClient client, LocationDto location, CancellationToken ct)
        {
            try
            {
                var terms = new List<string> { "(christian OR church OR pastor OR believers)" };
                if (!string.IsNullOrWhiteSpace(location.State)) terms.Add($"\"{location.State}\"");
                if (!string.IsNullOrWhiteSpace(location.Country)) terms.Add($"\"{location.Country}\"");

                var query = string.Join(" ", terms);
                var url = "https://api.gdeltproject.org/api/v2/doc/doc"
                    + $"?query={Uri.EscapeDataString(query)}"
                    + "&mode=ArtList&format=json&maxrecords=5&sort=HybridRel";

                var json = await client.GetStringAsync(url, ct);
                using var doc = JsonDocument.Parse(json);
                if (!doc.RootElement.TryGetProperty("articles", out var articles) || articles.ValueKind != JsonValueKind.Array)
                    return Array.Empty<ArticleDto>();

                return articles.EnumerateArray()
                    .Select(article => new ArticleDto
                    {
                        Title = GetString(article, "title") ?? "Christian community update",
                        Url = GetString(article, "url"),
                        Source = GetString(article, "domain") ?? GetString(article, "sourcecountry"),
                        SeenDate = GetString(article, "seendate")
                    })
                    .Where(article => !string.IsNullOrWhiteSpace(article.Title))
                    .Take(5)
                    .ToList();
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Christian update lookup failed.");
                return Array.Empty<ArticleDto>();
            }
        }

        private async Task<ChristianUpdateDto> BuildChristianUpdateAsync(LocationDto location, IReadOnlyList<ArticleDto> articles, CancellationToken ct)
        {
            var region = string.IsNullOrWhiteSpace(location.Label) ? "your area" : location.Label;
            var today = DateTime.UtcNow.ToString("MMMM d, yyyy", Invariant);

            if (articles.Count == 0)
            {
                return new ChristianUpdateDto
                {
                    Summary = $"No verified Christian-specific local headlines were found for {region} right now. Today, keep the focus on prayer, fellowship, and checking your local church announcements.",
                    Articles = articles
                };
            }

            try
            {
                var headlines = string.Join("\n", articles.Select((article, index) => $"{index + 1}. {article.Title} ({article.Source})"));
                var prompt = $@"Create a short Christian update for {region} for {today}.
Use only these verified public headlines; do not invent details:
{headlines}

Write 2 concise sentences and one prayer focus. Keep it pastoral, careful, and factual.";

                var userId = User.GetUserIdGuid();
                var reply = await _pastorBot.AskAsync(userId, prompt, false, "en", "english-teaching-guide", null, ct);
                return new ChristianUpdateDto
                {
                    Summary = string.IsNullOrWhiteSpace(reply.Answer) ? FallbackUpdate(region, articles) : reply.Answer,
                    Articles = articles
                };
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "AI Christian update generation failed.");
                return new ChristianUpdateDto
                {
                    Summary = FallbackUpdate(region, articles),
                    Articles = articles
                };
            }
        }

        private static string FallbackUpdate(string region, IReadOnlyList<ArticleDto> articles)
        {
            var first = articles.FirstOrDefault()?.Title;
            if (string.IsNullOrWhiteSpace(first))
                return $"No verified Christian-specific local headlines were found for {region} right now.";

            return $"Christian update for {region}: {first}. Prayer focus: ask God for wisdom, unity, and protection for believers and local church leaders today.";
        }

        private static string? GetString(JsonElement element, string propertyName)
        {
            if (!element.TryGetProperty(propertyName, out var value) || value.ValueKind == JsonValueKind.Null)
                return null;
            return value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString();
        }

        private static double? GetDouble(JsonElement element, string propertyName)
        {
            if (!element.TryGetProperty(propertyName, out var value) || value.ValueKind == JsonValueKind.Null)
                return null;
            if (value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out var number)) return number;
            return double.TryParse(value.ToString(), NumberStyles.Any, Invariant, out var parsed) ? parsed : null;
        }

        private static string WeatherSummary(int? code) => code switch
        {
            0 => "Clear sky",
            1 or 2 => "Mostly clear",
            3 => "Cloudy",
            45 or 48 => "Fog",
            51 or 53 or 55 => "Drizzle",
            61 or 63 or 65 => "Rain",
            71 or 73 or 75 => "Snow",
            80 or 81 or 82 => "Showers",
            95 or 96 or 99 => "Thunderstorm",
            _ => "Weather update"
        };

        public class TodayUpdateResponse
        {
            public LocationDto Location { get; set; } = new();
            public WeatherDto? Weather { get; set; }
            public ChristianUpdateDto ChristianUpdate { get; set; } = new();
            public DateTime GeneratedAtUtc { get; set; }
        }

        public class LocationDto
        {
            public string? City { get; set; }
            public string? State { get; set; }
            public string? Country { get; set; }
            public string? Label { get; set; }
            public string? Timezone { get; set; }
        }

        public class WeatherDto
        {
            public double? TemperatureC { get; set; }
            public double? FeelsLikeC { get; set; }
            public double? Humidity { get; set; }
            public double? WindKph { get; set; }
            public int? Code { get; set; }
            public string Summary { get; set; } = "Weather update";
        }

        public class ChristianUpdateDto
        {
            public string Summary { get; set; } = "";
            public IReadOnlyList<ArticleDto> Articles { get; set; } = Array.Empty<ArticleDto>();
        }

        public class ArticleDto
        {
            public string Title { get; set; } = "";
            public string? Url { get; set; }
            public string? Source { get; set; }
            public string? SeenDate { get; set; }
        }
    }
}
