// src/utils/chatNotifications.js
//
// Cross-platform notification helpers for the Jai Masih chat:
//   - Plays a short two-tone beep / "Jai Masih" voice when a new message arrives
//   - Triggers haptic feedback on mobile (Web Vibration API + Capacitor Haptics)
//   - Persists the user's mute preference in localStorage
//   - Browser Notification API banner when the tab is hidden / unfocused
//   - Active-tab + visibility helpers so callers can decide what to play
//
// Works in:
//   * Desktop / mobile web browsers (Web Audio API + Notification API)
//   * Capacitor Android & iOS apps (Web Audio + Haptics)
//
// Usage:
//   import {
//     playReceiveSound, playSendSound, unlockAudio, preloadVoices,
//     setMuted, isMuted,
//     requestNotificationPermission, notificationsAllowed,
//     showSystemNotification, notifyIncomingMessage, notifyIncomingCall,
//     isTabActive,
//   } from "./chatNotifications";
//
import mahimaLogoUrl from "../assets/mahima-logo.png";
import { speakText } from "./speech";

const STORAGE_KEY = "jm_chat_muted";
const NOTIFICATION_TITLE = "Jai Masih Di";
const DEFAULT_NOTIFICATION_ICON = mahimaLogoUrl;

let audioCtx = null;
function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try { audioCtx = new Ctor(); } catch { audioCtx = null; }
  }
  return audioCtx;
}

/* ---------- audio unlock + voices preload ---------------------------- */

let unlocked = false;
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

export function preloadVoices() {
  try {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.getVoices();
    synth.onvoiceschanged = () => synth.getVoices();
  } catch { /* ignore */ }
}

/* ---------- mute pref ------------------------------------------------ */

export function isMuted() {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; }
  catch { return false; }
}

export function setMuted(value) {
  try { localStorage.setItem(STORAGE_KEY, value ? "1" : "0"); } catch {}
}

/* ---------- tones + voice ------------------------------------------- */

function playBeep() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const tones = [
    { freq: 880, start: 0.00, dur: 0.10 },
    { freq: 1320, start: 0.12, dur: 0.12 },
  ];

  for (const { freq, start, dur } of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + start);
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(0.18, now + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.05);
  }
}

function buzz() {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([40, 30, 40]);
    }
  } catch { /* ignore */ }

  try {
    const cap = (typeof window !== "undefined" && window.Capacitor) || null;
    const haptics = cap?.Plugins?.Haptics;
    if (haptics?.impact) {
      haptics.impact({ style: "LIGHT" }).catch?.(() => {});
    }
  } catch { /* ignore */ }
}

function speakJaiMasih() {
  if (typeof window === "undefined") return false;
  if (window.Capacitor?.Plugins?.TextToSpeech?.speak && window.Capacitor?.isNativePlatform?.()) {
    return speakText(NOTIFICATION_TITLE, { lang: "hi-IN", rate: 0.95, maxLength: 80 });
  }

  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === "undefined") return false;

  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(NOTIFICATION_TITLE);
    u.rate = 0.95;
    u.pitch = 1.05;
    u.volume = 1.0;

    const voices = synth.getVoices() || [];
    const preferred =
      voices.find((v) => /hi-IN/i.test(v.lang)) ||
      voices.find((v) => /en-IN/i.test(v.lang)) ||
      voices.find((v) => /^en/i.test(v.lang));
    if (preferred) u.voice = preferred;
    u.lang = preferred?.lang || "en-IN";

    synth.speak(u);
    return true;
  } catch {
    return false;
  }
}

/* ---------- focus / visibility helpers ------------------------------ */

export function isTabActive() {
  if (typeof document === "undefined") return true;
  const visible = !document.hidden;
  const focused = typeof document.hasFocus === "function" ? document.hasFocus() : true;
  return visible && focused;
}

export function isTypingInChat() {
  if (typeof document === "undefined") return false;
  return /^(INPUT|TEXTAREA)$/i.test(document.activeElement?.tagName || "");
}

/* ---------- browser Notification API -------------------------------- */

export function notificationsSupported() {
  return typeof window !== "undefined"
    && typeof window.Notification !== "undefined";
}

export function notificationsAllowed() {
  if (!notificationsSupported()) return false;
  return window.Notification.permission === "granted";
}

function getLocalNotifications() {
  try {
    return window.Capacitor?.Plugins?.LocalNotifications || null;
  } catch {
    return null;
  }
}

function scheduleNativeNotification(title, options = {}) {
  const localNotifications = getLocalNotifications();
  if (!localNotifications?.schedule) return false;

  const {
    body = "",
    tag,
    data,
    requireInteraction = false,
  } = options;

  try {
    localNotifications.requestPermissions?.().catch?.(() => {});
    localNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Date.now() % 2147483000),
          title,
          body,
          largeIcon: DEFAULT_NOTIFICATION_ICON,
          channelId: "jai-masih",
          extra: { tag, requireInteraction, ...(data || {}) },
          schedule: { at: new Date(Date.now() + 80) },
        },
      ],
    }).catch?.((err) => console.warn("[chatNotifications] native notification failed", err));
    return true;
  } catch (err) {
    console.warn("[chatNotifications] native notification failed", err);
    return false;
  }
}

let permissionPromise = null;
export function requestNotificationPermission() {
  if (!notificationsSupported()) return Promise.resolve("unsupported");
  if (window.Notification.permission === "granted") return Promise.resolve("granted");
  if (window.Notification.permission === "denied") return Promise.resolve("denied");
  if (permissionPromise) return permissionPromise;
  try {
    permissionPromise = Promise.resolve(window.Notification.requestPermission())
      .then((result) => {
        permissionPromise = null;
        return result;
      })
      .catch(() => {
        permissionPromise = null;
        return "default";
      });
  } catch {
    permissionPromise = Promise.resolve("default");
  }
  return permissionPromise;
}

/**
 * Show a system (OS-level) notification. Caller passes onClick to focus the
 * window and open the right chat. Returns the Notification (or null).
 */
export function showSystemNotification(title, options = {}) {
  if (isMuted()) return null;
  if (scheduleNativeNotification(title, options)) return null;
  if (!notificationsSupported() || !notificationsAllowed()) return null;
  try {
    const {
      body = "",
      icon = DEFAULT_NOTIFICATION_ICON,
      tag,                  // e.g. "chat:<chatId>" ? replaces previous notif for same chat
      data,
      requireInteraction = false,
      silent = false,
      onClick,
    } = options;

    const n = new window.Notification(title, {
      body,
      icon,
      tag,
      data,
      requireInteraction,
      silent,
    });

    n.onclick = (ev) => {
      try { ev?.preventDefault?.(); } catch {}
      try { window.focus(); } catch {}
      try { onClick && onClick(ev); } catch {}
      try { n.close(); } catch {}
    };

    // Auto-close after 8s unless requireInteraction.
    if (!requireInteraction) {
      setTimeout(() => { try { n.close(); } catch {} }, 8000);
    }

    return n;
  } catch (err) {
    console.warn("[chatNotifications] showSystemNotification failed", err);
    return null;
  }
}

/* ---------- public message / call notifiers -------------------------- */

/**
 * Notify the user that a new message arrived in some chat.
 *   - In-tab (focused): voice + light buzz
 *   - Tab open but unfocused / hidden: system banner + beep + buzz
 *   - User typing in the open chat: just a buzz (don't talk over them)
 *
 * @param {object} opts
 *   - chatId, senderName, preview, onClick (focus + open chat callback)
 */
export function notifyIncomingMessage({
  chatId,
  senderName = "New message",
  preview = "",
  onClick,
} = {}) {
  if (isMuted()) return;

  if (isTabActive()) {
    if (isTypingInChat()) {
      buzz();
      return;
    }
    if (!speakJaiMasih()) playBeep();
    buzz();
    return;
  }

  // Tab not active: loud-ish system banner + small sound (if browser allows).
  showSystemNotification(NOTIFICATION_TITLE, {
    body: preview ? `${senderName}: ${String(preview).slice(0, 120)}` : "New chat message",
    tag: chatId ? `chat:${chatId}` : undefined,
    data: { kind: "message", chatId },
    onClick,
  });
  playBeep();
  buzz();
}

/**
 * Notify the user of an incoming call. Persistent banner with caller name.
 *
 * @param {object} opts
 *   - chatId, callerName, type ("audio"|"video"), onClick (accept/focus)
 */
export function notifyIncomingCall({
  chatId,
  callerName = "Incoming call",
  type = "audio",
  onClick,
} = {}) {
  if (isMuted()) {
    buzz(); // even when muted, vibrate for calls
    return;
  }

  // Always ring + buzz, even when the tab is foregrounded — calls are important.
  if (!speakJaiMasih()) playBeep();
  buzz();

  if (!isTabActive()) {
    showSystemNotification(NOTIFICATION_TITLE, {
      body: `${callerName}: incoming ${type} call. Tap to answer.`,
      tag: chatId ? `call:${chatId}` : "call",
      data: { kind: "call", chatId, type },
      requireInteraction: true,
      onClick,
    });
  }
}

/* ---------- legacy aliases (don't break old callers) ----------------- */

export function playReceiveSound() {
  if (isMuted()) return;
  if (isTabActive() && isTypingInChat()) { buzz(); return; }
  if (!speakJaiMasih()) playBeep();
  buzz();
}

export function playSendSound() {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(660, now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}
