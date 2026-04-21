import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Heart,
  Send,
  Loader2,
  Trash2,
  MessageCircle,
  X,
  Check,
} from "lucide-react";
import { getToken as getStoredToken } from "../auth/authService";
import { getCurrentUser } from "../auth/permissionService";

// ---------- API URL HELPERS ----------
const API_BASE =
  import.meta.env.VITE_API_BASE?.replace(/\/$/, "") || window.location.origin;

// will be: /api/prayerrequests in dev
const PRAYER_REQUESTS_URL = `${API_BASE}/prayerrequests`;

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} ${res.statusText || ""} – ${text || "Request failed"}`
    );
  }
  return res.json().catch(() => null);
};

// status → traffic-light dot color
const getStatusDotClass = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "new" || s === "open") return "bg-emerald-500";
  if (s === "prayed") return "bg-red-500";
  if (s === "closed") return "bg-slate-900";
  return "bg-slate-400";
};

const NORMALIZED_STATUSES = ["new", "open", "prayed", "closed"];

export default function PrayerRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [responseSubmitting, setResponseSubmitting] = useState(false);

  const tokenRef = useRef(getStoredToken());

  // admin utilities
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]); // for printing
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  // close-with-comment
  const [closingId, setClosingId] = useState(null);
  const [closeComment, setCloseComment] = useState("");
  const [closeSubmitting, setCloseSubmitting] = useState(false);

  // ---------- DETECT ADMIN ROLE ----------
  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        const rawRoles = [];
        if (u?.role && typeof u.role === "string") rawRoles.push(u.role);
        if (Array.isArray(u?.roles)) {
          for (const r of u.roles) {
            if (!r) continue;
            if (typeof r === "string") rawRoles.push(r);
            else if (typeof r.name === "string") rawRoles.push(r.name);
            else if (typeof r.roleName === "string") rawRoles.push(r.roleName);
          }
        }
        const rolesLower = rawRoles.map((r) => r.toLowerCase().trim());
        const admin = rolesLower.some((r) =>
          ["admin", "administrator", "superadmin"].includes(r)
        );
        setIsAdmin(admin);
      } catch (e) {
        console.error("Failed to resolve user roles", e);
        setIsAdmin(false);
      }
    })();
  }, []);

  // ---------- LOAD PRAYER REQUESTS ----------
  const loadRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const url = `${PRAYER_REQUESTS_URL}?includeResponses=true`;
      const data = await fetchJson(url, {
        headers: {
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
      });
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Failed to load prayer requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // ---------- SUBMIT NEW REQUEST ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please enter a prayer request.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const body = {
        title: title?.trim() || null,
        message: message.trim(),
        anonymous,
        status: "new",
        assignedTo: null,
      };

      const url = `${PRAYER_REQUESTS_URL}?includeResponses=true`;
      const created = await fetchJson(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
        body: JSON.stringify(body),
      });

      // Prepend new request to list
      setRequests((prev) => [created, ...prev]);
      setMessage("");
      setTitle("");
      setAnonymous(false);
      setSuccess("Your prayer request has been submitted.");
    } catch (err) {
      console.error(err);
      setError(
        "Failed to submit prayer request: The resource you are looking for is unavailable."
      );
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccess(""), 4000);
    }
  };

  // ---------- ADD RESPONSE ----------
  const handleAddResponse = async () => {
    if (!selectedRequest || !responseText.trim()) return;
    setResponseSubmitting(true);
    setError("");

    try {
      const url = `${PRAYER_REQUESTS_URL}/${selectedRequest.id}/responses`;
      const created = await fetchJson(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
        body: JSON.stringify({
          responseText: responseText.trim(),
        }),
      });

      setRequests((prev) =>
        prev.map((r) =>
          r.id === selectedRequest.id
            ? {
                ...r,
                responses: [...(r.responses || []), created],
              }
            : r
        )
      );
      setResponseText("");
    } catch (err) {
      console.error(err);
      setError("Failed to add response.");
    } finally {
      setResponseSubmitting(false);
    }
  };

  // ---------- DELETE REQUEST ----------
  const handleDeleteRequest = async (id) => {
    if (!window.confirm("Delete this prayer request?")) return;
    setError("");
    try {
      const url = `${PRAYER_REQUESTS_URL}/${id}`;
      await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
      });
      setRequests((prev) => prev.filter((r) => r.id !== id));
      if (selectedRequest?.id === id) setSelectedRequest(null);
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } catch (err) {
      console.error(err);
      setError("Failed to delete request.");
    }
  };

  const sortedRequests = useMemo(
    () =>
      [...requests].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [requests]
  );

  // ---------- ADMIN HELPERS ----------

  const toggleSelected = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allSelected =
    sortedRequests.length > 0 &&
    selectedIds.length === sortedRequests.length;

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(sortedRequests.map((r) => r.id));
  };

  const handleStatusChange = async (id, newStatusRaw) => {
    const newStatus = (newStatusRaw || "").toLowerCase();
    if (!NORMALIZED_STATUSES.includes(newStatus)) return;
    setStatusUpdatingId(id);
    setError("");
    try {
      const body = { status: newStatus };
      const url = `${PRAYER_REQUESTS_URL}/${id}`;
      const updated = await fetchJson(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
        body: JSON.stringify(body),
      });
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, ...updated, status: newStatus } : r
        )
      );
    } catch (e) {
      console.error(e);
      setError("Failed to update status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const startClose = (req) => {
    setClosingId(req.id);
    setCloseComment(req.closeComment || "");
  };

  const cancelClose = () => {
    setClosingId(null);
    setCloseComment("");
  };

  const handleCloseWithComment = async () => {
    if (!closingId) return;
    setCloseSubmitting(true);
    setError("");
    try {
      const body = {
        status: "closed",
        closeComment: closeComment.trim() || null,
      };
      const url = `${PRAYER_REQUESTS_URL}/${closingId}`;
      const updated = await fetchJson(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "",
        },
        body: JSON.stringify(body),
      });

      setRequests((prev) =>
        prev.map((r) =>
          r.id === closingId
            ? {
                ...r,
                ...updated,
                status: "closed",
                closeComment: body.closeComment,
              }
            : r
        )
      );

      setClosingId(null);
      setCloseComment("");
    } catch (e) {
      console.error(e);
      setError("Failed to close prayer request.");
    } finally {
      setCloseSubmitting(false);
    }
  };

  const handlePrintSelected = () => {
    if (!selectedIds.length) return;
    const selected = sortedRequests.filter((r) =>
      selectedIds.includes(r.id)
    );
    const now = new Date();

    const htmlRows = selected
      .map((req) => {
        const responsesHtml = Array.isArray(req.responses)
          ? req.responses
              .map(
                (res) =>
                  `<li><strong>${
                    res.respondedBy || res.author || "Team"
                  }:</strong> ${(res.responseText || res.message || "")
                    .toString()
                    .replace(/</g, "&lt;")}</li>`
              )
              .join("")
          : "";

        return `
        <tr>
          <td>${req.anonymous ? "Anonymous" : req.createdBy || "Member"}</td>
          <td>${req.title || "—"}</td>
          <td>
            <div>${(req.message || "").toString().replace(/</g, "&lt;")}</div>
            ${
              responsesHtml
                ? `<ul style="margin-top:4px;padding-left:16px;font-size:11px;">${responsesHtml}</ul>`
                : ""
            }
          </td>
          <td>${new Date(req.createdAt).toLocaleString()}</td>
          <td>${req.status || "new"}</td>
        </tr>`;
      })
      .join("");

    const html = `
      <html>
        <head>
          <title>Prayer Requests</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 16px; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            h2 { font-size: 14px; margin-top: 0; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; vertical-align: top; }
            th { background: #f5f5f5; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Mahima Ministry – Prayer Requests</h1>
          <h2>Printed at ${now.toLocaleString()}</h2>
          <table>
            <thead>
              <tr>
                <th>Requester</th>
                <th>Title</th>
                <th>Message & Responses</th>
                <th>Created At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${htmlRows}</tbody>
          </table>
        </body>
      </html>
    `;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* EXISTING TOP CARD */}
        <section className="bg-white/80 backdrop-blur rounded-3xl shadow-xl p-6 sm:p-8 border border-white/60">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-md">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">
                Community Prayer Wall
              </h1>
              <p className="text-slate-500 text-sm sm:text-base">
                Share your requests and support one another in prayer.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
            />

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent resize-y"
              placeholder="Share your prayer request..."
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-pink-500 focus:ring-pink-400"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                />
                Post as anonymous
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Request
                  </>
                )}
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-2xl px-3 py-2">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-2xl px-3 py-2 flex items-center gap-2">
                <Check className="w-4 h-4" />
                {success}
              </p>
            )}
          </form>
        </section>

        {/* EXISTING COMMUNITY REQUESTS LIST */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-900">
              Community Requests
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : sortedRequests.length === 0 ? (
            <p className="text-sm text-slate-500 bg-white/70 border border-dashed border-slate-200 rounded-2xl px-4 py-6 text-center">
              No prayer requests yet. Be the first to share.
            </p>
          ) : (
            <div className="space-y-3">
              {sortedRequests.map((req) => (
                <article
                  key={req.id}
                  className="bg-white/90 rounded-3xl shadow-sm border border-slate-100 px-4 py-4 flex flex-col sm:flex-row sm:items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center text-xs font-semibold">
                          {(req.createdBy || "Anon").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {req.anonymous ? "Anonymous" : req.createdBy || "Member"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(req.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteRequest(req.id)}
                        className="inline-flex items-center justify-center rounded-full border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-100"
                        title="Delete request"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </button>
                    </div>

                    {req.title && (
                      <p className="text-sm font-semibold text-slate-900 mb-0.5">
                        {req.title}
                      </p>
                    )}
                    <p className="text-sm text-slate-700 whitespace-pre-line">
                      {req.message}
                    </p>

                    {Array.isArray(req.responses) && req.responses.length > 0 && (
                      <div className="mt-3 border-l border-slate-100 pl-3 space-y-1.5">
                        {req.responses.map((res) => (
                          <div key={res.id} className="text-xs text-slate-600">
                            <span className="font-semibold">
                              {res.respondedBy || res.author || "Team"}:
                            </span>{" "}
                            <span>{res.responseText || res.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="sm:w-64 flex flex-col gap-2 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-3">
                    <textarea
                      value={
                        selectedRequest?.id === req.id ? responseText : ""
                      }
                      onChange={(e) => {
                        setSelectedRequest(req);
                        setResponseText(e.target.value);
                      }}
                      rows={2}
                      placeholder="Write a response..."
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
                    />
                    <button
                      type="button"
                      disabled={
                        responseSubmitting ||
                        !responseText.trim() ||
                        selectedRequest?.id !== req.id
                      }
                      onClick={handleAddResponse}
                      className="inline-flex items-center justify-center gap-1 rounded-full bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {responseSubmitting &&
                      selectedRequest?.id === req.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                      Respond
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* NEW ADMIN RECORDS SECTION – HIERARCHY + PRINT + STATUS + CLOSE */}
        {isAdmin && (
          <section className="mt-4 bg-white/90 rounded-3xl shadow-xl border border-white/70 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  All Prayer Requests (Admin)
                </h2>
                <p className="text-xs text-slate-500">
                  Internal overview – visible only to administrators
                </p>
              </div>

              <button
                type="button"
                onClick={handlePrintSelected}
                disabled={!selectedIds.length}
                className="inline-flex items-center justify-center rounded-full bg-indigo-500 text-white text-xs font-semibold px-4 py-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🖨️ Print Selected ({selectedIds.length})
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-500 font-semibold">
                    <th className="px-3 py-2 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-3 py-2 whitespace-nowrap">Requester</th>
                    <th className="px-3 py-2 whitespace-nowrap">Title</th>
                    <th className="px-3 py-2">Message & Child Responses</th>
                    <th className="px-3 py-2 whitespace-nowrap">Created At</th>
                    <th className="px-3 py-2 whitespace-nowrap">Anonymous</th>
                    <th className="px-3 py-2 whitespace-nowrap">Status</th>
                    <th className="px-3 py-2 whitespace-nowrap text-center">
                      Responses
                    </th>
                    <th className="px-3 py-2 whitespace-nowrap text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRequests.map((req) => (
                    <React.Fragment key={req.id}>
                      <tr className="border-t border-slate-100 hover:bg-slate-50/70">
                        <td className="px-3 py-2 align-top text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(req.id)}
                            onChange={() => toggleSelected(req.id)}
                          />
                        </td>
                        <td className="px-3 py-2 align-top whitespace-nowrap text-slate-800">
                          {req.anonymous
                            ? "Anonymous"
                            : req.createdBy || "Member"}
                        </td>
                        <td className="px-3 py-2 align-top whitespace-nowrap text-slate-800">
                          {req.title || "—"}
                        </td>
                        <td className="px-3 py-2 align-top text-slate-700 max-w-xs">
                          <div className="whitespace-pre-line">
                            {req.message}
                          </div>

                          {/* hierarchy: child responses listed under root */}
                          {Array.isArray(req.responses) &&
                            req.responses.length > 0 && (
                              <ul className="mt-2 border-t border-dashed border-slate-200 pt-1 space-y-0.5">
                                {req.responses.map((res) => (
                                  <li
                                    key={res.id}
                                    className="text-[10px] text-slate-600"
                                  >
                                    <span className="font-semibold">
                                      {res.respondedBy ||
                                        res.author ||
                                        "Team"}
                                      :
                                    </span>{" "}
                                    <span>
                                      {res.responseText || res.message}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                        </td>
                        <td className="px-3 py-2 align-top whitespace-nowrap text-slate-600 text-xs">
                          {new Date(req.createdAt).toLocaleDateString()}{" "}
                          <span className="block text-[10px] text-slate-400">
                            {new Date(req.createdAt).toLocaleTimeString()}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-top text-center text-slate-700">
                          {req.anonymous ? "Yes" : "No"}
                        </td>
                        <td className="px-3 py-2 align-top whitespace-nowrap text-slate-700">
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                "inline-block w-2 h-2 rounded-full " +
                                getStatusDotClass(req.status)
                              }
                            />
                            <select
                              value={
                                (req.status || "new").toLowerCase()
                              }
                              onChange={(e) =>
                                handleStatusChange(req.id, e.target.value)
                              }
                              disabled={statusUpdatingId === req.id}
                              className="border border-slate-200 rounded-full px-2 py-1 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            >
                              <option value="new">New</option>
                              <option value="open">Open</option>
                              <option value="prayed">Prayed</option>
                              <option value="closed">Closed</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top text-center text-slate-700">
                          {Array.isArray(req.responses)
                            ? req.responses.length
                            : 0}
                        </td>
                        <td className="px-3 py-2 align-top text-center">
                          <button
                            type="button"
                            onClick={() => startClose(req)}
                            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Close w/ Comment
                          </button>
                        </td>
                      </tr>

                      {/* inline close-with-comment editor */}
                      {closingId === req.id && (
                        <tr>
                          <td
                            className="px-3 pb-4 pt-0 bg-slate-50"
                            colSpan={9}
                          >
                            <div className="mt-2 flex flex-col sm:flex-row gap-2 items-start">
                              <textarea
                                value={closeComment}
                                onChange={(e) =>
                                  setCloseComment(e.target.value)
                                }
                                rows={3}
                                placeholder="Add closing comment/notes..."
                                className="w-full sm:flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={closeSubmitting}
                                  onClick={handleCloseWithComment}
                                  className="inline-flex items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-semibold px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {closeSubmitting ? (
                                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                  ) : null}
                                  Save & Close
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelClose}
                                  className="inline-flex items-center justify-center rounded-full border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}

                  {sortedRequests.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-4 text-center text-xs text-slate-500"
                      >
                        No prayer requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
