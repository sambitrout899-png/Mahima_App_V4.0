// src/features/teams/MembersPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const API_BASE = RAW_API_BASE ? RAW_API_BASE.replace(/\/+$/, "") : "https://www.mahimaministries.com";
const apiPath = (p) => {
  if (!p) return API_BASE;
  if (p.startsWith("/")) return `${API_BASE}${p}`;
  return `${API_BASE}/${p}`;
};

async function parseResponse(res) {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text();
  if (!ct.includes("application/json")) {
    return { raw: text, contentType: ct, ok: res.ok, status: res.status, statusText: res.statusText };
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    return { raw: text, parseError: String(e), ok: res.ok, status: res.status, statusText: res.statusText };
  }
}

export default function MembersPage() {
  const { teamId } = useParams();

  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // add modal + users list
  const [showAdd, setShowAdd] = useState(false);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [markLeader, setMarkLeader] = useState(false);
  const [saving, setSaving] = useState(false);

  // global users fetched for "Add" modal
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);

  // map userId -> { status, teamsCount, teamsArray (optional) }
  const [userTeamsMap, setUserTeamsMap] = useState({});

  // action guard
  const [actionInFlight, setActionInFlight] = useState(false);

  useEffect(() => {
    loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function loadMembers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiPath(`/teams/${encodeURIComponent(teamId)}/members`), { method: "GET" });
      const parsed = await parseResponse(res);
      if (!res.ok) {
        const body = (parsed && parsed.raw) ? parsed.raw : JSON.stringify(parsed);
        throw new Error(`GET failed ${res.status} ${res.statusText} - ${String(body).slice(0, 300)}`);
      }
      const arr = Array.isArray(parsed) ? parsed : (parsed?.items ?? parsed?.Items ?? parsed?.members ?? []);
      const list = Array.isArray(arr) ? arr : [];
      setMembers(list);
      // best-effort: try enrich missing user info (so displayName shows actual user name)
      enrichMembersWithUserDetails(list);
    } catch (err) {
      console.error(err);
      setError(String(err));
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }

  /* ---------- helper accessors ---------- */

  const membershipIdOf = (m) => {
    if (!m) return null;
    return m.id ?? m.Id ?? m.membershipId ?? m.MembershipId ?? null;
  };

  const userIdOf = (m) => {
    if (!m) return "";
    const u = m.user ?? m.User ?? null;
    if (u) return u.id ?? u.userId ?? u.Id ?? u.UserId ?? "";
    return m.userId ?? m.UserId ?? m.id ?? m.Id ?? "";
  };

  // Prefer userId for API endpoints (backend expects /members/{userId})
  const membershipPatchId = (m) => {
    if (!m) return null;
    const uid = userIdOf(m);
    if (uid) return uid;
    const mid = membershipIdOf(m);
    if (mid) return mid;
    return null;
  };

  function displayNameOf(m) {
    if (!m) return "";
    const u = m.user ?? m.User ?? m;
    return (
      u?.displayName ??
      u?.name ??
      u?.fullName ??
      u?.userName ??
      u?.username ??
      (u?.firstName && u?.lastName ? `${u.firstName} ${u.lastName}` : null) ??
      (userIdOf(m) || "").slice(0, 8)
    );
  }

  function emailOf(m) {
    return (m.user ?? m.User ?? m)?.email ?? m?.email ?? m?.Email ?? null;
  }
  function usernameOf(m) {
    return (m.user ?? m.User ?? m)?.username ?? (m.user ?? m.User ?? m)?.userName ?? m?.username ?? m?.userName ?? null;
  }

  // NEW: unified member role accessor (prefers RoleInTeam, then member.role etc, then embedded user.role)
  function memberRoleOf(m) {
    return (
      m?.RoleInTeam ??
      m?.role ??
      m?.Role ??
      (m?.user ?? m?.User ?? {})?.role ??
      (m?.user ?? m?.User ?? {})?.RoleInTeam ??
      (m?.user ?? m?.User ?? {})?.roleInTeam ??
      "member"
    );
  }

  // NEW: unified joined date accessor and formatting
  function joinedOf(m) {
    const candidate =
      m?.JoinedAt ??
      m?.joinedAt ??
      m?.Joined ??
      m?.joined ??
      m?.joinDate ??
      m?.JoinDate ??
      (m?.user ?? m?.User ?? {})?.joined ??
      null;
    if (!candidate) return "-";
    try {
      const d = new Date(candidate);
      if (Number.isNaN(d.getTime())) return String(candidate);
      // choose friendly formatting; adjust to your locale preferences
      return d.toLocaleString();
    } catch (e) {
      return String(candidate);
    }
  }

  const memberCount = members.length;
  const leader = members.find((m) => m.IsLeader || m.isLeader || m.isLeader || m.leader || m.Leader);

  /* ---------- enrichment: try to fetch user objects for members that only have userId ---------- */

  async function enrichMembersWithUserDetails(list) {
    if (!Array.isArray(list) || list.length === 0) return;
    const need = [];
    const seen = new Set();
    for (const m of list) {
      const uid = userIdOf(m);
      const hasUserObj = !!(m.user ?? m.User);
      const hasName = !!(m.displayName || m.name || (m.user ?? m.User)?.displayName || (m.user ?? m.User)?.name || (m.user ?? m.User)?.username);
      if (uid && (!hasUserObj || !hasName) && !seen.has(uid)) {
        need.push(uid);
        seen.add(uid);
      }
    }
    if (need.length === 0) return;

    const CHUNK = 6;
    for (let i = 0; i < need.length; i += CHUNK) {
      const chunk = need.slice(i, i + CHUNK);
      await Promise.allSettled(chunk.map(async (uid) => {
        try {
          const res = await fetch(apiPath(`/users/${encodeURIComponent(uid)}`));
          if (!res.ok) return;
          const parsed = await parseResponse(res);
          const userObj = Array.isArray(parsed) ? parsed[0] : (parsed?.data ?? parsed?.item ?? parsed ?? null);
          if (!userObj) return;
          setMembers((prev) => prev.map((m) => {
            if (String(userIdOf(m)) === String(uid)) {
              // if the membership row lacks a RoleInTeam, inherit role from user object for display
              const roleFromMember = m?.RoleInTeam ?? m?.role ?? m?.Role;
              const roleFromUser = userObj?.role ?? userObj?.RoleInTeam ?? userObj?.roleInTeam ?? null;
              return {
                ...m,
                user: userObj,
                // only set RoleInTeam for display if it wasn't already present; don't overwrite server data
                RoleInTeam: roleFromMember ?? roleFromUser
              };
            }
            return m;
          }));
        } catch (e) {
          // ignore non-fatal enrichment failures
        }
      }));
    }
  }

  /* ---------- robust leader helpers (use PUT; fallback to POST for create) ---------- */

  async function unsetLeaderMembership(existing) {
    if (!existing) return false;
    const existingUserId = userIdOf(existing);
    if (!existingUserId) return false;

    const payload = { RoleInTeam: memberRoleOf(existing) ?? null, IsLeader: false, UserId: existingUserId };

    try {
      const res = await fetch(apiPath(`/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(existingUserId)}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok || res.status === 204) return true;

      // fallback to POST upsert
      const res2 = await fetch(apiPath(`/teams/${encodeURIComponent(teamId)}/members`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res2.ok || res2.status === 201 || res2.status === 204) return true;
      console.warn("unsetLeaderMembership fallback returned", res.status, res2.status);
    } catch (e) {
      console.warn("unsetLeaderMembership error", e);
    }
    return false;
  }

  async function setLeaderForMember(member, desired) {
    const uid = userIdOf(member);
    if (!uid) return { ok: false, status: 0, statusText: "No userId available" };

    const payload = { UserId: uid, RoleInTeam: memberRoleOf(member) ?? null, IsLeader: desired };

    try {
      // Preferred: PUT to update existing membership
      const res = await fetch(apiPath(`/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(uid)}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok || res.status === 204 || res.status === 200) return res;

      // Fallback: POST upsert
      const res2 = await fetch(apiPath(`/teams/${encodeURIComponent(teamId)}/members`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res2;
    } catch (e) {
      console.warn("setLeaderForMember error", e);
      return { ok: false, status: 0, statusText: String(e) };
    }
  }

  /* ---------- actions ---------- */

  async function addMember(userToAdd = null, opts = {}) {
    if (userToAdd && typeof userToAdd === "object" && userToAdd.preventDefault) userToAdd = null;
    const uid = (userToAdd ?? userId ?? "").toString().trim();
    if (!uid) {
      alert("UserId is required");
      return;
    }

    setSaving(true);
    try {
      if (markLeader || opts.markLeader) {
        const existing = members.find((m) => m.IsLeader || m.isLeader || m.leader || m.Leader);
        if (existing) {
          await unsetLeaderMembership(existing);
          await loadMembers();
        }
      }

      // Use explicit property names matching server DTO (UserId, RoleInTeam, IsLeader)
      const payload = { UserId: uid, RoleInTeam: (role || "").trim() || null, IsLeader: !!(markLeader || opts.markLeader) };
      const res = await fetch(apiPath(`/teams/${encodeURIComponent(teamId)}/members`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const parsed = await parseResponse(res);
      if (!(res.ok || res.status === 201 || res.status === 204)) {
        const body = parsed.raw ?? JSON.stringify(parsed);
        throw new Error(`Add member failed: ${res.status} ${res.statusText} - ${String(body).slice(0, 300)}`);
      }

      await loadMembers();
      await fetchUserTeamsAndUpdate(uid);

      setUserId("");
      setRole("");
      setMarkLeader(false);
      setShowAdd(false);
    } catch (err) {
      console.error(err);
      alert("Add member failed: " + (err?.message || String(err)));
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(member) {
    const uid = typeof member === "string" ? member : userIdOf(member);
    if (!uid) {
      alert("Cannot determine identifier to remove this member.");
      return;
    }
    if (!window.confirm("Remove this member?")) return;

    setActionInFlight(true);
    try {
      const res = await fetch(apiPath(`/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(uid)}`), { method: "DELETE" });
      const parsed = await parseResponse(res);
      if (!(res.ok || res.status === 204)) {
        const body = parsed.raw ?? JSON.stringify(parsed);
        throw new Error(`Delete failed: ${res.status} ${res.statusText} - ${String(body).slice(0, 300)}`);
      }
      await loadMembers();
      await fetchUserTeamsAndUpdate(uid);
    } catch (err) {
      console.error(err);
      alert("Remove failed: " + (err?.message || String(err)));
    } finally {
      setActionInFlight(false);
    }
  }

  async function toggleLeader(member) {
    setActionInFlight(true);
    try {
      const currentlyLeader = !!(member.IsLeader || member.isLeader || member.leader || member.Leader);
      const desired = !currentlyLeader;

      if (desired) {
        const existing = members.find((m) => m.IsLeader || m.isLeader || m.leader || m.Leader);
        if (existing && String(userIdOf(existing)) !== String(userIdOf(member))) {
          await unsetLeaderMembership(existing);
          await loadMembers();
        }
      }

      let res = await setLeaderForMember(member, desired);

      if (res && (res.status === 405 || res.status === 409)) {
        console.warn("Leader update returned", res.status, "- performing fallback unset and retry");
        await loadMembers();
        const existingNow = members.find((m) => m.IsLeader || m.isLeader || m.leader || m.Leader);
        if (existingNow && String(userIdOf(existingNow)) !== String(userIdOf(member))) {
          const okUnset = await unsetLeaderMembership(existingNow);
          if (okUnset) {
            await loadMembers();
            res = await setLeaderForMember(member, desired);
          }
        } else if (!existingNow) {
          res = await setLeaderForMember(member, desired);
        }
      }

      if (!res || !(res.ok || res.status === 201 || res.status === 204 || res.status === 200)) {
        const parsed = res ? await parseResponse(res).catch(() => ({})) : {};
        throw new Error(`Update leader failed: ${res?.status ?? 0} ${res?.statusText ?? ""} - ${JSON.stringify(parsed).slice(0,300)}`);
      }

      await loadMembers();
    } catch (err) {
      console.error(err);
      alert("Update leader failed: " + (err?.message || String(err)));
    } finally {
      setActionInFlight(false);
    }
  }

  async function editRole(member) {
    const current = memberRoleOf(member);
    const newRole = window.prompt(`Enter role for ${displayNameOf(member)}`, current);
    if (newRole === null) return;
    setActionInFlight(true);
    try {
      const uid = userIdOf(member);
      if (!uid) throw new Error("Cannot determine userId for role update");

      // Use explicit DTO keys
      const dto = { UserId: uid, RoleInTeam: newRole, IsLeader: !!(member.IsLeader || member.isLeader || member.leader || member.Leader) };

      // Prefer PUT (update)
      const res = await fetch(apiPath(`/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(uid)}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      });

      if (!res.ok) {
        // fallback to POST (upsert)
        const res2 = await fetch(apiPath(`/teams/${encodeURIComponent(teamId)}/members`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dto),
        });
        if (!(res2.ok || res2.status === 201 || res2.status === 204)) {
          const parsed2 = await parseResponse(res2);
          throw new Error(`Role update fallback failed: ${res2.status} ${res2.statusText} - ${JSON.stringify(parsed2).slice(0,300)}`);
        }
      }

      await loadMembers();
    } catch (err) {
      console.error(err);
      alert("Update role failed: " + (err?.message || String(err)));
    } finally {
      setActionInFlight(false);
    }
  }

  /* ---------- ALL USERS + membership checks for the Add modal ---------- */

  async function fetchAllUsers() {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await fetch(apiPath(`/users`));
      const parsed = await parseResponse(res);
      if (!res.ok) {
        const b = parsed.raw ?? JSON.stringify(parsed);
        throw new Error(`GET /users failed: ${res.status} ${String(b).slice(0, 300)}`);
      }
      const arr = Array.isArray(parsed) ? parsed : (parsed?.items ?? parsed?.Items ?? parsed?.data ?? parsed ?? []);
      const users = Array.isArray(arr) ? arr : [];
      setAllUsers(users);

      const map = {};
      users.forEach((u) => { map[userIdOf(u)] = { status: "idle", teamsCount: null, teams: null }; });
      setUserTeamsMap(map);

      const CHUNK = 12;
      for (let i = 0; i < users.length; i += CHUNK) {
        const chunk = users.slice(i, i + CHUNK);
        await Promise.allSettled(chunk.map((u) => fetchUserTeamsAndUpdate(userIdOf(u))));
      }
    } catch (err) {
      console.error(err);
      setUsersError(String(err));
      setAllUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }

  async function fetchUserTeamsAndUpdate(userIdToFetch) {
    if (!userIdToFetch) return;
    setUserTeamsMap((m) => ({ ...m, [userIdToFetch]: { ...(m[userIdToFetch] || {}), status: "loading" } }));
    try {
      const res = await fetch(apiPath(`/users/${encodeURIComponent(userIdToFetch)}/teams`));
      const parsed = await parseResponse(res);
      if (!res.ok) {
        setUserTeamsMap((m) => ({ ...m, [userIdToFetch]: { status: "ready", teamsCount: 0, teams: [] } }));
        return;
      }
      const arr = Array.isArray(parsed) ? parsed : (parsed?.items ?? parsed?.Items ?? parsed?.data ?? parsed ?? []);
      const teams = Array.isArray(arr) ? arr : [];
      setUserTeamsMap((m) => ({ ...m, [userIdToFetch]: { status: "ready", teamsCount: teams.length, teams } }));
    } catch (err) {
      console.warn("fetchUserTeams failed for", userIdToFetch, err);
      setUserTeamsMap((m) => ({ ...m, [userIdToFetch]: { status: "error", teamsCount: null, teams: null } }));
    }
  }

  useEffect(() => { if (showAdd) fetchAllUsers(); /* eslint-disable-next-line */ }, [showAdd]);

  const memberIdsSet = useMemo(() => {
    const s = new Set();
    members.forEach((m) => {
      const id = userIdOf(m);
      if (id) s.add(String(id));
    });
    return s;
  }, [members]);

  /* ---------- styles (unchanged) ---------- */
  const Styles = (
    <style>{`
      :root {
        --ivory: linear-gradient(180deg,#fffdfa,#fff7ee);
        --muted: #6f5f4f;
        --deep: #11335a;
        --gold: #f2c94c;
        --card-shadow: 0 12px 34px rgba(21,14,8,0.06);
        --radius: 12px;
      }
      .members-wrap { min-height: 72vh; padding: 24px; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial; color:var(--deep); background: var(--ivory); }
      .members-hero { display:flex; gap:18px; align-items:flex-start; padding:14px; border-radius: var(--radius); background: linear-gradient(180deg,#fff,#fff6ee); box-shadow: var(--card-shadow); border:1px solid rgba(0,0,0,0.03); margin-bottom:18px; }
      .members-hero h2 { margin:0; font-size:22px; }
      .members-hero p { margin:6px 0 0; color:var(--muted); font-size:13px; }
      .hero-actions { margin-left:auto; display:flex; gap:10px; align-items:center; }
      .btn { border:none; border-radius:10px; padding:8px 12px; font-weight:700; cursor:pointer; font-size:13px; }
      .btn-primary { background: linear-gradient(90deg,var(--gold), #f7d87e); color:#2b1f0f; }
      .btn-muted { background:#fff; color:#2d3b48; border:1px solid rgba(0,0,0,0.06); }
      .card { background: rgba(255,255,255,0.96); border-radius: 12px; padding: 14px; box-shadow: var(--card-shadow); border:1px solid rgba(0,0,0,0.03); }
      .members-grid { display:flex; flex-direction:column; gap:12px; margin-top:12px; }
      .member-card { background:white; border-radius:12px; padding:12px; box-shadow:0 8px 24px rgba(14,22,34,0.06); display:flex; gap:12px; align-items:center; justify-content:space-between; }
      .member-left { display:flex; gap:12px; align-items:center; min-width:0; }
      .avatar { width:56px; height:56px; border-radius:10px; display:inline-flex; align-items:center; justify-content:center; background:linear-gradient(180deg,#fff6e3,#fff1d6); border:1px solid rgba(0,0,0,0.03); color:var(--deep); font-weight:800; font-size:18px; flex-shrink:0; }
      .member-main { min-width:0; }
      .member-name { font-weight:800; font-size:15px; color:#112b44; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .member-sub { color:#6b5a46; font-size:13px; }
      .member-meta { display:flex; gap:12px; align-items:center; margin-top:8px; color:#6b5a46; font-size:12px; flex-wrap:wrap; }
      .role-badge { display:inline-block; padding:6px 8px; background:linear-gradient(180deg,#fff7e6,#fff0d6); border-radius:8px; color:var(--gold); font-weight:800; font-size:12px; border:1px solid rgba(200,170,90,0.06); }
      .member-actions { display:flex; gap:8px; align-items:center; }
      .btn-sm { padding:6px 8px; border-radius:8px; font-weight:700; font-size:12px; border:1px solid rgba(0,0,0,0.06); background:#fff; cursor:pointer; }
      .btn-danger { background: linear-gradient(180deg,#e74c3c,#c0392b); color:white; border:none; padding:8px 10px; border-radius:8px; }
      .leader-pill { padding:6px 10px; border-radius:999px; background: #fff8e6; color:#b06d05; font-size:12px; font-weight:800; border:1px solid rgba(200,170,90,0.06); }
      .user-list { max-height: 420px; overflow: auto; display:flex; flex-direction:column; gap:8px; padding-top:6px; }
      .user-row { display:flex; align-items:center; gap:12px; padding:8px; border-radius:8px; background: #fbfbfb; border:1px solid rgba(0,0,0,0.03); }
      .user-row .meta { flex:1; min-width:0; display:flex; flex-direction:column; gap:6px; }
      .badge-light { background:#fff; border:1px solid rgba(0,0,0,0.04); padding:6px 8px; border-radius:8px; font-weight:700; color:#6b5a46; }
      .small-muted { color:#7a6a57; font-size:12px; }
      @media (max-width:760px) {
        .members-hero { flex-direction:column; align-items:flex-start; }
        .member-meta { flex-direction:column; align-items:flex-start; gap:6px; }
      }
    `}</style>
  );

  /* ---------- UI for Add modal: helper filter state ---------- */
  const [userSearch, setUserSearch] = useState("");
  const filteredUsers = useMemo(() => {
    const q = (userSearch || "").trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter((u) => {
      const dn = (displayNameOf(u) || "").toLowerCase();
      const email = (u.email || u.emailAddress || "").toLowerCase();
      const uname = (u.username || u.userName || "").toLowerCase();
      return dn.includes(q) || email.includes(q) || uname.includes(q) || (userIdOf(u) || "").toLowerCase().startsWith(q);
    });
  }, [allUsers, userSearch]);

  /* ---------- render ---------- */
  return (
    <div className="members-wrap" role="region" aria-label="Team members">
      {Styles}

      <div className="members-hero" role="banner">
        <div>
          <h2>Team members — Team {teamId}</h2>
          <p>Manage members, assign roles and choose a single leader.</p>
          <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ background: "#fff", padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.04)", fontWeight: 700 }}>
              Members: <span style={{ color: "#11335a" }}>{memberCount}</span>
            </div>
            <div style={{ background: "#fff", padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.04)" }}>
              Leader: <span style={{ color: "#11335a", fontWeight: 700 }}>{leader ? displayNameOf(leader) : "—"}</span>
            </div>
          </div>
        </div>

        <div className="hero-actions" role="toolbar" aria-label="Member actions">
          <button onClick={() => navigate(-1)} className="btn btn-muted" aria-label="Back">Back</button>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary" aria-label="Add member">➕ Add member</button>
          <button onClick={loadMembers} className="btn btn-muted" aria-label="Refresh">🔄 Refresh</button>
        </div>
      </div>

      <div className="card" role="main">
        {loading ? (
          <div style={{ padding: 20, color: "#6f5f4f" }}>Loading members…</div>
        ) : error ? (
          <div style={{ padding: 20, color: "red" }}>Error: {error}</div>
        ) : memberCount === 0 ? (
          <div style={{ padding: 20, color: "#6f5f4f" }}>No members yet. Click "Add member" to begin.</div>
        ) : (
          <div className="members-grid" role="list">
            {members.map((m) => {
              const initials = (displayNameOf(m) || "").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase() || "?";
              const uid = userIdOf(m);
              const mid = membershipIdOf(m);
              const shownSub = usernameOf(m) || emailOf(m) || uid || (mid ? `membership:${mid}` : "");
              const memberRole = String(memberRoleOf(m) || "member").toUpperCase();
              const joined = joinedOf(m);
              return (
                <article key={mid ?? uid ?? Math.random()} className="member-card" role="listitem" aria-labelledby={`member-${mid ?? uid}`}>
                  <div className="member-left">
                    <div className="avatar" aria-hidden>{initials}</div>
                    <div className="member-main">
                      <div id={`member-${mid ?? uid}`} className="member-name" title={displayNameOf(m)}>{displayNameOf(m)}</div>
                      <div className="member-sub">{shownSub}</div>
                      <div className="member-meta">
                        <div className="role-badge">{memberRole}</div>
                        <div>Joined: <strong style={{ color: "#112b44" }}>{joined}</strong></div>
                        {emailOf(m) ? <div className="small-muted">Email: <a href={`mailto:${emailOf(m)}`}>{emailOf(m)}</a></div> : null}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      {m.leader || m.Leader || m.isLeader || m.IsLeader ? <div className="leader-pill">Leader</div> : <div style={{ width: 1 }} /> }
                      <div style={{ fontSize: 12, color: "#6f5f4f" }}>{/* spacer */}</div>
                    </div>

                    <div className="member-actions" role="group" aria-label={`Actions for ${displayNameOf(m)}`}>
                      <button className="btn-sm" onClick={() => editRole(m)} disabled={actionInFlight}>Edit role</button>
                      <button className="btn-sm" onClick={() => toggleLeader(m)} disabled={actionInFlight}>
                        {(m.leader || m.Leader || m.isLeader || m.IsLeader) ? "Unset leader" : "Make leader"}
                      </button>
                      <button className="btn-danger" onClick={() => removeMember(m)} disabled={actionInFlight}>Remove</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ... keep your Add modal JSX unchanged (it works with the updated helpers) ... */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(6,6,6,0.4)" }} onClick={() => setShowAdd(false)} />
          <div style={{ width: 760, maxWidth: "96%", background: "#fff", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.35)", padding: 18, zIndex: 125 }}>
            {/* same add modal content you already had (omitted here for brevity) */}
            <h3 style={{ marginTop: 0 }}>Add member</h3>
            <form onSubmit={(e) => { e.preventDefault(); addMember(); }} style={{ display: "grid", gap: 12, marginBottom: 6 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, color: "#6b5a46" }}>UserId (UUID)</label>
                  <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Enter UUID or pick user below" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)" }} />
                </div>
                <div style={{ width: 220 }}>
                  <label style={{ display: "block", fontSize: 13, color: "#6b5a46" }}>Role (optional)</label>
                  <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (optional)" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)" }} />
                </div>
              </div>

              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                <input type="checkbox" checked={markLeader} onChange={(e) => setMarkLeader(e.target.checked)} />
                <span>Mark as leader (this will unset any existing leader)</span>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={() => setShowAdd(false)} className="btn btn-muted">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? "Adding…" : "Add member"}</button>
              </div>
            </form>

            <hr />

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
              <input
                placeholder="Search users by name, email or username..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)" }}
              />
              <button onClick={() => { fetchAllUsers(); }} className="btn btn-muted">Reload</button>
            </div>

            <div style={{ marginTop: 10 }}>
              {usersLoading ? (
                <div style={{ padding: 12, color: "#6f5f4f" }}>Loading users…</div>
              ) : usersError ? (
                <div style={{ padding: 12, color: "red" }}>Error: {usersError}</div>
              ) : allUsers.length === 0 ? (
                <div style={{ padding: 12, color: "#6f5f4f" }}>No users found.</div>
              ) : (
                <div className="user-list" role="list">
                  {filteredUsers.map((u) => {
                    const uid = userIdOf(u);
                    const info = userTeamsMap[uid] ?? { status: "idle", teamsCount: null };
                    const teamsCount = info?.teamsCount;
                    const inThisTeam = memberIdsSet.has(String(uid));
                    return (
                      <div key={uid || Math.random()} className="user-row" role="listitem" aria-label={`User ${displayNameOf(u)}`}>
                        <div className="avatar" aria-hidden style={{ width: 44, height: 44, borderRadius: 8, fontSize: 14 }}>
                          {(displayNameOf(u) || "").split(" ").map(s => s[0]).join("").slice(0,2).toUpperCase()}
                        </div>

                        <div className="meta">
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 800, color: "#112b44", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {displayNameOf(u)}
                              </div>
                              <div className="small-muted" style={{ marginTop: 4 }}>
                                {u.email ? <span>{u.email} • </span> : null}
                                <span>{u.username ?? u.userName ?? ""}</span>
                              </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                              <div className="badge-light">{(u.role ?? u.Role ?? "USER").toUpperCase()}</div>
                              <div className="small-muted" style={{ fontSize: 12 }}>
                                {info.status === "loading" ? "checking teams…" : (
                                  info.status === "error" ? "teams unknown" : (
                                    typeof teamsCount === "number" ? `${teamsCount} team${teamsCount !== 1 ? "s" : ""}` : "no data"
                                  )
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                            <button
                              className="btn-sm"
                              onClick={() => {
                                // quick-use: populate form so admin can tweak before adding
                                setUserId(uid);
                                setRole(u.role ?? u.Role ?? "");
                                setMarkLeader(false);
                              }}
                            >
                              Use
                            </button>

                            <button
                              className="btn-primary"
                              style={{ padding: "6px 10px", borderRadius: 8 }}
                              disabled={inThisTeam || saving}
                              onClick={async () => {
                                // immediate-add: pass id directly to avoid state-update race
                                await addMember(uid);
                              }}
                            >
                              {inThisTeam ? "Already in team" : (saving ? "Adding…" : "Add")}
                            </button>

                            <button className="btn-sm" onClick={() => fetchUserTeamsAndUpdate(uid)}>Refresh teams</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button onClick={() => setShowAdd(false)} className="btn btn-muted">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
