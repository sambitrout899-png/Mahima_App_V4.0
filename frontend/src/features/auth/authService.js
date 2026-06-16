// src/features/auth/authService.js

import api, { API_BASE } from "../../api";

const TOKEN_KEY = "mahima_token";
const USERNAME_KEY = "mahima_username";
const ME_KEY = "me";

function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized.toLowerCase().startsWith("/api/") && API_BASE.toLowerCase().endsWith("/api")) {
    return API_BASE + normalized.slice(4);
  }
  return API_BASE + normalized;
}

/* ---------------- TOKEN HELPERS ---------------- */

export function getToken() {
  try {
    const raw =
      localStorage.getItem(TOKEN_KEY) ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("token");

    if (raw) return raw.replace(/^Bearer\s+/i, "").trim();

    for (const key of ["mahima:user", "mahima_user", "user", "me", "mahima_currentUser", "currentUser"]) {
      const savedUser = JSON.parse(localStorage.getItem(key) || "{}");
      const token =
        savedUser?.token ||
        savedUser?.accessToken ||
        savedUser?.jwt ||
        savedUser?.bearerToken ||
        savedUser?.data?.token ||
        savedUser?.data?.accessToken;
      if (token) return String(token).replace(/^Bearer\s+/i, "").trim();
    }

    return null;
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) {
      const cleanToken = String(token).replace(/^Bearer\s+/i, "").trim();
      localStorage.setItem(TOKEN_KEY, cleanToken);
      localStorage.setItem("authToken", cleanToken);
      localStorage.setItem("token", cleanToken);
      if (api?.defaults?.headers?.common) {
        api.defaults.headers.common["Authorization"] = `Bearer ${cleanToken}`;
      }
    } else {
      localStorage.removeItem(TOKEN_KEY);
      if (api?.defaults?.headers?.common) {
        delete api.defaults.headers.common["Authorization"];
      }
    }

    window.dispatchEvent(
      new CustomEvent("auth:change", { detail: { token } })
    );
  } catch {}
}

export function removeToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("authToken");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("token");
    localStorage.removeItem("mahima_remember_login");
    if (api?.defaults?.headers?.common) {
      delete api.defaults.headers.common["Authorization"];
    }

    window.dispatchEvent(
      new CustomEvent("auth:change", { detail: { token: null } })
    );
  } catch {}
}

/* ✅ FIXED EXPORT */
export function logout() {
  removeToken();
}

/* ---------------- USER HELPERS ---------------- */

export function getSavedUsername() {
  try {
    return localStorage.getItem(USERNAME_KEY);
  } catch {
    return null;
  }
}

export function setSavedUsername(name) {
  try {
    if (name) localStorage.setItem(USERNAME_KEY, name);
    else localStorage.removeItem(USERNAME_KEY);
  } catch {}
}

export function setCurrentUser(user) {
  try {
    const value = JSON.stringify(user || {});
    localStorage.setItem(ME_KEY, value);
    localStorage.setItem("mahima_user", value);
    localStorage.setItem("currentUser", value);
  } catch {}
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(ME_KEY) || "{}");
  } catch {
    return {};
  }
}

/* ---------------- ERROR HANDLER ---------------- */

async function parseErrorResponse(resp) {
  const ct = resp.headers.get("content-type") || "";
  let txt = await resp.text().catch(() => "");

  if (ct.includes("application/json")) {
    try {
      const j = JSON.parse(txt);
      return j?.message || j?.error || j?.title || JSON.stringify(j);
    } catch {}
  }

  return txt || `HTTP ${resp.status}`;
}

/* ---------------- LOGIN ---------------- */

export async function login({ usernameOrEmail, password = "" }) {
  if (!usernameOrEmail) throw new Error("Username/email required");

  const url = apiUrl("/auth/login");
  console.debug("login ->", url);

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ usernameOrEmail, password }),
  });

  if (!resp.ok) {
    const errMsg = await parseErrorResponse(resp);
    throw new Error(errMsg || "Login failed");
  }

  const json = await resp.json();

  const token = json?.token || json?.accessToken;
  if (!token) throw new Error("No token returned");

  setToken(token);

  try {
    const savedName =
      json?.user?.username ||
      json?.user?.email ||
      usernameOrEmail;

    if (savedName) setSavedUsername(savedName);
    if (json?.user) setCurrentUser(json.user);

    localStorage.setItem("token", token);
  } catch {}

  // After login: if FCM token arrived before auth was ready, save it now.
  try {
    const { flushPendingFcmToken } = await import("../../utils/initNativeApp");
    flushPendingFcmToken();
  } catch { /* ignore on web */ }

  return json;
}

/* ---------------- REGISTER ---------------- */

export async function register(payload) {
  if (!payload?.username || !payload?.password) {
    throw new Error("Username and password are required");
  }

  const url = apiUrl("/auth/register");
  console.debug("register ->", url, payload);

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errMsg = await parseErrorResponse(resp);
    throw new Error(errMsg || "Registration failed");
  }

  const json = await resp.json();

  const token = json?.token || json?.accessToken;
  if (token) setToken(token);

  try {
    const savedName =
      json?.user?.username ||
      json?.user?.email ||
      payload?.username;

    if (savedName) setSavedUsername(savedName);
    if (json?.user) setCurrentUser(json.user);
  } catch {}

  // After self-registration the app is already authenticated; save any native
  // FCM token that arrived before the token was available.
  try {
    const { flushPendingFcmToken } = await import("../../utils/initNativeApp");
    flushPendingFcmToken();
  } catch { /* ignore on web */ }

  return json;
}

/* ---------------- AUTH FETCH ---------------- */

export async function authFetch(input, init = {}) {
  const token = getToken();

  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");

  if (init.body && !(init.body instanceof FormData)) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url =
    typeof input === "string" && input.startsWith("http")
      ? input
      : apiUrl(typeof input === "string" ? input : input?.url || "");

  console.debug("authFetch ->", url, init.method || "GET");

  return fetch(url, { ...init, headers });
}
