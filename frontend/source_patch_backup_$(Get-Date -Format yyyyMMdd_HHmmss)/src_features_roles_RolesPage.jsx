// src/features/roles/RolesPage.jsx
import React, { useEffect, useState } from "react";
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001/api";

function IconRoles() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  );
}

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ id: null, name: "", description: "", pages: [] });
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/roles`);
      const jr = await r.json();
      setRoles(jr.items || []);
      const p = await fetch(`${API_BASE}/pages`);
      const jp = await p.json();
      setPages(jp.items || []);
    } catch (err) {
      console.error("load error", err);
      setRoles([]);
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ id: null, name: "", description: "", pages: [] }); setShow(true); };
  const openEdit = (r) => { setForm({ id: r.id, name: r.name || "", description: r.description || "", pages: r.pages || [] }); setShow(true); };

  const togglePage = (key) => {
    setForm(prev => {
      const set = new Set(prev.pages || []);
      if (set.has(key)) set.delete(key); else set.add(key);
      return { ...prev, pages: Array.from(set) };
    });
  };

  const save = async (e) => {
    e?.preventDefault?.();
    if (!form.name) return alert("Name required");
    setSaving(true);
    try {
      const payload = { name: form.name, description: form.description || null, pages: form.pages || [] };
      if (form.id) {
        await fetch(`${API_BASE}/roles/${form.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch(`${API_BASE}/roles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      setShow(false);
      await load();
    } catch (err) {
      alert("Save failed: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (id) => {
    if (!window.confirm("Delete this role?")) return;
    try {
      await fetch(`${API_BASE}/roles/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert("Delete failed: " + (err?.message || err));
    }
  };

  const filtered = roles.filter(r => {
    if (!query) return true;
    const s = query.toLowerCase();
    return `${r.name} ${r.description || ""}`.toLowerCase().includes(s);
  });

  return (
    <div className="roles-wrap">
      <style>{`
        .roles-wrap { padding: 18px; }
        .roles-header { display:flex; align-items:center; gap:12px; margin-bottom:18px; }
        .roles-title { font-size:20px; font-weight:800; }
        .roles-actions { margin-left:auto; display:flex; gap:8px; align-items:center; }
        .search { padding:8px 12px; border-radius:10px; border:1px solid rgba(0,0,0,0.06); width:280px; }
        .btn { border: none; padding: 8px 12px; border-radius:10px; cursor:pointer; font-weight:700;}
        .btn-primary { background: linear-gradient(90deg,#f1c232,#f2d47a); color:#2f2b27; box-shadow:0 6px 18px rgba(241,194,50,0.12); }
        .grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(280px,1fr)); gap:12px; margin-top:14px; }
        .role-card { padding:14px; border-radius:12px; background:white; box-shadow: 0 8px 24px rgba(18,14,10,0.04); border:1px solid rgba(0,0,0,0.03); display:flex; gap:12px; align-items:flex-start; }
        .role-avatar { width:56px; height:56px; border-radius:12px; display:grid; place-items:center; font-weight:800; background:linear-gradient(180deg,#fff6e3,#fff1d6); color:#2f4fa2; }
        .role-main { flex:1; }
        .role-name { font-weight:800; font-size:15px; display:flex; gap:8px; align-items:center; }
        .role-desc { color:#6f5f4f; margin-top:6px; font-size:13px }
        .page-chip { display:inline-flex; gap:8px; padding:6px 10px; border-radius:999px; background:#f6f3ee; color:#7a5f3f; font-weight:700; margin:6px 6px 0 0; font-size:13px; }
        .card-actions { display:flex; flex-direction:column; gap:8px; align-items:flex-end; }
        .small-muted { font-size:12px; color:#6f5f4f; }
      `}</style>

      <div className="roles-header" role="region" aria-label="Roles header">
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <div style={{ width:48, height:48, borderRadius:12, display:"grid", placeItems:"center", background:"#fffaf6", color:"#2f4fa2" }} aria-hidden>
            <IconRoles />
          </div>
          <div>
            <div className="roles-title">Roles</div>
            <div style={{ color:"#6f5f4f", fontSize:13 }}>Create roles and assign which pages each role can access.</div>
          </div>
        </div>

        <div className="roles-actions">
          <input className="search" placeholder="Filter roles..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="btn" onClick={() => load()}>Refresh</button>
          <button className="btn btn-primary" onClick={openAdd}>Add Role</button>
        </div>
      </div>

      {loading ? <div className="small-muted">Loading…</div> : (
        <div className="grid" role="list">
          {filtered.map(r => (
            <article className="role-card" key={r.id} role="listitem" aria-labelledby={`role-${r.id}`}>
              <div className="role-avatar" aria-hidden>{(r.name || "R").slice(0,2).toUpperCase()}</div>

              <div className="role-main">
                <div className="role-name" id={`role-${r.id}`}>
                  {r.name}
                  <span className="small-muted" style={{ marginLeft: 8, fontSize: 12, fontWeight: 600 }}>{r.pages?.length ?? 0} pages</span>
                </div>
                <div className="role-desc">{r.description}</div>

                <div style={{ marginTop:10 }}>
                  {(r.pages || []).slice(0,6).map(pk => <span key={pk} className="page-chip">{pk}</span>)}
                </div>
              </div>

              <div className="card-actions">
                <button className="btn" onClick={() => openEdit(r)}>Edit</button>
                <button className="btn" onClick={() => confirmDelete(r.id)} style={{ background: "linear-gradient(180deg,#e74c3c,#c0392b)", color: "white", borderRadius: 8 }}>Delete</button>
              </div>
            </article>
          ))}

          {filtered.length === 0 && <div style={{ color:"#6f5f4f" }}>No roles found.</div>}
        </div>
      )}

      {/* modal */}
      {show && (
        <div style={{ position:"fixed", inset:0, background:"rgba(8,6,4,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:120 }}>
          <div style={{ width:840, maxWidth:"96%", background:"linear-gradient(180deg,#fff,#fffdf8)", padding:18, borderRadius:12 }}>
            <h3 style={{ marginTop:0 }}>{form.id ? "Edit Role" : "Add Role"}</h3>
            <form onSubmit={save} style={{ display:"grid", gap:10 }}>
              <div style={{ display:"flex", gap:12 }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:13, color:"#6b5a46" }}>Name
                    <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} style={{ width:"100%", padding:8, borderRadius:8, border:"1px solid rgba(0,0,0,0.06)" }} />
                  </label>
                </div>
                <div style={{ flex:2 }}>
                  <label style={{ fontSize:13, color:"#6b5a46" }}>Description
                    <input value={form.description || ""} onChange={(e) => setForm({...form, description: e.target.value})} style={{ width:"100%", padding:8, borderRadius:8, border:"1px solid rgba(0,0,0,0.06)" }} />
                  </label>
                </div>
              </div>

              <div>
                <div style={{ fontWeight:800, marginBottom:8 }}>Assign Pages</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {pages.map(p => (
                    <label key={p.key} style={{ display:"flex", gap:8, alignItems:"center", padding:"6px 8px", borderRadius:8, background: (form.pages||[]).includes(p.key) ? "linear-gradient(90deg,#f1c232,#f2d47a)" : "#fff", border:"1px solid rgba(0,0,0,0.04)", cursor:"pointer" }}>
                      <input type="checkbox" checked={(form.pages||[]).includes(p.key)} onChange={() => togglePage(p.key)} />
                      <div style={{ fontWeight:700 }}>{p.title}</div>
                      <div style={{ color:"#6f5f4f", fontSize:12, marginLeft:6 }}>{p.key}</div>
                    </label>
                  ))}
                  {pages.length === 0 && <div style={{ color:"#6f5f4f" }}>No pages found.</div>}
                </div>
              </div>

              <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
                <button type="button" className="btn" onClick={() => setShow(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
