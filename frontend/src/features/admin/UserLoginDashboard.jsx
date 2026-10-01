import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Activity, RefreshCw, Search, ShieldCheck, Users, Wifi, WifiOff } from "lucide-react";
import { API_BASE } from "../../api";
import { getToken } from "../../utils/auth";

const arrayFrom = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.records)) return data.records;
  return [];
};

function userIdOf(user) {
  return String(user?.id ?? user?.Id ?? user?.userId ?? user?.UserId ?? "");
}

function displayNameOf(user) {
  return user?.displayName || user?.DisplayName || user?.name || user?.username || user?.Username || "User";
}

function roleOf(user) {
  return user?.role || user?.Role || "member";
}

function initialsFrom(name = "U") {
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

function duration(seconds = 0) {
  const value = Math.max(0, Math.floor(seconds));
  if (value < 60) return `${value}s`;
  if (value < 3600) return `${Math.floor(value / 60)}m ${value % 60}s`;
  return `${Math.floor(value / 3600)}h ${Math.floor(value % 3600 / 60)}m ${value % 60}s`;
}

const reportingPeriods = [
  ["today", "Today"], ["yesterday", "Yesterday"], ["thisWeek", "This week"],
  ["lastWeek", "Last week"], ["thisMonth", "This month"], ["lastMonth", "Last month"],
];

export default function UserLoginDashboard() {
  const outletContext = useOutletContext() || {};
  const chatConnection = outletContext.chatConnection || {};
  const invokeHub = chatConnection.invoke;
  const [users, setUsers] = useState([]);
  const [manualOnlineIds, setManualOnlineIds] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState("");
  const [period, setPeriod] = useState("today");
  const activityByUser = useMemo(() => new Map((history?.users || []).map(user => [String(user.userId), user])), [history]);

  const onlineIds = useMemo(() => {
    if (manualOnlineIds) return manualOnlineIds;
    return chatConnection.onlineUserIds instanceof Set ? chatConnection.onlineUserIds : new Set();
  }, [chatConnection.onlineUserIds, manualOnlineIds]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/users?page=1&limit=5000`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text().catch(() => `Users failed (${res.status})`));
      const data = await res.json().catch(() => []);
      setUsers(arrayFrom(data));

      try {
        const activityResponse = await fetch(`${API_BASE}/user-activity/summary`, {
          headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: "include",
        });
        if (!activityResponse.ok) throw new Error("Activity history is unavailable. Please refresh to try again.");
        setHistory(await activityResponse.json());
        setHistoryError("");
      } catch (activityError) {
        setHistoryError(activityError.message);
      }

      if (invokeHub) {
        const ids = await invokeHub("GetOnlineUsers").catch(() => null);
        if (Array.isArray(ids)) setManualOnlineIds(new Set(ids.filter(Boolean).map(String)));
      }
    } catch (err) {
      setError(err?.message || "Could not load live user dashboard.");
    } finally {
      setLoading(false);
    }
  }, [invokeHub]);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 15000);
    return () => window.clearInterval(id);
  }, [load]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      const text = [
        displayNameOf(user),
        user?.username || user?.Username,
        user?.email || user?.Email,
        user?.phone || user?.Phone,
        roleOf(user),
      ].filter(Boolean).join(" ").toLowerCase();
      return text.includes(q);
    });
  }, [query, users]);

  const connectedCount = users.filter((user) => onlineIds.has(userIdOf(user))).length;
  const staffAdminCount = users.filter((user) => ["admin", "staff"].includes(String(roleOf(user)).toLowerCase())).length;

  return (
    <section className="min-h-full bg-slate-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Admin Operations</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">Live User Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">See who is currently connected to the Mahima app and chat service.</p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Wifi} label="Connected Now" value={connectedCount} tone="emerald" />
          <Metric icon={Users} label="Total Users" value={users.length} tone="sky" />
          <Metric icon={WifiOff} label="Not Connected" value={Math.max(0, users.length - connectedCount)} tone="amber" />
          <Metric icon={ShieldCheck} label="Staff/Admin" value={staffAdminCount} tone="violet" />
        </div>

        <div className="space-y-3" aria-label="Login and activity history">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Login &amp; activity history</h2>
            <p className="text-xs text-slate-500">Unique users signed in or using the app in each period. India time (IST); weeks start Monday.</p>
          </div>
          {historyError && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{historyError} {history ? "Showing the last successful update." : ""}</p>}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            {reportingPeriods.map(([key, label]) => {
              const summary = history?.periods?.find(item => item.key === key);
              const unavailable = summary && new Date(summary.end) <= new Date(history.trackingStartedAt);
              return <button key={key} type="button" aria-pressed={period === key} onClick={() => setPeriod(key)}
                className={`rounded-xl border p-4 text-left shadow-sm ${period === key ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500" : "border-slate-200 bg-white"}`}>
                <div className="text-sm font-semibold text-slate-600">{label}</div>
                <div className="mt-2 text-2xl font-bold text-slate-950">{summary && !unavailable ? summary.userCount : "—"}</div>
                <div className="text-xs text-slate-500">{unavailable ? "Before tracking began" : "users logged in"}</div>
                <div className="mt-3 text-sm font-semibold text-emerald-700">{summary && !unavailable ? duration(summary.activeSeconds) : "—"} active</div>
              </button>;
            })}
          </div>
          <p className="text-xs text-slate-500">Active time counts foreground use and pauses after 5 minutes idle. Updated every 15 seconds.
            {history && <> Tracking since {new Date(history.trackingStartedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST; earlier history is unavailable. Periods spanning this date have partial totals.</>}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            User activity · {reportingPeriods.find(([key]) => key === period)?.[1]}
          </div>
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, username, email, phone, role..."
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              <Activity className="h-3.5 w-3.5" />
              Auto refresh every 15s
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {filteredUsers.map((user) => {
              const id = userIdOf(user);
              const name = displayNameOf(user);
              const connected = onlineIds.has(id);
              return (
                <article key={id || name} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${connected ? "bg-emerald-600" : "bg-slate-400"}`}>
                      {initialsFrom(name)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-950">{name}</div>
                      <div className="truncate text-xs text-slate-500">
                        {user?.username || user?.Username || "No username"} · {user?.email || user?.Email || "No email"}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="mr-3 text-right text-xs text-slate-500">
                      <div className="text-sm font-semibold text-slate-900">{history && new Date(history.periods.find(item => item.key === period)?.end) > new Date(history.trackingStartedAt) ? duration(activityByUser.get(id)?.periods?.[period]?.activeSeconds) : "—"} active</div>
                      {history ? (new Date(history.periods.find(item => item.key === period)?.end) <= new Date(history.trackingStartedAt) ? "History unavailable" : activityByUser.get(id)?.periods?.[period]?.loggedIn ? "Logged in during period" : "No recorded activity") : "History unavailable"}
                    </div>
                    <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {roleOf(user)}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      connected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {connected ? "Connected now" : "Not connected"}
                    </span>
                  </div>
                </article>
              );
            })}
            {!loading && filteredUsers.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">No users found.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label, value, tone }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-2 text-3xl font-bold text-slate-950">{value}</div>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone] || tones.sky}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
