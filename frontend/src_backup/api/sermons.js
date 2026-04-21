// src/api/sermons.js
// Sermons API helper used by Resources page

import { apiFetch, apiFetchJson } from "../utils/fetch-auth-shim";

// We use relative paths; apiFetch/apiFetchJson will prefix them with API_BASE.
// e.g. "/sermons" => http://localhost:5001/api/sermons in dev.

/**
 * List sermons.
 * Optional params: { search, page, pageSize, type, tag, speaker }
 */
export async function list(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      qs.append(key, String(val));
    }
  });

  const url =
    qs.toString().length > 0 ? `/sermons?${qs.toString()}` : "/sermons";

  return apiFetchJson(url, { method: "GET" });
}

/**
 * Create a new sermon.
 * `data` might be { title, speaker, url, notes, category, tags, ... }
 */
export async function create(data) {
  return apiFetchJson("/sermons", {
    method: "POST",
    body: JSON.stringify(data ?? {}),
  });
}

/**
 * Update an existing sermon by id.
 */
export async function update(id, data) {
  if (!id) throw new Error("sermons.update: id is required");
  return apiFetchJson(`/sermons/${id}`, {
    method: "PUT",
    body: JSON.stringify(data ?? {}),
  });
}

/**
 * Delete a sermon by id.
 */
export async function remove(id) {
  if (!id) throw new Error("sermons.remove: id is required");
  const res = await apiFetch(`/sermons/${id}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to delete sermon (HTTP ${res.status}): ${text || res.statusText}`
    );
  }
  return true;
}

// Backwards-compatible default export – this is what your Resources page imports
const api = {
  list,
  create,
  update,
  remove,
};

export default api;
