import { useEffect, useMemo, useState } from "react";
import { CloudSun, ExternalLink, MapPin, Newspaper, RefreshCw, Sparkles } from "lucide-react";
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

export default function TodayUpdateCorner() {
  const [data, setData] = useState(() => getCachedUpdate());
  const [loading, setLoading] = useState(!getCachedUpdate());
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
  const topArticle = articles.find((article) => article?.url);

  return (
    <section className="border-b border-amber-100 bg-gradient-to-r from-amber-50 via-white to-emerald-50 px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.4fr)] xl:flex-1">
          <div className="rounded-xl border border-amber-100 bg-white/90 p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <CloudSun className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Local Weather</p>
                <p className="text-sm font-bold text-slate-900">
                  {loading && !data ? "Loading..." : weather ? `${temp ?? "--"} C - ${weather.summary}` : "Location needed"}
                </p>
                <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{location}</span>
                  {feelsLike !== null && <span className="shrink-0">- feels {feelsLike} C</span>}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-white/90 p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Christian Update Today</p>
                  {topArticle?.url && (
                    <a
                      href={topArticle.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-200"
                    >
                      <Newspaper className="h-3 w-3" />
                      Source
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <p className="mt-1 text-sm leading-5 text-slate-700">
                  {loading && !data ? "Preparing a local ministry update..." : data?.christianUpdate?.summary || "No update available yet."}
                </p>
                {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadUpdate({ force: true })}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700 disabled:opacity-60"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
    </section>
  );
}
