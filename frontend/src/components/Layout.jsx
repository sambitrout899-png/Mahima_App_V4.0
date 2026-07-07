// src/components/Layout.jsx
//
// Modern app shell:
//   - Collapsible sidebar (desktop) with grouped nav + icons
//   - Slide-in drawer (mobile) ï¿½ hamburger opens it
//   - Sticky topbar with logo, page title, chat icon, notifications, user menu
//   - Chat shortcut lives in the topbar (no floating overlay over page content)
//   - Tailwind classes throughout, no inline-style soup
//   - lucide-react icons everywhere ï¿½ kills the mojibake (â˜°, â–¾, ðŸ’¬)
//
import React, { useEffect, useRef, useState } from "react";
import {
  NavLink,
  Outlet,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  Home,
  Headphones,
  HandHeart,
  ListChecks,
  Users,
  Shield,
  BookOpen,
  CalendarCheck,
  IndianRupee,
  Receipt,
  Heart,
  Droplets,
  MessageCircle,
  ShieldCheck,
  MessageSquare,
  Menu as MenuIcon,
  X,
  ChevronLeft,
  ChevronDown,
  LogOut,
  Bell,
  Bot,
  Activity,
  CalendarClock,
  Download,
  Layers,
  FileText,
  Mail,
  Cloud,
  Languages,
  FolderOpen,
  Camera,
  Loader2,
  Save,
  UserCircle,
  BarChart3,
  GitBranch,
  BriefcaseBusiness,
} from "lucide-react";
import { logout as authLogout } from "../features/auth/authService";
import mahimaLogo from "../assets/mahima-logo.png";
import { getCurrentUser } from "../features/auth/permissionService";
import { getToken } from "../utils/auth";
import { API_BASE } from "../api";
import { useChatConnection } from "../hooks/useChatConnection";
import AiPastorAgent from "./AiPastorAgent";
import TodayUpdateCorner from "./TodayUpdateCorner";
import CallOverlay from "./CallOverlay";
import useChatCall from "../hooks/useChatCall";
import { requestNotificationPermission, unlockAudio, preloadVoices, notifyIncomingMessage } from "../utils/chatNotifications";
import { registerMobilePushNotifications } from "../utils/mobilePushNotifications";
import { ensurePushTokenRegistered, flushPendingFcmToken, runNotificationSelfTest } from "../utils/initNativeApp";
import { useLanguage } from "../i18n/LanguageContext";
import { assignedPositions, getActivePosition, resetActivePosition, scopeLabel, setActivePosition } from "../utils/positionContext";

/* ======================================================================== */
/*  Navigation                                                               */
/* ======================================================================== */
//
// Items use absolute /home/x paths so we never rely on the route-redirects
// (those still work but introduce a flash). NavLink resolves relative to
// the route tree, but using absolute paths keeps the active state correct
// on deep links like /home/teams/:teamId/members.
//
const NAV_GROUPS = [
  {
    label: "General",
    items: [
      { key: "DASHBOARD",       label: "Home",            to: "/home",                icon: Home },
      { key: "PASTOR",          label: "AI Counseller",       to: "/home/pastor",         icon: Bot },
      { key: "README",          permissionKey: "PASTOR",  label: "ReadMe",           to: "/home/readme",         icon: Camera },
      { key: "APP_DOWNLOADS",   label: "App Downloads",   to: "/home/app-downloads",  icon: Download },
      { key: "SERMONS",         label: "Sermons",         to: "/home/sermons",        icon: Headphones },
      { key: "PRAYER_REQUESTS", label: "Prayer Requests", to: "/home/prayerrequests", icon: HandHeart },
      { key: "TASKS",           label: "Tasks",           to: "/home/tasks",          icon: ListChecks },
      { key: "PROJECT_MANAGEMENT", label: "Project Management", to: "/home/project-management", icon: BriefcaseBusiness },
    ],
  },
  {
    label: "Community",
    items: [
      { key: "USERS", label: "Users", to: "/home/users", icon: Users },
      { key: "TEAMS", label: "Teams", to: "/home/teams", icon: Layers },
      { key: "ROLES", label: "Roles", to: "/home/roles", icon: Shield },
      { key: "PAGES", label: "Pages", to: "/home/pages", icon: BookOpen },
      { key: "POSITIONS", label: "Positions", to: "/home/positions", icon: GitBranch },
    ],
  },
  {
    label: "Operations",
    items: [
      { key: "ATTENDANCE", label: "Attendance", to: "/home/attendance", icon: CalendarCheck },
      { key: "PAYROLL",    label: "Payroll",    to: "/home/payroll",    icon: IndianRupee },
      { key: "COSTS",      label: "Costs",      to: "/home/costs",      icon: Receipt },
    ],
  },
  {
    label: "Ministry",
    items: [
      { key: "MARRIAGE",    label: "Marriage",    to: "/home/marriage",    icon: Heart },
      { key: "BAPTISM",     label: "Baptism",     to: "/home/baptism",     icon: Droplets },
      { key: "COUNSELLING", label: "Counselling", to: "/home/counselling", icon: MessageCircle },
    ],
  },
  {
    label: "Admin",
    items: [
      { key: "ADMIN_DASHBOARD", label: "Admin Dashboard", to: "/home/admin/dashboard", icon: ShieldCheck },
      { key: "LIVE_USERS", label: "Live Users", to: "/home/admin/live-users", icon: Activity },
      { key: "MESSAGE_CENTER", label: "Message Center", to: "/home/admin/ministry-automation", icon: CalendarClock },
      { key: "LANGUAGES", label: "Languages", to: "/home/admin/languages", icon: Languages },
      { key: "EMAIL_CLIENT", label: "Email Client", to: "/home/admin/email", icon: Mail },
      { key: "GOOGLE_DRIVE", label: "Google Drive", to: "/home/admin/google-drive", icon: Cloud },
      { key: "SERVER_FILES", label: "Server Files", to: "/home/admin/server-files", icon: FolderOpen },
      { key: "REPORTS", label: "Reports", to: "/home/admin/reports", icon: BarChart3 },
      { key: "AUDIT_TRAIL", label: "Audit Trail", to: "/home/admin/audit-trail", icon: FileText },
    ],
  },
];

const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items);

const NAV_LABEL_KEYS = {
  DASHBOARD: "nav.home",
  PASTOR: "nav.aiPastor",
  README: "nav.readMe",
  APP_DOWNLOADS: "nav.appDownloads",
  SERMONS: "nav.sermons",
  PRAYER_REQUESTS: "nav.prayerRequests",
  TASKS: "nav.tasks",
  PROJECT_MANAGEMENT: "nav.projectManagement",
  USERS: "nav.users",
  TEAMS: "nav.teams",
  ROLES: "nav.roles",
  PAGES: "nav.pages",
  POSITIONS: "nav.positions",
  ATTENDANCE: "nav.attendance",
  PAYROLL: "nav.payroll",
  COSTS: "nav.costs",
  MARRIAGE: "nav.marriage",
  BAPTISM: "nav.baptism",
  COUNSELLING: "nav.counselling",
  ADMIN_DASHBOARD: "nav.adminDashboard",
  LIVE_USERS: "nav.liveUsers",
  MESSAGE_CENTER: "nav.messageCenter",
  LANGUAGES: "nav.languages",
  EMAIL_CLIENT: "nav.emailClient",
  GOOGLE_DRIVE: "nav.googleDrive",
  SERVER_FILES: "nav.serverFiles",
  REPORTS: "nav.reports",
  AUDIT_TRAIL: "nav.auditTrail",
};

const GROUP_LABEL_KEYS = {
  General: "nav.general",
  Community: "nav.community",
  Operations: "nav.operations",
  Ministry: "nav.ministry",
  Admin: "nav.admin",
};

function navLabel(item, t) {
  const key = NAV_LABEL_KEYS[item?.key] || item?.label || "";
  const translated = t(key);
  return translated === key ? (item?.label || key) : translated;
}

// Default keys per role when the user has no `pages` claim of their own.
const ROLE_DEFAULT_KEYS = {
  admin: ALL_NAV.map((n) => n.key),
  member: ["DASHBOARD", "APP_DOWNLOADS", "SERMONS", "PRAYER_REQUESTS", "PAGES"],
  staff: ["DASHBOARD", "APP_DOWNLOADS", "SERMONS", "PRAYER_REQUESTS", "TASKS", "PROJECT_MANAGEMENT", "ATTENDANCE", "PAGES"],
  volunteer: ["DASHBOARD", "APP_DOWNLOADS", "SERMONS", "PRAYER_REQUESTS", "TASKS", "PAGES"],
  pastor: ["DASHBOARD", "APP_DOWNLOADS", "USERS", "ATTENDANCE", "BAPTISM", "COUNSELLING", "PAYROLL"],
};

/* ======================================================================== */
/*  Layout                                                                   */
/* ======================================================================== */

const SIDEBAR_KEY = "mahima_sidebar_collapsed";

function isMobileAppMode() {
  try {
    return (
      import.meta.env.MODE === "mobile" ||
      Boolean(window.Capacitor?.isNativePlatform?.())
    );
  } catch {
    return false;
  }
}

function resolveProfilePhoto(url = "") {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  const origin = API_BASE.replace(/\/api\/?$/i, "");
  return `${origin}${value.startsWith("/") ? "" : "/"}${value}`;
}

function readStoredLayoutUser() {
  const keys = ["mahima_user", "me", "mahima:user", "currentUser", "mahima_currentUser", "user"];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const user = parsed?.user || parsed?.data?.user || parsed;
      if (user && (user.id || user.Id || user.userId || user.username || user.email || user.displayName)) {
        return user;
      }
    } catch {}
  }
  return null;
}

function storeLayoutUser(user) {
  if (!user) return;
  try {
    const value = JSON.stringify(user);
    localStorage.setItem("mahima_user", value);
    localStorage.setItem("me", value);
    localStorage.setItem("currentUser", value);
  } catch {}
}

function incomingMessagePreview(msg) {
  const text = msg?.text ?? msg?.content ?? msg?.body ?? "";
  if (String(text).trim()) return String(text).trim();
  const attachments = msg?.attachments || msg?.Attachments;
  if (Array.isArray(attachments) && attachments.length) return "Attachment";
  if (msg?.attachmentUrl || msg?.AttachmentUrl) return "Attachment";
  return "New chat message";
}

function incomingSenderName(msg) {
  return msg?.senderName || msg?.SenderName || msg?.fromName || msg?.FromName || msg?.sender?.displayName || "Jai Masih";
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang, languages, t } = useLanguage();
  const mobileAppMode = isMobileAppMode();

  const [user, setUser] = useState(() => {
    return readStoredLayoutUser();
  });
  const [allowedKeys, setAllowedKeys] = useState(new Set());
  const [permissionRefreshKey, setPermissionRefreshKey] = useState(0);

  // UI state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === "1"
  );
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayName: "", profilePhotoUrl: "", status: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [notificationTesting, setNotificationTesting] = useState(false);
  const [activePosition, setActivePositionState] = useState(() => getActivePosition());
  const userMenuRef = useRef(null);
  const chatToken = getToken();
  const chatConnection = useChatConnection(chatToken);

  useEffect(() => {
    let cancelled = false;
    const timers = [];

    const syncPush = async () => {
      if (cancelled) return;
      try {
        await ensurePushTokenRegistered();
        await registerMobilePushNotifications(user);
        await flushPendingFcmToken();
      } catch (err) {
        console.warn("[layout] mobile push sync failed", err);
      }
    };

    syncPush();
    [2500, 7000, 15000, 30000].forEach((delayMs) => {
      timers.push(window.setTimeout(syncPush, delayMs));
    });

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [user?.id, user?.Id, user?.userId]);

  useEffect(() => {
    const handler = () => {
      unlockAudio();
      preloadVoices();
      requestNotificationPermission();
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };
    window.addEventListener("click", handler);
    window.addEventListener("keydown", handler);
    window.addEventListener("touchstart", handler);
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, []);

  useEffect(() => {
    const conn = chatConnection.connection;
    if (!conn) return;

    const handler = (msg) => {
      if (location.pathname.startsWith("/home/chat")) return;
      const myId = user?.id || user?.Id || user?.userId || "";
      const senderId = msg?.senderId ?? msg?.fromUserId ?? msg?.userId ?? "";
      if (myId && senderId && String(myId) === String(senderId)) return;

      const chatId = msg?.chatId ?? msg?.ChatId;
      notifyIncomingMessage({
        chatId,
        senderName: incomingSenderName(msg),
        preview: incomingMessagePreview(msg),
        onClick: () => navigate("/home/chat"),
      });
    };

    conn.on("ReceiveMessage", handler);
    return () => {
      try { conn.off("ReceiveMessage", handler); } catch {}
    };
  }, [chatConnection.connection, location.pathname, navigate, user?.id, user?.Id, user?.userId]);

  // Close menus on route change.
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user?.id && !user?.Id && !user?.userId) return;

    const token = getToken();
    const path = `${location.pathname || ""}${location.search || ""}${location.hash || ""}` || "/home";

    fetch(`${API_BASE}/admin/daily-routines/page-visit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({
        path,
        title: document?.title || "Mahima",
        referrer: document?.referrer || "",
      }),
    }).catch(() => {});
  }, [location.pathname, location.search, location.hash, user?.id, user?.Id, user?.userId]);

  useEffect(() => {
    const refresh = () => setPermissionRefreshKey((value) => value + 1);
    window.addEventListener("mahima:permissions-changed", refresh);
    return () => window.removeEventListener("mahima:permissions-changed", refresh);
  }, []);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click outside user menu.
  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [userMenuOpen]);

  // Persist collapsed state.
  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Load fresh user + permissions.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fromApi = await getCurrentUser().catch(() => null);
      let finalUser = fromApi;
      if (fromApi) {
        storeLayoutUser(fromApi);
      } else {
        finalUser = readStoredLayoutUser();
      }
      if (cancelled || !finalUser) return;

      setUser(finalUser);
      const defaultPosition = resetActivePosition(finalUser);
      setActivePositionState(defaultPosition || getActivePosition(finalUser));

      const roles = [finalUser.role, ...(Array.isArray(finalUser.roles) ? finalUser.roles : [])]
        .map((r) => (typeof r === "string" ? r : r?.name || r?.roleName || r?.role))
        .filter(Boolean)
        .map((r) => String(r).toLowerCase());
      const userPages = (Array.isArray(finalUser.pages) ? finalUser.pages : [])
        .map((p) => String(p).toUpperCase());
      const isAdmin = roles.includes("admin");
      const fallbackKeys = roles.flatMap((r) => ROLE_DEFAULT_KEYS[r] || []);
      const keys = isAdmin ? ROLE_DEFAULT_KEYS.admin : userPages.length > 0 ? userPages : fallbackKeys;
      setAllowedKeys(new Set(keys));
    })();
    return () => { cancelled = true; };
  }, [permissionRefreshKey]);

  useEffect(() => {
    if (!user?.id && !user?.Id && !user?.userId) return;
    let cancelled = false;

    async function refreshProfile() {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/users/me/profile`, {
          headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: "include",
        });
        if (!res.ok) return;
        const profile = await res.json();
        if (cancelled) return;
        setUser((current) => {
          const next = {
            ...(current || {}),
            displayName: profile?.displayName || current?.displayName,
            profilePhotoUrl: profile?.profilePhotoUrl || current?.profilePhotoUrl,
            status: profile?.status ?? current?.status,
          };
          storeLayoutUser(next);
          return next;
        });
      } catch {}
    }

    refreshProfile();
    return () => { cancelled = true; };
  }, [user?.id, user?.Id, user?.userId]);

  useEffect(() => {
    if (!profileOpen) return;
    let cancelled = false;

    async function loadProfile() {
      setProfileLoading(true);
      setProfileMessage("");
      setProfileForm({
        displayName: user?.displayName || user?.displayname || user?.username || "",
        profilePhotoUrl: user?.profilePhotoUrl || user?.ProfilePhotoUrl || "",
        status: user?.status || "",
      });

      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/users/me/profile`, {
          headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: "include",
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (cancelled) return;
        setProfileForm({
          displayName: data?.displayName || data?.displayname || "",
          profilePhotoUrl: data?.profilePhotoUrl || data?.ProfilePhotoUrl || "",
          status: data?.status || "",
        });
      } catch (err) {
        if (!cancelled) setProfileMessage(t("layout.profileLoadFailed"));
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }

    loadProfile();
    return () => { cancelled = true; };
  }, [profileOpen, user]);

  async function uploadProfilePhoto(file) {
    if (!file) return;
    setProfileUploading(true);
    setProfileMessage("");
    try {
      const token = getToken();
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/uploads`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const url = data?.absoluteUrl || data?.url || data?.AbsoluteUrl || data?.Url || "";
      if (!url) throw new Error("Upload succeeded but no image URL was returned.");
      setProfileForm((current) => ({ ...current, profilePhotoUrl: url }));
    } catch (err) {
      setProfileMessage(err?.message || "Could not upload profile photo.");
    } finally {
      setProfileUploading(false);
    }
  }

  async function saveProfile() {
    setProfileSaving(true);
    setProfileMessage("");
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/users/me/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(profileForm),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      const nextUser = {
        ...(user || {}),
        displayName: updated?.displayName || profileForm.displayName,
        profilePhotoUrl: updated?.profilePhotoUrl || profileForm.profilePhotoUrl,
        status: updated?.status ?? profileForm.status,
      };
      setUser(nextUser);
      storeLayoutUser(nextUser);
      setProfileMessage(t("layout.profileUpdated"));
      window.setTimeout(() => setProfileOpen(false), 450);
    } catch (err) {
      setProfileMessage(err?.message || t("layout.profileSaveFailed"));
    } finally {
      setProfileSaving(false);
    }
  }

  function onPositionChange(event) {
    const next = assignedPositions(user).find((p) => String(p.id) === String(event.target.value));
    if (!next) return;
    const stored = setActivePosition(next);
    setActivePositionState(next);
    window.dispatchEvent(new CustomEvent("mahima:data-scope-changed", { detail: stored || next }));
  }

function onLogout() {
    authLogout();
    navigate("/login", { replace: true });
  }

  async function testMobileNotifications() {
    setNotificationTesting(true);
    try {
      const result = await runNotificationSelfTest();
      const localText = result?.local?.ok ? "Local tray: OK" : `Local tray: ${result?.local?.message || "failed"}`;
      const pushText = result?.push?.ok ? "Firebase push: requested" : `Firebase push: ${result?.push?.message || "failed"}`;
      const d = result?.diagnostics || {};
      const backend = d.backendStatus || {};
      const backendBody = typeof backend.body === "string" ? backend.body : JSON.stringify(backend.body || {});
      window.alert([
        localText,
        pushText,
        `Native: ${d.native ? "yes" : "no"} / ${d.capacitorPlatform || "unknown"}`,
        `Plugins: push=${d.hasPushPlugin ? "yes" : "no"}, local=${d.hasLocalPlugin ? "yes" : "no"}, firebase-token=${d.hasNativeTokenPlugin ? "yes" : "no"}, native-tray=${d.hasNativeTrayPlugin ? "yes" : "no"}`,
        `Auth token: ${d.authTokenPresent ? "yes" : "no"}`,
        `FCM token: ${d.localFcmToken || "none"}`,
        d.nativeTokenError ? `Native token error: ${d.nativeTokenError}` : "",
        d.nativeTrayError ? `Native tray error: ${d.nativeTrayError}` : "",
        d.nativeTrayShownAt ? `Native tray shown at: ${d.nativeTrayShownAt}` : "",
        `Token saved at: ${d.tokenSavedAt || "not yet"}`,
        `Backend status: ${backend.status || 0} ${backendBody}`,
      ].filter(Boolean).join("\n"));
    } catch (err) {
      window.alert(err?.message || "Notification test failed.");
    } finally {
      setNotificationTesting(false);
    }
  }

  // Filter nav groups: keep group only if at least one allowed item.
const visibleGroups = NAV_GROUPS
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => allowedKeys.has(i.permissionKey || i.key)),
    }))
    .filter((g) => g.items.length > 0);

  // Title for the topbar = current top-level page label.
  const currentNav = [...ALL_NAV]
    .sort((a, b) => b.to.length - a.to.length)
    .find((n) => location.pathname === n.to || location.pathname.startsWith(`${n.to}/`));
  const pageTitle = currentNav ? navLabel(currentNav, t) : "Mahima";

  const role = String(user?.role || user?.Role || "").toLowerCase();
  const canUsePastor = allowedKeys.has("PASTOR");
  const showTodayUpdate = location.pathname === "/home" || location.pathname === "/home/";
  const isFullBleedPage = location.pathname.startsWith("/home/chat");
  const globalCallsEnabled = !location.pathname.startsWith("/home/chat");
  const globalCall = useChatCall({
    connection: chatConnection.connection,
    chat: null,
    meId: user?.id || user?.Id || user?.userId || null,
    enabled: globalCallsEnabled,
  });
  const displayName =
    user?.displayName ||
    user?.DisplayName ||
    user?.name ||
    user?.Name ||
    user?.username ||
    user?.userName ||
    user?.UserName ||
    user?.email ||
    "User";
  const profilePhoto = resolveProfilePhoto(
    user?.profilePhotoUrl ||
    user?.ProfilePhotoUrl ||
    user?.avatarUrl ||
    user?.AvatarUrl ||
    user?.photoUrl ||
    user?.PhotoUrl ||
    user?.picture ||
    ""
  );
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "U";
  const userPositions = assignedPositions(user);
  const currentPosition = activePosition || getActivePosition(user);
  const activePositionId = String(currentPosition?.id || "");
  const activePositionRecord = userPositions.find((position) => String(position?.id || "") === activePositionId) || currentPosition;
  const activePositionName = activePositionRecord?.name || "No position assigned";
  const activePositionScope = activePositionRecord ? scopeLabel(activePositionRecord.visibilityScope) : "No data scope";
  const activePositionIsPrimary = Boolean(activePositionRecord?.isPrimary);
  const activePositionKind = activePositionRecord ? (activePositionIsPrimary ? "Primary" : "Secondary") : "Not assigned";
  const canSwitchPositions = userPositions.length > 1;

  return (
    <div className="mahima-app-shell min-h-screen flex">
      {/* ============== DESKTOP SIDEBAR ============== */}
      <aside
        className={`mahima-sidebar hidden md:flex flex-col border-r border-slate-200 bg-white transition-all duration-200 ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
        aria-label="Primary navigation"
      >
        {/* Brand */}
        <Link to="/home" className="h-14 flex items-center gap-2 px-4 border-b border-slate-100">
          <img
            src={mahimaLogo}
            alt=""
            className="w-12 h-12 rounded-full mahima-logo-spin-y"
          />
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-bold text-slate-900">Mahima</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Ministry</div>
            </div>
          )}
        </Link>

        {/* Nav */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {visibleGroups.map((g) => (
            <div key={g.label} className="mb-3">
              {!collapsed && (
                <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {t(GROUP_LABEL_KEYS[g.label] || g.label)}
                </div>
              )}
              <ul className="space-y-0.5">
                {g.items.map((item) => (
                  <SidebarLink key={item.to} item={item} collapsed={collapsed} label={navLabel(item, t)} />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="h-10 flex items-center justify-center gap-1.5 border-t border-slate-100 text-xs text-slate-500 hover:bg-slate-50"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>

      {/* ============== MOBILE DRAWER ============== */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[140]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside
            className="absolute inset-y-0 left-0 flex w-[min(19rem,calc(100vw-1.5rem))] max-w-[92vw] flex-col bg-white shadow-xl"
            style={mobileAppMode ? { paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" } : undefined}
          >
            <div
              className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-4"
            >
              <Link to="/home" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                <img
                  src={mahimaLogo}
                  alt=""
                  className="w-12 h-12 rounded-full mahima-logo-spin-y"
                />
                <div className="leading-tight">
                  <div className="text-sm font-bold">Mahima</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Ministry</div>
                </div>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                aria-label={t("layout.closeMenu")}
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <nav className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-2 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-3">
              {visibleGroups.map((g) => (
                <div key={g.label} className="mb-3">
                  <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {t(GROUP_LABEL_KEYS[g.label] || g.label)}
                  </div>
                  <ul className="space-y-0.5">
                    {g.items.map((item) => (
                      <SidebarLink key={item.to} item={item} collapsed={false} label={navLabel(item, t)} />
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* ============== MAIN ============== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className={`mahima-topbar ${mobileAppMode ? "mahima-native-topbar" : ""} sticky top-0 z-[90] min-h-14 bg-white border-b border-slate-200 flex flex-wrap items-center gap-2 px-2 sm:gap-3 sm:px-5 md:flex-nowrap`}
          style={mobileAppMode ? {
            minHeight: "calc(6.75rem + env(safe-area-inset-top))",
            paddingTop: "env(safe-area-inset-top)",
            paddingLeft: "max(0.5rem, env(safe-area-inset-left))",
            paddingRight: "max(0.5rem, env(safe-area-inset-right))",
          } : undefined}
        >
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"
            aria-label={t("layout.openMenu")}
          >
            <MenuIcon className="w-5 h-5 text-slate-700" />
          </button>

          {/* Mobile-only mini brand */}
          <Link to="/home" className="md:hidden flex min-w-0 items-center gap-1.5">
            <img
              src={mahimaLogo}
              alt=""
              className="w-9 h-9 rounded-full mahima-logo-spin-y"
            />
            <span className="mahima-mobile-brand-text text-sm font-bold text-slate-900">Mahima</span>
          </Link>

          {/* Page title */}
          <h1 className="hidden md:block text-base font-semibold text-slate-800 truncate">
            {pageTitle}
          </h1>

          <div className="mahima-topbar-spacer flex-1" />

          <div className="mahima-topbar-actions">
            {userPositions.length > 0 && (
              <label
                className={`mahima-position-picker ${canSwitchPositions ? "mahima-position-picker-switchable" : ""}`}
                title={canSwitchPositions ? "Switch active data visibility position" : "Your active data visibility position"}
                data-no-auto-translate
              >
                <GitBranch className="h-4 w-4 text-emerald-700" />
                <span className="mahima-position-copy">
                  <span className="mahima-position-eyebrow">{activePositionKind} position</span>
                  {canSwitchPositions ? (
                    <select value={activePositionId} onChange={onPositionChange} aria-label="Active position">
                      {userPositions.map((position) => (
                        <option key={position.id} value={position.id}>
                          {position.name} - {position.isPrimary ? "Primary" : "Secondary"} - {scopeLabel(position.visibilityScope)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="mahima-position-readonly">{activePositionName}</span>
                  )}
                </span>
                <span className="mahima-position-scope">{activePositionScope}</span>
              </label>
            )}
            <label className="mahima-language-picker" title={t("layout.language")} data-no-auto-translate>
              <Languages className="h-4 w-4 text-emerald-700" />
              <select
                value={lang}
                onChange={(event) => setLang(event.target.value)}
                aria-label={t("layout.language")}
              >
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.nativeName || language.name || language.code.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>

            {/* AI Counseller shortcut */}
            {canUsePastor && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("ai-pastor:open"))}
                className={`mahima-topbar-action inline-flex w-9 h-9 rounded-lg hover:bg-emerald-50 items-center justify-center transition ${
                  location.pathname.startsWith("/home/pastor")
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600"
                }`}
                aria-label={t("layout.openPastor")}
                title={t("layout.openPastor")}
              >
                <Bot className="w-5 h-5" />
                <span className="mahima-action-label">Pastor</span>
              </button>
            )}

            {/* Chat shortcut */}
            <button
              onClick={() => navigate("/home/chat")}
              className={`mahima-topbar-action inline-flex w-9 h-9 rounded-lg hover:bg-amber-50 items-center justify-center transition ${
                location.pathname.startsWith("/home/chat")
                  ? "bg-amber-50 text-amber-700"
                  : "text-slate-600"
              }`}
              aria-label={t("layout.openChat")}
              title={t("layout.openChat")}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="mahima-action-label">Chat</span>
            </button>

            {/* Notifications (placeholder) */}
            <button
              className="mahima-topbar-action inline-flex w-9 h-9 rounded-lg hover:bg-slate-100 items-center justify-center text-slate-600"
              aria-label={t("layout.notifications")}
              title={t("layout.notifications")}
            >
              <Bell className="w-5 h-5" />
              <span className="mahima-action-label">Alerts</span>
            </button>
          </div>

          {/* User menu */}
          <div className="mahima-user-menu relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="mahima-user-button flex items-center gap-2 pl-1 pr-2 sm:pr-3 py-1 rounded-full hover:bg-slate-100 transition"
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              {profilePhoto ? (
                <img src={profilePhoto} alt="" className="w-8 h-8 shrink-0 rounded-full object-cover shadow-sm" />
              ) : (
                <span className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                  {initials}
                </span>
              )}
              <span className="mahima-user-info flex min-w-0 flex-col items-start leading-tight">
                <span className="mahima-user-name text-xs font-semibold text-slate-800 max-w-[140px] truncate">
                  {displayName}
                </span>
                {role && (
                  <span className="mahima-user-role text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    {role}
                  </span>
                )}
              </span>
              <ChevronDown className="mahima-user-chevron w-3.5 h-3.5 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div
                role="menu"
                className="mahima-user-dropdown absolute right-0 z-[120] mt-2 w-60 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-sm font-semibold text-slate-900 truncate">{displayName}</div>
                  {user?.email && (
                    <div className="text-xs text-slate-500 truncate">{user.email}</div>
                  )}
                  {role && (
                    <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5">
                      {role}
                    </div>
                  )}
                  {activePositionRecord && (
                    <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Current data position</div>
                      <div className="mt-0.5 text-sm font-bold text-slate-900 truncate">{activePositionName}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-bold">
                        <span className="rounded-full bg-white px-2 py-0.5 text-emerald-800 ring-1 ring-emerald-100">{activePositionKind}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-slate-600 ring-1 ring-slate-100">{activePositionScope}</span>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    setProfileOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  role="menuitem"
                >
                  <UserCircle className="w-4 h-4" />
                  {t("layout.profile")}
                </button>
                {mobileAppMode && (
                  <button
                    onClick={testMobileNotifications}
                    disabled={notificationTesting}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    role="menuitem"
                  >
                    {notificationTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                    Test notifications
                  </button>
                )}
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  role="menuitem"
                >
                  <LogOut className="w-4 h-4" />
                  {mobileAppMode ? t("layout.logoutSwitch") : t("layout.logout")}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main
          className={`mahima-page-host flex-1 min-w-0 ${isFullBleedPage ? "mahima-page-host-full" : ""}`}
          style={mobileAppMode ? { paddingBottom: "env(safe-area-inset-bottom)" } : undefined}
        >
          {showTodayUpdate && <TodayUpdateCorner />}
          <div className={isFullBleedPage ? "mahima-page-frame mahima-page-frame-full" : "mahima-page-frame"}>
            <Outlet context={{ chatConnection }} />
          </div>
        </main>
      </div>

      {profileOpen && (
        <div className="fixed inset-0 z-[70] flex items-end bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <div className="text-lg font-bold text-slate-900">{t("layout.profileTitle")}</div>
                <div className="text-xs font-semibold text-slate-500">{t("layout.profileSubtitle")}</div>
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100"
                aria-label={t("common.close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[75dvh] overflow-y-auto px-5 py-5">
              <div className="flex items-center gap-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-amber-100">
                  {resolveProfilePhoto(profileForm.profilePhotoUrl) ? (
                    <img src={resolveProfilePhoto(profileForm.profilePhotoUrl)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-2xl font-black text-amber-900">{initials}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800">
                    {profileUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    {t("layout.uploadDp")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => uploadProfilePhoto(e.target.files?.[0])}
                    />
                  </label>
                  <p className="mt-2 text-xs font-semibold text-slate-500">{t("layout.photoHint")}</p>
                </div>
              </div>

              <label className="mt-5 block text-sm font-bold text-slate-700">
                {t("layout.displayName")}
                <input
                  value={profileForm.displayName}
                  onChange={(e) => setProfileForm((current) => ({ ...current, displayName: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-emerald-600"
                />
              </label>

              <label className="mt-4 block text-sm font-bold text-slate-700">
                {t("layout.status")}
                <textarea
                  value={profileForm.status}
                  onChange={(e) => setProfileForm((current) => ({ ...current, status: e.target.value }))}
                  rows={3}
                  maxLength={160}
                  placeholder={t("layout.statusPlaceholder")}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-emerald-600"
                />
              </label>

              {profileMessage && (
                <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                  {profileMessage}
                </div>
              )}
            </div>

            <div
              className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={saveProfile}
                disabled={profileSaving || profileLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {globalCallsEnabled && (
        <CallOverlay
          callState={globalCall.callState}
          peerName="Jai Masih call"
          peerId={globalCall.callState?.fromUserId}
          localStream={globalCall.localStream}
          remoteStream={globalCall.remoteStream}
          audioMuted={globalCall.audioMuted}
          videoOff={globalCall.videoOff}
          onAccept={globalCall.accept}
          onReject={globalCall.reject}
          onEnd={globalCall.endCall}
          onToggleMic={globalCall.toggleMic}
          onToggleCamera={globalCall.toggleCamera}
        />
      )}

      {canUsePastor && (
        <AiPastorAgent hidden={location.pathname.includes("/home/pastor")} showLauncher={false} />
      )}
    </div>
  );
}

/* ======================================================================== */
/*  Single sidebar link                                                      */
/* ======================================================================== */

function SidebarLink({ item, collapsed, label }) {
  const Icon = item.icon || FileText;
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.to === "/home"}
        className={({ isActive }) =>
          `group flex items-center ${
            collapsed ? "justify-center" : "gap-2.5"
          } rounded-lg px-3 py-2 text-sm font-medium transition ${
            isActive
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100 shadow-sm"
              : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
          }`
        }
        title={collapsed ? label : undefined}
      >
        {({ isActive }) => (
          <>
            <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-emerald-700" : "text-slate-500 group-hover:text-slate-700"}`} />
            {!collapsed && <span className="truncate">{label}</span>}
          </>
        )}
      </NavLink>
    </li>
  );
}


