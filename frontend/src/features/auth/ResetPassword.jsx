import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE } from "../../api";
import mahimaLogo from "../../assets/mahima-logo.png";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token") || "", [params]);

  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!token) setError("This link is missing its reset token. Please request a new one.");
  }, [token]);

  const strength = useMemo(() => calcStrength(newPwd), [newPwd]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!token) return;
    if (!newPwd || newPwd.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPwd !== confirmPwd) { setError("Passwords don't match."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: newPwd }),
      });
      if (!res.ok) {
        let msg = "Reset failed. The link may be invalid or expired.";
        try { const j = await res.json(); if (j?.message) msg = j.message; } catch {}
        setError(msg); setLoading(false); return;
      }
      setSuccess("Your password has been updated. Redirecting to sign in...");
      setTimeout(() => navigate("/login", { replace: true }), 1800);
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoWrap}>
          <img src={mahimaLogo} alt="Mahima" style={s.logo} />
          <div style={s.brand}>Mahima Ministries</div>
        </div>
        <h1 style={s.title}>Choose a new password</h1>
        <p style={s.subtitle}>Pick something memorable but hard to guess. At least 6 characters.</p>

        {success ? (
          <div style={s.successCard}>
            <div style={s.successIcon}>✓</div>
            <div>
              <div style={s.successTitle}>Password updated</div>
              <div style={s.successText}>{success}</div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={s.form}>
            <label style={s.label}>New password</label>
            <div style={s.pwdWrap}>
              <input type={showPwd ? "text" : "password"} value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)} placeholder="Enter a new password"
                autoFocus style={s.input} disabled={loading || !token} />
              <button type="button" onClick={() => setShowPwd(v => !v)} style={s.eye}>
                {showPwd ? "Hide" : "Show"}
              </button>
            </div>
            <StrengthMeter strength={strength} />
            <label style={{ ...s.label, marginTop: 16 }}>Confirm password</label>
            <input type={showPwd ? "text" : "password"} value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)} placeholder="Re-enter the new password"
              style={s.input} disabled={loading || !token} />
            {error && <div style={s.errorBox}>{error}</div>}
            <button type="submit" disabled={loading || !token}
              style={{ ...s.button, opacity: loading || !token ? 0.6 : 1 }}>
              {loading ? "Updating..." : "Update password"}
            </button>
            <Link to="/login" style={s.backLink}>← Back to sign in</Link>
          </form>
        )}
      </div>
    </div>
  );
}

function calcStrength(pwd) {
  if (!pwd) return { score: 0, label: "" };
  let score = 0;
  if (pwd.length >= 6)  score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong", "Excellent"];
  return { score: Math.min(score, 5), label: labels[Math.min(score, 5)] };
}

function StrengthMeter({ strength }) {
  const colors = ["#e2e8f0", "#f87171", "#fb923c", "#facc15", "#34d399", "#10b981"];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 999,
            background: i <= strength.score ? colors[strength.score] : "#e2e8f0",
            transition: "background 200ms",
          }} />
        ))}
      </div>
      {strength.label && <div style={{ marginTop: 6, fontSize: 11, color: "#64748b" }}>{strength.label}</div>}
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    padding: 16, background: "linear-gradient(135deg,#eef2ff,#faf5ff,#fdf2f8)",
    fontFamily: "-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif" },
  card: { width: "100%", maxWidth: 440, background: "#fff", borderRadius: 24,
    boxShadow: "0 10px 40px rgba(15,23,42,0.10)", padding: 32, border: "1px solid rgba(255,255,255,0.6)" },
  logoWrap: { display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 18 },
  logo: { width: 40, height: 40, borderRadius: 10 },
  brand: { fontSize: 15, fontWeight: 700, color: "#0f172a" },
  title: { margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#0f172a", textAlign: "center" },
  subtitle: { margin: "0 0 22px", fontSize: 13, color: "#64748b", textAlign: "center", lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column" },
  label: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6, color: "#475569", marginBottom: 6 },
  pwdWrap: { position: "relative" },
  input: { width: "100%", padding: "11px 14px", borderRadius: 12, border: "1px solid #e2e8f0",
    fontSize: 14, background: "#f8fafc", outline: "none", boxSizing: "border-box" },
  eye: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
    border: "none", background: "transparent", color: "#6366f1",
    fontSize: 12, fontWeight: 600, cursor: "pointer" },
  errorBox: { marginTop: 14, padding: 10, background: "#fee2e2", color: "#b91c1c", borderRadius: 10, fontSize: 13 },
  button: { marginTop: 20, padding: "12px 18px", borderRadius: 999, border: "none",
    background: "linear-gradient(135deg,#6366f1,#8b5cf6,#d946ef)", color: "#fff",
    fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 6px 18px rgba(99,102,241,0.35)" },
  backLink: { marginTop: 14, textAlign: "center", fontSize: 12, color: "#6366f1", textDecoration: "none", fontWeight: 600 },
  successCard: { display: "flex", alignItems: "center", gap: 14, padding: 16,
    background: "linear-gradient(135deg,#ecfdf5,#d1fae5)", border: "1px solid #a7f3d0", borderRadius: 16, color: "#065f46" },
  successIcon: { width: 36, height: 36, borderRadius: 999, background: "#10b981", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, flexShrink: 0 },
  successTitle: { fontWeight: 700, fontSize: 14, marginBottom: 2 },
  successText:  { fontSize: 12.5, color: "#047857" },
};
