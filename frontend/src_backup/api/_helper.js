/**
 * _helper.js - deploy-provided normalized API helper
 * Exports `call` and `cleanPayload` for compatibility.
 */

const TOKEN_KEY = "mahima_token";

const getApiBase = () => {
  const base =
    (typeof window !== "undefined" && window.__API_BASE__) ||
    process.env.REACT_APP_API_URL ||
    "/api";
  return base.toString().replace(/\/+$/g, "");
};

function buildUrl(pathOrUrl) {
  if (!pathOrUrl) return getApiBase();
  let p = pathOrUrl.toString();
  if (/^https?:\/\//i.test(p)) return p;
  p = p.replace(/^\/+/, "");
  const base = getApiBase();
  if (/\/?api$/i.test(base) && /^api\//i.test(p)) {
    p = p.replace(/^api\//i, "");
  }
  if (!p) return base || "/api";
  return base.replace(/\/+$/g, "") + "/" + p.replace(/^\/+/, "");
}

// ---- token helpers (no in-memory cache!) ----
function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}
function authHeader() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function cleanPayload(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  const result = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === null || v === undefined) continue;
    if (typeof v === "object") {
      const cleaned = cleanPayload(v);
      if (cleaned === null) continue;
      if (
        typeof cleaned === "object" &&
        !Array.isArray(cleaned) &&
        Object.keys(cleaned).length === 0
      )
        continue;
      result[k] = cleaned;
    } else {
      result[k] = v;
    }
  }
  return result;
}

export async function call(pathOrUrl, opts = {}) {
  const url = buildUrl(pathOrUrl);

  // default headers
  const defaultHeaders = {
    Accept: "application/json",
    ...authHeader(), // <-- attach JWT if present
  };

  // JSON body handling
  if (opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)) {
    opts.headers = opts.headers || {};
    // Respect existing header casing
    const hasCT =
      "Content-Type" in opts.headers || "content-type" in opts.headers;
    if (!hasCT) {
      opts.headers["Content-Type"] = "application/json";
    }
    opts.body = JSON.stringify(cleanPayload(opts.body));
  }

  // Compose fetch options (avoid stale cache)
  const fetchOpts = {
    credentials: "same-origin",
    cache: "no-store",
    ...opts,
  };
  fetchOpts.headers = { ...defaultHeaders, ...(fetchOpts.headers || {}) };

  const res = await fetch(url, fetchOpts);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    const err = new Error(`HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.response = body;
    throw err;
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}
