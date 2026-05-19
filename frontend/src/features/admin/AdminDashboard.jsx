// src/features/admin/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  DollarSign,
  Download,
  HeartHandshake,
  IndianRupee,
  Layers,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import * as Recharts from "recharts";
import api from "../../api";

const colors = {
  emerald: "#059669",
  teal: "#0d9488",
  blue: "#2563eb",
  sky: "#0284c7",
  amber: "#d97706",
  orange: "#ea580c",
  rose: "#e11d48",
  violet: "#7c3aed",
  slate: "#475569",
};

const moduleLabels = {
  overview: "Core overview",
  reports: "Admin reports",
  prayers: "Prayer analytics",
  users: "Users",
  chats: "Chats",
  tasks: "Tasks",
  teams: "Teams",
  attendance: "Attendance",
  timesheets: "Timesheets",
  pnl: "Accounting P&L",
  balances: "Account balances",
  sermons: "Sermons",
  baptisms: "Baptism",
  marriage: "Marriage",
  counselling: "Counselling",
  payrollRuns: "Payroll",
  prayerRequests: "Prayer requests",
};

function getCurrentUserSync() {
  try {
    for (const key of ["mahima_user", "user", "currentUser", "mahima_currentUser", "me"]) {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return null;
}

function normalizeRoles(user) {
  const out = [];
  const push = (value) => {
    if (typeof value === "string" && value.trim()) out.push(value.toLowerCase().trim());
  };
  push(user?.role);
  push(user?.Role);
  push(user?.userRole);
  if (Array.isArray(user?.roles)) {
    user.roles.forEach((role) => {
      if (typeof role === "string") push(role);
      else {
        push(role?.name);
        push(role?.role);
        push(role?.roleName);
      }
    });
  }
  return out;
}

function hasDashboardPage(user) {
  const pages = Array.isArray(user?.pages) ? user.pages.map((p) => String(p).toUpperCase()) : [];
  return pages.includes("ADMIN") || pages.includes("ADMINDASHBOARD");
}

function arrayFrom(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.records)) return value.records;
  return [];
}

function countBy(rows, picker, fallback = "Unassigned") {
  const map = new Map();
  arrayFrom(rows).forEach((row) => {
    const raw = typeof picker === "function" ? picker(row) : row?.[picker];
    const key = String(raw || fallback).trim() || fallback;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function currency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(number(value));
}

function compactNumber(value) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(number(value));
}

function pct(value) {
  return `${Math.round(number(value))}%`;
}

function safeDate(daysBack = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

async function safeGet(key, url, config = {}) {
  try {
    const res = await api.get(url, config);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        key,
        ok: false,
        data: null,
        error: text || res.statusText || "Unavailable",
      };
    }
    return { key, ok: true, data: res.data, error: null };
  } catch (error) {
    return {
      key,
      ok: false,
      data: null,
      error: error?.response?.data?.message || error?.message || "Unavailable",
    };
  }
}

function toLookup(results) {
  return results.reduce((acc, item) => {
    acc[item.key] = item;
    return acc;
  }, {});
}

function buildDashboard(results) {
  const r = toLookup(results);
  const overview = r.overview?.data || {};
  const reports = r.reports?.data || {};
  const users = arrayFrom(r.users?.data);
  const tasks = arrayFrom(r.tasks?.data);
  const teams = arrayFrom(r.teams?.data);
  const attendance = arrayFrom(r.attendance?.data);
  const timesheets = arrayFrom(r.timesheets?.data);
  const sermons = arrayFrom(r.sermons?.data);
  const baptisms = arrayFrom(r.baptisms?.data);
  const marriage = arrayFrom(r.marriage?.data);
  const counselling = arrayFrom(r.counselling?.data);
  const prayerRequests = arrayFrom(r.prayerRequests?.data);
  const payrollRuns = arrayFrom(r.payrollRuns?.data);
  const balances = arrayFrom(r.balances?.data);
  const pnl = r.pnl?.data || {};

  const userStats = {
    total: number(overview?.users?.total ?? reports?.users?.total ?? r.users?.data?.total ?? users.length),
    admins: number(overview?.users?.admins ?? users.filter((u) => /admin/i.test(String(u.role))).length),
    members: number(overview?.users?.members ?? users.filter((u) => /member/i.test(String(u.role))).length),
    staff: number(overview?.users?.staff ?? users.filter((u) => /staff/i.test(String(u.role))).length),
    volunteers: number(overview?.users?.volunteers ?? users.filter((u) => /volunteer/i.test(String(u.role))).length),
    new30: number(overview?.users?.newMembers30d),
  };

  const taskStatus = reports?.tasks?.byStatus?.length
    ? reports.tasks.byStatus.map((x) => ({ name: x.status || "Unassigned", value: number(x.count) }))
    : countBy(tasks, (t) => t.status || t.Status);
  const taskPriority = reports?.tasks?.byPriority?.length
    ? reports.tasks.byPriority.map((x) => ({ name: x.priority || "None", value: number(x.count) }))
    : countBy(tasks, (t) => t.priority || t.Priority);
  const taskTotal = number(reports?.tasks?.total ?? overview?.tasks?.total ?? tasks.length);
  const openTasks = taskStatus
    .filter((x) => !/complete|done|closed/i.test(x.name))
    .reduce((sum, x) => sum + x.value, 0);
  const completedTasks = taskStatus
    .filter((x) => /complete|done|closed/i.test(x.name))
    .reduce((sum, x) => sum + x.value, 0);
  const overdueTasks = number(
    overview?.tasks?.byRole?.reduce?.((sum, row) => sum + number(row.overdue), 0) ??
      tasks.filter((t) => {
        const due = t.dueDate || t.DueDate;
        return due && new Date(due) < new Date() && !/complete|done|closed/i.test(String(t.status));
      }).length
  );

  const chats = reports?.chats || {};
  const chatStats = {
    total: number(chats.total ?? r.chats?.data?.length),
    groups: number(chats.groupChats),
    direct: number(chats.directChats),
    messages30: number(chats.recentMessages30d),
  };

  const prayer30 =
    number(reports?.prayers?.created30d) ||
    number(r.prayers?.data?.counts?.["30"]?.total) ||
    prayerRequests.filter((p) => p.createdAt && new Date(p.createdAt) >= new Date(safeDate(30))).length;
  const prayerResponded30 =
    number(r.prayers?.data?.counts?.["30"]?.responded) ||
    prayerRequests.filter((p) => /respond|closed|answered|testified/i.test(String(p.status))).length;

  const ministryStatus = [
    ...countBy(baptisms, (x) => `Baptism: ${x.status || x.Status || "Pending"}`),
    ...countBy(marriage, (x) => `Marriage: ${x.status || x.Status || "Pending"}`),
    ...countBy(counselling, (x) => `Counselling: ${x.status || x.Status || "Pending"}`),
  ].slice(0, 10);

  const accountingRows = reports?.accounting?.last30Days || [];
  const income =
    number(pnl.income ?? pnl.totalIncome) ||
    accountingRows.filter((x) => /income|revenue/i.test(String(x.type))).reduce((sum, x) => sum + Math.abs(number(x.credit || x.net)), 0);
  const expense =
    number(pnl.expense ?? pnl.expenses ?? pnl.totalExpense) ||
    accountingRows.filter((x) => /expense/i.test(String(x.type))).reduce((sum, x) => sum + Math.abs(number(x.debit || x.net)), 0);
  const net = number(pnl.net ?? pnl.netIncome ?? income - expense);
  const cashBank = balances
    .filter((x) => /cash|bank/i.test(`${x.name || x.accountName || ""} ${x.type || ""}`))
    .reduce((sum, x) => sum + number(x.balance ?? x.closingBalance ?? x.amount), 0);

  const attendanceRate = attendance.length && userStats.staff
    ? Math.min(100, (attendance.length / (Math.max(userStats.staff, 1) * 30)) * 100)
    : number(overview?.teams?.productivity?.[0]?.attendanceRate);
  const totalHours = timesheets.reduce((sum, x) => sum + number(x.hours ?? x.Hours), 0);
  const avgHours = number(overview?.teams?.productivity?.[0]?.avgHours) || (userStats.staff ? totalHours / userStats.staff : 0);

  const contentMix = countBy(sermons, (x) => x.type || x.resourceType || "Sermon");
  const usersByRole = reports?.users?.byRole?.length
    ? reports.users.byRole.map((x) => ({ name: x.role || "Unassigned", value: number(x.count) }))
    : [
        { name: "Admins", value: userStats.admins },
        { name: "Members", value: userStats.members },
        { name: "Staff", value: userStats.staff },
        { name: "Volunteers", value: userStats.volunteers },
      ].filter((x) => x.value > 0);

  const failed = results.filter((x) => !x.ok);
  const available = results.length - failed.length;
  const completionRate = taskTotal ? (completedTasks / taskTotal) * 100 : 0;
  const responseRate = prayer30 ? (prayerResponded30 / prayer30) * 100 : 0;
  const healthScore = Math.round(
    Math.min(100, Math.max(0,
      35 +
      (available / results.length) * 25 +
      Math.min(completionRate, 100) * 0.18 +
      Math.min(responseRate, 100) * 0.12 +
      (failed.length === 0 ? 10 : 0)
    ))
  );

  const attention = [
    { label: "Open tasks", value: openTasks, tone: openTasks > 0 ? "amber" : "emerald", detail: `${Math.round(completionRate)}% completed` },
    { label: "Overdue tasks", value: overdueTasks, tone: overdueTasks > 0 ? "rose" : "emerald", detail: "Needs owner follow-up" },
    { label: "Prayer follow-ups", value: Math.max(0, prayer30 - prayerResponded30), tone: prayer30 - prayerResponded30 > 0 ? "blue" : "emerald", detail: `${Math.round(responseRate)}% responded` },
    { label: "Module warnings", value: failed.length, tone: failed.length ? "rose" : "emerald", detail: "Unavailable data feeds" },
  ];

  const operations = [
    { name: "Users", value: userStats.total, detail: `${userStats.new30} new members in 30d`, icon: Users },
    { name: "Chats", value: chatStats.total, detail: `${chatStats.messages30} messages in 30d`, icon: MessageSquare },
    { name: "Teams", value: teams.length || overview?.teams?.total || 0, detail: `${compactNumber(avgHours)} avg hrs/member`, icon: Layers },
    { name: "Attendance", value: pct(attendanceRate), detail: `${attendance.length} records in 30d`, icon: CalendarCheck },
    { name: "Sermons", value: sermons.length, detail: `${contentMix.length || 0} content categories`, icon: BarChart3 },
    { name: "Payroll", value: payrollRuns.length, detail: "Recent salary runs", icon: IndianRupee },
  ];

  return {
    snapshotAt: reports.snapshotAt || overview.snapshotAt || new Date().toISOString(),
    healthScore,
    available,
    failed,
    userStats,
    usersByRole,
    taskStatus,
    taskPriority,
    taskTotal,
    openTasks,
    completedTasks,
    overdueTasks,
    chatStats,
    prayer30,
    prayerResponded30,
    responseRate,
    ministryStatus,
    income,
    expense,
    net,
    cashBank,
    attendanceRate,
    avgHours,
    totalHours,
    contentMix,
    attention,
    operations,
    moduleHealth: results.map((x) => ({
      name: moduleLabels[x.key] || x.key,
      ok: x.ok,
      detail: x.ok ? "Live" : x.error,
    })),
    pipelines: [
      { name: "Baptism", total: baptisms.length, active: baptisms.filter((x) => !/complete/i.test(String(x.status))).length },
      { name: "Marriage", total: marriage.length, active: marriage.filter((x) => !/complete/i.test(String(x.status))).length },
      { name: "Counselling", total: counselling.length, active: counselling.filter((x) => !/complete|closed/i.test(String(x.status))).length },
      { name: "Prayer", total: prayer30, active: Math.max(0, prayer30 - prayerResponded30) },
    ],
  };
}

export default function AdminDashboard() {
  const [user] = useState(() => getCurrentUserSync());
  const roles = useMemo(() => normalizeRoles(user), [user]);
  const canAccess = Boolean(user && (roles.some((r) => ["admin", "staff"].includes(r)) || hasDashboardPage(user)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rawResults, setRawResults] = useState([]);

  const dashboard = useMemo(() => buildDashboard(rawResults), [rawResults]);

  async function loadDashboard() {
    setLoading(true);
    setError("");
    const today = safeDate(0);
    const from30 = safeDate(30);

    const requests = [
      safeGet("overview", "/analytics/overview"),
      safeGet("reports", "/analytics/reports"),
      safeGet("prayers", "/analytics/prayers", { params: { windows: "7,15,30,60,90,180,365" } }),
      safeGet("users", "/users", { params: { page: 1, limit: 500 } }),
      safeGet("chats", "/chats"),
      safeGet("tasks", "/tasks"),
      safeGet("teams", "/teams"),
      safeGet("attendance", "/attendance", { params: { from: from30, to: today } }),
      safeGet("timesheets", "/timesheets", { params: { from: from30, to: today } }),
      safeGet("pnl", "/accounting/pnl", { params: { fromDate: from30, toDate: today } }),
      safeGet("balances", "/accounting/balances"),
      safeGet("sermons", "/sermons"),
      safeGet("baptisms", "/baptisms"),
      safeGet("marriage", "/marriage/admin/applications"),
      safeGet("counselling", "/counselling/admin/sessions"),
      safeGet("payrollRuns", "/payroll/runs"),
      safeGet("prayerRequests", "/prayerrequests", { params: { includeResponses: true } }),
    ];

    try {
      setRawResults(await Promise.all(requests));
    } catch (e) {
      setError(e?.message || "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canAccess) loadDashboard();
  }, [canAccess]);

  if (!canAccess) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h1 className="font-semibold text-slate-900">Access Denied</h1>
          <p className="text-sm text-slate-500 mt-1">Admin analytics are available to admin and staff roles.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="bg-white border-b border-slate-200">
        <div className="px-5 py-5 lg:px-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Mahima Command Center
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Live operational analytics across ministry, people, finance, care, content, teams, and communication.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Refreshing" : "Refresh Analytics"}
            </button>
          </div>
        </div>
      </section>

      <section className="px-5 py-5 lg:px-8 space-y-5">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[1.2fr_2fr]">
          <HeroScore dashboard={dashboard} loading={loading} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard title="Members" value={dashboard.userStats.members} detail={`${dashboard.userStats.total} total users`} icon={Users} tone="blue" />
            <MetricCard title="Task Completion" value={pct(dashboard.taskTotal ? (dashboard.completedTasks / dashboard.taskTotal) * 100 : 0)} detail={`${dashboard.openTasks} open tasks`} icon={Target} tone="emerald" />
            <MetricCard title="Prayer Response" value={pct(dashboard.responseRate)} detail={`${dashboard.prayer30} requests in 30d`} icon={HeartHandshake} tone="violet" />
            <MetricCard title="Net Position" value={currency(dashboard.net)} detail={`${currency(dashboard.cashBank)} cash/bank`} icon={IndianRupee} tone={dashboard.net >= 0 ? "emerald" : "rose"} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {dashboard.attention.map((item) => (
            <AttentionCard key={item.label} item={item} />
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <Panel title="People & Roles" icon={Users} className="xl:col-span-1">
            <BarChart data={dashboard.usersByRole} barColor={colors.blue} dataKey="value" nameKey="name" />
          </Panel>
          <Panel title="Financial Pulse" icon={IndianRupee} className="xl:col-span-1">
            <ComposedFinanceChart income={dashboard.income} expense={dashboard.expense} net={dashboard.net} />
          </Panel>
          <Panel title="Ministry Pipeline" icon={HeartHandshake} className="xl:col-span-1">
            <PipelineChart data={dashboard.pipelines} />
          </Panel>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Tasks By Status" icon={Target}>
            <DonutChart data={dashboard.taskStatus} colors={[colors.blue, colors.emerald, colors.rose, colors.amber, colors.violet]} />
          </Panel>
          <Panel title="Priority Load" icon={AlertTriangle}>
            <BarChart data={dashboard.taskPriority} barColor={colors.amber} dataKey="value" nameKey="name" />
          </Panel>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <Panel title="Operations Snapshot" icon={Activity} className="xl:col-span-2">
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {dashboard.operations.map((item) => (
                <MiniOperation key={item.name} item={item} />
              ))}
            </div>
          </Panel>
          <Panel title="Communication" icon={MessageSquare}>
            <div className="space-y-4">
              <MiniStat label="Total chats" value={dashboard.chatStats.total} />
              <MiniStat label="Group chats" value={dashboard.chatStats.groups} />
              <MiniStat label="Direct chats" value={dashboard.chatStats.direct} />
              <MiniStat label="Messages in 30 days" value={dashboard.chatStats.messages30} />
            </div>
          </Panel>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
          <Panel title="Care & Content" icon={Sparkles}>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Content Mix</h3>
                <BarChart data={dashboard.contentMix} barColor={colors.violet} dataKey="value" nameKey="name" height={220} />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Ministry Statuses</h3>
                <div className="space-y-2">
                  {dashboard.ministryStatus.length ? dashboard.ministryStatus.map((row) => (
                    <div key={row.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="truncate pr-3">{row.name}</span>
                      <span className="font-bold">{row.value}</span>
                    </div>
                  )) : <EmptyState text="No ministry pipeline data available yet." />}
                </div>
              </div>
            </div>
          </Panel>
          <Panel title="Data Feed Health" icon={CheckCircle2}>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {dashboard.moduleHealth.map((feed) => (
                <div key={feed.name} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2">
                  <span className={`mt-1 w-2.5 h-2.5 rounded-full ${feed.ok ? "bg-emerald-500" : "bg-rose-500"}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800">{feed.name}</div>
                    <div className={`text-xs truncate ${feed.ok ? "text-emerald-700" : "text-rose-600"}`}>{feed.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </main>
  );
}

function HeroScore({ dashboard, loading }) {
  const snapshot = dashboard.snapshotAt ? new Date(dashboard.snapshotAt).toLocaleString() : "Live";
  return (
    <div className="rounded-lg border border-emerald-100 bg-gradient-to-br from-emerald-700 via-teal-700 to-slate-900 text-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-emerald-100">Operational Health</p>
          <div className="mt-2 flex items-end gap-3">
            <span className="text-5xl font-bold">{dashboard.healthScore}</span>
            <span className="text-sm text-emerald-100 mb-2">/ 100</span>
          </div>
        </div>
        <div className="rounded-full bg-white/10 border border-white/20 p-3">
          {loading ? <RefreshCw className="w-7 h-7 animate-spin" /> : <TrendingUp className="w-7 h-7" />}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-6">
        <HeroMini label="Feeds live" value={`${dashboard.available}/${dashboard.moduleHealth.length}`} />
        <HeroMini label="Avg hours" value={compactNumber(dashboard.avgHours)} />
        <HeroMini label="Attendance" value={pct(dashboard.attendanceRate)} />
      </div>
      <div className="mt-4 text-xs text-emerald-100 inline-flex items-center gap-2">
        <Clock3 className="w-3.5 h-3.5" />
        Snapshot: {snapshot}
      </div>
    </div>
  );
}

function HeroMini({ label, value }) {
  return (
    <div className="rounded-lg bg-white/10 border border-white/15 px-3 py-2">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[11px] text-emerald-100">{label}</div>
    </div>
  );
}

function MetricCard({ title, value, detail, icon: Icon, tone = "blue" }) {
  const toneMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${toneMap[tone] || toneMap.blue}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="mt-3 text-2xl font-bold">{typeof value === "number" ? compactNumber(value) : value}</div>
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      <div className="text-xs text-slate-500 mt-1">{detail}</div>
    </div>
  );
}

function AttentionCard({ item }) {
  const tone = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  }[item.tone] || "border-slate-200 bg-white text-slate-800";
  return (
    <div className={`rounded-lg border p-4 ${tone}`}>
      <div className="text-2xl font-bold">{compactNumber(item.value)}</div>
      <div className="text-sm font-semibold">{item.label}</div>
      <div className="text-xs opacity-75 mt-1">{item.detail}</div>
    </div>
  );
}

function Panel({ title, icon: Icon, children, className = "" }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </span>
        <h2 className="font-bold text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MiniOperation({ item }) {
  const Icon = item.icon;
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <Icon className="w-4 h-4 text-slate-500" />
        <span className="text-lg font-bold">{typeof item.value === "number" ? compactNumber(item.value) : item.value}</span>
      </div>
      <div className="mt-2 text-sm font-semibold">{item.name}</div>
      <div className="text-xs text-slate-500">{item.detail}</div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="font-bold">{compactNumber(value)}</span>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">{text}</div>;
}

function BarChart({ data, barColor, dataKey, nameKey, height = 260 }) {
  if (!data?.length) return <EmptyState text="No chart data available." />;
  return (
    <div style={{ width: "100%", height }}>
      <Recharts.ResponsiveContainer>
        <Recharts.BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <Recharts.CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <Recharts.XAxis dataKey={nameKey} tick={{ fontSize: 11, fill: "#475569" }} />
          <Recharts.YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#475569" }} />
          <Recharts.Tooltip />
          <Recharts.Bar dataKey={dataKey} fill={barColor} radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </Recharts.BarChart>
      </Recharts.ResponsiveContainer>
    </div>
  );
}

function DonutChart({ data, colors: palette }) {
  if (!data?.length) return <EmptyState text="No task status data available." />;
  return (
    <div className="h-72">
      <Recharts.ResponsiveContainer>
        <Recharts.PieChart>
          <Recharts.Pie data={data} dataKey="value" nameKey="name" innerRadius={65} outerRadius={100} paddingAngle={3}>
            {data.map((_, index) => (
              <Recharts.Cell key={index} fill={palette[index % palette.length]} />
            ))}
          </Recharts.Pie>
          <Recharts.Tooltip />
          <Recharts.Legend />
        </Recharts.PieChart>
      </Recharts.ResponsiveContainer>
    </div>
  );
}

function ComposedFinanceChart({ income, expense, net }) {
  const data = [
    { name: "Income", amount: income },
    { name: "Expense", amount: expense },
    { name: "Net", amount: net },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Income" value={currency(income)} />
        <MiniStat label="Expense" value={currency(expense)} />
        <MiniStat label="Net" value={currency(net)} />
      </div>
      <BarChart data={data} barColor={net >= 0 ? colors.emerald : colors.rose} dataKey="amount" nameKey="name" height={210} />
    </div>
  );
}

function PipelineChart({ data }) {
  if (!data?.length) return <EmptyState text="No pipeline data available." />;
  return (
    <div className="h-72">
      <Recharts.ResponsiveContainer>
        <Recharts.BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <Recharts.CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <Recharts.XAxis type="number" allowDecimals={false} />
          <Recharts.YAxis type="category" dataKey="name" width={86} tick={{ fontSize: 12 }} />
          <Recharts.Tooltip />
          <Recharts.Legend />
          <Recharts.Bar dataKey="total" name="Total" fill={colors.sky} radius={[0, 6, 6, 0]} isAnimationActive={false} />
          <Recharts.Bar dataKey="active" name="Active" fill={colors.amber} radius={[0, 6, 6, 0]} isAnimationActive={false} />
        </Recharts.BarChart>
      </Recharts.ResponsiveContainer>
    </div>
  );
}
