// src/api.js
import axios from "axios";
import { getToken, setToken, clearToken } from './utils/auth';
/**
 * Build a normalized base URL for the API.
 *
 * Rules:
 * - Prefer a runtime override window.__API_BASE__ if present (set in index.html).
 * - Otherwise use VITE_API_BASE from environment.
 * - If empty => return "" meaning "same-origin" (requests will be relative to frontend host).
 * - If non-empty => trim, remove trailing slashes, and ensure it ends with "/api".
 *
 * Examples:
 *  - "http://localhost:5001"      -> "http://localhost:5001/api"
 *  - "http://localhost:5001/"     -> "http://localhost:5001/api"
 *  - "http://localhost:5001/api"  -> "http://localhost:5001/api"
 *  - ""                           -> ""
 */
function buildApiBase() {
  // runtime override (optional)
  const runtime = (typeof window !== "undefined" && window.__API_BASE__) || "";
  const env = import.meta.env.VITE_API_BASE || "";

  let raw = (runtime || env || "").toString().trim();

  if (!raw) return ""; // same-origin usage

  // remove trailing slashes
  raw = raw.replace(/\/+$/, "");

  // If the author pointed at "/api" explicitly, that's fine â€” keep only one "/api"
  if (raw.toLowerCase().endsWith("/api")) {
    return raw; // already ends with /api
  }

  // otherwise append /api
  return raw + "/api";
}

const apiBaseURL = buildApiBase();

// create axios instance
const api = axios.create({
  baseURL: apiBaseURL || "", // "" => relative to current origin; otherwise e.g. "http://localhost:5001/api"
  withCredentials: true,     // keep if your backend requires cookies for auth; otherwise you can set false
});

// helper to set Authorization header
export function setAuthToken(token) {
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete api.defaults.headers.common["Authorization"];
}

export async function apiFetch(url, opts = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
/*const res = await fetch(url, {
    ...opts,
    headers,
    credentials: opts.credentials ?? 'include', // include cookies too; harmless with Bearer
  });*/

  // Optionally handle common statuses
  /*if (res.status === 401) {
    // unauthorized â€” caller can catch this and redirect to login
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
  }*/

  // try parse json, fallback to text
  //const txt = await res.text();
 // try { return JSON.parse(txt); } catch { return txt; }
}
export default api;


