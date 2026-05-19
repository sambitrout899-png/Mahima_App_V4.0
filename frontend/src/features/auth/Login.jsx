import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../../utils/fetch-auth-shim";
import { API_BASE } from "../../api";
import mahimaLogo from "../../assets/mahima-logo.png";

const REMEMBER_LOGIN_KEY = "mahima_remember_login";

function isMobileAppMode() {
  try {
    return (
      import.meta.env.MODE === "mobile" ||
      Boolean(window.Capacitor?.isNativePlatform?.())
    );
  } catch {
    return false;
  }
}

function readRememberedLogin() {
  try {
    const raw = localStorage.getItem(REMEMBER_LOGIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Login() {
  const navigate = useNavigate();
  const autoLoginStarted = useRef(false);

  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => isMobileAppMode() || Boolean(readRememberedLogin()));
  const [showPwd, setShowPwd] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState("");

  useEffect(() => {
    if (getStoredToken()) {
      navigate("/home", { replace: true });
      return;
    }

    const remembered = readRememberedLogin();
    if (!remembered?.username || !remembered?.password) return;

    setUsername(remembered.username);
    setPassword(remembered.password);
    setRememberMe(true);

    if (!isMobileAppMode() || autoLoginStarted.current) return;
    autoLoginStarted.current = true;
    performLogin(remembered.username, remembered.password, true);
  }, []);

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setPassword("");
    if (nextMode !== "login") setForgotSent("");
  }

  function getStoredToken() {
    return (
      localStorage.getItem("authToken") ||
      localStorage.getItem("mahima_token") ||
      localStorage.getItem("token")
    );
  }

  async function readError(res) {
    const text = await res.text().catch(() => "");

    if (text) {
      try {
        const json = JSON.parse(text);
        return json?.message || json?.error || text;
      } catch {
        return text;
      }
    }

    if (res.status === 401) {
      return "Account creation is blocked because this API is secured. Ask admin to enable public registration or create the user from an authenticated admin account.";
    }

    if (res.status === 404) {
      return "Registration API not found. Please check API_BASE and backend route.";
    }

    return "Account creation failed";
  }

  function saveRememberedLogin(cleanUsername, cleanPassword) {
    try {
      if (rememberMe) {
        localStorage.setItem(
          REMEMBER_LOGIN_KEY,
          JSON.stringify({
            username: cleanUsername,
            password: cleanPassword,
            savedAt: new Date().toISOString(),
          })
        );
      } else {
        localStorage.removeItem(REMEMBER_LOGIN_KEY);
      }
    } catch {
      // ignore storage failures
    }
  }

  function updateRememberMe(checked) {
    setRememberMe(checked);
    if (!checked) {
      try {
        localStorage.removeItem(REMEMBER_LOGIN_KEY);
      } catch {
        // ignore storage failures
      }
    }
  }

  async function performLogin(cleanUsername, cleanPassword, silent = false) {
    setError("");

    if (!cleanUsername || !cleanPassword) {
      setError("Username and Password are required");
      return;
    }

    setLoading(true);

    try {
      const res = await login({
        usernameOrEmail: cleanUsername,
        username: cleanUsername,
        password: cleanPassword,
      });

      const token = res?.token || res?.data?.token;
      const user = res?.user || res?.data?.user;

      if (!token) {
        throw new Error(
          "If you are a first time user, please contact Mahima Ministry Administrator to activate your ID. For all other users, check your credentials and contact admin."
        );
      }

      localStorage.setItem("authToken", token);
      localStorage.setItem("mahima_token", token);
      localStorage.setItem("token", token);
      saveRememberedLogin(cleanUsername, cleanPassword);

      if (user) {
        localStorage.setItem("mahima_user", JSON.stringify(user));
        localStorage.setItem("user", JSON.stringify(user));
      }

      navigate("/home", { replace: true });
    } catch (err) {
      setError(
        silent
          ? "Saved login expired. Please sign in once."
          : err.message || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    await performLogin(username.trim(), password, false);
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");

    const cleanUsername = username.trim();
    const cleanDisplayName = displayName.trim();
    const cleanPhone = phone.trim();

    if (!cleanDisplayName || !cleanUsername || !cleanPhone || !password) {
      setError("Display Name, Username, Mobile Number and Password are required");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        username: cleanUsername,
        password,
        phone: cleanPhone,
        displayName: cleanDisplayName,
      };

      const res = await register(payload);
      if (!res?.ok) {
        throw new Error(res?.error || "Account creation failed");
      }

      const data = res.data || {};
      const token = data?.token || data?.accessToken;
      const user = data?.user || data?.data?.user;

      if (!token) {
        await performLogin(cleanUsername, password, false);
        return;
      }

      localStorage.setItem("authToken", token);
      localStorage.setItem("mahima_token", token);
      localStorage.setItem("token", token);
      saveRememberedLogin(cleanUsername, password);

      if (user) {
        localStorage.setItem("mahima_user", JSON.stringify(user));
        localStorage.setItem("user", JSON.stringify(user));
      }

      navigate("/home", { replace: true });
    } catch (err) {
      setError(err.message || "Account creation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Username / Email is required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail: username.trim() }),
      });
      // The endpoint deliberately returns 200 + a generic message regardless
      // of whether the account exists, so we don't leak account enumeration.
      let msg = "If an account exists for that address, a reset link has been sent.";
      try {
        const json = await res.json();
        if (json?.message) msg = json.message;
      } catch { /* ignore — response body may be empty */ }

      // surface the generic confirmation inline; switch back to login.
      setForgotSent(msg);
      setMode("login");
    } catch (err) {
      setError(err.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={page}>
      <div style={card}>
        <div style={logoSection}>
          <img src={mahimaLogo} alt="Mahima Ministry" style={logo} />
          <h2 style={title}>Mahima Ministry</h2>
        </div>

        <p style={subtitle}>
          {mode === "login"
            ? "Welcome back"
            : mode === "register"
            ? "Create your account"
            : "Reset your password"}
        </p>

        {mode !== "forgot" && (
          <div style={tabRow}>
            <button
              type="button"
              style={mode === "login" ? activeTab : tab}
              onClick={() => switchMode("login")}
            >
              Sign In
            </button>

            <button
              type="button"
              style={mode === "register" ? activeTab : tab}
              onClick={() => switchMode("register")}
            >
              Create Account
            </button>
          </div>
        )}

        <form
          onSubmit={
            mode === "login"
              ? handleLogin
              : mode === "register"
              ? handleRegister
              : handleForgot
          }
        >
          <input
            style={input}
            placeholder="Username / Email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          {mode === "register" && (
            <>
              <input
                style={input}
                placeholder="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />

              <input
                style={input}
                placeholder="Mobile Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </>
          )}

          {mode !== "forgot" && (
            <div style={passwordWrap}>
              <input
                style={{ ...input, paddingRight: 56 }}
                type={showPwd ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={eyeButton}
              >
                {showPwd ? "Hide" : "Show"}
              </button>
            </div>
          )}

          {mode === "login" && (
            <label style={rememberRow}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => updateRememberMe(e.target.checked)}
                style={rememberCheck}
              />
              <span>
                Remember me on this app
                <small style={rememberHint}>Open next time without typing again</small>
              </span>
            </label>
          )}

          {mode === "login" && (
            <div style={row}>
              <button
                type="button"
                style={linkButton}
                onClick={() => switchMode("forgot")}
              >
                Forgot Password?
              </button>
            </div>
          )}

          {mode === "forgot" && (
            <div style={row}>
              <button
                type="button"
                style={linkButton}
                onClick={() => switchMode("login")}
              >
                Back to Login
              </button>
            </div>
          )}

          {forgotSent && mode === "login" && (
            <div style={successBox}>{forgotSent}</div>
          )}
          {error && <div style={errorBox}>{error}</div>}

          <button type="submit" style={button} disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login"
              : mode === "register"
              ? "Create Account"
              : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
  padding: 16,
  boxSizing: "border-box",
};

const card = {
  width: "100%",
  maxWidth: 380,
  padding: 30,
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 15px 40px rgba(0,0,0,0.15)",
  textAlign: "center",
  boxSizing: "border-box",
};

const logoSection = {
  marginBottom: 15,
};

const logo = {
  width: 55,
  marginBottom: 8,
};

const title = {
  margin: 0,
  fontSize: 26,
  fontWeight: 600,
};

const subtitle = {
  color: "#666",
  marginBottom: 20,
  fontSize: 18,
};

const tabRow = {
  display: "flex",
  marginBottom: 20,
  gap: 8,
};

const activeTab = {
  flex: 1,
  padding: 10,
  background: "#f59e0b",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: 16,
};

const tab = {
  flex: 1,
  padding: 10,
  background: "#eee",
  color: "#111",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: 16,
};

const input = {
  width: "100%",
  padding: 12,
  marginBottom: 12,
  borderRadius: 8,
  border: "1px solid #ddd",
  fontSize: 16,
  outline: "none",
  boxSizing: "border-box",
};

const passwordWrap = {
  position: "relative",
};

const eyeButton = {
  position: "absolute",
  right: 8,
  top: 8,
  height: 32,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 13,
  color: "#2563eb",
};

const row = {
  display: "flex",
  justifyContent: "flex-end",
  marginBottom: 10,
};

const rememberRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  textAlign: "left",
  margin: "0 0 12px",
  padding: "10px 12px",
  border: "1px solid #fde68a",
  borderRadius: 10,
  background: "#fffbeb",
  color: "#78350f",
  fontWeight: 700,
  fontSize: 14,
};

const rememberCheck = {
  width: 18,
  height: 18,
  accentColor: "#f59e0b",
  flex: "0 0 auto",
};

const rememberHint = {
  display: "block",
  marginTop: 2,
  color: "#92400e",
  fontWeight: 500,
  fontSize: 11,
};

const linkButton = {
  color: "#2563eb",
  cursor: "pointer",
  fontSize: 14,
  border: "none",
  background: "transparent",
  padding: 0,
};

const button = {
  width: "100%",
  padding: 12,
  background: "#f59e0b",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: 18,
};

const errorBox = {
  background: "#fee2e2",
  color: "#b91c1c",
  padding: 10,
  borderRadius: 8,
  marginBottom: 10,
  fontSize: 14,
};

const successBox = {
  background: "#ecfdf5",
  color: "#047857",
  border: "1px solid #a7f3d0",
  padding: 10,
  borderRadius: 8,
  marginBottom: 10,
  fontSize: 13,
  lineHeight: 1.5,
};
