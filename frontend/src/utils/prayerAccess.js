const normalizeAccessName = (value) =>
  String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

export function isPrayerDeskManagerName(value) {
  return [
    "callcentermanager",
    "callcentremanager",
    "callcenter",
    "callcentre",
    "prayerdeskmanager",
    "prayercallcentermanager",
  ].includes(normalizeAccessName(value));
}

export function isPrayerDeskManager(user) {
  if (!user) return false;

  const roles = [
    user.role,
    ...(Array.isArray(user.roles) ? user.roles : []),
  ];
  const positions = [
    ...(Array.isArray(user.positions) ? user.positions : []),
    user.primaryPosition,
  ];

  return [...roles, ...positions]
    .filter(Boolean)
    .some((entry) =>
      isPrayerDeskManagerName(
        typeof entry === "string"
          ? entry
          : entry.name || entry.roleName || entry.positionName || entry.role
      )
    );
}
