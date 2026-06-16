// src/components/chat/ChatList.jsx
//
// WhatsApp-style chat list for Jai Masih.
// - Lucide icons (no mojibake)
// - Avatar with deterministic colour
// - Unread count badge
// - Smart timestamp (HH:mm | Yesterday | weekday | date)
// - Search box with clear button
// - Recipient name detection (handles server-bug "chat.name = my own name")
//
import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Search,
  Plus,
  RefreshCw,
  X,
  Trash2,
  CheckCheck,
  Check,
  MessageSquare,
} from "lucide-react";

/* helpers */

const initialsFrom = (name = "?") => {
  const parts = String(name || "?").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
};

const mediaUrlFrom = (url) => {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) return value;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${value.startsWith("/") ? value : `/${value}`}`;
};

const avatarUrlFor = (chat) =>
  mediaUrlFrom(chat?.avatarUrl || chat?.otherProfilePhotoUrl || chat?.otherAvatarUrl || chat?.profilePhotoUrl);

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

const smartTime = (input) => {
  if (!input) return "";
  const d = dayjs(input);
  if (!d.isValid()) return "";
  const now = dayjs();
  if (d.isSame(now, "day")) return d.format("HH:mm");
  if (d.isSame(now.subtract(1, "day"), "day")) return "Yesterday";
  if (d.isAfter(now.subtract(7, "day"))) return d.format("ddd");
  return d.format("DD/MM/YY");
};

/* component */

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
  onlineUserIds = new Set(),
}) {
  const [q, setQ] = useState("");
  const onlineSet = useMemo(
    () => new Set(Array.from(onlineUserIds || []).map((id) => String(id))),
    [onlineUserIds]
  );

  const myName = useMemo(() => {
    const fromMap = usersMap?.[String(currentUserId)]?.displayName
      || usersMap?.[String(currentUserId)]?.name;
    if (fromMap) return fromMap;
    try {
      const raw = localStorage.getItem("mahima_user")
        || localStorage.getItem("current_user")
        || localStorage.getItem("user")
        || localStorage.getItem("me");
      if (!raw) return null;
      const p = JSON.parse(raw);
      return p?.displayName || p?.name || p?.username || null;
    } catch { return null; }
  }, [currentUserId, usersMap]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return chats;
    return chats.filter((c) => {
      const name = (displayNameFor(c) || c.name || c.title || "").toString().toLowerCase();
      const last = (c.lastMessage?.text ?? c.lastMessage?.Content ?? c.preview ?? "")
        .toString().toLowerCase();
      return name.includes(t) || last.includes(t);
    });
  }, [q, chats, currentUserId, usersMap, myName]);

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

  function findOtherId(chat) {
    const direct = chat?.otherId ?? chat?.otherUserId ?? chat?.peerUserId ?? chat?.recipientId ?? null;
    if (direct && String(direct) !== String(currentUserId)) return direct;

    const parts = chat?.participants || chat?.members || chat?.users || [];
    for (const p of parts) {
      if (!p) continue;
      if (typeof p === "string") {
        if (String(p) !== String(currentUserId)) return p;
      } else {
        const pid = p.id ?? p.userId ?? p._id ?? p.uuid ?? null;
        if (pid && String(pid) !== String(currentUserId)) return pid;
      }
    }
    return null;
  }

  function displayNameFor(chat) {
    if (!chat) return "Untitled";
    if (chat.isGroup) return chat.name || "Group";
    const directName = chat.otherName || chat.otherDisplayName || chat.otherUsername || null;
    if (directName && String(directName).trim()) return String(directName).trim();
    const directId = chat.otherId ?? null;
    if (directId && String(directId) !== String(currentUserId)) {
      const u = usersMap?.[String(directId)];
      if (u) return u.displayName ?? u.name ?? u.username ?? String(directId);
      return String(directId);
    }
    const lm = chat.lastMessage ?? chat.last_message ?? chat.last ?? null;
    const myIdStr = currentUserId ? String(currentUserId) : null;
    if (lm) {
      const lmSenderId = lm.senderId ?? lm.fromUserId ?? lm.userId
        ?? (lm.sender && (lm.sender.id ?? lm.sender.userId)) ?? null;
      const lmSenderName = lm.senderName ?? lm.fromName
        ?? lm.sender?.displayName ?? lm.sender?.name ?? null;
      const senderIdStr = lmSenderId != null ? String(lmSenderId) : null;
      const isFromMe =
        (myIdStr && senderIdStr && senderIdStr === myIdStr) ||
        (senderIdStr && senderIdStr.toLowerCase() === "me") ||
        (!senderIdStr && lmSenderName && myName && lmSenderName === myName);

      if (isFromMe) {
        const otherId = chat.otherId ?? null;
        if (otherId && String(otherId) !== myIdStr) {
          const u = usersMap?.[String(otherId)];
          if (u) return u.displayName ?? u.name ?? u.username ?? String(otherId);
          return String(otherId);
        }
        const other = findOtherName(chat);
        if (other) return other;
        if (chat.name && String(chat.name).trim()) {
          const candidate = String(chat.name).trim();
          if (!(myName && candidate === myName)) return candidate;
        }
      } else {
        if (lmSenderName) return lmSenderName;
        if (lmSenderId) {
          const u = usersMap?.[String(lmSenderId)];
          if (u) return u.displayName ?? u.name ?? u.username ?? String(lmSenderId);
          return String(lmSenderId);
        }
      }
    }
    if (chat.name && String(chat.name).trim()) {
      const candidate = String(chat.name).trim();
      if (!(myName && candidate === myName)) return candidate;
    }
    const alt = findOtherName(chat);
    if (alt) return alt;
    return chat.title ?? "Conversation";
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Search bar */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-white/95 px-4 py-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="w-full rounded-xl border border-transparent bg-slate-100 py-2.5 pl-9 pr-8 text-sm outline-none transition focus:border-emerald-200 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="w-11 h-11 rounded-full hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center text-slate-600 shrink-0"
            title="Refresh"
            aria-label="Refresh chats"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
        {onCompose && (
          <button
            type="button"
            onClick={onCompose}
            className="w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-center shadow-sm shrink-0"
            title="New chat"
            aria-label="New chat"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto bg-white">
        {loading && (
          <div className="px-4 py-6 text-center text-sm text-slate-500">Loading chats...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="px-4 py-10 text-center">
            <MessageSquare className="w-10 h-10 mx-auto text-slate-300" />
            <div className="mt-2 text-sm text-slate-500">No chats yet</div>
            {onCompose && (
              <button
                onClick={onCompose}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Start a conversation
              </button>
            )}
          </div>
        )}

        {filtered.map((chat) => {
          const id = chat.id ?? chat.chatId;
          const last = (chat.lastMessage?.text
            ?? chat.lastMessage?.Content
            ?? chat.preview
            ?? chat.previewText
            ?? "");
          const ts = chat.lastMessage?.createdAt || chat.updatedAt || chat.lastAt;
          const time = smartTime(ts);
          const isActive = String(selectedId) === String(id);
          const name = chat.isGroup ? (chat.name || "Group") : displayNameFor(chat);
          const unread = Number(chat.unreadCount || 0);
          const avatarUrl = avatarUrlFor(chat);
          const peerId = chat.isGroup ? null : findOtherId(chat);
          const peerOnline = peerId ? onlineSet.has(String(peerId)) : false;

          // Did *I* send the last message? Show a tiny check.
          const lm = chat.lastMessage;
          const lmFromMe = lm && (
            String(lm.senderId ?? lm.fromUserId ?? lm.userId ?? "") === String(currentUserId)
          );
          const lmRead = lm?.readByOthers || lm?.read || lm?.delivered === "read";

          return (
            <div
              key={id}
              className={`group flex min-h-[82px] items-center gap-3 border-b border-slate-100 px-4 transition ${
                isActive ? "border-l-4 border-l-emerald-500 bg-emerald-50/90" : "border-l-4 border-l-transparent hover:bg-slate-50"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(chat)}
                className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left"
                aria-label={`Open chat with ${name}`}
              >
                <div
                  className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-base font-black text-white shadow-sm ring-2 ring-white"
                  style={{ background: colorFromId(id) }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    initialsFrom(name)
                  )}
                  {!chat.isGroup && peerId && (
                    <span
                      className={`absolute -right-0.5 bottom-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        peerOnline ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                      title={peerOnline ? "Online" : "Offline"}
                      aria-label={peerOnline ? "Online" : "Offline"}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="truncate text-[15px] font-black text-slate-900">{name}</div>
                    {time && (
                      <div className={`text-[11px] shrink-0 ${unread ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                        {time}
                      </div>
                    )}
                  </div>
                  <div className="mt-1 flex min-w-0 items-center gap-1">
                    {lmFromMe && (
                      lmRead
                        ? <CheckCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        : <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1 truncate text-xs text-slate-500">
                      {last || (
                        !chat.isGroup && peerId
                          ? <span className={peerOnline ? "text-emerald-600 font-medium" : "text-slate-400"}>{peerOnline ? "Online" : "Offline"}</span>
                          : <span className="italic text-slate-400">No messages yet</span>
                      )}
                    </div>
                    {unread > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold px-1.5 shrink-0">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                title="Delete chat"
                aria-label={`Delete chat with ${name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}


