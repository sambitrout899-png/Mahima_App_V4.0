// src/features/teams/TeamsPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";

/**
 * Teams page — mobile-first cathedral look + robust API parsing
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

/* ---------- response normalization ---------- */
function normalizeResponse(res) {
  if (!res) return { items: [], meta: { total: 0, page: 1, limit: 50 } };
  if (Array.isArray(res)) return { items: res, meta: { total: res.length, page: 1, limit: res.length } };
  const items = res.items ?? res.data ?? (res || []);
  const meta = {
    total: Number(res.total ?? (Array.isArray(items) ? items.length : 0)) || 0,
    page: Number(res.page ?? 1) || 1,
    limit: Number(res.limit ?? (Array.isArray(items) ? items.length : 50)) || 50,
  };
  return { items: Array.isArray(items) ? items : [], meta };
}

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 50 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const searchTimer = useRef(null);

  // modal/form state
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ id: "", name: "", description: "" });
  const [saving, setSaving] = useState(false);

  // diagnostics log
  const [diagLog, setDiagLog] = useState([]);
  const diag = (msg, obj) => {
    setDiagLog((s) => [{ at: new Date().toISOString(), msg, obj }, ...s].slice(0, 50));
  };

  const navigate = useNavigate();

  /* ---------- MEMBER COUNT cache & helpers ---------- */
  // map teamId -> { status: "idle"|"loading"|"ready"|"error", count: number|null }
  const [memberCounts, setMemberCounts] = useState({});

  const readMemberCountFromObject = (t) => {
    if (!t) return null;
    const candidates = [
      "members", "Members", "memberCount", "MemberCount", "member_count", "Member_count", "Member_Count", "membercount", "Membercount",
    ];
    for (const k of candidates) {
      if (Object.prototype.hasOwnProperty.call(t, k) && t[k] != null) {
        const v = t[k];
        const n = Number(v);
        if (!Number.isNaN(n)) return n;
        if (Array.isArray(v)) return v.length;
      }
    }
    if (t.stats && typeof t.stats === "object") {
      const st = t.stats;
      for (const k of ["members", "member_count", "memberCount", "MemberCount"]) {
        if (Object.prototype.hasOwnProperty.call(st, k) && st[k] != null) {
          const n = Number(st[k]);
          if (!Number.isNaN(n)) return n;
        }
      }
    }
    return null;
  };

  const ensureMemberCount = async (team) => {
    const id = team?.id ?? team?.Id ?? team?.TeamId ?? team?.teamId;
    if (!id) return;

    const fromObj = readMemberCountFromObject(team);
    if (fromObj != null) {
      setMemberCounts((s) => ({ ...s, [id]: { status: "ready", count: fromObj } }));
      return;
    }

    setMemberCounts((s) => {
      const existing = s[id];
      if (existing && (existing.status === "ready" || existing.status === "loading")) return s;
      return { ...s, [id]: { status: "loading", count: null } };
    });

    try {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), 8000);

      let resp = await fetch(`${API_BASE}/api/teams/${encodeURIComponent(id)}/members`, { signal: controller.signal });
      if (!resp.ok) {
        try {
          resp = await fetch(`${API_BASE}/api/teams/${encodeURIComponent(id)}/members/count`, { signal: controller.signal });
        } catch (_) {}
      }
      clearTimeout(to);

      if (!resp || !resp.ok) {
        setMemberCounts((s) => ({ ...s, [id]: { status: "error", count: null } }));
        diag("ensureMemberCount: non-ok response", { id, status: resp ? resp.status : "no-response" });
        return;
      }

      const contentType = resp.headers.get("content-type") || "";
      let body = null;
      if (contentType.includes("application/json")) body = await resp.json().catch(() => null);
      else {
        const txt = await resp.text().catch(() => "");
        try { body = txt ? JSON.parse(txt) : null; } catch { body = null; }
      }

      let count = null;
      if (body == null) count = null;
      else if (Array.isArray(body)) count = body.length;
      else if (typeof body === "number") count = body;
      else if (typeof body === "object") {
        if (Array.isArray(body.items)) count = body.items.length;
        else if (typeof body.total === "number") count = Number(body.total);
        else if (body.count != null && !Number.isNaN(Number(body.count))) count = Number(body.count);
        else {
          const firstArray = Object.values(body).find((v) => Array.isArray(v));
          if (firstArray) count = firstArray.length;
        }
      }

      setMemberCounts((s) => ({ ...s, [id]: { status: "ready", count } }));
    } catch (err) {
      console.error("Failed to fetch members for team", id, err);
      setMemberCounts((s) => ({ ...s, [id]: { status: "error", count: null } }));
      diag("ensureMemberCount error", { id, err: String(err) });
    }
  };

  /* ---------- fetch teams ---------- */
  const fetchTeams = async (page = 1, limit = 50, q = "") => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (q) params.set("search", q);
      const resp = await fetch(`${API_BASE}/api/teams?${params.toString()}`);
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`GET /api/teams failed ${resp.status} ${txt || resp.statusText}`);
      }
      const data = await resp.json().catch(() => null);
      const normalized = normalizeResponse(data);
      setTeams(normalized.items || []);
      setMeta({ page: normalized.meta.page, limit: normalized.meta.limit, total: normalized.meta.total });

      normalized.items?.forEach((t) => {
        const id = t?.id ?? t?.Id ?? t?.TeamId ?? t?.teamId;
        const objCount = readMemberCountFromObject(t);
        if (objCount == null) ensureMemberCount(t);
        else setMemberCounts((s) => ({ ...s, [id]: { status: "ready", count: objCount } }));
      });

      enrichLeaderNames(normalized.items || []);
    } catch (err) {
      console.error(err);
      setError(err?.message || String(err));
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams(meta.page, meta.limit, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Leader enrichment ---------- */
  const [leaderMap, setLeaderMap] = useState({});
  const leaderIdOfTeam = (t) => t?.LeadUserId ?? t?.leadUserId ?? t?.lead ?? t?.leader ?? t?.leadUser ?? null;
  const normalizeUserResponse = (resp) => {
    if (!resp) return null;
    if (Array.isArray(resp) && resp.length > 0) return resp[0];
    if (typeof resp === "object") return resp.data ?? resp.item ?? resp;
    return null;
  };
  const enrichLeaderNames = async (teamsBatch) => {
    if (!Array.isArray(teamsBatch) || teamsBatch.length === 0) return;
    const ids = teamsBatch.map((t) => leaderIdOfTeam(t)).filter((v) => v != null && String(v).trim() !== "");
    const uniqueIds = Array.from(new Set(ids));
    const toFetch = uniqueIds.filter((id) => !leaderMap[id]);

    await Promise.allSettled(toFetch.map(async (id) => {
      try {
        const url = `${API_BASE}/users/${encodeURIComponent(id)}`;
        const r = await fetch(url);
        if (!r.ok) { setLeaderMap((m) => ({ ...m, [id]: null })); diag("enrichLeaderNames: user fetch non-ok", { id, status: r.status }); return; }
        const ct = (r.headers.get("content-type") || "").toLowerCase();
        let parsed = null;
        if (ct.includes("application/json")) parsed = await r.json().catch(() => null);
        else { const txt = await r.text().catch(() => ""); try { parsed = txt ? JSON.parse(txt) : null; } catch { parsed = null; } }
        const user = normalizeUserResponse(parsed);
        setLeaderMap((m) => ({ ...m, [id]: user ?? null }));
      } catch (err) {
        console.warn("enrichLeaderNames fetch error", id, err);
        setLeaderMap((m) => ({ ...m, [id]: null }));
        diag("enrichLeaderNames error", { id, err: String(err) });
      }
    }));
  };
  useEffect(() => { if (!teams || teams.length === 0) return; enrichLeaderNames(teams); }, [teams]);
  const displayLeaderForTeam = (t) => {
    const id = leaderIdOfTeam(t);
    if (!id) return "—";
    const u = leaderMap[id];
    if (u) return (u.displayName ?? u.name ?? u.fullName ?? u.username ?? u.userName ?? String(id)).toString();
    return String(id);
  };

  /* ---------- CRUD ---------- */
  const openCreate = () => { setEditing(false); setForm({ id: "", name: "", description: "" }); setIsOpen(true); };
  const openEdit = (team) => { setEditing(true); setForm({ id: team.id ?? team.Id ?? "", name: team.name ?? team.Name ?? "", description: team.description ?? team.Description ?? "" }); setIsOpen(true); };
  const deleteTeam = async (id) => {
    if (!window.confirm("Delete this team?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/teams/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!(res.ok || res.status === 204)) {
        const txt = await res.text().catch(() => "");
        throw new Error(`DELETE failed ${res.status} ${txt}`);
      }
      setTeams((t) => t.filter((x) => String(x.id ?? x.Id) !== String(id)));
      diag(`DELETE /api/teams/${id} -> success`, { status: res.status });
      setMemberCounts((s) => { const copy = { ...s }; delete copy[id]; return copy; });
    } catch (err) { console.error(err); diag(`DELETE /teams/${id} -> error`, String(err)); alert("Delete failed: " + (err?.message || String(err))); }
  };
  const save = async (ev) => {
    ev?.preventDefault?.();
    const name = (form.name || "").trim();
    if (!name) { alert("Please enter a name."); return; }
    setSaving(true);
    try {
      const payload = { name, description: form.description ?? "" };
      let res;
      if (editing && form.id) {
        res = await fetch(`${API_BASE}/api/teams/${encodeURIComponent(form.id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        res = await fetch(`${API_BASE}/teams`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      if (!(res.ok || res.status === 201 || res.status === 204)) { const txt = await res.text().catch(() => ""); throw new Error(`Save failed: ${res.status} ${txt}`); }
      let returned = null; try { const txt = await res.text(); if (txt) returned = JSON.parse(txt); } catch (_) { returned = null; }
      if (returned && (returned.id || returned.Id)) {
        const id = returned.id ?? returned.Id;
        if (editing) setTeams((t) => t.map((x) => (String(x.id ?? x.Id) === String(id) ? returned : x)));
        else setTeams((t) => [returned, ...t]);
      } else { await fetchTeams(1, meta.limit, search); }
      setIsOpen(false);
      diag(`${editing ? "PUT" : "POST"} /api/teams -> success`, { payload, status: res.status });
    } catch (err) { console.error(err); diag(`${editing ? "PUT" : "POST"} /teams -> error`, String(err)); alert("Save failed: " + (err?.message || String(err))); }
    finally { setSaving(false); }
  };

  /* ---------- diagnostics ---------- */
  const runDiagnostics = async () => {
    setDiagLog([]); diag("Starting diagnostics", { apiBase: API_BASE });
    try {
      const g = await fetch(`${API_BASE}/api/teams`);
      const body = (g.headers.get("content-type") || "").includes("application/json") ? await g.clone().json() : await g.clone().text();
      diag("GET /teams", { status: g.status, ok: g.ok, body });
    } catch (e) { diag("GET error", String(e)); }
    diag("Diagnostics finished", {});
  };

  /* ---------- helpers ---------- */
  const openMembers = (team) => { const teamId = team.id ?? team.Id; navigate(`/teams/${encodeURIComponent(teamId)}/members`); };
  useEffect(() => { if (searchTimer.current) clearTimeout(searchTimer.current); searchTimer.current = setTimeout(() => { fetchTeams(1, meta.limit, search); }, 450); return () => { if (searchTimer.current) clearTimeout(searchTimer.current); }; // eslint-disable-next-line
  }, [search]);

  const exportCsv = () => {
    const hdr = ["id", "name", "description", "members"];
    const rows = teams.map((t) => {
      const id = t.id ?? t.Id ?? "";
      const name = (t.name ?? t.Name ?? "").replace(/[\r\n]+/g, " ");
      const desc = (t.description ?? t.Description ?? "").replace(/[\r\n]+/g, " ");
      const mcached = memberCounts[id];
      const count = mcached && mcached.status === "ready" ? mcached.count : readMemberCountFromObject(t) ?? "";
      return [id, name, desc, count];
    });
    const csv = [hdr, ...rows].map((r) => r.map((c) => `"${String(c ?? "")?.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `teams-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const computedCountLabel = (t) => {
    const id = t?.id ?? t?.Id ?? t?.TeamId ?? t?.teamId;
    const obj = readMemberCountFromObject(t);
    if (obj != null) return obj;
    const cached = memberCounts[id];
    if (cached) { if (cached.status === "loading") return "…"; if (cached.status === "ready") return cached.count ?? 0; if (cached.status === "error") return "-"; }
    return "-";
  };

  useEffect(() => {
    if (!teams || teams.length === 0) return;
    teams.forEach((t) => {
      const id = t?.id ?? t?.Id ?? t?.TeamId ?? t?.teamId;
      const local = memberCounts[id];
      const objCount = readMemberCountFromObject(t);
      if (objCount != null) setMemberCounts((s) => ({ ...s, [id]: { status: "ready", count: objCount } }));
      else if (!local || (local.status !== "loading" && local.status !== "ready")) ensureMemberCount(t);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams]);

  /* ---------- styles (mobile-first, dark-ready) ---------- */
  const Styles = (
    <style>{`
      :root{
        --bg: linear-gradient(180deg,#fffdfa,#fbf3e8);
        --muted:#4a3a2f; --deep:#12223a; --accent:#2f5bd8; --gold:#d1a62a; --card: rgba(255,255,255,0.96);
        --shadow: 0 10px 30px rgba(12,16,24,0.08); --radius:16px;
        --safe-top: env(safe-area-inset-top); --safe-bottom: env(safe-area-inset-bottom);
      }
      @media(prefers-color-scheme:dark){
        :root{ --bg: linear-gradient(180deg,#0e1320,#0b0f19); --muted:#b9b5ad; --deep:#eef2f8; --accent:#7aa2ff; --card:rgba(20,24,36,0.86); }
      }

      .teams-page{ min-height:100vh; padding: max(8px,var(--safe-top)) 12px calc(64px + var(--safe-bottom)); background: var(--bg); font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial; color: var(--deep); }

      /* Top hero */
      .top-hero{ position:sticky; top:8px; z-index:40; display:flex; gap:10px; align-items:flex-start; padding:14px; border-radius: var(--radius); background: linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,250,240,0.95)); box-shadow: var(--shadow); border:1px solid rgba(0,0,0,0.04); margin-bottom:10px; }
      .hero-title{ font-size:18px; font-weight:900; }
      .hero-sub{ color:#6f5f4f; margin-top:4px; font-size:13px; }
      .hero-actions{ margin-left:auto; display:flex; gap:8px; align-items:center; }

      /* Search row */
      .search-row{ display:flex; gap:8px; }
      .search-input{ width:100%; padding:14px 12px; border-radius:12px; border:1px solid rgba(0,0,0,0.06); font-size:15px; background:#fff; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }

      /* Buttons */
      .btn{ border:none; border-radius:12px; padding:12px 14px; font-weight:800; cursor:pointer; font-size:14px; display:inline-flex; align-items:center; gap:8px; }
      .btn-primary{ background: linear-gradient(90deg,var(--gold), #f4de93); color:#2b1f0f; box-shadow: 0 8px 20px rgba(178,136,7,0.18); }
      .btn-muted{ background:#fff; border:1px solid rgba(0,0,0,0.06); color:#2d3b48; }
      .btn-danger{ background: linear-gradient(180deg,#e74c3c,#c0392b); color:#fff; }

      /* Card container */
      .card{ background: var(--card); border-radius: var(--radius); padding:12px; box-shadow: var(--shadow); border:1px solid rgba(0,0,0,0.04); }

      /* List (mobile) */
      .teams-list{ display:grid; grid-template-columns:1fr; gap:10px; }
      .team-card{ background:#fff; border-radius:16px; padding:12px; box-shadow: 0 10px 28px rgba(14,22,34,0.08); border:1px solid rgba(0,0,0,0.04); display:grid; grid-template-columns:auto 1fr; gap:10px; }
      .team-avatar{ width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:900; background: linear-gradient(180deg,#fff6e3,#fff1d6); color:#112b44; }
      .team-title{ font-weight:900; font-size:16px; color:#112b44; }
      .team-desc{ color:#6b5a46; font-size:13px; margin-top:4px; }
      .team-meta{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:6px; }
      .badge{ display:inline-block; padding:6px 10px; border-radius:999px; background:#f1f5ff; color:#0f5b9a; border:1px solid rgba(15,91,154,0.08); font-weight:800; font-size:12px; }
      .badge.zero{ background:#f4f4f4; color:#8b8080; }
      .chip{ padding:6px 10px; border-radius:999px; background:#f8fafc; border:1px solid rgba(0,0,0,.06); font-size:12px; }
      .row-actions{ margin-left:auto; display:flex; gap:8px; }
      .icon-btn{ min-width:44px; min-height:44px; display:inline-flex; align-items:center; justify-content:center; border-radius:12px; border:1px solid rgba(0,0,0,0.06); background:#fff; }

      /* Table (desktop) */
      @media(min-width: 980px){
        .teams-table{ width:100%; border-collapse:collapse; font-size:13px; margin-top:4px; }
        .teams-table thead th{ text-align:left; padding:12px 14px; color:#0f2644; font-weight:800; font-size:12px; }
        .teams-table tbody td{ padding:12px; border-bottom:1px solid rgba(0,0,0,0.04); color:#2f2b27; vertical-align:top; font-size:12px; }
        .teams-table tbody tr:hover{ background: rgba(240,238,235,0.6); }
        .teams-list{ display:none; }
      }

      /* Skeletons */
      .skeleton{ background: linear-gradient(90deg, rgba(0,0,0,0.05), rgba(0,0,0,0.09), rgba(0,0,0,0.05)); background-size: 200% 100%; animation: shimmer 1.2s infinite; border-radius: 10px; }
      @keyframes shimmer { 0%{ background-position: 200% 0; } 100%{ background-position: -200% 0; } }

      /* FAB */
      .fab{ position: fixed; right: 16px; bottom: calc(18px + var(--safe-bottom)); z-index: 70; }
    `}</style>
  );

  /* ---------- render ---------- */
  const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const end = Math.min(meta.total, meta.page * meta.limit);

  return (
    <div className="teams-page" role="region" aria-label="Teams management">
      {Styles}

      <div className="top-hero" role="region" aria-label="teams header">
        <div style={{ flex:1 }}>
          <div className="hero-title">Teams</div>
          <div className="hero-sub">Manage teams and their members. Tap a team to manage or view members.</div>
        </div>
        <div style={{ minWidth: 280, flex: 1 }}>
          <div className="search-row">
            <input
              className="search-input"
              aria-label="Search teams"
              placeholder="Search teams…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn btn-muted" onClick={() => fetchTeams(1, meta.limit, search)}>Search</button>
          </div>
          <div style={{ marginTop: 6, color: "#6f5f4f", fontSize: 13 }}>Showing {teams.length === 0 ? 0 : `${start}–${end}`} of {meta.total}</div>
        </div>
        <div className="hero-actions">
          <button className="btn btn-muted" onClick={() => fetchTeams(meta.page, meta.limit, search)}>Refresh</button>
          <button className="btn btn-muted" onClick={exportCsv}>Export CSV</button>
          <button className="btn btn-primary" onClick={openCreate}>New Team</button>
          <button onClick={runDiagnostics} className="btn btn-muted">Diagnostics</button>
        </div>
      </div>

      <div className="card" role="main" aria-label="teams list">
        {loading ? (
          <div style={{ display:'grid', gap:12 }}>
            {[...Array(6)].map((_,i) => (
              <div key={i} className="team-card" aria-hidden>
                <div className="team-avatar skeleton" />
                <div style={{ flex:1, display:'grid', gap:8 }}>
                  <div className="skeleton" style={{ height:16, width:'40%' }} />
                  <div className="skeleton" style={{ height:12, width:'70%' }} />
                  <div className="skeleton" style={{ height:12, width:'55%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: 16, color: "#b91c1c", fontWeight: 700 }}>{error}</div>
        ) : teams.length === 0 ? (
          <div style={{ padding: 16, color: "#6f5f4f" }}>No teams found.</div>
        ) : (
          <>
            {/* Mobile list */}
            <div className="teams-list" role="list" aria-label="teams grid">
              {teams.map((t) => {
                const id = t.id ?? t.Id ?? t.TeamId ?? t.teamId;
                const name = t.name ?? t.Name ?? "(no name)";
                const desc = t.description ?? t.Description ?? "";
                const initials = String(name).split(" ").map(s=>s[0]).join("").slice(0,2).toUpperCase() || "T";
                const countLabel = computedCountLabel(t);
                return (
                  <article key={String(id)} className="team-card" role="listitem" aria-labelledby={`team-${id}`}>
                    <div className="team-avatar" aria-hidden>{initials}</div>
                    <div style={{ display:'grid', gap:6 }}>
                      <div className="team-title" id={`team-${id}`}>{name}</div>
                      <div className="team-desc">{desc || <span style={{ opacity:.6 }}>No description</span>}</div>
                      <div className="team-meta">
                        {String(countLabel) === "…" ? (
                          <span className="badge">…</span>
                        ) : Number.isInteger(Number(countLabel)) ? (
                          <span className={Number(countLabel) > 0 ? "badge" : "badge zero"}>{Number(countLabel)}</span>
                        ) : (
                          <span className="badge zero">-</span>
                        )}
                        <span className="chip">Leader: {displayLeaderForTeam(t)}</span>
                        <div className="row-actions">
                          <button className="icon-btn" onClick={() => openEdit(t)} aria-label={`Edit ${name}`}>✎</button>
                          <button className="icon-btn btn-danger" onClick={() => deleteTeam(id)} aria-label={`Delete ${name}`}>🗑</button>
                          <button className="icon-btn" onClick={() => openMembers(t)} aria-label={`Manage members of ${name}`}>👥</button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Desktop table */}
            <table className="teams-table" role="table" aria-label="teams table">
              <thead>
                <tr>
                  <th style={{ width: "35%" }}>Name</th>
                  <th style={{ width: "45%" }}>Description</th>
                  <th style={{ width: "10%", textAlign: "center" }}>Members</th>
                  <th style={{ width: "10%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => {
                  const id = t.id ?? t.Id ?? t.TeamId ?? t.teamId;
                  const countLabel = computedCountLabel(t);
                  return (
                    <tr key={String(id)}>
                      <td style={{ fontWeight: 700 }}>
                        {t.name ?? t.Name}
                        <div style={{ marginTop: 8, fontSize: 12, color: "#6b5a46" }}>Leader: <strong>{displayLeaderForTeam(t)}</strong></div>
                      </td>
                      <td style={{ color: "#6b5a46" }}>{t.description ?? t.Description ?? "-"}</td>
                      <td style={{ textAlign: "center" }}>
                        {String(countLabel) === "…" ? (
                          <span className="badge">…</span>
                        ) : Number.isInteger(Number(countLabel)) ? (
                          <span className={Number(countLabel) > 0 ? "badge" : "badge zero"}>{Number(countLabel)}</span>
                        ) : (
                          <span className="badge zero">-</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                          <button className="btn btn-muted" onClick={() => openEdit(t)}>Edit</button>
                          <button className="btn btn-danger" onClick={() => deleteTeam(id)}>Delete</button>
                          <button className="btn btn-muted" onClick={() => openMembers(t)}>Manage Members</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {/* diagnostics log (small) */}
        <div style={{ marginTop: 16 }}>
          <h4 style={{ marginBottom: 8, color: "#6b5a46" }}>Diagnostics Log</h4>
          <div style={{ maxHeight: 160, overflow: "auto", background: "#fbfaf7", border: "1px solid rgba(0,0,0,0.03)", borderRadius: 12, padding: 10 }}>
            {diagLog.length === 0 ? <div style={{ color: "#8e7f6e" }}>No diagnostics run yet.</div> : (
              diagLog.map((d, i) => (
                <div key={i} style={{ fontSize: 12, borderBottom: "1px dashed rgba(0,0,0,0.06)", paddingBottom: 8, marginBottom: 8 }}>
                  <div style={{ color: "#3b3b3b" }}><strong>{d.at}</strong> — {d.msg}</div>
                  <pre style={{ fontSize: 11, color: "#5b4b3d", whiteSpace: "pre-wrap" }}>{typeof d.obj === "string" ? d.obj : JSON.stringify(d.obj, null, 2)}</pre>
                </div>
              ))
            )}
          </div>
        </div>
 <div style={{ marginTop: 20 }}>
    <Outlet />
  </div>

</div>
      </div>

      {/* Floating create button */}
      <div className="fab">
        <button className="btn btn-primary" onClick={openCreate} aria-label="Create team">＋ New Team</button>
      </div>

      {/* modal form */}
      {isOpen && (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 120 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(6,6,6,0.4)" }} onClick={() => setIsOpen(false)} />
          <div style={{ width: "720px", maxWidth: "96%", background: "#fff", borderRadius: "18px 18px 0 0", boxShadow: "0 20px 60px rgba(0,0,0,0.45)", padding: 18, zIndex: 125, maxHeight:'86vh', overflow:'auto' }}>
            <h3 style={{ marginTop: 0 }}>{editing ? "Edit Team" : "New Team"}</h3>
            <form onSubmit={save} style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, color: "#6b5a46", fontWeight:700 }}>Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: "#6b5a46", fontWeight:700 }}>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap:'wrap' }}>
                <button type="button" onClick={() => setIsOpen(false)} className="btn btn-muted">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      
    </div>
  );
}
roo
