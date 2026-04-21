// src/features/auth/Login.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { register as authRegister, setToken as authSetToken } from "./authService";
import ChangePasswordModal from "./ChangePasswordModal";

/** Resolve API base (supports window override, Vite, CRA, process) */
const API_BASE =
  (typeof window !== "undefined" && window.__API_BASE__) ||
  (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) ||
  process.env.REACT_APP_API_BASE ||
  process.env.VITE_API_BASE ||
  "";

/** Best-effort token setter with remember support & fallback storage */
function persistToken(token, remember) {
  try {
    if (typeof authSetToken === "function") {
      authSetToken(token, remember);
    }
  } catch {
    /* ignore */
  }
  try {
    if (token) {
      sessionStorage.setItem("auth_token", token);
      if (remember) localStorage.setItem("auth_token", token);
      else localStorage.removeItem("auth_token");
      window.__AUTH_TOKEN__ = token;
    } else {
      sessionStorage.removeItem("auth_token");
      localStorage.removeItem("auth_token");
      window.__AUTH_TOKEN__ = null;
    }
  } catch {
    /* storage disabled – ignore */
  }
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [debugError, setDebugError] = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Sign-in fields
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");

  // Sign-up fields
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  async function doSignIn(e) {
    e?.preventDefault?.();
    setError("");
    setDebugError("");
    const id = (usernameOrEmail || "").trim();
    const pw = password || "";
    if (!id || !pw) return setError("Please enter username/email and password.");

    setLoading(true);
    try {
      const base = API_BASE ? API_BASE.replace(/\/$/, "") : "";
      const url = `${base || ""}/auth/login`.replace(/\/{2,}/g, "/").replace(":/", "://");

      const payload = {
        usernameOrEmail: id,
        UsernameOrEmail: id,
        emailOrUsername: id,
        username: id,
        email: id,
        password: pw,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "omit",
        mode: "cors",
        body: JSON.stringify(payload),
      });

      const ct = res.headers.get("content-type") || "";
      const text = await res.text();

      if (!res.ok) {
        let msg = `Login failed (${res.status})`;
        try {
          const j = ct.includes("json") ? JSON.parse(text) : null;
          msg = j?.message || j?.error || msg;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      let json = null;
      try {
        json = ct.includes("json") ? JSON.parse(text) : null;
      } catch {
        setDebugError(
          `Expected JSON but got (${res.status} ${res.statusText}).\n\n${
            text?.slice(0, 4096) || "(empty)"
          }`
        );
        throw new Error("Server returned non-JSON response.");
      }

      const token =
        json?.token ||
        json?.access_token ||
        json?.accessToken ||
        json?.jwt ||
        json?.data?.token ||
        json?.result?.token ||
        null;

      if (!token) {
        setDebugError(JSON.stringify(json, null, 2)?.slice(0, 4000));
        throw new Error("Login succeeded but no token was returned.");
      }

      persistToken(token, !!remember);
      const from = location.state?.from || "/home";
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.message || "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  async function doSignUp(e) {
    e?.preventDefault?.();
    setError("");
    setDebugError("");
    if (!username || !signupPassword) return setError("Please pick a username and password.");
    setLoading(true);
    try {
      const payload = {
        username: username.trim(),
        displayName: (displayName || username).trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        password: signupPassword,
      };
      await authRegister(payload);
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err?.message || "Sign up failed.");
    } finally {
      setLoading(false);
    }
  }

  /** --- UI (mobile-first) --- */
  return (
    <>
      <div style={page}>
        <div style={card}>
          <div style={cardBody}>
            {/* Logo + header */}
            <div style={headerRow}>
              <div style={logoBlock}>
                <div style={logoCircle}>
                  {/* Place file at public/mahima-logo.png */}
                  <img
                    src="/mahima-logo.png"
                    alt="Mahima Ministry"
                    style={logoImg}
                  />
                </div>
                <div style={{ textAlign: "center", marginTop: 8 }}>
                  <div style={titleText}>Mahima Ministry</div>
                  <div style={subtitleText}>Member portal</div>
                </div>
              </div>

              <div style={modeToggleWrap}>
                {mode === "signin" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError("");
                      setDebugError("");
                    }}
                    style={modeBtn}
                  >
                    New here? <span style={{ fontWeight: 700 }}>Create account</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setError("");
                      setDebugError("");
                    }}
                    style={modeBtn}
                  >
                    Have an account? <span style={{ fontWeight: 700 }}>Sign in</span>
                  </button>
                )}
              </div>
            </div>

            <h2 style={sectionTitle}>
              {mode === "signin" ? "Welcome back" : "Create an account"}
            </h2>
            <p style={sectionSub}>
              {mode === "signin"
                ? "Sign in to access prayer registrations, tasks, and admin tools."
                : "Register to join the ministry portal — receive notifications and manage your tasks."}
            </p>

            {/* Debug API base */}
            <div style={debugBox}>
              <div style={{ fontSize: 11, color: "#475467", fontWeight: 700, marginBottom: 4 }}>
                DEBUG API BASE:
              </div>
              <div style={{ fontSize: 12, color: "#344054", overflowWrap: "anywhere" }}>
                {API_BASE || "(empty) — using relative /auth/login"}
              </div>
            </div>

            <form
              onSubmit={mode === "signin" ? doSignIn : doSignUp}
              style={{ display: "grid", gap: 10, marginTop: 4 }}
            >
              {mode === "signin" ? (
                <>
                  <label style={label}>
                    <span>Username or email</span>
                    <input
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      placeholder="you@example.com or admin"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      style={input}
                    />
                  </label>

                  <label style={label}>
                    <span>Password</span>
                    <div style={{ position: "relative" }}>
                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        type={showPassword ? "text" : "password"}
                        style={input}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        style={eyeBtn}
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? "👁️" : "👁️‍🗨️"}
                      </button>
                    </div>
                  </label>

                  <div style={row}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: "#344054",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                      />
                      <span style={{ fontSize: 12 }}>Remember me</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      style={linkBtn}
                    >
                      Forgot password?
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <label style={label}>
                      <span>Display name</span>
                      <input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Full name (optional)"
                        style={input}
                      />
                    </label>
                    <label style={label}>
                      <span>Username</span>
                      <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="choose a username"
                        style={input}
                      />
                    </label>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <label style={label}>
                      <span>Email</span>
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email (optional)"
                        style={input}
                      />
                    </label>
                    <label style={label}>
                      <span>Phone</span>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 12345 67890"
                        style={input}
                      />
                    </label>
                  </div>

                  <label style={label}>
                    <span>Password</span>
                    <input
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Choose a password"
                      type="password"
                      style={input}
                    />
                  </label>
                </>
              )}

              {error && (
                <div style={{ color: "#b00020", fontWeight: 600, fontSize: 13, paddingTop: 2 }}>
                  {error}
                </div>
              )}

              {debugError && (
                <pre
                  style={{
                    color: "#b00020",
                    background: "#fff6f6",
                    padding: 8,
                    borderRadius: 8,
                    whiteSpace: "pre-wrap",
                    maxHeight: 220,
                    overflow: "auto",
                    fontSize: 11,
                  }}
                >
                  {debugError}
                </pre>
              )}

              <button type="submit" disabled={loading} style={primaryBtn}>
                {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsernameOrEmail("");
                  setPassword("");
                  setDisplayName("");
                  setUsername("");
                  setEmail("");
                  setPhone("");
                  setSignupPassword("");
                  setError("");
                  setDebugError("");
                }}
                style={secondaryBtn}
                disabled={loading}
              >
                Clear
              </button>
            </form>
          </div>

          {/* Info strip (compact, mobile-friendly) */}
          <div style={rightPanel}>
            <h3 style={{ margin: "0 0 6px", fontSize: 14 }}>Why sign in?</h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.7 }}>
              <li>Register quickly for prayer ministry</li>
              <li>Receive SMS & WhatsApp updates</li>
              <li>Manage serving teams & tasks</li>
              <li>Access announcements & resources</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Forgot password modal */}
      <ChangePasswordModal
        open={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        presetUsername={usernameOrEmail}
      />
    </>
  );
}

/** --- inline styles --- */

const page = {
  minHeight: "100dvh",
  display: "grid",
  placeItems: "center",
  padding: "16px 12px",
  background: "radial-gradient(1200px 600px at 10% -10%, #ffe7ea 0%, #fff 60%)",
  fontFamily: "Inter, Segoe UI, Roboto, Arial",
};

const card = {
  width: "100%",
  maxWidth: 460,
  borderRadius: 18,
  overflow: "hidden",
  boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
  background: "#ffffff",
  border: "1px solid rgba(148,163,184,0.25)",
  display: "flex",
  flexDirection: "column",
};

const cardBody = {
  padding: "18px 16px 16px",
};

const headerRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 8,
};

const logoBlock = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  flex: 1,
};

const logoCircle = {
  width: 70,
  height: 70,
  borderRadius: "50%",
  background: "radial-gradient(circle at 30% 0%, #fff7e0 0, #fda93b 40%, #c47516 100%)",
  display: "grid",
  placeItems: "center",
  boxShadow: "0 10px 24px rgba(234,179,8,0.35)",
  overflow: "hidden",
};

const logoImg = {
  width: "90%",
  height: "90%",
  objectFit: "contain",
};

const titleText = {
  fontSize: 18,
  fontWeight: 800,
  color: "#0f172a",
  letterSpacing: "0.03em",
};

const subtitleText = {
  fontSize: 11,
  color: "#64748b",
};

const modeToggleWrap = {
  marginLeft: "auto",
  marginTop: -24,
};

const modeBtn = {
  borderRadius: 999,
  border: "1px solid #dbeafe",
  padding: "6px 10px",
  fontSize: 11,
  background: "rgba(239,246,255,0.9)",
  color: "#1d4ed8",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const sectionTitle = {
  margin: "4px 0 2px",
  fontSize: 16,
  fontWeight: 700,
  color: "#0f172a",
};

const sectionSub = {
  color: "#475467",
  margin: 0,
  fontSize: 12,
};

const input = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid #D0D5DD",
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  transition: "box-shadow .15s ease, border-color .15s ease",
};

const label = {
  display: "block",
  fontSize: 12,
  color: "#344054",
  fontWeight: 600,
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const linkBtn = {
  background: "transparent",
  border: "none",
  color: "#1d4ed8",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 12,
};

const eyeBtn = {
  position: "absolute",
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 16,
};

const primaryBtn = {
  width: "100%",
  marginTop: 6,
  border: "none",
  cursor: "pointer",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 15,
  fontWeight: 800,
  background: "linear-gradient(#ffd257, #ffab1b)",
  color: "#222",
  boxShadow: "0 10px 20px rgba(255,171,27,0.18)",
};

const secondaryBtn = {
  width: "100%",
  marginTop: 4,
  borderRadius: 12,
  padding: "10px 14px",
  background: "#f2f4f7",
  border: "1px solid #e5e7eb",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  color: "#111827",
};

const debugBox = {
  background: "#f4f6ff",
  borderRadius: 10,
  padding: 10,
  margin: "8px 0 12px",
};

const rightPanel = {
  padding: "10px 14px 12px",
  background: "linear-gradient(180deg,#0b1930,#102745)",
  color: "white",
  width: "100%",
  borderTop: "1px solid rgba(255,255,255,0.12)",
};
