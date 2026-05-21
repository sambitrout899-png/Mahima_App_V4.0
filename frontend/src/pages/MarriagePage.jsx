import React, { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../api";
import { getToken } from "../features/auth/authService";

const TABS = [
  { key: "", label: "All", tone: "#0f172a" },
  { key: "PendingReview", label: "New Applications", tone: "#2563eb" },
  { key: "Approved", label: "Approved", tone: "#0f766e" },
  { key: "Scheduled", label: "Scheduled", tone: "#c2410c" },
  { key: "Completed", label: "Completed", tone: "#4f46e5" },
];

const EMPTY_FORM = {
  groomFullName: "",
  brideFullName: "",
  groomPhone: "",
  bridePhone: "",
  groomEmail: "",
  brideEmail: "",
  address: "",
  groomIsMember: false,
  brideIsMember: false,
  groomMemberId: "",
  brideMemberId: "",
  preferredDate: "",
  preferredService: "",
};

function formatDate(dtString) {
  if (!dtString) return "-";
  const d = new Date(dtString);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function formatDateOnly(dtString) {
  if (!dtString) return "-";
  const d = new Date(dtString);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

function arrayFrom(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.records)) return data.records;
  return [];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusStyle(status) {
  const map = {
    PendingReview: { bg: "#dbeafe", color: "#1d4ed8", label: "Pending Review" },
    Approved: { bg: "#dcfce7", color: "#166534", label: "Approved" },
    Scheduled: { bg: "#ffedd5", color: "#c2410c", label: "Scheduled" },
    Completed: { bg: "#ede9fe", color: "#5b21b6", label: "Completed" },
  };

  return map[status] || { bg: "#f1f5f9", color: "#334155", label: status || "-" };
}

export default function MarriagePage() {
  const [activeTab, setActiveTab] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_FORM);
  const [scheduleModal, setScheduleModal] = useState(null);
  const [certificateItem, setCertificateItem] = useState(null);

  const apiBase = `${API_BASE}/marriage`;

  const counts = useMemo(() => {
    return {
      total: items.length,
      pending: items.filter((x) => x.status === "PendingReview").length,
      approved: items.filter((x) => x.status === "Approved").length,
      scheduled: items.filter((x) => x.status === "Scheduled").length,
      completed: items.filter((x) => x.status === "Completed").length,
    };
  }, [items]);

  function authHeaders() {
    const token = getToken?.();
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  }

  async function loadItems(statusKey = activeTab) {
    setLoading(true);
    setError("");

    try {
      const qs = statusKey ? `?status=${encodeURIComponent(statusKey)}` : "";
      const resp = await fetch(`${apiBase}/admin/applications${qs}`, {
        headers: authHeaders(),
      });

      if (!resp.ok) throw new Error(await resp.text());

      const data = await resp.json();
      setItems(arrayFrom(data));
    } catch (err) {
      console.error(err);
      setError("Failed to load marriage applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems(activeTab);
  }, [activeTab]);

  function updateForm(field, value) {
    setNewForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetNewForm() {
    setNewForm(EMPTY_FORM);
  }

  async function handleCreate() {
    if (!newForm.groomFullName || !newForm.brideFullName) {
      alert("Groom and Bride full names are required.");
      return;
    }

    try {
      const body = {
        ...newForm,
        preferredDate: newForm.preferredDate
          ? new Date(newForm.preferredDate).toISOString()
          : null,
      };

      const resp = await fetch(`${apiBase}/applications`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        console.error(await resp.text());
        alert("Unable to submit marriage application.");
        return;
      }

      setShowNewModal(false);
      resetNewForm();
      setActiveTab("");
      await loadItems("");
    } catch (err) {
      console.error(err);
      alert("Error submitting application.");
    }
  }

  async function handleApprove(id) {
    if (!window.confirm("Approve this marriage application and generate a token?")) return;

    try {
      const resp = await fetch(`${apiBase}/admin/applications/${id}/approve`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ notes: "" }),
      });

      if (!resp.ok) {
        console.error(await resp.text());
        alert("Unable to approve application.");
        return;
      }

      await loadItems(activeTab);
    } catch (err) {
      console.error(err);
      alert("Error approving application.");
    }
  }

  function openScheduleModal(item) {
    setScheduleModal({
      id: item.id,
      scheduledAt: item.scheduledAt ? item.scheduledAt.slice(0, 16) : "",
      ceremonyLocation: item.ceremonyLocation || "Mahima Ministry Church, Punjab",
    });
  }

  async function handleSchedule() {
    if (!scheduleModal?.scheduledAt) {
      alert("Please select ceremony date and time.");
      return;
    }

    try {
      const body = {
        scheduledAt: new Date(scheduleModal.scheduledAt).toISOString(),
        ceremonyLocation: scheduleModal.ceremonyLocation,
      };

      const resp = await fetch(
        `${apiBase}/admin/applications/${scheduleModal.id}/schedule`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(body),
        }
      );

      if (!resp.ok) {
        console.error(await resp.text());
        alert("Unable to schedule marriage.");
        return;
      }

      setScheduleModal(null);
      await loadItems(activeTab);
    } catch (err) {
      console.error(err);
      alert("Error scheduling marriage.");
    }
  }

  async function handleComplete(id) {
    if (!window.confirm("Mark this marriage as completed?")) return;

    try {
      const resp = await fetch(`${apiBase}/admin/applications/${id}/complete`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ notes: "" }),
      });

      if (!resp.ok) {
        console.error(await resp.text());
        alert("Unable to complete marriage.");
        return;
      }

      await loadItems(activeTab);
    } catch (err) {
      console.error(err);
      alert("Error completing marriage.");
    }
  }

  function handlePrintCertificate() {
    if (!certificateItem) return;

    const item = certificateItem;
    const marriageDate = item.scheduledAt || item.preferredDate || item.createdAt;
    const formattedMarriageDate = formatDateOnly(marriageDate);
    const formattedIssueDate = formatDateOnly(new Date().toISOString());

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Provisional Marriage Certificate</title>
<style>
  body { font-family: "Segoe UI", Arial, sans-serif; background: #f8fafc; margin: 0; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 22mm 20mm; background: white; box-sizing: border-box; }
  .frame { border: 8px double #8b5e34; padding: 22px; min-height: 245mm; }
  .header { text-align: center; border-bottom: 2px solid #8b5e34; padding-bottom: 14px; }
  .church { font-size: 24px; font-weight: 900; letter-spacing: .08em; color: #123a63; }
  .sub { margin-top: 4px; font-size: 12px; color: #64748b; }
  .title { text-align: center; margin: 32px 0 18px; font-size: 22px; font-weight: 800; text-transform: uppercase; text-decoration: underline; color: #7c2d12; }
  .meta { display: flex; justify-content: space-between; font-size: 12px; margin: 10px 0; }
  .body { margin-top: 28px; font-size: 15px; line-height: 1.85; text-align: justify; color: #1f2937; }
  .names { font-weight: 800; color: #111827; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 26px; }
  .box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; font-size: 12px; line-height: 1.7; background: #fffaf3; }
  .box strong { color: #7c2d12; }
  .signatures { display: flex; justify-content: space-between; margin-top: 70px; font-size: 12px; }
  .sig { width: 42%; text-align: center; border-top: 1px solid #111; padding-top: 8px; }
  .disclaimer { margin-top: 42px; padding-top: 10px; border-top: 1px dashed #94a3b8; font-size: 10px; color: #64748b; line-height: 1.5; }
  @page { size: A4; margin: 12mm; }
</style>
</head>
<body>
<div class="page">
  <div class="frame">
    <div class="header">
      <div class="church">MAHIMA MINISTRY CHURCH, PUNJAB</div>
      <div class="sub">Restoration | Healing | Mission - Pastoral and Marriage Ministry</div>
    </div>

    <div class="title">Provisional Marriage Certificate</div>

    <div class="meta">
      <div><strong>Certificate No:</strong> ${escapeHtml(item.token || "-")}</div>
      <div><strong>Date of Issue:</strong> ${escapeHtml(formattedIssueDate)}</div>
    </div>
    <div class="meta">
      <div><strong>Church Location:</strong> ${escapeHtml(item.ceremonyLocation || "Mahima Ministry Church, Punjab")}</div>
      <div><strong>Marriage Date:</strong> ${escapeHtml(formattedMarriageDate)}</div>
    </div>

    <div class="body">
      This is to certify that, according to the marriage records of
      <strong>Mahima Ministry Church</strong>, the Christian marriage of
      <span class="names">${escapeHtml(item.groomFullName || "________________")}</span>
      and
      <span class="names">${escapeHtml(item.brideFullName || "________________")}</span>
      has been duly solemnised in the presence of witnesses and pastoral leadership.
    </div>

    <div class="grid">
      <div class="box">
        <strong>Groom Details</strong><br/>
        Name: ${escapeHtml(item.groomFullName || "-")}<br/>
        Phone: ${escapeHtml(item.groomPhone || "-")}<br/>
        Email: ${escapeHtml(item.groomEmail || "-")}
      </div>
      <div class="box">
        <strong>Bride Details</strong><br/>
        Name: ${escapeHtml(item.brideFullName || "-")}<br/>
        Phone: ${escapeHtml(item.bridePhone || "-")}<br/>
        Email: ${escapeHtml(item.brideEmail || "-")}
      </div>
    </div>

    <div class="box" style="margin-top:18px;">
      <strong>Residential Address As Declared</strong><br/>
      ${escapeHtml(item.address || "-")}
    </div>

    <div class="box" style="margin-top:18px;">
      <strong>Internal Church Reference</strong><br/>
      Application Token: ${escapeHtml(item.token || "-")}<br/>
      Application Created: ${escapeHtml(formatDateOnly(item.createdAt))}
    </div>

    <div class="signatures">
      <div class="sig">Senior Pastor / Marriage Minister</div>
      <div class="sig">Church Seal</div>
    </div>

    <div class="disclaimer">
      This provisional certificate is issued by Mahima Ministry Church, Punjab for pastoral and church-record purposes only.
      It is not a replacement for the civil marriage certificate issued by the competent government authority.
    </div>
  </div>
</div>
<script>window.onload = function(){ window.focus(); window.print(); };</script>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) {
      alert("Please allow pop-ups to print the certificate.");
      return;
    }

    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  function renderActions(item) {
    const btn = (label, onClick, tone) => (
      <button type="button" onClick={onClick} style={styles.actionButton(tone)}>
        {label}
      </button>
    );

    if (item.status === "PendingReview" || item.status === "Pending" || item.status === "New") {
      return btn("Approve", () => handleApprove(item.id), "#0f766e");
    }

    if (item.status === "Approved") {
      return btn("Schedule", () => openScheduleModal(item), "#c2410c");
    }

    if (item.status === "Scheduled") {
      return btn("Mark Completed", () => handleComplete(item.id), "#123a63");
    }

    if (item.status === "Completed" || item.status === "Closed") {
      return btn("Certificate", () => setCertificateItem(item), "#4f46e5");
    }

    return null;
  }

  return (
    <div className="ministry-workflow-page marriage-workflow-page" style={styles.page}>
      <div style={styles.hero}>
        <div>
          <div style={styles.kicker}>Marriage Ministry</div>
          <h1 style={styles.title}>Marriage Applications</h1>
          <p style={styles.subtitle}>
            Review applications, issue tokens, schedule ceremonies, complete records,
            and generate provisional church certificates.
          </p>
        </div>

        <button type="button" onClick={() => setShowNewModal(true)} style={styles.primaryButton}>
          + New Application
        </button>
      </div>

      <div style={styles.statsGrid}>
        <StatCard label="Current Tab" value={counts.total} hint="Visible records" />
        <StatCard label="Pending" value={counts.pending} hint="Need review" />
        <StatCard label="Approved" value={counts.approved} hint="Token issued" />
        <StatCard label="Completed" value={counts.completed} hint="Certificate ready" />
      </div>

      <div style={styles.panel}>
        <div style={styles.tabs}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  ...styles.tab,
                  background: active ? tab.tone : "#ffffff",
                  color: active ? "#ffffff" : "#334155",
                  boxShadow: active ? `0 12px 24px ${tab.tone}33` : "none",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading && <div style={styles.empty}>Loading applications...</div>}
        {error && <div style={styles.error}>{error}</div>}

        {!loading && !error && (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Couple</th>
                  <th style={styles.th}>Contact</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Preferred</th>
                  <th style={styles.th}>Scheduled</th>
                  <th style={styles.th}>Location</th>
                  <th style={styles.th}>Token</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} style={styles.emptyCell}>
                      {activeTab ? "No items found for this tab." : "No marriage applications found."}
                    </td>
                  </tr>
                )}

                {items.map((m) => {
                  const badge = statusStyle(m.status);
                  return (
                    <tr key={m.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.name}>{m.groomFullName || "-"}</div>
                        <div style={styles.muted}>with {m.brideFullName || "-"}</div>
                      </td>
                      <td style={styles.td}>
                        <div>{m.groomPhone || m.bridePhone || "-"}</div>
                        <div style={styles.muted}>{m.groomEmail || m.brideEmail || ""}</div>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={styles.td}>{formatDate(m.preferredDate)}</td>
                      <td style={styles.td}>{formatDate(m.scheduledAt)}</td>
                      <td style={styles.td}>{m.ceremonyLocation || "-"}</td>
                      <td style={styles.td}>
                        <span style={styles.token}>{m.token || "-"}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: "right" }}>{renderActions(m)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNewModal && (
        <ApplicationModal
          form={newForm}
          updateForm={updateForm}
          onClose={() => {
            setShowNewModal(false);
            resetNewForm();
          }}
          onSubmit={handleCreate}
        />
      )}

      {scheduleModal && (
        <ScheduleModal
          value={scheduleModal}
          setValue={setScheduleModal}
          onClose={() => setScheduleModal(null)}
          onSubmit={handleSchedule}
        />
      )}

      {certificateItem && (
        <CertificateModal
          item={certificateItem}
          onClose={() => setCertificateItem(null)}
          onPrint={handlePrintCertificate}
        />
      )}
    </div>
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

function ApplicationModal({ form, updateForm, onClose, onSubmit }) {
  return (
    <Modal onClose={onClose}>
      <div style={styles.modalLarge}>
        <ModalHeader title="New Marriage Application" onClose={onClose} />

        <div style={styles.formGrid}>
          <TextField label="Groom full name" value={form.groomFullName} onChange={(v) => updateForm("groomFullName", v)} />
          <TextField label="Bride full name" value={form.brideFullName} onChange={(v) => updateForm("brideFullName", v)} />
          <TextField label="Groom phone" value={form.groomPhone} onChange={(v) => updateForm("groomPhone", v)} />
          <TextField label="Bride phone" value={form.bridePhone} onChange={(v) => updateForm("bridePhone", v)} />
          <TextField label="Groom email" type="email" value={form.groomEmail} onChange={(v) => updateForm("groomEmail", v)} />
          <TextField label="Bride email" type="email" value={form.brideEmail} onChange={(v) => updateForm("brideEmail", v)} />

          <label style={{ ...styles.field, gridColumn: "1 / -1" }}>
            <span style={styles.label}>Address</span>
            <textarea
              rows={3}
              value={form.address}
              onChange={(e) => updateForm("address", e.target.value)}
              style={styles.textarea}
            />
          </label>

          <TextField label="Preferred date" type="date" value={form.preferredDate} onChange={(v) => updateForm("preferredDate", v)} />

          <label style={styles.field}>
            <span style={styles.label}>Preferred service</span>
            <select
              value={form.preferredService}
              onChange={(e) => updateForm("preferredService", e.target.value)}
              style={styles.input}
            >
              <option value="">Select</option>
              <option value="Morning">Morning</option>
              <option value="Evening">Evening</option>
            </select>
          </label>
        </div>

        <div style={styles.modalActions}>
          <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancel</button>
          <button type="button" onClick={onSubmit} style={styles.darkButton}>Submit Application</button>
        </div>
      </div>
    </Modal>
  );
}

function ScheduleModal({ value, setValue, onClose, onSubmit }) {
  return (
    <Modal onClose={onClose}>
      <div style={styles.modalSmall}>
        <ModalHeader title="Schedule Marriage" onClose={onClose} />

        <TextField
          label="Date and time"
          type="datetime-local"
          value={value.scheduledAt}
          onChange={(v) => setValue({ ...value, scheduledAt: v })}
        />

        <TextField
          label="Ceremony location"
          value={value.ceremonyLocation}
          onChange={(v) => setValue({ ...value, ceremonyLocation: v })}
        />

        <div style={styles.modalActions}>
          <button type="button" onClick={onClose} style={styles.secondaryButton}>Cancel</button>
          <button type="button" onClick={onSubmit} style={styles.darkButton}>Save Schedule</button>
        </div>
      </div>
    </Modal>
  );
}

function CertificateModal({ item, onClose, onPrint }) {
  return (
    <Modal onClose={onClose}>
      <div style={styles.modalLarge}>
        <ModalHeader title="Provisional Marriage Certificate" onClose={onClose} />

        <div style={styles.certificatePreview}>
          <div style={styles.certHeader}>MAHIMA MINISTRY CHURCH, PUNJAB</div>
          <div style={styles.certSub}>Restoration | Healing | Mission - Marriage Ministry</div>
          <div style={styles.certTitle}>Provisional Marriage Certificate</div>

          <p style={styles.certBody}>
            This certifies that <strong>{item.groomFullName}</strong> and{" "}
            <strong>{item.brideFullName}</strong> were united in Christian marriage on{" "}
            <strong>{formatDateOnly(item.scheduledAt || item.preferredDate || item.createdAt)}</strong>{" "}
            at <strong>{item.ceremonyLocation || "Mahima Ministry Church"}</strong>.
          </p>

          <div style={styles.certGrid}>
            <div>
              <strong>Certificate No.</strong>
              <br />
              {item.token || "-"}
            </div>
            <div>
              <strong>Issue Date</strong>
              <br />
              {formatDateOnly(new Date().toISOString())}
            </div>
          </div>

          <div style={styles.certNote}>
            This is a church provisional certificate for pastoral and record purposes.
            It is not a replacement for the official government marriage certificate.
          </div>
        </div>

        <div style={styles.modalActions}>
          <button type="button" onClick={onClose} style={styles.secondaryButton}>Close</button>
          <button type="button" onClick={onPrint} style={styles.darkButton}>Open Printable Certificate</button>
        </div>
      </div>
    </Modal>
  );
}

function TextField({ label, value, onChange, type = "text" }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={styles.input}
      />
    </label>
  );
}

function Modal({ children, onClose }) {
  return (
    <div style={styles.overlay} onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={styles.modalHeader}>
      <h3 style={styles.modalTitle}>{title}</h3>
      <button type="button" onClick={onClose} style={styles.closeButton}>x</button>
    </div>
  );
}

const styles = {
  page: {
    padding: 24,
    borderRadius: 28,
    background:
      "radial-gradient(circle at top left, #fff7ed 0, #fff1f2 36%, #f8fafc 100%)",
    minHeight: "100%",
  },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    padding: 28,
    borderRadius: 28,
    background: "linear-gradient(135deg, #123a63, #7f1d1d)",
    color: "#fff",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
    marginBottom: 18,
  },
  kicker: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "#fed7aa",
  },
  title: {
    margin: "8px 0 0",
    fontSize: 36,
    lineHeight: 1,
    fontWeight: 950,
  },
  subtitle: {
    margin: "12px 0 0",
    maxWidth: 720,
    color: "rgba(255,255,255,0.78)",
    fontSize: 15,
    lineHeight: 1.7,
  },
  primaryButton: {
    padding: "12px 20px",
    borderRadius: 999,
    border: "none",
    background: "linear-gradient(135deg, #fb7185, #f59e0b)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 16px 34px rgba(251, 113, 133, 0.32)",
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
    minWidth: 1100,
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
  },
  badge: {
    display: "inline-flex",
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  token: {
    fontFamily: "monospace",
    fontWeight: 800,
    color: "#123a63",
  },
  empty: {
    padding: 30,
    textAlign: "center",
    color: "#64748b",
  },
  emptyCell: {
    padding: 26,
    textAlign: "center",
    color: "#64748b",
  },
  error: {
    padding: 16,
    borderRadius: 16,
    background: "#fee2e2",
    color: "#991b1b",
    fontWeight: 800,
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
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    background: "rgba(15, 23, 42, 0.62)",
    display: "grid",
    placeItems: "center",
    padding: 16,
    backdropFilter: "blur(6px)",
  },
  modalLarge: {
    width: "min(920px, 96vw)",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#fff",
    borderRadius: 28,
    padding: 24,
    boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
  },
  modalSmall: {
    width: "min(520px, 94vw)",
    background: "#fff",
    borderRadius: 28,
    padding: 24,
    boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  modalTitle: {
    margin: 0,
    fontSize: 22,
    color: "#123a63",
    fontWeight: 950,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    border: "none",
    background: "#f1f5f9",
    cursor: "pointer",
    fontWeight: 900,
    color: "#475569",
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
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 22,
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
  certificatePreview: {
    padding: 24,
    borderRadius: 20,
    border: "1px solid #e2e8f0",
    background: "linear-gradient(180deg, #fff7ed, #ffffff)",
  },
  certHeader: {
    textAlign: "center",
    fontWeight: 950,
    color: "#123a63",
    fontSize: 20,
    letterSpacing: "0.08em",
  },
  certSub: {
    textAlign: "center",
    marginTop: 4,
    color: "#64748b",
    fontSize: 12,
  },
  certTitle: {
    textAlign: "center",
    margin: "20px 0",
    fontSize: 18,
    fontWeight: 900,
    textTransform: "uppercase",
    textDecoration: "underline",
    color: "#7c2d12",
  },
  certBody: {
    fontSize: 15,
    lineHeight: 1.8,
    color: "#1f2937",
  },
  certGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 18,
    fontSize: 13,
  },
  certNote: {
    marginTop: 20,
    paddingTop: 12,
    borderTop: "1px dashed #cbd5e1",
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.6,
  },
};
