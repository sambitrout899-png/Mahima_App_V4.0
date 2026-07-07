import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { googleLogin, login, register } from "../../utils/fetch-auth-shim";
import { API_BASE } from "../../api";
import mahimaLogo from "../../assets/mahima-logo.png";
import { initNativeApp, flushPendingFcmToken, ensurePushTokenRegistered } from "../../utils/initNativeApp";
import { registerMobilePushNotifications } from "../../utils/mobilePushNotifications";

const REMEMBER_LOGIN_KEY = "mahima_remember_login";
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

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
  const googleButtonRef = useRef(null);
  const runtimeGoogleClientId = typeof window !== "undefined" ? (window.__GOOGLE_CLIENT_ID__ || window.__GOOGLE_WEB_CLIENT_ID__ || "") : "";
  const runtimeGoogleAndroidClientId = typeof window !== "undefined" ? (window.__GOOGLE_ANDROID_CLIENT_ID__ || "") : "";
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || runtimeGoogleClientId;
  const googleAndroidClientId = import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID || runtimeGoogleAndroidClientId;
  const googleWebClientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || runtimeGoogleClientId || googleClientId;

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
  const [googleReady, setGoogleReady] = useState(false);
  const [nativeGoogleReady, setNativeGoogleReady] = useState(false);

  function persistAuthSession(token, user = null) {
    localStorage.setItem("authToken", token);
    localStorage.setItem("mahima_token", token);
    localStorage.setItem("token", token);

    if (user) {
      localStorage.setItem("mahima_user", JSON.stringify(user));
      localStorage.setItem("user", JSON.stringify(user));
    }
  }

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

  useEffect(() => {
    setGoogleReady(false);
    if (mode !== "login" || !googleWebClientId || !googleButtonRef.current || isMobileAppMode()) return;

    let cancelled = false;

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: googleWebClientId,
          callback: handleGoogleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        googleButtonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          type: "standard",
          shape: "rectangular",
          text: "signin_with",
          width: 320,
        });
        setGoogleReady(true);
      })
      .catch((err) => {
        console.warn("[login] Google sign-in script failed", err);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, googleWebClientId]);

  function loadGoogleIdentityScript() {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }

      const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  useEffect(() => {
    if (mode !== "login" || !isMobileAppMode()) {
      setNativeGoogleReady(false);
      return;
    }

    const plugins = window.Capacitor?.Plugins || {};
    setNativeGoogleReady(Boolean(plugins.GoogleAuth?.signIn || plugins.FirebaseAuthentication?.signInWithGoogle));
  }, [mode]);

  function extractGoogleIdToken(result) {
    return (
      result?.authentication?.idToken ||
      result?.credential?.idToken ||
      result?.idToken ||
      result?.serverAuthCodeIdToken ||
      result?.user?.authentication?.idToken ||
      result?.result?.credential?.idToken ||
      ""
    );
  }

  async function signInWithNativeGoogle() {
    const plugins = window.Capacitor?.Plugins || {};

    if (plugins.GoogleAuth?.initialize) {
      await plugins.GoogleAuth.initialize({
        clientId: googleWebClientId || undefined,
        serverClientId: googleWebClientId || undefined,
        androidClientId: googleAndroidClientId || undefined,
        scopes: ["profile", "email"],
        grantOfflineAccess: false,
      }).catch(() => {});
    }

    if (plugins.GoogleAuth?.signIn) {
      return plugins.GoogleAuth.signIn();
    }

    if (plugins.FirebaseAuthentication?.signInWithGoogle) {
      return plugins.FirebaseAuthentication.signInWithGoogle({
        mode: "popup",
      });
    }

    throw new Error("Native Google sign-in plugin is not installed in this app build.");
  }

  async function handleGoogleButtonClick() {
    setError("");

    if (isMobileAppMode()) {
      setLoading(true);
      try {
        const result = await signInWithNativeGoogle();
        const idToken = extractGoogleIdToken(result);
        if (!idToken) throw new Error("Google sign-in did not return an ID token from the app.");
        await handleGoogleCredential({ credential: idToken });
      } catch (err) {
        setError(err.message || "Google sign-in failed in the app.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!googleWebClientId) {
      setError("Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID in the frontend and GoogleAuth:ClientIds in the API.");
      return;
    }

    try {
      await loadGoogleIdentityScript();
      if (!window.google?.accounts?.id) throw new Error("Google Identity Services did not load.");
      window.google.accounts.id.initialize({
        client_id: googleWebClientId,
        callback: handleGoogleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      window.google.accounts.id.prompt((notification) => {
        const blocked = notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.();
        if (blocked && !googleReady) {
          setError("Google sign-in could not be displayed. Check the Google client ID and authorized JavaScript origin.");
        }
      });
    } catch (err) {
      setError(err.message || "Google sign-in could not start.");
    }
  }

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

  async function syncNativePushAfterAuth(user = null) {
    if (!isMobileAppMode()) return;
    try {
      await initNativeApp();
      await flushPendingFcmToken();
      await registerMobilePushNotifications(user);

      for (const delayMs of [1000, 3000, 7000]) {
        window.setTimeout(() => {
          ensurePushTokenRegistered()
            .then(() => registerMobilePushNotifications(user))
            .then(() => flushPendingFcmToken())
            .catch((err) => console.warn("[login] delayed native push sync failed", err));
        }, delayMs);
      }
    } catch (err) {
      console.warn("[login] native push sync failed", err);
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

      persistAuthSession(token, user);
      saveRememberedLogin(cleanUsername, cleanPassword);

      await syncNativePushAfterAuth(user);
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

      persistAuthSession(token, user);
      saveRememberedLogin(cleanUsername, password);

      await syncNativePushAfterAuth(user);
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err.message || "Account creation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleCredential(response) {
    setError("");

    if (!response?.credential) {
      setError("Google sign-in did not return a login token.");
      return;
    }

    setLoading(true);

    try {
      const res = await googleLogin({ idToken: response.credential });
      if (!res?.ok) {
        throw new Error(res?.error || "Google login failed");
      }

      const data = res.data || {};
      const token = data?.token || data?.accessToken || data?.data?.token;
      const user = data?.user || data?.data?.user;

      if (!token) {
        throw new Error("Google login did not return a Mahima token.");
      }

      persistAuthSession(token, user);
      localStorage.removeItem(REMEMBER_LOGIN_KEY);

      await syncNativePushAfterAuth(user);
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err.message || "Google login failed");
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

        {mode === "login" && googleWebClientId && !isMobileAppMode() && (
          <>
            <div ref={googleButtonRef} style={googleButtonSlot} />
            {!googleReady && (
              <button type="button" style={googleFallbackButton} disabled={loading} onClick={handleGoogleButtonClick}>
                Continue with Google
              </button>
            )}
            <div style={dividerRow}>
              <span style={dividerLine} />
              <span style={dividerText}>or</span>
              <span style={dividerLine} />
            </div>
          </>
        )}

        {mode === "login" && (!googleWebClientId || isMobileAppMode()) && (
          <>
            <button
              type="button"
              style={{
                ...googleFallbackButton,
                opacity: (!googleWebClientId && !nativeGoogleReady) ? 0.72 : 1,
                cursor: (!googleWebClientId && !nativeGoogleReady) ? "not-allowed" : "pointer",
              }}
              disabled={loading || (!googleWebClientId && !nativeGoogleReady)}
              title={isMobileAppMode() && !nativeGoogleReady ? "Native Google sign-in plugin is not installed in this APK." : "Continue with Google"}
              onClick={handleGoogleButtonClick}
            >
              {isMobileAppMode()
                ? nativeGoogleReady ? "Continue with Google" : "Google sign-in needs app plugin"
                : googleWebClientId ? "Continue with Google" : "Google sign-in not configured"}
            </button>
            <div style={dividerRow}>
              <span style={dividerLine} />
              <span style={dividerText}>or</span>
              <span style={dividerLine} />
            </div>
          </>
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
  background: "linear-gradient(180deg, #f8fafc 0%, #f6f8fb 52%, #eef4f1 100%)",
  padding: 16,
  boxSizing: "border-box",
};

const card = {
  width: "100%",
  maxWidth: 380,
  padding: 30,
  borderRadius: 12,
  background: "#fff",
  border: "1px solid #dfe7ef",
  boxShadow: "0 24px 54px rgba(15,23,42,0.12)",
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
  color: "#617086",
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
  background: "linear-gradient(180deg, #047857, #065f46)",
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
  background: "#fff",
  color: "#102033",
  border: "1px solid #dfe7ef",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: 16,
};

const googleButtonSlot = {
  display: "flex",
  justifyContent: "center",
  minHeight: 44,
  marginBottom: 14,
};

const googleFallbackButton = {
  width: "100%",
  minHeight: 44,
  marginBottom: 14,
  border: "1px solid #dfe7ef",
  borderRadius: 8,
  background: "#fff",
  color: "#102033",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 15,
};

const dividerRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  margin: "0 0 14px",
};

const dividerLine = {
  flex: 1,
  height: 1,
  background: "#dfe7ef",
};

const dividerText = {
  color: "#617086",
  fontSize: 13,
  fontWeight: 700,
  textTransform: "uppercase",
};

const input = {
  width: "100%",
  padding: 12,
  marginBottom: 12,
  borderRadius: 8,
  border: "1px solid #dfe7ef",
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
  color: "#047857",
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
  border: "1px solid rgba(4,120,87,0.22)",
  borderRadius: 10,
  background: "#ecfdf5",
  color: "#065f46",
  fontWeight: 700,
  fontSize: 14,
};

const rememberCheck = {
  width: 18,
  height: 18,
  accentColor: "#047857",
  flex: "0 0 auto",
};

const rememberHint = {
  display: "block",
  marginTop: 2,
  color: "#047857",
  fontWeight: 500,
  fontSize: 11,
};

const linkButton = {
  color: "#047857",
  cursor: "pointer",
  fontSize: 14,
  border: "none",
  background: "transparent",
  padding: 0,
};

const button = {
  width: "100%",
  padding: 12,
  background: "linear-gradient(180deg, #047857, #065f46)",
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
