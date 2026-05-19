// src/components/chat/NewChatModal.jsx
//
// Modern "Start a chat" modal for Jai Masih.
// - Lucide icons, Tailwind, no inline-style soup
// - Avatar + secondary line for each user
// - Search filters on display name, username, email
// - Esc to close, click-outside to close
// - Disabled "Start" button while creating
//
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Loader2, MessageSquarePlus, AlertCircle } from "lucide-react";
import { getToken } from "../utils/auth";
import { API_BASE } from "../api";

const colorFromId = (id) => {
  const palette = [
    "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6",
    "#ec4899", "#f97316", "#f59e0b", "#84cc16",
  ];
  let h = 0;
  const s = String(id || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};

const initialsFrom = (n = "?") =>
  String(n || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

function itemsFrom(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.records)) return data.records;
  return [];
}

function totalFrom(data, fallback = null) {
  const total = data?.total ?? data?.Total ?? data?.count ?? data?.Count;
  const parsed = Number(total);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function NewChatModal({
  open = false,
  onClose = () => {},
  onCreate = async () => {},
  currentUserId = null,
}) {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  /* load users when opening */
  useEffect(() => {
    if (!open) return;
    setQ("");
    setError(null);
    setCreating(false);
    let cancelled = false;
    (async () => {
      setLoadingUsers(true);
      try {
        const token = getToken();
        const headers = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const pageSize = 500;
        let page = 1;
        let total = null;
        const allUsers = [];
        const contactUrl = (p) => `${API_BASE}/chats/contacts?page=${p}&limit=${pageSize}`;
        const usersUrl = (p) => `${API_BASE}/users?page=${p}&limit=${pageSize}`;
        let source = "contacts";

        while (!cancelled) {
          let res = await fetch(source === "contacts" ? contactUrl(page) : usersUrl(page), { headers });
          if (!res.ok && source === "contacts") {
            source = "users";
            page = 1;
            total = null;
            allUsers.length = 0;
            res = await fetch(usersUrl(page), { headers });
          }
          if (!res.ok) {
            if (!cancelled) {
              setError(`Failed to load users (${res.status})`);
              setUsers([]);
            }
            return;
          }

          const json = await res.json();
          const pageItems = itemsFrom(json);
          allUsers.push(...pageItems);
          total = totalFrom(json, total);

          if (pageItems.length < pageSize || (total != null && allUsers.length >= total)) break;
          page += 1;
        }

        if (!cancelled) setUsers(allUsers);
      } catch (err) {
        console.error("Failed to load users:", err);
        if (!cancelled) {
          setError("Failed to load users");
          setUsers([]);
        }
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    })();
    // focus search shortly after the modal renders
    setTimeout(() => inputRef.current?.focus(), 50);
    return () => { cancelled = true; };
  }, [open]);

  /* esc to close */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape" && !creating) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, creating, onClose]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return users
      .filter((u) => {
        const id = u.id ?? u.userId ?? u._id ?? u.uuid;
        if (currentUserId && String(id) === String(currentUserId)) return false;
        if (!t) return true;
        const hay = [
          u.displayName, u.name, u.username, u.userName,
          u.email, u.role,
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(t);
      });
  }, [users, q, currentUserId]);

  function extractUsernameOrEmail(u) {
    return u?.username
      || u?.userName
      || u?.email
      || u?.userNameOrEmail
      || u?.phone
      || u?.id
      || u?.userId
      || u?._id
      || u?.uuid
      || null;
  }

  function extractUserId(u) {
    return u?.id || u?.userId || u?._id || u?.uuid || null;
  }

  async function startChat(user) {
    if (!user || creating) return;
    setError(null);
    const userId = extractUserId(user);
    const usernameOrEmail = extractUsernameOrEmail(user);
    if (!userId && !usernameOrEmail) {
      setError("Selected user has no id, username, or email.");
      return;
    }
    setCreating(true);
    try {
      await onCreate({ userId, usernameOrEmail });
      onClose();
    } catch (err) {
      let msg = "Failed to create chat";
      if (typeof err === "string") msg = err;
      else if (err?.message) msg = err.message;
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
         onClick={() => { if (!creating) onClose(); }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[88vh]"
           onClick={(e) => e.stopPropagation()}
           role="dialog" aria-modal="true" aria-label="Start a new chat">
        {/* Header */}
        <div className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5" />
            <h3 className="text-base font-semibold">New chat</h3>
          </div>
          <button
            onClick={() => { if (!creating) onClose(); }}
            className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search users by name, username, or email"
              disabled={loadingUsers || creating}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-3 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingUsers && (
            <div className="px-4 py-6 flex items-center justify-center text-sm text-slate-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading users...
            </div>
          )}
          {!loadingUsers && filtered.length === 0 && !error && (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              {q ? `No users match "${q}".` : "No users found."}
            </div>
          )}
          {filtered.map((u) => {
            const id = u.id ?? u.userId ?? u._id ?? u.uuid ?? u.username;
            const display = u.displayName ?? u.name ?? u.username ?? id;
            const secondary = u.email ?? u.username ?? u.role ?? "";
            return (
              <button
                key={id}
                onClick={() => startChat(u)}
                disabled={creating}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50/60 disabled:opacity-50 disabled:cursor-not-allowed border-b border-slate-100 last:border-0 text-left transition"
              >
                <div className="w-11 h-11 rounded-full text-white font-semibold flex items-center justify-center shadow-sm shrink-0"
                     style={{ background: colorFromId(id) }}>
                  {initialsFrom(display)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 truncate">{display}</div>
                  {secondary && (
                    <div className="text-xs text-slate-500 truncate">{secondary}</div>
                  )}
                </div>
                {u.role && (
                  <span className="text-[10px] uppercase tracking-wider font-semibold rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">
                    {u.role}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-between items-center">
          <span className="text-[11px] text-slate-500">
            {filtered.length} user{filtered.length === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => { if (!creating) onClose(); }}
              disabled={creating}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => filtered[0] && startChat(filtered[0])}
              disabled={creating || filtered.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Start chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
