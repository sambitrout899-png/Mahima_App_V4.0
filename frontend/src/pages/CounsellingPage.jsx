import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../api"; // ⬅ use your existing axios instance

const TABS = [
  { key: "new", label: "New Requests", status: "Requested" },
  { key: "scheduled", label: "Scheduled Sessions", status: "Scheduled" },
  { key: "completed", label: "Completed Cases", status: "Completed" },
];

const API_BASE = "/counselling"; // axios baseURL already has /api

export default function CounsellingPage() {
  const [activeTab, setActiveTab] = useState("new");
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);

  const [scheduleModal, setScheduleModal] = useState({
    open: false,
    session: null,
  });
  const [completeModal, setCompleteModal] = useState({
    open: false,
    session: null,
  });

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const loadSessions = async (tabKey) => {
    const tab = TABS.find((t) => t.key === tabKey);
    if (!tab) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`${API_BASE}/admin/sessions`, {
        params: { status: tab.status },
      });
      setSessions(res.data || []);
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to load sessions";
      setError(msg);
      toast.error("Unable to load counselling sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const openSchedule = (session) =>
    setScheduleModal({ open: true, session: session });
  const closeSchedule = () => setScheduleModal({ open: false, session: null });

  const openComplete = (session) =>
    setCompleteModal({ open: true, session: session });
  const closeComplete = () =>
    setCompleteModal({ open: false, session: null });

  const handleScheduled = () => {
    closeSchedule();
    loadSessions(activeTab);
  };

  const handleCompleted = () => {
    closeComplete();
    loadSessions(activeTab);
  };

  const handleCreated = () => {
    setCreateModalOpen(false);
    setActiveTab("new");
    loadSessions("new");
  };

  return (
    <div
      style={{
        padding: 20,
        background: "linear-gradient(180deg,#fff8f8,#ffeef0)",
        borderRadius: 20,
        boxShadow: "0 8px 28px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <h2
          style={{
            color: "#123a63",
            fontWeight: 800,
            fontSize: 22,
            margin: 0,
          }}
        >
          Pastoral Counselling Workflow
        </h2>

        <button
          onClick={() => setCreateModalOpen(true)}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "none",
            background:
              "linear-gradient(90deg,rgba(255,115,115,0.95),rgba(252,160,98,0.95))",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            boxShadow: "0 6px 16px rgba(255,115,115,0.45)",
            cursor: "pointer",
          }}
        >
          + New Counselling Request
        </button>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,0.06)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                background: isActive ? "#0b2a47" : "#fff",
                color: isActive ? "#fff" : "#123a63",
                boxShadow: isActive
                  ? "0 6px 15px rgba(11,42,71,0.25)"
                  : "none",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* LIST */}
      <div
        style={{
          padding: 16,
          minHeight: 260,
          background: "#fff",
          borderRadius: 16,
          border: "1px solid rgba(0,0,0,0.04)",
        }}
      >
        {loading && <div>Loading sessions…</div>}
        {error && !loading && (
          <div style={{ color: "darkred", marginBottom: 8 }}>{error}</div>
        )}
        {!loading && !error && sessions.length === 0 && (
          <div style={{ color: "#555" }}>No items in this view.</div>
        )}
        {!loading && !error && sessions.length > 0 && (
          <SessionTable
            items={sessions}
            tab={activeTab}
            onSchedule={openSchedule}
            onComplete={openComplete}
          />
        )}
      </div>

      {/* MODALS */}
      {createModalOpen && (
        <CreateRequestModal
          onClose={() => setCreateModalOpen(false)}
          onSaved={handleCreated}
        />
      )}

      {scheduleModal.open && scheduleModal.session && (
        <ScheduleSessionModal
          session={scheduleModal.session}
          onClose={closeSchedule}
          onSaved={handleScheduled}
        />
      )}

      {completeModal.open && completeModal.session && (
        <CompleteSessionModal
          session={completeModal.session}
          onClose={closeComplete}
          onSaved={handleCompleted}
        />
      )}
    </div>
  );
}

/* ---------- TABLE COMPONENT ---------- */

function SessionTable({ items, tab, onSchedule, onComplete }) {
  const formatDateTime = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const showScheduleAction = tab === "new";
  const showCompleteAction = tab === "scheduled";

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
        }}
      >
        <thead>
          <tr style={{ background: "#f7f4ff" }}>
            <Th>Candidate</Th>
            <Th>Issue</Th>
            <Th>Type</Th>
            <Th>Status</Th>
            <Th>Scheduled At</Th>
            <Th>Token</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.sessionId} style={{ borderBottom: "1px solid #f0e9f5" }}>
              <Td>{s.candidateName}</Td>
              <Td>{s.issueCategory}</Td>
              <Td>{s.sessionType}</Td>
              <Td>{s.status}</Td>
              <Td>{formatDateTime(s.scheduledAt)}</Td>
              <Td>{s.tokenNumber || "—"}</Td>
              <Td>
                <div style={{ display: "flex", gap: 6 }}>
                  {showScheduleAction && (
                    <button
                      onClick={() => onSchedule(s)}
                      style={btnSmallPrimary}
                    >
                      Schedule & Token
                    </button>
                  )}
                  {showCompleteAction && (
                    <button
                      onClick={() => onComplete(s)}
                      style={btnSmallGhost}
                    >
                      Complete / Escalate
                    </button>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Th = ({ children }) => (
  <th
    style={{
      textAlign: "left",
      padding: "8px 6px",
      fontWeight: 700,
      color: "#344560",
      fontSize: 12,
      borderBottom: "1px solid rgba(0,0,0,0.04)",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </th>
);

const Td = ({ children }) => (
  <td
    style={{
      padding: "7px 6px",
      color: "#333",
      verticalAlign: "top",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </td>
);

const btnSmallPrimary = {
  padding: "4px 10px",
  borderRadius: 999,
  border: "none",
  background: "#0b2a47",
  color: "#fff",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};

const btnSmallGhost = {
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid rgba(11,42,71,0.3)",
  background: "transparent",
  color: "#0b2a47",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};

/* ---------- CREATE REQUEST MODAL (Step 1) ---------- */

function CreateRequestModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    isChurchMember: false,
    memberId: "",
    issueCategory: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
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
      toast.success(
        `Request created. Ref: ${data?.requestCode || data?.caseId || ""}`
      );
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Unable to create counselling request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="New Counselling Request" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
        <label style={{ fontSize: 13 }}>
          Full name
          <input
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            style={inputStyle}
            required
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label style={{ fontSize: 13 }}>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              style={inputStyle}
            />
          </label>
          <label style={{ fontSize: 13 }}>
            Phone
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              style={inputStyle}
              required
            />
          </label>
        </div>

        <label style={{ fontSize: 13 }}>
          Issue category
          <select
            name="issueCategory"
            value={form.issueCategory}
            onChange={handleChange}
            style={inputStyle}
            required
          >
            <option value="">Select…</option>
            <option>Marriage &amp; Family</option>
            <option>Healing &amp; Deliverance</option>
            <option>Financial</option>
            <option>Depression / Anxiety</option>
            <option>Spiritual Growth</option>
            <option>Other</option>
          </select>
        </label>

        <label style={{ fontSize: 13 }}>
          Short description
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
          />
        </label>

        <label
          style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}
        >
          <input
            type="checkbox"
            name="isChurchMember"
            checked={form.isChurchMember}
            onChange={handleChange}
          />
          I am part of Mahima Ministry
        </label>

        {form.isChurchMember && (
          <label style={{ fontSize: 13 }}>
            Member ID (if any)
            <input
              name="memberId"
              value={form.memberId}
              onChange={handleChange}
              style={inputStyle}
            />
          </label>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 8,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              ...btnSmallGhost,
              padding: "6px 14px",
              fontSize: 12,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              ...btnSmallPrimary,
              padding: "6px 16px",
              fontSize: 12,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Create Request"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- SCHEDULE MODAL ---------- */

function ScheduleSessionModal({ session, onClose, onSaved }) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
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
      const data = res.data;
      toast.success(
        `Session scheduled. Token: ${data?.tokenNumber || "generated"}`
      );
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Unable to schedule session");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Schedule Counselling Session" onClose={onClose}>
      <form onSubmit={handleSave} style={{ display: "grid", gap: 10 }}>
        <div style={{ fontSize: 13 }}>
          <div style={{ fontWeight: 600 }}>{session.candidateName}</div>
          <div style={{ color: "#666" }}>{session.issueCategory}</div>
        </div>

        <label style={{ fontSize: 13 }}>
          Date &amp; Time
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            style={inputStyle}
            required
          />
        </label>

        <label style={{ fontSize: 13 }}>
          Location / Room
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={inputStyle}
            placeholder="Counselling room / church office"
            required
          />
        </label>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 8,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              ...btnSmallGhost,
              padding: "6px 14px",
              fontSize: 12,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              ...btnSmallPrimary,
              padding: "6px 16px",
              fontSize: 12,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Save & Generate Token"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- COMPLETE / ESCALATE MODAL ---------- */

function CompleteSessionModal({ session, onClose, onSaved }) {
  const [outcome, setOutcome] = useState("Resolved");
  const [notes, setNotes] = useState("");
  const [nextAt, setNextAt] = useState("");
  const [nextLocation, setNextLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const needsFollowup =
    outcome === "NeedsFurtherPrayer" || outcome === "EscalateToSeniorPastor";

  const handleSave = async (e) => {
    e.preventDefault();
    if (needsFollowup && (!nextAt || !nextLocation)) {
      toast.warn("Please provide date/time and location for follow-up");
      return;
    }

    setSaving(true);
    try {
      const body = {
        outcome,
        notes,
        nextScheduledAt: needsFollowup ? nextAt : null,
        nextLocation: needsFollowup ? nextLocation : null,
      };

      await api.post(
        `${API_BASE}/admin/sessions/${session.sessionId}/complete`,
        body
      );

      const label =
        outcome === "Resolved"
          ? "Session closed"
          : outcome === "NeedsFurtherPrayer"
          ? "Lay-hands session created"
          : "Senior pastor session created";

      toast.success(label);
      onSaved();
    } catch (err) {
      console.error(err);
      toast.error("Unable to update session");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Complete / Escalate Session" onClose={onClose}>
      <form onSubmit={handleSave} style={{ display: "grid", gap: 10 }}>
        <div style={{ fontSize: 13 }}>
          <div style={{ fontWeight: 600 }}>{session.candidateName}</div>
          <div style={{ color: "#666" }}>{session.issueCategory}</div>
        </div>

        <label style={{ fontSize: 13 }}>
          Outcome
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            style={inputStyle}
          >
            <option value="Resolved">Resolved / case closed</option>
            <option value="NeedsFurtherPrayer">
              Needs further prayer / lay-hands session
            </option>
            <option value="EscalateToSeniorPastor">
              Escalate to senior pastor
            </option>
          </select>
        </label>

        <label style={{ fontSize: 13 }}>
          Notes (for records)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
            placeholder="Brief summary of what was counselled / prayed for"
          />
        </label>

        {needsFollowup && (
          <>
            <label style={{ fontSize: 13 }}>
              Follow-up date &amp; time
              <input
                type="datetime-local"
                value={nextAt}
                onChange={(e) => setNextAt(e.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={{ fontSize: 13 }}>
              Follow-up location
              <input
                type="text"
                value={nextLocation}
                onChange={(e) => setNextLocation(e.target.value)}
                style={inputStyle}
                placeholder="Prayer room / main hall / pastor's office"
              />
            </label>
          </>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 8,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              ...btnSmallGhost,
              padding: "6px 14px",
              fontSize: 12,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              ...btnSmallPrimary,
              padding: "6px 16px",
              fontSize: 12,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- GENERIC MODAL + INPUT STYLE ---------- */

function Modal({ title, children, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          background: "#fff",
          borderRadius: 18,
          padding: 18,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  marginTop: 4,
  padding: "7px 9px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.18)",
  fontSize: 13,
};
