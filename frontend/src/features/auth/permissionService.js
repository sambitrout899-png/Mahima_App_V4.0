// src/features/auth/permissionService.js

/* ---------------- STORAGE ---------------- */

function getStoredUser() {
  try {
    const s = localStorage.getItem("mahima_user");
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

/* ---------------- USER ---------------- */

export async function getCurrentUser() {
  // ✅ ALWAYS use stored user (from login)
  const user = getStoredUser();
  return user || null;
}

/* ---------------- HELPERS ---------------- */

// 🔥 Normalize ALL possible role formats
function normalizeRoles(user) {
  if (!user) return [];

  return [
    user.role,
    ...(user.roles || []),
  ]
    .map((r) =>
      typeof r === "string"
        ? r
        : r?.name || r?.roleName || r?.id
    )
    .filter(Boolean)
    .map((r) => String(r).toLowerCase());
}

// 🔥 STRONG ADMIN CHECK (fixes your issue)
function isAdmin(user) {
  const roles = normalizeRoles(user);

  return (
    roles.includes("admin") ||
    user?.username?.toLowerCase() === "admin"
  );
}

/* ---------------- MAIN ACCESS ---------------- */

export async function canAccessPage(pageKey) {
  if (!pageKey) return false;

  const user = await getCurrentUser();
  if (!user) return false;

  // ✅ ADMIN → FULL ACCESS (NO RESTRICTION)
  if (isAdmin(user)) return true;

  const key = String(pageKey).toLowerCase();

  // ✅ fallback safe
  const pages = Array.isArray(user.pages)
    ? user.pages.map((p) => String(p).toLowerCase())
    : [];

  return pages.includes(key);
}

/* ---------------- UTIL ---------------- */

export function clearPermissionCache() {
  // no-op (kept for compatibility)
}

/* ---------------- EXPORT ---------------- */

export default {
  getCurrentUser,
  canAccessPage,
  clearPermissionCache,
};
