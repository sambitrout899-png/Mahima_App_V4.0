const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001/api";

let _rolesCache = null;
let _rolesPromise = null;

function normalizePages(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload.map(p => {
      if (!p && p !== 0) return null;
      if (typeof p === "string") return p;
      if (typeof p === "number") return String(p);
      return p.page_key || p.pageKey || p.key || p.name || null;
    }).filter(Boolean);
  }
  if (typeof payload === "string") {
    return payload.split(",").map(s => s.trim()).filter(Boolean);
  }
  return [];
}

async function fetchJson(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function fetchRolesMap() {
  if (_rolesCache) return _rolesCache;
  if (_rolesPromise) return _rolesPromise;

  _rolesPromise = (async () => {
    try {
      const rolesResp = await fetchJson(`${API_BASE}/roles`);
      const items = rolesResp ? (rolesResp.items || rolesResp.data || rolesResp) : [];
      const roles = Array.isArray(items) ? items : [];

      const map = {};
      for (const r of roles) {
        const idKey = r.id != null ? String(r.id) : null;
        const name = r.name || "";
        const pages = normalizePages(r.pages || r.allowedPages || r.pagesAllowed || []);
        // store normalized (lowercase) page keys for case-insensitive matching
        const pageArr = (Array.isArray(pages) ? pages : []).map(p => String(p).toLowerCase());

        if (name) {
          map[name] = pageArr;
          map[name.toLowerCase()] = pageArr;
        }
        if (idKey) {
          map[idKey] = pageArr;
        }
      }

      _rolesCache = map;
      return _rolesCache;
    } catch (err) {
      console.warn("permissionService: failed to load roles:", err);
      _rolesCache = {};
      return _rolesCache;
    } finally {
      _rolesPromise = null;
    }
  })();

  return _rolesPromise;
}

function getStoredUser() {
  try {
    const s = window.localStorage?.getItem?.("mahima_user");
    if (!s) return null;
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function decodeJwt(token) {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const stored = getStoredUser();
  if (stored) return stored;

  try {
    const tok = window.localStorage?.getItem?.("mahima_token");
    if (tok) {
      const payload = decodeJwt(tok);
      if (payload) {
        const role = payload.role ?? payload.roles ?? payload["role"] ?? payload["roles"];
        const username = payload.sub || payload.preferred_username || payload.name || payload.username;
        return { ...payload, username, role };
      }
    }
  } catch { /* ignore */ }

  try {
    const r = await fetch(`${API_BASE}/users/me`, { credentials: "include" });
    if (r.ok) {
      const j = await r.json();
      return j;
    }
  } catch { /* ignore */ }

  return null;
}

function toRoleIdString(roleIdent) {
  if (roleIdent == null) return null;
  if (typeof roleIdent === "object") {
    if (roleIdent.id != null) return String(roleIdent.id);
    if (roleIdent.name) return String(roleIdent.name).toLowerCase();
    return null;
  }
  return String(roleIdent);
}

export function roleHasPage(roleIdent, pageKey) {
  if (!roleIdent || !pageKey) return false;
  if (!_rolesCache) return false;

  // compare using normalized lower-case page keys
  const wanted = String(pageKey).toLowerCase();
  const tryKeys = [];

  if (typeof roleIdent === "object") {
    if (roleIdent.id != null) tryKeys.push(String(roleIdent.id));
    if (roleIdent.name) {
      tryKeys.push(roleIdent.name, roleIdent.name.toLowerCase());
    }
  } else if (Array.isArray(roleIdent)) {
    for (const r of roleIdent) tryKeys.push(String(r));
  } else {
    const s = String(roleIdent);
    tryKeys.push(s, s.toLowerCase(), s.toUpperCase());
  }

  for (const k of tryKeys) {
    const pages = _rolesCache[k];
    if (Array.isArray(pages) && pages.includes(wanted)) return true;
  }
  return false;
}

function isAdminRole(role) {
  // accepts: numeric 3, string "3", "Admin", "admin", object { id:3 }, arrays etc.
  if (role == null) return false;
  if (Array.isArray(role)) {
    return role.some(r => isAdminRole(r));
  }
  if (typeof role === "object") {
    if (role.id != null && Number(role.id) === 3) return true;
    if (role.name && String(role.name).toLowerCase() === "admin") return true;
    return false;
  }
  const s = String(role).trim().toLowerCase();
  return s === "admin" || s === "3";
}

export async function canAccessPage(pageKey) {
  if (!pageKey) return false;
  await fetchRolesMap();
  const user = await getCurrentUser();
  if (!user) return false;

  const role = user.role ?? user.Role ?? user.RoleId ?? user.roleId ?? user.RoleName ?? user.roleName;

  // Admin bypass â€” case-insensitive page keys
  if (isAdminRole(role)) {
    // Admin always allowed for administrative UI pages â€” case-insensitive check
    const adminAlwaysPages = ["pages", "roles"]; // lower-case
    if (adminAlwaysPages.includes(String(pageKey).toLowerCase())) return true;
    // (OPTIONAL) To allow admin everywhere uncomment next line:
    // return true;
  }

  if (!role) return false;

  if (Array.isArray(role)) {
    return role.some(rn => roleHasPage(rn, pageKey));
  }
  if (typeof role === "object" && (role.id != null || role.name)) {
    return roleHasPage(role, pageKey);
  }

  return roleHasPage(role, pageKey);
}

export function clearPermissionCache() {
  _rolesCache = null;
  _rolesPromise = null;
}


