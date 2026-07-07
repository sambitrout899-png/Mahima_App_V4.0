// src/features/users/UsersPage.CathedralAdvanced.jsx
import React, { useEffect, useState } from "react";
import EnrichUserModal from "../../components/EnrichUserModal";
import api from "../../api";
import { API_BASE } from "../../api";
/* ---------- helpers (unchanged) ---------- */
function isoToDatetimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
//const API_BASE = ;
function normalizeResponse(res) {
  const isArray = Array.isArray(res);
  const items = isArray ? res : (res && (res.items || res.data || [])) || [];
  const meta = {
    total: !isArray ? res?.total ?? items.length : items.length,
    page: !isArray ? res?.page ?? 1 : 1,
    limit: !isArray ? res?.limit ?? items.length : items.length,
  };
  return { items, meta };
}
function defaultForm() {
  return {
    id: null,
    displayName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    role: "",
    joinDate: new Date().toISOString(),
    UserCode: "",

    // enrichment fields
    birthday: null,
    maritalStatus: "",
    sex: "",
    isBaptized: null,
    baptismPlace: "",
    baptismDate: null,
    isBornAgain: null,
    isBeliever: null,
    age: undefined,
    aadharNumber: "",
    homeAddress: "",
    currentAddress: "",
    emergencyContactPhone: "",
    isPastor: null,
  };
}
const phoneAllowTypingRegex = /^\+?\d*$/;
const phoneFinalRegex = /^\+\d{10,}$/;

/* ---------- component ---------- */
export default function UsersPageCathedralAdvanced() {
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState(null);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [search, setSearch] = useState(""); 
  const [debouncedSearch, setDebouncedSearch] = useState("");

useEffect(() => {
  const t = setTimeout(() => setDebouncedSearch(search), 300);
  return () => clearTimeout(t);
}, [search]);
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
  const [broadcastChannels, setBroadcastChannels] = useState({
    email: true,
    whatsapp: true,
    sms: true,
  });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState(null);
  const [modalSearch, setModalSearch] = useState("");

  

  /* ---------- roles state ---------- */
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  /* ---------- API calls ---------- */
  const fetchUsers = async (page = 1, limit = 10, searchTerm = "") => {
  try {
    setLoading(true);
    setError(null);

    const resp = await api.get("/users", {
      params: {
        search: searchTerm || "",
        page: page,
        limit: limit,
      },
    });

    const { items, meta: newMeta } = normalizeResponse(resp.data);

    const sorted = (items || []).sort((a, b) => {
  const nameA = (a.displayName || a.username || "").toLowerCase();
  const nameB = (b.displayName || b.username || "").toLowerCase();
  return nameA.localeCompare(nameB);
});
setUsers(sorted);
    setMeta((prev) => ({
      ...prev,
      page: newMeta.page ?? page,
      limit: newMeta.limit ?? limit,
      total: newMeta.total ?? prev.total,
    }));
  } catch (err) {
    setError(err?.message || String(err));
    setUsers([]);
  } finally {
    setLoading(false);
  }
};
  const fetchAllUsers = async () => {
    if (allUsers !== null) return;
    try {
      setAllUsers(null);
      //const q = new URLSearchParams({
//        search: "",
  //      page: "1",
    //    limit: "10000",
      //});
      //const resp = await fetch(`${API_BASE}/users`);

//const resp = await fetch(`${API_BASE}/users`);
const resp = await api.get("/users");  
      if (!resp.ok) {
        setAllUsers([]);
        return;
      }
      const data = await resp.json();
      const { items } = normalizeResponse(data);
      setAllUsers(items || []);
      setSelectedIds(new Set((items || []).map((u) => u.id)));
    } catch (err) {
      setAllUsers([]);
    }
  };

  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      //const resp = await fetch(`${API_BASE}/roles`);
const resp = await api.get("/roles");      
if (!resp.ok) {
        setRoles([]);
        return;
      }
      const j = await resp.json();
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
  fetchUsers(meta.page, meta.limit, debouncedSearch);
}, [debouncedSearch]);

useEffect(() => {
  fetchRoles();
}, []);
  /* ---------- actions ---------- */
  const openAdd = () => {
    const memberRole = roles.find(
      (r) => String(r.name).toLowerCase() === "member"
    );
    const defaultRoleId = memberRole
      ? String(memberRole.id)
      : roles[0]
      ? String(roles[0].id)
      : "";
    setForm({ ...defaultForm(), role: defaultRoleId });
    setModalMessage(null);
    setModalSuccess(false);
    setShowModal(true);
  };

// ONLY THIS FUNCTION IS FIXED — rest of your file unchanged

const openEdit = (u) => {
  const formatDateTime = (val) => {
    if (!val) return new Date().toISOString();
    try {
      return new Date(val).toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  const formatDate = (val) => {
    if (!val) return null;
    try {
      return new Date(val).toISOString().split("T")[0];
    } catch {
      return null;
    }
  };

  let rawRole = null;
  if (u.Role != null) rawRole = u.Role;
  else if (u.RoleId != null) rawRole = u.RoleId;
  else if (u.role != null) rawRole = u.role;
  else if (u.roleId != null) rawRole = u.roleId;
  else if (u.roleName != null) rawRole = u.roleName;
  else if (u.RoleName != null) rawRole = u.RoleName;

  let normalizedRoleId = "";
  if (rawRole != null) {
    if (typeof rawRole === "number" || /^[0-9]+$/.test(String(rawRole))) {
      normalizedRoleId = String(rawRole);
    } else if (typeof rawRole === "string") {
      const match = roles.find(
        (r) => String(r.name).toLowerCase() === rawRole.toLowerCase()
      );
      normalizedRoleId = match ? String(match.id) : rawRole;
    }
  }

  setForm({
    id: u.id ?? null,
    UserCode: u.UserCode ?? u.userCode ?? "",
    displayName: u.displayName ?? u.displayname ?? u.name ?? "",
    username: u.username ?? u.userName ?? "",
    email: u.email ?? "",
    phone: u.phone ?? "",
    role: normalizedRoleId,

    // ✅ FIXED DATE
    joinDate: formatDateTime(u.joinDate),

    // ✅ ENRICHMENT FIELDS (FULL FIX)
    birthday: formatDate(u.birthday ?? u.Birthday),
    maritalStatus: u.maritalStatus ?? u.MaritalStatus ?? "",
    sex: u.sex ?? u.Sex ?? "",
    isBaptized: !!(u.isBaptized ?? u.IsBaptized),
    baptismPlace: u.baptismPlace ?? u.BaptismPlace ?? "",
    baptismDate: formatDate(u.baptismDate ?? u.BaptismDate),
    isBornAgain: !!(u.isBornAgain ?? u.IsBornAgain),
    isBeliever: !!(u.isBeliever ?? u.IsBeliever),
    age: u.age ?? u.Age ?? undefined,
    aadharNumber: u.aadharNumber ?? u.AadharNumber ?? "",
    homeAddress: u.homeAddress ?? u.HomeAddress ?? "",
    currentAddress: u.currentAddress ?? u.CurrentAddress ?? "",
    emergencyContactPhone:
      u.emergencyContactPhone ?? u.EmergencyContactPhone ?? "",
    isPastor: !!(u.isPastor ?? u.IsPastor),
  });

  setModalMessage(null);
  setModalSuccess(false);
  setShowModal(true);
};

  const openBroadcast = async (type) => {
    setBroadcastType(type);
    setBroadcastMessage("");
    setBroadcastChannels({ email: true, whatsapp: true, sms: true });
    setSendResults(null);
    setModalSearch("");
    setBroadcastOpen(true);
    await fetchAllUsers();
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  const selectAllVisible = () => {
    if (!allUsers) return;
    setSelectedIds(new Set(allUsers.map((u) => u.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  const saveUser = async (e) => {
    e?.preventDefault?.();

    const usernameTrim = (form.username ?? "").trim();
   if (!usernameTrim) {
  alert("Username is required.");
  return;
}

if (!form.id && !form.password) {
  alert("Password is required for new user.");
  return;
}
    if (form.phone && !phoneFinalRegex.test(form.phone)) {
      if (
        !window.confirm(
          "Phone looks invalid (should start with + and at least 10 digits). Continue?"
        )
      )
        return;
    }

    setSaving(true);
    setModalMessage(null);
    setModalSuccess(false);

    try {
      let roleIdNumber = null;
      if (form.role != null && form.role !== "") {
        const asNumber = Number(form.role);
        if (!Number.isNaN(asNumber) && asNumber > 0) {
          roleIdNumber = asNumber;
        } else {
          const byName = roles.find(
            (r) =>
              String(r.name).toLowerCase() === String(form.role).toLowerCase()
          );
          if (byName) roleIdNumber = byName.id;
        }
      }

 const payload = {
  DisplayName: (form.displayName ?? "").trim() || null,
  Username: (form.username ?? "").trim(),
  Password: form.password || null,
  Email: (form.email ?? "").trim() || null,
  Phone: (form.phone ?? "").trim() || null,
  JoinDate: form.joinDate ? new Date(form.joinDate).toISOString() : null,

  // 🔥 IMPORTANT — MUST MATCH BACKEND EXACTLY
  Birthday: form.birthday || null,
  MaritalStatus: form.maritalStatus || null,
  Sex: form.sex || null,
  IsBaptized: form.isBaptized ?? null,
  BaptismPlace: form.baptismPlace || null,
  BaptismDate: form.baptismDate || null,
  IsBornAgain: form.isBornAgain ?? null,
  IsBeliever: form.isBeliever ?? null,
  Age: form.age ?? null,
  AadharNumber: form.aadharNumber || null,
  HomeAddress: form.homeAddress || null,
  CurrentAddress: form.currentAddress || null,
  EmergencyContactPhone: form.emergencyContactPhone || null,
  IsPastor: form.isPastor ?? null,

  ...(form.id ? { Id: form.id } : {}),
};// 🔥 ADD THIS LINE
payload.displayName = payload.DisplayName;
      if (roleIdNumber != null) {
        payload.Role = roleIdNumber;
        payload.RoleId = roleIdNumber;
        const roleObj = roles.find(
          (r) => Number(r.id) === Number(roleIdNumber)
        );
        if (roleObj) payload.RoleName = roleObj.name;
      } else if (form.role && typeof form.role === "string") {
        payload.RoleName = form.role;
      }

      // mirror to camelCase for frontend compatibility
     

    	let url = `${API_BASE}/users`;
let method = "POST";

// 🔥 SWITCH TO UPDATE IF ID EXISTS
if (form.id && form.id !== "") {
  url = `${API_BASE}/users/${form.id}`;
  method = "PUT";
}

const token =
  localStorage.getItem("mahima_token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("token");

const resp = await fetch(url, {
  method,
  headers: {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify(payload),
});      if (!resp.ok) {
        const contentType = resp.headers.get("content-type") || "";
        let bodyText = await resp.text().catch(() => "");
        if (contentType.includes("application/json")) {
          try {
            const parsed = JSON.parse(bodyText);
            if (parsed && (parsed.message || parsed.error || parsed.title))
              bodyText = parsed.message || parsed.error || parsed.title;
          } catch {
            /* ignore */
          }
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

    const token =
      localStorage.getItem("mahima_token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("token");

    const resp = await fetch(`${API_BASE}/users/${id}`, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

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
  const setField = (k, v) =>
    setForm((prev) => ({
      ...prev,
      [k]: v,
    }));

  async function resetPasswordForFormUser() {
    setModalMessage(null);
    setModalSuccess(false);

    if (!form?.id) {
      setModalMessage("User id not available.");
      return;
    }
    const username = (form?.username || "").trim();
    if (!username) {
      setModalMessage("Username required to compute default password.");
      return;
    }

    if (
      !window.confirm(
        `Reset password for "${username}" to "${username}123"?`
      )
    )
      return;

    setResetting(true);
    try {
      const token =
        localStorage.getItem("mahima_token") ||
        localStorage.getItem("token") ||
        null;
      const newPassword = `${username}123`;
      const url = `${API_BASE}/users/${form.id}/reset-password`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ newPassword }),
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(txt || `HTTP ${resp.status}`);
      }

      setModalMessage(`Password reset to "${newPassword}".`);
      setModalSuccess(true);
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

  const sendBroadcast = async () => {
    if (!broadcastMessage || broadcastMessage.trim().length === 0) {
      alert("Please enter a message to send.");
      return;
    }
    if (selectedIds.size === 0) {
      if (
        !window.confirm(
          "No recipients selected — do you want to continue?"
        )
      )
        return;
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
          sms: !!broadcastChannels.sms,
        },
      };

      const resp = await fetch(`${API_BASE}/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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


  

  const closeEnrich = () => {
    setIsEnrichOpen(false);
    setSelectedUser(null);
  };

  /* ---------- small helpers ---------- */
  const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const end = Math.min(meta.total, meta.page * meta.limit);

  /* ---------- embedded styles ---------- */
  const EmbeddedStyles = (
    <style>{`
:root{
  --bg: linear-gradient(180deg,#fffdfa, #fbf3e8);
  --gold: #d1a62a;
}

/* ---------- BASE ---------- */
.cathedral-advanced {
  padding: 10px;
  padding-bottom: 80px;
}

/* ---------- TOP BAR ---------- */
.topbar {
  flex-wrap: wrap;
  gap: 8px;
}

.header-actions {
  width: 100%;
  justify-content: space-between;
  flex-wrap: wrap;
}

.header-actions .btn {
  flex: 1;
  min-width: 100px;
  justify-content: center;
}

/* ---------- SEARCH ---------- */
.search-row {
  flex-direction: column;
}

.search-row .btn {
  width: 100%;
}

/* ---------- HERO ---------- */
.hero {
  flex-direction: column;
  align-items: flex-start;
}

/* ---------- USER CARD ---------- */
.user-card {
  flex-direction: row;
  align-items: flex-start;
}

@media (max-width: 600px) {
  .user-card {
    flex-direction: column;
  }

  .actions-row {
    width: 100%;
    justify-content: flex-end;
  }
}

/* ---------- ACTION BUTTONS ---------- */
.icon-btn {
  min-width: 44px;
  min-height: 44px;
}

/* ---------- MODAL ---------- */
.modal-panel {
  flex-direction: column;
  max-height: 90vh;
}

.modal-left,
.modal-right {
  width: 100%;
  max-width: none;
  border-left: none;
  padding-left: 0;
}

/* ---------- FORM ---------- */
.form-row {
  flex-direction: column;
}

.form-col {
  width: 100%;
  min-width: unset;
}

/* ---------- INPUT ---------- */
input, select, textarea {
  font-size: 16px; /* prevents zoom on mobile */
}

/* ---------- FAB ---------- */
.fab {
  right: 12px;
  bottom: 12px;
}

/* ---------- PAGINATION ---------- */
.pagination {
  flex-direction: column;
  gap: 10px;
}


    `}</style>
  );

  /* ---------- icons ---------- */
  const IconEmail = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 7.5v9A2.5 2.5 0 0 0 5.5 19h13a2.5 2.5 0 0 0 2.5-2.5v-9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 7.5l-9 6-9-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
  const IconWhatsApp = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 12.3A8.7 8.7 0 1 0 3.7 19l-1.2 3 3.1-.9A8.7 8.7 0 0 0 21 12.3z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 14.5c-.4 1-.9 1.1-2 1.2-1 .1-2.2-.3-3.7-1.7-1.4-1.4-1.8-2.6-1.7-3.6.1-1 .2-1.6 1.2-2 1-.5 1.4-.4 1.9-.2.5.2 1 0 1.5.1.6.1 1.1.6 1.6 1.1.5.5.8.9 1 1.4.2.6 0 1.1-.9 2z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
  const IconSms = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect
        x="3"
        y="4"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M7 8h10M7 12h6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
  const IconUsers = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M17 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle
        cx="12"
        cy="7"
        r="4"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
  const IconTrash = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 4h6m-7 3h8l-.6 11a1.5 1.5 0 0 1-1.5 1.4H9.9A1.5 1.5 0 0 1 8.4 18L7.9 7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 7V4.5A1.5 1.5 0 0 1 11.5 3h1A1.5 1.5 0 0 1 14 4.5V7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );

  /* ---------- render ---------- */
  return (
    <div className="cathedral-advanced">
      {EmbeddedStyles}

      {/* Top bar */}
      <div className="topbar" role="banner">

        <div style={{ fontWeight: 900, letterSpacing: 0.3 }}>Users</div>
       <div className="header-actions" style={{ width: "100%" }}>
          <button
            className="btn"
            style={{
              background: "#2f6fcf",
              color: "white",
              fontWeight: 800,
            }}
            title="Welcome"
            onClick={() => openBroadcast("Welcome")}
            aria-label="Send Welcome broadcast"
          >
            <IconUsers />
            Welcome
          </button>
          <button
            className="btn"
            style={{ background: "#2e8b57", color: "white" }}
            title="Daily Word"
            onClick={() => openBroadcast("Daily Word")}
            aria-label="Send Daily Word"
          >
            📖 Daily Word
          </button>
          <button
            className="btn"
            style={{ background: "#3b82f6", color: "white" }}
            title="Meeting Attend"
            onClick={() => openBroadcast("Meeting Attend")}
            aria-label="Send Meeting Attend"
          >
            📅 Meeting
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="search-wrap" role="search">
        <div className="search-row">
          <input
            className="search-input"
            aria-label="Search users"
            placeholder="Search by name, email, username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") fetchUsers(1, meta.limit, search);
            }}
          />
          <button
            className="btn btn-muted"
            onClick={() => fetchUsers(1, meta.limit, debouncedSearch)}
          >
            Search
          </button>
          <button
            className="btn btn-muted"
            onClick={() => {
              setSearch("");
              fetchUsers(1, meta.limit, "");
            }}
          >
            Clear
          </button>
        </div>
        <div
          style={{
            marginTop: 6,
            color: "#6f5f4f",
            fontSize: 13,
          }}
        >
          Showing {users.length === 0 ? 0 : `${start}–${end}`} of {meta.total}
        </div>
      </div>

      {/* Hero */}
      <div className="hero" role="region" aria-label="Users header">
        <div style={{ flex: 1 }}>
          <div className="title">Mahima Ministry Directory</div>
          <div className="subtitle">
            Keep contact details current for timely notifications.
          </div>
        </div>
        <div className="chip">Page {meta.page}</div>
      </div>

      {/* Main card */}
      <div className="card" role="main" aria-label="User list">
        {loading ? (
          <div style={{ display: "grid", gap: 12 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="user-card" aria-hidden>
                <div
                  className="avatar skeleton"
                  style={{ width: 56, height: 56 }}
                />
                <div
                  style={{
                    flex: 1,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div
                    className="skeleton"
                    style={{ height: 16, width: "40%" }}
                  />
                  <div
                    className="skeleton"
                    style={{ height: 12, width: "70%" }}
                  />
                  <div
                    className="skeleton"
                    style={{ height: 12, width: "55%" }}
                  />
                </div>
                <div
                  className="skeleton"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                  }}
                />
              </div>
            ))}
          </div>
        ) : error ? (
          <div
            style={{
              padding: 16,
              color: "#b91c1c",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: 16, color: "#6f5f4f" }}>
            No users found.
          </div>
        ) : (
          <>
            <div className="users-grid" role="list" aria-label="users grid">
              {users.map((u) => {
                const initials =
                  (
                    u.displayName ||
                    u.name ||
                    u.username ||
                    ""
                  )
                    .split(" ")
                    .map((s) => s[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "?";
                const displayName = u.displayName ?? u.name ?? "(no name)";
                const username = u.username ?? u.userName ?? "";

                let roleLabel = "";
                if (u.RoleName) roleLabel = u.RoleName;
                else if (u.roleName) roleLabel = u.roleName;
                if (!roleLabel) {
                  const candidate =
                    u.Role ?? u.role ?? u.RoleId ?? u.roleId;
                  if (candidate != null) {
                    const asNumber = Number(candidate);
                    if (!Number.isNaN(asNumber)) {
                      const found = roles.find(
                        (r) => Number(r.id) === asNumber
                      );
                      roleLabel = found ? found.name : String(candidate);
                    } else {
                      const found = roles.find(
                        (r) =>
                          String(r.name).toLowerCase() ===
                          String(candidate).toLowerCase()
                      );
                      roleLabel = found ? found.name : String(candidate);
                    }
                  }
                }
                if (!roleLabel) roleLabel = "member";

                return (
                  <article
                    key={u.id}
                    className="user-card"
                    role="listitem"
                    aria-labelledby={`user-${u.id}`}
                  >
                    <div className="avatar" aria-hidden>
                      {initials}
                    </div>
                    <div className="user-main">
                      <div className="user-name" id={`user-${u.id}`}>
                        {displayName}
                      </div>
                      <div className="user-meta">
                        {username} •{" "}
                        {u.email ? (
                          <a
                            href={`mailto:${u.email}`}
                            style={{
                              color: "var(--accent)",
                              textDecoration: "none",
                            }}
                          >
                            {u.email}
                          </a>
                        ) : (
                          "—"
                        )}
                        {u.UserCode && (
                          <>
                            {" "}
                            • Mahima ID:{" "}
                            <strong>{u.UserCode}</strong>
                          </>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                          marginTop: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <div className="role-badge">
                          {(roleLabel || "member").toUpperCase()}
                        </div>
                        <div className="meta-small">
                          📞 {u.phone ?? "—"}
                        </div>
                        <div className="meta-small">
                          ⏱ {formatFriendlyDate(u.joinDate)}
                        </div>
                      </div>
                    </div>

                    <div className="actions-row" style={{ marginTop: 8 }}>
		<button className="icon-btn" onClick={() => openEdit(u)}>✏️</button>                     
                      <button
                        className="icon-btn btn-danger"
                        onClick={() => confirmDelete(u.id)}
                        disabled={deleteLoading && deletingId === u.id}
                        title={`Delete ${displayName}`}
                        aria-label={`Delete ${displayName}`}
                      >
                        {deleteLoading && deletingId === u.id ? "…" : <IconTrash />}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* pagination */}
            <div className="pagination">
              <div style={{ color: "#6f5f4f" }}>Page {meta.page}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-muted"
                  onClick={() => {
                    const p = Math.max(1, meta.page - 1);
                    setMeta((prev) => ({ ...prev, page: p }));
                    fetchUsers(p, meta.limit, search);
                  }}
                  disabled={meta.page <= 1}
                >
                  Prev
                </button>
                <button
                  className="btn btn-muted"
                  onClick={() => {
                    const p = meta.page + 1;
                    setMeta((prev) => ({ ...prev, page: p }));
                    fetchUsers(p, meta.limit, search);
                  }}
                  disabled={end >= meta.total}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Floating Add button */}
      <div className="fab">
        <button
          className="btn btn-primary"
          onClick={openAdd}
          aria-label="Add user"
        >
          ＋ Add User
        </button>
      </div>

      {/* Add/Edit modal */}
      {showModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={form.id ? "Edit user" : "Add user"}
          onClick={(e) => {
            if (e.target.classList.contains("modal-backdrop"))
              setShowModal(false);
          }}
        >
          <div className="modal-panel" style={{ overflowY: "auto" }}>
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  marginTop: 0,
                  color: "#2f2b27",
                }}
              >
                {form.id ? "Edit User" : "Add User"}
              </h3>

              <form onSubmit={saveUser} style={{ display: "grid", gap: 12 }}>
                <div className="form-row">
                  <div className="form-col">
                    <label>
                      Display Name
                      <input
                        value={form.displayName}
                        onChange={(e) =>
                          setField("displayName", e.target.value)
                        }
                      />
                    </label>
                  </div>
                  <div className="form-col">
                    <label>
                      Username *
                      <input
                        value={form.username}
                        onChange={(e) =>
                          setField("username", e.target.value)
                        }
                      />
                    </label>
                  </div>
			<div className="form-row">
  <div className="form-col">
    <label>
      Password *
      <div style={{ position: "relative" }}>
        <input
          value={form.password || ""}
          onChange={(e) => setField("password", e.target.value)}
          placeholder="Enter or generate password"
        />

        <button
          type="button"
          onClick={() => {
            if (!form.username) {
              alert("Enter Username first");
              return;
            }
            setField("password", form.username + "123");
          }}
          style={{
            position: "absolute",
            right: 6,
            top: 6,
            padding: "5px 10px",
            fontSize: 12,
            borderRadius: 6,
            border: "none",
            background: "#2563eb",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          Generate
        </button>
      </div>
    </label>
  </div>
</div>
                </div>

                {form.id && (
                  <>
                    <div className="form-row">
                      <div className="form-col">
                        <label>
                          User Id
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              marginTop: 6,
                            }}
                          >
                            <input
                              value={form.id}
                              readOnly
                              style={{ background: "#fafafa" }}
                            />
                            <button
                              type="button"
                              className="btn btn-muted"
                              onClick={() => {
                                try {
                                  navigator.clipboard.writeText(
                                    String(form.id)
                                  );
                                  alert("Copied user id to clipboard");
                                } catch {
                                  alert(form.id);
                                }
                              }}
                            >
                              Copy
                            </button>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-col">
                        <label>
                          Mahima ID (User Code)
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              marginTop: 6,
                            }}
                          >
                            <input
                              value={form.UserCode || ""}
                              readOnly
                              style={{ background: "#fafafa" }}
                            />
                            <button
                              type="button"
                              className="btn btn-muted"
                              onClick={() => {
                                const code = String(form.UserCode || "");
                                if (!code) {
                                  alert("No user code assigned yet.");
                                  return;
                                }
                                try {
                                  navigator.clipboard.writeText(code);
                                  alert("Copied Mahima ID to clipboard");
                                } catch {
                                  alert(code);
                                }
                              }}
                            >
                              Copy
                            </button>
                          </div>
                        </label>
                      </div>
                    </div>
                  </>
                )}

                <div className="form-row">
                  <div className="form-col">
                    <label>
                      Email
                      <input
                        value={form.email}
                        onChange={(e) =>
                          setField("email", e.target.value)
                        }
                      />
                    </label>
                  </div>
                  <div className="form-col">
                    <label>
                      Phone
                      <input
                        placeholder="+911234567890"
                        value={form.phone}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (phoneAllowTypingRegex.test(v))
                            setField("phone", v);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-col">
                    <label>
                      Role
                      <select
                        value={form.role}
                        onChange={(e) => setField("role", e.target.value)}
                      >
                        {roles && roles.length > 0 ? (
                          roles.map((r) => (
                            <option key={r.id ?? r.name} value={String(r.id)}>
                              {r.name}
                            </option>
                          ))
                        ) : (
                          <option value="">(no roles loaded)</option>
                        )}
                      </select>
                    </label>
                  </div>
                  <div className="form-col">
                    <label>
                      Join Date
                      <input
                        type="datetime-local"
                        value={isoToDatetimeLocal(form.joinDate)}
                        onChange={(e) =>
                          setField(
                            "joinDate",
                            datetimeLocalToIso(e.target.value)
                          )
                        }
                      />
                    </label>
                  </div>
                </div>

                {/* Enrichment fields preview */}
                <div
                  style={{
                    marginTop: 4,
                    paddingTop: 8,
                    borderTop: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  

                  <div className="form-row">
                    <div className="form-col">
                      <label>
                        Birthday
                       <input
  type="date"
  value={form.birthday || ""}
  onChange={(e) => setField("birthday", e.target.value)}
/>                      </label>
                    </div>
                    <div className="form-col">
                      <label>
                        Marital Status
                        	<select
  				value={form.maritalStatus || ""}
  				onChange={(e) => setField("maritalStatus", e.target.value)}
				>
  				<option value="">Select</option>
  				<option value="Single">Single</option>
  				<option value="Married">Married</option>
  				<option value="Divorced">Divorced</option>
  				<option value="Widowed">Widowed</option>
				</select>                      
			</label>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-col">
                      <label>
                        Sex
                        <select
  value={form.sex || ""}
  onChange={(e) => setField("sex", e.target.value)}
>
  		<option value="">Select</option>
  		<option value="Male">Male</option>
  		<option value="Female">Female</option>
		</select>
                  </label>
                    </div>
                    <div className="form-col">
                      <label>
                        Age
                        <input
  type="number"
  value={form.age || ""}
  onChange={(e) => setField("age", Number(e.target.value))}
  min="0"
/>                      </label>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-col">
                      <label>
                        Aadhar Number
                        <input
  type="text"
  value={form.aadharNumber || ""}
  onChange={(e) => setField("aadharNumber", e.target.value)}
  maxLength={12}
/>                      </label>
                    </div>
                    <div className="form-col">
                      <label>
                        Emergency Contact Phone
                        <input
  type="tel"
  value={form.emergencyContactPhone || ""}
  onChange={(e) => setField("emergencyContactPhone", e.target.value)}
/>                      </label>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-col">
                      <label>
                        Baptism Date
                        <input
  type="date"
  value={form.baptismDate || ""}
  onChange={(e) => setField("baptismDate", e.target.value)}
/>                      </label>
                    </div>
                    <div className="form-col">
                      <label>
                        Baptism Place
                        <input
  type="text"
  value={form.baptismPlace || ""}
  onChange={(e) => setField("baptismPlace", e.target.value)}
/>                      </label>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-col">
                      <label>
                        Home Address
                        <textarea
  value={form.homeAddress || ""}
  onChange={(e) => setField("homeAddress", e.target.value)}
/>                      </label>
                    </div>
                    <div className="form-col">
                      <label>
                        Current Address
                        <textarea
  value={form.currentAddress || ""}
  onChange={(e) => setField("currentAddress", e.target.value)}
/>
                      </label>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      marginTop: 8,
                      fontSize: 12,
                      color: "#4b5563",
                    }}
                  >
                    <label>
  <input
    type="checkbox"
    checked={!!form.isBaptized}
    onChange={(e) => setField("isBaptized", e.target.checked)}
  />
  Is Baptized
</label>

<label>
  <input
    type="checkbox"
    checked={!!form.isBornAgain}
    onChange={(e) => setField("isBornAgain", e.target.checked)}
  />
  Is Born Again
</label>

<label>
  <input
    type="checkbox"
    checked={!!form.isBeliever}
    onChange={(e) => setField("isBeliever", e.target.checked)}
  />
  Is Believer
</label>

<label>
  <input
    type="checkbox"
    checked={!!form.isPastor}
    onChange={(e) => setField("isPastor", e.target.checked)}
  />
  Is Pastor
</label>                  </div>
                </div>

                {modalMessage && (
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: modalSuccess
                        ? "rgba(34,197,94,0.12)"
                        : "rgba(220,38,38,0.08)",
                      color: modalSuccess ? "#166534" : "#991b1b",
                      fontWeight: 800,
                    }}
                  >
                    {modalMessage}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-muted"
                      onClick={() => {
                        setShowModal(false);
                        setModalMessage(null);
                      }}
                    >
                      Cancel
                    </button>
                    {form.id && (
                      <button
                        type="button"
                        className="btn"
                        onClick={resetPasswordForFormUser}
                        disabled={resetting}
                        title="Reset password to username + 123"
                        style={{
                          background:
                            "linear-gradient(90deg,#ffdde0,#ffd6da)",
                          color: "#7a1f1f",
                        }}
                      >
                        {resetting
                          ? "Resetting…"
                          : "Reset password (username+123)"}{" "}
                        🔐
                      </button>
                    )}
                  </div>
                  <div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast modal */}
      {broadcastOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Send ${broadcastType} Message`}
          onClick={(e) => {
            if (e.target.classList.contains("modal-backdrop"))
              setBroadcastOpen(false);
          }}
        >
          <div className="modal-panel" style={{ maxWidth: "980px" }}>
            <div className="modal-left">
              <h3 style={{ marginTop: 0 }}>
                {`Send "${broadcastType}" Message`}
              </h3>

              <textarea
                className="textarea"
                placeholder={`Enter the ${broadcastType} message to send to selected users...`}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
              />

              <div style={{ fontSize: 13, color: "#6f5f4f" }}>
                Tip: You can include short personal details like name in the
                message if you like.
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 8,
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-muted"
                    onClick={() => {
                      selectAllVisible();
                    }}
                  >
                    Select All
                  </button>
                  <button
                    className="btn btn-muted"
                    onClick={() => {
                      clearSelection();
                    }}
                  >
                    Clear Selection
                  </button>
                </div>
                <div style={{ textAlign: "right", flex: 1 }}>
                  <input
                    className="search-input"
                    placeholder="Filter recipients..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                  />
                  <div
                    style={{
                      fontSize: 13,
                      color: "#6f5f4f",
                      marginTop: 6,
                    }}
                  >
                    {selectedIds.size} selected
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 8,
                  borderRadius: 12,
                  overflow: "auto",
                  border: "1px solid rgba(0,0,0,0.06)",
                  maxHeight: "44vh",
                }}
              >
                {allUsers === null ? (
                  <div
                    style={{
                      padding: 16,
                      color: "#6f5f4f",
                    }}
                  >
                    Loading recipients…
                  </div>
                ) : allUsers.length === 0 ? (
                  <div
                    style={{
                      padding: 16,
                      color: "#6f5f4f",
                    }}
                  >
                    No recipients found.
                  </div>
                ) : (
                  allUsers
                    .filter((u) => {
                      if (!modalSearch) return true;
                      const s = modalSearch.toLowerCase();
                      return (
                        (
                          u.displayName ||
                          u.username ||
                          u.email ||
                          u.phone ||
                          ""
                        )
                          .toLowerCase()
                          .includes(s)
                      );
                    })
                    .map((u) => {
                      const initials =
                        (
                          u.displayName ||
                          u.name ||
                          u.username ||
                          ""
                        )
                          .split(" ")
                          .map((s) => s[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase() || "?";
                      return (
                        <div key={u.id} className="recipient-row">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(u.id)}
                            onChange={() => toggleSelect(u.id)}
                          />
                          <div
                            className="avatar"
                            aria-hidden
                            style={{
                              width: 44,
                              height: 44,
                            }}
                          >
                            {initials}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontWeight: 800,
                                fontSize: 14,
                              }}
                            >
                              {u.displayName || u.username || "(no name)"}
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                color: "#6b5a46",
                              }}
                            >
                              {u.email ?? "—"} &nbsp;
                              <span
                                style={{
                                  color: "#6f5f4f",
                                }}
                              >
                                {u.phone ?? ""}
                              </span>
                            </div>
                          </div>
                          <div
                            style={{
                              textAlign: "right",
                              minWidth: 90,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                color: "#6f5f4f",
                              }}
                            >
                              {(u.role ?? "member").toUpperCase()}
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            <div className="modal-right">
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#2f2b27",
                  }}
                >
                  Delivery Channels
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    padding: 8,
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: 8,
                      border: "1px solid rgba(0,0,0,0.06)",
                      borderRadius: 12,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={broadcastChannels.email}
                      onChange={(e) =>
                        setBroadcastChannels((prev) => ({
                          ...prev,
                          email: e.target.checked,
                        }))
                      }
                    />{" "}
                    <IconEmail />{" "}
                    <span
                      style={{
                        fontWeight: 700,
                      }}
                    >
                      Email
                    </span>
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: 8,
                      border: "1px solid rgba(0,0,0,0.06)",
                      borderRadius: 12,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={broadcastChannels.whatsapp}
                      onChange={(e) =>
                        setBroadcastChannels((prev) => ({
                          ...prev,
                          whatsapp: e.target.checked,
                        }))
                      }
                    />{" "}
                    <IconWhatsApp />{" "}
                    <span
                      style={{
                        fontWeight: 700,
                      }}
                    >
                      WhatsApp
                    </span>
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: 8,
                      border: "1px solid rgba(0,0,0,0.06)",
                      borderRadius: 12,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={broadcastChannels.sms}
                      onChange={(e) =>
                        setBroadcastChannels((prev) => ({
                          ...prev,
                          sms: e.target.checked,
                        }))
                      }
                    />{" "}
                    <IconSms />{" "}
                    <span
                      style={{
                        fontWeight: 700,
                      }}
                    >
                      SMS
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#6f5f4f",
                  }}
                >
                  Recipients:
                </div>
                <div
                  style={{
                    marginTop: 8,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <button
                      className="btn btn-muted"
                      onClick={() => selectAllVisible()}
                    >
                      Select all
                    </button>
                    <button
                      className="btn btn-muted"
                      onClick={() => clearSelection()}
                    >
                      Clear
                    </button>
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#6f5f4f",
                    }}
                  >
                    {selectedIds.size} recipients selected
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: "auto",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <button
                  className="btn btn-muted"
                  onClick={() => {
                    setBroadcastOpen(false);
                  }}
                >
                  Cancel
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => sendBroadcast()}
                    disabled={sending}
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>

              {sendResults && (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 13,
                  }}
                >
                  {sendResults.success ? (
                    <div style={{ color: "green" }}>
                      Sent to {sendResults.attempted} recipients. Check details
                      in logs.
                    </div>
                  ) : (
                    <div style={{ color: "darkred" }}>
                      Send failed: {sendResults.error || "Unknown error"}
                    </div>
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
