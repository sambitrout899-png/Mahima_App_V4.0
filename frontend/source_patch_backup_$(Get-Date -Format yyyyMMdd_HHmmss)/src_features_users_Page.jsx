// src/features/users/UsersPage.CathedralAdvanced.jsx
import React, { useEffect, useState } from "react";

/* ---------- helpers (unchanged) ---------- */
function isoToDatetimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function datetimeLocalToIso(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
function formatFriendlyDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

/* ---------- config & small utils ---------- */
const API_BASE = "http://localhost:5001/api";
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
function defaultForm() {
  // role will store the role id as a string when possible
  return { id: null, displayName: "", username: "", email: "", phone: "", role: "", joinDate: new Date().toISOString() };
}
const phoneAllowTypingRegex = /^\+?\d*$/;
const phoneFinalRegex = /^\+\d{10,}$/;

/* ---------- component ---------- */
export default function UsersPageCathedralAdvanced() {
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState(null); // null = not loaded yet
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);
  const [modalSuccess, setModalSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [deletingId, setDeletingId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* ---------- broadcast modal state ---------- */
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastType, setBroadcastType] = useState("Welcome");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastChannels, setBroadcastChannels] = useState({ email: true, whatsapp: true, sms: true });
  const [selectedIds, setSelectedIds] = useState(new Set()); // set of user id strings
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState(null); // store response for summary
  const [modalSearch, setModalSearch] = useState("");

  /* ---------- roles state ---------- */
  const [roles, setRoles] = useState([]); // array of { id, name, pages? }
  const [rolesLoading, setRolesLoading] = useState(false);

  /* ---------- API calls ---------- */
  const fetchUsers = async (page = 1, limit = 10, searchTerm = "") => {
    try {
      setLoading(true);
      setError(null);
      const q = new URLSearchParams({ search: searchTerm ?? "", page: String(page), limit: String(limit) });
      const resp = await fetch(`${API_BASE}/users?${q.toString()}`);
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`HTTP ${resp.status} - ${txt || "error"}`);
      }
      const data = await resp.json();
      const { items, meta: newMeta } = normalizeResponse(data);
      setUsers(items || []);
      setMeta((prev) => ({ ...prev, page: newMeta.page ?? page, limit: newMeta.limit ?? limit, total: newMeta.total ?? prev.total }));
    } catch (err) {
      setError(String(err));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all users for selection (not limited). We attempt a large limit; backend should support it.
  const fetchAllUsers = async () => {
    // if already loaded, don't reload
    if (allUsers !== null) return;
    try {
      setAllUsers(null); // loading sentinel
      const q = new URLSearchParams({ search: "", page: "1", limit: "10000" });
      const resp = await fetch(`${API_BASE}/users?${q.toString()}`);
      if (!resp.ok) {
        setAllUsers([]); // fallback
        return;
      }
      const data = await resp.json();
      const { items } = normalizeResponse(data);
      setAllUsers(items || []);
      // preselect all by default (as requested)
      setSelectedIds(new Set((items || []).map(u => u.id)));
    } catch (err) {
      setAllUsers([]);
    }
  };

  // fetch roles from API and store
  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const resp = await fetch(`${API_BASE}/roles`);
      if (!resp.ok) {
        setRoles([]);
        return;
      }
      const j = await resp.json();
      // accept items / data / array
      const items = (j && (j.items || j.data || j)) || [];
      setRoles(items || []);
    } catch (err) {
      console.warn("fetchRoles error:", err);
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(meta.page, meta.limit, search); /* eslint-disable-line */
    fetchRoles(); /* load roles for dropdown */
  }, []);

  /* ---------- actions ---------- */
  const openAdd = () => {
    // choose sensible default role: Member if present otherwise first role id
    const memberRole = roles.find(r => String(r.name).toLowerCase() === "member");
    const defaultRoleId = memberRole ? String(memberRole.id) : (roles[0] ? String(roles[0].id) : "");
    setForm({ ...defaultForm(), role: defaultRoleId });
    setModalMessage(null);
    setModalSuccess(false);
    setShowModal(true);
  };

  const openEdit = (u) => {
    // Try to determine the role id from the user object:
    // user may contain Role (number), role (name or id), RoleId, roleName, etc.
    let rawRole = null;
    if (u.Role != null) rawRole = u.Role;
    else if (u.RoleId != null) rawRole = u.RoleId;
    else if (u.role != null) rawRole = u.role;
    else if (u.roleId != null) rawRole = u.roleId;
    else if (u.roleName != null) rawRole = u.roleName;
    else if (u.RoleName != null) rawRole = u.RoleName;

    let normalizedRoleId = "";

    if (rawRole != null) {
      // numeric -> use directly
      if (typeof rawRole === "number" || /^[0-9]+$/.test(String(rawRole))) {
        normalizedRoleId = String(rawRole);
      } else if (typeof rawRole === "string") {
        // string could be a name ("Admin") — try to map to id using loaded roles
        const match = roles.find(r => String(r.name).toLowerCase() === rawRole.toLowerCase());
        if (match) normalizedRoleId = String(match.id);
        else {
          // if roles not loaded yet or no match, leave as string (UI will show fallback label)
          normalizedRoleId = rawRole;
        }
      }
    }

    setForm({
      id: u.id ?? null,
      displayName: u.displayName ?? u.name ?? "",
      username: u.username ?? u.userName ?? "",
      email: u.email ?? "",
      phone: u.phone ?? "",
      role: normalizedRoleId,
      joinDate: u.joinDate ? new Date(u.joinDate).toISOString() : new Date().toISOString(),
    });
    setModalMessage(null);
    setModalSuccess(false);
    setShowModal(true);
  };

  // broadcast buttons open modal with type preset
  const openBroadcast = async (type) => {
    setBroadcastType(type);
    setBroadcastMessage("");
    setBroadcastChannels({ email: true, whatsapp: true, sms: true });
    setSendResults(null);
    setModalSearch("");
    setBroadcastOpen(true);
    await fetchAllUsers();
  };

  // toggle single selection
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id); else copy.add(id);
      return copy;
    });
  };

  const selectAllVisible = () => {
    if (!allUsers) return;
    setSelectedIds(new Set(allUsers.map(u => u.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  // VALIDATE and send PascalCase payload that matches backend DTO (DisplayName, Username, Email, Phone, Role, JoinDate)
  const saveUser = async (e) => {
    e?.preventDefault?.();

    // client-side validation
    const usernameTrim = (form.username ?? "").trim();
    if (!usernameTrim) {
      alert("Username is required.");
      return;
    }

    if (form.phone && !phoneFinalRegex.test(form.phone)) {
      if (!window.confirm("Phone looks invalid (should start with + and at least 10 digits). Continue?")) return;
    }

    setSaving(true);
    setModalMessage(null);
    setModalSuccess(false);

    try {
      // Try to resolve a numeric role id from form.role (which is usually a string id)
      let roleIdNumber = null;
      if (form.role != null && form.role !== "") {
        const asNumber = Number(form.role);
        if (!Number.isNaN(asNumber) && asNumber > 0) {
          roleIdNumber = asNumber;
        } else {
          // maybe it's a role name — try to find its id
          const byName = roles.find(r => String(r.name).toLowerCase() === String(form.role).toLowerCase());
          if (byName) roleIdNumber = byName.id;
        }
      }

      // canonical payload with PascalCase fields (backend-friendly)
      const payload = {
        DisplayName: (form.displayName ?? "").trim() || null,
        Username: usernameTrim,
        Email: (form.email ?? "").trim() || null,
        Phone: (form.phone ?? "").trim() || null,
        JoinDate: form.joinDate ? new Date(form.joinDate).toISOString() : null,
        ...(form.id ? { Id: form.id } : {})
      };

      if (roleIdNumber != null) {
        payload.Role = roleIdNumber;
        payload.RoleId = roleIdNumber;
        const roleObj = roles.find(r => Number(r.id) === Number(roleIdNumber));
        if (roleObj) payload.RoleName = roleObj.name;
      } else {
        // if no numeric id resolved, still include RoleName if a textual name was provided
        if (form.role && typeof form.role === "string") {
          payload.RoleName = form.role;
        }
      }

      // include lowercase/camelcase aliases (harmless) for compatibility
      payload.displayName = payload.DisplayName;
      payload.username = payload.Username;
      payload.email = payload.Email;
      payload.phone = payload.Phone;
      payload.joinDate = payload.JoinDate;
      if (payload.Role != null) {
        payload.role = payload.Role;
        payload.roleId = payload.RoleId;
      } else if (payload.RoleName) {
        payload.roleName = payload.RoleName;
      }

      const url = `${API_BASE}/users${form.id ? `/${form.id}` : ""}`;
      const resp = await fetch(url, {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const contentType = resp.headers.get("content-type") || "";
        let bodyText = await resp.text().catch(() => "");
        if (contentType.includes("application/json")) {
          try {
            const parsed = JSON.parse(bodyText);
            if (parsed && (parsed.message || parsed.error || parsed.title)) bodyText = parsed.message || parsed.error || parsed.title;
          } catch { /* ignore parse */ }
        }
        throw new Error(bodyText || `HTTP ${resp.status}`);
      }

      setShowModal(false);
      await fetchUsers(1, meta.limit, search);
    } catch (err) {
      console.error("saveUser error (final):", err);
      alert("Save failed: " + (err?.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id) => {
    if (!id) return;
    if (!window.confirm("Delete this user?")) return;
    doDelete(id);
  };
  const doDelete = async (id) => {
    try {
      setDeletingId(id);
      setDeleteLoading(true);
      const resp = await fetch(`${API_BASE}/users/${id}`, { method: "DELETE" });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`HTTP ${resp.status} - ${txt || ""}`);
      }
      await fetchUsers(meta.page, meta.limit, search);
    } catch (err) {
      alert("Delete failed: " + (err?.message || String(err)));
    } finally {
      setDeletingId(null);
      setDeleteLoading(false);
    }
  };

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  /* ---------- Reset password helper (admin) ---------- */
  async function resetPasswordForFormUser() {
    setModalMessage(null);
    setModalSuccess(false);

    // require id and username
    if (!form?.id) {
      setModalMessage("User id not available.");
      return;
    }
    const username = (form?.username || "").trim();
    if (!username) {
      setModalMessage("Username required to compute default password.");
      return;
    }

    if (!window.confirm(`Reset password for "${username}" to "${username}123"?`)) return;

    setResetting(true);
    try {
      const token = localStorage.getItem("mahima_token") || localStorage.getItem("token") || null;

      const newPassword = `${username}123`;

      // --- MODIFY THIS IF YOUR BACKEND USES DIFFERENT ENDPOINT/SHAPE ---
      const url = `${API_BASE}/users/${form.id}/reset-password`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ newPassword })
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(txt || `HTTP ${resp.status}`);
      }

      setModalMessage(`Password reset to "${newPassword}".`);
      setModalSuccess(true);
      // optionally close after short delay:
      setTimeout(() => {
        setModalMessage(null);
        setModalSuccess(false);
      }, 1800);
    } catch (err) {
      console.error("resetPassword error:", err);
      setModalMessage(String(err?.message || err) || "Reset failed");
      setModalSuccess(false);
    } finally {
      setResetting(false);
    }
  }

  /* ---------- broadcast sending ---------- */
  const sendBroadcast = async () => {
    if (!broadcastMessage || broadcastMessage.trim().length === 0) {
      alert("Please enter a message to send.");
      return;
    }
    if (selectedIds.size === 0) {
      if (!window.confirm("No recipients selected — do you want to continue?")) return;
    }

    setSending(true);
    setSendResults(null);
    try {
      const payload = {
        type: broadcastType,
        message: broadcastMessage,
        userIds: Array.from(selectedIds),
        channels: {
          email: !!broadcastChannels.email,
          whatsapp: !!broadcastChannels.whatsapp,
          sms: !!broadcastChannels.sms
        }
      };

      const resp = await fetch(`${API_BASE}/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`HTTP ${resp.status} - ${txt || "error"}`);
      }

      const data = await resp.json();
      setSendResults(data);
    } catch (err) {
      setSendResults({ success: false, error: String(err) });
    } finally {
      setSending(false);
    }
  };

  /* ---------- small helpers ---------- */
  const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const end = Math.min(meta.total, meta.page * meta.limit);

  /* ---------- embedded styles (replaceable) ---------- */
  const EmbeddedStyles = (
    <style>{`
      :root{
        --bg-ivory: linear-gradient(180deg,#fffdfa, #fbf3e8);
        --muted: #4a3a2f;
        --gold: #c9a000;
        --deep: #1e365f;
        --accent: #2f4fa2;
        --card-shadow: 0 10px 30px rgba(18,14,10,0.06);
        --small: 12px;
        --radius: 12px;
        --modal-width: 920px;
      }
      .cathedral-advanced { min-height:100vh; padding: 18px 28px; background: var(--bg-ivory) fixed; font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial; color:var(--deep); }
      .topbar { position: sticky; top:0; z-index: 60; backdrop-filter: blur(4px); background: rgba(255,255,255,0.95); border-bottom: 1px solid rgba(0,0,0,0.04); display:flex; align-items:center; gap:16px; padding:10px 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
      .logo { height:48px; width:auto; display:block; }
      .nav { margin-left: 16px; display:flex; gap:18px; align-items:center; color:var(--muted); font-weight:600; font-size:13px; }
      .nav a { color:var(--muted); text-decoration:none; opacity:0.95; }
      .header-actions { margin-left:auto; display:flex; gap:10px; align-items:center; }
      .hero { margin-top: 14px; margin-bottom: 18px; background: linear-gradient(180deg,#fffef9,#fffaf0); border-radius: var(--radius); padding:18px; display:flex; align-items:center; gap:20px; box-shadow: var(--card-shadow); border: 1px solid rgba(200,170,90,0.06); }
      .hero .title { font-size:18px; font-weight:700; color:var(--deep); }
      .hero .subtitle { font-size:13px; color:#6f5f4f; margin-top:6px; }
      .card { background: rgba(255,255,255,0.96); border-radius: 12px; padding: 14px; box-shadow: var(--card-shadow); border:1px solid rgba(0,0,0,0.03); }

      /* grid list */
      .users-grid { display:grid; grid-template-columns: repeat(auto-fill,minmax(280px,1fr)); gap:16px; margin-top:12px; }
      .user-card { background:white; border-radius:12px; padding:14px; box-shadow:0 8px 24px rgba(14,22,34,0.06); transition: transform .18s ease, box-shadow .18s ease; display:flex; gap:12px; align-items:flex-start; }
      .user-card:hover { transform:translateY(-6px); box-shadow:0 18px 48px rgba(14,22,34,0.10); }
      .avatar { width:56px; height:56px; border-radius:10px; display:inline-flex; align-items:center; justify-content:center; background:linear-gradient(180deg,#fff6e3,#fff1d6); border:1px solid rgba(0,0,0,0.03); color:var(--deep); font-weight:800; font-size:18px; }
      .user-main { flex:1; }
      .user-name { font-weight:800; font-size:15px; color:#112b44; margin-bottom:4px; }
      .user-meta { color:#6b5a46; font-size:13px; margin-bottom:6px; }
      .role-badge { display:inline-block; padding:6px 8px; background:linear-gradient(180deg,#fff7e6,#fff0d6); border-radius:8px; color:var(--gold); font-weight:800; font-size:12px; border:1px solid rgba(200,170,90,0.06); }
      .card-actions { display:flex; gap:8px; align-items:center; }

      .btn { border:none; border-radius:10px; padding:8px 12px; cursor:pointer; font-weight:700; font-size:13px; display:inline-flex; align-items:center; gap:8px; }
      .btn-primary { background: linear-gradient(90deg,var(--gold), #f2d47a); color:#2b1f0f; box-shadow: 0 6px 18px rgba(178,136,7,0.12); }
      .btn-muted { background:#fff; color:#2d3b48; border:1px solid rgba(0,0,0,0.06); }
      .btn-danger { background: linear-gradient(180deg,#e74c3c,#c0392b); color: #fff; border:none; padding:8px 10px; border-radius:8px; }
      .icon-btn-large { background:#2f6fcf; color:white; padding:10px 16px; border-radius:12px; font-weight:800; box-shadow: 0 8px 18px rgba(47,111,207,0.12); }

      .meta-small { font-size:12px; color:#6f5f4f; }

      .modal-backdrop { position:fixed; inset:0; background: rgba(8,6,4,0.45); display:flex; align-items:center; justify-content:center; z-index:120; }
      .modal-panel { width:var(--modal-width); max-width:96%; background: linear-gradient(180deg,#fff,#fffdf8); padding:18px; border-radius:12px; box-shadow: 0 18px 48px rgba(6,6,6,0.45); border:1px solid rgba(200,170,90,0.07); display:flex; gap:18px; }
      .modal-left { flex: 1 1 56%; display:flex; flex-direction:column; gap:8px; max-height:70vh; overflow:auto; }
      .modal-right { width:320px; flex:0 0 320px; border-left:1px solid rgba(0,0,0,0.03); padding-left:14px; display:flex; flex-direction:column; gap:12px; }

      .textarea { width:100%; min-height:120px; padding:10px; border-radius:8px; border:1px solid rgba(0,0,0,0.06); font-size:14px; resize:vertical; background:transparent; }
      .recipient-row { display:flex; align-items:center; gap:12px; padding:10px 6px; border-bottom:1px dashed rgba(0,0,0,0.03); }
      .recipient-row .avatar { width:44px; height:44px; border-radius:8px; font-size:14px; }
      .recipient-meta { flex:1; }
      .recipient-name { font-weight:800; font-size:14px; color:#133048; }
      .recipient-email { font-size:13px; color:#6b5a46; }
      .select-controls { display:flex; gap:8px; align-items:center; }

      .channels { display:flex; flex-direction:column; gap:8px; padding:8px; }
      .channel { display:flex; align-items:center; gap:10px; padding:8px; border-radius:8px; background:linear-gradient(180deg,#fff,#fffaf0); border:1px solid rgba(0,0,0,0.03); }
      .channel input { transform:scale(1.15); }

      .search-input { padding:8px; border-radius:8px; border:1px solid rgba(0,0,0,0.06); width:100%; }

      @media (max-width:980px){ .modal-panel { flex-direction:column; width:96%; } .modal-right { width:100%; border-left:none; padding-left:0; } .modal-left { max-height:50vh; } .nav { display:none; } .users-grid { grid-template-columns: 1fr; } }
    `}</style>
  );

  /* ---------- small UI icons (inline SVG) ---------- */
  const IconEmail = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M3 7.5v9A2.5 2.5 0 0 0 5.5 19h13a2.5 2.5 0 0 0 2.5-2.5v-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 7.5l-9 6-9-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>);
  const IconWhatsApp = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 12.3A8.7 8.7 0 1 0 3.7 19l-1.2 3 3.1-.9A8.7 8.7 0 0 0 21 12.3z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 14.5c-.4 1-.9 1.1-2 1.2-1 .1-2.2-.3-3.7-1.7-1.4-1.4-1.8-2.6-1.7-3.6.1-1 .2-1.6 1.2-2 1-.5 1.4-.4 1.9-.2.5.2 1 0 1.5.1.6.1 1.1.6 1.6 1.1.5.5.8.9 1 1.4.2.6 0 1.1-.9 2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
  const IconSms = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M7 8h10M7 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>);
  const IconUsers = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.4"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.4"/></svg>);

  /* ---------- render ---------- */
  return (
    <div className="cathedral-advanced">
      {EmbeddedStyles}

      {/* Top bar with logo (sticky) */}
      <div className="topbar" role="banner">
        <img className="logo" src="/Logo.png" alt="Logo" onError={(e) => { e.target.style.display = "none"; }} />
        <nav className="nav" aria-label="Main navigation">
          <a href="/users">Users</a>
          <a href="/teams">Teams</a>
          <a href="/tasks">Tasks</a>
          <a href="/sermons">Sermons</a>
        </nav>

        <div className="header-actions">
          {/* broadcast buttons: icon-focused */}
          <button className="btn icon-btn-large" title="Welcome" onClick={() => openBroadcast("Welcome")}><IconUsers />Welcome</button>
          <button className="btn" style={{ background: "#2e8b57", color: "white", borderRadius: 12, padding: "10px 14px" }} title="Daily Word" onClick={() => openBroadcast("Daily Word")}>📖 Daily Word</button>
          <button className="btn" style={{ background: "#3b82f6", color: "white", borderRadius: 12, padding: "10px 14px" }} title="Meeting Attend" onClick={() => openBroadcast("Meeting Attend")}>📅 Meeting Attend</button>

          <button className="btn btn-muted" onClick={() => { setSearch(""); fetchUsers(1, meta.limit, ""); }}>Clear</button>
          <button className="btn btn-primary" onClick={openAdd}>Add User</button>
        </div>
      </div>

      {/* hero */}
      <div className="hero" role="region" aria-label="Users header">
        <div style={{ flex: 1 }}>
          <div className="title">Users — Mahima Ministry</div>
          <div className="subtitle">Directory of members and administrators. Keep contact details current for timely notifications.</div>
        </div>

        <div style={{ minWidth: 320 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              aria-label="Search users"
              placeholder="Search by name, email, username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") fetchUsers(1, meta.limit, search); }}
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}
            />
            <button className="btn btn-muted" onClick={() => fetchUsers(1, meta.limit, search)}>Search</button>
          </div>
          <div style={{ marginTop: 10, color: "#6f5f4f", fontSize: 13 }}>Showing {users.length === 0 ? 0 : `${start}–${end}`} of {meta.total}</div>
        </div>
      </div>

      {/* content card */}
      <div className="card" role="main" aria-label="User list">
        {loading ? (
          <div style={{ padding: 24, color: "#6f5f4f" }}>Loading users…</div>
        ) : error ? (
          <div style={{ padding: 24, color: "red" }}>{error}</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 24, color: "#6f5f4f" }}>No users found.</div>
        ) : (
          <>
            <div className="users-grid" role="list" aria-label="users grid">
              {users.map((u) => {
                const initials = (u.displayName || u.name || u.username || "").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase() || "?";
                const displayName = u.displayName ?? u.name ?? "(no name)";
                const username = u.username ?? u.userName ?? "";

                // Resolve role label:
                let roleLabel = "";
                // Prefer explicit RoleName / roleName if provided
                if (u.RoleName) roleLabel = u.RoleName;
                else if (u.roleName) roleLabel = u.roleName;
                // If role property is a string that can be parsed to number, try match by id
                if (!roleLabel) {
                  const candidate = u.Role ?? u.role ?? u.RoleId ?? u.roleId;
                  if (candidate != null) {
                    const asNumber = Number(candidate);
                    if (!Number.isNaN(asNumber)) {
                      const found = roles.find(r => Number(r.id) === asNumber);
                      roleLabel = found ? found.name : String(candidate);
                    } else {
                      // non-numeric string: try match by name
                      const found = roles.find(r => String(r.name).toLowerCase() === String(candidate).toLowerCase());
                      roleLabel = found ? found.name : String(candidate);
                    }
                  }
                }

                if (!roleLabel) roleLabel = "member";

                return (
                  <article key={u.id} className="user-card" role="listitem" aria-labelledby={`user-${u.id}`}>
                    <div className="avatar" aria-hidden>{initials}</div>
                    <div className="user-main">
                      <div className="user-name" id={`user-${u.id}`}>{displayName}</div>
                      <div className="user-meta">{username} • <a href={`mailto:${u.email}`} style={{ color: "var(--accent)", textDecoration: "none" }}>{u.email ?? "—"}</a></div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
                        <div className="role-badge">{(roleLabel || "member").toUpperCase()}</div>
                        <div className="meta-small">📞 {u.phone ?? "—"}</div>
                        <div className="meta-small">⏱ {formatFriendlyDate(u.joinDate)}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                      <div className="card-actions" style={{ flexDirection: "column", gap: 8 }}>
                        {/* Icon-only actions (look like Teams icons) */}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="icon-btn"
                            onClick={() => openEdit(u)}
                            title={`Edit ${displayName}`}
                            aria-label={`Edit ${displayName}`}
                          >
                            ✎
                          </button>

                          <button
                            className="icon-btn btn-danger"
                            onClick={() => confirmDelete(u.id)}
                            disabled={deleteLoading && deletingId === u.id}
                            title={`Delete ${displayName}`}
                            aria-label={`Delete ${displayName}`}
                          >
                            {deleteLoading && deletingId === u.id ? "…" : "🗑"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* pagination */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
              <div style={{ color: "#6f5f4f" }}>Page {meta.page}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-muted" onClick={() => { const p = Math.max(1, meta.page - 1); setMeta(prev => ({ ...prev, page: p })); fetchUsers(p, meta.limit, search); }} disabled={meta.page <= 1}>Prev</button>
                <button className="btn btn-muted" onClick={() => { const p = meta.page + 1; setMeta(prev => ({ ...prev, page: p })); fetchUsers(p, meta.limit, search); }} disabled={end >= meta.total}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* modal for add/edit user */}
      {showModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={form.id ? "Edit user" : "Add user"}>
          <div className="modal-panel" style={{ maxWidth: 720 }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ marginTop: 0, color: "#2f2b27" }}>{form.id ? "Edit User" : "Add User"}</h3>

              <form onSubmit={saveUser} style={{ display: "grid", gap: 12 }}>
                <div className="form-row">
                  <div className="form-col">
                    <label style={{ fontSize: 12, color: "#6b5a46" }}>
                      Display Name
                      <input value={form.displayName} onChange={(e) => setField("displayName", e.target.value)} />
                    </label>
                  </div>
                  <div style={{ width: 200 }}>
                    <label style={{ fontSize: 12, color: "#6b5a46" }}>
                      Username *
                      <input value={form.username} onChange={(e) => setField("username", e.target.value)} />
                    </label>
                  </div>
                </div>

                {/* NEW: show User Id when editing (readonly and copyable) */}
                {form.id && (
                  <div className="form-row">
                    <div style={{ width: 420 }}>
                      <label style={{ fontSize: 12, color: "#6b5a46" }}>
                        User Id
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                          <input value={form.id} readOnly style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)", background: "#fafafa" }} />
                          <button type="button" className="btn btn-muted" onClick={() => { try { navigator.clipboard.writeText(String(form.id)); alert("Copied user id to clipboard"); } catch { alert(form.id); } }}>Copy</button>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-col">
                    <label style={{ fontSize: 12, color: "#6b5a46" }}>
                      Email
                      <input value={form.email} onChange={(e) => setField("email", e.target.value)} />
                    </label>
                  </div>
                  <div style={{ width: 220 }}>
                    <label style={{ fontSize: 12, color: "#6b5a46" }}>
                      Phone
                      <input placeholder="+911234567890" value={form.phone} onChange={(e) => { const v = e.target.value; if (phoneAllowTypingRegex.test(v)) setField("phone", v); }} />
                    </label>
                  </div>
                </div>

                <div className="form-row">
                  <div style={{ width: 240 }}>
                    <label style={{ fontSize: 12, color: "#6b5a46" }}>
                      Role
                      <select value={form.role} onChange={(e) => setField("role", e.target.value)}>
                        {/* If roles are loaded, use role id as value and role name as label */}
                        {roles && roles.length > 0 ? (
                          roles.map(r => (
                            <option key={r.id ?? r.name} value={String(r.id)}>
                              {r.name}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="">(no roles loaded)</option>
                          </>
                        )}
                      </select>
                    </label>
                  </div>
                  <div className="form-col">
                    <label style={{ fontSize: 12, color: "#6b5a46" }}>
                      Join Date
                      <input type="datetime-local" value={isoToDatetimeLocal(form.joinDate)} onChange={(e) => setField("joinDate", datetimeLocalToIso(e.target.value))} />
                    </label>
                  </div>
                </div>

                {/* modal-level message (save/reset feedback) */}
                {modalMessage && (
                  <div style={{
                    padding: "8px 10px", borderRadius: 8,
                    background: modalSuccess ? "rgba(34,197,94,0.12)" : "rgba(220,38,38,0.06)",
                    color: modalSuccess ? "#166534" : "#991b1b", fontWeight: 700
                  }}>
                    {modalMessage}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="btn btn-muted" onClick={() => { setShowModal(false); setModalMessage(null); }}>Cancel</button>

                    {/* Reset password button (admin action) */}
                    {form.id && (
                      <button type="button" className="btn" onClick={resetPasswordForFormUser} disabled={resetting} title="Reset password to username + 123" style={{ background: "linear-gradient(90deg,#ffdde0,#ffd6da)", color: "#7a1f1f" }}>
                        {resetting ? "Resetting…" : "Reset password to username+123"} 🔐
                      </button>
                    )}
                  </div>

                  <div>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast modal */}
      {broadcastOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Send ${broadcastType} Message`}>
          <div className="modal-panel" style={{ maxWidth: "96%" }}>
            <div className="modal-left">
              <h3 style={{ marginTop: 0 }}>{`Send "${broadcastType}" Message`}</h3>

              <textarea
                className="textarea"
                placeholder={`Enter the ${broadcastType} message to send to selected users...`}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
              />

              <div style={{ fontSize: 13, color: "#6f5f4f" }}>
                Tip: You can include short personal details like name in the message if you like.
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <div className="select-controls">
                  <button className="btn btn-muted" onClick={() => { selectAllVisible(); }}>Select All</button>
                  <button className="btn btn-muted" onClick={() => { clearSelection(); }}>Clear Selection</button>
                </div>

                <div style={{ textAlign: "right" }}>
                  <input className="search-input" placeholder="Filter recipients..." value={modalSearch} onChange={(e) => setModalSearch(e.target.value)} />
                  <div style={{ fontSize: 13, color: "#6f5f4f", marginTop: 6 }}>{selectedIds.size} selected</div>
                </div>
              </div>

              <div style={{ marginTop: 8, borderRadius: 8, overflow: "auto", border: "1px solid rgba(0,0,0,0.03)", maxHeight: "44vh" }}>
                {allUsers === null ? (
                  <div style={{ padding: 24, color: "#6f5f4f" }}>Loading recipients…</div>
                ) : allUsers.length === 0 ? (
                  <div style={{ padding: 24, color: "#6f5f4f" }}>No recipients found.</div>
                ) : (
                  allUsers
                    .filter(u => {
                      if (!modalSearch) return true;
                      const s = modalSearch.toLowerCase();
                      return (u.displayName || u.username || u.email || u.phone || "").toLowerCase().includes(s);
                    })
                    .map(u => {
                      const initials = (u.displayName || u.name || u.username || "").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase() || "?";
                      return (
                        <div key={u.id} className="recipient-row">
                          <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)} />
                          <div className="avatar" aria-hidden style={{ width: 44, height: 44 }}>{initials}</div>
                          <div className="recipient-meta">
                            <div className="recipient-name">{u.displayName || u.username || "(no name)"}</div>
                            <div className="recipient-email">{u.email ?? "—"} &nbsp; <span style={{ color: "#6f5f4f" }}>{u.phone ?? ""}</span></div>
                          </div>
                          <div style={{ textAlign: "right", minWidth: 90 }}>
                            <div style={{ fontSize: 12, color: "#6f5f4f" }}>{(u.role ?? "member").toUpperCase()}</div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            <div className="modal-right">
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#2f2b27" }}>Delivery Channels</div>
                <div className="channels">
                  <label className="channel"><input type="checkbox" checked={broadcastChannels.email} onChange={(e) => setBroadcastChannels(prev => ({ ...prev, email: e.target.checked }))} /> <IconEmail /> <span style={{ fontWeight: 700 }}>Email</span></label>
                  <label className="channel"><input type="checkbox" checked={broadcastChannels.whatsapp} onChange={(e) => setBroadcastChannels(prev => ({ ...prev, whatsapp: e.target.checked }))} /> <IconWhatsApp /> <span style={{ fontWeight: 700 }}>WhatsApp</span></label>
                  <label className="channel"><input type="checkbox" checked={broadcastChannels.sms} onChange={(e) => setBroadcastChannels(prev => ({ ...prev, sms: e.target.checked }))} /> <IconSms /> <span style={{ fontWeight: 700 }}>SMS</span></label>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#6f5f4f" }}>Recipients:</div>
                <div style={{ marginTop: 8, marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button className="btn btn-muted" onClick={() => selectAllVisible()}>Select all</button>
                    <button className="btn btn-muted" onClick={() => clearSelection()}>Clear</button>
                  </div>
                  <div style={{ marginTop: 8, color: "#6f5f4f" }}>{selectedIds.size} recipients selected</div>
                </div>
              </div>

              <div style={{ marginTop: "auto", display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                <button className="btn btn-muted" onClick={() => { setBroadcastOpen(false); }}>Cancel</button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary" onClick={() => sendBroadcast()} disabled={sending}>{sending ? "Sending…" : "Send"}</button>
                </div>
              </div>

              {/* results summary */}
              {sendResults && (
                <div style={{ marginTop: 12, fontSize: 13 }}>
                  {sendResults.success ? (
                    <div style={{ color: "green" }}>Sent to {sendResults.attempted} recipients. Check details in logs.</div>
                  ) : (
                    <div style={{ color: "darkred" }}>Send failed: {sendResults.error || "Unknown error"}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
