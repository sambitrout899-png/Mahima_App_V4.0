// src/components/ChatList.jsx
import React, { useMemo, useState } from "react";

/* --- styles (same as before) --- */
const injectStyles = () => {
  if (document.getElementById("chatlist-styles")) return;
  const css = `
  :root{--cl-bg:#ffffff;--cl-surface:#f7f7f8;--cl-card:#ffffff;--cl-border:rgba(0,0,0,.08);--cl-text:#0f172a;--cl-dim:#6b7280;--cl-primary:#2d6cdf;}
  .cl-wrap{display:flex;flex-direction:column;height:100%;background:var(--cl-bg);}
  .cl-head{position:sticky;top:0;background:var(--cl-bg);z-index:2;border-bottom:1px solid var(--cl-border);}
  .cl-head-row{display:flex;align-items:center;gap:.5rem;padding:.75rem .75rem;}
  .cl-title{margin:0;font-size:1.125rem;font-weight:700;color:var(--cl-text);}
  .cl-search{padding:.5rem .75rem;border-bottom:1px solid var(--cl-border);}
  .cl-input{width:100%;padding:.6rem .8rem;border-radius:12px;border:1px solid var(--cl-border);outline:none}
  .cl-list{overflow:auto;flex:1;scroll-behavior:smooth;background:var(--cl-surface);}
  .cl-item{display:grid;grid-template-columns:44px 1fr auto;gap:.75rem;align-items:center;padding:.65rem .75rem;border-bottom:1px solid var(--cl-border);background:var(--cl-card);cursor:pointer}
  .cl-item:hover{background:#fafafa}
  .cl-avatar{width:44px;height:44px;border-radius:999px;display:grid;place-items:center;font-weight:700;color:#fff}
  .cl-meta{min-width:0}
  .cl-name{margin:0;font-weight:700;color:var(--cl-text);font-size:.98rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cl-last{margin:2px 0 0;color:var(--cl-dim);font-size:.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cl-right{text-align:right}
  .cl-time{font-size:.77rem;color:var(--cl-dim)}
  .cl-badge{display:inline-block;min-width:20px;padding:2px 6px;border-radius:999px;background:var(--cl-primary);color:#fff;font-size:.75rem;text-align:center;margin-top:.35rem}
  .cl-iconbtn{appearance:none;border:none;background:transparent;cursor:pointer}
  `;
  const style = document.createElement("style");
  style.id = "chatlist-styles";
  style.innerHTML = css;
  document.head.appendChild(style);
};

function initialsFrom(name = "?") {
  const parts = String(name || "?").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
}
function colorFromId(id) {
  const palette = ["#6366F1","#8B5CF6","#F59E0B","#10B981","#EF4444","#06B6D4","#F97316","#22C55E"];
  let h = 0;
  const s = String(id || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

/* canonical id getter */
const getId = (o) => {
  if (!o) return null;
  if (typeof o === "string") return o;
  return String(o.id ?? o.userId ?? o._id ?? o.uuid ?? "");
};

export default function ChatList({
  chats = [],
  loading = false,
  onSelect = () => {},
  onDelete = () => {},
  onCompose = null,
  onRefresh = null,
  selectedId = null,
  currentUserId = null,
  usersMap = {},
}) {
  injectStyles();
  const [q, setQ] = useState("");

  // myName (helps detect server-sent chat.name equal to my name)
  const myName = useMemo(() => {
    const fromMap = usersMap?.[String(currentUserId)]?.displayName || usersMap?.[String(currentUserId)]?.name || null;
    if (fromMap) return fromMap;
    try {
      const raw = localStorage.getItem("current_user") || localStorage.getItem("user") || localStorage.getItem("me");
      if (!raw) return null;
      const p = JSON.parse(raw);
      return p?.displayName || p?.name || p?.username || null;
    } catch {
      return null;
    }
  }, [currentUserId, usersMap]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return chats;
    return chats.filter((c) => {
      const name = (c.name || c.title || "").toString().toLowerCase();
      const last = (c.lastMessage?.text ?? c.lastMessage?.Content ?? c.preview ?? "").toString().toLowerCase();
      return (name && name.includes(t)) || last.includes(t);
    });
  }, [q, chats]);

  // find other participant's display name from participant list
  function findOtherName(chat) {
    const parts = chat.participants || chat.members || chat.users || [];
    for (const p of parts) {
      if (!p) continue;
      if (typeof p === "string") {
        if (String(p) !== String(currentUserId)) {
          const u = usersMap?.[String(p)];
          if (u) return u.displayName ?? u.name ?? u.username ?? String(p);
          return String(p);
        }
      } else {
        const pid = p.id ?? p.userId ?? p._id ?? p.uuid ?? null;
        if (pid && String(pid) !== String(currentUserId)) {
          const u = usersMap?.[String(pid)];
          if (u) return u.displayName ?? u.name ?? u.username ?? String(pid);
          return p.displayName || p.name || p.username || String(pid);
        }
      }
    }
    return null;
  }

  /* ------------------ CORE: deterministic display-name decision ------------------
     Rule (strict):
     - If lastMessage exists AND it is sent by *current user* (exact id match OR senderId is "me" OR senderName matches myName)
         -> ALWAYS display the *recipient* (other participant) in chatlist.
     - Else if lastMessage exists and sent by someone else -> display that sender's name.
     - Else fallback to chat.name (unless equal to myName), participants, title.
  ------------------------------------------------------------------------------*/
  function displayNameFor(chat) {
    if (!chat) return "Untitled";
    if (chat.isGroup) return chat.name || "Group";

    const lm = chat.lastMessage ?? chat.last_message ?? chat.last ?? null;
    const myIdStr = currentUserId ? String(currentUserId) : null;

    if (lm) {
      const lmSenderId = lm.senderId ?? lm.fromUserId ?? lm.userId ?? (lm.sender && (lm.sender.id ?? lm.sender.userId)) ?? null;
      const lmSenderName = lm.senderName ?? lm.fromName ?? lm.sender?.displayName ?? lm.sender?.name ?? null;

      // detect "message is from me"
      const senderIdStr = lmSenderId != null ? String(lmSenderId) : null;
      const isFromMe =
        (myIdStr && senderIdStr && String(senderIdStr) === String(myIdStr)) || // exact id match
        (senderIdStr && typeof senderIdStr === "string" && senderIdStr.toLowerCase() === "me") || // local drafts/hub marker "me"
        (!senderIdStr && lmSenderName && myName && lmSenderName === myName); // no id but name equals myName

      if (isFromMe) {
        // Force show recipient: prefer chat.otherId, else find participant
        const otherId = chat.otherId ?? null;
        if (otherId && String(otherId) !== myIdStr) {
          const u = usersMap?.[String(otherId)];
          if (u) return u.displayName ?? u.name ?? u.username ?? String(otherId);
          return String(otherId);
        }
        const other = findOtherName(chat);
        if (other) return other;

        // fallback: if chat.name exists and is not myName, use it
        if (chat.name && String(chat.name).trim()) {
          const candidate = String(chat.name).trim();
          if (!(myName && candidate === myName)) return candidate;
        }
      } else {
        // last message is from someone else -> show that sender
        if (lmSenderName) return lmSenderName;
        if (lmSenderId) {
          const u = usersMap?.[String(lmSenderId)];
          if (u) return u.displayName ?? u.name ?? u.username ?? String(lmSenderId);
          return String(lmSenderId);
        }
      }
    }

    // No last message or couldn't resolve above -> prefer chat.name (if not myName)
    if (chat.name && String(chat.name).trim()) {
      const candidate = String(chat.name).trim();
      if (!(myName && candidate === myName)) return candidate;
    }

    // fallback to participants
    const alt = findOtherName(chat);
    if (alt) return alt;

    return chat.title ?? chat.name ?? "Conversation";
  }

  return (
    <div className="cl-wrap" role="navigation" aria-label="Chat list">
      <div className="cl-head">
        <div className="cl-head-row">
          <h3 className="cl-title">Chats</h3>
          {onCompose && <button className="cl-iconbtn" title="New chat" onClick={onCompose}>＋</button>}
          <button className="cl-iconbtn" title="Refresh" onClick={onRefresh}>⟳</button>
        </div>
        <div className="cl-search">
          <input className="cl-input" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="cl-list">
        {loading && <div style={{ padding: "1rem", color: "var(--cl-dim)" }}>Loading chats…</div>}
        {!loading && filtered.length === 0 && <div style={{ padding: "1rem", color: "var(--cl-dim)" }}>No chats</div>}
        {filtered.map((chat) => {
          const id = chat.id ?? chat.chatId;
          const last = (chat.lastMessage?.text ?? chat.lastMessage?.Content ?? chat.preview ?? chat.previewText ?? "");
          const ts = chat.lastMessage?.createdAt || chat.updatedAt || chat.lastAt;
          const time = ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
          const isActive = String(selectedId) === String(id);
          const name = chat.isGroup ? (chat.name || "Group") : displayNameFor(chat);
          return (
            <div key={id} className="cl-item" onClick={() => onSelect(chat)} style={{ background: isActive ? "#eef3ff" : undefined }}>
              <div className="cl-avatar" style={{ background: colorFromId(id) }} aria-hidden>
                {chat.avatarUrl ? <img src={chat.avatarUrl} alt="" style={{width:"100%",height:"100%",borderRadius:999,objectFit:"cover"}}/> : <span>{initialsFrom(name)}</span>}
              </div>
              <div className="cl-meta">
                <p className="cl-name">{name}</p>
                <p className="cl-last">{last}</p>
              </div>
              <div className="cl-right">
                <div className="cl-time">{time}</div>
                {!!chat.unreadCount && <div className="cl-badge" aria-label={`${chat.unreadCount} unread`}>{chat.unreadCount}</div>}
                <div>
                  <button className="cl-iconbtn" title="Delete" onClick={(e) => { e.stopPropagation(); onDelete(id); }}>🗑️</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
