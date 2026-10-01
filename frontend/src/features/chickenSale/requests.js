export function settingsCommand(settings) {
  return {
    action: "settings",
    city: String(settings.city || "").trim(),
    rawFactor: Number(settings.rawFactor),
    targetMargin: Number(settings.targetMargin),
    expectedSalesKg: Number(settings.expectedSalesKg),
    labor: Number(settings.labor),
    rent: Number(settings.rent),
  };
}

export function saveErrorMessage(error) {
  const data = error.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.errors && typeof data.errors === "object") {
    const messages = Object.entries(data.errors).flatMap(([field, values]) =>
      (Array.isArray(values) ? values : [values]).map(value => `${field}: ${value}`));
    if (messages.length) return messages.join(" ");
  }
  if (data?.detail || data?.title) return data.detail || data.title;
  if (error.response?.status) return `Save failed (HTTP ${error.response.status}). Refresh and try again.`;
  return "Could not reach the server. Check your connection and retry.";
}
