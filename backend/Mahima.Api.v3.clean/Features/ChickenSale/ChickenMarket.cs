using Microsoft.Extensions.Caching.Memory;
using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;

namespace Mahima.Api.v3.clean.Features.ChickenSale;

public sealed record ChickenQuote(string City, decimal? Price, DateOnly? AsOf, bool Fresh, string SourceUrl, string Status);
public static class ChickenMarket
{
    public static ChickenQuote Parse(string html, string city, string url, DateOnly today)
    {
        var text = WebUtility.HtmlDecode(Regex.Replace(html, "<[^>]+>", " ", RegexOptions.None, TimeSpan.FromSeconds(1)));
        text = Regex.Replace(text, @"\s+", " ", RegexOptions.None, TimeSpan.FromSeconds(1));
        var price = Regex.Match(text, @"(?<!Country )Chicken Live\s+1\s*Kg\s+Rs\.?\s*([\d,]+(?:\.\d+)?)", RegexOptions.IgnoreCase, TimeSpan.FromSeconds(1));
        var date = Regex.Match(text, @"Last updated on\s+(\d{2}-[A-Za-z]{3}-\d{4})", RegexOptions.IgnoreCase, TimeSpan.FromSeconds(1));
        if (!price.Success || !date.Success || !DateOnly.TryParseExact(date.Groups[1].Value, "dd-MMM-yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var asOf) || !decimal.TryParse(price.Groups[1].Value, NumberStyles.Number, CultureInfo.InvariantCulture, out var rate) || rate <= 0 || rate > 10000 || asOf > today)
            return new(city, null, null, false, url, "No verifiable dated live-chicken quote. Confirm with your supplier.");
        return new(city, rate, asOf, asOf == today, url, asOf == today ? "Indicative public live-chicken price; verify wholesale supplier rate." : "Stale public quote — not today's price. Confirm with your supplier.");
    }
    static readonly MemoryCache Cache = new(new MemoryCacheOptions { SizeLimit = 128 });
    static readonly SemaphoreSlim FetchGate = new(1, 1);
    public static async Task<ChickenQuote> Fetch(IHttpClientFactory factory, string city, CancellationToken ct)
    {
        if (city is null || city.Length > 80) return new("", null, null, false, "", "Enter a valid city.");
        var key = DateTime.UtcNow.AddHours(5.5).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) + ":" + city.Trim().ToLowerInvariant();
        if (Cache.TryGetValue<ChickenQuote>(key, out var found)) return found!;
        await FetchGate.WaitAsync(ct);
        try
        {
            if (Cache.TryGetValue<ChickenQuote>(key, out found)) return found!;
            var quote = await FetchCore(factory, city, ct);
            Cache.Set(key, quote, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(15), Size = 1 });
            return quote;
        }
        finally { FetchGate.Release(); }
    }
    static async Task<ChickenQuote> FetchCore(IHttpClientFactory factory, string city, CancellationToken ct)
    {
        city = (city ?? "").Trim();
        if (!Regex.IsMatch(city, @"^[A-Za-z][A-Za-z -]{1,79}$")) return new(city, null, null, false, "", "Use an English city name to look up market prices.");
        var slug = Regex.Replace(city.ToLowerInvariant(), @"[ -]+", "-");
        var url = $"https://www.indiaprices.co.in/chicken/{slug}-chicken-price/";
        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct); timeout.CancelAfter(TimeSpan.FromSeconds(12));
            using var client = factory.CreateClient();
            client.MaxResponseContentBufferSize = 2 * 1024 * 1024;
            using var response = await client.GetAsync(url, timeout.Token);
            if (!response.IsSuccessStatusCode) return new(city, null, null, false, url, "Market source unavailable for this city. Use your supplier's daily rate.");
            var html = await response.Content.ReadAsStringAsync(timeout.Token);
            return Parse(html, city, url, DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5.5)));
        }
        catch (Exception e) when (e is HttpRequestException or OperationCanceledException or RegexMatchTimeoutException)
        { return new(city, null, null, false, url, "Market lookup unavailable. Use your supplier's daily rate."); }
    }
}
