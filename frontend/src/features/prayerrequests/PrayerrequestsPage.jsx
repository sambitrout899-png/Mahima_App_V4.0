import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Heart,
  Send,
  Loader2,
  Trash2,
  MessageCircle,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
} from "lucide-react";
import { getToken as getStoredToken } from "../utils/auth";
import { getCurrentUser } from "../features/auth/permissionService";

// ---------- CONSTANTS ----------

const CATEGORIES = [
  { key: "all",          label: "All Prayers",   emoji: "🙏",  keywords: [] },
  { key: "healing",      label: "Healing",        emoji: "💚",  keywords: ["heal", "health", "sick", "ill", "hospital", "pain", "recovery", "doctor", "medical", "disease", "cancer", "surgery", "treatment"] },
  { key: "family",       label: "Family",          emoji: "👨‍👩‍👧", keywords: ["family", "marriage", "husband", "wife", "child", "children", "parent", "son", "daughter", "divorce", "sibling", "brother", "sister", "mother", "father"] },
  { key: "finance",      label: "Finance",         emoji: "💰",  keywords: ["financial", "finance", "money", "debt", "provision", "bills", "employment", "income", "poverty", "loan", "mortgage", "salary"] },
  { key: "work",         label: "Work/Career",     emoji: "💼",  keywords: ["work", "career", "job", "business", "promotion", "boss", "colleague", "interview", "workplace", "office"] },
  { key: "spiritual",    label: "Spiritual",       emoji: "✝️",  keywords: ["faith", "spiritual", "salvation", "baptism", "conviction", "repentance", "grow", "bible", "church", "ministry", "calling"] },
  { key: "grief",        label: "Grief & Loss",    emoji: "🕊️", keywords: ["loss", "grief", "death", "died", "passed away", "bereavement", "mourn", "funeral", "widow", "orphan"] },
  { key: "thanksgiving", label: "Thanksgiving",    emoji: "🌟",  keywords: ["thank", "praise", "grateful", "testimony", "blessed", "answered", "miracle", "breakthrough"] },
  { key: "urgent",       label: "Urgent",          emoji: "🔴",  keywords: [] }, // detected from ragStatus=red
];

const STATUSES = [
  { key: "all",    label: "All" },
  { key: "new",    label: "New" },
  { key: "open",   label: "In Prayer" },
  { key: "prayed", label: "Prayed" },
  { key: "closed", label: "Answered" },
];

const STATUS_META = {
  new:       { label: "New",        cls: "ent-badge-info" },
  open:      { label: "In Prayer",  cls: "ent-badge-warning" },
  prayed:    { label: "Prayed",     cls: "ent-badge-primary" },
  closed:    { label: "Answered",   cls: "ent-badge-success" },
  answered:  { label: "Answered",   cls: "ent-badge-success" },
  completed: { label: "Answered",   cls: "ent-badge-success" },
  done:      { label: "Answered",   cls: "ent-badge-success" },
  resolved:  { label: "Answered",   cls: "ent-badge-success" },
};

// ---------- API ----------

const API_BASE =
  import.meta.env.VITE_API_BASE?.replace(/\/$/, "") || window.location.origin;
const PRAYER_URL = `${API_BASE}/prayerrequests`;

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} – ${text || "Request failed"}`);
  }
  return res.json().catch(() => null);
};

// ---------- HELPERS ----------

/** Detect category from a prayer request using [Tag] prefix or keyword matching */
function detectCategory(req) {
  // 1. Check for embedded [category] prefix in title
  const match = (req.title || "").match(/^\[([^\]]+)\]/i);
  if (match) {
    const key = match[1].toLowerCase();
    if (CATEGORIES.find((c) => c.key === key)) return key;
  }
  // 2. Check ragStatus for urgent
  if (req.ragStatus === "red") return "urgent";
  // 3. Keyword scan on title + message
  const text = `${req.title || ""} ${req.message || ""}`.toLowerCase();
  for (const cat of CATEGORIES) {
    if (!cat.keywords?.length) continue;
    if (cat.keywords.some((kw) => text.includes(kw))) return cat.key;
  }
  return null;
}

/** Strip [Category] prefix from display title */
function displayTitle(req) {
  return (req.title || "").replace(/^\[[^\]]+\]\s*/, "").trim();
}

/** Format a date nicely */
function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function PrayerRequestsPage() {
  // Data
  const [requests, setRequests]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");

  // Form
  const [showForm, setShowForm]       = useState(false);
  const [formTitle, setFormTitle]     = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formAnonymous, setFormAnonymous] = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  // Filters
  const [search, setSearch]               = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter]   = useState("all");

  // Per-card UI state
  const [expandedResponses, setExpandedResponses] = useState(new Set());
  const [respondingTo, setRespondingTo]           = useState(null);
  const [responseText, setResponseText]           = useState("");
  const [responseSubmitting, setResponseSubmitting] = useState(false);
  const [prayingFor, setPrayingFor]               = useState(new Set());
  const [updatingStatus, setUpdatingStatus]       = useState(null);

  // User/role
  const [isAdmin, setIsAdmin]           = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const tokenRef = useRef(getStoredToken());

  // ---------- INIT ----------
  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        setCurrentUserId(u?.id || u?.userId || null);
        const rawRoles = [];
        if (u?.role && typeof u.role === "string") rawRoles.push(u.role);
        if (Array.isArray(u?.roles)) {
          for (const r of u.roles) {
            if (!r) continue;
            if (typeof r === "string") rawRoles.push(r);
            else if (r.name) rawRoles.push(r.name);
          }
        }
        const rolesLower = rawRoles.map((r) => r.toLowerCase().trim());
        setIsAdmin(
          rolesLower.some((r) =>
            ["admin", "administrator", "superadmin", "staff", "manager"].includes(r)
          )
        );
      } catch {
        setIsAdmin(false);
      }
    })();
    loadRequests();
  }, []);

  // ---------- LOAD ----------
  const loadRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchJson(`${PRAYER_URL}?includeResponses=true`, {
        headers: {
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
      });
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load prayer requests. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- SUBMIT ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formMessage.trim()) {
      setError("Please write your prayer request.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      // Embed category as [tag] prefix in title
      const titleWithCat = formCategory
        ? `[${formCategory}]${formTitle.trim() ? " " + formTitle.trim() : ""}`
        : formTitle.trim() || null;

      const created = await fetchJson(`${PRAYER_URL}?includeResponses=true`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
        body: JSON.stringify({
          title: titleWithCat,
          message: formMessage.trim(),
          anonymous: formAnonymous,
          status: "new",
          assignedTo: null,
        }),
      });

      setRequests((prev) => [created, ...prev]);
      setFormTitle("");
      setFormMessage("");
      setFormCategory("");
      setFormAnonymous(false);
      setShowForm(false);
      setSuccess(
        "Your request has been shared. The community is praying with you. 🙏"
      );
      setTimeout(() => setSuccess(""), 6000);
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- RESPOND ----------
  const handleRespond = async (req) => {
    if (!responseText.trim()) return;
    setResponseSubmitting(true);
    try {
      const created = await fetchJson(`${PRAYER_URL}/${req.id}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
        body: JSON.stringify({ responseText: responseText.trim() }),
      });

      const newResp = {
        id: created.id,
        author: created.respondedBy,
        message: created.responseText,
        createdAt: created.respondedAt,
      };
      setRequests((prev) =>
        prev.map((r) =>
          r.id === req.id
            ? { ...r, responses: [...(r.responses || []), newResp] }
            : r
        )
      );
      setResponseText("");
      setRespondingTo(null);
      // Auto-expand responses
      setExpandedResponses((prev) => new Set([...prev, req.id]));
    } catch {
      setError("Failed to add response.");
    } finally {
      setResponseSubmitting(false);
    }
  };

  // ---------- STATUS UPDATE (Admin) ----------
  const handleStatusUpdate = async (id, newStatus) => {
    setUpdatingStatus(id);
    try {
      await fetchJson(`${PRAYER_URL}/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
    } catch {
      setError("Failed to update status.");
    } finally {
      setUpdatingStatus(null);
    }
  };

  // ---------- DELETE ----------
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this prayer request?")) return;
    try {
      await fetch(`${PRAYER_URL}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
      });
      setRequests((prev) => prev.filter((r) => r.id !== id));
      if (respondingTo === id) setRespondingTo(null);
    } catch {
      setError("Failed to delete request.");
    }
  };

  // ---------- DERIVED DATA ----------

  const stats = useMemo(
    () => ({
      total:    requests.length,
      newCount: requests.filter((r) =>
        (r.status || "new").toLowerCase() === "new"
      ).length,
      inPrayer: requests.filter((r) =>
        ["open", "prayed"].includes((r.status || "").toLowerCase())
      ).length,
      answered: requests.filter((r) =>
        ["closed", "answered", "completed", "done", "resolved"].includes(
          (r.status || "").toLowerCase()
        )
      ).length,
      urgent: requests.filter((r) => r.ragStatus === "red").length,
    }),
    [requests]
  );

  const filtered = useMemo(() => {
    let list = [...requests].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((r) => {
        const s = (r.status || "new").toLowerCase();
        if (statusFilter === "closed")
          return ["closed", "answered", "completed", "done", "resolved"].includes(s);
        return s === statusFilter;
      });
    }

    // Category filter
    if (categoryFilter !== "all") {
      if (categoryFilter === "urgent") {
        list = list.filter((r) => r.ragStatus === "red");
      } else {
        list = list.filter((r) => detectCategory(r) === categoryFilter);
      }
    }

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.title || "").toLowerCase().includes(q) ||
          (r.message || "").toLowerCase().includes(q) ||
          (!r.anonymous && (r.createdBy || "").toLowerCase().includes(q))
      );
    }

    return list;
  }, [requests, search, statusFilter, categoryFilter]);

  // Category counts for chips
  const catCounts = useMemo(() => {
    const counts = {};
    for (const cat of CATEGORIES) {
      if (cat.key === "all") { counts.all = requests.length; continue; }
      if (cat.key === "urgent") { counts.urgent = stats.urgent; continue; }
      counts[cat.key] = requests.filter((r) => detectCategory(r) === cat.key).length;
    }
    return counts;
  }, [requests, stats.urgent]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div>
      {/* PAGE HEADER */}
      <div className="ent-page-header">
        <div style={{ flex: 1 }}>
          <p className="ent-page-eyebrow">Ministry</p>
          <h1 className="ent-page-title">Prayer Wall</h1>
          <p className="ent-page-subtitle">
            Lift up requests and stand together in prayer
          </p>
        </div>
        <div className="ent-page-actions">
          <button
            className="ent-btn ent-btn-secondary ent-btn-sm"
            onClick={loadRequests}
            disabled={loading}
          >
            <RefreshCw style={{ width: 13, height: 13 }} />
            Refresh
          </button>
          <button
            className="ent-btn ent-btn-primary"
            onClick={() => {
              setShowForm((v) => !v);
              setError("");
            }}
          >
            <Heart style={{ width: 14, height: 14 }} />
            {showForm ? "Close Form" : "Share a Request"}
          </button>
        </div>
      </div>

      {/* SUCCESS BANNER */}
      {success && (
        <div
          className="ent-alert ent-alert-success"
          style={{
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Check style={{ width: 15, height: 15, flexShrink: 0 }} />
          {success}
        </div>
      )}

      {/* SUBMIT FORM */}
      {showForm && (
        <div className="ent-section" style={{ marginBottom: 24 }}>
          <div className="ent-section-hd">
            <div>
              <h2 className="ent-section-title">Share Your Prayer Request</h2>
              <p className="ent-section-subtitle">
                Your request will be shared with the church community
              </p>
            </div>
          </div>
          <div className="ent-section-body">
            <form onSubmit={handleSubmit}>
              <div className="ent-form-grid">
                {/* Category */}
                <div className="ent-field">
                  <label className="ent-label">Category</label>
                  <select
                    className="ent-select"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    <option value="">— Select a category —</option>
                    {CATEGORIES.filter(
                      (c) => c.key !== "all" && c.key !== "urgent"
                    ).map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.emoji} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div className="ent-field">
                  <label className="ent-label">
                    Title{" "}
                    <span
                      style={{
                        color: "var(--enterprise-text-muted)",
                        fontWeight: 400,
                        fontSize: 12,
                      }}
                    >
                      (optional)
                    </span>
                  </label>
                  <input
                    className="ent-input"
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Prayer for my mother's healing"
                  />
                </div>

                {/* Message */}
                <div className="ent-field ent-field-full">
                  <label className="ent-label ent-label-required">
                    Prayer Request
                  </label>
                  <textarea
                    className="ent-textarea"
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    rows={4}
                    placeholder="Share what's on your heart. The community will stand with you in prayer."
                  />
                </div>

                {/* Footer */}
                <div
                  className="ent-field ent-field-full"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      fontSize: 14,
                      color: "var(--enterprise-text-secondary)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formAnonymous}
                      onChange={(e) => setFormAnonymous(e.target.checked)}
                      style={{
                        width: 15,
                        height: 15,
                        accentColor: "var(--enterprise-primary)",
                        cursor: "pointer",
                      }}
                    />
                    Post anonymously
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="ent-btn ent-btn-secondary"
                      onClick={() => setShowForm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="ent-btn ent-btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <Loader2
                          style={{
                            width: 14,
                            height: 14,
                            animation: "spin 1s linear infinite",
                          }}
                        />
                      ) : (
                        <Send style={{ width: 14, height: 14 }} />
                      )}
                      {submitting ? "Submitting..." : "Submit Request"}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div
                  className="ent-alert ent-alert-danger"
                  style={{ marginTop: 12 }}
                >
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ERROR (non-form) */}
      {error && !showForm && (
        <div
          className="ent-alert ent-alert-danger"
          style={{ marginBottom: 20 }}
        >
          {error}
        </div>
      )}

      {/* ADMIN KPI SUMMARY */}
      {isAdmin && requests.length > 0 && (
        <div className="ent-kpi-grid" style={{ marginBottom: 24 }}>
          <div className="ent-kpi-card">
            <div className="ent-kpi-value">{stats.total}</div>
            <div className="ent-kpi-label">Total Requests</div>
          </div>
          <div className="ent-kpi-card ent-kpi-card-info">
            <div className="ent-kpi-value">{stats.newCount}</div>
            <div className="ent-kpi-label">Awaiting Prayer</div>
          </div>
          <div className="ent-kpi-card ent-kpi-card-warning">
            <div className="ent-kpi-value">{stats.inPrayer}</div>
            <div className="ent-kpi-label">Being Prayed For</div>
          </div>
          <div className="ent-kpi-card ent-kpi-card-success">
            <div className="ent-kpi-value">{stats.answered}</div>
            <div className="ent-kpi-label">Prayers Answered</div>
          </div>
          {stats.urgent > 0 && (
            <div className="ent-kpi-card ent-kpi-card-danger">
              <div className="ent-kpi-value">{stats.urgent}</div>
              <div className="ent-kpi-label">Urgent Attention</div>
            </div>
          )}
        </div>
      )}

      {/* PRAYER WALL SECTION */}
      <div className="ent-section">
        <div className="ent-section-hd">
          <div>
            <h2 className="ent-section-title">Community Prayer Wall</h2>
            <p className="ent-section-subtitle">
              {filtered.length === requests.length
                ? `${requests.length} request${requests.length !== 1 ? "s" : ""}`
                : `Showing ${filtered.length} of ${requests.length} requests`}
            </p>
          </div>
        </div>

        {/* FILTERS AREA */}
        <div
          className="ent-section-body"
          style={{
            paddingBottom: 0,
            borderBottom: "1px solid var(--enterprise-border)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Search bar */}
            <div className="ent-search">
              <Search
                className="ent-search-icon"
                style={{ width: 14, height: 14 }}
              />
              <input
                type="text"
                placeholder="Search by name, title, or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Status tabs */}
            <div className="ent-tabs" style={{ borderBottom: "none", paddingBottom: 0 }}>
              {STATUSES.map((s) => {
                const count =
                  s.key === "all"
                    ? requests.length
                    : s.key === "new"
                    ? stats.newCount
                    : s.key === "open"
                    ? stats.inPrayer
                    : s.key === "closed"
                    ? stats.answered
                    : null;
                return (
                  <button
                    key={s.key}
                    className={`ent-tab ${
                      statusFilter === s.key ? "ent-tab-active" : ""
                    }`}
                    onClick={() => setStatusFilter(s.key)}
                  >
                    {s.label}
                    {count != null && count > 0 && (
                      <span className="ent-tab-count">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Category chips */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                paddingBottom: 12,
              }}
            >
              {CATEGORIES.map((cat) => {
                const count = catCounts[cat.key] || 0;
                // Don't show empty categories (except All and Urgent)
                if (
                  cat.key !== "all" &&
                  cat.key !== "urgent" &&
                  count === 0
                )
                  return null;
                if (cat.key === "urgent" && count === 0) return null;

                return (
                  <button
                    key={cat.key}
                    onClick={() => setCategoryFilter(cat.key)}
                    className={`ent-filter-chip ${
                      categoryFilter === cat.key ? "ent-filter-chip-active" : ""
                    }`}
                  >
                    <span
                      style={{ fontSize: 13, lineHeight: 1 }}
                      role="img"
                      aria-label={cat.label}
                    >
                      {cat.emoji}
                    </span>
                    {cat.label}
                    {count > 0 && (
                      <span
                        style={{
                          marginLeft: 2,
                          background:
                            categoryFilter === cat.key
                              ? "rgba(255,255,255,0.3)"
                              : "var(--enterprise-border)",
                          borderRadius: 999,
                          padding: "0 5px",
                          fontSize: 11,
                          fontWeight: 600,
                          lineHeight: "16px",
                          display: "inline-block",
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* REQUEST LIST */}
        <div className="ent-section-body-flush">
          {loading ? (
            <div
              style={{
                padding: "56px 0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                color: "var(--enterprise-text-muted)",
              }}
            >
              <Loader2
                style={{
                  width: 28,
                  height: 28,
                  animation: "spin 1s linear infinite",
                  color: "var(--enterprise-primary)",
                }}
              />
              <span style={{ fontSize: 14 }}>Loading prayer requests...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="ent-empty">
              <div className="ent-empty-icon">🙏</div>
              <p className="ent-empty-title">
                {search || categoryFilter !== "all" || statusFilter !== "all"
                  ? "No matching requests"
                  : "No prayer requests yet"}
              </p>
              <p className="ent-empty-text">
                {search
                  ? `No results for "${search}". Try a different keyword.`
                  : categoryFilter !== "all"
                  ? "No requests in this category. Try a different filter."
                  : "Be the first to share your heart with the community."}
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((req, idx) => (
                <PrayerCard
                  key={req.id}
                  req={req}
                  isAdmin={isAdmin}
                  currentUserId={currentUserId}
                  isLast={idx === filtered.length - 1}
                  expandedResponses={expandedResponses}
                  setExpandedResponses={setExpandedResponses}
                  respondingTo={respondingTo}
                  setRespondingTo={setRespondingTo}
                  responseText={responseText}
                  setResponseText={setResponseText}
                  responseSubmitting={responseSubmitting}
                  prayingFor={prayingFor}
                  setPrayingFor={setPrayingFor}
                  updatingStatus={updatingStatus}
                  onRespond={handleRespond}
                  onDelete={handleDelete}
                  onStatusUpdate={handleStatusUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PRAYER CARD
// ============================================================

function PrayerCard({
  req,
  isAdmin,
  currentUserId,
  isLast,
  expandedResponses,
  setExpandedResponses,
  respondingTo,
  setRespondingTo,
  responseText,
  setResponseText,
  responseSubmitting,
  prayingFor,
  setPrayingFor,
  updatingStatus,
  onRespond,
  onDelete,
  onStatusUpdate,
}) {
  const catKey = detectCategory(req);
  const cat = CATEGORIES.find((c) => c.key === catKey);
  const title = displayTitle(req);
  const status = (req.status || "new").toLowerCase();
  const statusMeta = STATUS_META[status] || { label: status, cls: "ent-badge-neutral" };
  const responseList = Array.isArray(req.responses) ? req.responses : [];
  const isExpanded = expandedResponses.has(req.id);
  const isRespondingHere = respondingTo === req.id;
  const isPraying = prayingFor.has(req.id);
  const canDelete =
    isAdmin ||
    (currentUserId && req.userId && String(req.userId) === String(currentUserId));

  const initials = req.anonymous
    ? "A"
    : (req.createdBy || "M").charAt(0).toUpperCase();

  const togglePraying = () => {
    setPrayingFor((prev) => {
      const next = new Set(prev);
      if (next.has(req.id)) next.delete(req.id);
      else next.add(req.id);
      return next;
    });
  };

  const toggleResponses = () => {
    setExpandedResponses((prev) => {
      const next = new Set(prev);
      if (next.has(req.id)) next.delete(req.id);
      else next.add(req.id);
      return next;
    });
  };

  const openRespondForm = () => {
    if (isRespondingHere) {
      setRespondingTo(null);
      setResponseText("");
    } else {
      setRespondingTo(req.id);
      setResponseText("");
    }
  };

  return (
    <div
      style={{
        borderBottom: isLast ? "none" : "1px solid var(--enterprise-border)",
        padding: "20px 24px",
        transition: "background 0.12s",
      }}
    >
      {/* HEADER ROW */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 10,
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            flexShrink: 0,
            background:
              "linear-gradient(135deg, var(--enterprise-primary) 0%, #0ea5e9 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 700,
            fontSize: 14,
            userSelect: "none",
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Author + date + category */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 3,
            }}
          >
            <span
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: "var(--enterprise-text-primary)",
              }}
            >
              {req.anonymous ? "Anonymous" : req.createdBy || "Church Member"}
            </span>
            <span
              style={{
                fontSize: 12,
                color: "var(--enterprise-text-muted)",
              }}
            >
              {fmtDate(req.createdAt)}
            </span>
            {cat && cat.key !== "all" && (
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "var(--enterprise-surface-subtle)",
                  border: "1px solid var(--enterprise-border)",
                  color: "var(--enterprise-text-secondary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontWeight: 500,
                }}
              >
                <span role="img" aria-label={cat.label} style={{ fontSize: 12 }}>
                  {cat.emoji}
                </span>
                {cat.label}
              </span>
            )}
          </div>

          {/* Title */}
          {title && (
            <div
              style={{
                fontWeight: 600,
                fontSize: 15,
                color: "var(--enterprise-text-primary)",
                lineHeight: 1.4,
              }}
            >
              {title}
            </div>
          )}
        </div>

        {/* Right: status + RAG + delete */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          {/* RAG dot for admin */}
          {isAdmin && req.ragStatus && req.ragStatus !== "green" && (
            <span
              title={req.ragReason || ""}
              style={{ fontSize: 13, lineHeight: 1, cursor: "help" }}
            >
              {req.ragStatus === "red" ? "🔴" : "🟡"}
            </span>
          )}

          {/* Status — admin gets a dropdown, members get a badge */}
          {isAdmin ? (
            <select
              className="ent-select"
              style={{
                fontSize: 12,
                padding: "3px 8px",
                height: "auto",
                minWidth: 118,
                cursor: "pointer",
              }}
              value={status}
              disabled={updatingStatus === req.id}
              onChange={(e) => onStatusUpdate(req.id, e.target.value)}
            >
              <option value="new">New</option>
              <option value="open">In Prayer</option>
              <option value="prayed">Prayed</option>
              <option value="closed">Answered</option>
            </select>
          ) : (
            <span className={`ent-badge ${statusMeta.cls}`}>
              {statusMeta.label}
            </span>
          )}

          {/* Delete */}
          {canDelete && (
            <button
              className="ent-btn ent-btn-ghost ent-btn-sm"
              style={{
                padding: "4px 6px",
                color: "var(--enterprise-danger)",
                opacity: 0.7,
              }}
              onClick={() => onDelete(req.id)}
              title="Delete request"
            >
              <Trash2 style={{ width: 13, height: 13 }} />
            </button>
          )}
        </div>
      </div>

      {/* MESSAGE */}
      <div
        style={{
          fontSize: 14,
          color: "var(--enterprise-text-secondary)",
          lineHeight: 1.65,
          whiteSpace: "pre-line",
          marginLeft: 48,
          marginBottom: 12,
        }}
      >
        {req.message}
      </div>

      {/* CLOSE COMMENT — shown when prayer is answered */}
      {req.closeComment && (
        <div
          style={{
            marginLeft: 48,
            marginBottom: 14,
            background: "rgba(16,185,129,0.06)",
            borderLeft: "3px solid var(--enterprise-success)",
            borderRadius: "0 6px 6px 0",
            padding: "10px 14px",
            fontSize: 13,
            color: "var(--enterprise-text-secondary)",
            lineHeight: 1.5,
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: "var(--enterprise-success)",
              marginRight: 6,
            }}
          >
            🙌 Answered:
          </span>
          {req.closeComment}
        </div>
      )}

      {/* ACTION ROW */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginLeft: 48,
          flexWrap: "wrap",
        }}
      >
        {/* I'll Pray */}
        <button
          className={`ent-btn ent-btn-sm ${
            isPraying ? "ent-btn-soft-primary" : "ent-btn-ghost"
          }`}
          onClick={togglePraying}
          style={{
            fontSize: 12,
            gap: 5,
            color: isPraying ? "var(--enterprise-primary)" : undefined,
          }}
        >
          🙏 {isPraying ? "Praying ✓" : "I'll Pray"}
        </button>

        {/* View responses */}
        {responseList.length > 0 && (
          <button
            className="ent-btn ent-btn-ghost ent-btn-sm"
            onClick={toggleResponses}
            style={{ fontSize: 12, gap: 5 }}
          >
            <MessageCircle style={{ width: 13, height: 13 }} />
            {responseList.length}{" "}
            {responseList.length === 1 ? "response" : "responses"}
            {isExpanded ? (
              <ChevronUp style={{ width: 12, height: 12 }} />
            ) : (
              <ChevronDown style={{ width: 12, height: 12 }} />
            )}
          </button>
        )}

        {/* Respond */}
        <button
          className="ent-btn ent-btn-ghost ent-btn-sm"
          onClick={openRespondForm}
          style={{ fontSize: 12, gap: 5 }}
        >
          <Send style={{ width: 12, height: 12 }} />
          {isRespondingHere ? "Cancel" : "Respond"}
        </button>
      </div>

      {/* RESPONSES LIST (expanded) */}
      {isExpanded && responseList.length > 0 && (
        <div
          style={{
            marginLeft: 48,
            marginTop: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {responseList.map((res, i) => (
            <div
              key={res.id || i}
              style={{
                background: "var(--enterprise-surface-subtle)",
                border: "1px solid var(--enterprise-border)",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    color: "var(--enterprise-primary)",
                    fontSize: 12,
                  }}
                >
                  {res.author || res.respondedBy || "Ministry Team"}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--enterprise-text-muted)",
                  }}
                >
                  {res.createdAt
                    ? new Date(res.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    : ""}
                </span>
              </div>
              <div
                style={{
                  color: "var(--enterprise-text-secondary)",
                  lineHeight: 1.55,
                }}
              >
                {res.message || res.responseText}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RESPOND FORM */}
      {isRespondingHere && (
        <div
          style={{
            marginLeft: 48,
            marginTop: 12,
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
          }}
        >
          <textarea
            className="ent-textarea"
            rows={2}
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Write an encouraging response or prayer..."
            style={{ flex: 1, fontSize: 13, resize: "none" }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                onRespond(req);
              }
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button
              className="ent-btn ent-btn-primary ent-btn-sm"
              disabled={responseSubmitting || !responseText.trim()}
              onClick={() => onRespond(req)}
              title="Send (Ctrl+Enter)"
              style={{ padding: "6px 10px" }}
            >
              {responseSubmitting ? (
                <Loader2
                  style={{
                    width: 13,
                    height: 13,
                    animation: "spin 1s linear infinite",
                  }}
                />
              ) : (
                <Send style={{ width: 13, height: 13 }} />
              )}
            </button>
            <button
              className="ent-btn ent-btn-ghost ent-btn-sm"
              onClick={() => {
                setRespondingTo(null);
                setResponseText("");
              }}
              style={{ padding: "6px 10px" }}
              title="Cancel"
            >
              <X style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
