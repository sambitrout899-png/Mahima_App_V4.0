// src/components/chat/ChatWindow.jsx
//
// WhatsApp-style conversation view for Jai Masih.
// Features:
//   - Lucide icons (no mojibake â† âœ"âœ" âž¤ ðŸ’¬)
//   - Sound + haptic on incoming messages (chatNotifications.js)
//   - Date separators (Today / Yesterday / DD MMM YYYY)
//   - Read receipts (single tick / double tick / blue double tick)
//   - Live "typing..." indicator
//   - Keep newest messages at the top
//   - Auto-grow textarea (Enter sends, Shift+Enter newlines)
//   - Mark-as-read on focus
//   - Mute toggle
//   - Optimistic send with retry on failure
//
import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  ArrowLeft,
  Send,
  Check,
  CheckCheck,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
  RefreshCw,
  Phone,
  Video,
  Paperclip,
  MoreVertical,
  Trash2,
  FileText,
  X,
  Ban,
  Mic,
  MicOff,
  Users,
  ShieldCheck,
} from "lucide-react";
import { getToken } from "../utils/auth";
import { optionalImportModule, speakText } from "../utils/speech";
import {
  playReceiveSound,
  playSendSound,
  unlockAudio,
  isMuted as readMuted,
  setMuted as writeMuted,
} from "../utils/chatNotifications";

const API_BASE = (() => {
  // 1. Runtime override from index.html (covers Capacitor / Android build).
  try {
    if (typeof window !== "undefined" && window.__API_BASE__) {
      return String(window.__API_BASE__).trim().replace(/\/+$/, "");
    }
  } catch {}

  // 2. Vite env var (picked up by web + mobile builds).
  const envBase = (import.meta?.env?.VITE_API_BASE || "").toString().trim().replace(/\/+$/, "");
  if (envBase) return envBase;

  // 3. Capacitor native — fall back to the public site so /uploads/... resolves.
  try {
    if (typeof window !== "undefined") {
      const isNative =
        import.meta?.env?.MODE === "mobile" ||
        Boolean(window.Capacitor?.isNativePlatform?.()) ||
        window.location?.protocol === "capacitor:" ||
        (window.location?.protocol === "https:" && window.location?.hostname === "localhost");
      if (isNative) return "https://mahimaministries.in/api";
    }
  } catch {}

  // 4. Vite dev proxy.
  if (typeof window !== "undefined" && window.location?.port === "5173") {
    return `${window.location.protocol}//${window.location.hostname}:5001/api`;
  }

  return "/api";
})();

// Origin used to absolute-ize relative media URLs (e.g. /uploads/voice/abc.webm).
const MEDIA_ORIGIN = (() => {
  // If API_BASE is absolute, strip /api to get the bare origin.
  if (/^https?:\/\//i.test(API_BASE)) {
    return API_BASE.replace(/\/api\/?$/i, "");
  }
  // Relative API_BASE — on Capacitor https://localhost we still need a real origin,
  // otherwise audio/<img> elements will fetch from localhost and silently fail.
  try {
    if (typeof window !== "undefined") {
      const onLocalhost =
        window.location?.protocol === "capacitor:" ||
        (window.location?.protocol === "https:" && window.location?.hostname === "localhost") ||
        Boolean(window.Capacitor?.isNativePlatform?.());
      if (onLocalhost) return "https://mahimaministries.in";
    }
  } catch {}
  return "";
})();

function resolveMediaUrl(url = "") {
  const value = String(url || "");
  if (!value || /^(https?:|data:|blob:)/i.test(value)) return value;
  return `${MEDIA_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
}
const ATTACHMENT_MARKER = "jm-attachment";
const MESSAGE_DELETE_KEY = "jm_chat_deleted_messages_v1";

function readJsonStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function deletedMessageKey(chatId, messageId) {
  return `${chatId}:${messageId}`;
}

function encodeAttachmentMarker(attachments = []) {
  if (!attachments.length) return "";
  try {
    const json = JSON.stringify(attachments.map((a) => ({
      url: a.url,
      contentType: a.contentType,
      kind: a.kind,
    })));
    return `[${ATTACHMENT_MARKER}:${btoa(unescape(encodeURIComponent(json)))}]`;
  } catch {
    return "";
  }
}

function extractAttachmentMarker(text = "") {
  const source = String(text || "");
  const re = new RegExp(`\\s*\\[${ATTACHMENT_MARKER}:([A-Za-z0-9+/=]+)\\]`, "g");
  const found = [];
  let cleaned = source;
  let match;
  while ((match = re.exec(source)) !== null) {
    try {
      const json = decodeURIComponent(escape(atob(match[1])));
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item?.url) {
            found.push({
              url: resolveMediaUrl(item.url),
              contentType: item.contentType || guessContentType(item.url),
              kind: item.kind || kindFromContentType(item.contentType || guessContentType(item.url)),
            });
          }
        }
      }
      cleaned = cleaned.replace(match[0], "");
    } catch { /* ignore malformed marker */ }
  }
  return { text: cleaned.trim(), attachments: found };
}

/* helpers */

const normalizeMessage = (m) => {
  // Normalise attachments: backend may send `attachments: [...]`, a single
  // `attachmentUrl: "..."`, or both. Surface a single array of
  // { url, contentType, kind } objects.
  let attachments = Array.isArray(m.attachments) ? m.attachments
    : Array.isArray(m.Attachments) ? m.Attachments
    : [];
  attachments = attachments.map((a) => {
    if (!a) return null;
    if (typeof a === "string") {
      const url = resolveMediaUrl(a);
      return { url, contentType: guessContentType(url), kind: kindFromContentType(guessContentType(url)) };
    }
    const rawUrl = a.url || a.Url || a.location || a.path;
    const url = resolveMediaUrl(rawUrl);
    const ct = a.contentType || a.ContentType || a.mimeType || guessContentType(url);
    return { url, contentType: ct, kind: a.kind || kindFromContentType(ct) };
  }).filter((a) => a && a.url);

  const single = m.attachmentUrl || m.AttachmentUrl;
  if (single && !attachments.some((a) => a.url === single)) {
    const ct = m.contentType || m.ContentType || guessContentType(single);
    attachments.unshift({ url: resolveMediaUrl(single), contentType: ct, kind: kindFromContentType(ct) });
  }

  const marker = extractAttachmentMarker(m.text ?? m.content ?? m.body ?? "");
  for (const item of marker.attachments) {
    if (!attachments.some((a) => a.url === item.url)) attachments.push(item);
  }

  return {
    id:
      m.id ?? m.messageId ?? m._id
      ?? (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2)),
    chatId: m.chatId ?? m.ChatId ?? m.chatID,
    senderId: m.senderId ?? m.fromUserId ?? m.userId
      ?? (m.sender && (m.sender.id ?? m.sender.userId)) ?? null,
    text: marker.text,
    createdAt: m.createdAt ?? m.sentAt ?? m.timestamp ?? new Date().toISOString(),
    attachments,
    status: m.status ?? "sent",          // sending | sent | delivered | read | failed
  };
};

function guessContentType(url = "") {
  const u = String(url).toLowerCase();
  if (u.startsWith("data:")) return u.slice(5).split(";")[0] || "";
  if (/\.(jpe?g|png|webp|gif|heic|avif)(\?|$)/.test(u)) return "image/" + u.match(/\.(\w+)(\?|$)/)[1];
  if (/voice-[^/]*\.webm(\?|$)/.test(u)) return "audio/webm";
  if (/\.(mp4|webm|mov|m4v)(\?|$)/.test(u)) return "video/" + u.match(/\.(\w+)(\?|$)/)[1];
  if (/\.(m4a|mp4a)(\?|$)/.test(u)) return "audio/mp4";
  if (/\.mp3(\?|$)/.test(u)) return "audio/mpeg";
  if (/\.(aac|ogg|oga|wav|webm)(\?|$)/.test(u)) return "audio/" + u.match(/\.(\w+)(\?|$)/)[1];
  return "";
}

function kindFromContentType(ct = "") {
  if (ct.startsWith("image/")) return "image";
  if (ct.startsWith("video/")) return "video";
  if (ct.startsWith("audio/")) return "audio";
  return "file";
}

const dateLabel = (input) => {
  const d = dayjs(input);
  if (!d.isValid()) return "";
  const today = dayjs().startOf("day");
  if (d.isSame(today, "day")) return "Today";
  if (d.isSame(today.subtract(1, "day"), "day")) return "Yesterday";
  if (d.isAfter(today.subtract(7, "day"))) return d.format("dddd");
  return d.format("DD MMM YYYY");
};

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

const isTouchDevice = () => {
  if (typeof window === "undefined") return false;
  return ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
};

function isNativeAppMode() {
  try {
    return (
      import.meta.env.MODE === "mobile" ||
      Boolean(window.Capacitor?.isNativePlatform?.()) ||
      window.location?.protocol === "capacitor:" ||
      (window.location?.protocol === "https:" && window.location?.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

function pickVoiceRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const nativeCandidates = [
    "audio/mp4",
    "audio/aac",
    "audio/webm;codecs=opus",
    "audio/webm",
  ];
  const webCandidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
  ];

  const candidates = isNativeAppMode() ? nativeCandidates : webCandidates;
  return candidates.find((type) => MediaRecorder.isTypeSupported?.(type)) || "";
}

function audioExtensionForType(type = "") {
  const clean = String(type || "").toLowerCase();
  if (clean.includes("mp4") || clean.includes("m4a")) return "m4a";
  if (clean.includes("aac")) return "aac";
  if (clean.includes("ogg") || clean.includes("oga")) return "oga";
  if (clean.includes("wav")) return "wav";
  return "webm";
}

async function nativeSpeechToText(lang = "en-IN") {
  const [{ Capacitor }, { SpeechRecognition }] = await Promise.all([
    optionalImportModule("@capacitor/core"),
    optionalImportModule("@capacitor-community/speech-recognition"),
  ]);

  if (!Capacitor?.isNativePlatform?.() || !SpeechRecognition?.start) return "";
  await SpeechRecognition.requestPermissions?.();
  const result = await SpeechRecognition.start({
    language: lang,
    maxResults: 1,
    prompt: "Speak your message",
    partialResults: false,
    popup: true,
  });

  return (
    result?.matches?.[0] ||
    result?.value?.matches?.[0] ||
    result?.value?.[0] ||
    result?.text ||
    ""
  );
}

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

function mergeMessages(existing, incoming, activeChatId = null) {
  const byId = new Map();
  const activeKey = activeChatId == null ? null : String(activeChatId);
  for (const msg of existing) {
    if (activeKey && msg.chatId != null && String(msg.chatId) !== activeKey) continue;
    byId.set(String(msg.id), msg);
  }
  for (const msg of incoming) {
    if (activeKey && msg.chatId != null && String(msg.chatId) !== activeKey) continue;
    const key = String(msg.id);
    const current = byId.get(key);
    if (!current) {
      byId.set(key, msg);
      continue;
    }

    const incomingAttachments = Array.isArray(msg.attachments) ? msg.attachments : [];
    const currentAttachments = Array.isArray(current.attachments) ? current.attachments : [];
    byId.set(key, {
      ...current,
      ...msg,
      attachments: incomingAttachments.length ? incomingAttachments : currentAttachments,
      status: current.status === "sending" ? current.status : msg.status,
    });
  }
  return Array.from(byId.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
/* component */

export default function ChatWindow({
  chat,
  connection,
  isConnected,
  onlineUserIds = new Set(),
  currentUserId,
  usersMap = {},
  onMessageCreated = () => {},
  onBack = () => {},
  onStartAudioCall = () => {},
  onStartVideoCall = () => {},
}) {
  const meId = useMemo(() => {
    if (currentUserId) return String(currentUserId);
    try {
      const raw = localStorage.getItem("mahima_user")
        || localStorage.getItem("current_user")
        || localStorage.getItem("user")
        || localStorage.getItem("me");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.id ? String(parsed.id) : null;
    } catch { return null; }
  }, [currentUserId]);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [muted, setMutedState] = useState(() => readMuted());
  const [pendingAttachment, setPendingAttachment] = useState(null); // { file, previewUrl, kind }
  const [uploading, setUploading] = useState(false);
  const [messageMenu, setMessageMenu] = useState(null);
  const [deletedForMe, setDeletedForMe] = useState(() => readJsonStore(MESSAGE_DELETE_KEY, {}));
  const [blockStatus, setBlockStatus] = useState(null);
  const [blockBusy, setBlockBusy] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [groupInfo, setGroupInfo] = useState(null);
  const [groupInfoLoading, setGroupInfoLoading] = useState(false);
  const [groupInfoError, setGroupInfoError] = useState("");

  const scrollerRef = useRef(null);
  const taRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastReceiveSoundRef = useRef(0);
  const voiceRecognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingStreamRef = useRef(null);
  const recordingTimerRef = useRef(null);

  useEffect(() => {
    setMessages([]);
    setLoading(Boolean(chat?.id));
    setMessageMenu(null);
    setGroupInfoOpen(false);
    setGroupInfo(null);
    setGroupInfoError("");
  }, [chat?.id]);

  // Cleanup blob URL preview on change/unmount.
  useEffect(() => {
    return () => {
      if (pendingAttachment?.previewUrl) {
        try { URL.revokeObjectURL(pendingAttachment.previewUrl); } catch {}
      }
    };
  }, [pendingAttachment]);

  // Keep the newest messages visible at the top of the thread.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [messages.length, typing]);

  // Auto-grow textarea height.
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [text]);

  useEffect(() => {
    return () => {
      try { voiceRecognitionRef.current?.stop?.(); } catch {}
      voiceRecognitionRef.current = null;
      stopVoiceRecording(true);
    };
  }, []);

  function stopVoiceInput() {
    try { voiceRecognitionRef.current?.stop?.(); } catch {}
    voiceRecognitionRef.current = null;
    setVoiceListening(false);
    setVoiceBusy(false);
  }

  async function openGroupInfo() {
    if (!chat?.isGroup || !chat?.id) return;
    setGroupInfoOpen(true);
    setGroupInfoError("");
    setGroupInfoLoading(true);
    try {
      const token = getToken()
        || localStorage.getItem("mahima_token")
        || localStorage.getItem("authToken")
        || localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/chats/${chat.id}/members`, {
        headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Could not load group members (${res.status})`);
      const json = await res.json();
      setGroupInfo(json);
    } catch (err) {
      setGroupInfoError(err?.message || "Could not load group members.");
    } finally {
      setGroupInfoLoading(false);
    }
  }

  async function startVoiceInput() {
    if (isDirectBlocked || loading || uploading) return;
    unlockAudio();
    stopVoiceInput();
    const baseText = text.trim();
    setVoiceBusy(true);
    setVoiceListening(true);

    try {
      const nativeText = await nativeSpeechToText("en-IN").catch(() => "");
      if (nativeText) {
        setText([baseText, nativeText.trim()].filter(Boolean).join(" "));
        setVoiceBusy(false);
        setVoiceListening(false);
        window.setTimeout(() => taRef.current?.focus(), 50);
        return;
      }
    } finally {
      setVoiceBusy(false);
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceListening(false);
      alert("Voice typing is not supported on this device/browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    voiceRecognitionRef.current = recognition;
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;

    let finalText = "";
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const value = event.results[i][0]?.transcript || "";
        transcript += value;
        if (event.results[i].isFinal) finalText += value;
      }
      const spoken = (finalText || transcript).trim();
      if (spoken) setText([baseText, spoken].filter(Boolean).join(" "));
    };
    recognition.onerror = () => {
      setVoiceListening(false);
      voiceRecognitionRef.current = null;
    };
    recognition.onend = () => {
      setVoiceListening(false);
      voiceRecognitionRef.current = null;
      const spoken = finalText.trim();
      if (spoken) setText([baseText, spoken].filter(Boolean).join(" "));
      window.setTimeout(() => taRef.current?.focus(), 50);
    };

    try {
      recognition.start();
    } catch {
      setVoiceListening(false);
      voiceRecognitionRef.current = null;
    }
  }

  function stopRecordingTracks() {
    try {
      recordingStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    } catch {}
    recordingStreamRef.current = null;
  }

  function clearRecordingTimer() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  async function startVoiceRecording() {
    if (isDirectBlocked || loading || uploading || recording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      alert("Voice recording is not supported on this device/browser.");
      return;
    }

    unlockAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickVoiceRecordingMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        clearRecordingTimer();
        setRecording(false);
        const chunks = recordingChunksRef.current;
        recordingChunksRef.current = [];
        stopRecordingTracks();
        mediaRecorderRef.current = null;

        if (!chunks.length) return;
        const type = (recorder.mimeType || mimeType || "audio/webm").split(";")[0] || "audio/webm";
        const ext = audioExtensionForType(type);
        const blob = new Blob(chunks, { type });
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type });
        if (pendingAttachment?.previewUrl) {
          try { URL.revokeObjectURL(pendingAttachment.previewUrl); } catch {}
        }
        setPendingAttachment({
          file,
          previewUrl: URL.createObjectURL(blob),
          kind: "audio",
        });
      };

      recorder.start();
      setRecordingSeconds(0);
      setRecording(true);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch (err) {
      stopRecordingTracks();
      clearRecordingTimer();
      setRecording(false);
      alert("Could not start voice recording. Please allow microphone access.");
    }
  }

  function stopVoiceRecording(silent = false) {
    clearRecordingTimer();
    try {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      } else {
        stopRecordingTracks();
        mediaRecorderRef.current = null;
      }
    } catch {
      stopRecordingTracks();
      mediaRecorderRef.current = null;
    }
    setRecording(false);
    if (!silent) setRecordingSeconds(0);
  }

  function speakMessage(msg) {
    const messageText = String(msg?.text || "").trim();
    const attachmentText = Array.isArray(msg?.attachments) && msg.attachments.length
      ? msg.attachments.some((a) => a?.kind === "audio") ? "Voice message." : "Attachment message."
      : "";
    const textToSpeak = [messageText, attachmentText].filter(Boolean).join(" ");
    if (!textToSpeak) return;
    speakText(textToSpeak, { lang: "en-IN", rate: 0.92, maxLength: 180 });
  }

  useEffect(() => {
    let cancelled = false;
    setBlockStatus(null);
    if (!chat?.id || chat?.isGroup) return;

    async function loadBlockStatus() {
      try {
        const token = getToken() || localStorage.getItem("mahima_token") || localStorage.getItem("authToken") || localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/chats/${chat.id}/block-status`, {
          headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: "include",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setBlockStatus(json);
      } catch {
        if (!cancelled) setBlockStatus(null);
      }
    }

    loadBlockStatus();
    return () => { cancelled = true; };
  }, [chat?.id, chat?.isGroup]);

  /* load history + polling fallback */
  useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    async function load(showSpinner = false) {
      const activeChatId = chat?.id;
      if (!activeChatId) { setMessages([]); return; }
      if (showSpinner) setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/chats/${activeChatId}/messages?page=1&size=100`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${getToken() || ""}`,
          },
          credentials: "include",
        });
        if (!res.ok) throw new Error(`History load failed (${res.status})`);
        const txt = await res.text();
        let data;
        try { data = JSON.parse(txt); } catch { data = []; }
        const list = Array.isArray(data?.items) ? data.items
          : Array.isArray(data?.data) ? data.data
          : Array.isArray(data) ? data
          : [];
        const normalized = list.map(normalizeMessage);
        if (!cancelled && String(activeChatId) === String(chat?.id)) {
          setMessages(mergeMessages([], normalized, activeChatId));
        }
      } catch (e) {
        if (!cancelled && showSpinner) setMessages([]);
        console.warn("[ChatWindow] loadHistory failed", e);
      } finally {
        if (!cancelled && showSpinner) setLoading(false);
      }
    }

    load(true);
    intervalId = setInterval(() => {
      if (!document.hidden) load(false);
    }, isConnected ? 8000 : 3000);

    const onFocus = () => load(false);
    const onVisibility = () => { if (!document.hidden) load(false); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [chat?.id, isConnected]);
  /* signalr */
  useEffect(() => {
    if (!connection) return;

    const onReceive = (msg) => {
      const n = normalizeMessage(msg);
      if (String(n.chatId) !== String(chat?.id)) return;
      const fromMe = String(n.senderId) === String(meId);

      setMessages((prev) => {
        if (prev.some((m) => m.id === n.id)) return prev;
        if (fromMe) {
          const draftIndex = prev.findIndex((m) =>
            m.status === "sending" &&
            String(m.chatId) === String(n.chatId) &&
            String(m.text || "") === String(n.text || "")
          );
          if (draftIndex >= 0) {
            const next = [...prev];
            const draft = prev[draftIndex];
            const serverAttachments = Array.isArray(n.attachments) ? n.attachments : [];
            next[draftIndex] = {
              ...n,
              attachments: serverAttachments.length ? serverAttachments : draft.attachments,
              status: "sent",
            };
            return next;
          }
        }
        return mergeMessages(prev, [n], chat?.id);
      });

      // Play notification only for messages from other users, and at most
      // once per ~600ms to avoid stacking on bursts.
      if (!fromMe) {
        const now = Date.now();
        if (now - lastReceiveSoundRef.current > 600) {
          lastReceiveSoundRef.current = now;
          playReceiveSound();
        }
      }
    };

    const onTyping = (payload) => {
      const cid = payload?.chatId ?? payload?.ChatId;
      if (String(cid) !== String(chat?.id)) return;
      const fromMe = String(payload?.fromUserId ?? "") === String(meId);
      if (fromMe) return;
      setTyping(true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTyping(false), 2500);
    };

    const onReadReceipt = (payload) => {
      if (String(payload?.chatId) !== String(chat?.id)) return;
      if (String(payload?.userId ?? "") === String(meId)) return;
      // mark all my messages as read
      setMessages((prev) => prev.map((m) =>
        String(m.senderId) === String(meId) ? { ...m, status: "read" } : m
      ));
    };

    const onMessageDeleted = (payload) => {
      const cid = payload?.chatId ?? payload?.ChatId;
      const mid = payload?.messageId ?? payload?.MessageId;
      if (String(cid) !== String(chat?.id) || !mid) return;
      setMessages((prev) => prev.filter((m) => String(m.id) !== String(mid)));
    };

    const onChatBlockChanged = async (payload) => {
      const cid = payload?.chatId ?? payload?.ChatId;
      if (String(cid) !== String(chat?.id)) return;
      try {
        const token = getToken() || localStorage.getItem("mahima_token") || localStorage.getItem("authToken") || localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/chats/${chat.id}/block-status`, {
          headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: "include",
        });
        if (res.ok) setBlockStatus(await res.json());
      } catch {}
    };

    connection.on("ReceiveMessage", onReceive);
    connection.on("UserTyping", onTyping);
    connection.on("ReadReceipt", onReadReceipt);
    connection.on("MessageDeleted", onMessageDeleted);
    connection.on("ChatBlockChanged", onChatBlockChanged);
    return () => {
      try { connection.off?.("ReceiveMessage", onReceive); } catch {}
      try { connection.off?.("UserTyping", onTyping); } catch {}
      try { connection.off?.("ReadReceipt", onReadReceipt); } catch {}
      try { connection.off?.("MessageDeleted", onMessageDeleted); } catch {}
      try { connection.off?.("ChatBlockChanged", onChatBlockChanged); } catch {}
      clearTimeout(typingTimeoutRef.current);
    };
  }, [connection, chat?.id, meId]);

  /* mark as read on open / focus */
  useEffect(() => {
    if (!chat?.id) return;
    const markRead = async () => {
      try {
        await fetch(`${API_BASE}/chats/${chat.id}/read`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken() || ""}`,
          },
          credentials: "include",
          body: "{}",
        });
      } catch { /* ignore */ }
    };
    markRead();
    const onFocus = () => markRead();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [chat?.id]);

  /* attachments */

  function pickFile() {
    fileInputRef.current?.click();
  }

  function onFileChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = "";  // allow re-picking same file
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const isAudio = file.type.startsWith("audio/");
    const isDocument = /^(application\/pdf|text\/|application\/msword|application\/vnd\.openxmlformats|application\/vnd\.ms-|application\/zip)/i.test(file.type) || /\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip)$/i.test(file.name);
    if (!isImage && !isVideo && !isAudio && !isDocument) {
      alert("Please pick an image, video, audio, or document.");
      return;
    }

    // Cap at 25 MB to avoid hanging the upload.
    if (file.size > 100 * 1024 * 1024) {
      alert("File too large (max 100 MB).");
      return;
    }

    setPendingAttachment({
      file,
      previewUrl: URL.createObjectURL(file),
      kind: isImage ? "image" : isVideo ? "video" : isAudio ? "audio" : "file",
    });
  }

  function clearAttachment() {
    if (pendingAttachment?.previewUrl) {
      try { URL.revokeObjectURL(pendingAttachment.previewUrl); } catch {}
    }
    setPendingAttachment(null);
  }

  async function uploadAttachment(file) {
    const token = getToken();
    const fd = new FormData();
    fd.append("file", file);

    let res;
    try {
      res = await fetch(`${API_BASE}/uploads`, {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
        body: fd,
      });
    } catch (err) {
      throw new Error("Upload service is not reachable. Please check the server and Nginx /api proxy.");
    }

    if (!res.ok) {
      const message = await res.text().catch(() => "");
      throw new Error(message || `Upload failed with HTTP ${res.status}`);
    }

    const j = await res.json().catch(() => null);
    const url = j?.absoluteUrl || j?.AbsoluteUrl || j?.url || j?.Url || j?.location;
    if (!url) throw new Error("Upload completed but the server did not return a file URL.");

    return { url: resolveMediaUrl(url), contentType: file.type };
  }

  /* sending */

  async function sendMessage() {
    const trimmed = text.trim();
    if (!chat?.id) return;
    if (blockStatus?.isBlocked || blockStatus?.IsBlocked) return;
    if (!trimmed && !pendingAttachment) return;
    unlockAudio();

    // Snapshot the attachment so user can keep typing while we upload.
    const attachmentSnapshot = pendingAttachment;
    let attachments = [];
    let attachmentUrl = null;
    let contentType = "text";

    // Optimistic draft (with local preview URL while upload is in flight).
    const draft = {
      id: "draft-" + Math.random().toString(36).slice(2),
      chatId: chat.id,
      senderId: meId || "me",
      text: trimmed,
      createdAt: new Date().toISOString(),
      status: "sending",
      attachments: attachmentSnapshot
        ? [{
            url: attachmentSnapshot.previewUrl,
            contentType: attachmentSnapshot.file.type,
            kind: attachmentSnapshot.kind,
          }]
        : [],
    };
    setMessages((prev) => mergeMessages(prev, [draft], chat.id));
    setText("");
    setPendingAttachment(null);

    const finalize = (status, serverResponse) => {
      const serverMessage = serverResponse ? normalizeMessage(serverResponse) : null;
      const serverAttachments = Array.isArray(serverMessage?.attachments) ? serverMessage.attachments : [];
      const resolvedServerMessage = serverMessage
        ? {
            ...serverMessage,
            attachments: serverAttachments.length ? serverAttachments : attachments,
            attachmentUrl: serverMessage.attachmentUrl || attachmentUrl,
          }
        : null;

      setMessages((prev) => {
        const next = prev.map((m) => {
          if (m.id !== draft.id) return m;
          return resolvedServerMessage
            ? { ...resolvedServerMessage, status }
            : { ...m, status, attachments: attachments.length ? attachments : m.attachments, _server: serverResponse };
        });
        return mergeMessages([], next, chat.id);
      });
      if (status === "sent") playSendSound();
      if (status === "sent") onMessageCreated(resolvedServerMessage || { ...draft, attachments, status: "sent" });
    };

    // Upload the attachment (if any) first.
    if (attachmentSnapshot) {
      setUploading(true);
      try {
        const uploaded = await uploadAttachment(attachmentSnapshot.file);
        attachmentUrl = uploaded.url;
        contentType = uploaded.contentType || attachmentSnapshot.kind;
        attachments = [{
          url: uploaded.url,
          contentType: uploaded.contentType,
          kind: attachmentSnapshot.kind,
        }];
        // Replace local preview URL with the uploaded URL on the draft.
        setMessages((prev) => prev.map((m) =>
          m.id === draft.id
            ? { ...m, attachments }
            : m
        ));
      } catch (err) {
        console.error("[ChatWindow] upload failed", err);
        alert("Couldn't upload attachment: " + (err?.message || err));
        finalize("failed");
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    const attachmentMarker = encodeAttachmentMarker(attachments);
    const persistedText = attachmentMarker
      ? `${trimmed}${trimmed ? "\n" : ""}${attachmentMarker}`
      : trimmed;

    const sendPayload = {
      chatId: chat.id,
      text: persistedText,
      content: persistedText,
      contentType,
      attachmentUrl,
      attachments,
    };

    // Try SignalR first
    if (connection?.invoke) {
      try {
        const created = await connection.invoke("SendMessage", sendPayload);
        finalize("sent", created);
        return;
      } catch (err) {
        console.warn("[ChatWindow] SignalR send failed, falling back to HTTP", err);
      }
    }

    // HTTP fallback
    try {
      const token = getToken()
        || localStorage.getItem("mahima_token")
        || localStorage.getItem("authToken")
        || localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/chats/${chat.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          Content: persistedText,
          content: persistedText,
          text: persistedText,
          contentType,
          attachmentUrl,
          AttachmentUrl: attachmentUrl,
          attachments,
        }),
      });
      if (!res.ok) {
        finalize("failed");
        return;
      }
      const json = await res.json().catch(() => null);
      finalize("sent", json);
    } catch (e) {
      console.error("[ChatWindow] HTTP send failed", e);
      finalize("failed");
    }
  }

  function deleteForMe(msg) {
    if (!chat?.id || !msg?.id) return;
    const key = deletedMessageKey(chat.id, msg.id);
    setDeletedForMe((prev) => {
      const next = { ...prev, [key]: true };
      writeJsonStore(MESSAGE_DELETE_KEY, next);
      return next;
    });
    setMessages((prev) => prev.filter((m) => String(m.id) !== String(msg.id)));
    setMessageMenu(null);
  }

  async function deleteForEveryone(msg) {
    if (!chat?.id || !msg?.id) return;
    if (!window.confirm("Delete this message for everyone?")) return;
    try {
      const token = getToken() || localStorage.getItem("mahima_token") || localStorage.getItem("authToken") || localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/chats/${chat.id}/messages/${msg.id}/everyone`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
      });
      if (!res.ok && res.status !== 404) throw new Error(await res.text().catch(() => "Delete failed"));
      setMessages((prev) => prev.filter((m) => String(m.id) !== String(msg.id)));
      setMessageMenu(null);
    } catch (err) {
      alert("Could not delete message: " + (err?.message || err));
    }
  }

  function retryMessage(msg) {
    if (msg.status !== "failed") return;
    // Remove the failed draft, push the text back into the box, and let
    // the user hit send again. Cleaner than silent auto-retry.
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    setText((t) => (t ? t + " " : "") + (msg.text || ""));
    taRef.current?.focus();
  }

  /* derived */

  const derivedTitle = useMemo(() => {
    if (!chat) return "Conversation";
    if (!chat.isGroup) {
      const directName = chat.otherName || chat.otherDisplayName || chat.otherUsername || null;
      if (directName && String(directName).trim()) return String(directName).trim();

      const directId = chat.otherId ?? null;
      if (directId) {
        const u = usersMap?.[String(directId)];
        if (u) return u.displayName || u.name || u.username || String(directId);
      }
    }

    const myName = usersMap?.[String(meId)]?.displayName
      || usersMap?.[String(meId)]?.name || null;

    if (chat.name && String(chat.name).trim()) {
      const c = String(chat.name).trim();
      if (!(myName && c === myName)) return c;
    }

    const lm = chat.lastMessage ?? (messages.length ? messages[0] : null);
    if (lm) {
      const lmId = lm.senderId ?? lm.fromUserId ?? lm.userId
        ?? (lm.sender && (lm.sender.id ?? lm.sender.userId)) ?? null;
      const lmName = lm.senderName ?? lm.fromName
        ?? lm.sender?.displayName ?? lm.sender?.name ?? null;
      if (lmId && String(lmId) !== String(meId)) {
        if (lmName) return lmName;
        const u = usersMap?.[String(lmId)];
        if (u) return u.displayName || u.name || u.username || String(lmId);
        return String(lmId);
      }
      if (lmName && !(myName && lmName === myName)) return lmName;
    }

    const otherId = chat.otherId ?? null;
    if (otherId) {
      const u = usersMap?.[String(otherId)];
      if (u) return u.displayName || u.name || u.username || String(otherId);
      return String(otherId);
    }
    const members = chat.members ?? chat.participants ?? chat.users ?? [];
    if (Array.isArray(members)) {
      for (const m of members) {
        if (!m) continue;
        const id = typeof m === "string" ? m : (m.id ?? m.userId ?? m._id ?? m.uuid);
        if (id && String(id) !== String(meId)) {
          const u = usersMap?.[String(id)];
          if (u) return u.displayName || u.name || u.username || String(id);
          return typeof m === "string" ? id : (m.displayName || m.name || m.username || id);
        }
      }
    }
    return chat.title ?? "Conversation";
  }, [chat, messages, usersMap, meId]);

  const peerUserId = useMemo(() => {
    if (!chat || chat.isGroup) return null;
    const directId = chat.otherId ?? chat.otherUserId ?? chat.other?.id ?? null;
    if (directId) return String(directId);

    const members = chat.members ?? chat.participants ?? chat.users ?? [];
    if (!Array.isArray(members)) return null;
    for (const member of members) {
      const id = typeof member === "string" ? member : (member?.id ?? member?.userId ?? member?._id ?? member?.uuid);
      if (id && String(id) !== String(meId)) return String(id);
    }
    return null;
  }, [chat, meId]);

  const isPeerOnline = useMemo(() => {
    if (!peerUserId) return false;
    if (onlineUserIds instanceof Set) return onlineUserIds.has(String(peerUserId));
    if (Array.isArray(onlineUserIds)) return onlineUserIds.map(String).includes(String(peerUserId));
    return false;
  }, [onlineUserIds, peerUserId]);

  const iBlockedThem = Boolean(blockStatus?.iBlockedThem ?? blockStatus?.IBlockedThem);
  const theyBlockedMe = Boolean(blockStatus?.theyBlockedMe ?? blockStatus?.TheyBlockedMe);
  const isDirectBlocked = Boolean((blockStatus?.isBlocked ?? blockStatus?.IsBlocked) ?? (iBlockedThem || theyBlockedMe));

  async function toggleBlockUser() {
    if (!chat?.id || chat?.isGroup || blockBusy) return;
    const action = iBlockedThem ? "unblock" : "block";
    const ok = window.confirm(iBlockedThem
      ? `Unblock ${derivedTitle}?`
      : `Block ${derivedTitle}? They will not be able to message or call you.`);
    if (!ok) return;

    setBlockBusy(true);
    try {
      const token = getToken() || localStorage.getItem("mahima_token") || localStorage.getItem("authToken") || localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/chats/${chat.id}/block`, {
        method: action === "block" ? "POST" : "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Block request failed"));
      setBlockStatus(await res.json());
    } catch (err) {
      alert(err?.message || "Could not update block status.");
    } finally {
      setBlockBusy(false);
    }
  }

  // Insert date separators between messages.
  const renderedItems = useMemo(() => {
    const out = [];
    let lastDay = null;
    for (const m of messages) {
      if (deletedForMe[deletedMessageKey(chat?.id, m.id)]) continue;
      const d = dayjs(m.createdAt).startOf("day").toISOString();
      if (d !== lastDay) {
        lastDay = d;
        out.push({ kind: "date", id: "d-" + d, label: dateLabel(m.createdAt) });
      }
      out.push({ kind: "msg", id: m.id, msg: m });
    }
    return out;
  }, [messages, deletedForMe, chat?.id]);

  const onTypingInput = () => {
    try {
      connection?.invoke?.("Typing", { chatId: chat?.id }).catch(() => {});
    } catch { /* ignore */ }
  };

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    writeMuted(next);
  };

  if (!chat) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-600/10 flex items-center justify-center mb-4">
          <Send className="w-9 h-9 text-emerald-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800">Jai Masih</h2>
        <p className="mt-1 text-sm text-slate-500 max-w-sm">
          Choose a chat from the left, or start a new one to begin a conversation.
        </p>
      </div>
    );
  }

  /* render */

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f6f1e8]"
         style={{
           // WhatsApp-style faint pattern background
           backgroundImage: "linear-gradient(rgba(255,255,255,0.28), rgba(255,255,255,0.28)), url(\"data:image/svg+xml,%3Csvg width='72' height='72' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23065f46' fill-opacity='0.035'%3E%3Cpath d='M36 10l4 8-4 8-4-8zM12 44l3 6-3 6-3-6zM60 44l3 6-3 6-3-6z'/%3E%3C/g%3E%3C/svg%3E\")",
         }}
    >
      {/* HEADER */}
      <header className="flex shrink-0 items-center gap-2 border-b border-emerald-900/10 bg-emerald-700 px-3 py-3 text-white shadow-sm sm:px-4">
        <button
          onClick={onBack}
          className="md:hidden w-11 h-11 rounded-full hover:bg-white/10 active:bg-white/20 flex items-center justify-center"
          aria-label="Back"
          type="button"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={openGroupInfo}
          disabled={!chat?.isGroup}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-black text-white shadow ring-2 ring-white/20 disabled:cursor-default"
          style={{ background: colorFromId(chat.id) }}
          title={chat?.isGroup ? "View group info" : undefined}
          aria-label={chat?.isGroup ? "View group info" : "Chat avatar"}
        >
          {initialsFrom(derivedTitle)}
        </button>
        <button
          type="button"
          onClick={openGroupInfo}
          disabled={!chat?.isGroup}
          className="flex-1 min-w-0 text-left disabled:cursor-default"
          title={chat?.isGroup ? "View group info" : undefined}
        >
          <div className="truncate text-base font-black">{derivedTitle}</div>
          <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-emerald-100/90">
            {iBlockedThem ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-200 inline-block" />
                Blocked
              </>
            ) : theyBlockedMe ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-200 inline-block" />
                You are blocked
              </>
            ) : typing ? (
              <span className="inline-flex items-center gap-1.5">
                <TypingDots /> typing...
              </span>
            ) : !isConnected ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Connecting...
              </span>
            ) : chat?.isGroup ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 inline-block" />
                Group chat
              </>
            ) : isPeerOnline ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block" />
                Online
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-100/60 inline-block" />
                Offline
              </>
            )}
            {loading && <span className="hidden sm:inline opacity-75">- loading</span>}
          </div>
        </button>

        <button
          onClick={onStartAudioCall}
          disabled={isDirectBlocked}
          type="button"
          title="Voice call"
          aria-label="Voice call"
          className="w-11 h-11 rounded-full hover:bg-white/10 active:bg-white/20 flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Phone className="w-5 h-5" />
        </button>
        <button
          onClick={onStartVideoCall}
          disabled={isDirectBlocked}
          type="button"
          title="Video call"
          aria-label="Video call"
          className="w-11 h-11 rounded-full hover:bg-white/10 active:bg-white/20 flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Video className="w-5 h-5" />
        </button>
        <button
          onClick={toggleMute}
          type="button"
          title={muted ? "Unmute notifications" : "Mute notifications"}
          aria-label={muted ? "Unmute notifications" : "Mute notifications"}
          className="w-11 h-11 rounded-full hover:bg-white/10 active:bg-white/20 flex items-center justify-center shrink-0"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        {!chat?.isGroup && peerUserId && (
          <button
            onClick={toggleBlockUser}
            disabled={blockBusy}
            type="button"
            title={iBlockedThem ? "Unblock user" : "Block user"}
            aria-label={iBlockedThem ? "Unblock user" : "Block user"}
            className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${iBlockedThem ? "bg-red-500/80 hover:bg-red-500" : "hover:bg-white/10 active:bg-white/20"}`}
          >
            {blockBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Ban className="w-5 h-5" />}
          </button>
        )}
      </header>

      {groupInfoOpen && chat?.isGroup && (
        <div className="fixed inset-0 z-[160] bg-slate-900/40 flex items-end sm:items-center justify-center p-3"
             onClick={() => setGroupInfoOpen(false)}>
          <div className="w-full max-w-md max-h-[84vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col"
               onClick={(e) => e.stopPropagation()}
               role="dialog"
               aria-modal="true"
               aria-label="Group information">
            <div className="bg-emerald-700 text-white px-4 py-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold shadow"
                   style={{ background: colorFromId(chat.id) }}>
                {initialsFrom(derivedTitle)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold truncate">{derivedTitle}</div>
                <div className="text-xs text-emerald-100">
                  {groupInfo?.memberCount ?? groupInfo?.members?.length ?? 0} members
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGroupInfoOpen(false)}
                className="w-9 h-9 rounded-full hover:bg-white/15 flex items-center justify-center"
                aria-label="Close group info"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-800 px-3 py-1 text-xs font-semibold">
                <Users className="w-3.5 h-3.5" />
                Group members
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {groupInfoLoading && (
                <div className="py-8 flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading members...
                </div>
              )}
              {groupInfoError && !groupInfoLoading && (
                <div className="m-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{groupInfoError}</span>
                </div>
              )}
              {!groupInfoLoading && !groupInfoError && (groupInfo?.members || []).map((member) => {
                const display = member.displayName || member.username || member.email || member.userId;
                return (
                  <div key={member.userId} className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0">
                    <div className="w-10 h-10 rounded-full text-white flex items-center justify-center font-semibold shrink-0"
                         style={{ background: colorFromId(member.userId) }}>
                      {initialsFrom(display)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 truncate">{display}</div>
                      {(member.email || member.username) && (
                        <div className="text-xs text-slate-500 truncate">{member.email || member.username}</div>
                      )}
                    </div>
                    {member.isAdmin ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 px-2 py-1 text-[11px] font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" /> Admin
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-1 text-[11px] font-semibold">
                        Member
                      </span>
                    )}
                  </div>
                );
              })}
              {!groupInfoLoading && !groupInfoError && (!groupInfo?.members || groupInfo.members.length === 0) && (
                <div className="px-4 py-8 text-center text-sm text-slate-500">No members found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MESSAGES */}
      <div ref={scrollerRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-8">
        {messages.length === 0 && !loading && (
          <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-white/70 bg-white/75 px-5 py-4 text-center text-sm font-semibold text-slate-500 shadow-sm backdrop-blur">
            No messages yet. Say hello!
          </div>
        )}
        {renderedItems.map((it) => {
          if (it.kind === "date") {
            return (
              <div key={it.id} className="my-4 flex justify-center">
                <span className="rounded-full border border-white/70 bg-white/85 px-3 py-1 text-[11px] font-bold text-slate-600 shadow-sm backdrop-blur">
                  {it.label}
                </span>
              </div>
            );
          }
          const m = it.msg;
          const mine = meId ? String(m.senderId) === String(meId) : (m.senderId === "me");
          return (
            <MessageBubble
              key={m.id}
              msg={m}
              mine={mine}
              onRetry={() => retryMessage(m)}
              onOpenMenu={() => setMessageMenu(messageMenu?.id === m.id ? null : m)}
              menuOpen={messageMenu?.id === m.id}
              canDeleteForEveryone={mine && !String(m.id).startsWith("draft-")}
              onDeleteForMe={() => deleteForMe(m)}
              onDeleteForEveryone={() => deleteForEveryone(m)}
              onSpeak={() => speakMessage(m)}
            />
          );
        })}
      </div>

      {/* INPUT */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 bg-slate-50 px-3 py-3"
           style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>

        {isDirectBlocked && (
          <div className="mx-1 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 text-center">
            {iBlockedThem
              ? `You blocked ${derivedTitle}. Unblock to send messages or calls.`
              : `${derivedTitle} has blocked this chat.`}
          </div>
        )}

        {/* Hidden file input — triggered by the paperclip button. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
          className="hidden"
          onChange={onFileChosen}
        />

        {/* Pending attachment preview */}
        {pendingAttachment && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            {pendingAttachment.kind === "image" ? (
              <img
                src={pendingAttachment.previewUrl}
                alt="preview"
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : pendingAttachment.kind === "video" ? (
              <video
                src={pendingAttachment.previewUrl}
                className="w-12 h-12 rounded-lg object-cover"
                muted
              />
            ) : pendingAttachment.kind === "audio" ? (
              <div className="min-w-0 flex-1">
                <audio
                  src={pendingAttachment.previewUrl}
                  controls
                  preload="auto"
                  playsInline
                  className="w-full max-w-[320px]"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="flex-1 min-w-0 text-xs">
              <div className="font-medium truncate">{pendingAttachment.file.name}</div>
              <div className="text-slate-500">
                {(pendingAttachment.file.size / 1024).toFixed(0)} KB
                {uploading && " - uploading..."}
              </div>
            </div>
            <button
              type="button"
              onClick={clearAttachment}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
              aria-label="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={pickFile}
            disabled={uploading || isDirectBlocked}
            title="Attach photo or video"
            aria-label="Attach photo or video"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-200/80 active:bg-slate-300/80 disabled:opacity-50"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <button
            onClick={voiceListening ? stopVoiceInput : startVoiceInput}
            disabled={isDirectBlocked || loading || uploading || voiceBusy}
            aria-label={voiceListening ? "Stop voice typing" : "Voice to text"}
            title={voiceListening ? "Stop voice typing" : "Voice to text"}
            type="button"
            className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 ${
              voiceListening
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "text-slate-600 hover:bg-slate-200/70 active:bg-slate-300/70"
            }`}
          >
            {voiceListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={recording ? () => stopVoiceRecording(false) : startVoiceRecording}
            disabled={isDirectBlocked || loading || uploading || voiceBusy || voiceListening}
            aria-label={recording ? "Stop voice message" : "Record voice message"}
            title={recording ? "Stop voice message" : "Record voice message"}
            type="button"
            className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 ${
              recording
                ? "bg-red-600 text-white hover:bg-red-700"
                : "text-slate-600 hover:bg-slate-200/70 active:bg-slate-300/70"
            }`}
          >
            {recording ? <MicOff className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <div className="flex min-w-0 flex-1 items-end rounded-[1.4rem] border border-slate-200 bg-white shadow-sm focus-within:border-emerald-200 focus-within:ring-4 focus-within:ring-emerald-100">
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => { setText(e.target.value); if (!isDirectBlocked) onTypingInput(); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !isTouchDevice()) {
                  e.preventDefault();
                  if (!isDirectBlocked) sendMessage();
                }
              }}
              onFocus={unlockAudio}
              placeholder={isDirectBlocked ? (iBlockedThem ? "Unblock to send a message" : "Messages unavailable") : "Type a message"}
              rows={1}
              disabled={isDirectBlocked}
              className="min-w-0 flex-1 resize-none border-0 bg-transparent px-4 py-3 text-sm leading-5 outline-none"
            />
            {recording && (
              <div className="pr-3 pb-2 text-xs font-bold text-red-600">
                {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, "0")}
              </div>
            )}
          </div>

          <button
            onClick={sendMessage}
            disabled={isDirectBlocked || (!text.trim() && !pendingAttachment) || uploading}
            aria-label="Send message"
            type="button"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----- bubble ----- */

function MessageBubble({
  msg,
  mine,
  onRetry,
  onOpenMenu,
  menuOpen,
  canDeleteForEveryone,
  onDeleteForMe,
  onDeleteForEveryone,
  onSpeak,
}) {
  const time = dayjs(msg.createdAt).format("HH:mm");
  const hasAttachments = Array.isArray(msg.attachments) && msg.attachments.length > 0;

  return (
    <div className={`flex overflow-visible ${mine ? "justify-end" : "justify-start"} my-2`}>
      <div className={`group/message relative min-w-[120px] max-w-[84%] overflow-visible rounded-2xl shadow-sm ring-1 ring-black/5 sm:max-w-[58%] ${
        mine ? "bg-[#d9fdd3] text-slate-900" : "bg-white text-slate-900"
      }`}>
        <button
          type="button"
          onClick={onOpenMenu}
          className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-slate-500 opacity-0 shadow-sm ring-1 ring-black/5 transition hover:bg-white focus:opacity-100 group-hover/message:opacity-100 active:scale-95"
          aria-label="Message options"
          title="Message options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {menuOpen && (
          <div className={`absolute top-9 ${mine ? "right-0" : "left-0"} z-30 w-56 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1 text-sm shadow-2xl`}>
            <button
              type="button"
              onClick={onSpeak}
              className="flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
            >
              <Volume2 className="h-4 w-4" /> Read aloud
            </button>
            <button
              type="button"
              onClick={onDeleteForMe}
              className="flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
            >
              <Trash2 className="h-4 w-4" /> Delete for me
            </button>
            {canDeleteForEveryone && (
              <button
                type="button"
                onClick={onDeleteForEveryone}
                className="flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" /> Delete for everyone
              </button>
            )}
          </div>
        )}
        {hasAttachments && (
          <div className="flex flex-col overflow-hidden rounded-t-2xl">
            {msg.attachments.map((a, i) => <Attachment key={i} att={a} />)}
          </div>
        )}

        <div className={hasAttachments ? "px-3.5 pb-2 pt-2.5" : "px-3.5 py-2.5"}>
          {msg.text && (
            <div className="whitespace-pre-wrap break-words pr-8 text-[15px] leading-6">
              {msg.text}
            </div>
          )}

          <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${
            mine ? "text-slate-500" : "text-slate-400"
          }`}>
            <span>{time}</span>
            {mine && <Tick status={msg.status} />}
          </div>

          {msg.status === "failed" && (
            <button
              onClick={onRetry}
              className="mt-1 inline-flex items-center gap-1 text-[11px] text-red-600 font-semibold"
              title="Retry"
            >
              <AlertCircle className="w-3 h-3" /> Failed - tap to retry
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Attachment({ att }) {
  const url = att?.url;
  const kind = att?.kind || (att?.contentType?.startsWith("video/") ? "video"
                            : att?.contentType?.startsWith("image/") ? "image"
                            : att?.contentType?.startsWith("audio/") ? "audio"
                            : "file");
  const audioRef = useRef(null);
  const [audioError, setAudioError] = useState("");
  if (!url) return null;

  if (kind === "image") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={url}
          alt=""
          loading="lazy"
          className="max-w-full max-h-[320px] object-cover bg-slate-100"
        />
      </a>
    );
  }
  if (kind === "video") {
    return (
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className="max-w-full max-h-[320px] bg-black"
      />
    );
  }
  if (kind === "audio") {
    const playVoice = async () => {
      setAudioError("");
      unlockAudio();
      const audio = audioRef.current;
      if (!audio) return;
      try {
        audio.muted = false;
        audio.volume = 1;
        await audio.play();
      } catch (err) {
        console.warn("Audio play blocked:", url, err);
        setAudioError("Tap the audio bar or check phone media volume.");
      }
    };

    return (
      <div className="px-3 pt-3 min-w-[240px] space-y-2">
        {/* No crossOrigin attr — Android WebView's HTML5 audio handles
            cross-origin "no-cors" media playback fine, and nginx doesn't
            send CORS headers for /uploads/* so requesting CORS would
            actually break playback. */}
        <audio
          ref={audioRef}
          src={url}
          controls
          preload="auto"
          playsInline
          onError={(e) => {
            console.warn("Audio failed to load:", url, e?.nativeEvent);
            setAudioError("Voice note could not load. Please retry.");
          }}
          className="w-full"
        />
        <button
          type="button"
          onClick={playVoice}
          className="inline-flex min-h-9 items-center gap-2 rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-black text-white shadow-sm active:bg-emerald-800"
        >
          <Volume2 className="h-4 w-4" />
          Play voice
        </button>
        {audioError ? <div className="text-[11px] font-semibold text-red-600">{audioError}</div> : null}
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
       className="text-xs text-blue-600 underline px-3 py-2 inline-block">
      Open file
    </a>
  );
}

function Tick({ status }) {
  if (status === "sending") return <Loader2 className="w-3 h-3 animate-spin" />;
  if (status === "failed") return <AlertCircle className="w-3 h-3 text-red-500" />;
  if (status === "read") return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
  if (status === "delivered") return <CheckCheck className="w-3.5 h-3.5" />;
  return <Check className="w-3.5 h-3.5" />;
}

function TypingDots() {
  return (
    <span className="inline-flex gap-0.5 items-end">
      <span className="w-1 h-1 bg-white/80 rounded-full animate-pulse" />
      <span className="w-1 h-1 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
      <span className="w-1 h-1 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
    </span>
  );
}

