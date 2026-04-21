// src/components/ChatWindow.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { getToken } from "../utils/auth";

/* ------------------------------- styles ------------------------------- */
const injectCWStyles = () => {
  if (document.getElementById("chatwindow-styles")) return;
  const css = `
  :root{
    --cw-bg:#ffffff;--cw-surface:#f3f4f6;--cw-me:#dbeafe;--cw-them:#ffffff;--cw-border:rgba(0,0,0,.08);
    --cw-text:#0f172a;--cw-dim:#6b7280;--cw-primary:#2d6cdf;
  }
  .cw-wrap{display:flex;flex-direction:column;height:100%;background:var(--cw-bg);} 
  .cw-head{position:sticky;top:0;background:#fff;border-bottom:1px solid var(--cw-border);z-index:3}
  .cw-head-row{display:flex;align-items:center;gap:.5rem;padding:.6rem .75rem}
  .cw-title{margin:0;font-size:1rem;font-weight:800;color:var(--cw-text)}
  .cw-sub{font-size:.8rem;color:var(--cw-dim)}
  .cw-actions{margin-left:auto;display:flex;gap:.35rem}
  .cw-body{flex:1;overflow:auto;background:var(--cw-surface);padding:.75rem;scroll-behavior:smooth}
  .cw-row{display:flex;gap:.5rem;margin:.25rem 0;align-items:flex-end}
  .cw-row.me{justify-content:flex-end}
  .cw-bubble{max-width:82%;padding:.55rem .7rem;border-radius:14px;border:1px solid var(--cw-border);background:var(--cw-them);color:var(--cw-text)}
  .cw-row.me .cw-bubble{background:var(--cw-me)}
  .cw-meta{display:flex;gap:.35rem;align-items:center;margin-top:2px;color:var(--cw-dim);font-size:.72rem}
  .cw-inputbar{position:sticky;bottom:0;background:#fff;border-top:1px solid var(--cw-border);padding:.55rem .6rem;display:grid;grid-template-columns:auto 1fr auto;gap:.45rem;align-items:end}
  .cw-textarea{width:100%;min-height:42px;max-height:140px;resize:none;border:1px solid var(--cw-border);border-radius:14px;padding:.55rem .7rem;outline:none}
  .cw-send{appearance:none;border:none;border-radius:14px;background:var(--cw-primary);color:#fff;padding:.6rem .9rem;cursor:pointer}
  `;
  const style = document.createElement("style");
  style.id = "chatwindow-styles";
  style.innerHTML = css;
  document.head.appendChild(style);
};

/* ----------------------------- helpers -------------------------------- */
function useAutoScroll(dep) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight + 9999;
    }
  }, [dep]);
  return ref;
}

const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");

const normalizeMessage = (m) => ({
  id: m.id ?? m.messageId ?? m._id ?? crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
  chatId: m.chatId ?? m.ChatId ?? m.chatID,
  senderId: m.senderId ?? m.fromUserId ?? m.userId ?? (m.sender && (m.sender.id ?? m.sender.userId)) ?? null,
  text: m.text ?? m.content ?? m.body ?? "",
  createdAt: m.createdAt ?? m.sentAt ?? m.timestamp ?? new Date().toISOString(),
  attachments: Array.isArray(m.attachments) ? m.attachments : [],
  status: m.status ?? "sent",
});

/* ---------------------------- component ------------------------------- */
export default function ChatWindow({
  chat,
  connection,
  isConnected,
  currentUserId,
  usersMap = {},
  onMessageCreated = () => {},
  onBack = () => {},
}) {
  injectCWStyles();

  // normalized current user id (string)
  const meId = useMemo(() => {
    if (currentUserId) return String(currentUserId);
    try {
      const raw = localStorage.getItem("current_user") || localStorage.getItem("user") || localStorage.getItem("me");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.id ? String(parsed.id) : null;
    } catch {
      return null;
    }
  }, [currentUserId]);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(false);

  const bodyRef = useAutoScroll(messages.length);

  /* ------------------------------- load history ------------------------------ */
  useEffect(() => {
    let abort = false;
    async function loadHistory() {
      if (!chat?.id) {
        setMessages([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/chats/${chat.id}/messages?take=50`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${getToken() || ""}`,
          },
          credentials: "include",
        });
        const txt = await res.text();
        let data;
        try {
          data = JSON.parse(txt);
        } catch {
          data = [];
        }
        const list = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
        const normalized = list.map(normalizeMessage);
        if (!abort) setMessages(normalized);
      } catch (e) {
        if (!abort) setMessages([]);
        console.warn("[ChatWindow] loadHistory failed", e);
      } finally {
        if (!abort) setLoading(false);
      }
    }
    loadHistory();
    return () => {
      abort = true;
    };
  }, [chat?.id]);

  /* ----------------------------- signalR handlers ---------------------------- */
  useEffect(() => {
    if (!connection) return;

    const onReceive = (msg) => {
      const n = normalizeMessage(msg);
      if (String(n.chatId) !== String(chat?.id)) return;
      setMessages((prev) => [...prev, n]);
    };

    const onTyping = (payload) => {
      const cid = payload?.chatId ?? payload?.ChatId;
      if (String(cid) !== String(chat?.id)) return;
      setTyping(true);
      setTimeout(() => setTyping(false), 1200);
    };

    connection.on("ReceiveMessage", onReceive);
    connection.on("UserTyping", onTyping);

    return () => {
      connection.off && connection.off("ReceiveMessage", onReceive);
      connection.off && connection.off("UserTyping", onTyping);
    };
  }, [connection, chat?.id]);

  /* ------------------------------ sendText -------------------------------- */
  async function sendText() {
    const trimmed = text.trim();
    if (!chat?.id || (!trimmed)) return;

    const now = new Date().toISOString();
    const draft = {
      id: Math.random().toString(36).slice(2),
      chatId: chat.id,
      senderId: meId || "me",
      text: trimmed,
      createdAt: now,
      status: "sending",
      attachments: [],
    };

    setMessages((prev) => [...prev, draft]);
    setText("");

    const attachments = draft.attachments;

    // try SignalR hub (include both text and content keys)
    try {
      if (connection?.invoke) {
        const payload = { chatId: chat.id, text: trimmed, content: trimmed, attachments };
        // attempt common method name
        await connection.invoke("SendMessage", payload).catch(async (err) => {
          // try discrete args if object signature fails
          return connection.invoke("SendMessage", chat.id, trimmed, attachments);
        });
        onMessageCreated({ ...draft, status: "sent" });
        setMessages((prev) => prev.map((m) => (m.id === draft.id ? { ...m, status: "sent" } : m)));
        return;
      }
      throw new Error("No SignalR connection");
    } catch (err) {
      console.warn("[ChatWindow] SignalR send failed, falling back to HTTP", err);
    }

    // HTTP fallback — include Content (capital C) plus text/content for compatibility
    try {
      const token = getToken() || localStorage.getItem("token") || localStorage.getItem("auth_token") || "";
      const body = { Content: trimmed, content: trimmed, text: trimmed, attachments };
      const res = await fetch(`${API_BASE}/chats/${chat.id}/messages`, {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, token ? { Authorization: `Bearer ${token}` } : {}),
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let errText = "";
        try { errText = await res.text(); } catch {}
        setMessages((prev) => prev.map((m) => (m.id === draft.id ? { ...m, status: "failed" } : m)));
        alert(`Failed to send message${errText ? ": " + errText : ""}`);
        return;
      }
      setMessages((prev) => prev.map((m) => (m.id === draft.id ? { ...m, status: "sent" } : m)));
      const json = await res.json().catch(() => null);
      onMessageCreated({ ...draft, status: "sent", serverResponse: json });
    } catch (e) {
      console.error("[ChatWindow] send fallback failed", e);
      setMessages((prev) => prev.map((m) => (m.id === draft.id ? { ...m, status: "failed" } : m)));
      alert("Failed to send message (network error). See console for details.");
    }
  }

  /* --------------------------- title resolution --------------------------- */
  const derivedTitle = useMemo(() => {
    if (!chat) return "Conversation";

    // helper: get my display name if available
    const myName = usersMap?.[String(meId)]?.displayName || usersMap?.[String(meId)]?.name || null;

    // 1) explicit chat name — but ignore it when it equals current user's name (server bug)
    if (chat.name && String(chat.name).trim()) {
      const candidate = String(chat.name).trim();
      if (!(myName && candidate === myName)) {
        return candidate;
      }
      // else fallthrough when chat.name === myName
    }

    // 2) prefer lastMessage sender name if last message sent by someone else
    const lm = chat.lastMessage ?? chat.last_message ?? chat.last ?? (messages.length ? messages[messages.length - 1] : null);
    if (lm) {
      const lmSenderId = lm.senderId ?? lm.fromUserId ?? lm.userId ?? (lm.sender && (lm.sender.id ?? lm.sender.userId)) ?? null;
      const lmSenderName = lm.senderName ?? lm.fromName ?? lm.sender?.displayName ?? lm.sender?.name ?? null;
      if (lmSenderId && String(lmSenderId) !== String(meId)) {
        if (lmSenderName) return lmSenderName;
        const u = usersMap?.[String(lmSenderId)];
        if (u) return u.displayName || u.name || u.username || String(lmSenderId);
        return String(lmSenderId);
      }
      // if senderId is me but senderName exists and is different than myName, still consider it
      if (lmSenderName && !(myName && lmSenderName === myName)) {
        return lmSenderName;
      }
    }

    // 3) other participant via chat.otherId or members/participants
    const otherId = chat.otherId ?? null;
    if (otherId) {
      const u = usersMap?.[String(otherId)];
      if (u) return u.displayName || u.name || u.username || String(otherId);
      return String(otherId);
    }

    const members = chat.members ?? chat.participants ?? chat.users ?? [];
    if (Array.isArray(members) && members.length > 0) {
      // find the first member that's not me
      for (const m of members) {
        if (!m) continue;
        if (typeof m === "string") {
          if (String(m) !== String(meId)) {
            const u = usersMap?.[String(m)];
            if (u) return u.displayName || u.name || u.username || String(m);
            return String(m);
          }
        } else {
          const id = m.id ?? m.userId ?? m._id ?? m.uuid ?? null;
          if (id && String(id) !== String(meId)) {
            const u = usersMap?.[String(id)];
            if (u) return u.displayName || u.name || u.username || String(id);
            return m.displayName || m.name || m.username || String(id);
          }
        }
      }
    }

    // 4) last resort: use chat.title or 'Conversation'
    return chat.title ?? "Conversation";
  }, [chat, messages, usersMap, meId]);

  /* ------------------------------ render --------------------------------- */
  return (
    <div className="cw-wrap" role="main" aria-label="Chat window">
      <div className="cw-head">
        <div className="cw-head-row">
          <button className="cw-iconbtn" title="Back" onClick={onBack} style={{ marginRight: 8 }}>
            ←
          </button>
          <div>
            <div className="cw-title">{derivedTitle}</div>
            <div className="cw-sub">{isConnected ? "Online" : "Connecting…"} {loading ? "· Loading…" : ""}</div>
          </div>
          <div className="cw-actions" />
        </div>
      </div>

      <div ref={bodyRef} className="cw-body">
        {messages.map((m) => {
          const mine = meId ? String(m.senderId) === String(meId) : (m.senderId ?? "me") === "me";
          return (
            <div key={m.id || m.createdAt} className={`cw-row ${mine ? "me" : ""}`}>
              <div className="cw-bubble" aria-live="polite">
                {m.text && <div>{m.text}</div>}
                <div className="cw-meta">
                  <span>
                    {new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {mine && <span>{m.status === "sent" ? "✓✓" : m.status === "failed" ? "✕" : "…"}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {typing && <div className="cw-typing">Typing…</div>}

      <div className="cw-inputbar">
        <textarea
          className="cw-textarea"
          placeholder="Type a message"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            try { connection?.send?.("Typing", { chatId: chat?.id }); } catch {}
          }}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendText();
            }
          }}
        />
        <button className="cw-send" onClick={sendText} disabled={!text.trim()}>
          ➤
        </button>
      </div>
    </div>
  );
}
