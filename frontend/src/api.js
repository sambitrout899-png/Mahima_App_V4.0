// src/api.js

import { apiFetchJson } from "./utils/fetch-auth-shim";

/* ---------------- API BASE ---------------- */
function buildApiBase() {
  let base = "";

  try {
    if (typeof window !== "undefined" && window.__API_BASE__) {
      base = String(window.__API_BASE__).trim();
    }
  } catch {}

  try {
    if (!base) {
      base =
        import.meta.env.VITE_API_BASE ||
        import.meta.env.VITE_API_BASE_URL ||
        "";
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

  if (!base) base = "/api";
  return base.toString().trim().replace(/\/+$/, "");
}

export const API_BASE = buildApiBase();

console.log("FINAL API BASE:", API_BASE);

/* ---------------- API WRAPPER ---------------- */
const defaults = {
  headers: {
    common: {},
  },
};

function appendParams(url, params) {
  if (!params) return url;

  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== "") {
          query.append(key, item);
        }
      });
    } else {
      query.set(key, value);
    }
  });

  const qs = query.toString();
  if (!qs) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${qs}`;
}

function headersWithDefaults(headers) {
  return {
    ...(defaults.headers.common || {}),
    ...(headers || {}),
  };
}

function bodyFor(data, headers) {
  if (data === undefined) return undefined;
  if (data === null) return null;
  if (typeof FormData !== "undefined" && data instanceof FormData) return data;
  if (!headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }
  return typeof data === "string" ? data : JSON.stringify(data);
}

function request(method, url, data, options = {}) {
  const { params, headers: optionHeaders, ...rest } = options || {};
  const headers = headersWithDefaults(optionHeaders);
  const init = {
    ...rest,
    method,
    headers,
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = bodyFor(data, headers);
  }

  return apiFetchJson(appendParams(url, params), init);
}

const api = {
  defaults,
  get: (url, options = {}) => request("GET", url, undefined, options),
  post: (url, data, options = {}) => request("POST", url, data, options),
  put: (url, data, options = {}) => request("PUT", url, data, options),
  patch: (url, data, options = {}) => request("PATCH", url, data, options),
  delete: (url, options = {}) => request("DELETE", url, undefined, options),
};

export default api;

/* ---------------- TOKEN HELPER ---------------- */
export function setAuthToken(token) {
  try {
    if (token) {
      const cleanToken = String(token).replace(/^Bearer\s+/i, "").trim();
      localStorage.setItem("mahima_token", cleanToken);
      localStorage.setItem("authToken", cleanToken);
      localStorage.setItem("token", cleanToken);
      defaults.headers.common.Authorization = `Bearer ${cleanToken}`;
    } else {
      localStorage.removeItem("mahima_token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("token");
      delete defaults.headers.common.Authorization;
    }

    window.dispatchEvent(new CustomEvent("auth:change", { detail: { token: token || null } }));
  } catch (e) {
    console.warn("Token storage failed:", e);
  }
}
