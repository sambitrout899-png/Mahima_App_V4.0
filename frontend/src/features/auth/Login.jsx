import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../utils/fetch-auth-shim";
import { API_BASE } from "../../api";
import mahimaLogo from "../../assets/mahima-logo.png"; // ✅ ADD LOGO

export default function Login() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");	
  const [showPwd, setShowPwd] = useState(false);
 const [displayName, setDisplayName] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* ---------------- LOGIN ---------------- */

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

  // ? ONLY username + password required
  if (!username || !password) {
    setError("Username and Password are required");
    return;
  }	
    setLoading(true);

    try {
      const res = await login({
  usernameOrEmail: username,
  password: password,
});	
      const token = res?.token || res?.data?.token;
      const user = res?.user || res?.data?.user;

      if (!token) throw new Error("If you are first time User - Please contact Mahima Ministry Adminstrator to Activate your Id. For All other Users - Check your User Credentials and contact Admin");

      localStorage.setItem("authToken", token);
      localStorage.setItem("mahima_user", JSON.stringify(user));

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      localStorage.setItem("mahima_token", token);

      navigate("/home", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- REGISTER ---------------- */

  async function handleRegister(e) {
    e.preventDefault();
    setError("");

 if (!displayName || !username || !phone || !password) {
  setError("Display Name, Username, Mobile Number and Password are required");
  return;
}    setLoading(true);

    try {
const payload = {
  username,
  password,
  phone,
  displayname: displayName, // ?? EXACT KEY
  role: "Member",
  joindate: new Date().toISOString(),
};

    const res = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Account creation failed");

      alert("Account created successfully! Please login.");
      setMode("login");
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- FORGOT ---------------- */

  async function handleForgot(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      alert("Password reset link sent (mock)");
      setMode("login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- UI ---------------- */

  return (
    <div style={page}>
      <div style={card}>
        
        {/* 🔥 LOGO SECTION */}
        <div style={{ marginBottom: 15 }}>
          <img src={mahimaLogo} style={{ width: 55, marginBottom: 8 }} />
          <h2 style={{ margin: 0 }}>Mahima Ministry</h2>
        </div>

        <p style={{ color: "#666", marginBottom: 20 }}>
          {mode === "login"
            ? "Welcome back 👋"
            : mode === "register"
            ? "Create your account ✨"
            : "Reset your password 🔑"}
        </p>

        {/* TABS */}
        <div style={tabRow}>
          <button
            style={mode === "login" ? activeTab : tab}
            onClick={() => setMode("login")}
          >
            Sign In
          </button>
          <button
            style={mode === "register" ? activeTab : tab}
            onClick={() => setMode("register")}
          >
            Create Account
          </button>
        </div>

        {/* FORM */}
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
  <input
    style={input}
    placeholder="Display Name"
    value={displayName}
    onChange={(e) => setDisplayName(e.target.value)}
    required
  />
)}

	{mode === "register" && (
  <input
    style={input}
    placeholder="Mobile Number"
    value={phone}
    onChange={(e) => setPhone(e.target.value)}
    required
  />
)}
          {mode !== "forgot" && (
            <div style={{ position: "relative" }}>
              <input
                style={input}
                type={showPwd ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span onClick={() => setShowPwd(!showPwd)} style={eye}>
                {showPwd ? "🙈" : "👁"}
              </span>
            </div>
          )}

          {mode === "login" && (
            <div style={row}>
              <span style={link} onClick={() => setMode("forgot")}>
                Forgot Password?
              </span>
            </div>
          )}

          {error && (
            <div style={errorBox}>
              {error}
            </div>
          )}

          <button style={button} disabled={loading}>
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

/* ---------------- STYLES ---------------- */

const page = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
};

const card = {
  width: 380,
  padding: 30,
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 15px 40px rgba(0,0,0,0.15)",
  textAlign: "center",
  transition: "0.3s",
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
};

const tab = {
  flex: 1,
  padding: 10,
  background: "#eee",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};

const input = {
  width: "100%",
  padding: 12,
  marginBottom: 12,
  borderRadius: 8,
  border: "1px solid #ddd",
  fontSize: 14,
  outline: "none",
};

const eye = {
  position: "absolute",
  right: 10,
  top: 12,
  cursor: "pointer",
};

const row = {
  display: "flex",
  justifyContent: "flex-end",
  marginBottom: 10,
};

const link = {
  color: "#2563eb",
  cursor: "pointer",
  fontSize: 14,
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
};

const errorBox = {
  background: "#fee2e2",
  color: "#b91c1c",
  padding: 10,
  borderRadius: 8,
  marginBottom: 10,
  fontSize: 14,
};
