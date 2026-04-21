// src/features/auth/ChangePasswordModal.jsx
import React, { useEffect, useState } from "react";
import { getToken, setToken } from "./authService";

export default function ChangePasswordModal({ open, onClose, presetUsername }) {
  // presetUsername is optional; used to auto-fill the username/email field
  const [usernameOrEmail, setUsernameOrEmail] = useState(presetUsername || "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // when modal opens, if a preset username was passed, populate the field
    if (open && presetUsername) {
      setUsernameOrEmail(presetUsername);
    }
    if (!open) {
      setUsernameOrEmail("");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setLoading(false);
      setMessage(null);
      setSuccess(false);
    }
  }, [open, presetUsername]);

  if (!open) return null;

  const submit = async (e) => {
    e?.preventDefault();
    setMessage(null);
    setSuccess(false);

    if (!usernameOrEmail?.trim()) {
      setMessage("Please enter your username or email.");
      return;
    }
    if (!newPw) {
      setMessage("Please provide a new password.");
      return;
    }
    if (newPw.length < 6) {
      setMessage("New password must be at least 6 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setMessage("New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      const token = getToken?.() || localStorage.getItem("mahima_token") || localStorage.getItem("token") || null;

      const payload = {
        usernameOrEmail: usernameOrEmail.trim(),
        currentPassword: currentPw || null,
        newPassword: newPw
      };

      const resp = await fetch(`${import.meta.env.VITE_API_BASE || "http://localhost:5001/api"}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (resp.ok) {
        let json = null;
        try { json = await resp.json(); } catch {}
        setSuccess(true);
        setMessage(json?.message || "Password updated successfully.");

        if (json?.token) {
          try { setToken(json.token); } catch { localStorage.setItem("mahima_token", json.token); }
          setMessage("Password updated — you're still signed in.");
        } else {
          // if backend doesn't return token, sign out
          setTimeout(() => {
            try { localStorage.removeItem("mahima_token"); localStorage.removeItem("token"); localStorage.removeItem("user"); } catch {}
            window.location.href = "/login";
          }, 1000);
        }
        return;
      }

      const txt = await resp.text().catch(() => "");
      setMessage(txt || `Error ${resp.status}`);
    } catch (err) {
      console.error("Change password error:", err);
      setMessage("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // styles (kept inline like your current pattern)
  const backdropStyle = { position: "fixed", inset: 0, zIndex: 1200, background: "linear-gradient(rgba(9,18,28,0.45), rgba(9,18,28,0.45))", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
  const panelStyle = { width: 520, maxWidth: "100%", borderRadius: 12, background: "#fff", boxShadow: "0 18px 50px rgba(6,22,46,0.35)", padding: 20, color: "#0b2a47", display: "grid", gap: 12 };
  const fieldWrap = { display: "flex", alignItems: "center", gap: 8, background: "#fbfbfb", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(11,42,71,0.06)" };
  const inputStyle = { flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 15 };
  const hintStyle = { fontSize: 13, color: "#6b6b6b" };

  return (
    <div style={backdropStyle} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <form onSubmit={submit} style={panelStyle} role="dialog" aria-modal="true" aria-label="Change password">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#fff6e3,#fff1d6)", fontSize: 22 }}>🔒</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Change password</div>
            <div style={hintStyle}>Enter username/email so we can locate your account.</div>
          </div>
        </div>

        {/* Username / Email / ID field */}
        <div>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 8 }}>Username / Email / ID</label>
          <div style={fieldWrap}>
            <span style={{ opacity: 0.9 }}>👤</span>
            <input type="text" value={usernameOrEmail} onChange={(e) => setUsernameOrEmail(e.target.value)} placeholder="Enter username, email or ID" style={inputStyle} required />
          </div>
          <div style={{ marginTop: 6, ...hintStyle }}>If this is first-time, use the username sent to you.</div>
        </div>

        {/* Current password */}
        <div>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 8 }}>Current password</label>
          <div style={fieldWrap}>
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="Enter current password (leave blank if first time)" style={inputStyle} />
          </div>
        </div>

        {/* New password */}
        <div>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 8 }}>New password</label>
          <div style={fieldWrap}>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Choose a strong password (min 6 chars)" style={inputStyle} />
          </div>
          <div style={{ marginTop: 8, ...hintStyle }}>Tip: mix letters and numbers for stronger passwords.</div>
        </div>

        {/* Confirm password */}
        <div>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 8 }}>Confirm new password</label>
          <div style={fieldWrap}>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Repeat new password" style={inputStyle} />
          </div>
        </div>

        {message && (
          <div style={{ padding: "8px 10px", borderRadius: 8, background: success ? "rgba(34,197,94,0.12)" : "rgba(220,38,38,0.06)", color: success ? "#166534" : "#991b1b", fontWeight: 700 }}>
            {message}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
          <button type="button" onClick={onClose} disabled={loading || success} style={{ background: "transparent", border: "1px solid rgba(11,42,71,0.08)", padding: "8px 12px", borderRadius: 8 }}>Cancel</button>
          <button type="submit" disabled={loading || success} style={{ display: "inline-flex", gap: 8, alignItems: "center", background: "linear-gradient(90deg,#f1c232,#f6d980)", border: "none", padding: "8px 14px", borderRadius: 8, fontWeight: 800 }}>{loading ? "Saving…" : success ? "Saved ✓" : "Save"}<span aria-hidden>{loading ? "⏳" : "💾"}</span></button>
        </div>
      </form>
    </div>
  );
}
