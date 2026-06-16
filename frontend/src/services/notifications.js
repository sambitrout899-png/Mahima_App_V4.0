/**
 * DEPRECATED — this file is kept as an empty stub so existing imports don't break.
 * All native notification logic is in src/utils/initNativeApp.js and
 * src/utils/chatNotifications.js which use the Capacitor bridge directly
 * (window.Capacitor.Plugins.*) instead of static ESM imports.
 *
 * Static imports of @capacitor/* packages fail at build time because they are
 * native plugins, not npm packages.
 */

export function initPushNotifications() {
  // no-op — handled by initNativeApp.js
}
