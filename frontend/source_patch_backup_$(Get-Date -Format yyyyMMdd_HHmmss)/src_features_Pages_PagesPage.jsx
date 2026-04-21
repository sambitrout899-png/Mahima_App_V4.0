// src/features/pages/PagesPage.jsx
import React, { useEffect, useState } from "react";
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001/api";

function IconPage() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function PagesPage() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ key: "", title: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/pages`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setPages(json.items || []);
    } catch (err) {
      console.error("load pages error", err);
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ key: "", title: "", description: "" }); setShow(true); };
  const openEdit = (p) => { setForm({ key: p.key, title: p.title, description: p.description || "" }); setShow(true); };

  const save = async (e) => {
    e?.preventDefault?.();
    if (!form.key || !form.title) return alert("Key and Title required.");
    setSaving(true);
    try {
      const isNew = !(pages.find(px => px.key === form.key));
      const url = isNew ? `${API_BASE}/pages` : `${API_BASE}/pages/${encodeURIComponent(form.key)}`;
      const method = isNew ? "POST" : "PUT";
      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Key: form.key, Title: form.title, Description: form.description })
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(txt || `HTTP ${resp.status}`);
      }
      setShow(false);
      await load();
    } catch (err) {
      alert("Save failed: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const del = async (key) => {
    if (!window.confirm("Delete page?")) return;
    try {
      const resp = await fetch(`${API_BASE}/pages/${encodeURIComponent(key)}`, { method: "DELETE" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      await load();
    } catch (err) {
      alert("Delete failed: " + (err?.message || err));
    }
  };

  const filtered = pages.filter(p => {
    if (!query) return true;
    const s = query.toLowerCase();
    return `${p.title} ${p.key} ${p.description || ""}`.toLowerCase().includes(s);
  });

  return (
    <div className="pages-wrap">
      <style>{`
        .pages-wrap { padding: 18px; }
        .pages-header { display:flex; align-items:center; gap:12px; margin-bottom:18px; }
        .pages-title { font-size:20px; font-weight:800; }
        .pages-actions { margin-left:auto; display:flex; gap:8px; align-items:center; }
        .btn { border: none; padding: 8px 12px; border-radius:10px; cursor:pointer; font-weight:700;}
        .btn-primary { background: linear-gradient(90deg,#f1c232,#f2d47a); color:#2f2b27; box-shadow:0 6px 18px rgba(241,194,50,0.12); }
        .btn-muted { background: #fff; border:1px solid rgba(0,0,0,0.06); }
        .search { padding:8px 12px; border-radius:10px; border:1px solid rgba(0,0,0,0.06); width:320px; }
        .grid { display:grid; gap:12px; margin-top:14px; }
        .page-card { display:flex; gap:12px; align-items:flex-start; padding:14px; border-radius:12px; background: white; box-shadow: 0 8px 24px rgba(18,14,10,0.04); border:1px solid rgba(0,0,0,0.03); }
        .page-meta { flex:1; }
        .page-title { font-weight:800; font-size:16px; display:flex; gap:8px; align-items:center; }
        .page-key { color:#6f5f4f; font-size:13px; font-weight:700; background: linear-gradient(180deg,#fff7e6,#fff0d6); padding:6px 8px; border-radius:8px; }
        .page-desc { color:#6b5a46; margin-top:8px; }
        .card-actions { display:flex; gap:8px; align-items:center; }
        .chip { display:inline-flex; gap:8px; align-items:center; padding:6px 10px; border-radius:999px; background:#f6f3ee; font-weight:700; font-size:13px; color:#7a5f3f; margin-right:6px; }
        @media (max-width:880px){ .search{width:160px} .pages-header{flex-direction:column;align-items:flex-start} .pages-actions{margin-left:0} }
      `}</style>

      <div className="pages-header" role="region" aria-label="Pages header">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 48, height: 48, background: "linear-gradient(180deg,#fff,#fffdf8)", borderRadius: 12, display: "grid", placeItems: "center", boxShadow: "0 6px 18px rgba(0,0,0,0.04)" }}>
            <IconPage />
          </div>
          <div>
            <div className="pages-title">Pages</div>
            <div style={{ color: "#6f5f4f", fontSize: 13, marginTop: 6 }}>Manage which pages exist in the application and their descriptions.</div>
          </div>
        </div>

        <div className="pages-actions">
          <input className="search" placeholder="Search pages..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="btn btn-muted" onClick={() => load()}>Refresh</button>
          <button className="btn btn-primary" onClick={openAdd}>Add Page</button>
        </div>
      </div>

      {loading ? <div style={{ color: "#6f5f4f" }}>Loading pages…</div> : (
        <div className="grid" role="list">
          {filtered.map(p => (
            <article className="page-card" key={p.key} role="listitem" aria-labelledby={`page-${p.key}`}>
              <div style={{ width:56, height:56, borderRadius:10, background:"#fffaf6", display:"grid", placeItems:"center", fontWeight:800, color:"#7a5f3f" }} aria-hidden>
                <IconPage />
              </div>

              <div className="page-meta">
                <div className="page-title"><span id={`page-${p.key}`}>{p.title}</span> <span style={{ marginLeft:6 }} className="page-key">({p.key})</span></div>
                <div className="page-desc">{p.description}</div>
                <div style={{ marginTop:10 }}>
                  {/* Example of tags/chips (placeholders if you want to show related info) */}
                  <span className="chip">Page</span>
                </div>
              </div>

              <div className="card-actions" style={{ marginLeft: 12 }}>
                <button className="btn btn-muted" onClick={() => openEdit(p)}>Edit</button>
                <button className="btn" onClick={() => del(p.key)} style={{ background: "linear-gradient(180deg,#e74c3c,#c0392b)", color: "white", borderRadius: 8 }}>Delete</button>
              </div>
            </article>
          ))}

          {filtered.length === 0 && <div style={{ color: "#6f5f4f" }}>No pages match your search.</div>}
        </div>
      )}

      {/* modal */}
      {show && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(8,6,4,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120 }}>
          <div style={{ width: 720, maxWidth: "96%", background: "linear-gradient(180deg,#fff,#fffdf8)", padding: 18, borderRadius: 12 }}>
            <h3 style={{ marginTop: 0 }}>{form.key ? "Edit Page" : "Add Page"}</h3>
            <form onSubmit={save} style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, color: "#6b5a46" }}>Key
                    <input value={form.key} onChange={(e) => setForm({...form, key: e.target.value})} disabled={!!form.key} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)" }} />
                  </label>
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: 13, color: "#6b5a46" }}>Title
                    <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)" }} />
                  </label>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, color: "#6b5a46" }}>Description
                  <input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)" }} />
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="btn btn-muted" onClick={() => setShow(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
