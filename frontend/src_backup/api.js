// src/api.js
import axios from "axios";
import { getToken, setToken, clearToken } from "./utils/auth";

/**
 * Build a normalized base URL for the API.
 */
function buildApiBase() {
  const runtime = (typeof window !== "undefined" && window.__API_BASE__) || "";
  const env = import.meta.env.VITE_API_BASE || "";

  let raw = (runtime || env || "").toString().trim();
  if (!raw) return ""; // same-origin usage

  raw = raw.replace(/\/+$/, "");

  if (raw.toLowerCase().endsWith("/api")) return raw;
  return raw + "/api";
}

const apiBaseURL = buildApiBase();

// ---------- Axios Instance ----------
const api = axios.create({
  baseURL: apiBaseURL || "",
  withCredentials: true, // keep true if backend uses cookies
});

// ---------- Attach Token Interceptor ----------
api.interceptors.request.use(
  (config) => {
    try {
      // ✅ Prefer authToken, fallback to legacy keys
      let token =
        (typeof window !== "undefined" && localStorage.getItem("authToken")) ||
        localStorage.getItem("token") ||
        localStorage.getItem("mahima_token") ||
        null;

      if (token) {
        token = token.trim();
        config.headers = config.headers || {};
        config.headers.Authorization = token.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;
      }
    } catch (e) {
      console.warn("API interceptor failed to read token:", e);
    }
    return config;
  },
  (err) => Promise.reject(err)
);

// ---------- Helper to manually set header after login ----------
export function setAuthToken(token) {
  if (token) {
    token = token.trim();
    api.defaults.headers.common["Authorization"] = token.startsWith("Bearer ")
      ? token
      : `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

// ---------- Optional utility for manual fetch-style usage ----------
export async function apiFetch(url, opts = {}) {
  const token =
    (typeof window !== "undefined" && localStorage.getItem("authToken")) ||
    localStorage.getItem("token") ||
    localStorage.getItem("mahima_token");

  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
    ...(token ? { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, {
    ...opts,
    headers,
    credentials: opts.credentials ?? "include",
  });

  if (res.status === 401) {
    const text = await res.text();
    const err = new Error(`Unauthorized (401): ${text}`);
    err.status = 401;
    throw err;
  }

  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Server error ${res.status}: ${txt}`);
    err.status = res.status;
    throw err;
  }

  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch {
    return txt;
  }
}

export default api;
