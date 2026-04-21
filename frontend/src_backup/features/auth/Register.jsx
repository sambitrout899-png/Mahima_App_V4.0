// src/features/auth/Register.jsx
import React, { useState } from "react";
import { register, setToken } from "./authService";

/**
 * Register form.
 * onSuccess(user) will be called when registration succeeds (optional).
 */
export default function Register({ onSuccess }) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!username || !username.trim()) {
      alert("Username is required");
      return false;
    }
    if (!password || password.length < 4) {
      alert("Password is required (min 4 chars)");
      return false;
    }
    // optional: simple email check
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      if (!window.confirm("Email looks invalid — continue anyway?")) return false;
    }
    return true;
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!validate()) return;
    setLoading(true);

    try {
      // send common camelCase payload — backend usually accepts multiple casings,
      // but authService.register may convert if needed
      const payload = {
        username: username.trim(),
        displayName: displayName?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        password: password
      };

      const data = await register(payload); // authService.register should call API_BASE + '/auth/register'
      // store token locally (authService.register might already call setToken itself;
      // calling setToken again is safe)
      if (data?.token) {
        setToken(data.token);
      }

      // notify parent if provided
      if (onSuccess) onSuccess(data?.user ?? null);
    } catch (err) {
      // show a helpful message
      //const msg = (err && (err.message || err.toString())) || "Registration failed";
	  const msg = err && (err.message || err.toString()) ? (err.message || err.toString()) : "Registration failed";
      alert("Register failed: " + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 560, display: "grid", gap: 12 }}>
      <label>
        Display name
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Full name (optional)"
          style={{ width: "100%", padding: 10, borderRadius: 8 }}
        />
      </label>

      <div style={{ display: "flex", gap: 12 }}>
        <label style={{ flex: 1 }}>
          Username *
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            style={{ width: "100%", padding: 10, borderRadius: 8 }}
          />
        </label>

        <label style={{ flex: 1 }}>
          Phone
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+911234567890"
            style={{ width: "100%", padding: 10, borderRadius: 8 }}
          />
        </label>
      </div>

      <label>
        Email
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ width: "100%", padding: 10, borderRadius: 8 }}
        />
      </label>

      <label>
        Password *
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Choose a secure password"
          style={{ width: "100%", padding: 10, borderRadius: 8 }}
        />
      </label>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <button
          type="button"
          onClick={() => {
            // clear form
            setDisplayName("");
            setUsername("");
            setEmail("");
            setPhone("");
            setPassword("");
          }}
          style={{ padding: "10px 14px", borderRadius: 8, background: "#fff", border: "1px solid #eee" }}
          disabled={loading}
        >
          Clear
        </button>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "none",
            background: "#f1c232",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </div>
    </form>
  );
}
