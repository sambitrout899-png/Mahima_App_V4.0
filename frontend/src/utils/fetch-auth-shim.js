// src/utils/fetch-auth-shim.js

const TOKEN_KEY = "mahima_token";

/* ---------------- API BASE ---------------- */
function resolveApiBase() {
  let base = "";

  try {
    if (import.meta?.env?.VITE_API_BASE) {
      base = import.meta.env.VITE_API_BASE;
    }
  } catch {}

  try {
    if (!base && typeof window !== "undefined" && window.__API_BASE__) {
      base = String(window.__API_BASE__).trim();
    }
  } catch {}

  // FINAL FALLBACK
  if (!base) {
    console.warn("⚠️ API BASE not set. Falling back to /api");
    base = "/api";
  }

  // normalize (remove trailing slash)
  base = base.toString().trim().replace(/\/+$/, "");

  return base;
}

const API_BASE = resolveApiBase();
console.log("🔥 FINAL API BASE =", API_BASE);

/* ---------------- TOKEN ---------------- */
function readToken() {
  try {
    const raw =
      localStorage.getItem("mahima_token") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") || "";

    if (!raw) return "";

    return raw.toLowerCase().startsWith("bearer ")
      ? raw.slice(7).trim()
      : raw.trim();
  } catch {
    return "";
  }
}

/* ---------------- URL BUILDER (FIXED) ---------------- */
function buildUrl(url) {
  if (!url) return url;

  // absolute URL → return as is
  if (/^https?:\/\//i.test(url)) return url;

  // ensure leading slash
  if (!url.startsWith("/")) url = "/" + url;

  // ✅ FIX: always prefix API_BASE (even for /api)
  return API_BASE + url;
}

/* ---------------- MAIN FETCH ---------------- */
export async function apiFetch(input, init = {}) {
  let url = typeof input === "string" ? input : input?.url || "";

  const finalUrl = buildUrl(url);

  const headers = new Headers(init.headers || {});
  const token = readToken();

  // ✅ Allow public APIs (login/register)
  const isPublic =
    finalUrl.includes("/login") ||
    finalUrl.includes("/register");

  // 🔴 Block protected APIs if no token
 // ? Allow public pages to load without redirect
if (!token && !isPublic) {
  console.warn("No token � allowing public access");
}  // ✅ Attach token if available
  if (token) {
    headers.set("Authorization", "Bearer " + token);
  }

  // ✅ Ensure JSON content-type for body requests
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const options = {
    ...init,
    headers,
  };

  console.log("➡️ API CALL:", options.method || "GET", finalUrl);

  let res;
  try {
    res = await fetch(finalUrl, options);
  } catch (err) {
    throw new Error("Network error. Please check your connection.");
  }

  // 🔴 Handle unauthorized (token expired)
  /*if (res.status === 401) {
    localStorage.removeItem("mahima_token");
    window.location.href = "/#/login";
    throw new Error("Session expired");
  }*/
  
if (res.status === 401) {
  console.warn("401 Unauthorized � NOT logging out automatically");
  return Promise.reject(new Error("Unauthorized"));
}

 // 🔴 Handle other errors safely
  if (!res.ok) {
    let message = "Something went wrong";
    try {
      const text = await res.text();
      message = text || message;
    } catch {}
    throw new Error(message);
  }

  // ✅ Safe JSON parsing (important fix)
  try {
    return await res.json();
  } catch {
    return null; // for empty responses
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
      text: () => Promise.resolve(JSON.stringify(data)),
      json: () => Promise.resolve(data),
    };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      statusText: "ERROR",
      data: null,
      text: () => Promise.resolve(err.message || ""),
      json: () => Promise.resolve(null),
    };
  }
}

/* ---------------- AUTH APIs ---------------- */
export function register(data) {
  return apiFetchJson("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function login(data) {
  return apiFetchJson("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
