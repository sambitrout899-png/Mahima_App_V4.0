// src/pages/ChatPage.jsx
import React, { useEffect, useRef, useState } from "react";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";
import NewChatModal from "../components/NewChatModal";
import "./ChatPage.css";
import { useChatConnection } from "../hooks/useChatConnection";

/**
 * API / Hub resolution
 */
const API_BASE = (typeof window !== "undefined" && window.__API_BASE__)
  ? String(window.__API_BASE__).replace(/\/$/, "")
  : (import.meta.env?.VITE_API_BASE ?? "/api").replace(/\/$/, "");

const HUB_PATH = import.meta.env?.VITE_CHAT_HUB_PATH || "/chat";
const HUB_URL = (function () {
  if (typeof window !== "undefined" && window.location && !import.meta.env?.VITE_HUB_BASE) {
    const origin = window.location.origin; // http(s)://...
    return origin.replace(/^http/, "ws") + HUB_PATH; // ws:// or wss:// matching scheme
  }
  const base = (import.meta.env?.VITE_HUB_BASE || "").replace(/\/+$/, "");
  return base + HUB_PATH;
})();

console.info("[ChatPage] API_BASE ->", API_BASE);
console.info("[ChatPage] HUB URL ->", HUB_URL);

/* ------------------------- small helpers ------------------------- */
const extractId = (o) => {
  if (!o) return null;
  if (typeof o === "string") return o;
  return String(o.id ?? o.userId ?? o._id ?? o.uuid ?? "");
};

function normalizeMessage(m) {
  if (!m) return m;
  const id = m.id ?? m.messageId ?? m._id ?? Math.random().toString(36).slice(2);
  const text = m.text ?? m.content ?? m.body ?? null;
  const createdAt = m.createdAt ?? m.created_at ?? m.timestamp ?? new Date().toISOString();
  const fromObj = m.sender ?? m.user ?? m.from;
  const senderId =
    extractId(fromObj) ||
    m.senderId ||
    m.fromUserId ||
    m.userId ||
    null;
  const senderName =
    m.senderName ??
    m.fromName ??
    (m.sender && (m.sender.displayName || m.sender.name)) ??
    null;
  return { ...m, id, text, createdAt, senderId, senderName };
}

function resolveChatTitle(chat, myId, map) {
  if (!chat) return "Conversation";
  if (chat.name && String(chat.name).trim()) return chat.name;

  const members = chat.members || chat.participants || chat.users || [];
  if (!Array.isArray(members) || members.length === 0) {
    const lm = chat.lastMessage || chat.last_message || chat.last || null;
    return lm?.senderName || chat.title || "Conversation";
  }

  let other = null;
  for (const m of members) {
    const id = typeof m === "string" ? m : (m.id ?? m.userId ?? m._id ?? m.uuid);
    if (!id) continue;
    if (String(id) !== String(myId)) {
      other = m;
      break;
    }
  }
  if (!other) other = members[0];
  if (!other) return chat.title || "Conversation";

  const otherId = typeof other === "string" ? other : (other.id ?? other.userId ?? other._id ?? other.uuid);
  const u = otherId ? map?.[String(otherId)] : null;

  if (u && (u.displayName || u.name || u.fullName || u.username)) {
    return u.displayName || u.name || u.fullName || u.username;
  }
  if (typeof other === "string") return other;
  return other.name ?? other.username ?? chat.title ?? "Conversation";
}

function normalizeChats(list = [], map = {}, online = new Set(), myId = null) {
  return (list || []).map((c) => {
    const id = c.id ?? c.chatId ?? c._id ?? c.uuid;
    const members = c.members ?? c.participants ?? c.users ?? [];
    const lastRaw = c.lastMessage ?? c.last_message ?? c.last ?? null;
    const lastMessage = normalizeMessage(lastRaw);
    const isGroup = !!c.isGroup || !!c.group || (Array.isArray(members) && members.length > 2);
    const name = c.name ?? c.title ?? resolveChatTitle(c, myId, map);

    let otherId = null;
    if (!isGroup && Array.isArray(members)) {
      for (const m of members) {
        const idm = typeof m === "string" ? m : (m.id ?? m.userId ?? m._id ?? m.uuid);
        if (!idm) continue;
        if (String(idm) !== String(myId)) {
          otherId = String(idm);
          break;
        }
      }
      if (!otherId) {
        for (const m of members) {
          const candidate = m && m.user ? (m.user.id ?? m.user.userId ?? m.user._id ?? m.user.uuid) : null;
          if (candidate && String(candidate) !== String(myId)) {
            otherId = String(candidate);
            break;
          }
        }
      }
    }

    const otherUser = otherId ? map[String(otherId)] : null;
    const otherOnline = Boolean(online.has(String(otherId))) || Boolean(otherUser?.isOnline);

    const unreadCount = Number(((c.unreadCount ?? c.unread_count) ?? c.unread) ?? 0);

    return {
      ...c,
      id,
      members,
      isGroup,
      name,
      lastMessage,
      unreadCount,
      otherId,
      otherOnline,
    };
  });
}

/* ---------------------------- component --------------------------- */
export default function ChatPage() {
  const [loadingChats, setLoadingChats] = useState(false);
  const [chats, setChats] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);

  const [onlineSet, setOnlineSet] = useState(new Set());
  const [isMobile, setIsMobile] = useState(false);

  // detect mobile vs desktop
  useEffect(() => {
    function handleResize() {
      if (typeof window !== "undefined") {
        setIsMobile(window.innerWidth <= 900);
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // bootstrap current user
  useEffect(() => {
    try {
      const raw = localStorage.getItem("current_user") || localStorage.getItem("user");
      if (raw) setCurrentUser(JSON.parse(raw));
    } catch (e) { /* ignore */ }
  }, []);

  const currentUserId =
    currentUser && (currentUser.id ?? currentUser.userId ?? currentUser._id ?? currentUser.uuid)
      ? String(currentUser.id ?? currentUser.userId ?? currentUser._id ?? currentUser.uuid)
      : null;

  async function loadUsersMap() {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/users?limit=500`, { headers });
      if (!res.ok) {
        console.warn("loadUsersMap failed", res.status);
        return {};
      }
      const json = await res.json();
      const items = json.items ?? json.data ?? json ?? [];
      const map = {};
      items.forEach((u) => {
        const id = u.id ?? u.userId ?? u._id ?? u.uuid;
        if (id) map[String(id)] = u;
      });
      setUsersMap(map);
      return map;
    } catch (err) {
      console.warn("loadUsersMap error", err);
      return {};
    }
  }

  async function loadChats() {
    setLoadingChats(true);
    try {
      const map =
        Object.keys(usersMap).length > 0 ? usersMap : await loadUsersMap();
      const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/chats`, { headers });
      if (!res.ok) {
        console.warn("loadChats failed", res.status, await res.text().catch(() => ""));
        setChats([]);
        return;
      }
      const json = await res.json();
      const list = json.data ?? json.items ?? json ?? [];
      const normalized = normalizeChats(list, map, onlineSet, currentUserId);
      setChats(normalized);
      if (!selectedChat && normalized.length) setSelectedChat(normalized[0]);
    } catch (err) {
      console.error("loadChats error", err);
      setChats([]);
    } finally {
      setLoadingChats(false);
    }
  }

  useEffect(() => {
    loadChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // SignalR connection
  const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || null;
  const { connection, isConnected: hubConnected, joinGroup, leaveGroup } =
    useChatConnection(token, {
      hubUrl: HUB_URL,
      tokenStorageKey: "token",
    });

  useEffect(() => {
    if (!connection) return;

    (async () => {
      try {
        if (connection.invoke) {
          try {
            const list = await connection.invoke("GetOnlineUsers");
            if (Array.isArray(list)) {
              setOnlineSet(new Set(list.map((x) => String(x))));
            }
          } catch {}
          try {
            const list2 = await connection.invoke("GetConnectedUsers");
            if (Array.isArray(list2)) {
              setOnlineSet(new Set(list2.map((x) => String(x))));
            }
          } catch {}
        }
      } catch (err) {
        // ignore
      }
    })();

    const onUserOnline = (payload) => {
      const id = payload?.userId ?? payload ?? null;
      if (!id) return;
      setOnlineSet((prev) => {
        const next = new Set(prev);
        next.add(String(id));
        return next;
      });
    };
    const onUserOffline = (payload) => {
      const id = payload?.userId ?? payload ?? null;
      if (!id) return;
      setOnlineSet((prev) => {
        const next = new Set(prev);
        next.delete(String(id));
        return next;
      });
    };

    const onReceive = (msg) => {
      const normalized = normalizeMessage(msg);
      setChats((prev) =>
        prev.map((c) => {
          const mid = String(
            normalized.chatId ?? normalized.chat?.id ?? normalized.chatId ?? ""
          );
          if (String(c.id) !== mid) return c;
          const lm = { ...normalized };
          if (lm.senderId === "me" && currentUserId) lm.senderId = currentUserId;
          return { ...c, lastMessage: lm };
        })
      );
      setSelectedChat((prev) => {
        if (!prev) return prev;
        const mid = String(
          normalized.chatId ?? normalized.chat?.id ?? normalized.chatId ?? ""
        );
        if (String(prev.id) !== mid) return prev;
        const lm = { ...normalized };
        if (lm.senderId === "me" && currentUserId) lm.senderId = currentUserId;
        return { ...prev, lastMessage: lm };
      });
    };

    connection.on("ReceiveMessage", onReceive);
    connection.on("UserTyping", () => {});

    connection.on && connection.on("UserOnline", onUserOnline);
    connection.on && connection.on("UserOffline", onUserOffline);
    connection.on &&
      connection.on("PresenceUpdated", (payload) => {
        if (!payload) return;
        if (Array.isArray(payload)) {
          setOnlineSet(new Set(payload.map((x) => String(x))));
        } else if (payload.online && Array.isArray(payload.online)) {
          setOnlineSet(new Set(payload.online.map((x) => String(x))));
        }
      });

    return () => {
      try {
        connection.off && connection.off("ReceiveMessage", onReceive);
        connection.off && connection.off("UserTyping");
        connection.off && connection.off("UserOnline", onUserOnline);
        connection.off && connection.off("UserOffline", onUserOffline);
        connection.off && connection.off("PresenceUpdated");
      } catch (e) {
        /* ignore */
      }
    };
  }, [connection, usersMap, currentUserId]);

  useEffect(() => {
    setChats((prev) => normalizeChats(prev, usersMap, onlineSet, currentUserId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineSet, usersMap]);

  const prevChatRef = useRef(null);
  useEffect(() => {
    (async () => {
      try {
        const prev = prevChatRef.current;
        if (prev && prev.id && leaveGroup)
          await leaveGroup(prev.id).catch(() => {});
        if (selectedChat && selectedChat.id && joinGroup)
          await joinGroup(selectedChat.id).catch(() => {});
        prevChatRef.current = selectedChat;
      } catch (err) {
        console.warn("join/leave group error", err);
      }
    })();
  }, [selectedChat, joinGroup, leaveGroup]);

  async function createChat(payload) {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || null;
      const headers = token
        ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
        : { "Content-Type": "application/json" };
      const res = await fetch(`${API_BASE}/chats`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`createChat failed ${res.status} ${txt}`);
      }
      const json = await res.json();
      const chatObj = normalizeChats(
        [json.data ?? json],
        usersMap,
        onlineSet,
        currentUserId
      )[0];
      setChats((prev) => {
        const exists = prev.find((p) => String(p.id) === String(chatObj.id));
        if (exists)
          return prev.map((p) =>
            String(p.id) === String(chatObj.id) ? chatObj : p
          );
        return [chatObj, ...prev];
      });
      setSelectedChat(chatObj);
      try {
        if (chatObj?.id && joinGroup) await joinGroup(chatObj.id);
      } catch {}
      setShowNewChat(false);
      return chatObj;
    } catch (err) {
      console.error("createChat error", err);
      alert("Failed to create chat: " + (err.message ?? "unknown"));
      throw err;
    }
  }

  async function deleteChat(chatId) {
    if (!chatId) return;
    const ok = window.confirm(
      "Delete this chat? This will remove the conversation from your list."
    );
    if (!ok) return;
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("auth_token") || null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(
        `${API_BASE}/chats/${encodeURIComponent(chatId)}`,
        {
          method: "DELETE",
          headers,
        }
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Delete failed ${res.status} ${txt}`);
      }
      setChats((prev) => prev.filter((c) => String(c.id) !== String(chatId)));
      if (selectedChat && String(selectedChat.id) === String(chatId)) {
        setSelectedChat(null);
      }
    } catch (err) {
      console.error("deleteChat error", err);
      alert("Failed to delete chat: " + (err.message ?? "unknown"));
    }
  }

  function handleMessageCreated(msg) {
    const normalized = normalizeMessage(msg);
    setChats((prev) =>
      prev.map((c) => {
        const chatId = String(c.id);
        const msgChatId = String(
          normalized.chatId ?? normalized.chat?.id ?? normalized.chatId ?? ""
        );
        if (chatId === msgChatId) {
          return { ...c, lastMessage: normalized, unreadCount: 0 };
        }
        return c;
      })
    );
  }

  const computedOtherOnline = React.useMemo(() => {
    if (!selectedChat) return false;
    if (selectedChat.isGroup) return false;
    const otherId = selectedChat.otherId ?? selectedChat.other?.id ?? null;
    if (!otherId) return false;
    if (onlineSet.has(String(otherId))) return true;
    const u = usersMap[String(otherId)];
    if (u?.isOnline) return true;
    return false;
  }, [selectedChat, onlineSet, usersMap]);

  /* --------------------------- responsive UI --------------------------- */

  const showListPane = !isMobile || !selectedChat;
  const showChatPane = !isMobile || !!selectedChat;

  return (
    <div
      style={{
        display: "flex",
        gap: isMobile ? 0 : 16,
        height: "100%",
        flexDirection: isMobile ? "column" : "row",
      }}
    >
      {/* Left: chat list (hidden on mobile when a chat is open) */}
      {showListPane && (
        <div
          style={{
            width: isMobile ? "100%" : 360,
            borderRight: isMobile ? "none" : "1px solid rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 18 }}>Messages</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => loadChats()}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                }}
                title="Refresh"
              >
                <span style={{ fontSize: 16 }}>⟳</span> Refresh
              </button>
              <button
                onClick={() => setShowNewChat(true)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "#2d6cdf",
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: "0 4px 10px rgba(45,108,223,0.18)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                }}
                title="Start a new chat"
              >
                <span style={{ fontSize: 16 }}>＋</span> New Chat
              </button>
            </div>
          </div>

          <ChatList
            chats={chats}
            loading={loadingChats}
            onSelect={(c) => setSelectedChat(c)}
            selectedId={selectedChat?.id}
            currentUserId={currentUserId}
            usersMap={usersMap}
            onDelete={(id) => deleteChat(id)}
          />
        </div>
      )}

      {/* Right: chat window (full-width on mobile) */}
      {showChatPane && (
        <div style={{ flex: 1, minWidth: isMobile ? "100%" : 420 }}>
          <ChatWindow
            chat={selectedChat}
            connection={connection}
            isConnected={Boolean(hubConnected || computedOtherOnline)}
            currentUserId={currentUserId}
            onMessageCreated={handleMessageCreated}
            // on mobile, back takes you to list; on desktop it just deselects
            onBack={() => setSelectedChat(null)}
            onStartAudioCall={() =>
              alert("Audio call not implemented in this build")
            }
            onStartVideoCall={() =>
              alert("Video call not implemented in this build")
            }
          />
        </div>
      )}

      {/* New chat modal */}
      {showNewChat && (
        <NewChatModal
          open={showNewChat}
          onClose={() => setShowNewChat(false)}
          onCreate={async (payload) => {
            try {
              await createChat(payload);
            } catch {
              /* handled */
            }
          }}
        />
      )}
    </div>
  );
}
