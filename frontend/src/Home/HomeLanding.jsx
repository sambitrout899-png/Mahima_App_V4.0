import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { canAccessPage, getCurrentUser } from '../features/auth/permissionService';
import { getToken } from '../features/auth/authService';
import axios from 'axios';

export default function Landing(){
  const navigate = useNavigate();
  const rootRef = useRef(null);

  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [user, setUser] = useState(null);
  const [showTestimony, setShowTestimony] = useState(false);

  /* ============ DEBUG: mount + environment ============ */
  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current += 1;
    const ts = new Date().toISOString();
    console.log(
      '%c[HomeLanding] render',
      'background:#0ea5e9;color:#fff;padding:2px 6px;border-radius:4px',
      { ts, renderCount: renderCount.current, url: import.meta.url, loc: window.location.href }
    );
  });

  useEffect(() => {
    const ts = new Date().toISOString();
    console.log(
      '%c[HomeLanding] mounted',
      'background:#10b981;color:#fff;padding:2px 6px;border-radius:4px',
      { ts, url: import.meta.url, hash: window.location.hash }
    );

    // Is the poster reachable?
    fetch('/assets/glory-to-grace.jpg', { method: 'HEAD' })
      .then(r => console.log('[HomeLanding] poster HEAD', r.status, r.ok))
      .catch(e => console.log('[HomeLanding] poster HEAD error', e));

    // Show a visible debug badge on the page
    const badge = document.createElement('div');
    badge.id = 'hl-debug';
    badge.textContent = 'HomeLanding mounted';
    Object.assign(badge.style, {
      position: 'fixed', bottom: '10px', left: '10px', zIndex: 9999,
      background: '#111827', color: '#fff', padding: '6px 10px',
      borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 14px rgba(0,0,0,.2)'
    });
    document.body.appendChild(badge);

    return () => { badge.remove(); };
  }, []);

  /* ============ DEBUG: intercept About clicks inside this component ============ */
  useEffect(() => {
    const host = rootRef.current;
    if (!host) return;

    function onClick(e){
      const el = e.target.closest('a,button');
      if (!el || !host.contains(el)) return;
      const text = (el.textContent || '').trim().toLowerCase();
      const href = (el.getAttribute?.('href') || '').toLowerCase();

      if (text === 'about' || href.includes('/about') || href.includes('#/about')) {
        console.log('%c[HomeLanding] ABOUT click intercepted', 'background:#f59e0b;color:#111;padding:2px 6px;border-radius:4px', { text, href, el });
        e.preventDefault();
        e.stopPropagation();
        setShowTestimony(true);
      }
    }

    host.addEventListener('click', onClick, true);
    return () => host.removeEventListener('click', onClick, true);
  }, []);

  /* ===== your existing effects ===== */
  useEffect(() => {
    try { const u = getCurrentUser(); setUser(u); } catch { setUser(null); }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function fetchTasks(){
      setLoadingTasks(true);
      try{
        const token = typeof getToken === 'function' ? getToken() : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get('/tasks/calendar', { headers });
        if (!mounted) return;
        setTasks(Array.isArray(res.data) ? res.data : []);
      }catch(err){
        console.error('Failed to load calendar tasks', err);
        if (mounted) setTasks([]);
      }finally{
        if (mounted) setLoadingTasks(false);
      }
    }
    fetchTasks();
    return () => { mounted = false; };
  }, []);

  function handleWatchSermons(){
    try{
      const allowed = typeof canAccessPage === 'function' ? canAccessPage('resources') : false;
      navigate(allowed ? '/resources' : '/access-denied');
    }catch(err){
      console.error('permission check failed', err);
      navigate('/access-denied');
    }
  }

  function handleRequestPrayer(){ navigate('/prayer-requests'); }
  function formatDate(d){ try { return new Date(d).toLocaleString(); } catch { return d; } }

  return (
    <div ref={rootRef} className="max-w-5xl mx-auto" data-component="HomeLanding">
      {/* TEMP: visual border so you can see this component really renders */}
      <style>{`[data-component="HomeLanding"]{ outline: 2px dashed #0ea5e9; outline-offset: 6px; }`}</style>

      <img src="/logo.png" alt="Mahima Ministry" className="mx-auto w-40 my-6" />

      {/* Hero */}
      <div className="bg-white rounded-lg p-8 shadow-lg flex flex-col md:flex-row items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Mahima</h1>
          <p className="text-gray-600 mb-4">
            A modern admin UI for your Mahima API — manage users, teams and meetings.
          </p>

          <div className="flex gap-3 mb-3 flex-wrap">
            <button onClick={handleWatchSermons} className="px-4 py-2 bg-indigo-600 text-white rounded">
              Watch Sermons
            </button>
            <button onClick={handleRequestPrayer} className="px-4 py-2 border rounded">
              Request a Prayer
            </button>
            <button
              onClick={() => { console.log('[HomeLanding] Testimony button clicked'); setShowTestimony(true); }}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Testimony
            </button>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Link to="/users" className="px-4 py-2 bg-indigo-600 text-white rounded">Manage Users</Link>
            <Link to="/teams" className="px-4 py-2 border rounded">Manage Teams</Link>
          </div>
        </div>

        <div className="flex-1 text-center" />
      </div>

      {/* Info + Upcoming */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Night Prayer</h3>
          <p className="text-sm text-gray-600">Night Prayer — every Friday 10:30 pm onwards</p>
          <div className="mt-3">
            <h4 className="font-medium">Contact</h4>
            <p className="text-sm text-gray-600">
              Tel: <a href="tel:+918971124659" className="underline">+91 89711 24659</a> /{' '}
              <a href="tel:+917743048757" className="underline">+91 77430 48757</a>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Extendable</h3>
          <p className="text-sm text-gray-600">Replace the api/* clients to point at your backend.</p>
        </div>

        <aside className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Upcoming events</h3>
          {loadingTasks ? (
            <p className="text-sm text-gray-500">Loading events...</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-gray-500">No upcoming events found.</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.id} className="p-2 border rounded">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{t.title || t.name || 'Untitled'}</div>
                      {t.description ? (
                        <div className="text-sm text-gray-600 break-words">{t.description}</div>
                      ) : null}
                    </div>
                    <div className="text-sm text-gray-500 shrink-0 whitespace-nowrap">
                      {formatDate(t.startDate || t.start)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>

      {/* Testimony Modal */}
      {showTestimony && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowTestimony(false)}
          role="dialog" aria-modal="true" aria-label="From Glory to Grace"
        >
          <div
            className="relative max-w-3xl w-full bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src="/assets/glory-to-grace.jpg"
              alt="From Glory to Grace — Pastor Sam Masih"
              className="block w-full h-auto object-cover"
              loading="eager"
              onError={(e)=>console.log('[HomeLanding] poster <img> onError', e)}
              onLoad={()=>console.log('[HomeLanding] poster <img> onLoad')}
            />
            <div className="flex justify-end border-t p-3 bg-gray-50">
              <button
                onClick={() => setShowTestimony(false)}
                className="px-4 py-2 bg-gray-900 text-white rounded"
              >
                Close
              </button>
            </div>
            <button
              onClick={() => setShowTestimony(false)}
              className="absolute -top-3 -right-3 rounded-full bg-white p-2 shadow border"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
