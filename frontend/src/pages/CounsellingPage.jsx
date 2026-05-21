import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "../api";

const TABS = [
  { key: "all", label: "All", status: "", tone: "#0f172a" },
  { key: "new", label: "New Requests", status: "Requested", tone: "#2563eb" },
  { key: "scheduled", label: "Scheduled", status: "Scheduled", tone: "#c2410c" },
  { key: "completed", label: "Completed", status: "Completed", tone: "#0f766e" },
];

const API_BASE = "/counselling";

const ISSUE_OPTIONS = [
  "Marriage & Family",
  "Healing & Deliverance",
  "Financial",
  "Depression / Anxiety",
  "Spiritual Growth",
  "Other",
];

const OUTCOMES = [
  { value: "Resolved", label: "Resolved / case closed" },
  { value: "NeedsFurtherPrayer", label: "Needs further prayer / lay-hands session" },
  { value: "EscalateToSeniorPastor", label: "Escalate to senior pastor" },
];

const EMPTY_REQUEST = {
  fullName: "",
  email: "",
  phone: "",
  isChurchMember: false,
  memberId: "",
  issueCategory: "",
  description: "",
};

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function arrayFrom(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.records)) return data.records;
  return [];
}

function statusBadge(status) {
  const map = {
    Requested: { bg: "#dbeafe", color: "#1d4ed8", label: "Requested" },
    Scheduled: { bg: "#ffedd5", color: "#c2410c", label: "Scheduled" },
    Completed: { bg: "#dcfce7", color: "#166534", label: "Completed" },
  };

  return map[status] || { bg: "#f1f5f9", color: "#334155", label: status || "-" };
}

export default function CounsellingPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [scheduleModal, setScheduleModal] = useState({ open: false, session: null });
  const [completeModal, setCompleteModal] = useState({ open: false, session: null });

  const counts = useMemo(() => {
    return {
      visible: sessions.length,
      requested: sessions.filter((x) => x.status === "Requested").length,
      scheduled: sessions.filter((x) => x.status === "Scheduled").length,
      completed: sessions.filter((x) => x.status === "Completed").length,
    };
  }, [sessions]);

  async function loadSessions(tabKey = activeTab) {
    const tab = TABS.find((t) => t.key === tabKey);
    if (!tab) return;

    setLoading(true);
    setError("");

    try {
      const res = await api.get(`${API_BASE}/admin/sessions`, {
        params: { status: tab.status },
      });

      if (!res.ok) throw new Error((await res.text?.()) || res.statusText || "Unable to load counselling sessions");

      setSessions(arrayFrom(res.data));
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data ||
        err?.message ||
        "Unable to load counselling sessions";

      setError(String(msg));
      toast.error("Unable to load counselling sessions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions(activeTab);
  }, [activeTab]);

  function handleCreated() {
    setCreateModalOpen(false);
    setActiveTab("all");
    loadSessions("all");
  }

  function handleScheduled() {
    setScheduleModal({ open: false, session: null });
    loadSessions(activeTab);
  }

  function handleCompleted() {
    setCompleteModal({ open: false, session: null });
    loadSessions(activeTab);
  }

  return (
    <div className="ministry-workflow-page counselling-workflow-page" style={styles.page}>
      <div style={styles.hero}>
        <div>
          <div style={styles.kicker}>Pastoral Care</div>
          <h1 style={styles.title}>Counselling Workflow</h1>
          <p style={styles.subtitle}>
            Track requests, schedule counselling sessions, generate tokens, complete
            cases, and escalate sensitive matters to senior pastoral care.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          style={styles.primaryButton}
        >
          + New Counselling Request
        </button>
      </div>

      <div style={styles.statsGrid}>
        <StatCard label="Visible" value={counts.visible} hint="Current tab records" />
        <StatCard label="Requested" value={counts.requested} hint="Need scheduling" />
        <StatCard label="Scheduled" value={counts.scheduled} hint="Upcoming sessions" />
        <StatCard label="Completed" value={counts.completed} hint="Closed cases" />
      </div>

      <div style={styles.panel}>
        <div style={styles.tabs}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  ...styles.tab,
                  background: isActive ? tab.tone : "#fff",
                  color: isActive ? "#fff" : "#334155",
                  boxShadow: isActive ? `0 12px 24px ${tab.tone}33` : "none",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading && <div style={styles.empty}>Loading counselling sessions...</div>}
        {error && !loading && <div style={styles.error}>{error}</div>}

        {!loading && !error && (
          <SessionTable
            items={sessions}
            tab={activeTab}
            onSchedule={(session) => setScheduleModal({ open: true, session })}
            onComplete={(session) => setCompleteModal({ open: true, session })}
          />
        )}
      </div>

      {createModalOpen && (
        <CreateRequestModal
          onClose={() => setCreateModalOpen(false)}
          onSaved={handleCreated}
        />
      )}

      {scheduleModal.open && scheduleModal.session && (
        <ScheduleSessionModal
          session={scheduleModal.session}
          onClose={() => setScheduleModal({ open: false, session: null })}
          onSaved={handleScheduled}
        />
      )}

      {completeModal.open && completeModal.session && (
        <CompleteSessionModal
          session={completeModal.session}
          onClose={() => setCompleteModal({ open: false, session: null })}
          onSaved={handleCompleted}
        />
      )}
    </div>
  );
}

function SessionTable({ items, tab, onSchedule, onComplete }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Candidate</th>
            <th style={styles.th}>Issue</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Scheduled At</th>
            <th style={styles.th}>Token</th>
            <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={7} style={styles.emptyCell}>
                {tab === "all" ? "No counselling sessions found." : "No items in this view."}
              </td>
            </tr>
          )}

          {items.map((s) => {
            const badge = statusBadge(s.status);
            const showScheduleAction = s.status === "Requested";
            const showCompleteAction = s.status === "Scheduled";

            return (
              <tr key={s.sessionId} style={styles.tr}>
                <td style={styles.td}>
                  <div style={styles.name}>{s.candidateName || "-"}</div>
                  <div style={styles.muted}>{s.phone || s.email || ""}</div>
                </td>

                <td style={styles.td}>
                  <div style={styles.nameSmall}>{s.issueCategory || "-"}</div>
                  <div style={styles.muted}>{s.description || ""}</div>
                </td>

                <td style={styles.td}>{s.sessionType || "-"}</td>

                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: badge.bg, color: badge.color }}>
                    {badge.label}
                  </span>
                </td>

                <td style={styles.td}>{formatDateTime(s.scheduledAt)}</td>

                <td style={styles.td}>
                  <span style={styles.token}>{s.tokenNumber || "-"}</span>
                </td>

                <td style={{ ...styles.td, textAlign: "right" }}>
                  <div style={styles.actionGroup}>
                    {showScheduleAction && (
                      <button
                        type="button"
                        onClick={() => onSchedule(s)}
                        style={styles.actionButton("#123a63")}
                      >
                        Schedule & Token
                      </button>
                    )}

                    {showCompleteAction && (
                      <button
                        type="button"
                        onClick={() => onComplete(s)}
                        style={styles.actionButton("#0f766e")}
                      >
                        Complete / Escalate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CreateRequestModal({ onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_REQUEST);
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.fullName || !form.phone || !form.issueCategory) {
      toast.warn("Name, phone and issue category are required");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        fullName: form.fullName,
        email: form.email || null,
        phone: form.phone,
        isChurchMember: form.isChurchMember,
        memberId: form.memberId || null,
        issueCategory: form.issueCategory,
        description: form.description || null,
      };

      const res = await api.post(`${API_BASE}/requests`, payload);
      const data = res.data;

      toast.success(`Request created. Ref: ${data?.requestCode || data?.caseId || ""}`);
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Unable to create counselling request");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div style={styles.modalLarge}>
        <ModalHeader title="New Counselling Request" onClose={onClose} />

        <form onSubmit={handleSubmit} style={styles.formGrid}>
          <TextField label="Full name" value={form.fullName} onChange={(v) => update("fullName", v)} />
          <TextField label="Phone" value={form.phone} onChange={(v) => update("phone", v)} />
          <TextField label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} />

          <label style={styles.field}>
            <span style={styles.label}>Issue category</span>
            <select
              value={form.issueCategory}
              onChange={(e) => update("issueCategory", e.target.value)}
              style={styles.input}
              required
            >
              <option value="">Select</option>
              {ISSUE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label style={{ ...styles.field, gridColumn: "1 / -1" }}>
            <span style={styles.label}>Short description</span>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              style={styles.textarea}
              rows={4}
              placeholder="Brief summary of the situation"
            />
          </label>

          <label style={styles.checkboxLine}>
            <input
              type="checkbox"
              checked={form.isChurchMember}
              onChange={(e) => update("isChurchMember", e.target.checked)}
            />
            <span>I am part of Mahima Ministry</span>
          </label>

          {form.isChurchMember && (
            <TextField
              label="Member ID"
              value={form.memberId}
              onChange={(v) => update("memberId", v)}
            />
          )}

          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.secondaryButton}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={styles.darkButton}>
              {saving ? "Saving..." : "Create Request"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function ScheduleSessionModal({ session, onClose, onSaved }) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();

    if (!scheduledAt || !location) {
      toast.warn("Please fill date/time and location");
      return;
    }

    setSaving(true);

    try {
      const res = await api.post(
        `${API_BASE}/admin/sessions/${session.sessionId}/schedule`,
        {
          scheduledAt,
          location,
          counselorId: null,
        }
      );

      toast.success(`Session scheduled. Token: ${res.data?.tokenNumber || "generated"}`);
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Unable to schedule session");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div style={styles.modalSmall}>
        <ModalHeader title="Schedule Counselling Session" onClose={onClose} />

        <div style={styles.personBlock}>
          <strong>{session.candidateName}</strong>
          <span>{session.issueCategory}</span>
        </div>

        <form onSubmit={handleSave} style={{ display: "grid", gap: 14 }}>
          <TextField
            label="Date and time"
            type="datetime-local"
            value={scheduledAt}
            onChange={setScheduledAt}
          />

          <TextField
            label="Location / Room"
            value={location}
            onChange={setLocation}
            placeholder="Counselling room / church office"
          />

          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.secondaryButton}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={styles.darkButton}>
              {saving ? "Saving..." : "Save & Generate Token"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function CompleteSessionModal({ session, onClose, onSaved }) {
  const [outcome, setOutcome] = useState("Resolved");
  const [notes, setNotes] = useState("");
  const [nextAt, setNextAt] = useState("");
  const [nextLocation, setNextLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const needsFollowup =
    outcome === "NeedsFurtherPrayer" || outcome === "EscalateToSeniorPastor";

  async function handleSave(e) {
    e.preventDefault();

    if (needsFollowup && (!nextAt || !nextLocation)) {
      toast.warn("Please provide date/time and location for follow-up");
      return;
    }

    setSaving(true);

    try {
      await api.post(`${API_BASE}/admin/sessions/${session.sessionId}/complete`, {
        outcome,
        notes,
        nextScheduledAt: needsFollowup ? nextAt : null,
        nextLocation: needsFollowup ? nextLocation : null,
      });

      toast.success(
        outcome === "Resolved"
          ? "Session closed"
          : outcome === "NeedsFurtherPrayer"
          ? "Follow-up prayer session created"
          : "Senior pastor escalation created"
      );

      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Unable to update session");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div style={styles.modalSmall}>
        <ModalHeader title="Complete / Escalate Session" onClose={onClose} />

        <div style={styles.personBlock}>
          <strong>{session.candidateName}</strong>
          <span>{session.issueCategory}</span>
        </div>

        <form onSubmit={handleSave} style={{ display: "grid", gap: 14 }}>
          <label style={styles.field}>
            <span style={styles.label}>Outcome</span>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              style={styles.input}
            >
              {OUTCOMES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={styles.textarea}
              rows={4}
              placeholder="Brief summary for pastoral records"
            />
          </label>

          {needsFollowup && (
            <>
              <TextField
                label="Follow-up date and time"
                type="datetime-local"
                value={nextAt}
                onChange={setNextAt}
              />

              <TextField
                label="Follow-up location"
                value={nextLocation}
                onChange={setNextLocation}
                placeholder="Prayer room / main hall / pastor's office"
              />
            </>
          )}

          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.secondaryButton}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={styles.darkButton}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function TextField({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
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
      <button type="button" onClick={onClose} style={styles.closeButton}>
        x
      </button>
    </div>
  );
}

const styles = {
  page: {
    padding: 24,
    borderRadius: 28,
    background:
      "radial-gradient(circle at top left, #eff6ff 0, #fff7ed 42%, #f8fafc 100%)",
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
  nameSmall: {
    fontWeight: 800,
    color: "#1e293b",
  },
  muted: {
    marginTop: 3,
    color: "#64748b",
    fontSize: 12,
    maxWidth: 260,
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
  token: {
    fontFamily: "monospace",
    fontWeight: 900,
    color: "#123a63",
  },
  actionGroup: {
    display: "flex",
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
    width: "min(560px, 94vw)",
    maxHeight: "90vh",
    overflowY: "auto",
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
  checkboxLine: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#334155",
    fontSize: 14,
    fontWeight: 700,
  },
  personBlock: {
    display: "grid",
    gap: 4,
    padding: 14,
    borderRadius: 18,
    background: "#f8fafc",
    color: "#334155",
    marginBottom: 14,
  },
  modalActions: {
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
};
