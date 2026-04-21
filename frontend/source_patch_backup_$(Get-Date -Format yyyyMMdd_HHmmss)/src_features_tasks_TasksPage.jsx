// src/features/tasks/TasksPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiEdit2, FiTrash2, FiSend, FiLink, FiChevronLeft, FiChevronRight } from "react-icons/fi";

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
const API_BASE = "http://localhost:5001/api";

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
  };
}

/* --- MultiSelect component (inline) --- */
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

  const filtered = (allUsers || []).filter((u) =>
    (u.displayName || "").toString().toLowerCase().includes(filter.trim().toLowerCase()) ||
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
        style={{
          ...input,
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          cursor: "text",
        }}
      >
        {/* chips */}
        {(value || []).length === 0 ? (
          <div style={{ color: "#888" }}>— none — (click to pick)</div>
        ) : (
          (value || []).map((id) => {
            const u = allUsers.find((x) => String(x.id) === String(id));
            const label = u ? (u.displayName ?? u.name ?? u.email) : id;
            const initials = label
              .split(" ")
              .map((s) => s[0] || "")
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <div key={id} style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.06)",
                borderRadius: 10,
                boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                marginRight: 6
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, display: "inline-flex",
                  alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12,
                  background: "linear-gradient(180deg,#fff6e3,#fff1d6)", color: "#112b44"
                }}>{initials}</div>
                <div style={{ fontSize: 13, color: "#123a63", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
                <button type="button" onClick={(e) => { e.stopPropagation(); removeChip(id); }} style={{
                  marginLeft: 6, background: "transparent", border: "none", cursor: "pointer", color: "#c33"
                }}>×</button>
              </div>
            );
          })
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 12, color: "#666" }}>{(value || []).length} selected</div>
          <div style={{ fontSize: 12, color: "#999" }}>{open ? "▴" : "▾"}</div>
        </div>
      </div>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          left: 0,
          right: 0,
          zIndex: 3000,
          background: "white",
          borderRadius: 8,
          boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
          border: "1px solid rgba(0,0,0,0.06)",
          padding: 8,
          maxHeight: 340,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{ padding: "6px 8px", borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
            <input
              placeholder="Filter users..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #eee" }}
            />
          </div>

          <div style={{ overflowY: "auto", padding: 8 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 16, color: "#777" }}>No users match</div>
            ) : (
              filtered.map((u) => {
                const id = u.id ?? u.Id ?? u.userId ?? u.UserId;
                const checked = selectedMap.has(String(id));
                const initials = (u.displayName || u.name || u.email || "")
                  .split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <label key={id} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 6px",
                    borderRadius: 8,
                    cursor: "pointer"
                  }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleUser(id)}
                    />
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, display: "inline-flex",
                      alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14,
                      background: "linear-gradient(180deg,#fff6e3,#fff1d6)", color: "#112b44", flexShrink: 0
                    }}>{initials}</div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ fontWeight: 700 }}>{u.displayName ?? u.name ?? u.email}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>{u.email ?? ""}</div>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <div style={{ padding: 8, borderTop: "1px solid rgba(0,0,0,0.03)", display: "flex", justifyContent: "space-between" }}>
            <button type="button" onClick={() => { onChange([]); setFilter(""); }} style={{ ...ghostBtn, padding: "6px 10px" }}>Clear</button>
            <div>
              <button type="button" onClick={() => setOpen(false)} style={{ ...modalSave, padding: "6px 10px" }}>Done</button>
            </div>
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
    d.setHours(0,0,0,0);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState(null);

  function monthMatrix(d) {
    const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const startDay = firstOfMonth.getDay(); // 0 = Sunday
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

  function prev() {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }
  function next() {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }
  function goToday() {
    const d = new Date();
    d.setDate(1);
    setMonth(d);
    setSelectedDate(null);
  }

  const selectedKey = selectedDate ? toKey(selectedDate) : null;
  const selectedTasks = selectedKey ? (tasksByDate.get(selectedKey) || []) : [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={prev} style={{ ...ghostBtn, padding: "6px 8px" }} title="Previous month"><FiChevronLeft /></button>
            <button onClick={next} style={{ ...ghostBtn, padding: "6px 8px" }} title="Next month"><FiChevronRight /></button>
            <button onClick={goToday} style={{ ...ghostBtn, padding: "6px 8px" }}>Today</button>
          </div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{month.toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
          <div style={{ width: 120 }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 8 }}>
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((h) => (
            <div key={h} style={{ textAlign: "center", fontWeight: 700, color: "#666" }}>{h}</div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
          {weeks.flat().map((date) => {
            const k = toKey(date);
            const items = tasksByDate.get(k) || [];
            const inMonth = date.getMonth() === month.getMonth();
            const isToday = k === todayKey;
            return (
              <div
                key={k}
                onClick={() => { setSelectedDate(new Date(date)); }}
                style={{
                  minHeight: 96,
                  borderRadius: 8,
                  padding: 6,
                  background: inMonth ? "#fff" : "#fafafa",
                  border: selectedKey === k ? "2px solid #f1c232" : "1px solid rgba(0,0,0,0.04)",
                  boxShadow: selectedKey === k ? "0 8px 24px rgba(17,24,39,0.06)" : "none",
                  cursor: "pointer",
                }}
                title={`${date.toDateString()} — ${items.length} task(s)`}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 12, color: isToday ? "#fff" : "#333", fontWeight: 700, background: isToday ? "#2e7d32" : "transparent", padding: isToday ? "4px 8px" : 0, borderRadius: 8 }}>
                    {date.getDate()}
                  </div>
                  <div style={{ fontSize: 11, color: "#777" }}>{items.length > 0 ? `${items.length}` : ""}</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {items.slice(0,3).map((t) => (
                    <div
                      key={(t.id ?? t.Id) + "-" + k}
                      onClick={(e) => { e.stopPropagation(); onTaskClick(t); }}
                      style={{
                        padding: "6px 8px",
                        borderRadius: 8,
                        background: "#fff8e6",
                        border: "1px solid rgba(200,170,90,0.12)",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#6a4e00",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                        cursor: "pointer"
                      }}
                      title={t.title}
                    >
                      {t.title}
                    </div>
                  ))}
                  {items.length > 3 && <div style={{ fontSize: 12, color: "#888" }}>+{items.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* side panel: tasks for selected day */}
      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 800 }}>{selectedDate ? selectedDate.toDateString() : "Select a date"}</div>
          <div style={{ color: "#666", fontSize: 12 }}>{selectedKey ? (tasksByDate.get(selectedKey)?.length || 0) + " tasks" : ""}</div>
        </div>

        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {selectedTasks.length === 0 ? (
            <div style={{ color: "#777", padding: 12 }}>No tasks for this day.</div>
          ) : (
            selectedTasks.map((t) => (
              <div key={t.id ?? t.Id} style={{ padding: 10, borderRadius: 8, border: "1px solid rgba(0,0,0,0.04)", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontWeight: 800 }}>{t.title}</div>
                  <div style={{ color: "#666", fontSize: 12 }}>{t.priority ?? 2}</div>
                </div>
                <div style={{ color: "#666", marginTop: 6 }}>{(t.description || "").slice(0, 160)}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={() => onTaskClick(t)} style={iconBtn}><FiEdit2 /></button>
                  <button onClick={() => { navigator.clipboard?.writeText(window.location.href + "/tasks/" + (t.id ?? t.Id || "")); alert("Link copied"); }} style={ghostIconBtn}><FiLink /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* --- main TasksPage component (keeps your existing fetch/save logic) --- */
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
      const q = new URLSearchParams({ page: String(page), limit: String(limit) });
      const r = await fetch(`${API_BASE}/tasks?${q.toString()}`);
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`API error (${r.status}): ${txt || r.statusText}`);
      }
      const json = await r.json();
      const { items, meta: m } = normalizeResponse(json);

      // Enrich tasks: map AssigneeIds -> display names if present
      const enriched = (items || []).map((t) => {
        const out = { ...t };
        // backend returns either single AssigneeId (legacy) or AssigneeIds (array)
        out.assignedToIds = out.AssigneeIds ?? out.assigneeIds ?? (out.AssigneeId ? [String(out.AssigneeId)] : []);
        // AssignedToNames might be present as array or comma string
        if (Array.isArray(out.AssignedToNames)) {
          out.assignedTo = out.AssignedToNames.join(", ");
        } else if (typeof out.AssignedToNames === "string") {
          out.assignedTo = out.AssignedToNames;
        } else if (out.AssignedToName) {
          out.assignedTo = out.AssignedToName;
        } else {
          out.assignedTo = "";
        }

        // normalize id/title and dueDate
        out.id = out.Id ?? out.id ?? null;
        out.title = out.Title ?? out.title ?? "";
        if (out.DueDate && !out.dueDate) out.dueDate = out.DueDate;
        out.priority = out.Priority ?? out.priority ?? 2;
        out.status = out.Status ?? out.status ?? (out.Completed ? "Completed" : "Pending");

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

  useEffect(() => {
    (async () => {
      await fetchUsers();
      await fetchTasks(meta.page, meta.limit);
      // eslint-disable-next-line
    })();
  }, []);

  /* --- UI helpers --- */
  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const findUserDisplay = (id) => {
    if (id == null) return id;
    const u = allUsers.find((x) => {
      return (
        String(x.id) === String(id) ||
        String(x.Id ?? "") === String(id) ||
        String(x.userId ?? "") === String(id) ||
        String(x.UserId ?? "") === String(id)
      );
    });
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
    // map server assignees into form.assignedToIds
    const assignedIds = Array.isArray(task.AssigneeIds)
      ? task.AssigneeIds.map(String)
      : task.AssignedToIds ?? task.assignedToIds ?? (task.AssigneeId ? [String(task.AssigneeId)] : []);

    // compute display
    const display = (assignedIds || []).map((id) => findUserDisplay(id)).filter(Boolean).join(", ");

    setForm({
      id: task.id ?? task.Id ?? null,
      title: task.title ?? task.Title ?? "",
      description: task.description ?? task.Description ?? "",
      assignedToIds: assignedIds || [],
      assignedToDisplay: display,
      dueDate: (task.dueDate || task.DueDate) ? (task.dueDate || task.DueDate).slice(0, 10) : "",
      status: task.status ?? task.Status ?? (task.completed ? "Completed" : "Pending"),
      priority: task.priority ?? task.Priority ?? 2,
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

      // Backend expects AssigneeIds (array of GUID strings). Keep compatibility with older single AssigneeId if needed.
      const payload = {
        Id: form.id ?? undefined,
        Title: form.title,
        Description: form.description || null,
        AssigneeIds: Array.isArray(form.assignedToIds) ? form.assignedToIds.filter(Boolean) : [],
        TeamId: null,
        Status: form.status || "Pending",
        Priority: Number(form.priority) || 2,
        DueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      };

      let resp;
      if (form.id) {
        resp = await fetch(`${API_BASE}/tasks/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        resp = await fetch(`${API_BASE}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

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

  /* --- send action (SMS/WhatsApp/Email) --- */
  const sendTaskNotification = async (taskId) => {
    try {
      const resp = await fetch(`${API_BASE}/tasks/${taskId}/send`, { method: "POST" });
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

  /* --- filters / derived --- */
  const filtered = useMemo(() => {
    if (!query) return tasks;
    const q = query.trim().toLowerCase();
    return tasks.filter(
      (t) =>
        String(t.title ?? "").toLowerCase().includes(q) ||
        String(t.description ?? "").toLowerCase().includes(q) ||
        String(t.assignedTo ?? "").toLowerCase().includes(q) ||
        String(t.AssignedToName ?? "").toLowerCase().includes(q)
    );
  }, [tasks, query]);

  /* --- render --- */
  return (
    <div style={pageWrap}>
      {/* banner */}
      <div style={banner}>
        <div>
          <h2 style={{ margin: 0, color: "white", fontSize: 28 }}>Tasks</h2>
          <p style={{ marginTop: 6, color: "rgba(255,255,255,0.9)" }}>
            Manage and track ministry tasks — who is responsible, priorities, and due dates.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => { fetchTasks(meta.page, meta.limit); }} style={ghostBtn}>
            ⟳ Refresh
          </button>
          <button onClick={openAdd} style={goldBtn}>
            + New Task
          </button>
          <button onClick={() => { alert("Export not implemented"); }} style={ghostBtn}>
            ⤓ Export
          </button>
        </div>
      </div>

      {/* search */}
      <div style={{ marginTop: 18, display: "flex", gap: 12, alignItems: "center" }}>
        <input
          placeholder="Search tasks by title, assigned, or description..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={searchInput}
        />
        <div style={{ marginLeft: "auto", color: "#666", fontSize: 13 }}>
          Showing {filtered.length} of {meta.total ?? tasks.length}
        </div>
      </div>

      {/* CALENDAR view */}
      <div style={{ marginTop: 18 }}>
        <CalendarView tasks={tasks} onTaskClick={(t) => openEdit(t)} />
      </div>

      {/* grid */}
      <div style={{ marginTop: 18 }}>
        {loading ? (
          <div style={{ padding: 28, background: "white", borderRadius: 12 }}>Loading tasks…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 28, background: "white", borderRadius: 12 }}>No tasks found.</div>
        ) : (
          <div style={cardGrid}>
            {filtered.map((t) => {
              const sc = statusColor(t.status || (t.completed ? "Completed" : "Pending"));
              const assignedDisplay =
                t.assignedTo && String(t.assignedTo).trim()
                  ? t.assignedTo
                  : (Array.isArray(t.assignedToIds) ? t.assignedToIds.map(findUserDisplay).join(", ") : "");
              return (
                <div key={t.id ?? t.Id ?? Math.random()} style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{t.title}</div>
                        <div style={{ fontSize: 13, color: "#888" }}>#{t.id ?? t.Id}</div>
                      </div>
                      <div style={{ marginTop: 8, color: "#666", minHeight: 36 }}>
                        {t.description ? (
                          t.description.length > 160 ? t.description.slice(0, 160) + "…" : t.description
                        ) : (
                          <span style={{ color: "#bbb" }}>No description</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                      <div style={{ ...statusPill(sc) }}>{t.status || (t.completed ? "Completed" : "Pending")}</div>
                      <div style={{ fontSize: 13, color: "#666" }}>
                        <div>
                          Due: <strong>{t.dueDate ? String(t.dueDate).slice(0, 10) : "-"}</strong>
                        </div>
                        <div style={{ marginTop: 6 }}>
                          Assigned:{" "}
                          <strong>
                            {assignedDisplay || "—"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                    <div style={{ color: "#777", fontSize: 13 }}>
                      Priority: <strong>{t.priority ?? 2}</strong>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => openEdit(t)} style={iconBtn} title="Edit">
                        <FiEdit2 />
                      </button>

                      <button onClick={() => deleteTask(t.id ?? t.Id)} style={deleteIconBtn} title="Delete">
                        <FiTrash2 />
                      </button>

                      <button onClick={() => sendTaskNotification(t.id ?? t.Id)} style={sendIconBtn} title="Send">
                        <FiSend />
                      </button>

                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(window.location.href + "/tasks/" + (t.id ?? t.Id ?? "")).catch(() => {});
                          alert("Link copied.");
                        }}
                        style={ghostIconBtn}
                        title="Copy link"
                      >
                        <FiLink />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* modal (simple inline modal, same visual language) */}
      {showModal && (
        <div style={modalOverlay}>
          <div style={modal}>
            <h3 style={{ marginTop: 0 }}>{form.id ? "Edit Task" : "New Task"}</h3>
            <form onSubmit={saveTask} style={{ display: "grid", gap: 10 }}>
              <label style={label}>
                Title
                <input value={form.title} onChange={(e) => setField("title", e.target.value)} style={input} />
              </label>

              <label style={label}>
                Description
                <textarea value={form.description || ""} onChange={(e) => setField("description", e.target.value)} style={{ ...input, minHeight: 80 }} />
              </label>

              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: 6 }}>
                    Assigned To (multiple)
                  </label>

                  <MultiUserSelect
                    allUsers={allUsers}
                    value={form.assignedToIds || []}
                    onChange={(ids) => {
                      setField("assignedToIds", ids);
                      setField("assignedToDisplay", (ids || []).map(findUserDisplay).join(", "));
                    }}
                  />
                </div>

                <div style={{ width: 170 }}>
                  <label style={{ display: "block" }}>
                    Due Date
                    <input type="date" value={form.dueDate || ""} onChange={(e) => setField("dueDate", e.target.value)} style={input} />
                  </label>

                  <label style={{ display: "block", marginTop: 10 }}>
                    Status
                    <select value={form.status} onChange={(e) => setField("status", e.target.value)} style={input}>
                      <option>Pending</option>
                      <option>In-Progress</option>
                      <option>On-Hold</option>
                      <option>Completed</option>
                    </select>
                  </label>

                  <label style={{ display: "block", marginTop: 10 }}>
                    Priority
                    <input type="number" min="1" max="5" value={form.priority ?? 2} onChange={(e) => setField("priority", e.target.value)} style={input} />
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={() => setShowModal(false)} style={modalCancel}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={modalSave}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  function setFieldForm(k, v) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }
}

/* --- styles (same as before) --- */
/* (keep your existing style constants below unchanged) */
const pageWrap = { padding: 22, minHeight: "100vh", background: "#fdf0f0", fontFamily: "Segoe UI, Roboto, Helvetica, Arial, sans-serif" };
const banner = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "linear-gradient(90deg,#123a63,#0b2a47)",
  color: "white",
  padding: "22px 26px",
  borderRadius: 14,
  boxShadow: "0 10px 30px rgba(11,42,71,0.12)",
};
const sendBtn = {
  background: "#2e7d32",
  color: "white",
  border: "none",
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
  boxShadow: "0 2px 6px rgba(46,125,50,0.3)",
};
const ghostBtn = {
  background: "white",
  color: "#123a63",
  padding: "8px 14px",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
};
const goldBtn = {
  background: "#f1c232",
  color: "#123a63",
  padding: "10px 16px",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  boxShadow: "0 6px 14px rgba(241,194,50,0.18)",
};
const searchInput = {
  width: "100%",
  maxWidth: 720,
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(17,24,39,0.06)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
  fontSize: 14,
};
const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))",
  gap: 18,
};
const card = {
  background: "white",
  padding: 18,
  borderRadius: 12,
  boxShadow: "0 6px 20px rgba(11,42,71,0.06)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  minHeight: 150,
};
const statusPill = (sc) => ({
  background: sc.bg,
  color: sc.fg,
  padding: "6px 12px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 13,
});
const iconBtn = {
  background: "white",
  border: "1px solid rgba(0,0,0,0.06)",
  padding: "8px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 16,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
};
const deleteIconBtn = {
  ...iconBtn,
  background: "#d32f2f",
  color: "white",
  border: "none",
};
const sendIconBtn = {
  ...iconBtn,
  background: "#2e7d32",
  color: "white",
  border: "none",
};
const ghostIconBtn = {
  ...iconBtn,
  background: "transparent",
  border: "1px dashed rgba(0,0,0,0.12)",
};
const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(7,12,20,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};
const modal = { width: 820, maxWidth: "95%", background: "white", padding: 20, borderRadius: 12, boxShadow: "0 20px 60px rgba(17,24,39,0.2)" };
const label = { display: "block", fontSize: 13, color: "#333" };
const input = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", marginTop: 6, fontSize: 14 };
const modalCancel = { background: "white", border: "1px solid #e5e7eb", padding: "8px 12px", borderRadius: 8, cursor: "pointer" };
const modalSave = { background: "#0b2a47", color: "white", padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontWeight: 700 };
