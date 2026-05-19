// src/features/prayerrequests/Page.jsx
//
// Community Prayer Wall — redesigned for clarity and warmth.
//   - Hero compose card with character count + toasts
//   - Stats summary (total / this week / answered)
//   - Tabs (All / Mine / Active / Answered) + status chips + search
//   - Light cards with inline-expand Respond (no permanent textarea on every card)
//   - "I'm praying" button with a local count (stored in browser)
//   - Status badges, friendly time-ago, owner-only delete
//   - Admin section: refined table, bulk select, print, status, close-with-comment
//
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Heart,
  HandHeart,
  Send,
  Loader2,
  Trash2,
  MessageCircle,
  X,
  Check,
  Search,
  Filter,
  Sparkles,
  Calendar,
  Printer,
  Lock,
  Globe,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Reply,
  CheckCheck,
  AlertCircle,
} from "lucide-react";
import { getToken as getStoredToken } from "../auth/authService";
import { getCurrentUser } from "../auth/permissionService";

/* ============================================================================
 *  API HELPERS
 * ========================================================================= */
const API_BASE =
  import.meta.env.VITE_API_BASE?.replace(/\/$/, "") || window.location.origin;
const PRAYER_REQUESTS_URL = `${API_BASE}/prayerrequests`;

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} ${res.statusText || ""} – ${text || "Request failed"}`
    );
  }
  return res.json().catch(() => null);
};

/* ============================================================================
 *  STATUS HELPERS
 * ========================================================================= */
const NORMALIZED_STATUSES = ["new", "open", "prayed", "closed"];

const STATUS_META = {
  new:    { label: "New",     dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  open:   { label: "Open",    dot: "bg-sky-500",     chip: "bg-sky-50 text-sky-700 border-sky-200" },
  prayed: { label: "Prayed",  dot: "bg-violet-500",  chip: "bg-violet-50 text-violet-700 border-violet-200" },
  closed: { label: "Answered",dot: "bg-slate-700",   chip: "bg-slate-100 text-slate-700 border-slate-300" },
};
const statusMeta = (s) => STATUS_META[(s || "new").toLowerCase()] || STATUS_META.new;

/* ============================================================================
 *  TIME-AGO
 * ========================================================================= */
const timeAgo = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
};

/* ============================================================================
 *  LOCAL PRAYER COUNTER (browser-only)
 * ========================================================================= */
const PRAYERS_KEY = "mahima_prayer_counts";
const I_PRAYED_KEY = "mahima_i_prayed";

const loadPrayerCounts = () => {
  try { return JSON.parse(localStorage.getItem(PRAYERS_KEY) || "{}"); }
  catch { return {}; }
};
const loadIPrayed = () => {
  try {
    const a = JSON.parse(localStorage.getItem(I_PRAYED_KEY) || "[]");
    return new Set(Array.isArray(a) ? a : []);
  } catch { return new Set(); }
};

/* ============================================================================
 *  AVATAR
 * ========================================================================= */
function Avatar({ name, anonymous }) {
  const letter = anonymous
    ? "A"
    : (name || "M").trim().charAt(0).toUpperCase() || "M";
  const grad = anonymous
    ? "from-slate-400 to-slate-500"
    : "from-indigo-500 via-violet-500 to-fuchsia-500";
  return (
    <div className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${grad} text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0`}>
      {letter}
    </div>
  );
}

/* ============================================================================
 *  TOASTS
 * ========================================================================= */
function Toasts({ items, onDismiss }) {
  return (
    <div className="fixed top-20 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto min-w-[260px] max-w-sm rounded-2xl shadow-xl border px-4 py-3 flex items-start gap-2.5 backdrop-blur bg-white/95 animate-[fadeIn_200ms_ease-out] ${
            t.kind === "error"
              ? "border-red-200"
              : t.kind === "success"
              ? "border-emerald-200"
              : "border-slate-200"
          }`}
        >
          {t.kind === "error" ? (
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          ) : t.kind === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
          )}
          <div className="flex-1 text-sm text-slate-800">{t.msg}</div>
          <button
            onClick={() => onDismiss(t.id)}
            className="text-slate-400 hover:text-slate-700"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
 *  MAIN PAGE
 * ========================================================================= */
export default function PrayerRequestsPage() {
  // Data
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Compose
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  // Respond — only one card expanded at a time
  const [expandedRespondId, setExpandedRespondId] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [responseSubmitting, setResponseSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all | mine | active | answered
  const [statusFilter, setStatusFilter] = useState(null); // null | "new" | "open" | "prayed" | "closed"

  // User / admin
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin tools
  const [selectedIds, setSelectedIds] = useState([]);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [closingId, setClosingId] = useState(null);
  const [closeComment, setCloseComment] = useState("");
  const [closeSubmitting, setCloseSubmitting] = useState(false);
  const [showAdminTable, setShowAdminTable] = useState(true);

  // Prayer counts (browser-only)
  const [prayerCounts, setPrayerCounts] = useState(loadPrayerCounts);
  const [iPrayed, setIPrayed] = useState(loadIPrayed);

  // Toasts
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);
  const pushToast = useCallback((msg, kind = "info", ttl = 3500) => {
    const id = ++toastIdRef.current;
    setToasts((arr) => [...arr, { id, msg, kind }]);
    setTimeout(() => setToasts((arr) => arr.filter((t) => t.id !== id)), ttl);
  }, []);
  const dismissToast = (id) => setToasts((arr) => arr.filter((t) => t.id !== id));

  const tokenRef = useRef(getStoredToken());

  /* -------------------------- LOAD USER + ADMIN -------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        setCurrentUser(u || null);
        const rawRoles = [];
        if (u?.role && typeof u.role === "string") rawRoles.push(u.role);
        if (Array.isArray(u?.roles)) {
          for (const r of u.roles) {
            if (!r) continue;
            if (typeof r === "string") rawRoles.push(r);
            else if (typeof r.name === "string") rawRoles.push(r.name);
            else if (typeof r.roleName === "string") rawRoles.push(r.roleName);
          }
        }
        const rolesLower = rawRoles.map((r) => r.toLowerCase().trim());
        setIsAdmin(
          rolesLower.some((r) =>
            ["admin", "administrator", "superadmin"].includes(r)
          )
        );
      } catch {
        setIsAdmin(false);
      }
    })();
  }, []);

  const myIdentifier = useMemo(() => {
    if (!currentUser) return null;
    return (
      currentUser.username ||
      currentUser.userName ||
      currentUser.displayName ||
      currentUser.email ||
      null
    );
  }, [currentUser]);

  const isMine = useCallback(
    (req) => {
      if (!myIdentifier || !req.createdBy) return false;
      return String(req.createdBy).toLowerCase() === String(myIdentifier).toLowerCase();
    },
    [myIdentifier]
  );

  /* ----------------------------- LOAD REQUESTS --------------------------- */
  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${PRAYER_REQUESTS_URL}?includeResponses=true`;
      const data = await fetchJson(url, {
        headers: {
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
      });
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      pushToast("Failed to load prayer requests.", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  /* --------------------------- SUBMIT NEW REQUEST ------------------------ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      pushToast("Please write your prayer request first.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        title: title?.trim() || null,
        message: message.trim(),
        anonymous,
        status: "new",
        assignedTo: null,
      };
      const url = `${PRAYER_REQUESTS_URL}?includeResponses=true`;
      const created = await fetchJson(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
        body: JSON.stringify(body),
      });
      setRequests((prev) => [created, ...prev]);
      setMessage("");
      setTitle("");
      setAnonymous(false);
      pushToast("Your prayer request has been shared. 🙏", "success");
    } catch (err) {
      console.error(err);
      pushToast("Couldn't submit. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------- RESPOND ------------------------------- */
  const handleAddResponse = async (req) => {
    if (!responseText.trim()) return;
    setResponseSubmitting(true);
    try {
      const url = `${PRAYER_REQUESTS_URL}/${req.id}/responses`;
      const created = await fetchJson(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
        body: JSON.stringify({ responseText: responseText.trim() }),
      });
      setRequests((prev) =>
        prev.map((r) =>
          r.id === req.id
            ? { ...r, responses: [...(r.responses || []), created] }
            : r
        )
      );
      setResponseText("");
      setExpandedRespondId(null);
      pushToast("Response shared.", "success");
    } catch (err) {
      console.error(err);
      pushToast("Failed to add response.", "error");
    } finally {
      setResponseSubmitting(false);
    }
  };

  /* -------------------------------- DELETE ------------------------------- */
  const handleDeleteRequest = async (id) => {
    if (!window.confirm("Delete this prayer request?")) return;
    try {
      const url = `${PRAYER_REQUESTS_URL}/${id}`;
      await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
      });
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      pushToast("Request deleted.", "info");
    } catch (err) {
      console.error(err);
      pushToast("Failed to delete request.", "error");
    }
  };

  /* --------------------------- PRAYER COUNTER ---------------------------- */
  const togglePray = (id) => {
    setIPrayed((prev) => {
      const next = new Set(prev);
      const prevCount = prayerCounts[id] || 0;
      let nextCount = prevCount;
      if (next.has(id)) {
        next.delete(id);
        nextCount = Math.max(0, prevCount - 1);
      } else {
        next.add(id);
        nextCount = prevCount + 1;
        pushToast("Thank you for praying. 🙏", "success", 2500);
      }
      setPrayerCounts((pc) => {
        const updated = { ...pc, [id]: nextCount };
        try { localStorage.setItem(PRAYERS_KEY, JSON.stringify(updated)); } catch {}
        return updated;
      });
      try { localStorage.setItem(I_PRAYED_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  /* ---------------------------- ADMIN: STATUS ---------------------------- */
  const handleStatusChange = async (id, newStatusRaw) => {
    const newStatus = (newStatusRaw || "").toLowerCase();
    if (!NORMALIZED_STATUSES.includes(newStatus)) return;
    setStatusUpdatingId(id);
    try {
      const url = `${PRAYER_REQUESTS_URL}/${id}`;
      const updated = await fetchJson(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, ...updated, status: newStatus } : r
        )
      );
      pushToast(`Status set to ${statusMeta(newStatus).label}.`, "info");
    } catch (e) {
      console.error(e);
      pushToast("Failed to update status.", "error");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  /* -------------------- ADMIN: CLOSE WITH COMMENT ------------------------ */
  const startClose = (req) => {
    setClosingId(req.id);
    setCloseComment(req.closeComment || "");
  };
  const cancelClose = () => {
    setClosingId(null);
    setCloseComment("");
  };
  const handleCloseWithComment = async () => {
    if (!closingId) return;
    setCloseSubmitting(true);
    try {
      const body = {
        status: "closed",
        closeComment: closeComment.trim() || null,
      };
      const url = `${PRAYER_REQUESTS_URL}/${closingId}`;
      const updated = await fetchJson(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
        body: JSON.stringify(body),
      });
      setRequests((prev) =>
        prev.map((r) =>
          r.id === closingId
            ? { ...r, ...updated, status: "closed", closeComment: body.closeComment }
            : r
        )
      );
      setClosingId(null);
      setCloseComment("");
      pushToast("Marked as answered. 🎉", "success");
    } catch (e) {
      console.error(e);
      pushToast("Failed to close prayer request.", "error");
    } finally {
      setCloseSubmitting(false);
    }
  };

  /* ----------------------- ADMIN: SELECTION/PRINT ------------------------ */
  const toggleSelected = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  /* ------------------------- SORT + FILTER LIST -------------------------- */
  const sortedRequests = useMemo(
    () =>
      [...requests].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    let list = sortedRequests;

    if (activeTab === "mine") list = list.filter(isMine);
    else if (activeTab === "active")
      list = list.filter((r) => {
        const s = (r.status || "new").toLowerCase();
        return s !== "closed";
      });
    else if (activeTab === "answered")
      list = list.filter((r) => (r.status || "").toLowerCase() === "closed");

    if (statusFilter) {
      list = list.filter(
        (r) => (r.status || "new").toLowerCase() === statusFilter
      );
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r.title || "").toLowerCase().includes(q) ||
          (r.message || "").toLowerCase().includes(q) ||
          (r.createdBy || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [sortedRequests, activeTab, statusFilter, search, isMine]);

  const allSelected =
    sortedRequests.length > 0 &&
    selectedIds.length === sortedRequests.length;
  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? [] : sortedRequests.map((r) => r.id));

  /* ------------------------------- STATS --------------------------------- */
  const stats = useMemo(() => {
    const now = Date.now();
    const week = 7 * 24 * 3600 * 1000;
    const thisWeek = sortedRequests.filter(
      (r) => now - new Date(r.createdAt).getTime() < week
    ).length;
    const answered = sortedRequests.filter(
      (r) => (r.status || "").toLowerCase() === "closed"
    ).length;
    const prayed = sortedRequests.filter(
      (r) => (r.status || "").toLowerCase() === "prayed"
    ).length;
    return {
      total: sortedRequests.length,
      thisWeek,
      answered,
      prayed,
    };
  }, [sortedRequests]);

  /* -------------------------------- PRINT -------------------------------- */
  const handlePrintSelected = () => {
    if (!selectedIds.length) return;
    const selected = sortedRequests.filter((r) => selectedIds.includes(r.id));
    const now = new Date();
    const htmlRows = selected
      .map((req) => {
        const responsesHtml = Array.isArray(req.responses)
          ? req.responses
              .map(
                (res) =>
                  `<li><strong>${
                    res.respondedBy || res.author || "Team"
                  }:</strong> ${(res.responseText || res.message || "")
                    .toString()
                    .replace(/</g, "&lt;")}</li>`
              )
              .join("")
          : "";
        return `
        <tr>
          <td>${req.anonymous ? "Anonymous" : req.createdBy || "Member"}</td>
          <td>${req.title || "—"}</td>
          <td>
            <div>${(req.message || "").toString().replace(/</g, "&lt;")}</div>
            ${responsesHtml ? `<ul style="margin-top:4px;padding-left:16px;font-size:11px;">${responsesHtml}</ul>` : ""}
          </td>
          <td>${new Date(req.createdAt).toLocaleString()}</td>
          <td>${req.status || "new"}</td>
        </tr>`;
      })
      .join("");
    const html = `
      <html>
        <head>
          <title>Prayer Requests</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 16px; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            h2 { font-size: 14px; margin-top: 0; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; vertical-align: top; }
            th { background: #f5f5f5; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Mahima Ministry – Prayer Requests</h1>
          <h2>Printed at ${now.toLocaleString()}</h2>
          <table>
            <thead>
              <tr>
                <th>Requester</th><th>Title</th><th>Message &amp; Responses</th>
                <th>Created At</th><th>Status</th>
              </tr>
            </thead>
            <tbody>${htmlRows}</tbody>
          </table>
        </body>
      </html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  /* ================================ UI =================================== */

  const TABS = [
    { id: "all",      label: "All",      count: sortedRequests.length },
    { id: "mine",     label: "Mine",     count: sortedRequests.filter(isMine).length },
    { id: "active",   label: "Active",   count: sortedRequests.filter((r) => (r.status||"new").toLowerCase()!=="closed").length },
    { id: "answered", label: "Answered", count: stats.answered },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-rose-50/40">
      <Toasts items={toasts} onDismiss={dismissToast} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* =================== HERO + COMPOSE =================== */}
        <section className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-xl">
          {/* decorative blobs */}
          <div className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-fuchsia-300/30 blur-3xl" />

          <div className="relative p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-md">
                <HandHeart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Prayer Wall
                </h1>
                <p className="text-indigo-100 text-sm">
                  Share what's on your heart. Pray for one another.
                </p>
              </div>
            </div>

            {/* Compose */}
            <form onSubmit={handleSubmit} className="mt-5 rounded-2xl bg-white/95 backdrop-blur p-4 sm:p-5 shadow-lg">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                maxLength={120}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Share your prayer request..."
                className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-y transition"
              />

              <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-violet-500 focus:ring-violet-400"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                    />
                    {anonymous ? <Lock className="w-3.5 h-3.5 text-slate-500" /> : <Globe className="w-3.5 h-3.5 text-slate-500" />}
                    {anonymous ? "Posting anonymously" : "Post as me"}
                  </label>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {message.length}/1000
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !message.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Share Request</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* =================== STATS =================== */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={MessageCircle} label="Total" value={stats.total} accent="text-indigo-600 bg-indigo-50" />
          <StatCard icon={Calendar}      label="This week" value={stats.thisWeek} accent="text-sky-600 bg-sky-50" />
          <StatCard icon={HandHeart}     label="Being prayed for" value={stats.prayed} accent="text-violet-600 bg-violet-50" />
          <StatCard icon={CheckCircle2}  label="Answered" value={stats.answered} accent="text-emerald-600 bg-emerald-50" />
        </section>

        {/* =================== TABS + SEARCH =================== */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 border-b border-slate-100">
            <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
                    activeTab === t.id
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {t.label}
                  <span className={`text-[11px] font-semibold rounded-full px-1.5 py-0.5 tabular-nums ${
                    activeTab === t.id ? "bg-white/15 text-white" : "bg-slate-200 text-slate-600"
                  }`}>{t.count}</span>
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, message, or person..."
                className="w-full pl-9 pr-3 py-2 rounded-full bg-slate-50 border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status chips */}
          <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-3">
            <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            <ChipButton active={statusFilter === null} onClick={() => setStatusFilter(null)}>
              Any
            </ChipButton>
            {NORMALIZED_STATUSES.map((s) => {
              const m = statusMeta(s);
              return (
                <ChipButton
                  key={s}
                  active={statusFilter === s}
                  onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                  className={statusFilter === s ? m.chip : ""}
                >
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${m.dot}`} />
                  {m.label}
                </ChipButton>
              );
            })}
          </div>
        </section>

        {/* =================== REQUESTS LIST =================== */}
        <section className="space-y-3">
          {loading ? (
            <SkeletonList />
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              hasAny={sortedRequests.length > 0}
              activeTab={activeTab}
              clearFilters={() => {
                setSearch("");
                setStatusFilter(null);
                setActiveTab("all");
              }}
            />
          ) : (
            filteredRequests.map((req) => (
              <PrayerCard
                key={req.id}
                req={req}
                meta={statusMeta(req.status)}
                mine={isMine(req)}
                isAdmin={isAdmin}
                expanded={expandedRespondId === req.id}
                onExpand={() => {
                  setExpandedRespondId((id) => (id === req.id ? null : req.id));
                  setResponseText("");
                }}
                responseText={responseText}
                setResponseText={setResponseText}
                onSubmitResponse={() => handleAddResponse(req)}
                responseSubmitting={responseSubmitting && expandedRespondId === req.id}
                onDelete={() => handleDeleteRequest(req.id)}
                onPray={() => togglePray(req.id)}
                prayedByMe={iPrayed.has(req.id)}
                prayerCount={prayerCounts[req.id] || 0}
              />
            ))
          )}
        </section>

        {/* =================== ADMIN SECTION =================== */}
        {isAdmin && (
          <section className="mt-6 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Admin Console
                  </h2>
                  <p className="text-xs text-slate-500">
                    Manage status, close with comment, and print.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintSelected}
                  disabled={!selectedIds.length}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold px-4 py-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print ({selectedIds.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdminTable((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-2 hover:bg-slate-50 transition"
                >
                  {showAdminTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showAdminTable ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {showAdminTable && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr className="text-left font-semibold">
                      <th className="px-3 py-2.5 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300"
                        />
                      </th>
                      <th className="px-3 py-2.5">Requester</th>
                      <th className="px-3 py-2.5">Title</th>
                      <th className="px-3 py-2.5">Message &amp; Responses</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">Created</th>
                      <th className="px-3 py-2.5 whitespace-nowrap text-center">Anon</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">Status</th>
                      <th className="px-3 py-2.5 whitespace-nowrap text-center">#R</th>
                      <th className="px-3 py-2.5 whitespace-nowrap text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRequests.map((req) => {
                      const m = statusMeta(req.status);
                      return (
                        <React.Fragment key={req.id}>
                          <tr className="border-t border-slate-100 hover:bg-slate-50/60">
                            <td className="px-3 py-2.5 align-top text-center">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(req.id)}
                                onChange={() => toggleSelected(req.id)}
                                className="rounded border-slate-300"
                              />
                            </td>
                            <td className="px-3 py-2.5 align-top whitespace-nowrap text-slate-800 font-medium">
                              {req.anonymous ? "Anonymous" : req.createdBy || "Member"}
                            </td>
                            <td className="px-3 py-2.5 align-top whitespace-nowrap text-slate-700">
                              {req.title || "—"}
                            </td>
                            <td className="px-3 py-2.5 align-top text-slate-700 max-w-md">
                              <div className="whitespace-pre-line line-clamp-3">{req.message}</div>
                              {Array.isArray(req.responses) && req.responses.length > 0 && (
                                <ul className="mt-1.5 border-t border-dashed border-slate-200 pt-1 space-y-0.5">
                                  {req.responses.map((res) => (
                                    <li key={res.id} className="text-[11px] text-slate-600">
                                      <span className="font-semibold">
                                        {res.respondedBy || res.author || "Team"}:
                                      </span>{" "}
                                      <span>{res.responseText || res.message}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {req.closeComment && (
                                <div className="mt-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1">
                                  <CheckCheck className="w-3 h-3 inline mr-1" />
                                  {req.closeComment}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 align-top whitespace-nowrap text-slate-600 text-xs">
                              {new Date(req.createdAt).toLocaleDateString()}
                              <span className="block text-[10px] text-slate-400">
                                {new Date(req.createdAt).toLocaleTimeString()}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 align-top text-center text-slate-700">
                              {req.anonymous ? "Yes" : "—"}
                            </td>
                            <td className="px-3 py-2.5 align-top whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-block w-2 h-2 rounded-full ${m.dot}`} />
                                <select
                                  value={(req.status || "new").toLowerCase()}
                                  onChange={(e) => handleStatusChange(req.id, e.target.value)}
                                  disabled={statusUpdatingId === req.id}
                                  className={`border rounded-full px-2.5 py-1 text-[11px] font-medium bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 ${m.chip}`}
                                >
                                  <option value="new">New</option>
                                  <option value="open">Open</option>
                                  <option value="prayed">Prayed</option>
                                  <option value="closed">Answered</option>
                                </select>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 align-top text-center text-slate-700 tabular-nums">
                              {Array.isArray(req.responses) ? req.responses.length : 0}
                            </td>
                            <td className="px-3 py-2.5 align-top text-center">
                              <button
                                type="button"
                                onClick={() => startClose(req)}
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                              >
                                <CheckCheck className="w-3 h-3" />
                                Answered
                              </button>
                            </td>
                          </tr>

                          {closingId === req.id && (
                            <tr>
                              <td className="px-3 pb-4 pt-0 bg-slate-50" colSpan={9}>
                                <div className="mt-2 flex flex-col sm:flex-row gap-2 items-start">
                                  <textarea
                                    value={closeComment}
                                    onChange={(e) => setCloseComment(e.target.value)}
                                    rows={3}
                                    placeholder="How did God answer this prayer?"
                                    className="w-full sm:flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={closeSubmitting}
                                      onClick={handleCloseWithComment}
                                      className="inline-flex items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-semibold px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-600 transition"
                                    >
                                      {closeSubmitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                                      Save &amp; Close
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelClose}
                                      className="inline-flex items-center justify-center rounded-full border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 hover:bg-white transition"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {sortedRequests.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-6 text-center text-xs text-slate-500">
                          No prayer requests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ============================================================================
 *  SUB-COMPONENTS
 * ========================================================================= */

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xl font-bold text-slate-900 tabular-nums leading-none">{value}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
        </div>
      </div>
    </div>
  );
}

function ChipButton({ active, children, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium transition ${
        active
          ? className || "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-200 rounded w-1/3" />
              <div className="h-2.5 bg-slate-100 rounded w-1/5" />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasAny, activeTab, clearFilters }) {
  return (
    <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-10 px-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-500 flex items-center justify-center mx-auto mb-3">
        <HandHeart className="w-6 h-6" />
      </div>
      {hasAny ? (
        <>
          <p className="text-sm font-medium text-slate-700">
            No requests match your filters.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Try changing the tab or clearing search.
          </p>
          <button
            onClick={clearFilters}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-700">
            The wall is quiet — be the first to share.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Whatever is on your heart, this community is here for you.
          </p>
        </>
      )}
    </div>
  );
}

function PrayerCard({
  req,
  meta,
  mine,
  isAdmin,
  expanded,
  onExpand,
  responseText,
  setResponseText,
  onSubmitResponse,
  responseSubmitting,
  onDelete,
  onPray,
  prayedByMe,
  prayerCount,
}) {
  const canDelete = mine || isAdmin;
  const responses = Array.isArray(req.responses) ? req.responses : [];

  return (
    <article className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition px-4 sm:px-5 py-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar name={req.createdBy} anonymous={req.anonymous} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {req.anonymous ? "Anonymous" : req.createdBy || "Member"}
                </p>
                {mine && (
                  <span className="text-[10px] uppercase tracking-wider font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-1.5 py-0.5">
                    you
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 border ${meta.chip}`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" /> {timeAgo(req.createdAt)}
              </p>
            </div>

            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 transition inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                title="Delete request"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {req.title && (
            <p className="mt-1.5 text-[15px] font-semibold text-slate-900 leading-snug">
              {req.title}
            </p>
          )}
          <p className="mt-1 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
            {req.message}
          </p>

          {/* Close comment when answered */}
          {req.closeComment && (
            <div className="mt-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 px-3 py-2 flex items-start gap-2">
              <CheckCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-xs text-emerald-900">
                <span className="font-semibold">Answered: </span>{req.closeComment}
              </div>
            </div>
          )}

          {/* Existing responses */}
          {responses.length > 0 && (
            <div className="mt-3 space-y-1.5 border-l-2 border-violet-100 pl-3">
              {responses.map((res) => (
                <div key={res.id} className="text-xs text-slate-700">
                  <span className="font-semibold text-violet-700">
                    {res.respondedBy || res.author || "Team"}
                  </span>{" "}
                  <span>{res.responseText || res.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onPray}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
                prayedByMe
                  ? "bg-rose-50 border-rose-200 text-rose-600"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600"
              }`}
              title={prayedByMe ? "You prayed for this" : "I'm praying"}
            >
              <Heart className={`w-3.5 h-3.5 ${prayedByMe ? "fill-rose-500 text-rose-500" : ""}`} />
              {prayedByMe ? "Praying" : "I'm praying"}
              {prayerCount > 0 && (
                <span className="tabular-nums text-[11px] bg-white/60 rounded-full px-1.5">
                  {prayerCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onExpand}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
                expanded
                  ? "bg-violet-500 text-white border-violet-500"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700"
              }`}
            >
              <Reply className="w-3.5 h-3.5" />
              Respond
              {responses.length > 0 && (
                <span className={`tabular-nums text-[11px] rounded-full px-1.5 ${
                  expanded ? "bg-white/20" : "bg-slate-100"
                }`}>
                  {responses.length}
                </span>
              )}
            </button>
          </div>

          {/* Inline respond form */}
          {expanded && (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={2}
                autoFocus
                placeholder="Write a kind, encouraging response..."
                className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-none"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">
                  Responses are visible to the community.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onExpand}
                    className="rounded-full border border-slate-200 text-slate-600 text-xs font-medium px-3 py-1.5 hover:bg-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={responseSubmitting || !responseText.trim()}
                    onClick={onSubmitResponse}
                    className="inline-flex items-center gap-1.5 rounded-full bg-violet-500 hover:bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {responseSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
