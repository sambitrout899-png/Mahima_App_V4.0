// src/features/auth/authService.js

import api from "../../api";

const TOKEN_KEY = "mahima_token";
const USERNAME_KEY = "mahima_username";
const ME_KEY = "me";

/* ---------------- TOKEN HELPERS ---------------- */

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem("token");
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

    window.dispatchEvent(
      new CustomEvent("auth:change", { detail: { token } })
    );
  } catch {}
}

export function removeToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];

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

  const url = "/auth/login"; // ✅ NO /api
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

  return json;
}

/* ---------------- REGISTER ---------------- */

export async function register(payload) {
  if (!payload?.username || !payload?.password) {
    throw new Error("Username and password are required");
  }

  const url = "/auth/register"; // ✅ NO /api
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
      : input.startsWith("/")
      ? input
      : `/${input}`; // ✅ this is fine

  console.debug("authFetch ->", url, init.method || "GET");

  return fetch(url, { ...init, headers });
}
