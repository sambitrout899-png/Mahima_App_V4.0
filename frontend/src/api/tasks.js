// src/tasks.js

import { apiFetchJson } from "../utils/fetch-auth-shim";

/**
 * ✅ CLEAN TASKS API
 * - NO /api prefix
 * - NO axios
 * - NO call() helper
 * - Fully aligned with fetch-auth-shim
 */

function cleanPayload(p) {
  if (!p) return {};
  const obj = { ...p };

  delete obj.id;
  delete obj.Id;

  return obj;
}

export const tasksApi = {
  list: () => apiFetchJson("/tasks"),

  get: (id) => apiFetchJson(`/tasks/${id}`),

  create: (p) =>
    apiFetchJson("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cleanPayload(p)),
    }),

  update: (id, p) =>
    apiFetchJson(`/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cleanPayload(p)),
    }),

  remove: (id) =>
    apiFetchJson(`/tasks/${id}`, {
      method: "DELETE",
    }),

  // ✅ FIX FOR YOUR CALENDAR ERROR
  calendar: () => apiFetchJson("/tasks/calendar"),
};

export default tasksApi;
