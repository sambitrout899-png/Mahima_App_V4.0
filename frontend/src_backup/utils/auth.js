// src/utils/auth.js
const TOKEN_KEY = "mahima_token";

// Normalize any token (strip accidental "Bearer " prefixes, trim whitespace)
function normalizeToken(token) {
  if (!token || typeof token !== "string") return "";
  const t = token.trim();
  return t.toLowerCase().startsWith("bearer ")
    ? t.slice(7).trim()
    : t;
}

export function setToken(token) {
  const clean = normalizeToken(token);
  if (!clean) return;
  try {
    localStorage.setItem(TOKEN_KEY, clean);
  } catch {
    // ignore storage errors (quota/private mode)
  }
}

export function getToken() {
  // Always read from storage at call time (no in-memory cache!)
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    return t ? t : "";
  } catch {
    return "";
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Handy helper: returns an Authorization header object if a token exists,
 * otherwise an empty object. Use like:
 *   fetch(url, { headers: { ...authHeader(), 'Content-Type': 'application/json' } })
 */
export function authHeader() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
