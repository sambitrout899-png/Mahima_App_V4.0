// src/pages/BaptismsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { getToken as authGetToken } from "../features/auth/authService";
import { API_BASE as ROOT_API_BASE } from "../api";

const API_BASE = `${ROOT_API_BASE}/baptisms`;

const statusTabs = [
  { key: "Pending", label: "Pending", tone: "#2563eb" },
  { key: "ChurchVerified", label: "Church Verified", tone: "#0f766e" },
  { key: "AwaitingChurchVerification", label: "Awaiting Verification", tone: "#c2410c" },
  { key: "ReadyForToken", label: "Ready For Token", tone: "#7c3aed" },
  { key: "TokenGenerated", label: "Token Generated", tone: "#0891b2" },
  { key: "Completed", label: "Completed", tone: "#16a34a" },
];

const emptyForm = {
  fullName: "",
  fatherName: "",
  motherName: "",
  dateOfBirth: "",
  contactNumber: "",
  email: "",
  address: "",
  preferredDate: "",
  preferredService: "",
};

function display(value) {
  return value || "-";
}

function arrayFrom(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.records)) return data.records;
  return [];
}

function getStatusMeta(status) {
  const map = {
    Pending: { bg: "#dbeafe", color: "#1d4ed8", label: "Pending" },
    ChurchVerified: { bg: "#dcfce7", color: "#166534", label: "Church Verified" },
    AwaitingChurchVerification: {
      bg: "#ffedd5",
      color: "#c2410c",
      label: "Awaiting Verification",
    },
    ReadyForToken: { bg: "#ede9fe", color: "#6d28d9", label: "Ready For Token" },
    TokenGenerated: { bg: "#cffafe", color: "#0e7490", label: "Token Generated" },
    Completed: { bg: "#dcfce7", color: "#15803d", label: "Completed" },
  };

  return map[status] || { bg: "#f1f5f9", color: "#334155", label: status || "-" };
}

export default function BaptismsPage() {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const stats = useMemo(() => {
    return {
      visible: requests.length,
      verified: requests.filter((r) => r.churchVerified).length,
      consent: requests.filter((r) => r.consentSigned).length,
      token: requests.filter((r) => r.token).length,
    };
  }, [requests]);

  function authHeaders() {
    const token = authGetToken ? authGetToken() : localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function loadRequests() {
    try {
      setLoading(true);
      setError("");

      const res = await axios.get(API_BASE, {
        params: statusFilter ? { status: statusFilter } : {},
        headers: authHeaders(),
      });

      setRequests(arrayFrom(res.data));
    } catch (err) {
      console.error("Error loading baptism requests", err);
      setError("Failed to load baptism requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCreate(e) {
    e.preventDefault();

    if (!form.fullName) {
      setError("Full name is required.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = {
      fullName: form.fullName,
      fatherName: form.fatherName || null,
      motherName: form.motherName || null,
      dateOfBirth: form.dateOfBirth || null,
      contactNumber: form.contactNumber || null,
      email: form.email || null,
      address: form.address || null,
      preferredDate: form.preferredDate || null,
      preferredService: form.preferredService || null,
    };

    try {
      await axios.post(API_BASE, payload, { headers: authHeaders() });
      setForm(emptyForm);
      setCreating(false);
      setStatusFilter("Pending");
      await loadRequests();
    } catch (err) {
      console.error("Error creating baptism request", err);
      setError("Failed to create baptism request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function withActionLoading(id, fn) {
    setActionLoadingId(id);
    setError("");

    try {
      await fn();
      await loadRequests();
    } catch (err) {
      console.error("Action failed", err);
      const msg =
        err?.response?.data ||
        err?.message ||
        "Action failed. Please try again.";

      setError(typeof msg === "string" ? msg : "Action failed.");
    } finally {
      setActionLoadingId(null);
    }
  }

  const handleVerifyChurch = (id) =>
    withActionLoading(id, () =>
      axios.post(`${API_BASE}/${id}/verify-church`, null, {
        headers: authHeaders(),
      })
    );

  const handleMarkConsent = (id) =>
    withActionLoading(id, () =>
      axios.post(`${API_BASE}/${id}/sign-consent`, null, {
        headers: authHeaders(),
      })
    );

  const handleGenerateToken = (id) =>
    withActionLoading(id, () =>
      axios.post(`${API_BASE}/${id}/generate-token`, null, {
        headers: authHeaders(),
      })
    );

  const handleComplete = (id) =>
    withActionLoading(id, () =>
      axios.put(
        `${API_BASE}/${id}/complete`,
        {},
        {
          headers: {
            ...authHeaders(),
            "Content-Type": "application/json",
          },
        }
      )
    );

  return (
    <div className="ministry-workflow-page baptism-workflow-page" style={styles.page}>
      <div style={styles.hero}>
        <div>
          <div style={styles.kicker}>Baptism Ministry</div>
          <h1 style={styles.title}>Baptism Registrations</h1>
          <p style={styles.subtitle}>
            Manage baptism requests, church verification, consent, token generation,
            certificates, and completion from one pastoral workflow.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreating((value) => !value)}
          style={styles.primaryButton}
        >
          {creating ? "Close Form" : "+ New Baptism Request"}
        </button>
      </div>

      <div style={styles.statsGrid}>
        <StatCard label="Visible" value={stats.visible} hint="Current status records" />
        <StatCard label="Church Verified" value={stats.verified} hint="Verified in this view" />
        <StatCard label="Consent Signed" value={stats.consent} hint="Consent completed" />
        <StatCard label="Tokens" value={stats.token} hint="Issued tokens" />
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {creating && (
        <div style={styles.formCard}>
          <div style={styles.formHeader}>
            <div>
              <h2 style={styles.formTitle}>New Baptism Request</h2>
              <p style={styles.formSub}>
                Capture candidate details and preferred baptism service.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreate} style={styles.formGrid}>
            <TextField
              label="Full Name"
              name="fullName"
              value={form.fullName}
              onChange={handleFormChange}
              required
            />

            <TextField
              label="Father's Name"
              name="fatherName"
              value={form.fatherName}
              onChange={handleFormChange}
            />

            <TextField
              label="Mother's Name"
              name="motherName"
              value={form.motherName}
              onChange={handleFormChange}
            />

            <TextField
              label="Date of Birth"
              type="date"
              name="dateOfBirth"
              value={form.dateOfBirth}
              onChange={handleFormChange}
            />

            <TextField
              label="Contact Number"
              type="tel"
              name="contactNumber"
              value={form.contactNumber}
              onChange={handleFormChange}
            />

            <TextField
              label="Email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleFormChange}
            />

            <label style={{ ...styles.field, gridColumn: "1 / -1" }}>
              <span style={styles.label}>Address</span>
              <textarea
                name="address"
                value={form.address}
                onChange={handleFormChange}
                rows={3}
                style={styles.textarea}
              />
            </label>

            <TextField
              label="Preferred Date"
              type="date"
              name="preferredDate"
              value={form.preferredDate}
              onChange={handleFormChange}
            />

            <label style={styles.field}>
              <span style={styles.label}>Preferred Service</span>
              <select
                name="preferredService"
                value={form.preferredService}
                onChange={handleFormChange}
                style={styles.input}
              >
                <option value="">Select</option>
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Special">Special Service</option>
              </select>
            </label>

            <div style={styles.formActions}>
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setForm(emptyForm);
                }}
                style={styles.secondaryButton}
              >
                Cancel
              </button>

              <button type="submit" disabled={submitting} style={styles.darkButton}>
                {submitting ? "Saving..." : "Save Request"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={styles.panel}>
        <div style={styles.tabs}>
          {statusTabs.map((tab) => {
            const active = statusFilter === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  ...styles.tab,
                  background: active ? tab.tone : "#fff",
                  color: active ? "#fff" : "#334155",
                  boxShadow: active ? `0 12px 24px ${tab.tone}33` : "none",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Candidate</th>
                <th style={styles.th}>Contact</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Flags</th>
                <th style={styles.th}>Token</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={styles.emptyCell}>
                    Loading baptism requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} style={styles.emptyCell}>
                    No baptism requests found for this status.
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <BaptismRow
                    key={request.id}
                    item={request}
                    isLoading={actionLoadingId === request.id}
                    onVerify={handleVerifyChurch}
                    onConsent={handleMarkConsent}
                    onToken={handleGenerateToken}
                    onComplete={handleComplete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BaptismRow({ item, isLoading, onVerify, onConsent, onToken, onComplete }) {
  const meta = getStatusMeta(item.status);

  return (
    <tr style={styles.tr}>
      <td style={styles.td}>
        <div style={styles.name}>{display(item.fullName)}</div>
        <div style={styles.muted}>
          Father: {display(item.fatherName)} | Mother: {display(item.motherName)}
        </div>
      </td>

      <td style={styles.td}>
        <div>{display(item.contactNumber)}</div>
        <div style={styles.muted}>{display(item.email)}</div>
      </td>

      <td style={styles.td}>
        <span style={{ ...styles.badge, background: meta.bg, color: meta.color }}>
          {meta.label}
        </span>
      </td>

      <td style={styles.td}>
        <div style={styles.flagGroup}>
          {item.churchVerified && <Flag label="Church OK" bg="#dcfce7" color="#166534" />}
          {item.consentSigned && <Flag label="Consent" bg="#dbeafe" color="#1d4ed8" />}
          {item.certificatePdfUrl && <Flag label="Certificate" bg="#ede9fe" color="#6d28d9" />}
          {!item.churchVerified && !item.consentSigned && !item.certificatePdfUrl && (
            <span style={styles.muted}>-</span>
          )}
        </div>
      </td>

      <td style={styles.td}>
        <span style={styles.token}>{display(item.token)}</span>
      </td>

      <td style={{ ...styles.td, textAlign: "right" }}>
        <div style={styles.actionGroup}>
          {!item.churchVerified && (
            <button
              type="button"
              onClick={() => onVerify(item.id)}
              disabled={isLoading}
              style={styles.actionButton("#0f766e")}
            >
              {isLoading ? "..." : "Verify"}
            </button>
          )}

          {!item.consentSigned && (
            <button
              type="button"
              onClick={() => onConsent(item.id)}
              disabled={isLoading}
              style={styles.actionButton("#4f46e5")}
            >
              {isLoading ? "..." : "Mark Consent"}
            </button>
          )}

          {item.churchVerified && item.consentSigned && !item.token && (
            <button
              type="button"
              onClick={() => onToken(item.id)}
              disabled={isLoading}
              style={styles.actionButton("#2563eb")}
            >
              {isLoading ? "..." : "Token + Cert"}
            </button>
          )}

          {item.status === "TokenGenerated" && (
            <button
              type="button"
              onClick={() => onComplete(item.id)}
              disabled={isLoading}
              style={styles.actionButton("#16a34a")}
            >
              {isLoading ? "..." : "Complete"}
            </button>
          )}

          {item.certificatePdfUrl && (
            <a
              href={`${API_BASE}/${item.id}/certificate`}
              target="_blank"
              rel="noreferrer"
              style={styles.pdfButton}
            >
              PDF
            </a>
          )}
        </div>
      </td>
    </tr>
  );
}

function TextField({ label, name, value, onChange, type = "text", required = false }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        style={styles.input}
      />
    </label>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statHint}>{hint}</div>
    </div>
  );
}

function Flag({ label, bg, color }) {
  return <span style={{ ...styles.flag, background: bg, color }}>{label}</span>;
}

const styles = {
  page: {
    padding: 24,
    borderRadius: 28,
    background:
      "radial-gradient(circle at top left, #ecfeff 0, #fff7ed 42%, #f8fafc 100%)",
    minHeight: "100%",
  },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    padding: 28,
    borderRadius: 28,
    background: "linear-gradient(135deg, #123a63, #075985)",
    color: "#fff",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
    marginBottom: 18,
  },
  kicker: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "#bae6fd",
  },
  title: {
    margin: "8px 0 0",
    fontSize: 36,
    lineHeight: 1,
    fontWeight: 950,
  },
  subtitle: {
    margin: "12px 0 0",
    maxWidth: 760,
    color: "rgba(255,255,255,0.78)",
    fontSize: 15,
    lineHeight: 1.7,
  },
  primaryButton: {
    padding: "12px 20px",
    borderRadius: 999,
    border: "none",
    background: "linear-gradient(135deg, #38bdf8, #f59e0b)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 16px 34px rgba(56, 189, 248, 0.28)",
    whiteSpace: "nowrap",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },
  statCard: {
    padding: 18,
    borderRadius: 22,
    background: "#fff",
    boxShadow: "0 16px 34px rgba(15, 23, 42, 0.08)",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  statValue: {
    marginTop: 8,
    fontSize: 32,
    fontWeight: 950,
    color: "#0f172a",
  },
  statHint: {
    marginTop: 3,
    fontSize: 13,
    color: "#94a3b8",
  },
  error: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 16,
    background: "#fee2e2",
    color: "#991b1b",
    fontWeight: 800,
  },
  formCard: {
    marginBottom: 18,
    padding: 22,
    borderRadius: 28,
    background: "#fff",
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)",
  },
  formHeader: {
    marginBottom: 16,
  },
  formTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 950,
    color: "#123a63",
  },
  formSub: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: 14,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 14,
  },
  field: {
    display: "block",
  },
  label: {
    display: "block",
    marginBottom: 6,
    fontSize: 12,
    fontWeight: 900,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    padding: "11px 12px",
    fontSize: 14,
    outline: "none",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    padding: "11px 12px",
    fontSize: 14,
    outline: "none",
    resize: "vertical",
  },
  formActions: {
    gridColumn: "1 / -1",
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  secondaryButton: {
    padding: "10px 16px",
    borderRadius: 999,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    fontWeight: 800,
    cursor: "pointer",
  },
  darkButton: {
    padding: "10px 18px",
    borderRadius: 999,
    border: "none",
    background: "#123a63",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },
  panel: {
    background: "#fff",
    borderRadius: 28,
    padding: 18,
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)",
  },
  tabs: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  tab: {
    padding: "10px 16px",
    borderRadius: 999,
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 800,
  },
  tableWrap: {
    overflowX: "auto",
    borderRadius: 20,
    border: "1px solid #e2e8f0",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 980,
    fontSize: 13,
  },
  th: {
    padding: 14,
    background: "#f8fafc",
    color: "#475569",
    textAlign: "left",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    borderBottom: "1px solid #e2e8f0",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: 14,
    verticalAlign: "top",
    color: "#1e293b",
  },
  name: {
    fontWeight: 900,
    color: "#0f172a",
  },
  muted: {
    marginTop: 3,
    color: "#64748b",
    fontSize: 12,
    maxWidth: 320,
    whiteSpace: "normal",
  },
  badge: {
    display: "inline-flex",
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  flagGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  flag: {
    display: "inline-flex",
    padding: "5px 9px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  token: {
    fontFamily: "monospace",
    fontWeight: 900,
    color: "#123a63",
  },
  actionGroup: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionButton: (tone) => ({
    padding: "7px 12px",
    borderRadius: 999,
    background: tone,
    color: "#fff",
    border: "none",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  }),
  pdfButton: {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 12px",
    borderRadius: 999,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    fontSize: 12,
    fontWeight: 900,
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  emptyCell: {
    padding: 28,
    textAlign: "center",
    color: "#64748b",
  },
};
