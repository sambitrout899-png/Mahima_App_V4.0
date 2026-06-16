const ACTIVE_POSITION_KEY = "mahima_active_position";

function readUser() {
  try { return JSON.parse(localStorage.getItem("mahima_user") || "null"); } catch { return null; }
}

export function assignedPositions(user = readUser()) {
  return Array.isArray(user?.positions) ? user.positions : [];
}

export function primaryPosition(user = readUser()) {
  const positions = assignedPositions(user);
  return user?.primaryPosition || positions.find((p) => p?.isPrimary) || positions[0] || null;
}

export function getActivePosition(user = readUser()) {
  const positions = assignedPositions(user);
  if (!positions.length) return null;
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem(ACTIVE_POSITION_KEY) || "null"); } catch {}
  const active = stored?.id ? positions.find((p) => String(p.id) === String(stored.id)) : null;
  return active || primaryPosition(user);
}

export function setActivePosition(position) {
  if (!position?.id) return null;
  const value = {
    id: position.id,
    name: position.name,
    visibilityScope: position.visibilityScope || "My",
  };
  localStorage.setItem(ACTIVE_POSITION_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("mahima:position-changed", { detail: value }));
  return value;
}

export function resetActivePosition(user = readUser()) {
  const primary = primaryPosition(user);
  if (primary) return setActivePosition(primary);
  localStorage.removeItem(ACTIVE_POSITION_KEY);
  return null;
}

export function activePositionHeaderValue() {
  const position = getActivePosition();
  return position?.id ? String(position.id) : "";
}

export function scopeLabel(scope) {
  const value = String(scope || "My");
  if (/church/i.test(value)) return "Church Level";
  if (/team/i.test(value)) return "My Teams";
  return "My";
}
