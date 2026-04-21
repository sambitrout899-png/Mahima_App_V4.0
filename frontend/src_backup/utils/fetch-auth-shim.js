// src/utils/fetch-auth-shim.js
// Mahima auth + API helper for browser/Vite

const TOKEN_KEY = "mahima_token";

// Resolve API base:
// - Prefer Vite env: VITE_API_BASE (e.g. http://localhost:5001/api)
// - Else window.__API_BASE__ if you set it somewhere
// - Else fall back to "<origin>/api"
function resolveApiBase() {
  try {
    if (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) {
      return import.meta.env.VITE_API_BASE.replace(/\/+$/, "");
    }
  } catch {
    // ignore
  }

  try {
    if (window.__API_BASE__) {
      return String(window.__API_BASE__).trim().replace(/\/+$/, "");
    }
  } catch {
    // ignore
  }

  try {
    const origin = window.location.origin.replace(/\/+$/, "");
    return origin + "/api";
  } catch {
    return "/api";
  }
}

const API_BASE = resolveApiBase();
const origFetch = window.fetch ? window.fetch.bind(window) : fetch;

function readToken() {
  try {
    const raw = localStorage.getItem(TOKEN_KEY) || "";
    if (!raw) return "";
    return raw.toLowerCase().startsWith("bearer ")
      ? raw.slice(7).trim()
      : raw.trim();
  } catch {
    return "";
  }
}

function isAbsoluteUrl(url) {
  return /^https?:\/\//i.test(url || "");
}

// Rewrite URLs so API calls go to the API base
function normalizeUrl(url) {
  if (!url) return url;

  // already absolute → leave as-is
  if (isAbsoluteUrl(url)) return url;

  // ensure leading slash for relative paths
  if (!url.startsWith("/")) url = "/" + url;

  // calls like "/api/login" → "API_BASE + /login"
  if (url.startsWith("/api/") || url === "/api") {
    const rest = url.length > 4 ? url.slice(4) : "";
    return API_BASE + rest;
  }

  // calls like "/prayerrequests", "/sermons" should go behind the API base
  if (
    url.startsWith("/prayerrequests") ||
    url.startsWith("/sermons") ||
    url.startsWith("/tasks") ||
    url.startsWith("/users") ||
    url.startsWith("/roles") ||
    url.startsWith("/teams") ||
    url.startsWith("/pages") ||
    url.startsWith("/timesheets")
  ) {
    return API_BASE + url;
  }

  // Anything else (static assets etc.) stay relative to frontend
  return url;
}

function shouldAttach(url) {
  try {
    if (!url) return false;

    // attach token for anything hitting API_BASE or our API paths
    const base = API_BASE.replace(/\/+$/, "");

    if (base && (url.startsWith(base) || url.startsWith(base + "/"))) {
      return true;
    }

    if (typeof url === "string") {
      if (url.startsWith("/api")) return true;
      if (url.startsWith("/prayerrequests")) return true;
      if (url.startsWith("/sermons")) return true;

      if (
        /^https?:\/\//i.test(url) &&
        /\/\/(www\.)?mahimaministries\.com\//i.test(url) &&
        /(\/api(\/|$)|\/prayerrequests(\/|\?|$)|\/sermons(\/|\?|$))/i.test(url)
      ) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

// -------- EXPORTED HELPERS --------

export async function apiFetch(input, init = {}) {
  let url = typeof input === "string" ? input : (input && input.url) || "";

  url = normalizeUrl(url);

  const options = { ...init };
  const headers = new Headers(
    options.headers ||
      (typeof input !== "string" && input && input.headers) ||
      {}
  );

  try {
    if (shouldAttach(url) && !headers.has("Authorization")) {
      const token = readToken();
      if (token) headers.set("Authorization", "Bearer " + token);
    }
  } catch {
    // ignore
  }

  options.headers = headers;

  // optional debug logging
  try {
    const debugEnv =
      (import.meta && import.meta.env && import.meta.env.VITE_DEBUG_FETCH) ||
      (window && window.__DEBUG_FETCH__);
    if (debugEnv === "1" || debugEnv === true) {
      console.log("apiFetch →", options.method || "GET", url);
    }
  } catch {
    // ignore
  }

  return origFetch(url, options);
}

export async function apiFetchJson(input, init = {}) {
  const res = await apiFetch(input, init);
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} ${res.statusText || ""} – ${
        text || "Request failed"
      }`
    );
  }

  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Keep backward-compat: override window.fetch so old code benefits too
window.fetch = apiFetch;
