// src/pages/BaptismsPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { getToken as authGetToken } from "../features/auth/authService";

const API_BASE = "/api/baptisms";

const statusTabs = [
  "Pending",
  "ChurchVerified",
  "AwaitingChurchVerification",
  "ReadyForToken",
  "TokenGenerated",
  "Completed",
];

const emptyForm = {
  fullName: "",
  fatherName: "",
  motherName: "",
  dateOfBirth: "",
  contactNumber: "",
  email: "",
  address: "",
  preferredDate: "",
  preferredService: "",
};

const BaptismsPage = () => {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const authHeaders = () => {
    const token = authGetToken ? authGetToken() : localStorage.getItem("token");
    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(API_BASE, {
        params: statusFilter ? { status: statusFilter } : {},
        headers: authHeaders(),
      });
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error loading baptism requests", err);
      setError("Failed to load baptism requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const payload = {
      fullName: form.fullName,
      fatherName: form.fatherName || null,
      motherName: form.motherName || null,
      dateOfBirth: form.dateOfBirth
        ? new Date(form.dateOfBirth).toISOString()
        : null,
      contactNumber: form.contactNumber || null,
      email: form.email || null,
      address: form.address || null,
      preferredDate: form.preferredDate
        ? new Date(form.preferredDate).toISOString()
        : null,
      preferredService: form.preferredService || null,
    };

    try {
      await axios.post(API_BASE, payload, { headers: authHeaders() });
      setForm(emptyForm);
      setCreating(false);
      setStatusFilter("Pending");
      await loadRequests();
    } catch (err) {
      console.error("Error creating baptism request", err);
      setError("Failed to create baptism request.");
    } finally {
      setSubmitting(false);
    }
  };

  const withActionLoading = async (id, fn) => {
    setActionLoadingId(id);
    setError("");
    try {
      await fn();
      await loadRequests();
    } catch (err) {
      console.error("Action failed", err);
      const msg =
        err?.response?.data ||
        err?.message ||
        "Action failed. Please try again.";
      setError(typeof msg === "string" ? msg : "Action failed.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleVerifyChurch = (id) =>
    withActionLoading(id, () =>
      axios.post(`${API_BASE}/${id}/verify-church`, null, {
        headers: authHeaders(),
      })
    );

  const handleMarkConsent = (id) =>
    withActionLoading(id, () =>
      axios.post(`${API_BASE}/${id}/sign-consent`, null, {
        headers: authHeaders(),
      })
    );

  const handleGenerateToken = (id) =>
    withActionLoading(id, () =>
      axios.post(`${API_BASE}/${id}/generate-token`, null, {
        headers: authHeaders(),
      })
    );

  // close the workflow (TokenGenerated -> Completed)
  const handleComplete = (id) =>
    withActionLoading(id, () =>
      axios.put(
        `${API_BASE}/${id}/complete`,
        {}, // send an empty JSON body
        {
          headers: {
            ...authHeaders(),
            "Content-Type": "application/json",
          },
        }
      )
    );

  return (
    <div className="p-4 w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Baptisms</h1>
          <p className="text-gray-500 text-sm">
            Manage baptism registrations, verification, consent, and tokens.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium
                     bg-blue-600 text-white hover:bg-blue-700 shadow-sm active:scale-[0.98]
                     transition-transform"
        >
          {creating ? "Close Form" : "New Baptism Request"}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Create form */}
      {creating && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">New Baptism Request</h2>
          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Full Name *</label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleFormChange}
                required
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Father&apos;s Name</label>
              <input
                type="text"
                name="fatherName"
                value={form.fatherName}
                onChange={handleFormChange}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Mother&apos;s Name</label>
              <input
                type="text"
                name="motherName"
                value={form.motherName}
                onChange={handleFormChange}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={handleFormChange}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Contact Number</label>
              <input
                type="tel"
                name="contactNumber"
                value={form.contactNumber}
                onChange={handleFormChange}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleFormChange}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-sm font-medium">Address</label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleFormChange}
                rows={2}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Preferred Date</label>
              <input
                type="date"
                name="preferredDate"
                value={form.preferredDate}
                onChange={handleFormChange}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Preferred Service</label>
              <select
                name="preferredService"
                value={form.preferredService}
                onChange={handleFormChange}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Special">Special Service</option>
              </select>
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setForm(emptyForm);
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Save Request"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {statusTabs.map((status) => {
          const active = statusFilter === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full border px-3 py-1 text-xs sm:text-sm font-medium transition ${
                active
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {status}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 font-semibold text-xs text-gray-500 uppercase tracking-wide">
                TOKEN
              </th>
              <th className="px-3 py-2 font-semibold text-xs text-gray-500 uppercase tracking-wide">
                NAME
              </th>
              <th className="px-3 py-2 font-semibold text-xs text-gray-500 uppercase tracking-wide">
                CONTACT
              </th>
              <th className="px-3 py-2 font-semibold text-xs text-gray-500 uppercase tracking-wide">
                STATUS
              </th>
              <th className="px-3 py-2 font-semibold text-xs text-gray-500 uppercase tracking-wide">
                FLAGS
              </th>
              <th className="px-3 py-2 font-semibold text-xs text-gray-500 uppercase tracking-wide">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-4 text-center text-gray-500 text-sm"
                >
                  Loading...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-4 text-center text-gray-500 text-sm"
                >
                  No baptism requests found for this status.
                </td>
              </tr>
            ) : (
              requests.map((r) => {
                const isActionLoading = actionLoadingId === r.id;
                return (
                  <tr
                    key={r.id}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2 text-xs sm:text-sm text-gray-800">
                      {r.token || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs sm:text-sm text-gray-900">
                      {r.fullName}
                    </td>
                    <td className="px-3 py-2 text-xs sm:text-sm text-gray-700">
                      {r.contactNumber || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs sm:text-sm">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-800">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px] sm:text-xs text-gray-700 space-x-1">
                      {r.churchVerified && (
                        <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                          Church OK
                        </span>
                      )}
                      {r.consentSigned && (
                        <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                          Consent
                        </span>
                      )}
                      {r.certificatePdfUrl && (
                        <span className="inline-flex rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                          Certificate
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px] sm:text-xs">
                      <div className="flex flex-wrap gap-1">
                        {!r.churchVerified && (
                          <button
                            type="button"
                            onClick={() => handleVerifyChurch(r.id)}
                            disabled={isActionLoading}
                            className="rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
                          >
                            {isActionLoading ? "..." : "Verify"}
                          </button>
                        )}

                        {!r.consentSigned && (
                          <button
                            type="button"
                            onClick={() => handleMarkConsent(r.id)}
                            disabled={isActionLoading}
                            className="rounded-md bg-indigo-500 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-indigo-600 disabled:opacity-60"
                          >
                            {isActionLoading ? "..." : "Mark Consent"}
                          </button>
                        )}

                        {r.churchVerified && r.consentSigned && !r.token && (
                          <button
                            type="button"
                            onClick={() => handleGenerateToken(r.id)}
                            disabled={isActionLoading}
                            className="rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            {isActionLoading ? "..." : "Token + Cert"}
                          </button>
                        )}

                        {r.status === "TokenGenerated" && (
                          <button
                            type="button"
                            onClick={() => handleComplete(r.id)}
                            disabled={isActionLoading}
                            className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {isActionLoading ? "..." : "Mark Completed"}
                          </button>
                        )}

                        {r.certificatePdfUrl && (
                          <a
                            href={`${API_BASE}/${r.id}/certificate`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border border-gray-300 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                          >
                            PDF
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BaptismsPage;
