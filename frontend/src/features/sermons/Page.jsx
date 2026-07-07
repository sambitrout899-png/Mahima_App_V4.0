// src/features/sermons/Page.jsx
import React, { useEffect, useRef, useState } from "react";

/* ---------- util: YouTube ---------- */
function extractYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) {
      const p = new URLSearchParams(u.search);
      const v = p.get("v");
      if (v) return v;
      const m = u.pathname.match(/embed\/([^\/?]+)/);
      if (m) return m[1];
    }
    const maybe = url.trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(maybe)) return maybe;
  } catch {
    if (/^[A-Za-z0-9_-]{11}$/.test(String(url).trim())) return String(url).trim();
  }
  return null;
}
const watchUrlFromId  = (id) => (id ? `https://www.youtube.com/watch?v=${id}` : null);
function embedUrlFromId(id, opts = { autoplay: false, mute: true, controls: 1 }) {
  if (!id) return null;
  const qp = new URLSearchParams();
  if (opts.autoplay) qp.set("autoplay", "1");
  if (opts.mute) qp.set("mute", "1");
  if (opts.controls != null) qp.set("controls", String(opts.controls));
  qp.set("rel", "0"); qp.set("modestbranding", "1");
  return `https://www.youtube.com/embed/${id}?${qp.toString()}`;
}
const thumbnailUrlFromId = (id) => (id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null);

/* ---------- util: Admin detection & Admin Mode ---------- */
const HARDCODED_ADMIN_ID = "ae9dfc94-07d8-469a-a8f6-a4c5aedcf3a9";

function tryParseJSON(s) { try { return JSON.parse(s); } catch { return null; } }
const normalizeAccessName = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const canManageMediaRole = (value) => {
  const role = normalizeAccessName(value);
  return ["admin", "administrator", "superadmin", "superadministrator", "mediamanager"].includes(role);
};
function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return null; }
}

/** Read current user from common places in localStorage and infer admin status. */
function useAdminDetection() {
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    // try a few common keys your app might use
    const stored =
      localStorage.getItem("currentUser") ||
      localStorage.getItem("mahima_user") ||
      localStorage.getItem("user") ||
      null;

    const user = stored ? tryParseJSON(stored) : null;
    const uidCandidates = [
      user?.id, user?.Id, user?.userId, user?.UserId,
      localStorage.getItem("userId"),
      localStorage.getItem("mahima_user_id"),
    ].filter(Boolean);

    // read role-like fields
    const roleCandidates = []
      .concat(user?.role, user?.Role, user?.roleName, user?.RoleName)
      .filter(Boolean)
      .map(String);
    [user?.roles, user?.Roles, user?.positions, user?.Positions].forEach((list) => {
      if (Array.isArray(list)) {
        list.forEach((item) => roleCandidates.push(String(item?.name ?? item?.Name ?? item?.role ?? item?.Role ?? item)));
      }
    });
    [user?.position, user?.Position, user?.positionName, user?.PositionName, user?.primaryPosition, user?.PrimaryPosition]
      .filter(Boolean)
      .forEach((item) => roleCandidates.push(String(item?.name ?? item?.Name ?? item)));

    // also peek at JWT (if any) for roles/role claims
    const rawToken = localStorage.getItem("mahima_token") || localStorage.getItem("token") || null;
    if (rawToken) {
      const payload = decodeJwtPayload(rawToken);
      if (payload) {
        const jwtRoles = []
          .concat(payload.role, payload.roles, payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"])
          .filter(Boolean);
        jwtRoles.forEach((r) => roleCandidates.push(...(Array.isArray(r) ? r : [r]).map(String)));
      }
    }

    const byId = uidCandidates.some((x) => String(x) === HARDCODED_ADMIN_ID);
    const byRole = roleCandidates.some(canManageMediaRole);
    setIsAdminUser(byId || byRole);
  }, []);

  // persist adminMode in sessionStorage so it survives refreshes (per-tab)
  const [adminMode, _setAdminMode] = useState(() => sessionStorage.getItem("sermons_admin_mode") === "1");
  const setAdminMode = (v) => { _setAdminMode(v); sessionStorage.setItem("sermons_admin_mode", v ? "1" : "0"); };

  // Only allow adminMode when user is admin
  useEffect(() => {
    if (!isAdminUser) setAdminMode(false);
  }, [isAdminUser]);

  return { isAdminUser, adminMode, setAdminMode };
}

/* ---------- dynamic API resolution ---------- */
function resolveApiFromModule(mod, name) {
  if (!mod) return undefined;
  if (typeof mod[name] === "function") return mod[name];
  const obj = mod.sermonsApi ?? mod.default ?? mod;
  if (obj && typeof obj[name] === "function") return obj[name];
  return undefined;
}

/* ---------- Component ---------- */
export default function SermonsPage() {
  // data + ui
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("sermon");
  const [hoverPlayingId, setHoverPlayingId] = useState(null);
  const [query, setQuery] = useState("");

  // admin
  const { isAdminUser, adminMode, setAdminMode } = useAdminDetection();

  // modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id: null, type: "sermon", title: "", speaker: "", date: "", youtube: "" });
  const [saving, setSaving] = useState(false);

  // apis
  const moduleRef = useRef(null);
  const apisRef = useRef({ list: null, create: null, update: null, remove: null });

  /* ---------- styles (mobile-first) ---------- */
  const Styles = (
    <style>{`
      :root{ --bg: linear-gradient(180deg,#fffdfa,#fbf3e8); --deep:#12223a; --muted:#6f5f4f; --gold:#d1a62a; --card: rgba(255,255,255,0.98); --shadow:0 12px 34px rgba(12,16,24,0.08); --radius:16px; }
      .wrap{ min-height:100vh; padding:12px; background: var(--bg); font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:var(--deep); }
      .hero{ display:flex; gap:12px; align-items:flex-start; background:linear-gradient(90deg,#123a63,#0b2a47); color:#fff; padding:14px; border-radius:16px; box-shadow:var(--shadow); }
      .hero-actions{ margin-left:auto; display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
      .btn{ border:none; border-radius:12px; padding:10px 12px; font-weight:800; cursor:pointer; font-size:14px; display:inline-flex; align-items:center; gap:8px; }
      .btn-primary{ background: linear-gradient(90deg,var(--gold), #f4de93); color:#2b1f0f; box-shadow: 0 8px 20px rgba(178,136,7,0.18); }
      .btn-muted{ background:#fff; border:1px solid rgba(0,0,0,0.06); color:#2d3b48; }
      .btn-ghost{ background:transparent; border:1px dashed rgba(255,255,255,0.6); color:#fff; }
      .switch{ display:inline-flex; align-items:center; gap:8px; padding:6px 10px; border-radius:999px; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25); font-weight:800; }
      .switch input{ transform:scale(1.1); }
      .tabs{ display:flex; gap:8px; margin-top:12px; overflow:auto; }
      .tab{ padding:8px 12px; border-radius:999px; border:1px solid rgba(255,255,255,0.6); color:#fff; background:transparent; font-weight:700; white-space:nowrap; }
      .tab.active{ background:#fff; color:#0b2a47; border-color:transparent; }
      .search-row{ display:flex; gap:8px; margin-top:12px; }
      .search{ width:100%; padding:12px 14px; border-radius:12px; border:1px solid rgba(0,0,0,0.08); background:#fff; }

      .grid{ display:grid; grid-template-columns: 1fr; gap:12px; margin-top:14px; }
      @media(min-width: 760px){ .grid{ grid-template-columns: repeat(2,1fr); } }
      @media(min-width: 1200px){ .grid{ grid-template-columns: repeat(3,1fr); } }

      .card{ background: var(--card); border-radius: 14px; padding: 12px; box-shadow: var(--shadow); border:1px solid rgba(0,0,0,0.04); }
      .thumb{ position: relative; width: 100%; padding-top: 56.25%; border-radius: 12px; overflow: hidden; background:#000; border:1px solid rgba(0,0,0,0.04); }
      .play-hint{ position: absolute; left:10px; bottom:10px; background: rgba(0,0,0,0.5); padding:6px 8px; border-radius:8px; color:#fff; font-weight:800; }
      .pill{ display:inline-flex; align-items:center; gap:6px; padding:4px 8px; border-radius:999px; font-size:12px; font-weight:800; }
      .pill-type{ background:#fff2cc; border:1px solid rgba(200,170,90,0.3); color:#6a4e00; }
      .dim{ opacity:.5; pointer-events:none; }
      .hint{ font-size:12px; color:#cfe0ff; }
      /* Modal */
      .sheet{ position:fixed; inset:0; background: rgba(7,12,20,0.45); display:flex; align-items:flex-end; justify-content:center; z-index:9999; }
      .sheet-panel{ width:100%; max-width:860px; background: linear-gradient(180deg,#fff,#fffdf8); border-radius:18px 18px 0 0; box-shadow: 0 20px 60px rgba(17,24,39,0.2); padding:16px; max-height:88vh; overflow:auto; }
      @media(min-width: 900px){ .sheet{ align-items:center; } .sheet-panel{ border-radius:18px; } }
      .input{ width:100%; padding:12px; border-radius:12px; border:1px solid #e5e7eb; background:#fff; font-size:14px; }
      .label{ display:block; font-size:12px; color:#6b5a46; font-weight:700; margin-bottom:6px; }
    `}</style>
  );

  /* ---------- effects ---------- */
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [activeTab]);

  async function ensureApis() {
    if (!moduleRef.current) {
      moduleRef.current = await import("../../sermons");
      const mod = moduleRef.current;
      apisRef.current.list   = resolveApiFromModule(mod, "list");
      apisRef.current.create = resolveApiFromModule(mod, "create");
      apisRef.current.update = resolveApiFromModule(mod, "update");
      apisRef.current.remove = resolveApiFromModule(mod, "remove");
    }
  }

  async function load() {
    setLoading(true); setError(null);
    try {
      await ensureApis();
      const listApi = apisRef.current.list;
      if (typeof listApi !== "function") { setError("sermons API: 'list' not available."); setItems([]); return; }
      let raw; try { raw = await listApi(); } catch { raw = await listApi(1, 1000, ""); }
      const arr = Array.isArray(raw) ? raw : raw?.items ?? raw?.data ?? [];
      const filtered = (arr || []).filter(r => {
        const t = (r.type || r.Type || "sermon").toString().toLowerCase();
        if (activeTab.startsWith("sermon"))  return t === "sermon";
        if (activeTab.startsWith("book"))    return t === "book";
        if (activeTab.startsWith("article")) return t === "article";
        return true;
      });
      setItems(filtered);
    } catch (e) { setError(e?.message ?? String(e)); setItems([]); }
    finally { setLoading(false); }
  }

  /* ---------- actions ---------- */
  const openWatch = (id) => { const url = watchUrlFromId(id); if (!url) return; window.open(url, "_blank", "noopener,noreferrer"); };
  const onKeyOpen = (e, id) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openWatch(id); } };

  const openAdd = () => {
    if (!isAdminUser || !adminMode) { alert("Enable management mode to add."); return; }
    setForm({ id:null, type: activeTab.replace(/s$/,''), title:"", speaker:"", date:"", youtube:"" });
    setShowModal(true);
  };
  const openEdit = (r) => {
    if (!isAdminUser || !adminMode) { alert("Enable management mode to edit."); return; }
    setForm({
      id: r.id ?? r.Id ?? null,
      type: (r.type ?? r.Type ?? "sermon").toString().toLowerCase(),
      title: r.title ?? r.name ?? "",
      speaker: r.speaker ?? r.preacher ?? r.author ?? "",
      date: (r.date || r.publishedAt || "").slice(0,10),
      youtube: r.youtube ?? r.YoutubeUrl ?? r.YouTubeLink ?? r.YouTubeURL ?? r.youtubeUrl ?? r.yt ?? ""
    });
    setShowModal(true);
  };

  const save = async (e) => {
    e?.preventDefault?.();
    if (!isAdminUser || !adminMode) { alert("Enable management mode to save."); return; }
    if (!form.title || !form.youtube) { alert("Title and YouTube URL/ID are required"); return; }
    setSaving(true);
    try {
      await ensureApis();
      const youTubeId = extractYouTubeId(form.youtube);
      const payload = {
        Id: form.id ?? undefined,
        Title: form.title,
        Speaker: form.speaker || null,
        Type: (form.type || "sermon").toString().toLowerCase(),
        Date: form.date ? new Date(form.date).toISOString() : null,
        YoutubeUrl: youTubeId ? `https://www.youtube.com/watch?v=${youTubeId}` : form.youtube,
      };
      const updateApi = apisRef.current.update;
      const createApi = apisRef.current.create;
      const isEdit = !!form.id && typeof updateApi === "function";
      if (isEdit) await updateApi(payload);
      else if (typeof createApi === "function") await createApi(payload);
      else throw new Error("API: create/update not available");
      setShowModal(false); await load();
    } catch (err) { alert("Save failed: " + (err?.message || String(err))); }
    finally { setSaving(false); }
  };

  const doDelete = async (id) => {
    if (!isAdminUser || !adminMode) { alert("Enable management mode to delete."); return; }
    if (!window.confirm("Delete this item?")) return;
    try {
      await ensureApis();
      const removeApi = apisRef.current.remove;
      if (typeof removeApi !== "function") throw new Error("API: remove not available");
      await removeApi(id);
      setItems((arr) => arr.filter((x) => String(x.id ?? x.Id) !== String(id)));
    } catch (err) { alert("Delete failed: " + (err?.message || String(err))); }
  };

  const viewItems = items.filter((r) => {
    if (!query) return true; const s = query.toLowerCase();
    return `${r.title||r.name||""} ${r.speaker||r.preacher||r.author||""} ${r.youtube||r.youtubeUrl||""}`.toLowerCase().includes(s);
  });

  /* ---------- render ---------- */
  return (
    <div className="wrap">
      {Styles}

      {/* header */}
      <div className="hero" role="region" aria-label="Sermons header">
        <div>
          <h2 style={{ margin:0, fontSize:22 }}>Resources</h2>
          <div style={{ opacity:.9, fontSize:13 }}>Sermons, Books and Articles</div>
          <div className="tabs" role="tablist" aria-label="Resource tabs">
            {[
              {k:'sermon', label:'Sermons'},
              {k:'book', label:'Books'},
              {k:'article', label:'Articles'},
            ].map(t => (
              <button key={t.k} role="tab" aria-selected={activeTab===t.k} className={`tab ${activeTab===t.k?'active':''}`} onClick={() => setActiveTab(t.k)}>{t.label}</button>
            ))}
          </div>
        </div>

        <div className="hero-actions">
          <button className="btn btn-ghost" onClick={load}>⟳ Refresh</button>

          {/* Management mode switch (visible only to media managers/admin users) */}
          {isAdminUser && (
            <label className="switch" title="Only administrators can toggle this">
              <input type="checkbox" checked={adminMode} onChange={(e)=>setAdminMode(e.target.checked)} />
              <span>{adminMode ? "Manage mode: ON" : "Manage mode: OFF"}</span>
            </label>
          )}

          <button className={`btn btn-primary ${(!isAdminUser || !adminMode) ? "dim" : ""}`} onClick={openAdd}>
            ＋ Add {activeTab.replace(/s$/,'')}
          </button>
        </div>
      </div>

      {/* small hint */}
      {isAdminUser ? (
        <div className="hint" style={{ marginTop:6 }}>
          Tip: Toggle <strong>Manage mode</strong> ON to enable Add / Edit / Delete.
        </div>
      ) : (
        <div className="hint" style={{ marginTop:6 }}>
          You’re not an admin. Edit/Delete are unavailable.
        </div>
      )}

      {/* search */}
      <div className="search-row">
        <input className="search" placeholder={`Search ${activeTab}s by title, speaker or link…`} value={query} onChange={(e)=>setQuery(e.target.value)} />
      </div>

      {loading && <div className="card" style={{ padding:12 }}>Loading…</div>}
      {error && <div className="card" style={{ padding:12, color:'#b91c1c', fontWeight:700 }}>{error}</div>}

      {/* grid */}
      <div className="grid" role="list">
        {viewItems.map((r, idx) => {
          const id = r.id ?? r.Id ?? idx;
          const title = r.title ?? r.name ?? "Untitled";
          const speaker = r.speaker ?? r.preacher ?? r.author ?? "";
          const date = r.date ?? r.publishedAt ?? "";
          const rawUrl = r.youtube ?? r.YoutubeUrl ?? r.YouTubeLink ?? r.YouTubeURL ?? r.youtubeUrl ?? r.yt ?? null;
          const vid = extractYouTubeId(rawUrl);
          const watchUrl = vid ? watchUrlFromId(vid) : null;
          const embedUrlPreview = vid ? embedUrlFromId(vid, { autoplay: true, mute: true, controls: 1 }) : null;
          const thumb = vid ? thumbnailUrlFromId(vid) : null;
          const isPlaying = String(hoverPlayingId) === String(id);
          const disableActions = !isAdminUser || !adminMode;

          return (
            <article key={id} className="card" role="listitem" aria-labelledby={`res-${id}`}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
                <div>
                  <div id={`res-${id}`} style={{ fontWeight:800 }}>{title}</div>
                  <div style={{ color:'#6b5a46', fontSize:13 }}>{speaker} {date ? `• ${new Date(date).toLocaleDateString()}` : ""}</div>
                </div>
                <div className="pill pill-type">{(r.type ?? "Sermon").toString()}</div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div
                  role={watchUrl ? "button" : undefined}
                  tabIndex={watchUrl ? 0 : -1}
                  onDoubleClick={() => vid && openWatch(vid)}
                  onKeyDown={(e) => vid && onKeyOpen(e, vid)}
                  onMouseEnter={() => { if (vid) setHoverPlayingId(id); }}
                  onMouseLeave={() => { if (hoverPlayingId === id) setHoverPlayingId(null); }}
                  onClick={() => { if (!vid) return; openWatch(vid); }}
                  className="thumb"
                  aria-label={vid ? `YouTube preview for ${title}` : "No video"}
                  title={vid ? "Double-tap/click to open on YouTube" : "No video available"}
                >
                  {isPlaying && embedUrlPreview ? (
                    <iframe title={`yt-${id}`} src={embedUrlPreview} frameBorder="0" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
                  ) : (
                    thumb ? (
                      <img alt={title} src={thumb} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} draggable={false} />
                    ) : (
                      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', background:'linear-gradient(180deg,#222,#444)' }}>No preview</div>
                    )
                  )}
                  {!isPlaying && vid && (<div className="play-hint">▶ Tap to play • Double to open</div>)}
                </div>
              </div>

              <div style={{ marginTop: 10, display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <div style={{ color:'#999', fontSize:12 }}>
                  {rawUrl ? <a href={watchUrl} target="_blank" rel="noreferrer" style={{ color:'#2f4fa2', textDecoration:'none' }}>Open on YouTube ↗</a> : 'No link'}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className={`btn btn-muted ${disableActions ? "dim": ""}`} onClick={() => openEdit(r)} disabled={disableActions} aria-disabled={disableActions}>Edit</button>
                  <button className={`btn ${disableActions ? "dim": ""}`} style={{ background:'linear-gradient(180deg,#e74c3c,#c0392b)', color:'#fff' }} onClick={() => doDelete(r.id ?? r.Id)} disabled={disableActions} aria-disabled={disableActions}>Delete</button>
                </div>
              </div>
            </article>
          );
        })}

        {(!loading && viewItems.length === 0) && (
          <div className="card" style={{ padding:12, color:'#6f5f4f' }}>No items found.</div>
        )}
      </div>

      {/* Modal: Add / Edit */}
      {showModal && (
        <div className="sheet" role="dialog" aria-modal="true" aria-label={form.id ? 'Edit item' : 'Add item'} onClick={(e)=>{ if(e.target.classList.contains('sheet')) setShowModal(false); }}>
          <div className="sheet-panel">
            <h3 style={{ marginTop:0 }}>{form.id ? 'Edit' : 'Add'} {form.type}</h3>
            <form onSubmit={save} style={{ display:'grid', gap:12 }}>
              <div>
                <label className="label">Type</label>
                <select className="input" value={form.type} onChange={(e)=> setForm(f=>({...f, type:e.target.value}))}>
                  <option value="sermon">Sermon</option>
                  <option value="book">Book</option>
                  <option value="article">Article</option>
                </select>
              </div>

              <div>
                <label className="label">Title *</label>
                <input className="input" value={form.title} onChange={(e)=> setForm(f=>({...f, title:e.target.value}))} />
              </div>

              <div>
                <label className="label">Speaker / Author</label>
                <input className="input" value={form.speaker} onChange={(e)=> setForm(f=>({...f, speaker:e.target.value}))} />
              </div>

              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                <div style={{ flex:'1 1 240px', minWidth:220 }}>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={form.date} onChange={(e)=> setForm(f=>({...f, date:e.target.value}))} />
                </div>
                <div style={{ flex:'2 1 320px', minWidth:280 }}>
                  <label className="label">YouTube URL or ID *</label>
                  <input className="input" placeholder="https://youtu.be/VIDEO_ID or VIDEO_ID" value={form.youtube} onChange={(e)=> setForm(f=>({...f, youtube:e.target.value}))} />
                </div>
              </div>

              {/* live preview */}
              {extractYouTubeId(form.youtube) && (
                <div>
                  <div className="label">Preview</div>
                  <div className="thumb" style={{ border:'1px dashed rgba(0,0,0,0.1)' }}>
                    <iframe title="preview" src={embedUrlFromId(extractYouTubeId(form.youtube), { autoplay:false, mute:true, controls:1 })} frameBorder="0" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
                  </div>
                </div>
              )}

              <div style={{ display:'flex', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                <button type="button" className="btn btn-muted" onClick={()=> setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : (form.id ? 'Save Changes' : 'Add')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
