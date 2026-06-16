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
  Image as ImageIcon,
  Mic,
  MicOff,
  UploadCloud,
  Save,
} from "lucide-react";
import { getToken as getStoredToken } from "../auth/authService";
import { getCurrentUser } from "../auth/permissionService";

/* ============================================================================
 *  API HELPERS
 * ========================================================================= */
const API_BASE =
  import.meta.env.VITE_API_BASE?.replace(/\/$/, "") || window.location.origin;
const PRAYER_REQUESTS_URL = `${API_BASE}/prayerrequests`;
const apiUrl = (path) => {
  const base = API_BASE.replace(/\/+$/, "");
  if (base.toLowerCase().endsWith("/api")) return `${base}${path}`;
  return `${base}/api${path}`;
};

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

const ragMeta = (status) => {
  const value = String(status || "green").toLowerCase();
  if (value === "red") return { label: "Red", dot: "bg-red-500", chip: "border-red-200 bg-red-50 text-red-700" };
  if (value === "amber") return { label: "Amber", dot: "bg-amber-500", chip: "border-amber-200 bg-amber-50 text-amber-700" };
  return { label: "Green", dot: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700" };
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
  const [childApplet, setChildApplet] = useState("prayers");
  const [testimonies, setTestimonies] = useState([]);
  const [testimoniesLoading, setTestimoniesLoading] = useState(false);
  const [editingTestimonyId, setEditingTestimonyId] = useState(null);
  const [testimonyDraft, setTestimonyDraft] = useState({ title: "", testimonyText: "", imageUrl: "", voiceUrl: "" });
  const [testimonySaving, setTestimonySaving] = useState(false);

  // Compose
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceLang, setVoiceLang] = useState("en-IN");

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
  const voiceRecognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      try { voiceRecognitionRef.current?.stop?.(); } catch {}
      voiceRecognitionRef.current = null;
    };
  }, []);

  const stopVoiceCapture = useCallback(() => {
    try { voiceRecognitionRef.current?.stop?.(); } catch {}
    voiceRecognitionRef.current = null;
    setVoiceListening(false);
    setVoiceBusy(false);
  }, []);

  const startVoiceCapture = useCallback((lang = voiceLang) => {
    if (voiceListening || voiceBusy) {
      stopVoiceCapture();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      pushToast("Voice typing is not available in this browser. Please use Chrome on Android or the Mahima app.", "error");
      return;
    }

    setVoiceLang(lang);
    setVoiceBusy(true);
    setVoiceListening(true);

    const recognition = new SpeechRecognition();
    voiceRecognitionRef.current = recognition;
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;

    const existing = message.trim();
    let finalText = "";

    recognition.onstart = () => {
      setVoiceBusy(false);
      pushToast("Listening now. Speak your prayer request, then review before sharing.", "info", 2500);
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      const spoken = (finalText || interim).trim();
      if (spoken) setMessage([existing, spoken].filter(Boolean).join(existing ? "\n" : ""));
    };

    recognition.onerror = () => {
      setVoiceListening(false);
      setVoiceBusy(false);
      voiceRecognitionRef.current = null;
      pushToast("Could not hear clearly. Please try again or type the request.", "error");
    };

    recognition.onend = () => {
      setVoiceListening(false);
      setVoiceBusy(false);
      voiceRecognitionRef.current = null;
      const spoken = finalText.trim();
      if (spoken) {
        setMessage([existing, spoken].filter(Boolean).join(existing ? "\n" : ""));
        pushToast("Voice request captured. Please review and share.", "success", 3000);
      }
    };

    try {
      recognition.start();
    } catch {
      setVoiceListening(false);
      setVoiceBusy(false);
      voiceRecognitionRef.current = null;
      pushToast("Microphone could not start. Please allow microphone access.", "error");
    }
  }, [message, pushToast, stopVoiceCapture, voiceBusy, voiceLang, voiceListening]);

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
        const positionNames = Array.isArray(u?.positions)
          ? u.positions.map((position) => String(position?.name || position?.positionName || "").toLowerCase().replace(/[^a-z0-9]+/g, ""))
          : [];
        const isCallCenterManager = positionNames.some((name) => name === "callcentermanager" || name === "callcentremanager");
        setIsAdmin(
          isCallCenterManager || rolesLower.some((r) =>
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

  const loadTestimonies = useCallback(async () => {
    setTestimoniesLoading(true);
    try {
      const data = await fetchJson(`${PRAYER_REQUESTS_URL}/testimonies`, {
        headers: {
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
      });
      setTestimonies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      pushToast("Failed to load testimonies.", "error");
    } finally {
      setTestimoniesLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    if (childApplet === "testimonies") loadTestimonies();
  }, [childApplet, loadTestimonies]);

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
      pushToast("Your prayer request has been shared. ??", "success");
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
        pushToast("Thank you for praying. ??", "success", 2500);
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
      pushToast("Marked as answered. ??", "success");
    } catch (e) {
      console.error(e);
      pushToast("Failed to close prayer request.", "error");
    } finally {
      setCloseSubmitting(false);
    }
  };

  const startEditTestimony = (t) => {
    setEditingTestimonyId(t.id);
    setTestimonyDraft({
      title: t.title || "",
      testimonyText: t.testimonyText || "",
      imageUrl: t.imageUrl || "",
      voiceUrl: t.voiceUrl || "",
    });
  };

  const saveTestimony = async (id) => {
    setTestimonySaving(true);
    try {
      const updated = await fetchJson(`${PRAYER_REQUESTS_URL}/testimonies/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
        body: JSON.stringify(testimonyDraft),
      });
      setTestimonies((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
      setEditingTestimonyId(null);
      pushToast("Testimony updated.", "success");
    } catch (err) {
      console.error(err);
      pushToast("Failed to update testimony.", "error");
    } finally {
      setTestimonySaving(false);
    }
  };

  const uploadTestimonyMedia = async (kind, file) => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(apiUrl("/uploads"), {
        method: "POST",
        headers: {
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
        body: form,
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Upload failed."));
      const data = await res.json();
      const url = data?.url || data?.absoluteUrl;
      if (!url) throw new Error("Upload did not return a file URL.");
      setTestimonyDraft((draft) => ({
        ...draft,
        [kind === "voice" ? "voiceUrl" : "imageUrl"]: url,
      }));
      pushToast(kind === "voice" ? "Voice record uploaded." : "Image uploaded.", "success");
    } catch (err) {
      console.error(err);
      pushToast(err?.message || "Upload failed.", "error");
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

  const adminInsights = useMemo(() => {
    const counts = { new: 0, open: 0, prayed: 0, closed: 0, reminders: 0, remindersToday: 0, red: 0, amber: 0, green: 0 };
    sortedRequests.forEach((request) => {
      const status = (request.status || "new").toLowerCase();
      counts[status] = (counts[status] || 0) + 1;
      counts.reminders += Number(request.reminderCount || 0);
      counts.remindersToday += Number(request.reminderTodayCount || 0);
      const rag = String(request.ragStatus || "green").toLowerCase();
      if (rag === "red") counts.red += 1;
      else if (rag === "amber") counts.amber += 1;
      else counts.green += 1;
    });
    return counts;
  }, [sortedRequests]);

  const activeQueue = sortedRequests.filter((request) => (request.status || "new").toLowerCase() !== "closed").slice(0, 5);

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <Toasts items={toasts} onDismiss={dismissToast} />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-6 border-b border-slate-100 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-5 text-white sm:p-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-50">
                <HandHeart className="h-4 w-4 text-emerald-200" />
                Community care
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Prayer Wall</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-emerald-50">
                A shared place for requests, encouragement, follow-up, and answered prayer testimonies.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <StatCard icon={MessageCircle} label="Total" value={stats.total} accent="text-slate-950 bg-white" compact />
                <StatCard icon={Calendar} label="This week" value={stats.thisWeek} accent="text-sky-700 bg-sky-50" compact />
                <StatCard icon={HandHeart} label="Being prayed for" value={stats.prayed} accent="text-violet-700 bg-violet-50" compact />
                <StatCard icon={CheckCircle2} label="Answered" value={stats.answered} accent="text-emerald-700 bg-emerald-50" compact />
              </div>
            </div>

            <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white text-emerald-800">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black">Today&apos;s care queue</h2>
                  <p className="mt-1 text-sm font-semibold text-emerald-50">{activeQueue.length} active requests need prayer or follow-up.</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {activeQueue.length ? activeQueue.map((request) => (
                  <button key={request.id} type="button" onClick={() => { setChildApplet("prayers"); setActiveTab("all"); setStatusFilter((request.status || "new").toLowerCase()); }} className="flex w-full items-center justify-between gap-3 rounded-lg bg-white/10 px-3 py-2 text-left text-sm font-bold text-white hover:bg-white/15">
                    <span className="truncate">{request.title || request.message || "Prayer request"}</span>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${statusMeta(request.status).chip}`}>{statusMeta(request.status).label}</span>
                  </button>
                )) : (
                  <div className="rounded-lg bg-white/10 px-3 py-3 text-sm font-semibold text-emerald-50">No active prayer requests right now.</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.18fr)]">
            <aside className="space-y-5">
              <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-950">Share a Request</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Type it, or tap the mic and speak it. Review once, then share.</p>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-black text-emerald-950">Speak instead of typing</div>
                      <div className="text-xs font-semibold leading-5 text-emerald-800">Tap the mic, speak your request, then review the text before sharing.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => startVoiceCapture(voiceLang)}
                      disabled={voiceBusy}
                      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-black shadow-sm transition disabled:opacity-60 ${voiceListening ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-emerald-700 text-white hover:bg-emerald-800"}`}
                    >
                      {voiceBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : voiceListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      {voiceListening ? "Stop listening" : "Start voice request"}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      ["en-IN", "English"],
                      ["hi-IN", "Hindi"],
                      ["pa-IN", "Punjabi"],
                    ].map(([code, label]) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setVoiceLang(code)}
                        className={`rounded-full border px-3 py-1 text-xs font-black ${voiceLang === code ? "border-emerald-700 bg-white text-emerald-800" : "border-emerald-200 bg-emerald-100/70 text-emerald-800 hover:bg-white"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={7}
                    maxLength={1000}
                    placeholder="Type here, or use the mic above and your spoken request will appear here..."
                    className="min-h-44 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-base font-semibold leading-7 text-slate-900 outline-none ring-emerald-100 transition focus:bg-white focus:ring-4"
                  />
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Optional title"
                    maxLength={120}
                    className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-emerald-100 transition focus:ring-4"
                  />
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                    <input type="checkbox" className="h-4 w-4 accent-emerald-700" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
                    {anonymous ? <Lock className="h-4 w-4 text-slate-500" /> : <Globe className="h-4 w-4 text-slate-500" />}
                    {anonymous ? "Anonymous" : "Post as me"}
                  </label>
                  <span className="text-xs font-bold text-slate-400">{message.length}/1000</span>
                </div>
                <button type="submit" disabled={submitting || !message.trim()} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? "Sharing..." : "Share Prayer Request"}
                </button>
              </form>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-slate-950">Prayer Flow</h2>
                <div className="mt-4 space-y-3">
                  {[
                    ["New", "Request is received by the community."],
                    ["Open", "A leader or prayer partner is following up."],
                    ["Prayed", "The request is actively covered in prayer."],
                    ["Answered", "Closed with a testimony or response."],
                  ].map(([label, copy]) => (
                    <div key={label} className="flex gap-3 rounded-lg bg-slate-50 p-3">
                      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${statusMeta(label.toLowerCase() === "answered" ? "closed" : label.toLowerCase()).dot}`} />
                      <div>
                        <div className="text-sm font-black text-slate-900">{label}</div>
                        <div className="text-xs font-semibold leading-5 text-slate-500">{copy}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </aside>

            <main className="min-w-0 space-y-5">
              <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm xl:flex-row xl:items-center xl:justify-between">
                <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1">
                  <button type="button" onClick={() => setChildApplet("prayers")} className={`rounded-md px-4 py-2 text-sm font-black ${childApplet === "prayers" ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}>Prayer Wall</button>
                  <button type="button" onClick={() => setChildApplet("testimonies")} className={`rounded-md px-4 py-2 text-sm font-black ${childApplet === "testimonies" ? "bg-emerald-700 text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}>Testimonies</button>
                </div>
                {childApplet === "prayers" && (
                  <div className="relative w-full xl:max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, message, or person" className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm font-semibold outline-none ring-emerald-100 focus:bg-white focus:ring-4" />
                  </div>
                )}
              </div>

              {childApplet === "testimonies" && (
                <TestimoniesApplet
                  testimonies={testimonies}
                  loading={testimoniesLoading}
                  editingId={editingTestimonyId}
                  draft={testimonyDraft}
                  setDraft={setTestimonyDraft}
                  onEdit={startEditTestimony}
                  onCancel={() => setEditingTestimonyId(null)}
                  onSave={saveTestimony}
                  saving={testimonySaving}
                  onUpload={uploadTestimonyMedia}
                />
              )}

              {childApplet === "prayers" && (
                <>
                  <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-100 p-3 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex items-center gap-1 overflow-x-auto">
                        {TABS.map((tab) => (
                          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-black transition ${activeTab === tab.id ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                            {tab.label}
                            <span className={`rounded-full px-2 py-0.5 text-[11px] ${activeTab === tab.id ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}>{tab.count}</span>
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-slate-400"><Filter className="h-3.5 w-3.5" /> Status</span>
                        <ChipButton active={statusFilter === null} onClick={() => setStatusFilter(null)}>Any</ChipButton>
                        {NORMALIZED_STATUSES.map((status) => {
                          const meta = statusMeta(status);
                          return (
                            <ChipButton key={status} active={statusFilter === status} onClick={() => setStatusFilter(statusFilter === status ? null : status)} className={statusFilter === status ? meta.chip : ""}>
                              <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </ChipButton>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  {isAdmin && (
                    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
                      <div className="flex flex-col gap-4 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div>
                            <h2 className="text-lg font-black text-slate-950">Admin Prayer Desk</h2>
                            <p className="text-sm font-semibold text-slate-500">Triage, update, close, and print prayer requests.</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button type="button" onClick={handlePrintSelected} disabled={!selectedIds.length} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                            <Printer className="h-4 w-4" /> Print {selectedIds.length ? `(${selectedIds.length})` : ""}
                          </button>
                          <button type="button" onClick={() => setShowAdminTable((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                            {showAdminTable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            {showAdminTable ? "Hide desk" : "Show desk"}
                          </button>
                        </div>
                      </div>
                      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                        <StatCard icon={AlertCircle} label="New" value={adminInsights.new || 0} accent="text-emerald-700 bg-emerald-50" />
                        <StatCard icon={Clock} label="Open" value={adminInsights.open || 0} accent="text-sky-700 bg-sky-50" />
                        <StatCard icon={HandHeart} label="Prayed" value={adminInsights.prayed || 0} accent="text-violet-700 bg-violet-50" />
                        <StatCard icon={AlertCircle} label="Reminders" value={adminInsights.remindersToday || 0} accent="text-amber-700 bg-amber-50" />
                        <StatCard icon={AlertCircle} label="RAG Red" value={adminInsights.red || 0} accent="text-red-700 bg-red-50" />
                        <StatCard icon={CheckCheck} label="Answered" value={adminInsights.closed || 0} accent="text-slate-700 bg-slate-100" />
                      </div>

                      {showAdminTable && (
                        <div className="overflow-x-auto border-t border-slate-100">
                          <table className="min-w-[1120px] text-sm">
                            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                              <tr className="text-left">
                                <th className="w-10 px-4 py-3 text-center"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded border-slate-300" /></th>
                                <th className="w-44 px-4 py-3">Requester</th>
                                <th className="min-w-[360px] px-4 py-3">Request</th>
                                <th className="w-36 px-4 py-3">Created</th>
                                <th className="w-40 px-4 py-3">Status</th>
                                <th className="w-28 px-4 py-3 text-center">RAG</th>
                                <th className="w-24 px-4 py-3 text-center">Replies</th>
                                <th className="w-32 px-4 py-3 text-center">Reminders</th>
                                <th className="w-32 px-4 py-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedRequests.map((req) => {
                                const meta = statusMeta(req.status);
                                const rag = ragMeta(req.ragStatus);
                                return (
                                  <React.Fragment key={req.id}>
                                    <tr className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                                      <td className="px-4 py-4 text-center"><input type="checkbox" checked={selectedIds.includes(req.id)} onChange={() => toggleSelected(req.id)} className="rounded border-slate-300" /></td>
                                      <td className="whitespace-nowrap px-4 py-4 font-bold text-slate-800">{req.anonymous ? "Anonymous" : req.createdBy || "Member"}{req.anonymous && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">Hidden</span>}</td>
                                      <td className="max-w-xl px-4 py-4">
                                        <div className="font-black text-slate-950">{req.title || "Prayer request"}</div>
                                        <div className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">{req.message}</div>
                                        {req.closeComment && <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"><CheckCheck className="mr-1 inline h-3.5 w-3.5" />{req.closeComment}</div>}
                                      </td>
                                      <td className="whitespace-nowrap px-4 py-4 text-xs font-bold text-slate-500">{new Date(req.createdAt).toLocaleDateString()}<span className="block text-slate-400">{new Date(req.createdAt).toLocaleTimeString()}</span></td>
                                      <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                                          <select value={(req.status || "new").toLowerCase()} onChange={(e) => handleStatusChange(req.id, e.target.value)} disabled={statusUpdatingId === req.id} className={`rounded-lg border px-2.5 py-2 text-xs font-black outline-none ring-emerald-100 focus:ring-4 ${meta.chip}`}>
                                            <option value="new">New</option>
                                            <option value="open">Open</option>
                                            <option value="prayed">Prayed</option>
                                            <option value="closed">Answered</option>
                                          </select>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${rag.chip}`} title={req.ragReason || "Prayer RAG status"}>
                                          <span className={`h-1.5 w-1.5 rounded-full ${rag.dot}`} />
                                          {rag.label}
                                        </span>
                                      </td>
                                      <td className="px-4 py-4 text-center font-black text-slate-700">{Array.isArray(req.responses) ? req.responses.length : 0}</td>
                                      <td className="px-4 py-4 text-center">
                                        <div className={`inline-flex min-w-10 items-center justify-center rounded-full px-2 py-1 text-xs font-black tabular-nums ${Number(req.reminderCount || 0) > 0 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`} title={req.lastReminderAtUtc ? `Last reminder: ${new Date(req.lastReminderAtUtc).toLocaleString()}` : "No reminders sent"}>
                                          {Number(req.reminderCount || 0)}
                                          {Number(req.reminderTodayCount || 0) > 0 && <span className="ml-1 rounded-full bg-amber-200 px-1 text-[10px] text-amber-900">+{req.reminderTodayCount}</span>}
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 text-right"><button type="button" onClick={() => startClose(req)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 hover:bg-emerald-100"><CheckCheck className="h-3.5 w-3.5" /> Answered</button></td>
                                    </tr>
                                    {closingId === req.id && (
                                      <tr>
                                        <td className="bg-slate-50 px-4 pb-4" colSpan={9}>
                                          <div className="mt-2 grid gap-2 rounded-lg border border-slate-200 bg-white p-3 lg:grid-cols-[1fr_auto] lg:items-start">
                                            <textarea value={closeComment} onChange={(e) => setCloseComment(e.target.value)} rows={3} placeholder="How did God answer this prayer?" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none ring-emerald-100 focus:ring-4" />
                                            <div className="flex gap-2">
                                              <button type="button" disabled={closeSubmitting} onClick={handleCloseWithComment} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white hover:bg-emerald-800 disabled:opacity-50">{closeSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save</button>
                                              <button type="button" onClick={cancelClose} className="min-h-10 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Cancel</button>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                              {sortedRequests.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-sm font-semibold text-slate-500">No prayer requests found.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  )}

                  <section className="grid gap-3 xl:grid-cols-2">
                    {loading ? (
                      <div className="xl:col-span-2"><SkeletonList /></div>
                    ) : filteredRequests.length === 0 ? (
                      <div className="xl:col-span-2"><EmptyState hasAny={sortedRequests.length > 0} activeTab={activeTab} clearFilters={() => { setSearch(""); setStatusFilter(null); setActiveTab("all"); }} /></div>
                    ) : (
                      filteredRequests.map((req) => (
                        <PrayerCard
                          key={req.id}
                          req={req}
                          meta={statusMeta(req.status)}
                          mine={isMine(req)}
                          isAdmin={isAdmin}
                          expanded={expandedRespondId === req.id}
                          onExpand={() => { setExpandedRespondId((id) => (id === req.id ? null : req.id)); setResponseText(""); }}
                          responseText={responseText}
                          setResponseText={setResponseText}
                          onSubmitResponse={() => handleAddResponse(req)}
                          responseSubmitting={responseSubmitting && expandedRespondId === req.id}
                          onDelete={() => handleDeleteRequest(req.id)}
                          onPray={() => togglePray(req.id)}
                          prayedByMe={iPrayed.has(req.id)}
                          prayerCount={prayerCounts[req.id] || 0}
                          reminderCount={Number(req.reminderCount || 0)}
                          reminderTodayCount={Number(req.reminderTodayCount || 0)}
                          lastReminderAtUtc={req.lastReminderAtUtc}
                          ragStatus={req.ragStatus}
                          ragReason={req.ragReason}
                          ragAgeHours={req.ragAgeHours}
                        />
                      ))
                    )}
                  </section>
                </>
              )}
            </main>
          </div>
        </section>
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

function TestimoniesApplet({
  testimonies,
  loading,
  editingId,
  draft,
  setDraft,
  onEdit,
  onCancel,
  onSave,
  saving,
  onUpload,
}) {
  if (loading) return <SkeletonList />;
  if (!testimonies.length) {
    return (
      <div className="rounded-3xl border border-dashed border-emerald-200 bg-white p-8 text-center shadow-sm">
        <Sparkles className="mx-auto h-10 w-10 text-emerald-500" />
        <h2 className="mt-3 text-lg font-bold text-slate-900">No testimonies yet</h2>
        <p className="mt-1 text-sm text-slate-500">When a prayer is marked answered, AI Counseller will draft a testimony here.</p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {testimonies.map((t) => {
        const editing = editingId === t.id;
        return (
          <article key={t.id} className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  <CheckCheck className="h-3.5 w-3.5" />
                  Answered Prayer Testimony
                </div>
                {editing ? (
                  <input
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-base font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                ) : (
                  <h2 className="mt-3 text-xl font-black text-slate-900">{t.title || "Answered Prayer"}</h2>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  {t.createdBy ? `${t.createdBy} · ` : ""}{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ""}
                </p>
              </div>
              {editing ? (
                <div className="flex gap-2">
                  <button type="button" onClick={() => onSave(t.id)} disabled={saving} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </button>
                  <button type="button" onClick={onCancel} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Cancel</button>
                </div>
              ) : (
                <button type="button" onClick={() => onEdit(t)} className="rounded-full border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50">
                  Edit testimony
                </button>
              )}
            </div>

            {editing ? (
              <div className="mt-4 space-y-3">
                <textarea
                  value={draft.testimonyText}
                  onChange={(e) => setDraft((d) => ({ ...d, testimonyText: e.target.value }))}
                  rows={6}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Upload image
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload("image", e.target.files?.[0])} />
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                    <Mic className="h-3.5 w-3.5" />
                    Upload voice
                    <input type="file" accept="audio/*" className="hidden" onChange={(e) => onUpload("voice", e.target.files?.[0])} />
                  </label>
                  {(draft.imageUrl || draft.voiceUrl) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                      <UploadCloud className="h-3.5 w-3.5" />
                      Media ready
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{t.testimonyText}</p>
            )}

            {!editing && (t.imageUrl || t.voiceUrl) && (
              <div className="mt-4 flex flex-wrap gap-3">
                {t.imageUrl && <img src={t.imageUrl} alt="Testimony" className="max-h-56 rounded-2xl border border-slate-100 object-cover" />}
                {t.voiceUrl && <audio controls src={t.voiceUrl} className="w-full max-w-md" />}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

function StatCard({ icon: Icon, label, value, accent, compact = false }) {
  return (
    <div className={`${compact ? "border-white/15 bg-white/10 text-white" : "border-slate-200 bg-white"} rounded-lg border px-4 py-3 shadow-sm`}>
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className={`text-2xl font-black tabular-nums leading-none ${compact ? "text-white" : "text-slate-950"}`}>{value}</div>
          <div className={`mt-1 truncate text-xs font-black uppercase tracking-wide ${compact ? "text-emerald-50" : "text-slate-500"}`}>{label}</div>
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
  reminderCount = 0,
  reminderTodayCount = 0,
  lastReminderAtUtc = null,
  ragStatus = null,
  ragReason = "",
  ragAgeHours = null,
}) {
  const canDelete = mine || isAdmin;
  const responses = Array.isArray(req.responses) ? req.responses : [];
  const rag = ragMeta(ragStatus);

  return (
    <article className="group flex min-h-[260px] flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
      <div className="flex items-start gap-3">
        <Avatar name={req.createdBy} anonymous={req.anonymous} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-black text-slate-950">{req.anonymous ? "Anonymous" : req.createdBy || "Member"}</p>
                {mine && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">Mine</span>}
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${meta.chip}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
                {isAdmin && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${rag.chip}`}
                    title={`${ragReason || "Prayer RAG status"}${ragAgeHours !== null && ragAgeHours !== undefined ? ` (${ragAgeHours}h old)` : ""}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${rag.dot}`} />
                    RAG {rag.label}
                  </span>
                )}
                {isAdmin && reminderCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700"
                    title={lastReminderAtUtc ? `Last reminder: ${new Date(lastReminderAtUtc).toLocaleString()}` : "Prayer response reminders sent"}
                  >
                    <AlertCircle className="h-3 w-3" />
                    {reminderCount} reminder{reminderCount === 1 ? "" : "s"}
                    {reminderTodayCount > 0 && <span className="rounded-full bg-amber-200 px-1 text-amber-900">+{reminderTodayCount} today</span>}
                  </span>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-400"><Clock className="h-3.5 w-3.5" />{timeAgo(req.createdAt)}</p>
            </div>
            {canDelete && (
              <button type="button" onClick={onDelete} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100" title="Delete request">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex-1">
        <h3 className="text-lg font-black leading-snug text-slate-950">{req.title || "Prayer request"}</h3>
        <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-7 text-slate-700">{req.message}</p>

        {req.closeComment && (
          <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
            <div className="flex items-start gap-2 text-sm font-bold leading-6 text-emerald-900">
              <CheckCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <span>{req.closeComment}</span>
            </div>
          </div>
        )}

        {responses.length > 0 && (
          <div className="mt-4 space-y-2 border-l-2 border-emerald-100 pl-3">
            {responses.slice(0, 3).map((res) => (
              <div key={res.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-700">
                <span className="font-black text-emerald-700">{res.respondedBy || res.author || "Team"}:</span>{" "}
                {res.responseText || res.message}
              </div>
            ))}
            {responses.length > 3 && <div className="text-xs font-bold text-slate-400">+{responses.length - 3} more responses</div>}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <button type="button" onClick={onPray} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-black transition ${prayedByMe ? "border-rose-200 bg-rose-50 text-rose-600" : "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"}`} title={prayedByMe ? "You prayed for this" : "I'm praying"}>
          <Heart className={`h-3.5 w-3.5 ${prayedByMe ? "fill-rose-500 text-rose-500" : ""}`} />
          {prayedByMe ? "Praying" : "Pray"}
          {prayerCount > 0 && <span className="rounded-full bg-white/70 px-1.5 text-[11px] tabular-nums">{prayerCount}</span>}
        </button>
        <button type="button" onClick={onExpand} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-black transition ${expanded ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"}`}>
          <Reply className="h-3.5 w-3.5" />
          Respond
          {responses.length > 0 && <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${expanded ? "bg-white/20" : "bg-slate-100"}`}>{responses.length}</span>}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <textarea value={responseText} onChange={(e) => setResponseText(e.target.value)} rows={3} autoFocus placeholder="Write an encouraging response..." className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none ring-emerald-100 focus:ring-4" />
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-semibold text-slate-400">Responses are visible on the prayer wall.</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onExpand} className="min-h-9 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-white">Cancel</button>
              <button type="button" disabled={responseSubmitting || !responseText.trim()} onClick={onSubmitResponse} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                {responseSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}



