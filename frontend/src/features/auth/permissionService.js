// src/features/auth/permissionService.js
import { apiFetch } from "../../utils/fetch-auth-shim";

function getStoredUser() {
  try {
    const s = localStorage.getItem("mahima_user");
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const user = await apiFetch("/auth/me", { retryPublicApi: true });
    if (user) {
      localStorage.setItem("mahima_user", JSON.stringify(user));
      return user;
    }
  } catch {}

  return getStoredUser();
}

function normalizeRoles(user) {
  if (!user) return [];

  return [user.role, ...(user.roles || [])]
    .map((r) => (typeof r === "string" ? r : r?.name || r?.roleName || r?.id))
    .filter(Boolean)
    .map((r) => String(r).toLowerCase());
}

function isAdmin(user) {
  const roles = normalizeRoles(user);

  return roles.includes("admin") || user?.username?.toLowerCase() === "admin";
}

export async function canAccessPage(pageKey) {
  if (!pageKey) return false;

  const user = await getCurrentUser();
  if (!user) return false;
  if (isAdmin(user)) return true;

  const key = String(pageKey).toUpperCase();
  const pages = Array.isArray(user.pages)
    ? user.pages.map((p) => String(p).toUpperCase())
    : [];

  return pages.includes(key);
}

export function clearPermissionCache() {}

export default {
  getCurrentUser,
  canAccessPage,
  clearPermissionCache,
};
