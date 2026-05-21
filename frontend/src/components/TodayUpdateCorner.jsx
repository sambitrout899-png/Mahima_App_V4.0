import { useEffect, useMemo, useState } from "react";
import { CloudSun, ExternalLink, MapPin, Newspaper, Radio, RefreshCw, Sparkles, Zap } from "lucide-react";
import { apiFetch } from "../utils/fetch-auth-shim";

const CACHE_KEY = "mahima_today_update_v1";
const CACHE_MAX_AGE_MS = 30 * 60 * 1000;

function getCachedUpdate() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (!cached?.savedAt || Date.now() - Number(cached.savedAt) > CACHE_MAX_AGE_MS) return null;
    return cached.data || null;
  } catch {
    return null;
  }
}

function setCachedUpdate(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {}
}

function getPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: CACHE_MAX_AGE_MS, timeout: 7000 }
    );
  });
}

function roundValue(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return Math.round(Number(value));
}

function articleTitle(article) {
  return String(article?.title || article?.Title || article?.headline || "").trim();
}

function articleUrl(article) {
  return String(article?.url || article?.Url || "").trim();
}

function articleSource(article) {
  return String(article?.source || article?.Source || "").trim();
}

export default function TodayUpdateCorner() {
  const initialCache = getCachedUpdate();
  const [data, setData] = useState(() => initialCache);
  const [loading, setLoading] = useState(!initialCache);
  const [error, setError] = useState("");

  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch {
      return "";
    }
  }, []);

  async function loadUpdate({ force = false } = {}) {
    const cached = !force ? getCachedUpdate() : null;
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const position = await getPosition();
      const params = new URLSearchParams();
      if (timezone) params.set("timezone", timezone);
      if (position?.lat !== undefined && position?.lon !== undefined) {
        params.set("lat", String(position.lat));
        params.set("lon", String(position.lon));
      }

      const suffix = params.toString() ? `?${params}` : "";
      const result = await apiFetch(`/today-updates${suffix}`, { timeoutMs: 22000 });
      setData(result);
      setCachedUpdate(result);
    } catch (err) {
      setError(err?.message || "Unable to load today's update.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const cached = getCachedUpdate();
      if (cached) return;
      await loadUpdate();
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const weather = data?.weather;
  const location = data?.location?.label || data?.location?.timezone || "your area";
  const temp = roundValue(weather?.temperatureC);
  const feelsLike = roundValue(weather?.feelsLikeC);
  const articles = Array.isArray(data?.christianUpdate?.articles) ? data.christianUpdate.articles : [];
  const topArticle = articles.find((article) => articleUrl(article));

  const tickerItems = useMemo(() => {
    const items = [];

    if (weather) {
      items.push({
        key: "weather",
        tone: "weather",
        label: `Local weather: ${temp ?? "--"} C, ${weather.summary || "weather update"} in ${location}${feelsLike !== null ? `, feels ${feelsLike} C` : ""}`,
      });
    } else {
      items.push({
        key: "weather-fallback",
        tone: "weather",
        label: loading ? "Finding your local weather and ministry context..." : "Enable location for local weather and regional Christian updates",
      });
    }

    const summary = String(data?.christianUpdate?.summary || "").trim();
    items.push({
      key: "summary",
      tone: "faith",
      label: loading && !data ? "Preparing today's Christian update..." : summary || "Christian update: keep watch for ministry news, prayer needs, and local church announcements today",
    });

    articles.slice(0, 6).forEach((article, index) => {
      const title = articleTitle(article);
      if (!title) return;
      const source = articleSource(article);
      items.push({
        key: `article-${index}`,
        tone: "news",
        label: `${title}${source ? ` - ${source}` : ""}`,
        url: articleUrl(article),
      });
    });

    if (error) {
      items.push({
        key: "error",
        tone: "alert",
        label: `Update notice: ${error}`,
      });
    }

    return items.filter((item) => item.label);
  }, [articles, data, error, feelsLike, loading, location, temp, weather]);

  const marqueeItems = tickerItems.length ? [...tickerItems, ...tickerItems] : [];

  return (
    <section className="today-ribbon" aria-label="Weather and Christian news updates">
      <div className="today-ribbon__glow" />
      <div className="today-ribbon__inner">
        <div className="today-ribbon__badge">
          <Radio className="h-4 w-4" />
          <span>Live Faith Wire</span>
        </div>

        <div className="today-ribbon__viewport">
          <div className="today-ribbon__track">
            {marqueeItems.map((item, index) => {
              const Icon = item.tone === "weather" ? CloudSun : item.tone === "news" ? Newspaper : item.tone === "alert" ? Zap : Sparkles;
              const content = (
                <>
                  <span className={`today-ribbon__icon today-ribbon__icon--${item.tone}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="today-ribbon__text">{item.label}</span>
                  {item.url && <ExternalLink className="h-3.5 w-3.5 opacity-80" />}
                </>
              );

              return item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="today-ribbon__item"
                  key={`${item.key}-${index}`}
                >
                  {content}
                </a>
              ) : (
                <span className="today-ribbon__item" key={`${item.key}-${index}`}>
                  {content}
                </span>
              );
            })}
          </div>
        </div>

        <div className="today-ribbon__meta">
          <span className="today-ribbon__location" title={location}>
            <MapPin className="h-3.5 w-3.5" />
            <span>{location}</span>
          </span>

          {topArticle?.url && (
            <a className="today-ribbon__source" href={articleUrl(topArticle)} target="_blank" rel="noreferrer">
              Source
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          <button
            type="button"
            onClick={() => loadUpdate({ force: true })}
            className="today-ribbon__refresh"
            disabled={loading}
            aria-label="Refresh weather and Christian updates"
            title="Refresh updates"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
    </section>
  );
}
