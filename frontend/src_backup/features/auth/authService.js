// src/features/auth/authService.js
import api from "../../api";

const TOKEN_KEY = "mahima_token";
const USERNAME_KEY = "mahima_username";
const ME_KEY = "me";

/* token helpers */
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      localStorage.removeItem(TOKEN_KEY);
      delete api.defaults.headers.common["Authorization"];
    }
    window.dispatchEvent(new CustomEvent("auth:change", { detail: { token } }));
  } catch {}
}

export function saveToken(token) {
  setToken(token);
}

export function removeToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common["Authorization"];
    window.dispatchEvent(new CustomEvent("auth:change", { detail: { token: null } }));
  } catch {}
}

export const logout = removeToken;

/* username helpers */
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

/* current user helpers (used for Chat page, etc.) */
export function setCurrentUser(user) {
  try {
    localStorage.setItem(ME_KEY, JSON.stringify(user || {}));
  } catch {}
}
export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(ME_KEY) || "{}");
  } catch {
    return {};
  }
}

/* error helper */
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

/* login */
export async function login({ usernameOrEmail, password = "" }) {
  if (!usernameOrEmail) throw new Error("Username/email required");
  const url = "/api/auth/login";
  console.debug("login ->", url);

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernameOrEmail, password }),
  });

  if (!resp.ok) throw new Error(await parseErrorResponse(resp));
  const json = await resp.json();

  if (json?.token) setToken(json.token);
  try {
    const savedName = json?.user?.username || json?.user?.email || usernameOrEmail;
    if (savedName) setSavedUsername(savedName);
    if (json?.user) setCurrentUser(json.user);
    //const data = await response.json();
    localStorage.setItem('token', json.token);
  } catch {}

  return json;
}

/* register */
export async function register(payload) {
  const url = "/api/auth/register";
  console.debug("register ->", url, payload);
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(await parseErrorResponse(resp));
  const json = await resp.json();
  if (json?.token) setToken(json.token);

  try {
    const savedName = json?.user?.username || json?.user?.email || payload?.username;
    if (savedName) setSavedUsername(savedName);
    if (json?.user) setCurrentUser(json.user);
  } catch {}

  return json;
}

/* authFetch wrapper */
export async function authFetch(input, init = {}) {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData)) {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const url =
    typeof input === "string" && input.startsWith("http")
      ? input
      : input.startsWith("/")
      ? input
      : `/api/${input}`;

  console.debug("authFetch ->", url, init.method || "GET");
  return fetch(url, { ...init, headers });
}


