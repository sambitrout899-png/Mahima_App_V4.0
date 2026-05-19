// src/utils/fetch-auth-shim.js

/* ---------------- API BASE ---------------- */
function resolveApiBase() {
  let base = "";

  try {
    if (import.meta?.env?.VITE_API_BASE) {
      base = import.meta.env.VITE_API_BASE;
    } else if (import.meta?.env?.VITE_API_BASE_URL) {
      base = import.meta.env.VITE_API_BASE_URL;
    }
  } catch {}

  try {
    if (!base && typeof window !== "undefined" && window.__API_BASE__) {
      base = String(window.__API_BASE__).trim();
    }
  } catch {}

  try {
    if (!base && typeof window !== "undefined") {
      const isNative =
        import.meta.env.MODE === "mobile" ||
        Boolean(window.Capacitor?.isNativePlatform?.()) ||
        window.location?.protocol === "capacitor:";

      if (isNative) {
        base =
          import.meta.env.VITE_MOBILE_API_BASE ||
          "https://mahimaministries.in/api";
      }
    }
  } catch {}

  if (!base) {
    console.warn("API BASE not set. Falling back to /api");
    base = "/api";
  }

  return base.toString().trim().replace(/\/+$/, "");
}

const PUBLIC_API_BASE = "https://mahimaministries.in/api";
const API_BASE = resolveApiBase();
console.log("FINAL API BASE =", API_BASE);

/* ---------------- TOKEN ---------------- */
function readJsonToken(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return (
      parsed?.token ||
      parsed?.accessToken ||
      parsed?.jwt ||
      parsed?.bearerToken ||
      parsed?.data?.token ||
      parsed?.data?.accessToken ||
      ""
    );
  } catch {
    return "";
  }
}

function normalizeToken(token) {
  if (!token || typeof token !== "string") return "";
  const raw = token.trim();
  return raw.toLowerCase().startsWith("bearer ") ? raw.slice(7).trim() : raw;
}

function readToken() {
  try {
    const raw =
      localStorage.getItem("mahima_token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      readJsonToken("mahima:user") ||
      readJsonToken("mahima_user") ||
      readJsonToken("user") ||
      readJsonToken("me") ||
      readJsonToken("mahima_currentUser") ||
      readJsonToken("currentUser");

    return normalizeToken(raw || "");
  } catch {
    return "";
  }
}

/* ---------------- URL BUILDER ---------------- */
function isNativeAppMode() {
  try {
    return (
      import.meta.env.MODE === "mobile" ||
      Boolean(window.Capacitor?.isNativePlatform?.()) ||
      window.location?.protocol === "capacitor:" ||
      (window.location?.protocol === "https:" && window.location?.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

function buildUrlWithBase(url, base) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;

  const normalized = url.startsWith("/") ? url : `/${url}`;
  const cleanBase = String(base || API_BASE).trim().replace(/\/+$/, "");
  if (normalized.toLowerCase().startsWith("/api/") && cleanBase.toLowerCase().endsWith("/api")) {
    return cleanBase + normalized.slice(4);
  }

  return cleanBase + normalized;
}

function buildUrl(url) {
  return buildUrlWithBase(url, API_BASE);
}

async function readErrorBody(res) {
  const text = await res.text().catch(() => "");
  if (!text) return "";

  try {
    const json = JSON.parse(text);
    return json?.message || json?.error || json?.title || text;
  } catch {
    return text;
  }
}

function makeHttpError(res, body) {
  const err = new Error(body || `${res.status} ${res.statusText}` || "Request failed");
  err.status = res.status;
  err.statusText = res.statusText || "ERROR";
  err.body = body || "";
  return err;
}

/* ---------------- MAIN FETCH ---------------- */
export async function apiFetch(input, init = {}) {
  const url = typeof input === "string" ? input : input?.url || "";
  const {
    skipAuth = false,
    retryPublicApi = true,
    timeoutMs = 0,
    ...fetchInit
  } = init || {};
  const finalUrl = buildUrl(url);
  const headers = new Headers(fetchInit.headers || {});
  const token = readToken();

  if (token && !skipAuth) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (!headers.has("Content-Type") && fetchInit.body && !(fetchInit.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const options = {
    credentials: "same-origin",
    cache: "no-store",
    ...fetchInit,
    headers,
  };

  console.log("API CALL:", options.method || "GET", finalUrl);

  async function fetchOnce(urlToCall) {
    if (!timeoutMs || fetchInit.signal) {
      return fetch(urlToCall, options);
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(urlToCall, { ...options, signal: controller.signal });
    } catch (err) {
      if (err?.name === "AbortError") {
        const timeoutError = new Error(
          `Request timed out calling ${urlToCall}. Please check the server or connectivity settings.`
        );
        timeoutError.status = 408;
        timeoutError.statusText = "TIMEOUT";
        timeoutError.body = "";
        throw timeoutError;
      }
      throw err;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  let res;
  try {
    res = await fetchOnce(finalUrl);
  } catch (err) {
    if (retryPublicApi && isNativeAppMode() && !finalUrl.startsWith(PUBLIC_API_BASE)) {
      const fallbackUrl = buildUrlWithBase(url, PUBLIC_API_BASE);
      try {
        console.warn("API fallback:", options.method || "GET", fallbackUrl);
        res = await fetchOnce(fallbackUrl);
      } catch (fallbackErr) {
        if (fallbackErr?.status === 408) throw fallbackErr;
        const networkError = new Error(
          `Network error calling ${fallbackUrl}. Please check internet, HTTPS, and CORS.`
        );
        networkError.status = 0;
        networkError.statusText = "NETWORK_ERROR";
        networkError.body = fallbackErr?.message || err?.message || "";
        throw networkError;
      }
    } else {
      if (err?.status === 408) throw err;
      const networkError = new Error(
        `Network error calling ${finalUrl}. Please check internet, HTTPS, and CORS.`
      );
      networkError.status = 0;
      networkError.statusText = "NETWORK_ERROR";
      networkError.body = err?.message || "";
      throw networkError;
    }
  }

  if (!res) {
    const networkError = new Error("Network error. Please check your connection.");
    networkError.status = 0;
    networkError.statusText = "NETWORK_ERROR";
    networkError.body = "";
    throw networkError;
  }

  if (!res.ok) {
    const body = await readErrorBody(res);
    throw makeHttpError(res, body);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return await res.text().catch(() => "");
  }

  try {
    return await res.json();
  } catch {
    return null;
  }
}

/* ---------------- JSON WRAPPER ---------------- */
export async function apiFetchJson(input, init = {}) {
  try {
    const data = await apiFetch(input, init);

    return {
      ok: true,
      status: 200,
      statusText: "OK",
      data,
      text: () => Promise.resolve(typeof data === "string" ? data : JSON.stringify(data)),
      json: () => Promise.resolve(data),
    };
  } catch (err) {
    const message = err?.body || err?.message || "";
    return {
      ok: false,
      status: err?.status || 500,
      statusText: err?.statusText || "ERROR",
      data: null,
      error: message,
      text: () => Promise.resolve(message),
      json: () => Promise.resolve(null),
    };
  }
}

/* ---------------- AUTH APIs ---------------- */
export function register(data) {
  return apiFetchJson("/auth/register", {
    method: "POST",
    skipAuth: true,
    retryPublicApi: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function login(data) {
  return apiFetchJson("/auth/login", {
    method: "POST",
    skipAuth: true,
    retryPublicApi: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
