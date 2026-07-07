import api from "../api";

async function unwrap(response, fallbackMessage = "Request failed.") {
  if (!response?.ok) {
    const message = response?.error || response?.statusText || fallbackMessage;
    const error = new Error(message);
    error.status = response?.status;
    throw error;
  }
  return response.data;
}

export async function listTenants() {
  const data = await unwrap(await api.get("/platform/tenants"), "Could not load tenants.");
  return Array.isArray(data) ? data : [];
}

export async function getTenantEntitlements(tenantId) {
  const data = await unwrap(
    await api.get(`/platform/tenants/${encodeURIComponent(tenantId)}/entitlements`),
    "Could not load tenant entitlements."
  );
  return data || { modules: [] };
}

export async function listModuleRequests(params = {}) {
  const data = await unwrap(
    await api.get("/platform/module-requests", { params }),
    "Could not load subscription requests."
  );
  return Array.isArray(data?.items) ? data.items : [];
}

export async function createTenant(payload) {
  const data = await unwrap(await api.post("/platform/tenants", payload), "Could not create tenant.");
  return data;
}

export async function updateTenantProfile(tenantId, payload = {}) {
  const data = await unwrap(
    await api.put(`/platform/tenants/${encodeURIComponent(tenantId)}`, payload),
    "Could not update tenant profile."
  );
  return data;
}

export async function verifyTenantDomain(tenantId) {
  const data = await unwrap(
    await api.post(`/platform/tenants/${encodeURIComponent(tenantId)}/domain/verify`, {}),
    "Could not verify tenant domain."
  );
  return data;
}

export async function listModules() {
  const data = await unwrap(await api.get("/platform/modules"), "Could not load modules.");
  return Array.isArray(data) ? data : [];
}

export async function upsertModule(payload) {
  const data = await unwrap(await api.post("/platform/modules", payload), "Could not save module.");
  return data;
}

export async function activateModule(tenantId, moduleCode, payload = {}) {
  const data = await unwrap(
    await api.post(
      `/platform/tenants/${encodeURIComponent(tenantId)}/modules/${encodeURIComponent(moduleCode)}/activate`,
      payload
    ),
    "Could not activate module."
  );
  return data;
}

export async function approveModuleRequest(requestId, payload = {}) {
  const data = await unwrap(
    await api.post(`/platform/module-requests/${encodeURIComponent(requestId)}/approve`, payload),
    "Could not approve subscription request."
  );
  return data;
}

export async function rejectModuleRequest(requestId, payload = {}) {
  const data = await unwrap(
    await api.post(`/platform/module-requests/${encodeURIComponent(requestId)}/reject`, payload),
    "Could not reject subscription request."
  );
  return data;
}

export async function revokeModule(tenantId, moduleCode, payload = {}) {
  const data = await unwrap(
    await api.post(
      `/platform/tenants/${encodeURIComponent(tenantId)}/modules/${encodeURIComponent(moduleCode)}/revoke`,
      payload
    ),
    "Could not revoke module."
  );
  return data;
}

export async function updateTenantStatus(tenantId, payload = {}) {
  const data = await unwrap(
    await api.post(`/platform/tenants/${encodeURIComponent(tenantId)}/status`, payload),
    "Could not update tenant status."
  );
  return data;
}

export async function createTenantAdminUser(tenantId, payload = {}) {
  const data = await unwrap(
    await api.post(`/platform/tenants/${encodeURIComponent(tenantId)}/admins`, payload),
    "Could not create tenant admin user."
  );
  return data;
}

export async function resetTenantAdminPassword(tenantId, userId, payload = {}) {
  const data = await unwrap(
    await api.post(
      `/platform/tenants/${encodeURIComponent(tenantId)}/admins/${encodeURIComponent(userId)}/reset-password`,
      payload
    ),
    "Could not reset tenant admin password."
  );
  return data;
}

export async function createModulePaymentIntent(tenantId, moduleCode, payload = {}) {
  const data = await unwrap(
    await api.post(
      `/billing/tenants/${encodeURIComponent(tenantId)}/modules/${encodeURIComponent(moduleCode)}/payment-intents`,
      payload
    ),
    "Could not create donation."
  );
  return data;
}

export async function createCurrentTenantModulePaymentIntent(moduleCode, payload = {}) {
  const data = await unwrap(
    await api.post(
      `/billing/tenants/current/modules/${encodeURIComponent(moduleCode)}/payment-intents`,
      payload
    ),
    "Could not create donation."
  );
  return data;
}

export async function verifyModuleRazorpayPayment(paymentIntentId, payload = {}) {
  const data = await unwrap(
    await api.post(
      `/billing/payment-intents/${encodeURIComponent(paymentIntentId)}/razorpay-verify`,
      payload
    ),
    "Could not verify payment."
  );
  return data;
}

export async function markPaymentPaid(paymentIntentId, payload = {}) {
  const data = await unwrap(
    await api.post(
      `/billing/payment-intents/${encodeURIComponent(paymentIntentId)}/mark-paid`,
      payload
    ),
    "Could not confirm payment."
  );
  return data;
}

export async function submitDonationDetails(paymentIntentId, payload = {}) {
  const data = await unwrap(
    await api.post(
      `/billing/payment-intents/${encodeURIComponent(paymentIntentId)}/donation-details`,
      payload
    ),
    "Could not submit donation details."
  );
  return data;
}

export async function listBillingInvoices(params = {}) {
  const data = await unwrap(
    await api.get("/billing/invoices", { params }),
    "Could not load invoices."
  );
  return data || { summary: {}, items: [] };
}

export async function listCurrentTenantBillingInvoices(params = {}) {
  const data = await unwrap(
    await api.get("/billing/tenants/current/invoices", { params }),
    "Could not load church invoices."
  );
  return data || { items: [] };
}

export async function generateBillingInvoices(payload = {}) {
  const data = await unwrap(
    await api.post("/billing/invoices/generate", payload),
    "Could not generate invoices."
  );
  return data;
}

export async function applyBillingInvoicePayment(invoiceId, payload = {}) {
  const data = await unwrap(
    await api.post(`/billing/invoices/${encodeURIComponent(invoiceId)}/payments`, payload),
    "Could not apply invoice payment."
  );
  return data;
}

export async function getTenantLanding() {
  const data = await unwrap(await api.get("/tenant-admin/landing"), "Could not load landing page.");
  return data || {};
}

export async function saveTenantLanding(payload) {
  const data = await unwrap(await api.put("/tenant-admin/landing", payload), "Could not save landing page.");
  return data;
}
