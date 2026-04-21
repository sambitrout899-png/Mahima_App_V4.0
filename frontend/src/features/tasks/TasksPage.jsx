// src/features/tasks/TasksPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiEdit2,
  FiTrash2,
  FiSend,
  FiLink,
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiRefreshCw,
  FiDownload,
} from "react-icons/fi";

/* --- helpers --- */
function normalizeResponse(res) {
  const isArray = Array.isArray(res);
  const items = isArray ? res : (res && (res.items || res.data || [])) || [];
  const meta = {
    total: !isArray ? (res?.total ?? items.length) : items.length,
    page: !isArray ? (res?.page ?? 1) : 1,
    limit: !isArray ? (res?.limit ?? items.length) : items.length,
  };
  return { items, meta };
}
// Allow env override but fall back to your working API
const API_BASE = import.meta.env.VITE_API_BASE || "/api";
///  import.meta.env.VITE_API_BASE || "https://www.mahimaministries.com/api";
console.log("🔥 API_BASE VALUE:", API_BASE);

function defaultForm() {
  return {
    id: null,
    title: "",
    description: "",
    // multi-assignees:
    assignedToIds: [], // array of GUID strings
    assignedToDisplay: "", // computed for UI convenience
    dueDate: "",
    status: "Pending",
    priority: 2,
    broadcast: false, // ★ BROADCAST: default
  };
}
// status map
const statusMap = {
  Pending: 0,
  "In Progress": 1,
  "In-Progress": 1,
  InProgress: 1,
  Done: 2,
  Completed: 2,
  "On Hold": 3,
  "On-Hold": 3,
};
// numeric → label mapping for display
const statusLabels = Object.entries(statusMap).reduce((acc, [k, v]) => {
  if (!acc[v]) acc[v] = k;
  return acc;
}, {});

// label/string/number → numeric code
function normalizeStatusValue(raw) {
  if (raw == null) return 0;
  const asNum = Number(raw);
  if (!Number.isNaN(asNum)) return asNum;
  const normalized = String(raw).trim();
  if (statusMap.hasOwnProperty(normalized)) return statusMap[normalized];
  // case-insensitive fallback
  const match = Object.keys(statusMap).find(
    (k) =>
      k.toLowerCase().replace(/[-_]/g, " ") ===
      normalized.toLowerCase().replace(/[-_]/g, " ")
  );
  return match ? statusMap[match] : 0;
}

// numeric → label for UI
function statusCodeToLabel(code) {
  return statusLabels[Number(code)] || "Pending";
}

/* --- MultiSelect (mobile-first dropdown) --- */
function MultiUserSelect({ allUsers = [], value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const ref = useRef();

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const selectedMap = new Set((value || []).map(String));
  const filtered = (allUsers || []).filter(
    (u) =>
      (u.displayName || "")
        .toString()
        .toLowerCase()
        .includes(filter.trim().toLowerCase()) ||
      (u.email || "").toString().toLowerCase().includes(filter.trim().toLowerCase())
  );

  function toggleUser(id) {
    const s = new Set(selectedMap);
    if (s.has(String(id))) s.delete(String(id));
    else s.add(String(id));
    onChange(Array.from(s));
  }
  function removeChip(id) {
    const s = new Set(selectedMap);
    s.delete(String(id));
    onChange(Array.from(s));
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((o) => !o)}
        className="input like-chipbox"
      >
        {(value || []).length === 0 ? (
          <div className="muted">— none — (tap to pick)</div>
        ) : (
          (value || []).map((id) => {
            const u = allUsers.find((x) => String(x.id) === String(id));
            const label = u ? u.displayName ?? u.name ?? u.email : id;
            const initials = label
              .split(" ")
              .map((s) => s[0] || "")
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <div key={id} className="chip">
                <div className="chip-avatar">{initials}</div>
                <div className="chip-label" title={label}>
                  {label}
                </div>
                <button
                  type="button"
                  className="chip-x"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeChip(id);
                  }}
                >
                  ×
                </button>
              </div>
            );
          })
        )}
        <div className="ml-auto small muted">
          {(value || []).length} selected ▾
        </div>
      </div>

      {open && (
        <div className="select-pop">
          <div className="select-filter">
            <input
              placeholder="Filter users…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input"
            />
          </div>
          <div className="select-list">
            {filtered.length === 0 ? (
              <div className="muted pad">No users match</div>
            ) : (
              filtered.map((u) => {
                const id =
                  u.id ?? u.Id ?? u.userId ?? u.UserId ?? u.userid ?? u.UID ?? u.Id;
                const checked = selectedMap.has(String(id));
                const initials = (u.displayName || u.name || u.email || "")
                  .split(" ")
                  .map((s) => s[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <label key={id} className="select-row">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleUser(id)}
                    />
                    <div className="chip-avatar sm">{initials}</div>
                    <div className="col">
                      <div className="strong">
                        {u.displayName ?? u.name ?? u.email}
                      </div>
                      <div className="tiny muted">{u.email ?? ""}</div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <div className="select-actions">
            <button
              type="button"
              className="btn btn-muted"
              onClick={() => {
                onChange([]);
                setFilter("");
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- Calendar helper component --- */
function CalendarView({ tasks = [], onTaskClick = () => {}, initialMonth = new Date() }) {
  const [month, setMonth] = useState(() => {
    const d = new Date(initialMonth);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState(null);

  function monthMatrix(d) {
    const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const startDay = firstOfMonth.getDay(); // 0 = Sun
    const startDate = new Date(firstOfMonth);
    startDate.setDate(firstOfMonth.getDate() - startDay);
    const weeks = [];
    let cur = new Date(startDate);
    for (let week = 0; week < 6; week++) {
      const row = [];
      for (let day = 0; day < 7; day++) {
        row.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(row);
    }
    return weeks;
  }
  function toKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const tasksByDate = useMemo(() => {
    const map = new Map();
    (tasks || []).forEach((t) => {
      const raw = t.dueDate || t.DueDate;
      if (!raw) return;
      const dt = new Date(raw);
      if (!dt || isNaN(dt.getTime())) return;
      const k = toKey(dt);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(t);
    });
    return map;
  }, [tasks]);

  const weeks = monthMatrix(month);
  const todayKey = toKey(new Date());
  const prev = () =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const next = () =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const goToday = () => {
    const d = new Date();
    d.setDate(1);
    setMonth(d);
    setSelectedDate(null);
  };

  const selectedKey = selectedDate ? toKey(selectedDate) : null;
  const selectedTasks = selectedKey ? tasksByDate.get(selectedKey) || [] : [];

  return (
    <div className="calendar-layout">
      <div className="card pad">
        <div className="row between center mb-sm">
          <div className="row gap-sm">
            <button onClick={prev} className="btn btn-muted icon">
              <FiChevronLeft />
            </button>
            <button onClick={next} className="btn btn-muted icon">
              <FiChevronRight />
            </button>
            <button onClick={goToday} className="btn btn-muted">
              Today
            </button>
          </div>
          <div className="strong lg">
            {month.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </div>
          <div style={{ width: 120 }} />
        </div>

        <div className="grid-7 gap-xs muted bold mb-xs">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((h) => (
            <div key={h} className="center tiny">
              {h}
            </div>
          ))}
        </div>

        <div className="grid-7 gap-xs">
          {weeks.flat().map((date) => {
            const k = toKey(date);
            const items = tasksByDate.get(k) || [];
            const inMonth = date.getMonth() === month.getMonth();
            const isToday = k === todayKey;
            return (
              <div
                key={k}
                onClick={() => {
                  setSelectedDate(new Date(date));
                }}
                className={`day ${!inMonth ? "muted-out" : ""} ${
                  selectedKey === k ? "sel" : ""
                }`}
                title={`${date.toDateString()} — ${items.length} task(s)`}
              >
                <div className="row between center mb-xxs">
                  <div className={`tiny bold daynum ${isToday ? "today" : ""}`}>
                    {date.getDate()}
                  </div>
                  <div className="tiny muted">
                    {items.length > 0 ? `${items.length}` : ""}
                  </div>
                </div>
                <div className="col gap-xxs">
                  {items.slice(0, 3).map((t) => (
                    <div
                      key={(t.id ?? t.Id) + "-" + k}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick(t);
                      }}
                      className="pill task-pill"
                      title={t.title}
                    >
                      {t.title}
                    </div>
                  ))}
                  {items.length > 3 && (
                    <div className="tiny muted">+{items.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* side panel: tasks for selected day */}
      <div className="card pad">
        <div className="row between center mb-xxs">
          <div className="strong">
            {selectedDate ? selectedDate.toDateString() : "Select a date"}
          </div>
          <div className="tiny muted">
            {selectedKey
              ? (tasksByDate.get(selectedKey)?.length || 0) + " tasks"
              : ""}
          </div>
        </div>

        <div className="scroll-y" style={{ maxHeight: 420 }}>
          {selectedTasks.length === 0 ? (
            <div className="muted pad">No tasks for this day.</div>
          ) : (
            selectedTasks.map((t) => (
              <div key={t.id ?? t.Id} className="panel">
                <div className="row between gap-sm">
                  <div className="strong">{t.title}</div>
                  <div className="tiny muted">
                    Priority {t.priority ?? 2}
                  </div>
                </div>
                <div className="muted mt-xxs">
                  {(t.description || "").slice(0, 160)}
                </div>
                <div className="row gap-xs mt-xs">
                  <button
                    onClick={() => onTaskClick(t)}
                    className="btn btn-muted icon"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard
                        ?.writeText(
                          window.location.href +
                            "/tasks/" +
                            ((t.id ?? t.Id) || "")
                        )
                        .catch(() => {});
                      alert("Link copied");
                    }}
                    className="btn btn-muted icon"
                  >
                    <FiLink />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* --- Admin tabular view (admin-only, list mode) --- */
function AdminTaskTable({ tasks, allUsers, busyId, onChangeOwner }) {
  const getUserName = (id) => {
    if (!id) return "—";
    const u = allUsers.find((x) => String(x.id) === String(id));
    return u ? u.displayName || u.name || u.email || "—" : "—";
  };

  const sorted = [...(tasks || [])].sort((a, b) => {
    const da = a.dueDate || a.DueDate || "";
    const db = b.dueDate || b.DueDate || "";
    return String(da).localeCompare(String(db));
  });

  return (
    <div className="admin-table-wrap card pad">
      <div className="row between center mb-xs">
        <div className="strong lg">Admin Task List (All)</div>
        <div className="tiny muted">
          {sorted.length} task{sorted.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Assigned To</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Due Date</th>
              <th>Change Owner</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-td-empty">
                  No tasks to display.
                </td>
              </tr>
            ) : (
              sorted.map((t) => {
                const id = t.id ?? t.Id;
                const assignedIds = Array.isArray(t.assignedToIds)
                  ? t.assignedToIds
                  : Array.isArray(t.AssigneeIds)
                  ? t.AssigneeIds
                  : t.AssigneeId
                  ? [String(t.AssigneeId)]
                  : [];
                const displayAssigned =
                  t.assignedTo && String(t.assignedTo).trim()
                    ? t.assignedTo
                    : assignedIds.map((x) => getUserName(x)).join(", ");
                const currentOwner = assignedIds[0] || "";
                const dueRaw = t.dueDate || t.DueDate;
                const dueText = dueRaw
                  ? String(dueRaw).slice(0, 10)
                  : "—";
                return (
                  <tr key={id}>
                    <td>
                      <div className="admin-title" title={t.title}>
                        {t.title}
                      </div>
                      {t.description && (
                        <div className="admin-desc">
                          {t.description.length > 80
                            ? t.description.slice(0, 80) + "…"
                            : t.description}
                        </div>
                      )}
                    </td>
                    <td>{displayAssigned || "—"}</td>
                    <td>{t.status || (t.completed ? "Completed" : "Pending")}</td>
                    <td>{t.priority ?? 2}</td>
                    <td>{dueText}</td>
                    <td>
                      <select
                        className="admin-owner-select"
                        value={currentOwner || ""}
                        disabled={busyId === id}
                        onChange={(e) =>
                          onChangeOwner(id, e.target.value || null)
                        }
                      >
                        <option value="">Unassigned</option>
                        {allUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.displayName || u.name || u.email}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --- main TasksPage component --- */
export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 100 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [allUsers, setAllUsers] = useState([]);
  const [query, setQuery] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("calendar"); // calendar | list
  const [statusTab, setStatusTab] = useState("all");

  // admin detection
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [changingOwnerId, setChangingOwnerId] = useState(null);

  /* --- API: users/tasks --- */
  const fetchUsers = async () => {
    try {
      const r = await fetch(`${API_BASE}/users?limit=1000`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      const { items } = normalizeResponse(json);

      const normalized = (items || []).map((u) => {
        const id =
          u?.id ??
          u?.Id ??
          u?.userId ??
          u?.UserId ??
          u?.userid ??
          u?.UID ??
          u?.Id;
        const displayName = (
          u?.displayName ??
          u?.name ??
          u?.fullName ??
          u?.username ??
          u?.userName ??
          u?.email ??
          ""
        ).toString();
        return { ...u, id: id?.toString?.() ?? null, displayName };
      });

      setAllUsers(normalized || []);
    } catch (err) {
      console.error("fetchUsers:", err);
      setAllUsers([]);
    }
  };

  const fetchTasks = async (page = 1, limit = 100) => {
    try {
      setLoading(true);
      setError(null);
      const q = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      const r = await fetch(`${API_BASE}/tasks?${q.toString()}`);
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`API error (${r.status}): ${txt || r.statusText}`);
      }
      const json = await r.json();
      const { items, meta: m } = normalizeResponse(json);

      const enriched = (items || []).map((t) => {
        const out = { ...t };
        out.assignedToIds =
          out.AssigneeIds ??
          out.assigneeIds ??
          (out.AssigneeId ? [String(out.AssigneeId)] : []);
        if (Array.isArray(out.AssignedToNames))
          out.assignedTo = out.AssignedToNames.join(", ");
        else if (typeof out.AssignedToNames === "string")
          out.assignedTo = out.AssignedToNames;
        else if (out.AssignedToName) out.assignedTo = out.AssignedToName;
        else out.assignedTo = "";
        out.id = out.Id ?? out.id ?? null;
        out.title = out.Title ?? out.title ?? "";
        if (out.DueDate && !out.dueDate) out.dueDate = out.DueDate;
        out.priority = out.Priority ?? out.priority ?? 2;
        out.broadcast = out.Broadcast ?? out.broadcast ?? false;
        const rawStatus =
          out.Status ?? out.status ?? (out.Completed ? "Completed" : "Pending");
        out.statusCode = normalizeStatusValue(rawStatus);
        out.status = statusCodeToLabel(out.statusCode);
        return out;
      });

      setTasks(enriched);
      setMeta((prev) => ({ ...prev, ...m }));
    } catch (err) {
      console.error("fetchTasks:", err);
      setError(String(err));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMe = async () => {
    try {
      const r = await fetch(`${API_BASE}/auth/me`, {
        credentials: "include",
      });
      if (!r.ok) return;
      const me = await r.json();
      setCurrentUser(me || null);

      const rolesRaw = [];
      if (me?.role) rolesRaw.push(me.role);
      if (Array.isArray(me?.roles)) rolesRaw.push(...me.roles);
      const roles = rolesRaw
        .filter(Boolean)
        .map((r) => String(r).toLowerCase());
      const admin = roles.some((r) =>
        ["admin", "administrator", "superadmin"].includes(r)
      );
      setIsAdmin(admin);
    } catch (e) {
      console.error("fetchMe:", e);
      setCurrentUser(null);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    (async () => {
      await Promise.all([fetchUsers(), fetchTasks(meta.page, meta.limit), fetchMe()]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- UI helpers --- */
  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const findUserDisplay = (id) => {
    if (id == null) return id;
    const u = allUsers.find(
      (x) =>
        String(x.id) === String(id) ||
        String(x.Id ?? "") === String(id) ||
        String(x.userId ?? "") === String(id) ||
        String(x.UserId ?? "") === String(id)
    );
    if (!u) return id;
    return u.displayName ?? u.name ?? u.username ?? String(u.id);
  };

  const statusColor = (s) => {
    const map = {
      Completed: { bg: "#e6f4ea", fg: "#11633a" },
      "In-Progress": { bg: "#fff8e6", fg: "#6a4e00" },
      "On-Hold": { bg: "#fdecea", fg: "#7b1616" },
      Pending: { bg: "#eef0f2", fg: "#2f3942" },
    };
    return map[s] || map.Pending;
  };

  /* --- CRUD --- */
  const openAdd = () => {
    setForm(defaultForm());
    setShowModal(true);
  };

  const openEdit = (task) => {
    const assignedIds = Array.isArray(task.AssigneeIds)
      ? task.AssigneeIds.map(String)
      : task.AssignedToIds ??
        task.assignedToIds ??
        (task.AssigneeId ? [String(task.AssigneeId)] : []);
    const display = (assignedIds || [])
      .map((id) => findUserDisplay(id))
      .filter(Boolean)
      .join(", ");

    setForm({
      id: task.id ?? task.Id ?? null,
      title: task.title ?? task.Title ?? "",
      description: task.description ?? task.Description ?? "",
      assignedToIds: assignedIds || [],
      assignedToDisplay: display,
      dueDate:
        (task.dueDate || task.DueDate)
          ? (task.dueDate || task.DueDate).slice(0, 10)
          : "",
      status:
        task.status ??
        task.Status ??
        (task.completed ? "Completed" : "Pending"),
      priority: task.priority ?? task.Priority ?? 2,
      broadcast: task.broadcast ?? task.Broadcast ?? false,
    });
    if (!allUsers.length) fetchUsers();
    setShowModal(true);
  };

  const saveTask = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    try {
      if (!form.title || !form.title.trim()) {
        alert("Title required");
        setSaving(false);
        return;
      }
      const payload = {
        Id: form.id ?? undefined,
        Title: form.title,
        Description: form.description || null,
        AssigneeIds: Array.isArray(form.assignedToIds)
          ? form.assignedToIds.filter(Boolean)
          : [],
        TeamId: null,
        Status: normalizeStatusValue(form.status),
        Priority: Number(form.priority) || 2,
        DueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        Broadcast: !!form.broadcast,
      };
      const url = form.id
        ? `${API_BASE}/tasks/${form.id}`
        : `${API_BASE}/tasks`;
      const method = form.id ? "PUT" : "POST";
      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`API error (${resp.status}): ${txt || resp.statusText}`);
      }
      setShowModal(false);
      await fetchTasks(meta.page, meta.limit);
    } catch (err) {
      console.error("saveTask:", err);
      alert("Save error: " + String(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      const resp = await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      await fetchTasks(meta.page, meta.limit);
    } catch (err) {
      console.error("deleteTask:", err);
      alert("Delete failed: " + String(err));
    }
  };

  const sendTaskNotification = async (taskId) => {
    try {
      const resp = await fetch(`${API_BASE}/tasks/${taskId}/send`, {
        method: "POST",
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `HTTP ${resp.status}`);
      }
      alert("Message(s) queued/sent successfully!");
      await fetchTasks(meta.page, meta.limit);
    } catch (err) {
      console.error("sendTaskNotification:", err);
      alert("Error sending message: " + (err.message || err));
    }
  };

  // admin: change owner (single owner from allUsers)
  const handleChangeOwner = async (taskId, newOwnerId) => {
    const task = tasks.find(
      (t) => String(t.id ?? t.Id) === String(taskId)
    );
    if (!task) return;
    setChangingOwnerId(taskId);
    try {
      const payload = {
        Id: task.id ?? task.Id,
        Title: task.title ?? task.Title ?? "",
        Description: task.description ?? task.Description ?? null,
        AssigneeIds: newOwnerId ? [String(newOwnerId)] : [],
        TeamId: null,
        Status: normalizeStatusValue(
          task.status ??
            task.Status ??
            (task.completed ? "Completed" : "Pending")
        ),
        Priority: Number(task.priority ?? task.Priority) || 2,
        DueDate: task.dueDate
          ? new Date(task.dueDate).toISOString()
          : task.DueDate
          ? new Date(task.DueDate).toISOString()
          : null,
        Broadcast: !!(task.broadcast ?? task.Broadcast),
      };
      const resp = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `HTTP ${resp.status}`);
      }
      await fetchTasks(meta.page, meta.limit);
    } catch (e) {
      console.error("handleChangeOwner:", e);
      alert("Failed to change owner: " + String(e));
    } finally {
      setChangingOwnerId(null);
    }
  };

  /* --- filters / derived --- */
  const filtered = useMemo(() => {
    let base = tasks;
    if (statusTab !== "all")
      base = base.filter(
        (t) =>
          (t.status || "")
            .toLowerCase()
            .replace(/\s+/g, "-") === statusTab
      );
    if (!query) return base;
    const q = query.trim().toLowerCase();
    return base.filter(
      (t) =>
        String(t.title ?? "")
          .toLowerCase()
          .includes(q) ||
        String(t.description ?? "")
          .toLowerCase()
          .includes(q) ||
        String(t.assignedTo ?? "")
          .toLowerCase()
          .includes(q) ||
        String(t.AssignedToName ?? "")
          .toLowerCase()
          .includes(q)
    );
  }, [tasks, query, statusTab]);

  /* --- styles (mobile-first) --- */
  const Styles = (
    <style>{`
      :root{ --bg: linear-gradient(180deg,#fffdfa,#fbf3e8); --deep:#12223a; --muted:#6f5f4f; --gold:#d1a62a; --card: rgba(255,255,255,0.96); --shadow:0 12px 34px rgba(12,16,24,0.08); --radius:16px; --safe-bottom: env(safe-area-inset-bottom); }
      .tasks-wrap{ min-height:100vh; padding:12px; background: var(--bg); font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:var(--deep); }
      .top-hero{ position:sticky; top:8px; z-index:20; display:flex; gap:12px; align-items:flex-start; padding:14px; border-radius: var(--radius); background: linear-gradient(90deg,#123a63,#0b2a47); color:white; box-shadow: var(--shadow); }
      .hero-actions{ margin-left:auto; display:flex; gap:8px; flex-wrap:wrap; }
      .btn{ border:none; border-radius:12px; padding:12px 14px; font-weight:800; cursor:pointer; font-size:14px; display:inline-flex; align-items:center; gap:8px; }
      .btn-primary{ background: linear-gradient(90deg,var(--gold), #f4de93); color:#2b1f0f; box-shadow: 0 8px 20px rgba(178,136,7,0.18); }
      .btn-muted{ background:#fff; border:1px solid rgba(0,0,0,0.06); color:#2d3b48; }
      .btn-ghost{ background:transparent; border:1px dashed rgba(255,255,255,0.6); color:#fff; }
      .btn.icon{ padding:10px; border-radius:12px; }

      .search-row{ display:flex; gap:8px; margin-top:12px; }
      .search{ width:100%; padding:12px 14px; border-radius:12px; border:1px solid rgba(0,0,0,0.08); background:#fff; }

      .tabs{ display:flex; gap:8px; margin-top:12px; overflow:auto; }
      .tab{ padding:8px 12px; border-radius:999px; border:1px solid rgba(0,0,0,0.06); background:#fff; font-weight:700; font-size:13px; white-space:nowrap; }
      .tab.active{ background: #fff7d1; border-color: rgba(200,170,90,0.3); }

      .calendar-layout{ display:grid; grid-template-columns: 1fr; gap:12px; margin-top:14px; }
      @media(min-width: 980px){ .calendar-layout{ grid-template-columns: 1fr 360px; } }

      .card{ background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow); border:1px solid rgba(0,0,0,0.04); }
      .pad{ padding:12px; }
      .panel{ padding:10px; border:1px solid rgba(0,0,0,0.04); border-radius:12px; background:#fff; margin-bottom:8px; }

      .grid-7{ display:grid; grid-template-columns: repeat(7,1fr); }
      .gap-xs{ gap:6px; }
      .mb-xs{ margin-bottom:8px; } .mb-sm{ margin-bottom:12px; } .mb-xxs{ margin-bottom:6px; } .mt-xs{ margin-top:8px; } .mt-xxs{ margin-top:6px; }
      .row{ display:flex; } .col{ display:flex; flex-direction:column; }
      .between{ justify-content:space-between; } .center{ align-items:center; }
      .gap-xs{ gap:6px; } .gap-sm{ gap:10px; }
      .bold{ font-weight:800; } .strong{ font-weight:800; } .lg{ font-size:16px; }
      .tiny{ font-size:12px; } .muted{ color: var(--muted); } .muted-out{ background:#fafafa; }
      .pad-s{ padding:6px 8px; }

      .day{ min-height:96px; border-radius:12px; padding:6px; background:#fff; border:1px solid rgba(0,0,0,0.04); cursor:pointer; }
      .day.sel{ border:2px solid #f1c232; box-shadow: 0 8px 24px rgba(17,24,39,0.06); }
      .daynum{ padding:2px 6px; border-radius:8px; }
      .daynum.today{ background:#2e7d32; color:#fff; }

      .pill{ padding:6px 8px; border-radius:8px; font-size:12px; font-weight:700; }
      .task-pill{ background:#fff8e6; border:1px solid rgba(200,170,90,0.12); color:#6a4e00; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }

      .scroll-y{ overflow:auto; }

      .grid-cards{ display:grid; grid-template-columns: 1fr; gap:12px; margin-top:14px; }
      @media(min-width: 760px){ .grid-cards{ grid-template-columns: repeat(2,1fr); } }
      @media(min-width: 1200px){ .grid-cards{ grid-template-columns: repeat(3,1fr); } }

      .task-card{ background:#fff; padding:14px; border-radius:14px; box-shadow:0 8px 24px rgba(11,42,71,0.06); display:flex; flex-direction:column; min-height:150px; border:1px solid rgba(0,0,0,0.04); }

      .status{ padding:6px 12px; border-radius:999px; font-weight:800; font-size:13px; }

      .input{ width:100%; padding:12px; border-radius:12px; border:1px solid #e5e7eb; background:#fff; font-size:14px; }
      .input.like-chipbox{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; cursor:text; min-height:48px; }
      .chip{ display:inline-flex; align-items:center; gap:8px; padding:6px 8px; background:#fff; border:1px solid rgba(0,0,0,0.06); border-radius:10px; box-shadow:0 2px 6px rgba(0,0,0,0.04); }
      .chip-avatar{ width:28px; height:28px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; font-weight:800; font-size:12px; background:linear-gradient(180deg,#fff6e3,#fff1d6); color:#112b44; }
      .chip-avatar.sm{ width:24px; height:24px; font-size:11px; }
      .chip-label{ font-size:13px; color:#123a63; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .chip-x{ background:transparent; border:none; cursor:pointer; color:#c33; font-size:16px; }

      .select-pop{ position:absolute; top:calc(100% + 8px); left:0; right:0; z-index:40; background:#fff; border-radius:12px; box-shadow:0 12px 40px rgba(0,0,0,0.15); border:1px solid rgba(0,0,0,0.06); display:flex; flex-direction:column; max-height:340px; }
      .select-filter{ padding:8px; border-bottom:1px solid rgba(0,0,0,0.04); }
      .select-list{ overflow:auto; padding:8px; }
      .select-row{ display:flex; align-items:center; gap:10px; padding:8px 6px; border-radius:8px; cursor:pointer; }
      .select-actions{ padding:8px; border-top:1px solid rgba(0,0,0,0.04); display:flex; justify-content:space-between; }

      /* Modal Sheet (mobile-friendly) */
      .sheet{ position:fixed; inset:0; background: rgba(7,12,20,0.45); display:flex; align-items:flex-end; justify-content:center; z-index:9999; }
      .sheet-panel{ width:100%; max-width:880px; background: linear-gradient(180deg,#fff,#fffdf8); border-radius:18px 18px 0 0; box-shadow: 0 20px 60px rgba(17,24,39,0.2); padding:16px; max-height:88vh; overflow:auto; }
      @media(min-width: 900px){ .sheet{ align-items:center; } .sheet-panel{ border-radius:18px; } }

      /* FAB */
      .fab{ position: fixed; right: 16px; bottom: calc(18px + var(--safe-bottom)); z-index: 70; }

      /* Utility */
      .ml-auto{ margin-left:auto; }

      /* Admin table styles (list view, admin only) */
      .admin-table-wrap{ margin-top:14px; }
      .admin-table-scroll{ overflow:auto; border-radius:12px; border:1px solid rgba(0,0,0,0.04); }
      .admin-table{ width:100%; border-collapse:collapse; font-size:13px; background:#fff; }
      .admin-table thead{ background:rgba(1,48,98,0.04); text-align:left; }
      .admin-table th{ padding:8px 10px; font-weight:700; }
      .admin-table td{ padding:8px 10px; border-top:1px solid rgba(0,0,0,0.04); vertical-align:top; }
      .admin-td-empty{ text-align:center; color:var(--muted); font-size:13px; }
      .admin-title{ font-weight:600; max-width:260px; white-space:nowrap; text-overflow:ellipsis; overflow:hidden; }
      .admin-desc{ font-size:12px; color:var(--muted); max-width:260px; white-space:nowrap; text-overflow:ellipsis; overflow:hidden; margin-top:2px; }
      .admin-owner-select{ padding:4px 8px; border-radius:999px; border:1px solid rgba(0,0,0,0.16); background:#fff; font-size:12px; min-width:150px; }
    `}</style>
  );

  /* --- render --- */
  return (
    <div className="tasks-wrap">
      {Styles}

      {/* Header / Banner */}
      <div className="top-hero" role="region" aria-label="Tasks header">
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Tasks</h2>
          <p style={{ marginTop: 6, opacity: 0.9, fontSize: 13 }}>
            Manage and track ministry tasks — who is responsible, priorities, and
            due dates.
          </p>
        </div>
        <div className="hero-actions">
          <button
            onClick={() => {
              fetchTasks(meta.page, meta.limit);
            }}
            className="btn btn-ghost"
          >
            <FiRefreshCw /> Refresh
          </button>
          <button
            onClick={() => {
              alert("Export not implemented");
            }}
            className="btn btn-ghost"
          >
            <FiDownload /> Export
          </button>
          <button onClick={openAdd} className="btn btn-primary">
            <FiPlus /> New Task
          </button>
        </div>
      </div>

      {/* Search + View toggles */}
      <div className="search-row">
        <input
          className="search"
          placeholder="Search tasks by title, assigned, or description…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div
          className="ml-auto tiny muted"
          style={{ alignSelf: "center" }}
        >
          Showing {filtered.length} of {meta.total ?? tasks.length}
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Status filters">
        {[
          { key: "all", label: "All" },
          { key: "pending", label: "Pending" },
          { key: "in-progress", label: "In-Progress" },
          { key: "completed", label: "Completed" },
          { key: "on-hold", label: "On-Hold" },
        ].map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={statusTab === t.key}
            className={`tab ${statusTab === t.key ? "active" : ""}`}
            onClick={() => setStatusTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto" />
        <button
          className="tab"
          onClick={() => setView((v) => (v === "calendar" ? "list" : "calendar"))}
        >
          {view === "calendar" ? "Switch to List" : "Switch to Calendar"}
        </button>
      </div>

      {/* Main content */}
      {error && (
        <div className="card pad" style={{ color: "#b91c1c", fontWeight: 700 }}>
          {error}
        </div>
      )}

      {view === "calendar" ? (
        <CalendarView tasks={filtered} onTaskClick={(t) => openEdit(t)} />
      ) : (
        <>
          {/* Admin-only tabular view (on top, list mode) */}
          {isAdmin && (
            <AdminTaskTable
              tasks={filtered}
              allUsers={allUsers}
              busyId={changingOwnerId}
              onChangeOwner={handleChangeOwner}
            />
          )}

          <div className="grid-cards">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="task-card" aria-hidden />
              ))
            ) : filtered.length === 0 ? (
              <div className="card pad muted">No tasks found.</div>
            ) : (
              filtered.map((t) => {
                const sc = statusColor(
                  t.status || (t.completed ? "Completed" : "Pending")
                );
                const assignedDisplay =
                  t.assignedTo && String(t.assignedTo).trim()
                    ? t.assignedTo
                    : Array.isArray(t.assignedToIds)
                    ? t.assignedToIds.map(findUserDisplay).join(", ")
                    : "";
                return (
                  <div
                    key={t.id ?? t.Id}
                    className="task-card"
                    role="article"
                    aria-label={t.title}
                  >
                    <div
                      className="row between"
                      style={{ gap: 12, alignItems: "flex-start" }}
                    >
                      <div>
                        <div className="row gap-xs center">
                          <div
                            className="strong"
                            style={{ fontSize: 16 }}
                          >
                            {t.title}
                          </div>
                          <div className="tiny muted">
                            #{t.id ?? t.Id}
                          </div>
                          {t.broadcast ? (
                            <span
                              className="pill"
                              style={{
                                background: "#fff2cc",
                                border: "1px solid rgba(200,170,90,0.3)",
                                color: "#6a4e00",
                              }}
                            >
                              📣 Broadcast
                            </span>
                          ) : null}
                        </div>
                        <div
                          className="muted mt-xxs"
                          style={{ minHeight: 36 }}
                        >
                          {t.description ? (
                            t.description.length > 160 ? (
                              t.description.slice(0, 160) + "…"
                            ) : (
                              t.description
                            )
                          ) : (
                            <span style={{ opacity: 0.6 }}>
                              No description
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        className="col"
                        style={{ gap: 8, alignItems: "flex-end" }}
                      >
                        <div
                          className="status"
                          style={{ background: sc.bg, color: sc.fg }}
                        >
                          {t.status ||
                            (t.completed ? "Completed" : "Pending")}
                        </div>
                        <div className="tiny muted">
                          <div>
                            Due:{" "}
                            <strong>
                              {t.dueDate
                                ? String(t.dueDate).slice(0, 10)
                                : "-"}
                            </strong>
                          </div>
                          <div className="mt-xxs">
                            Assigned:{" "}
                            <strong>{assignedDisplay || "—"}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="row between center mt-xs">
                      <div className="tiny muted">
                        Priority: <strong>{t.priority ?? 2}</strong>
                      </div>
                      <div className="row gap-xs">
                        <button
                          onClick={() => openEdit(t)}
                          className="btn btn-muted icon"
                          title="Edit"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => deleteTask(t.id ?? t.Id)}
                          className="btn btn-muted icon"
                          title="Delete"
                          style={{
                            background: "#d32f2f",
                            color: "#fff",
                            border: "none",
                          }}
                        >
                          <FiTrash2 />
                        </button>
                        <button
                          onClick={() => sendTaskNotification(t.id ?? t.Id)}
                          className="btn btn-muted icon"
                          title="Send"
                          style={{
                            background: "#2e7d32",
                            color: "#fff",
                            border: "none",
                          }}
                        >
                          <FiSend />
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard
                              ?.writeText(
                                window.location.href +
                                  "/tasks/" +
                                  ((t.id ?? t.Id) || "")
                              )
                              .catch(() => {});
                            alert("Link copied.");
                          }}
                          className="btn btn-muted icon"
                          title="Copy link"
                        >
                          <FiLink />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Floating Add button */}
      <div className="fab">
        <button
          className="btn btn-primary"
          onClick={openAdd}
          aria-label="Add task"
        >
          <FiPlus /> New Task
        </button>
      </div>

      {/* Modal Sheet */}
      {showModal && (
        <div
          className="sheet"
          role="dialog"
          aria-modal="true"
          aria-label={form.id ? "Edit Task" : "New Task"}
          onClick={(e) => {
            if (e.target.classList.contains("sheet")) setShowModal(false);
          }}
        >
          <div className="sheet-panel">
            <h3 style={{ marginTop: 0 }}>
              {form.id ? "Edit Task" : "New Task"}
            </h3>
            <form
              onSubmit={saveTask}
              style={{ display: "grid", gap: 12 }}
            >
              <label className="col">
                <span className="tiny muted bold">Title</span>
                <input
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  className="input"
                />
              </label>

              <label className="col">
                <span className="tiny muted bold">Description</span>
                <textarea
                  value={form.description || ""}
                  onChange={(e) =>
                    setField("description", e.target.value)
                  }
                  className="input"
                  style={{ minHeight: 90 }}
                />
              </label>

              <div
                className="row gap-sm"
                style={{ flexWrap: "wrap" }}
              >
                <div style={{ flex: "1 1 320px", minWidth: 260 }}>
                  <div
                    className="tiny muted bold"
                    style={{ marginBottom: 6 }}
                  >
                    Assigned To (multiple)
                  </div>
                  <MultiUserSelect
                    allUsers={allUsers}
                    value={form.assignedToIds || []}
                    onChange={(ids) => {
                      setField("assignedToIds", ids);
                      setField(
                        "assignedToDisplay",
                        (ids || []).map(findUserDisplay).join(", ")
                      );
                    }}
                  />
                </div>
                <div
                  className="col"
                  style={{
                    flex: "1 1 220px",
                    minWidth: 220,
                    gap: 10,
                  }}
                >
                  <label className="col">
                    <span className="tiny muted bold">Due Date</span>
                    <input
                      type="date"
                      value={form.dueDate || ""}
                      onChange={(e) =>
                        setField("dueDate", e.target.value)
                      }
                      className="input"
                    />
                  </label>
                  <label
                    className="row center"
                    style={{ gap: 8 }}
                  >
                    <input
                      type="checkbox"
                      checked={!!form.broadcast}
                      onChange={(e) =>
                        setField("broadcast", e.target.checked)
                      }
                    />
                    <span className="tiny">
                      Broadcast to Upcoming Events
                    </span>
                  </label>
                  <label className="col">
                    <span className="tiny muted bold">Status</span>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setField("status", e.target.value)
                      }
                      className="input"
                    >
                      <option>Pending</option>
                      <option>In-Progress</option>
                      <option>On-Hold</option>
                      <option>Completed</option>
                    </select>
                  </label>
                  <label className="col">
                    <span className="tiny muted bold">Priority</span>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={form.priority ?? 2}
                      onChange={(e) =>
                        setField("priority", e.target.value)
                      }
                      className="input"
                    />
                  </label>
                </div>
              </div>

              <div
                className="row between"
                style={{ gap: 8, flexWrap: "wrap" }}
              >
                <button
                  type="button"
                  className="btn btn-muted"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
