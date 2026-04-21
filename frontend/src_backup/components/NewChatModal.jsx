// src/components/NewChatModal.jsx
import React, { useEffect, useState } from "react";
import { getToken } from "../utils/auth";

export default function NewChatModal({ open = false, onClose = () => {}, onCreate = async () => {} }) {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const token = getToken();
  const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");

  async function loadUsers() {
    setLoadingUsers(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/users`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      if (!res.ok) {
        console.error("loadUsers failed", res.status);
        setUsers([]);
        setError("Failed to load users");
        return;
      }
      const json = await res.json();
      const list = json.items || json.data || json || [];
      setUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError("Failed to load users");
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    if (open) loadUsers();
  }, [open]);

  const filtered = users.filter((u) =>
    (u.displayName || u.username || u.name || "").toLowerCase().includes(q.trim().toLowerCase())
  );

  // extract a usable username/email (server expects usernameOrEmail)
  function extractUsernameOrEmail(u) {
    if (!u) return null;
    // common fields
    if (u.username) return u.username;
    if (u.userName) return u.userName;
    if (u.email) return u.email;
    if (u.userNameOrEmail) return u.userNameOrEmail;
    if (u.phone) return u.phone; // maybe your server accepts phone
    // last resort: try id (may not be accepted by server)
    return u.id ?? u.userId ?? u._id ?? u.uuid ?? null;
  }

  async function startChat(user) {
    if (!user) return;
    setError(null);
    const usernameOrEmail = extractUsernameOrEmail(user);
    if (!usernameOrEmail) {
      setError("Selected user has no username or email (cannot start chat).");
      return;
    }

    setCreating(true);
    try {
      // very important: server expects { usernameOrEmail: "..." }
      // parent will call POST /chats and return created chat object (or throw)
      await onCreate({ usernameOrEmail });
      setCreating(false);
      onClose();
    } catch (err) {
      console.error("createChat failed", err);
      // show readable server message if present
      let msg = "Failed to create chat";
      try {
        // some callers throw Error with message being the raw response
        if (err && typeof err === "string") msg = err;
        else if (err?.message) msg = err.message;
        else if (err?.toString) msg = String(err);
      } catch {}
      setError(msg);
      setCreating(false);
    }
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.35)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
      }}
      onClick={() => { if (!creating) onClose(); }}
    >
      <div
        style={{
          width: "420px",
          background: "#fff",
          borderRadius: "8px",
          overflow: "hidden",
          maxHeight: "80vh",
          boxShadow: "0 8px 30px rgba(0,0,0,.18)",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Start new chat"
      >
        <div style={{ padding: "12px 16px", background: "#048c6c", color: "#fff", fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>New Chat</div>
          <button
            onClick={() => { if (!creating) onClose(); }}
            style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: 20 }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ padding: "12px 16px", maxHeight: "64vh", overflow: "auto" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search users..."
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #e6e6e6",
              borderRadius: 8,
              marginBottom: 12,
              boxSizing: "border-box",
            }}
            disabled={loadingUsers || creating}
            aria-label="Search users"
          />

          {loadingUsers && <div style={{ color: "#666", padding: "8px 0" }}>Loading users…</div>}
          {error && <div style={{ color: "crimson", padding: "8px 0" }}>{error}</div>}

          {!loadingUsers && filtered.length === 0 && (
            <div style={{ color: "#777", padding: "12px 0" }}>No users found</div>
          )}

          {filtered.map((u) => {
            const id = u.id ?? u.userId ?? u._id ?? u.uuid ?? (u.username ?? Math.random().toString(36).slice(2,8));
            const display = u.displayName ?? u.name ?? u.username ?? id;
            const secondary = u.email ?? u.role ?? "";
            return (
              <div
                key={id}
                onClick={() => !creating && startChat(u)}
                style={{
                  padding: "10px 8px",
                  cursor: creating ? "not-allowed" : "pointer",
                  borderBottom: "1px solid #f3f3f3",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  opacity: creating ? 0.85 : 1,
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") !creating && startChat(u); }}
                aria-label={`Start chat with ${display}`}
              >
                <div style={{ width: 44, height: 44, borderRadius: 22, background: "#f2f2f2", display: "grid", placeItems: "center", fontWeight: 700 }}>
                  {(display || "?").slice(0,2).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{display}</div>
                  <div style={{ fontSize: ".85rem", color: "#666" }}>{secondary}</div>
                </div>

                <div style={{ marginLeft: "auto", color: "#888", fontSize: ".85rem" }}>{u.status ?? ""}</div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "8px 12px", textAlign: "right", borderTop: "1px solid #f3f3f3" }}>
          <button
            onClick={() => { if (!creating) onClose(); }}
            style={{ marginRight: 8, padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", cursor: creating ? "not-allowed" : "pointer" }}
            disabled={creating}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const first = filtered[0];
              if (first && !creating) startChat(first);
            }}
            style={{ padding: "8px 12px", borderRadius: 6, border: "none", background: "#048c6c", color: "#fff", cursor: creating ? "not-allowed" : "pointer" }}
            disabled={creating || filtered.length === 0}
          >
            {creating ? "Creating…" : "Start Chat"}
          </button>
        </div>
      </div>
    </div>
  );
}
