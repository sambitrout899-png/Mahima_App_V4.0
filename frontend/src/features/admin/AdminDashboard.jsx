// src/features/admin/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { getToken } from "../auth/authService";
import {
  getCurrentUser as permGetCurrentUser,
  canAccessPage as permCanAccessPage,
} from "../auth/permissionService";

// Recharts (ESM, works with Vite)
import * as Recharts from "recharts";

// --- simple color maps ---
const USER_MIX_COLORS = {
  Admins: "#6366f1", // indigo
  Members: "#0ea5e9", // sky
  Staff: "#f97316", // orange
  Volunteers: "#22c55e", // green
};

const TASK_STATUS_COLORS = {
  Open: "#0ea5e9", // blue
  Completed: "#22c55e", // green
  Overdue: "#ef4444", // red
};

// --- auth fallback ---
function getCurrentUserFallback() {
  try {
    const raw =
      localStorage.getItem("currentUser") ||
      localStorage.getItem("mahima_currentUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const getCurrentUser = permGetCurrentUser || getCurrentUserFallback;
const canAccessPage = permCanAccessPage || (() => false);

// --- API client ---
const api = axios.create({
  baseURL: window.__API_BASE__ || "",
});
api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export default function AdminDashboard() {
  const user = getCurrentUser();

  // normalise roles
  const roles = (() => {
    const list = [];
    const push = (v) =>
      typeof v === "string" && v.trim() && list.push(v.toLowerCase().trim());
    if (user) {
      push(user.role);
      push(user.Role);
      push(user.userRole);
    }
    if (Array.isArray(user?.roles)) {
      for (const r of user.roles) {
        if (!r) continue;
        if (typeof r === "string") push(r);
        else {
          push(r.name);
          push(r.role);
          push(r.roleName);
        }
      }
    }
    return list;
  })();

  const allowed = roles.some((r) => ["admin", "staff"].includes(r));
  const pageAllowed = canAccessPage("AdminDashboard");
  const canAccess = !!user && (allowed || pageAllowed);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [overview, setOverview] = useState({
    snapshotAt: null,
    users: {
      total: 0,
      admins: 0,
      members: 0,
      staff: 0,
      volunteers: 0,
      newMembers30d: 0,
    },
    tasks: { byRole: [] },
    teams: { productivity: [] },
  });

  const [prayers, setPrayers] = useState({
    snapshotAt: null,
    periods: [],
  });

  // ---- core fetch ----
  async function fetchAll() {
    const [ovRes, prRes] = await Promise.all([
      api.get("/analytics/overview"),
      api.get("/analytics/prayers", {
        params: { windows: "7,15,30,60,90,180,365" },
      }),
    ]);
    normalizeOverview(ovRes.data || {});
    normalizePrayers(prRes.data || {});
  }

  // initial load
  useEffect(() => {
    if (!canAccess) return;
    (async () => {
      try {
        setLoading(true);
        setError("");
        setInfo("");
        await fetchAll();
      } catch (e) {
        setError(e?.response?.data?.message || e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [canAccess]);

  // refresh button
  async function handleRefreshClick() {
    try {
      setLoading(true);
      setError("");
      setInfo("");
      await fetchAll();
      setInfo("Analytics reloaded from server.");
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  function normalizeOverview(raw) {
    const users = {
      total: raw?.users?.total ?? raw?.users?.active ?? 0,
      admins: raw?.users?.admins ?? 0,
      members: raw?.users?.members ?? 0,
      staff: raw?.users?.staff ?? 0,
      volunteers: raw?.users?.volunteers ?? 0,
      newMembers30d: raw?.users?.newMembers30d ?? 0,
    };

    let byRole = [];
    if (Array.isArray(raw?.tasks?.byRole)) {
      byRole = raw.tasks.byRole;
    } else if (raw?.tasks?.byRole) {
      byRole = Object.entries(raw.tasks.byRole).map(([role, count]) => ({
        role,
        total: count,
        open: count,
        completed: 0,
        overdue: 0,
      }));
    }

    setOverview({
      snapshotAt: raw.snapshotAt ?? null,
      users,
      tasks: { byRole },
      teams: { productivity: raw?.teams?.productivity || [] },
    });
  }

  function normalizePrayers(raw) {
    if (Array.isArray(raw?.periods)) {
      setPrayers({
        snapshotAt: raw.snapshotAt ?? null,
        periods: raw.periods,
      });
      return;
    }

    if (Array.isArray(raw?.windows) && raw?.counts) {
      const periods = raw.windows.map((w) => {
        const c = raw.counts[w] || {};
        const total = c.total || 0;
        const responded = c.responded || 0;
        return {
          period: `${w}d`,
          total,
          open: total - responded,
          closed: responded,
          testified: 0,
        };
      });
      setPrayers({ snapshotAt: null, periods });
      return;
    }

    setPrayers({ snapshotAt: null, periods: [] });
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg p-6">
        Access Denied
      </div>
    );
  }

  // ---- chart data ----
  const userMixData = useMemo(
    () => [
      { role: "Admins", count: overview.users.admins },
      { role: "Members", count: overview.users.members },
      { role: "Staff", count: overview.users.staff },
      { role: "Volunteers", count: overview.users.volunteers },
    ],
    [overview]
  );

  const teamProd = useMemo(
    () => overview.teams.productivity || [],
    [overview]
  );

  const prayerBars = useMemo(() => {
    return prayers.periods.map((p) => {
      const total = p.total || 0;
      const responded = p.responded ?? (p.closed || 0) + (p.testified || 0);
      return {
        window: p.period,
        Responded: responded,
        Pending: total - responded,
        Total: total,
      };
    });
  }, [prayers]);

  const tasksChartData = useMemo(
    () =>
      (overview.tasks.byRole || []).map((r) => ({
        role: r.role,
        Open: r.open ?? 0,
        Completed: r.completed ?? 0,
        Overdue: r.overdue ?? 0,
        Total: r.total ?? 0,
      })),
    [overview]
  );

  const snapshot = overview.snapshotAt
    ? new Date(overview.snapshotAt).toLocaleString()
    : "No Snapshot";

  const hasRecharts = !!Recharts && Object.keys(Recharts).length > 0;

  return (
    <main className="p-6 space-y-4 bg-gray-50 min-h-screen">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-xs text-gray-500">Snapshot: {snapshot}</p>
        </div>

        <button
          onClick={handleRefreshClick}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded disabled:opacity-60"
        >
          {loading ? "Refreshing..." : "Refresh Analytics"}
        </button>
      </header>

      {loading && (
        <div className="bg-white border p-3 rounded text-gray-400 text-sm">
          Loading dashboard…
        </div>
      )}

      {error && (
        <div className="bg-red-100 p-2 text-red-600 rounded text-sm">
          {error}
        </div>
      )}
      {info && (
        <div className="bg-green-100 p-2 text-green-600 rounded text-sm">
          {info}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Kpi title="Total Users" value={overview.users.total} />
        <Kpi title="Admins" value={overview.users.admins} />
        <Kpi title="Members" value={overview.users.members} />
        <Kpi title="Staff" value={overview.users.staff} />
        <Kpi title="Volunteers" value={overview.users.volunteers} />
      </div>

      {/* User Mix + Team Productivity */}
      <section className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="User Mix">
          {hasRecharts ? (
            <Recharts.ResponsiveContainer width="100%" height="100%">
              <Recharts.BarChart data={userMixData}>
                <Recharts.CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <Recharts.XAxis
                  dataKey="role"
                  tick={{ fill: "#4b5563", fontSize: 12 }}
                />
                <Recharts.YAxis
                  allowDecimals={false}
                  tick={{ fill: "#4b5563", fontSize: 12 }}
                />
                <Recharts.Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    borderColor: "#e5e7eb",
                    fontSize: 12,
                  }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Recharts.Legend />
                <Recharts.Bar
                  dataKey="count"
                  name="Users"
                  isAnimationActive={false}
                  barSize={40}
                  radius={[8, 8, 0, 0]}
                >
                  {userMixData.map((entry, index) => (
                    <Recharts.Cell
                      key={`user-mix-${index}`}
                      fill={USER_MIX_COLORS[entry.role] || "#6366f1"}
                    />
                  ))}
                </Recharts.Bar>
              </Recharts.BarChart>
            </Recharts.ResponsiveContainer>
          ) : (
            <NoChart />
          )}
        </ChartCard>

        <ChartCard title="Team Productivity (last 30 days)">
          {hasRecharts ? (
            <Recharts.ResponsiveContainer width="100%" height="100%">
              <Recharts.BarChart data={teamProd}>
                <defs>
                  <linearGradient
                    id="avgHoursGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <Recharts.CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <Recharts.XAxis
                  dataKey="team"
                  tick={{ fill: "#4b5563", fontSize: 12 }}
                />
                <Recharts.YAxis tick={{ fill: "#4b5563", fontSize: 12 }} />
                <Recharts.Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    borderColor: "#e5e7eb",
                    fontSize: 12,
                  }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Recharts.Legend />
                <Recharts.Bar
                  dataKey="avgHours"
                  name="Avg Hours / Member"
                  isAnimationActive={false}
                  barSize={32}
                  fill="url(#avgHoursGradient)"
                  radius={[8, 8, 0, 0]}
                />
                <Recharts.Bar
                  dataKey="attendanceRate"
                  name="Attendance %"
                  isAnimationActive={false}
                  barSize={32}
                  fill="#22c55e"
                  radius={[8, 8, 0, 0]}
                />
              </Recharts.BarChart>
            </Recharts.ResponsiveContainer>
          ) : (
            <NoChart />
          )}
        </ChartCard>
      </section>

      {/* Prayers */}
      <ChartCard title="Prayers: Responded vs Pending">
        {hasRecharts ? (
          <Recharts.ResponsiveContainer width="100%" height="100%">
            <Recharts.BarChart data={prayerBars}>
              <Recharts.CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <Recharts.XAxis
                dataKey="window"
                tick={{ fill: "#4b5563", fontSize: 12 }}
              />
              <Recharts.YAxis tick={{ fill: "#4b5563", fontSize: 12 }} />
              <Recharts.Tooltip
                contentStyle={{
                  borderRadius: 8,
                  borderColor: "#e5e7eb",
                  fontSize: 12,
                }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Recharts.Legend />
              <Recharts.Bar
                dataKey="Responded"
                name="Responded"
                isAnimationActive={false}
                barSize={40}
                fill="#22c55e"
                radius={[8, 8, 0, 0]}
              />
              <Recharts.Bar
                dataKey="Pending"
                name="Pending"
                isAnimationActive={false}
                barSize={40}
                fill="#f97316"
                radius={[8, 8, 0, 0]}
              />
            </Recharts.BarChart>
          </Recharts.ResponsiveContainer>
        ) : (
          <NoChart />
        )}
      </ChartCard>

      {/* Tasks */}
      <ChartCard title="Tasks by Role">
        {hasRecharts ? (
          <Recharts.ResponsiveContainer width="100%" height="100%">
            <Recharts.BarChart data={tasksChartData}>
              <Recharts.CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <Recharts.XAxis
                dataKey="role"
                tick={{ fill: "#4b5563", fontSize: 12 }}
              />
              <Recharts.YAxis tick={{ fill: "#4b5563", fontSize: 12 }} />
              <Recharts.Tooltip
                contentStyle={{
                  borderRadius: 8,
                  borderColor: "#e5e7eb",
                  fontSize: 12,
                }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Recharts.Legend />
              <Recharts.Bar
                dataKey="Open"
                name="Open"
                isAnimationActive={false}
                barSize={28}
                fill={TASK_STATUS_COLORS.Open}
                radius={[8, 8, 0, 0]}
              />
              <Recharts.Bar
                dataKey="Completed"
                name="Completed"
                isAnimationActive={false}
                barSize={28}
                fill={TASK_STATUS_COLORS.Completed}
                radius={[8, 8, 0, 0]}
              />
              <Recharts.Bar
                dataKey="Overdue"
                name="Overdue"
                isAnimationActive={false}
                barSize={28}
                fill={TASK_STATUS_COLORS.Overdue}
                radius={[8, 8, 0, 0]}
              />
            </Recharts.BarChart>
          </Recharts.ResponsiveContainer>
        ) : (
          <NoChart />
        )}
      </ChartCard>
    </main>
  );
}

/* helpers */

function Kpi({ title, value }) {
  return (
    <div className="bg-white p-4 rounded text-center shadow-sm border">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-2xl font-bold text-gray-800">
        {Number(value || 0).toLocaleString()}
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded shadow-sm border p-4 h-80 space-y-2">
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <div className="w-full h-full">{children}</div>
    </div>
  );
}

function NoChart() {
  return (
    <div className="text-center text-gray-400 p-4">
      Charts disabled because <code>recharts</code> could not be loaded.
    </div>
  );
}
