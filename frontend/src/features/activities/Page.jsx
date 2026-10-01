// src/features/activities/Page.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Crown,
  Edit3,
  Filter,
  Flame,
  Loader2,
  MessageCircle,
  Moon,
  MoreVertical,
  Plus,
  RefreshCw,
  Repeat,
  Search,
  Send,
  Settings,
  Sliders,
  Star,
  Sun,
  Trash2,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import api from "../../api";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS = {
  PENDING:     { key: "pending",     label: "Pending",     color: "#e8a020", bg: "#fffbeb", icon: Circle },
  IN_PROGRESS: { key: "in_progress", label: "In Progress", color: "#3b82f6", bg: "#eff6ff", icon: Loader2 },
  COMPLETED:   { key: "completed",   label: "Completed",   color: "#22c55e", bg: "#f0fdf4", icon: CheckCircle2 },
  OVERDUE:     { key: "overdue",     label: "Overdue",     color: "#ef4444", bg: "#fef2f2", icon: AlertTriangle },
  CANCELLED:   { key: "cancelled",   label: "Cancelled",   color: "#94a3b8", bg: "#f8fafc", icon: X },
};

const PRIORITY = {
  low:    { label: "Low",    color: "#64748b", dot: "#cbd5e1" },
  medium: { label: "Medium", color: "#f59e0b", dot: "#fbbf24" },
  high:   { label: "High",   color: "#ef4444", dot: "#f87171" },
  urgent: { label: "Urgent", color: "#dc2626", dot: "#dc2626" },
};

const CATEGORY = {
  meeting:    { label: "Meeting",    icon: Users,    color: "#6366f1" },
  prayer:     { label: "Prayer",     icon: Moon,     color: "#8b5cf6" },
  outreach:   { label: "Outreach",   icon: Sun,      color: "#f97316" },
  follow_up:  { label: "Follow-up",  icon: TrendingUp, color: "#0ea5e9" },
  admin:      { label: "Admin",      icon: Settings, color: "#64748b" },
  worship:    { label: "Worship",    icon: Star,     color: "#ec4899" },
  reminder:   { label: "Reminder",   icon: Bell,     color: "#f59e0b" },
  other:      { label: "Other",      icon: Activity, color: "#14b8a6" },
};

const DEFAULT_CHURCH_EVENTS = [
  { id: "sat_meeting",   label: "Saturday Evening Meeting", day: 6, time: "18:00", category: "meeting",  priority: "high",   icon: "🙌" },
  { id: "tue_prayer",    label: "Tuesday Night Prayer",     day: 2, time: "19:00", category: "prayer",   priority: "medium", icon: "🙏" },
  { id: "fri_prayer",    label: "Friday Night Prayer",      day: 5, time: "19:00", category: "prayer",   priority: "medium", icon: "🕯️" },
];

const DEFAULT_JAI_MASIH_TEMPLATES = [
  { id: "jm_morning",  label: "Morning Jai Masih", time: "07:00", message: "Jai Masih Ji! 🙏 Good morning, beloved. May today be filled with God's grace and strength. You are loved! 💛" },
  { id: "jm_reminder", label: "Event Reminder",    time: "60",   message: "Jai Masih Ji! This is a friendly reminder about today's event. See you there! 🙌" },
  { id: "jm_prayer",   label: "Prayer Call",       time: "30",   message: "Jai Masih Ji! 🙏 Come join us for prayer. Together in His presence. ✨" },
];

const RECUR_PATTERNS = [
  { value: "none",    label: "Does not repeat" },
  { value: "daily",   label: "Daily" },
  { value: "weekly",  label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const pad = (n) => String(n).padStart(2, "0");

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return `${pad(d.getDate())} ${d.toLocaleString("en", { month: "short" })} ${d.getFullYear()}`;
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatRelative(iso) {
  if (!iso) return "";
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const diff = Math.round((then - now) / 60000);
  if (diff < -1440) return `${Math.round(-diff / 1440)}d overdue`;
  if (diff < -60)   return `${Math.round(-diff / 60)}h overdue`;
  if (diff < 0)     return `${-diff}m overdue`;
  if (diff === 0)   return "Due now";
  if (diff < 60)    return `in ${diff}m`;
  if (diff < 1440)  return `in ${Math.round(diff / 60)}h`;
  return `in ${Math.round(diff / 1440)}d`;
}

function isOverdue(activity) {
  if (!activity.dueDate) return false;
  if (["completed", "cancelled"].includes(activity.status)) return false;
  return new Date(activity.dueDate) < new Date();
}

function resolveStatus(activity) {
  if (isOverdue(activity)) return "overdue";
  return activity.status || "pending";
}

function nextOccurrence(dayOfWeek, timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const now = new Date();
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  const diff = (dayOfWeek - now.getDay() + 7) % 7;
  d.setDate(d.getDate() + (diff === 0 && d <= now ? 7 : diff));
  return d.toISOString();
}

function normalizeActivity(raw) {
  return {
    id:          raw.id ?? raw.Id ?? uid(),
    title:       raw.title ?? raw.Title ?? raw.name ?? "",
    description: raw.description ?? raw.Description ?? "",
    status:      raw.status ?? raw.Status ?? "pending",
    priority:    raw.priority ?? raw.Priority ?? "medium",
    category:    raw.category ?? raw.Category ?? "other",
    dueDate:     raw.dueDate ?? raw.DueDate ?? raw.due_date ?? null,
    startDate:   raw.startDate ?? raw.StartDate ?? null,
    assignees:   raw.assignees ?? raw.Assignees ?? [],
    tags:        raw.tags ?? raw.Tags ?? [],
    notes:       raw.notes ?? raw.Notes ?? "",
    recurring:   raw.recurring ?? raw.Recurring ?? { pattern: "none" },
    reminders:   raw.reminders ?? raw.Reminders ?? [],
    followUps:   raw.followUps ?? raw.FollowUps ?? [],
    createdAt:   raw.createdAt ?? raw.CreatedAt ?? new Date().toISOString(),
    completedAt: raw.completedAt ?? raw.CompletedAt ?? null,
    eventRef:    raw.eventRef ?? null,
    isAutoGen:   raw.isAutoGen ?? false,
  };
}

function defaultActivity() {
  return {
    id: null,
    title: "",
    description: "",
    status: "pending",
    priority: "medium",
    category: "other",
    dueDate: "",
    startDate: "",
    assignees: [],
    tags: [],
    notes: "",
    recurring: { pattern: "none" },
    reminders: [],
    followUps: [],
    isAutoGen: false,
  };
}

function getArray(res) {
  const d = res?.data ?? res;
  const arr = Array.isArray(d) ? d : d?.items ?? d?.Items ?? d?.data ?? d?.Data ?? [];
  return Array.isArray(arr) ? arr : [];
}

function apiError(err, fallback) {
  const d = err?.response?.data;
  return (typeof d === "string" ? d : d?.message) || err?.message || fallback;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner({ size = 18 }) {
  return <Loader2 size={size} style={{ animation: "act-spin 0.8s linear infinite" }} />;
}

function StatusBadge({ status }) {
  const s = STATUS[status?.toUpperCase()] ?? STATUS.PENDING;
  const Icon = s.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      color: s.color, background: s.bg, border: `1px solid ${s.color}33`,
    }}>
      <Icon size={11} />
      {s.label}
    </span>
  );
}

function PriorityDot({ priority }) {
  const p = PRIORITY[priority] ?? PRIORITY.medium;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 700, color: p.color,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.dot, display: "inline-block" }} />
      {p.label}
    </span>
  );
}

function CategoryBadge({ category }) {
  const c = CATEGORY[category] ?? CATEGORY.other;
  const Icon = c.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700,
      color: c.color, background: `${c.color}18`, border: `1px solid ${c.color}33`,
    }}>
      <Icon size={10} />
      {c.label}
    </span>
  );
}

// ─── Activity Radar (SVG spider chart) ───────────────────────────────────────

function ActivityRadar({ activities }) {
  const categories = Object.keys(CATEGORY);
  const N = categories.length;
  const R = 80;
  const cx = 110;
  const cy = 110;

  const counts = useMemo(() => {
    const map = {};
    categories.forEach((c) => { map[c] = 0; });
    activities.forEach((a) => { if (map[a.category] !== undefined) map[a.category]++; });
    return map;
  }, [activities]);

  const maxCount = Math.max(...Object.values(counts), 1);

  const points = categories.map((cat, i) => {
    const angle = (2 * Math.PI * i) / N - Math.PI / 2;
    const r = (counts[cat] / maxCount) * R;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      lx: cx + (R + 22) * Math.cos(angle),
      ly: cy + (R + 22) * Math.sin(angle),
      cat,
    };
  });

  const gridPoints = (scale) =>
    categories.map((_, i) => {
      const angle = (2 * Math.PI * i) / N - Math.PI / 2;
      return `${cx + R * scale * Math.cos(angle)},${cy + R * scale * Math.sin(angle)}`;
    }).join(" ");

  const dataPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";

  return (
    <svg viewBox="0 0 220 220" width="220" height="220" style={{ overflow: "visible" }}>
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon key={s} points={gridPoints(s)}
          fill="none" stroke="#e8e0d0" strokeWidth={s === 1 ? 1.5 : 0.8} />
      ))}
      {categories.map((_, i) => {
        const angle = (2 * Math.PI * i) / N - Math.PI / 2;
        return (
          <line key={i}
            x1={cx} y1={cy}
            x2={cx + R * Math.cos(angle)}
            y2={cy + R * Math.sin(angle)}
            stroke="#e0d8cc" strokeWidth={0.8} />
        );
      })}
      <polygon points={points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="rgba(107,79,29,0.15)" stroke="#b89b58" strokeWidth={2} />
      {points.map((p) => (
        <circle key={p.cat} cx={p.x} cy={p.y} r={3.5}
          fill="#b89b58" stroke="#fff" strokeWidth={1.5} />
      ))}
      {points.map((p) => {
        const c = CATEGORY[p.cat];
        return (
          <text key={p.cat} x={p.lx} y={p.ly}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="8.5" fontWeight="700" fill={c?.color ?? "#6b4f1d"}>
            {c?.label ?? p.cat}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, bg, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 18px", borderRadius: 16,
        background: active ? bg : "#fff",
        border: `1.5px solid ${active ? color : "#eee2cf"}`,
        cursor: "pointer", textAlign: "left",
        boxShadow: active ? `0 4px 20px ${color}33` : "0 2px 10px rgba(80,60,28,0.06)",
        transition: "all 160ms ease",
        fontFamily: "inherit",
      }}
    >
      <span style={{
        width: 42, height: 42, borderRadius: 12,
        background: `${color}20`, display: "flex",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={20} color={color} />
      </span>
      <span>
        <span style={{ display: "block", fontSize: 22, fontWeight: 900, color: active ? color : "#332817", lineHeight: 1 }}>
          {value}
        </span>
        <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8a7a5c", marginTop: 2 }}>
          {label}
        </span>
      </span>
    </button>
  );
}

// ─── Follow-up Timeline ───────────────────────────────────────────────────────

function FollowUpTimeline({ followUps, onAdd }) {
  const [note, setNote] = useState("");
  return (
    <div style={{ marginTop: 8 }}>
      {followUps.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
          {followUps.map((f, i) => (
            <div key={i} style={{
              display: "flex", gap: 10, padding: "8px 10px",
              background: "#f8f4ec", borderRadius: 10, fontSize: 12,
            }}>
              <span style={{ color: "#b89b58", fontWeight: 700, whiteSpace: "nowrap" }}>
                {formatDate(f.date)}
              </span>
              <span style={{ color: "#4a3b20" }}>{f.note}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="act-input"
          placeholder="Add follow-up note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && note.trim()) {
              onAdd({ date: new Date().toISOString(), note: note.trim(), by: "me" });
              setNote("");
            }
          }}
          style={{ flex: 1, fontSize: 12, height: 36 }}
        />
        <button
          type="button"
          className="act-btn act-btn-soft"
          style={{ padding: "0 14px", height: 36, fontSize: 12 }}
          onClick={() => {
            if (note.trim()) {
              onAdd({ date: new Date().toISOString(), note: note.trim(), by: "me" });
              setNote("");
            }
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 20;

export default function ActivitiesPage() {
  // ── State ──
  const [activities, setActivities] = useState([]);
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  const [search, setSearch]               = useState("");
  const [filterStatus, setFilterStatus]   = useState("all");
  const [filterCat, setFilterCat]         = useState("all");
  const [filterPri, setFilterPri]         = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [sortBy, setSortBy]               = useState("dueDate");
  const [page, setPage]                   = useState(1);

  const [showModal, setShowModal]         = useState(false);
  const [editingId, setEditingId]         = useState(null);
  const [form, setForm]                   = useState(defaultActivity());
  const [formError, setFormError]         = useState("");
  const [assigneeSearch, setAssigneeSearch] = useState("");

  const [showAutoGen, setShowAutoGen]     = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showSettings, setShowSettings]   = useState(false);
  const [showFollowUp, setShowFollowUp]   = useState(null); // activity id

  const [churchEvents, setChurchEvents]   = useState(() => {
    try { return JSON.parse(localStorage.getItem("mahima_church_events") || "null") || DEFAULT_CHURCH_EVENTS; }
    catch { return DEFAULT_CHURCH_EVENTS; }
  });
  const [genWeeks, setGenWeeks]           = useState(4);
  const [genSelected, setGenSelected]     = useState(new Set(DEFAULT_CHURCH_EVENTS.map((e) => e.id)));
  const [generating, setGenerating]       = useState(false);

  const [jaiTemplates, setJaiTemplates]   = useState(DEFAULT_JAI_MASIH_TEMPLATES);
  const [reminderActivity, setReminderActivity] = useState(null);
  const [reminderNote, setReminderNote]   = useState("");
  const [reminderSent, setReminderSent]   = useState(false);

  const [notifications, setNotifications] = useState([]);

  // ── Fetch ──
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/activities");
      const raw = getArray(res);
      setActivities(raw.map(normalizeActivity));
    } catch (err) {
      // If endpoint doesn't exist yet, start with empty list
      if (err?.response?.status === 404) { setActivities([]); }
      else { setError(apiError(err, "Unable to load activities.")); }
    } finally { setLoading(false); }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/users", { params: { limit: 500 } });
      const raw = getArray(res);
      setUsers(raw.map((u) => ({
        id:    String(u.id ?? u.Id ?? ""),
        name:  u.displayName ?? u.DisplayName ?? u.name ?? u.Name ?? u.username ?? "Unknown",
        photo: u.profilePhotoUrl ?? u.PhotoUrl ?? "",
        role:  u.RoleName ?? u.roleName ?? u.role ?? "",
      })).filter((u) => u.id));
    } catch { setUsers([]); }
  }, []);

  useEffect(() => { fetchActivities(); fetchUsers(); }, [fetchActivities, fetchUsers]);

  // ── Save / Delete ──
  const saveActivity = async (data) => {
    setSaving(true);
    setFormError("");
    try {
      let saved;
      if (data.id) {
        const res = await api.put(`/activities/${data.id}`, data);
        saved = normalizeActivity(res?.data ?? data);
        setActivities((prev) => prev.map((a) => a.id === saved.id ? saved : a));
      } else {
        const res = await api.post("/activities", data);
        saved = normalizeActivity(res?.data ?? { ...data, id: uid() });
        setActivities((prev) => [saved, ...prev]);
      }
      setShowModal(false);
      pushNotification(`Activity "${saved.title}" saved ✓`, "success");
    } catch (err) {
      // Optimistic local fallback
      if (data.id) {
        setActivities((prev) => prev.map((a) => a.id === data.id ? { ...a, ...data } : a));
      } else {
        const local = { ...data, id: uid(), createdAt: new Date().toISOString() };
        setActivities((prev) => [local, ...prev]);
      }
      setShowModal(false);
      pushNotification(`Saved locally (API: ${apiError(err, "unavailable")})`, "warn");
    } finally { setSaving(false); }
  };

  const deleteActivity = async (id) => {
    if (!window.confirm("Delete this activity?")) return;
    setActivities((prev) => prev.filter((a) => a.id !== id));
    try { await api.delete(`/activities/${id}`); }
    catch { /* already removed from UI */ }
    pushNotification("Activity deleted.", "info");
  };

  const quickStatus = async (id, status) => {
    setActivities((prev) => prev.map((a) =>
      a.id === id ? { ...a, status, completedAt: status === "completed" ? new Date().toISOString() : a.completedAt } : a
    ));
    try { await api.patch(`/activities/${id}`, { status }); }
    catch { /* silent */ }
  };

  // ── Notifications ──
  const pushNotification = (message, type = "info") => {
    const n = { id: uid(), message, type, at: Date.now() };
    setNotifications((prev) => [n, ...prev.slice(0, 9)]);
    setTimeout(() => setNotifications((prev) => prev.filter((x) => x.id !== n.id)), 5000);
  };

  // ── Auto-generate ──
  const generateChurchActivities = async () => {
    setGenerating(true);
    const generated = [];
    const now = new Date();
    for (const evt of churchEvents.filter((e) => genSelected.has(e.id))) {
      for (let w = 0; w < genWeeks; w++) {
        const base = new Date(nextOccurrence(evt.day, evt.time));
        base.setDate(base.getDate() + w * 7);
        const dueDate = base.toISOString();
        // Skip if already exists
        const dup = activities.find((a) => a.eventRef === `${evt.id}_${base.toDateString()}`);
        if (dup) continue;
        const act = normalizeActivity({
          title:    `${evt.label} – ${formatDate(dueDate)}`,
          category: evt.category,
          priority: evt.priority,
          status:   base < now ? "overdue" : "pending",
          dueDate,
          isAutoGen: true,
          eventRef: `${evt.id}_${base.toDateString()}`,
          description: `Auto-generated activity for ${evt.label}.`,
        });
        generated.push(act);
      }
    }
    if (generated.length === 0) {
      pushNotification("No new activities to generate (all already exist).", "info");
      setGenerating(false);
      return;
    }
    // Save all
    const saved = [];
    for (const act of generated) {
      try {
        const res = await api.post("/activities", act);
        saved.push(normalizeActivity(res?.data ?? act));
      } catch {
        saved.push(act);
      }
    }
    setActivities((prev) => [...saved, ...prev]);
    pushNotification(`Generated ${saved.length} activities ✓`, "success");
    setShowAutoGen(false);
    setGenerating(false);
  };

  // ── Follow-up ──
  const addFollowUp = async (actId, entry) => {
    setActivities((prev) => prev.map((a) =>
      a.id === actId ? { ...a, followUps: [...(a.followUps || []), entry] } : a
    ));
    try { await api.patch(`/activities/${actId}`, { followUps: [...(activities.find((a) => a.id === actId)?.followUps ?? []), entry] }); }
    catch { /* silent */ }
  };

  // ── Form helpers ──
  const openAdd = () => {
    setForm(defaultActivity());
    setEditingId(null);
    setFormError("");
    setAssigneeSearch("");
    setShowModal(true);
  };

  const openEdit = (act) => {
    setForm({
      ...act,
      dueDate:   act.dueDate ? act.dueDate.slice(0, 16) : "",
      startDate: act.startDate ? act.startDate.slice(0, 16) : "",
    });
    setEditingId(act.id);
    setFormError("");
    setAssigneeSearch("");
    setShowModal(true);
  };

  const setField = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    saveActivity({
      ...form,
      id:        editingId,
      dueDate:   form.dueDate ? new Date(form.dueDate).toISOString() : null,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
    });
  };

  // ── Derived data ──
  const enriched = useMemo(() =>
    activities.map((a) => ({ ...a, _status: resolveStatus(a) })),
  [activities]);

  const stats = useMemo(() => ({
    total:       enriched.length,
    pending:     enriched.filter((a) => a._status === "pending").length,
    in_progress: enriched.filter((a) => a._status === "in_progress").length,
    completed:   enriched.filter((a) => a._status === "completed").length,
    overdue:     enriched.filter((a) => a._status === "overdue").length,
  }), [enriched]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (filterStatus !== "all") list = list.filter((a) => a._status === filterStatus);
    if (filterCat !== "all")    list = list.filter((a) => a.category === filterCat);
    if (filterPri !== "all")    list = list.filter((a) => a.priority === filterPri);
    if (filterAssignee !== "all") list = list.filter((a) => a.assignees?.some((x) => x.id === filterAssignee || x === filterAssignee));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.notes?.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "dueDate") {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      if (sortBy === "priority") {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
      }
      if (sortBy === "created") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "title")   return a.title.localeCompare(b.title);
      return 0;
    });
    return list;
  }, [enriched, filterStatus, filterCat, filterPri, filterAssignee, search, sortBy]);

  const totalPages = Math.ceil(filtered.length / PAGE_LIMIT);
  const visible    = filtered.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);

  const filteredAssigneeUsers = useMemo(() =>
    users.filter((u) =>
      !assigneeSearch ||
      u.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(assigneeSearch.toLowerCase())
    ).slice(0, 30),
  [users, assigneeSearch]);

  const isAssigned = (userId) => (form.assignees || []).some((a) => (a.id ?? a) === userId);
  const toggleAssignee = (user) => {
    const cur = form.assignees || [];
    if (isAssigned(user.id)) {
      setField("assignees", cur.filter((a) => (a.id ?? a) !== user.id));
    } else {
      setField("assignees", [...cur, { id: user.id, name: user.name, photo: user.photo }]);
    }
  };

  // ────────────────────────────────── RENDER ──────────────────────────────────
  return (
    <div className="act-page">
      <style>{`
        .act-page {
          min-height: 100vh;
          padding: 16px;
          padding-bottom: calc(32px + env(safe-area-inset-bottom));
          background: #f9f6ef;
          color: #332817;
          font-family: inherit;
        }
        @keyframes act-spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes act-slide-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes act-toast-in { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }

        .act-title { margin:0; font-size:clamp(24px,7vw,36px); font-weight:900; color:#6b4f1d; line-height:1.05; }
        .act-subtitle { margin-top:4px; color:#8a7a5c; font-size:14px; line-height:1.4; }

        .act-header { display:grid; gap:14px; margin-bottom:20px; }
        .act-toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; }

        .act-btn {
          display:inline-flex; align-items:center; gap:7px;
          padding:0 16px; height:42px; border-radius:14px; border:1px solid;
          font-size:13px; font-weight:700; cursor:pointer; font-family:inherit;
          transition:all 160ms ease; white-space:nowrap;
        }
        .act-btn-primary { background:#b89b58; color:#fff; border-color:#b89b58; }
        .act-btn-primary:hover { background:#9c8140; }
        .act-btn-soft { background:#f8f2e6; color:#6b4f1d; border-color:#eadfca; }
        .act-btn-soft:hover { background:#f0e8d6; }
        .act-btn-ghost { background:#fff; color:#6b4f1d; border-color:#ddd2bd; }
        .act-btn-ghost:hover { background:#f8f4ec; }
        .act-btn-danger { background:#fff; color:#ef4444; border-color:#fca5a5; }
        .act-btn-danger:hover { background:#fef2f2; }
        .act-btn-sm { height:34px; padding:0 12px; font-size:12px; border-radius:10px; }
        .act-btn-icon { width:42px; height:42px; padding:0; justify-content:center; border-radius:14px; }
        .act-btn:disabled { opacity:0.55; cursor:not-allowed; }

        .act-input, .act-select, .act-textarea {
          width:100%; border:1.5px solid #ddd2bd; border-radius:12px;
          background:#fff; color:#332817; font-family:inherit; font-size:14px;
          transition:border-color 160ms ease;
        }
        .act-input, .act-select { height:46px; padding:0 12px; }
        .act-textarea { padding:10px 12px; resize:vertical; min-height:72px; }
        .act-input:focus, .act-select:focus, .act-textarea:focus {
          outline:none; border-color:#b89b58; box-shadow:0 0 0 3px rgba(184,155,88,0.12);
        }
        .act-label {
          display:block; margin-bottom:5px; font-size:11px; font-weight:900; color:#8a7a5c; text-transform:uppercase; letter-spacing:0.4px;
        }
        .act-field { display:grid; gap:0; }

        .act-stats-grid {
          display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:10px; margin-bottom:20px;
        }
        .act-radar-wrap {
          display:grid; grid-template-columns:1fr; gap:16px;
          background:#fff; border:1px solid #eee2cf; border-radius:18px;
          padding:18px; margin-bottom:20px;
          box-shadow:0 4px 20px rgba(80,60,28,0.07);
        }
        @media(min-width:640px){
          .act-radar-wrap { grid-template-columns:220px 1fr; }
        }

        .act-search-bar {
          display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:14px;
        }
        .act-search-wrap { position:relative; flex:1; min-width:200px; }
        .act-search-wrap svg { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#8a7a5c; }
        .act-search-wrap .act-input { padding-left:38px; }

        .act-filter-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
        .act-filter-chip {
          padding:4px 12px; border-radius:20px; border:1.5px solid #ddd2bd;
          background:#fff; color:#6b4f1d; font-size:12px; font-weight:700;
          cursor:pointer; font-family:inherit; transition:all 140ms ease;
        }
        .act-filter-chip.active { background:#b89b58; color:#fff; border-color:#b89b58; }

        .act-list { display:grid; gap:12px; }

        .act-card {
          background:#fff; border:1px solid #eee2cf; border-radius:16px;
          padding:14px 16px; box-shadow:0 2px 10px rgba(80,60,28,0.06);
          display:grid; gap:10px; animation:act-slide-in 200ms ease;
          transition:box-shadow 160ms ease;
        }
        .act-card:hover { box-shadow:0 6px 20px rgba(80,60,28,0.12); }
        .act-card-top { display:flex; align-items:flex-start; gap:10px; }
        .act-card-body { display:flex; flex-direction:column; gap:5px; min-width:0; }
        .act-card-title { font-weight:900; font-size:15px; color:#332817; line-height:1.3; }
        .act-card-desc  { font-size:12px; color:#8a7a5c; line-height:1.4; }
        .act-card-meta  { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
        .act-card-actions { display:flex; gap:8px; flex-wrap:wrap; }
        .act-card-footer { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }

        .act-progress-bar { height:4px; border-radius:4px; background:#f0e8d6; overflow:hidden; margin-top:4px; }
        .act-progress-fill { height:100%; border-radius:4px; transition:width 400ms ease; }

        .act-due { font-size:11px; font-weight:700; }
        .act-due.overdue { color:#ef4444; }
        .act-due.soon    { color:#f59e0b; }
        .act-due.ok      { color:#22c55e; }

        .act-assignee-pile { display:flex; align-items:center; }
        .act-assignee-avatar {
          width:24px; height:24px; border-radius:50%; background:linear-gradient(135deg,#efe4ca,#d7be83);
          color:#6b4f1d; font-size:9px; font-weight:900; display:inline-flex;
          align-items:center; justify-content:center; border:2px solid #fff;
          margin-left:-6px; flex-shrink:0;
        }
        .act-assignee-avatar:first-child { margin-left:0; }

        .act-empty {
          padding:40px 20px; text-align:center; color:#8a7a5c;
          background:#fff; border:1px dashed #d8c9ad; border-radius:16px;
          font-size:14px; line-height:1.6;
        }

        .act-modal-backdrop {
          position:fixed; inset:0; z-index:60;
          background:rgba(38,30,18,0.5);
          display:flex; align-items:flex-end; justify-content:center;
        }
        @media(min-width:640px){ .act-modal-backdrop { align-items:center; padding:20px; } }
        .act-modal {
          width:100%; max-height:94vh; overflow:hidden;
          background:#fff; border-radius:20px 20px 0 0;
          box-shadow:0 -20px 60px rgba(0,0,0,0.25);
          display:flex; flex-direction:column;
          animation:act-slide-in 220ms ease;
        }
        @media(min-width:640px){
          .act-modal { width:min(680px,100%); max-height:90vh; border-radius:20px; }
        }
        .act-modal-header {
          padding:16px 18px; display:flex; align-items:center; justify-content:space-between;
          border-bottom:1px solid #f0e5d4; flex-shrink:0;
        }
        .act-modal-title { margin:0; font-size:18px; font-weight:900; color:#332817; }
        .act-modal-body  { padding:18px; overflow:auto; flex:1; }
        .act-modal-footer {
          padding:14px 18px; border-top:1px solid #f0e5d4;
          display:flex; gap:10px; justify-content:flex-end; flex-shrink:0;
          padding-bottom:max(14px,env(safe-area-inset-bottom));
        }
        .act-form-grid { display:grid; gap:14px; }
        @media(min-width:480px){ .act-form-grid-2 { grid-template-columns:1fr 1fr; } }

        .act-section-hd {
          font-size:11px; font-weight:900; color:#8a7a5c; text-transform:uppercase;
          letter-spacing:0.5px; margin:16px 0 8px; border-top:1px solid #f0e5d4; padding-top:14px;
        }

        .act-user-chip {
          display:inline-flex; align-items:center; gap:6px;
          padding:4px 10px; border-radius:20px; border:1.5px solid;
          font-size:12px; font-weight:700; cursor:pointer; font-family:inherit;
          transition:all 140ms ease; background:#fff; color:#6b4f1d; border-color:#ddd2bd;
        }
        .act-user-chip.selected { background:#b89b58; color:#fff; border-color:#b89b58; }
        .act-user-chip-list { display:flex; flex-wrap:wrap; gap:7px; max-height:160px; overflow:auto; padding:4px 0; }

        .act-pagination { display:flex; align-items:center; justify-content:center; gap:10px; margin-top:16px; }

        .act-toast-stack { position:fixed; bottom:24px; right:16px; z-index:200; display:grid; gap:8px; }
        .act-toast {
          padding:10px 16px; border-radius:12px; font-size:13px; font-weight:700;
          box-shadow:0 4px 20px rgba(0,0,0,0.2); min-width:240px;
          animation:act-toast-in 200ms ease;
          display:flex; align-items:center; gap:8px;
        }
        .act-toast.success { background:#166534; color:#fff; }
        .act-toast.warn    { background:#92400e; color:#fff; }
        .act-toast.info    { background:#1e40af; color:#fff; }

        .act-status-dot {
          width:10px; height:10px; border-radius:50%; flex-shrink:0; cursor:pointer;
        }

        .act-overdue-stripe { border-left:3.5px solid #ef4444; }
        .act-completed-dim { opacity:0.72; }

        .act-quick-status { display:flex; gap:6px; flex-wrap:wrap; }
        .act-quick-btn {
          padding:3px 10px; border-radius:20px; border:1.5px solid;
          font-size:11px; font-weight:700; cursor:pointer; font-family:inherit;
          transition:all 140ms ease; background:#fff;
        }

        .act-event-card {
          padding:12px; border-radius:14px; border:1.5px solid #eee2cf;
          background:#fffdfa; display:grid; gap:8px;
        }
        .act-event-card.selected { border-color:#b89b58; background:#fffbf0; }

        .act-radar-legend { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:6px; }
        .act-radar-legend-item { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#6b4f1d; }
        .act-radar-legend-dot { width:10px; height:10px; border-radius:3px; flex-shrink:0; }

        .act-upcoming-list { display:grid; gap:8px; }
        .act-upcoming-item {
          display:flex; align-items:center; gap:10px;
          padding:10px 12px; border-radius:12px; background:#f8f4ec;
          border:1px solid #ede3d0;
        }
        .act-upcoming-icon { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }

        .act-reminder-modal .act-modal { max-width:520px; }
      `}</style>

      {/* ── Toast notifications ── */}
      <div className="act-toast-stack">
        {notifications.map((n) => (
          <div key={n.id} className={`act-toast ${n.type}`}>
            {n.type === "success" ? <Check size={14} /> : n.type === "warn" ? <AlertTriangle size={14} /> : <Bell size={14} />}
            {n.message}
          </div>
        ))}
      </div>

      {/* ── Page header ── */}
      <div className="act-header">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 className="act-title">
              <Activity size={28} style={{ verticalAlign: "middle", marginRight: 8, color: "#b89b58" }} />
              Activities
            </h1>
            <div className="act-subtitle">Track tasks, events & ministry follow-ups in one place.</div>
          </div>
          <div className="act-toolbar">
            <button className="act-btn act-btn-ghost act-btn-icon" onClick={fetchActivities} title="Refresh" type="button">
              {loading ? <Spinner /> : <RefreshCw size={16} />}
            </button>
            <button className="act-btn act-btn-soft" onClick={() => setShowSettings(true)} type="button">
              <Settings size={15} /> Settings
            </button>
            <button className="act-btn act-btn-soft" onClick={() => setShowAutoGen(true)} type="button">
              <Zap size={15} /> Auto-generate
            </button>
            <button className="act-btn act-btn-primary" onClick={openAdd} type="button">
              <Plus size={16} /> Add Activity
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="act-stats-grid">
        <StatCard icon={Activity}     label="Total"       value={stats.total}       color="#6b4f1d" bg="#f8f4ec" onClick={() => setFilterStatus("all")}         active={filterStatus === "all"} />
        <StatCard icon={Circle}       label="Pending"     value={stats.pending}     color="#e8a020" bg="#fffbeb" onClick={() => setFilterStatus("pending")}     active={filterStatus === "pending"} />
        <StatCard icon={Loader2}      label="In Progress" value={stats.in_progress} color="#3b82f6" bg="#eff6ff" onClick={() => setFilterStatus("in_progress")} active={filterStatus === "in_progress"} />
        <StatCard icon={CheckCircle2} label="Completed"   value={stats.completed}   color="#22c55e" bg="#f0fdf4" onClick={() => setFilterStatus("completed")}   active={filterStatus === "completed"} />
        <StatCard icon={AlertTriangle} label="Overdue"   value={stats.overdue}     color="#ef4444" bg="#fef2f2" onClick={() => setFilterStatus("overdue")}     active={filterStatus === "overdue"} />
      </div>

      {/* ── Radar dashboard ── */}
      <div className="act-radar-wrap">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ActivityRadar activities={enriched} />
        </div>
        <div>
          <div style={{ fontWeight: 900, color: "#6b4f1d", marginBottom: 10, fontSize: 15 }}>
            📡 Activity Radar
          </div>
          <div className="act-radar-legend">
            {Object.entries(CATEGORY).map(([key, val]) => {
              const count = enriched.filter((a) => a.category === key).length;
              return (
                <div key={key} className="act-radar-legend-item"
                  style={{ cursor: "pointer", padding: "4px 6px", borderRadius: 8, background: filterCat === key ? `${val.color}18` : "transparent" }}
                  onClick={() => setFilterCat(filterCat === key ? "all" : key)}>
                  <span className="act-radar-legend-dot" style={{ background: val.color }} />
                  {val.label} ({count})
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 16, fontWeight: 900, color: "#6b4f1d", marginBottom: 10, fontSize: 13 }}>
            ⏰ Upcoming (next 7 days)
          </div>
          <div className="act-upcoming-list">
            {enriched
              .filter((a) => {
                if (!a.dueDate || ["completed", "cancelled"].includes(a._status)) return false;
                const d = new Date(a.dueDate);
                const now = new Date();
                return d >= now && d <= new Date(now.getTime() + 7 * 864e5);
              })
              .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
              .slice(0, 5)
              .map((a) => {
                const cat = CATEGORY[a.category] ?? CATEGORY.other;
                const Icon = cat.icon;
                return (
                  <div key={a.id} className="act-upcoming-item">
                    <div className="act-upcoming-icon" style={{ background: `${cat.color}18` }}>
                      <Icon size={16} color={cat.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#332817" }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: "#8a7a5c" }}>{formatDate(a.dueDate)} · {formatTime(a.dueDate)}</div>
                    </div>
                    <StatusBadge status={a._status} />
                  </div>
                );
              })}
            {enriched.filter((a) => {
              if (!a.dueDate || ["completed", "cancelled"].includes(a._status)) return false;
              const d = new Date(a.dueDate);
              const now = new Date();
              return d >= now && d <= new Date(now.getTime() + 7 * 864e5);
            }).length === 0 && (
              <div style={{ fontSize: 12, color: "#8a7a5c", padding: "8px 0" }}>No upcoming activities this week.</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ display: "flex", gap: 10, padding: 12, borderRadius: 12, background: "#fef2f2", color: "#9b1c1c", border: "1px solid #fca5a5", marginBottom: 14 }}>
          <AlertCircle size={18} /><span>{error}</span>
        </div>
      )}

      {/* ── Search + filters ── */}
      <div className="act-search-bar">
        <div className="act-search-wrap">
          <Search size={16} />
          <input className="act-input" placeholder="Search activities..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="act-select" style={{ width: "auto", minWidth: 130 }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="dueDate">Sort: Due date</option>
          <option value="priority">Sort: Priority</option>
          <option value="created">Sort: Newest</option>
          <option value="title">Sort: Title</option>
        </select>
        <select className="act-select" style={{ width: "auto", minWidth: 130 }} value={filterPri} onChange={(e) => { setFilterPri(e.target.value); setPage(1); }}>
          <option value="all">All priorities</option>
          {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {users.length > 0 && (
          <select className="act-select" style={{ width: "auto", minWidth: 140 }} value={filterAssignee} onChange={(e) => { setFilterAssignee(e.target.value); setPage(1); }}>
            <option value="all">All assignees</option>
            {users.slice(0, 50).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
      </div>

      <div className="act-filter-row">
        {[
          { key: "all", label: "All" },
          { key: "pending",     label: `Pending (${stats.pending})` },
          { key: "in_progress", label: `In Progress (${stats.in_progress})` },
          { key: "completed",   label: `Done (${stats.completed})` },
          { key: "overdue",     label: `Overdue (${stats.overdue})` },
          { key: "cancelled",   label: "Cancelled" },
        ].map(({ key, label }) => (
          <button key={key} type="button"
            className={`act-filter-chip${filterStatus === key ? " active" : ""}`}
            onClick={() => { setFilterStatus(key); setPage(1); }}>
            {label}
          </button>
        ))}
        <span style={{ fontSize: 11, color: "#8a7a5c", padding: "4px 8px" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Activity list ── */}
      {loading && activities.length === 0 ? (
        <div className="act-empty"><Spinner size={24} /><br />Loading activities…</div>
      ) : visible.length === 0 ? (
        <div className="act-empty">
          <Activity size={32} style={{ color: "#c9b896", marginBottom: 8 }} /><br />
          No activities found.<br />
          <button className="act-btn act-btn-primary" style={{ marginTop: 12 }} onClick={openAdd} type="button">
            <Plus size={15} /> Add first activity
          </button>
        </div>
      ) : (
        <div className="act-list">
          {visible.map((act) => {
            const cat    = CATEGORY[act.category] ?? CATEGORY.other;
            const CatIcon = cat.icon;
            const status = act._status;
            const rel    = formatRelative(act.dueDate);
            const relCls = status === "overdue" ? "overdue" : rel.startsWith("in") && parseInt(rel) < 24 ? "soon" : "ok";

            return (
              <div key={act.id}
                className={`act-card${status === "overdue" ? " act-overdue-stripe" : ""}${status === "completed" ? " act-completed-dim" : ""}`}>

                <div className="act-card-top">
                  {/* Status toggle dot */}
                  <div style={{ paddingTop: 3 }}>
                    <div
                      className="act-status-dot"
                      style={{ background: STATUS[status?.toUpperCase()]?.color ?? "#ccc" }}
                      title={`Click to cycle status`}
                      onClick={() => {
                        const cycle = { pending: "in_progress", in_progress: "completed", completed: "pending", overdue: "in_progress", cancelled: "pending" };
                        quickStatus(act.id, cycle[status] ?? "pending");
                      }}
                    />
                  </div>

                  <div className="act-card-body" style={{ flex: 1 }}>
                    <div className="act-card-title">{act.title}</div>
                    {act.description && <div className="act-card-desc">{act.description}</div>}
                    <div className="act-card-meta" style={{ marginTop: 6 }}>
                      <StatusBadge status={status} />
                      <PriorityDot priority={act.priority} />
                      <CategoryBadge category={act.category} />
                      {act.isAutoGen && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, background: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd" }}>
                          <Zap size={9} style={{ verticalAlign: "middle" }} /> Auto
                        </span>
                      )}
                      {act.recurring?.pattern && act.recurring.pattern !== "none" && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, background: "#f3e8ff", color: "#7c3aed", border: "1px solid #ddd6fe" }}>
                          <Repeat size={9} style={{ verticalAlign: "middle" }} /> {act.recurring.pattern}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Assignees */}
                  {act.assignees?.length > 0 && (
                    <div className="act-assignee-pile">
                      {act.assignees.slice(0, 3).map((a, i) => (
                        <div key={i} className="act-assignee-avatar" title={a.name ?? a}>
                          {(a.name ?? a)?.[0]?.toUpperCase() ?? "?"}
                        </div>
                      ))}
                      {act.assignees.length > 3 && (
                        <div className="act-assignee-avatar" style={{ background: "#e8e0d0", color: "#6b4f1d" }}>
                          +{act.assignees.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="act-card-footer">
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    {act.dueDate && (
                      <span className={`act-due ${relCls}`}>
                        <Clock size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
                        {formatDate(act.dueDate)} {formatTime(act.dueDate)} · {rel}
                      </span>
                    )}
                    {act.followUps?.length > 0 && (
                      <span style={{ fontSize: 11, color: "#0ea5e9", fontWeight: 700 }}>
                        <TrendingUp size={11} style={{ verticalAlign: "middle" }} /> {act.followUps.length} follow-up{act.followUps.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <div className="act-card-actions">
                    <button className="act-btn act-btn-ghost act-btn-sm" type="button"
                      onClick={() => setShowFollowUp(showFollowUp === act.id ? null : act.id)}>
                      <TrendingUp size={13} /> Follow-up
                    </button>
                    <button className="act-btn act-btn-ghost act-btn-sm" type="button"
                      onClick={() => { setReminderActivity(act); setReminderNote(""); setReminderSent(false); setShowReminders(true); }}>
                      <Bell size={13} /> Remind
                    </button>
                    <button className="act-btn act-btn-ghost act-btn-sm" type="button" onClick={() => openEdit(act)}>
                      <Edit3 size={13} /> Edit
                    </button>
                    <button className="act-btn act-btn-danger act-btn-sm" type="button" onClick={() => deleteActivity(act.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Quick status */}
                <div className="act-quick-status">
                  {Object.values(STATUS).map((s) => (
                    <button key={s.key} type="button" className="act-quick-btn"
                      style={{
                        color: s.color, borderColor: `${s.color}44`,
                        background: status === s.key ? `${s.color}18` : "#fff",
                      }}
                      onClick={() => quickStatus(act.id, s.key)}>
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Follow-up inline */}
                {showFollowUp === act.id && (
                  <div style={{ borderTop: "1px solid #f0e5d4", paddingTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#8a7a5c", marginBottom: 6 }}>FOLLOW-UP TIMELINE</div>
                    <FollowUpTimeline
                      followUps={act.followUps ?? []}
                      onAdd={(entry) => addFollowUp(act.id, entry)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="act-pagination">
          <button className="act-btn act-btn-ghost act-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} type="button">
            <ChevronLeft size={14} /> Prev
          </button>
          <span style={{ fontSize: 13, color: "#6b4f1d", fontWeight: 700 }}>
            Page {page} of {totalPages}
          </span>
          <button className="act-btn act-btn-ghost act-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} type="button">
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ══════════════ ADD / EDIT MODAL ══════════════ */}
      {showModal && (
        <div className="act-modal-backdrop" onClick={(e) => { if (e.target.classList.contains("act-modal-backdrop")) setShowModal(false); }}>
          <form className="act-modal" onSubmit={handleSubmit}>
            <div className="act-modal-header">
              <h2 className="act-modal-title">{editingId ? "Edit Activity" : "New Activity"}</h2>
              <button type="button" className="act-btn act-btn-ghost act-btn-icon" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="act-modal-body">
              <div className="act-form-grid">
                <div className="act-field">
                  <label className="act-label">Title *</label>
                  <input className="act-input" value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Activity title…" />
                </div>

                <div className="act-field">
                  <label className="act-label">Description</label>
                  <textarea className="act-textarea" value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Optional details…" style={{ minHeight: 60 }} />
                </div>

                <div className="act-form-grid act-form-grid-2">
                  <div className="act-field">
                    <label className="act-label">Category</label>
                    <select className="act-select" value={form.category} onChange={(e) => setField("category", e.target.value)}>
                      {Object.entries(CATEGORY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div className="act-field">
                    <label className="act-label">Priority</label>
                    <select className="act-select" value={form.priority} onChange={(e) => setField("priority", e.target.value)}>
                      {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div className="act-field">
                    <label className="act-label">Status</label>
                    <select className="act-select" value={form.status} onChange={(e) => setField("status", e.target.value)}>
                      {Object.values(STATUS).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="act-field">
                    <label className="act-label">Recurring</label>
                    <select className="act-select" value={form.recurring?.pattern ?? "none"}
                      onChange={(e) => setField("recurring", { ...form.recurring, pattern: e.target.value })}>
                      {RECUR_PATTERNS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="act-field">
                    <label className="act-label">Start date / time</label>
                    <input className="act-input" type="datetime-local" value={form.startDate}
                      onChange={(e) => setField("startDate", e.target.value)} />
                  </div>
                  <div className="act-field">
                    <label className="act-label">Due date / time</label>
                    <input className="act-input" type="datetime-local" value={form.dueDate}
                      onChange={(e) => setField("dueDate", e.target.value)} />
                  </div>
                </div>

                <div className="act-field">
                  <label className="act-label">Notes</label>
                  <textarea className="act-textarea" value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Internal notes…" />
                </div>

                {/* Assignees */}
                {users.length > 0 && (
                  <div className="act-field">
                    <label className="act-label">Assignees ({(form.assignees || []).length} selected)</label>
                    <input className="act-input" placeholder="Search people…" value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)} style={{ marginBottom: 8 }} />
                    <div className="act-user-chip-list">
                      {filteredAssigneeUsers.map((u) => (
                        <button key={u.id} type="button"
                          className={`act-user-chip${isAssigned(u.id) ? " selected" : ""}`}
                          onClick={() => toggleAssignee(u)}>
                          <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#efe4ca", color: "#6b4f1d", fontSize: 9, fontWeight: 900, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                            {u.name[0]?.toUpperCase()}
                          </span>
                          {u.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {formError && (
                <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, background: "#fef2f2", color: "#9b1c1c", fontSize: 13 }}>
                  {formError}
                </div>
              )}
            </div>

            <div className="act-modal-footer">
              <button type="button" className="act-btn act-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="act-btn act-btn-primary" disabled={saving}>
                {saving ? <Spinner size={14} /> : <Check size={15} />}
                {editingId ? "Save Changes" : "Create Activity"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ══════════════ AUTO-GENERATE MODAL ══════════════ */}
      {showAutoGen && (
        <div className="act-modal-backdrop" onClick={(e) => { if (e.target.classList.contains("act-modal-backdrop")) setShowAutoGen(false); }}>
          <div className="act-modal">
            <div className="act-modal-header">
              <h2 className="act-modal-title"><Zap size={18} style={{ verticalAlign: "middle", marginRight: 6, color: "#f59e0b" }} />Auto-Generate Church Activities</h2>
              <button type="button" className="act-btn act-btn-ghost act-btn-icon" onClick={() => setShowAutoGen(false)}><X size={16} /></button>
            </div>

            <div className="act-modal-body">
              <div style={{ marginBottom: 14 }}>
                <label className="act-label">Generate for how many weeks?</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[1, 2, 4, 8, 12].map((w) => (
                    <button key={w} type="button"
                      className={`act-filter-chip${genWeeks === w ? " active" : ""}`}
                      onClick={() => setGenWeeks(w)}>
                      {w} {w === 1 ? "week" : "weeks"}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ fontWeight: 900, color: "#6b4f1d", marginBottom: 10, fontSize: 13 }}>Select events to generate:</div>
              <div style={{ display: "grid", gap: 10 }}>
                {churchEvents.map((evt) => (
                  <div key={evt.id}
                    className={`act-event-card${genSelected.has(evt.id) ? " selected" : ""}`}
                    onClick={() => setGenSelected((prev) => {
                      const next = new Set(prev);
                      next.has(evt.id) ? next.delete(evt.id) : next.add(evt.id);
                      return next;
                    })}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{evt.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: 14, color: "#332817" }}>{evt.label}</div>
                        <div style={{ fontSize: 12, color: "#8a7a5c" }}>
                          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][evt.day]} · {evt.time} · {evt.category} · {evt.priority} priority
                        </div>
                      </div>
                      <input type="checkbox" readOnly checked={genSelected.has(evt.id)}
                        style={{ width: 18, height: 18, accentColor: "#b89b58" }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 12, color: "#166534" }}>
                <strong>Preview:</strong> Will create up to {genSelected.size * genWeeks} activities (skipping duplicates).<br />
                Activities already in the system for the same event + date will be skipped.
              </div>
            </div>

            <div className="act-modal-footer">
              <button type="button" className="act-btn act-btn-ghost" onClick={() => setShowAutoGen(false)}>Cancel</button>
              <button type="button" className="act-btn act-btn-primary" disabled={generating || genSelected.size === 0} onClick={generateChurchActivities}>
                {generating ? <Spinner size={14} /> : <Zap size={15} />}
                Generate {genSelected.size * genWeeks} Activities
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ JAI MASIH / REMINDER MODAL ══════════════ */}
      {showReminders && reminderActivity && (
        <div className="act-modal-backdrop act-reminder-modal" onClick={(e) => { if (e.target.classList.contains("act-modal-backdrop")) { setShowReminders(false); setReminderSent(false); } }}>
          <div className="act-modal" style={{ maxWidth: 520 }}>
            <div className="act-modal-header">
              <h2 className="act-modal-title">
                <Bell size={18} style={{ verticalAlign: "middle", marginRight: 6, color: "#f59e0b" }} />
                Jai Masih Reminder
              </h2>
              <button type="button" className="act-btn act-btn-ghost act-btn-icon" onClick={() => { setShowReminders(false); setReminderSent(false); }}>
                <X size={16} />
              </button>
            </div>

            <div className="act-modal-body">
              {reminderSent ? (
                <div style={{ textAlign: "center", padding: "32px 16px" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🙏</div>
                  <div style={{ fontWeight: 900, fontSize: 18, color: "#166534", marginBottom: 6 }}>Jai Masih Ji!</div>
                  <div style={{ color: "#6b4f1d", fontSize: 14 }}>Reminder sent to {reminderActivity.assignees?.length || 0} assignee(s).</div>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 12, background: "#f8f4ec", border: "1px solid #ede3d0" }}>
                    <div style={{ fontWeight: 900, fontSize: 13, color: "#6b4f1d", marginBottom: 4 }}>{reminderActivity.title}</div>
                    <div style={{ fontSize: 12, color: "#8a7a5c" }}>
                      {formatDate(reminderActivity.dueDate)} · {reminderActivity.assignees?.length ?? 0} assignee(s)
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label className="act-label">Quick templates</label>
                    <div style={{ display: "grid", gap: 8 }}>
                      {jaiTemplates.map((tpl) => (
                        <button key={tpl.id} type="button"
                          className={`act-event-card${reminderNote === tpl.message ? " selected" : ""}`}
                          style={{ textAlign: "left", cursor: "pointer", background: "none", border: "1.5px solid", borderColor: reminderNote === tpl.message ? "#b89b58" : "#eee2cf", fontFamily: "inherit" }}
                          onClick={() => setReminderNote(tpl.message)}>
                          <div style={{ fontWeight: 700, fontSize: 12, color: "#6b4f1d", marginBottom: 2 }}>🕊 {tpl.label}</div>
                          <div style={{ fontSize: 11, color: "#8a7a5c", lineHeight: 1.4 }}>{tpl.message}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="act-field">
                    <label className="act-label">Custom message</label>
                    <textarea className="act-textarea" value={reminderNote} onChange={(e) => setReminderNote(e.target.value)}
                      placeholder="Jai Masih Ji! 🙏 Your message here…" style={{ minHeight: 80 }} />
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, color: "#8a7a5c" }}>
                    This will create an in-app notification for all assignees of this activity.
                  </div>
                </>
              )}
            </div>

            {!reminderSent && (
              <div className="act-modal-footer">
                <button type="button" className="act-btn act-btn-ghost" onClick={() => setShowReminders(false)}>Cancel</button>
                <button type="button" className="act-btn act-btn-primary"
                  disabled={!reminderNote.trim()}
                  onClick={() => {
                    // In-app notification: push to the notifications stack for each assignee
                    const assigneeNames = (reminderActivity.assignees || []).map((a) => a.name ?? a).join(", ") || "all";
                    pushNotification(`🙏 Jai Masih sent for "${reminderActivity.title}" → ${assigneeNames}`, "success");
                    // Also try the messages API (fire-and-forget)
                    api.post("/messages/send", {
                      type: "Reminder",
                      message: reminderNote,
                      userIds: (reminderActivity.assignees || []).map((a) => a.id ?? a).filter(Boolean),
                      channels: { email: false, whatsapp: false, sms: false },
                    }).catch(() => {});
                    setReminderSent(true);
                  }}>
                  <Send size={15} /> Jai Masih Ji! 🙏
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ SETTINGS MODAL ══════════════ */}
      {showSettings && (
        <div className="act-modal-backdrop" onClick={(e) => { if (e.target.classList.contains("act-modal-backdrop")) setShowSettings(false); }}>
          <div className="act-modal">
            <div className="act-modal-header">
              <h2 className="act-modal-title"><Settings size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />Church Event Settings</h2>
              <button type="button" className="act-btn act-btn-ghost act-btn-icon" onClick={() => setShowSettings(false)}><X size={16} /></button>
            </div>

            <div className="act-modal-body">
              <div style={{ fontSize: 12, color: "#8a7a5c", marginBottom: 14 }}>
                Configure the recurring church events used for auto-generation. Changes are saved automatically.
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                {churchEvents.map((evt, idx) => (
                  <div key={evt.id} style={{ padding: 14, borderRadius: 14, border: "1.5px solid #eee2cf", background: "#fffdfa" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 20 }}>{evt.icon}</span>
                    </div>
                    <div className="act-form-grid act-form-grid-2">
                      <div className="act-field" style={{ gridColumn: "1/-1" }}>
                        <label className="act-label">Event Name</label>
                        <input className="act-input" value={evt.label}
                          onChange={(e) => {
                            const next = churchEvents.map((x, i) => i === idx ? { ...x, label: e.target.value } : x);
                            setChurchEvents(next);
                            localStorage.setItem("mahima_church_events", JSON.stringify(next));
                          }} />
                      </div>
                      <div className="act-field">
                        <label className="act-label">Day of week</label>
                        <select className="act-select" value={evt.day}
                          onChange={(e) => {
                            const next = churchEvents.map((x, i) => i === idx ? { ...x, day: Number(e.target.value) } : x);
                            setChurchEvents(next); localStorage.setItem("mahima_church_events", JSON.stringify(next));
                          }}>
                          {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((d, i) =>
                            <option key={i} value={i}>{d}</option>)}
                        </select>
                      </div>
                      <div className="act-field">
                        <label className="act-label">Time</label>
                        <input className="act-input" type="time" value={evt.time}
                          onChange={(e) => {
                            const next = churchEvents.map((x, i) => i === idx ? { ...x, time: e.target.value } : x);
                            setChurchEvents(next); localStorage.setItem("mahima_church_events", JSON.stringify(next));
                          }} />
                      </div>
                      <div className="act-field">
                        <label className="act-label">Category</label>
                        <select className="act-select" value={evt.category}
                          onChange={(e) => {
                            const next = churchEvents.map((x, i) => i === idx ? { ...x, category: e.target.value } : x);
                            setChurchEvents(next); localStorage.setItem("mahima_church_events", JSON.stringify(next));
                          }}>
                          {Object.entries(CATEGORY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                      <div className="act-field">
                        <label className="act-label">Priority</label>
                        <select className="act-select" value={evt.priority}
                          onChange={(e) => {
                            const next = churchEvents.map((x, i) => i === idx ? { ...x, priority: e.target.value } : x);
                            setChurchEvents(next); localStorage.setItem("mahima_church_events", JSON.stringify(next));
                          }}>
                          {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" className="act-btn act-btn-soft" style={{ marginTop: 14 }}
                onClick={() => {
                  const newEvt = { id: uid(), label: "New Event", day: 0, time: "10:00", category: "meeting", priority: "medium", icon: "⛪" };
                  const next = [...churchEvents, newEvt];
                  setChurchEvents(next); localStorage.setItem("mahima_church_events", JSON.stringify(next));
                }}>
                <Plus size={14} /> Add Event
              </button>
            </div>

            <div className="act-modal-footer">
              <button type="button" className="act-btn act-btn-soft"
                onClick={() => { setChurchEvents(DEFAULT_CHURCH_EVENTS); localStorage.removeItem("mahima_church_events"); }}>
                Reset to defaults
              </button>
              <button type="button" className="act-btn act-btn-primary" onClick={() => setShowSettings(false)}>
                <Check size={15} /> Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
