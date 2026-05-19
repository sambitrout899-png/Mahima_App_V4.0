import { apiFetch } from "./fetch-auth-shim";
import { getToken } from "./auth";
import { showSystemNotification } from "./chatNotifications";
import { optionalImportModule } from "./speech";

let registrationStarted = false;
let listenersAttached = false;

function isNativeApp() {
  try {
    return (
      import.meta.env.MODE === "mobile" ||
      Boolean(window.Capacitor?.isNativePlatform?.()) ||
      window.location?.protocol === "capacitor:"
    );
  } catch {
    return false;
  }
}

function currentUserId(user) {
  if (user?.id || user?.Id || user?.userId) return user.id || user.Id || user.userId;
  try {
    const raw = localStorage.getItem("mahima_user") || localStorage.getItem("user") || "{}";
    const parsed = JSON.parse(raw);
    return parsed?.id || parsed?.Id || parsed?.userId || null;
  } catch {
    return null;
  }
}

async function resolvePushPlugin() {
  const imported = await optionalImportModule("@capacitor/push-notifications").catch(() => null);
  return imported?.PushNotifications || window.Capacitor?.Plugins?.PushNotifications || null;
}

async function saveDeviceToken(pushToken, user) {
  const tokenValue = pushToken?.value || pushToken?.token || pushToken;
  if (!tokenValue || !getToken()) return;

  await apiFetch("/device-tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: String(tokenValue),
      platform: window.Capacitor?.getPlatform?.() || "mobile",
      appVersion: import.meta.env.VITE_APP_VERSION || "web",
      userId: currentUserId(user),
    }),
  }).catch((err) => {
    console.warn("[push] device token registration failed", err);
  });
}

export async function registerMobilePushNotifications(user = null) {
  if (!isNativeApp() || registrationStarted || !getToken()) return false;
  registrationStarted = true;

  const PushNotifications = await resolvePushPlugin();
  if (!PushNotifications?.requestPermissions || !PushNotifications?.register) {
    console.warn("[push] Capacitor PushNotifications plugin is not installed in this build.");
    return false;
  }

  if (!listenersAttached) {
    listenersAttached = true;

    PushNotifications.addListener?.("registration", (token) => {
      saveDeviceToken(token, user);
    });

    PushNotifications.addListener?.("registrationError", (err) => {
      console.warn("[push] registration error", err);
    });

    PushNotifications.addListener?.("pushNotificationReceived", (notification) => {
      const data = notification?.data || {};
      showSystemNotification("Jai Masih Di", {
        body: notification?.body || data.preview || data.message || "New chat message",
        tag: data.chatId ? `chat:${data.chatId}` : undefined,
        data: { kind: "message", ...data },
      });
    });

    PushNotifications.addListener?.("pushNotificationActionPerformed", (action) => {
      const data = action?.notification?.data || {};
      if (data.chatId || data.kind === "message") {
        window.location.hash = "/home/chat";
      }
    });
  }

  const permission = await PushNotifications.requestPermissions().catch(() => null);
  if (permission?.receive !== "granted" && permission?.receive !== "prompt") {
    console.warn("[push] notification permission not granted", permission);
    return false;
  }

  await PushNotifications.register();
  return true;
}
