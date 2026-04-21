import React, { useEffect, useState } from "react";
import { getToken } from "../features/auth/authService";

const TABS = [
  { key: "PendingReview", label: "New Applications" },
  { key: "Approved", label: "Approved (Token Issued)" },
  { key: "Scheduled", label: "Scheduled Marriages" },
  { key: "Completed", label: "Completed Marriages" },
];

function formatDate(dtString) {
  if (!dtString) return "—";
  const d = new Date(dtString);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function formatDateOnly(dtString) {
  if (!dtString) return "—";
  const d = new Date(dtString);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

export default function MarriagePage() {
  const [activeTab, setActiveTab] = useState("PendingReview");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm, setNewForm] = useState({
    groomFullName: "",
    brideFullName: "",
    groomPhone: "",
    bridePhone: "",
    groomEmail: "",
    brideEmail: "",
    address: "",
    groomIsMember: false,
    brideIsMember: false,
    groomMemberId: "",
    brideMemberId: "",
    preferredDate: "",
    preferredService: "",
  });

  const [scheduleModal, setScheduleModal] = useState(null); // { id, scheduledAt, ceremonyLocation }
  const [certificateItem, setCertificateItem] = useState(null); // completed marriage for certificate

  const apiBase = "/api/marriage";

  const authHeaders = () => {
    const token = getToken();
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  };

  async function loadItems(statusKey) {
    setLoading(true);
    setError(null);
    try {
      const qs = statusKey ? `?status=${encodeURIComponent(statusKey)}` : "";
      const resp = await fetch(`${apiBase}/admin/applications${qs}`, {
        headers: authHeaders(),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setItems(data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load marriage applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const resetNewForm = () =>
    setNewForm({
      groomFullName: "",
      brideFullName: "",
      groomPhone: "",
      bridePhone: "",
      groomEmail: "",
      brideEmail: "",
      address: "",
      groomIsMember: false,
      brideIsMember: false,
      groomMemberId: "",
      brideMemberId: "",
      preferredDate: "",
      preferredService: "",
    });

  const handleCreate = async () => {
    try {
      const body = {
        ...newForm,
        preferredDate: newForm.preferredDate
          ? new Date(newForm.preferredDate).toISOString()
          : null,
      };

      const resp = await fetch(`${apiBase}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        console.error(await resp.text());
        alert("Unable to submit marriage application.");
        return;
      }

      setShowNewModal(false);
      resetNewForm();

      setActiveTab("PendingReview");
      await loadItems("PendingReview");
    } catch (err) {
      console.error(err);
      alert("Error submitting application.");
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Approve this marriage application and generate a token?"))
      return;
    try {
      const resp = await fetch(`${apiBase}/admin/applications/${id}/approve`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ notes: "" }),
      });
      if (!resp.ok) {
        console.error(await resp.text());
        alert("Unable to approve application.");
        return;
      }
      await loadItems(activeTab);
    } catch (err) {
      console.error(err);
      alert("Error approving application.");
    }
  };

  const openScheduleModal = (item) => {
    setScheduleModal({
      id: item.id,
      scheduledAt: item.scheduledAt ? item.scheduledAt.slice(0, 16) : "",
      ceremonyLocation: item.ceremonyLocation || "",
    });
  };

  const handleSchedule = async () => {
    if (!scheduleModal) return;
    try {
      const body = {
        scheduledAt: new Date(scheduleModal.scheduledAt).toISOString(),
        ceremonyLocation: scheduleModal.ceremonyLocation,
      };

      const resp = await fetch(
        `${apiBase}/admin/applications/${scheduleModal.id}/schedule`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(body),
        }
      );
      if (!resp.ok) {
        console.error(await resp.text());
        alert("Unable to schedule marriage.");
        return;
      }
      setScheduleModal(null);
      await loadItems(activeTab);
    } catch (err) {
      console.error(err);
      alert("Error scheduling marriage.");
    }
  };

  const handleComplete = async (id) => {
    if (!window.confirm("Mark this marriage as completed?")) return;
    try {
      const resp = await fetch(`${apiBase}/admin/applications/${id}/complete`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ notes: "" }),
      });
      if (!resp.ok) {
        console.error(await resp.text());
        alert("Unable to complete marriage.");
        return;
      }
      await loadItems(activeTab);
    } catch (err) {
      console.error(err);
      alert("Error completing marriage.");
    }
  };

  const handlePrintCertificate = () => {
    if (!certificateItem) return;

    const {
      groomFullName,
      brideFullName,
      groomPhone,
      bridePhone,
      groomEmail,
      brideEmail,
      address,
      token,
      preferredDate,
      scheduledAt,
      ceremonyLocation,
      createdAt,
    } = certificateItem;

    const marriageDate = scheduledAt || preferredDate || createdAt;
    const formattedMarriageDate = formatDateOnly(marriageDate);
    const formattedIssueDate = formatDateOnly(new Date().toISOString());

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Provisional Marriage Certificate</title>
<style>
  body {
    font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    background: #f3f0ff;
    margin: 0;
    padding: 0;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 25mm 20mm;
    background: #ffffff;
    box-sizing: border-box;
  }
  .header {
    text-align: center;
    border-bottom: 2px solid #ccc;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .header-title {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 0.05em;
  }
  .header-sub {
    font-size: 11px;
    color: #555;
  }
  .title {
    text-align: center;
    margin: 24px 0 12px;
    font-size: 18px;
    font-weight: 700;
    text-transform: uppercase;
    text-decoration: underline;
  }
  .meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin-bottom: 12px;
  }
  .meta-row div {
    width: 48%;
  }
  .body-text {
    font-size: 13px;
    line-height: 1.6;
    margin-top: 16px;
    text-align: justify;
  }
  .names {
    font-size: 14px;
    font-weight: 600;
  }
  .section {
    margin-top: 18px;
    font-size: 12px;
  }
  .signature-row {
    display: flex;
    justify-content: space-between;
    margin-top: 50px;
    font-size: 12px;
  }
  .signature-box {
    width: 45%;
    text-align: center;
  }
  .signature-line {
    border-top: 1px solid #000;
    margin-top: 40px;
    padding-top: 4px;
  }
  .disclaimer {
    font-size: 10px;
    color: #555;
    border-top: 1px dashed #aaa;
    margin-top: 40px;
    padding-top: 8px;
  }
  @page {
    size: A4;
    margin: 15mm;
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-title">MAHIMA MINISTRY CHURCH, PUNJAB</div>
    <div class="header-sub">
      Restoration • Healing • Mission — Pastoral & Marriage Ministry<br/>
      Provisional Certificate issued for church records
    </div>
  </div>

  <div class="title">Provisional Marriage Certificate</div>

  <div class="meta-row">
    <div><strong>Certificate No.</strong> ${token || "—"}</div>
    <div style="text-align:right;"><strong>Date of Issue:</strong> ${formattedIssueDate}</div>
  </div>
  <div class="meta-row">
    <div><strong>Church Location:</strong> ${ceremonyLocation || "Mahima Ministry, Punjab"}</div>
    <div style="text-align:right;"><strong>Marriage Date:</strong> ${formattedMarriageDate}</div>
  </div>

  <div class="body-text">
    This is to certify that, according to the marriage records of
    <strong>Mahima Ministry Church</strong>, the Christian marriage of
    <span class="names">${groomFullName || "_________________"}</span>
    and
    <span class="names">${brideFullName || "_________________"}</span>
    has been duly solemnised in the presence of witnesses and the pastoral
    leadership of the church.
  </div>

  <div class="section">
    <strong>Groom details</strong><br/>
    Name: ${groomFullName || "—"}<br/>
    Phone: ${groomPhone || "—"}<br/>
    Email: ${groomEmail || "—"}
  </div>

  <div class="section">
    <strong>Bride details</strong><br/>
    Name: ${brideFullName || "—"}<br/>
    Phone: ${bridePhone || "—"}<br/>
    Email: ${brideEmail || "—"}
  </div>

  <div class="section">
    <strong>Residential address (as declared):</strong><br/>
    ${address || "—"}
  </div>

  <div class="section">
    <strong>Internal church reference:</strong><br/>
    Application Token: ${token || "—"}<br/>
    Application Created: ${formatDateOnly(createdAt)}
  </div>

  <div class="signature-row">
    <div class="signature-box">
      <div class="signature-line">Senior Pastor / Marriage Minister</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Church Seal</div>
    </div>
  </div>

  <div class="disclaimer">
    This provisional certificate is issued by Mahima Ministry Church, Punjab,
    for pastoral and church-record purposes only. It is <strong>not</strong> a
    replacement for the civil marriage certificate issued by the competent
    authority of the Government of Punjab under the applicable marriage
    registration laws. Couples should obtain their official government
    certificate separately through the authorised e-District / Registrar
    channels.
  </div>
</div>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) {
      alert("Please allow pop-ups to print the certificate.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const renderActions = (item) => {
    if (activeTab === "PendingReview") {
      return (
        <button
          onClick={() => handleApprove(item.id)}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: "#0b875b",
            color: "#fff",
            border: "none",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Approve
        </button>
      );
    }

    if (activeTab === "Approved") {
      return (
        <button
          onClick={() => openScheduleModal(item)}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: "#c44f00",
            color: "#fff",
            border: "none",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Schedule
        </button>
      );
    }

    if (activeTab === "Scheduled") {
      return (
        <button
          onClick={() => handleComplete(item.id)}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: "#0b2a47",
            color: "#fff",
            border: "none",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Mark Completed
        </button>
      );
    }

    if (activeTab === "Completed") {
      return (
        <button
          onClick={() => setCertificateItem(item)}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: "#0b2a47",
            color: "#fff",
            border: "none",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Certificate
        </button>
      );
    }

    return null;
  };

  return (
    <div
      style={{
        background: "#fdeff0",
        padding: 24,
        borderRadius: 24,
        boxShadow: "0 14px 40px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 24, color: "#123a63" }}>
            Marriage Applications
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b5a5a" }}>
            Track marriage requests, approvals, schedules and provisional
            certificates.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          style={{
            padding: "10px 20px",
            borderRadius: 999,
            border: "none",
            background:
              "linear-gradient(90deg, rgba(255,99,132,0.9), rgba(255,159,64,0.9))",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            boxShadow: "0 10px 24px rgba(255,99,132,0.35)",
          }}
        >
          + New Marriage Application
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                background: active ? "#0b2a47" : "#ffffff",
                color: active ? "#ffffff" : "#444",
                boxShadow: active
                  ? "0 10px 22px rgba(11,42,71,0.35)"
                  : "0 3px 8px rgba(0,0,0,0.05)",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: 16,
          minHeight: 220,
        }}
      >
        {loading && <div>Loading…</div>}
        {error && <div style={{ color: "darkred" }}>{error}</div>}
        {!loading && !error && (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f7f3ff",
                  textAlign: "left",
                }}
              >
                <th style={{ padding: 10 }}>Groom</th>
                <th style={{ padding: 10 }}>Bride</th>
                <th style={{ padding: 10 }}>Status</th>
                <th style={{ padding: 10 }}>Preferred Date</th>
                <th style={{ padding: 10 }}>Scheduled At</th>
                <th style={{ padding: 10 }}>Location</th>
                <th style={{ padding: 10 }}>Token</th>
                <th style={{ padding: 10, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 16, color: "#777" }}>
                    No items found for this tab.
                  </td>
                </tr>
              )}
              {items.map((m) => (
                <tr key={m.id} style={{ borderTop: "1px solid #f0e4f0" }}>
                  <td style={{ padding: 10 }}>{m.groomFullName}</td>
                  <td style={{ padding: 10 }}>{m.brideFullName}</td>
                  <td style={{ padding: 10 }}>{m.status}</td>
                  <td style={{ padding: 10 }}>
                    {formatDate(m.preferredDate)}
                  </td>
                  <td style={{ padding: 10 }}>
                    {formatDate(m.scheduledAt)}
                  </td>
                  <td style={{ padding: 10 }}>
                    {m.ceremonyLocation || "—"}
                  </td>
                  <td style={{ padding: 10 }}>{m.token || "—"}</td>
                  <td style={{ padding: 10, textAlign: "right" }}>
                    {renderActions(m)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Application Modal */}
      {showNewModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
          }}
          onClick={() => setShowNewModal(false)}
        >
          <div
            style={{
              width: "min(900px, 95vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 24,
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>New Marriage Application</h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              <label>
                <div>Groom full name</div>
                <input
                  type="text"
                  value={newForm.groomFullName}
                  onChange={(e) =>
                    setNewForm({ ...newForm, groomFullName: e.target.value })
                  }
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                <div>Bride full name</div>
                <input
                  type="text"
                  value={newForm.brideFullName}
                  onChange={(e) =>
                    setNewForm({ ...newForm, brideFullName: e.target.value })
                  }
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                <div>Groom phone</div>
                <input
                  type="text"
                  value={newForm.groomPhone}
                  onChange={(e) =>
                    setNewForm({ ...newForm, groomPhone: e.target.value })
                  }
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                <div>Bride phone</div>
                <input
                  type="text"
                  value={newForm.bridePhone}
                  onChange={(e) =>
                    setNewForm({ ...newForm, bridePhone: e.target.value })
                  }
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                <div>Groom email</div>
                <input
                  type="email"
                  value={newForm.groomEmail}
                  onChange={(e) =>
                    setNewForm({ ...newForm, groomEmail: e.target.value })
                  }
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                <div>Bride email</div>
                <input
                  type="email"
                  value={newForm.brideEmail}
                  onChange={(e) =>
                    setNewForm({ ...newForm, brideEmail: e.target.value })
                  }
                  style={{ width: "100%" }}
                />
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                <div>Address</div>
                <textarea
                  rows={3}
                  value={newForm.address}
                  onChange={(e) =>
                    setNewForm({ ...newForm, address: e.target.value })
                  }
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                <div>Preferred date</div>
                <input
                  type="date"
                  value={newForm.preferredDate}
                  onChange={(e) =>
                    setNewForm({ ...newForm, preferredDate: e.target.value })
                  }
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                <div>Preferred service</div>
                <select
                  value={newForm.preferredService}
                  onChange={(e) =>
                    setNewForm({
                      ...newForm,
                      preferredService: e.target.value,
                    })
                  }
                  style={{ width: "100%" }}
                >
                  <option value="">Select…</option>
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                </select>
              </label>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 20,
              }}
            >
              <button
                onClick={() => {
                  setShowNewModal(false);
                  resetNewForm();
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "1px solid #ccc",
                  background: "#fff",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                style={{
                  padding: "8px 18px",
                  borderRadius: 999,
                  border: "none",
                  background: "#0b2a47",
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                Submit Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule modal */}
      {scheduleModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
          }}
          onClick={() => setScheduleModal(null)}
        >
          <div
            style={{
              width: "min(500px, 90vw)",
              background: "#fff",
              borderRadius: 24,
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Schedule Marriage</h3>
            <div style={{ marginBottom: 12 }}>
              <div>Date &amp; time</div>
              <input
                type="datetime-local"
                value={scheduleModal.scheduledAt}
                onChange={(e) =>
                  setScheduleModal({
                    ...scheduleModal,
                    scheduledAt: e.target.value,
                  })
                }
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div>Location</div>
              <input
                type="text"
                value={scheduleModal.ceremonyLocation}
                onChange={(e) =>
                  setScheduleModal({
                    ...scheduleModal,
                    ceremonyLocation: e.target.value,
                  })
                }
                style={{ width: "100%" }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 16,
              }}
            >
              <button
                onClick={() => setScheduleModal(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "1px solid #ccc",
                  background: "#fff",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSchedule}
                style={{
                  padding: "8px 18px",
                  borderRadius: 999,
                  border: "none",
                  background: "#0b2a47",
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate modal (preview + print) */}
      {certificateItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 45,
          }}
          onClick={() => setCertificateItem(null)}
        >
          <div
            style={{
              width: "min(850px, 95vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 24,
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0 }}>Provisional Marriage Certificate</h3>
              <button
                onClick={() => setCertificateItem(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 20,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <p
              style={{
                fontSize: 12,
                color: "#666",
                marginTop: 0,
                marginBottom: 16,
              }}
            >
              Preview of the church-issued provisional certificate. Use the
              button below to open a printable Punjab-style template in a new
              window (you can then save as PDF).
            </p>

            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 16,
                padding: 16,
                background: "#faf7ff",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: 1,
                    color: "#123a63",
                  }}
                >
                  MAHIMA MINISTRY CHURCH, PUNJAB
                </div>
                <div style={{ fontSize: 11, color: "#7a6670" }}>
                  Restoration • Healing • Mission — Marriage Ministry
                </div>
              </div>

              <div
                style={{
                  textAlign: "center",
                  margin: "12px 0 16px",
                  fontSize: 16,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  textDecoration: "underline",
                }}
              >
                Provisional Marriage Certificate
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  marginBottom: 8,
                }}
              >
                <div>
                  <strong>Certificate No:</strong>{" "}
                  {certificateItem.token || "—"}
                </div>
                <div>
                  <strong>Issue Date:</strong>{" "}
                  {formatDateOnly(new Date().toISOString())}
                </div>
              </div>

              <div style={{ fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>
                This certifies that{" "}
                <strong>{certificateItem.groomFullName}</strong> and{" "}
                <strong>{certificateItem.brideFullName}</strong> were united in
                Christian marriage on{" "}
                <strong>
                  {formatDateOnly(
                    certificateItem.scheduledAt ||
                      certificateItem.preferredDate ||
                      certificateItem.createdAt
                  )}
                </strong>{" "}
                at{" "}
                <strong>
                  {certificateItem.ceremonyLocation || "Mahima Ministry Church"}
                </strong>{" "}
                according to the rites and ceremonies of Mahima Ministry Church,
                Punjab.
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 20,
                  fontSize: 12,
                }}
              >
                <div style={{ width: "48%" }}>
                  <strong>Groom:</strong> {certificateItem.groomFullName}
                  <br />
                  <strong>Phone:</strong> {certificateItem.groomPhone || "—"}
                </div>
                <div style={{ width: "48%" }}>
                  <strong>Bride:</strong> {certificateItem.brideFullName}
                  <br />
                  <strong>Phone:</strong> {certificateItem.bridePhone || "—"}
                </div>
              </div>

              <div
                style={{
                  marginTop: 20,
                  fontSize: 11,
                  color: "#665",
                  borderTop: "1px dashed #ccb",
                  paddingTop: 8,
                }}
              >
                <strong>Note:</strong> This is a church provisional certificate
                for pastoral and record purposes. For legal use (government
                schemes, civil procedures etc.), please obtain the official
                marriage certificate from the Punjab Government&apos;s
                authorised registration portal / registrar.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 16,
              }}
            >
              <button
                onClick={() => setCertificateItem(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "1px solid #ccc",
                  background: "#fff",
                }}
              >
                Close
              </button>
              <button
                onClick={handlePrintCertificate}
                style={{
                  padding: "8px 18px",
                  borderRadius: 999,
                  border: "none",
                  background: "#0b2a47",
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                Open Printable Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
