// src/features/admin/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Ban,
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
  balanceSheet: "Balance sheet",
  sermons: "Sermons",
  baptisms: "Baptism",
  marriage: "Marriage",
  counselling: "Counselling",
  payrollRuns: "Payroll",
  prayerRequests: "Prayer requests",
  dailyRoutines: "Daily routines",
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
function totalFrom(value, rows = arrayFrom(value)) {
  return number(value?.total ?? value?.count ?? value?.totalCount ?? value?.recordsTotal ?? rows.length);
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
function normalizeTaskStatusCode(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return 0;
  if (/^-?\d+$/.test(raw)) return Number(raw);
  if (/complete|done|closed|close|finished/.test(raw)) return 2;
  if (/progress|review/.test(raw)) return 1;
  return 0;
}

function taskStatusLabel(value) {
  const code = normalizeTaskStatusCode(value);
  if (code === 2) return "Completed";
  if (code === 3) return "On Hold";
  if (code === 1) return "In Progress";
  return "Pending";
}

function taskPriorityLabel(value) {
  const code = Number(value);
  if (code === 3) return "Critical";
  if (code === 2) return "High";
  if (code === 1) return "Medium";
  if (code === 0) return "Low";
  return String(value || "None");
}
function roleLabel(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Unassigned";
  const lower = raw.toLowerCase();
  if (lower === "1") return "Admin";
  if (lower === "2") return "Member";
  if (lower === "10") return "Volunteer";
  if (lower === "11") return "Staff";
  if (lower === "12") return "Pastor";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function userRoleOf(user) {
  return roleLabel(user?.role ?? user?.Role ?? user?.roleName ?? user?.RoleName ?? user?.roleId ?? user?.RoleId ?? user?.role_code ?? user?.roleCode);
}

function amountFrom(value, ...keys) {
  for (const key of keys) {
    if (value?.[key] !== undefined && value?.[key] !== null) return number(value[key]);
  }
  return 0;
}
function positiveRows(rows) {
  return arrayFrom(rows).filter((row) => number(row?.value ?? row?.count ?? row?.Count) > 0);
}

function rowsTotal(rows, valueKey = "value") {
  return arrayFrom(rows).reduce((sum, row) => sum + number(row?.[valueKey] ?? row?.count ?? row?.Count), 0);
}

function compactMetric(value) {
  return typeof value === "number" ? compactNumber(value) : String(value ?? "");
}

function taskDueDate(task) {
  return task?.dueDate || task?.DueDate || task?.due || task?.Due;
}

function isTaskCompleted(task) {
  return normalizeTaskStatusCode(task?.status ?? task?.Status ?? task?.statusCode ?? task?.StatusCode) === 2;
}

function isTaskOverdue(task) {
  const due = taskDueDate(task);
  return Boolean(due && !isTaskCompleted(task) && new Date(due).getTime() < Date.now());
}

function safeDate(daysBack = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function safeGet(key, url, config = {}) {
  try {
    const data = await api.get(url, config);
    return { key, ok: true, data, error: null };
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
  const balanceSheet = r.balanceSheet?.data || {};
  const balanceSheetAssets = arrayFrom(balanceSheet.assets ?? balanceSheet.Assets);
  const pnl = r.pnl?.data || {};
  const dailyRoutines = r.dailyRoutines?.data || {};

  const userRoleRows = countBy(users, userRoleOf);
  const userRoleValue = (label) => userRoleRows.find((row) => row.name.toLowerCase() === label.toLowerCase())?.value || 0;
  const userStats = {
    total: number(overview?.users?.total ?? reports?.users?.total ?? totalFrom(r.users?.data, users)),
    admins: number(overview?.users?.admins) || userRoleValue("Admin"),
    members: number(overview?.users?.members) || userRoleValue("Member"),
    staff: number(overview?.users?.staff) || userRoleValue("Staff"),
    volunteers: number(overview?.users?.volunteers) || userRoleValue("Volunteer"),
    new30: number(overview?.users?.newMembers30d),
  };

  const liveTaskRows = tasks.length ? tasks : arrayFrom(reports?.tasks?.items);
  const taskTotal = liveTaskRows.length || number(reports?.tasks?.total ?? overview?.tasks?.total);

  const taskStatus = liveTaskRows.length
    ? ["Pending", "In Progress", "Completed", "On Hold"]
        .map((name) => ({ name, value: liveTaskRows.filter((task) => taskStatusLabel(task?.status ?? task?.Status ?? task?.statusCode ?? task?.StatusCode) === name).length }))
        .filter((row) => row.value > 0)
    : reports?.tasks?.byStatus?.length
      ? reports.tasks.byStatus
          .map((x) => ({ name: taskStatusLabel(x.status), value: number(x.count) }))
          .reduce((rows, row) => {
            const existing = rows.find((item) => item.name === row.name);
            if (existing) existing.value += row.value;
            else rows.push(row);
            return rows;
          }, [])
      : [];

  const taskPriority = liveTaskRows.length
    ? ["Critical", "High", "Medium", "Low", "None"]
        .map((name) => ({ name, value: liveTaskRows.filter((task) => taskPriorityLabel(task?.priority ?? task?.Priority) === name).length }))
        .filter((row) => row.value > 0)
    : reports?.tasks?.byPriority?.length
      ? reports.tasks.byPriority.map((x) => ({ name: taskPriorityLabel(x.priority), value: number(x.count) }))
      : [];

  const completedTasks = liveTaskRows.length
    ? liveTaskRows.filter(isTaskCompleted).length
    : taskStatus.filter((x) => /complete|done|closed/i.test(x.name)).reduce((sum, x) => sum + x.value, 0);
  const openTasks = Math.max(0, taskTotal - completedTasks);
  const overdueTasks = liveTaskRows.length
    ? liveTaskRows.filter(isTaskOverdue).length
    : number(overview?.tasks?.byRole?.reduce?.((sum, row) => sum + number(row.overdue), 0));

  const chats = reports?.chats || {};
  const chatStats = {
    total: number(chats.total ?? totalFrom(r.chats?.data, arrayFrom(r.chats?.data))),
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
  const prayerReminderTotal = prayerRequests.reduce((sum, p) => sum + number(p.reminderCount ?? p.ReminderCount), 0);
  const prayerReminderToday = prayerRequests.reduce((sum, p) => sum + number(p.reminderTodayCount ?? p.ReminderTodayCount), 0);
  const prayerRequestsWithReminders = prayerRequests.filter((p) => number(p.reminderCount ?? p.ReminderCount) > 0).length;
  const prayerRagRed = prayerRequests.filter((p) => String(p.ragStatus ?? p.RagStatus).toLowerCase() === "red").length;
  const prayerRagAmber = prayerRequests.filter((p) => String(p.ragStatus ?? p.RagStatus).toLowerCase() === "amber").length;
  const prayerRagGreen = prayerRequests.filter((p) => {
    const status = String((p.ragStatus ?? p.RagStatus) || "green").toLowerCase();
    return status === "green";
  }).length;

  const ministryStatus = [
    ...countBy(baptisms, (x) => `Baptism: ${x.status || x.Status || "Pending"}`),
    ...countBy(marriage, (x) => `Marriage: ${x.status || x.Status || "Pending"}`),
    ...countBy(counselling, (x) => `Counselling: ${x.status || x.Status || "Pending"}`),
  ].slice(0, 10);

  const accountingRows = reports?.accounting?.last30Days || [];
  const income =
    amountFrom(pnl, "income", "Income", "totalIncome", "TotalIncome") ||
    accountingRows.filter((x) => /income|revenue/i.test(String(x.type ?? x.Type))).reduce((sum, x) => sum + Math.abs(amountFrom(x, "credit", "Credit", "net", "Net", "amount", "Amount")), 0);
  const expense =
    amountFrom(pnl, "expense", "Expense", "expenses", "Expenses", "totalExpense", "TotalExpense") ||
    accountingRows.filter((x) => /expense/i.test(String(x.type ?? x.Type))).reduce((sum, x) => sum + Math.abs(amountFrom(x, "debit", "Debit", "net", "Net", "amount", "Amount")), 0);
  const net = amountFrom(pnl, "net", "Net", "netIncome", "NetIncome", "netSurplus", "NetSurplus") || income - expense;
  const cashBankRows = balances.length ? balances : balanceSheetAssets;
  const cashBank = cashBankRows
    .filter((x) => /cash|bank/i.test(`${x.name || x.Name || x.accountName || x.AccountName || ""} ${x.type || x.Type || ""}`))
    .reduce((sum, x) => sum + amountFrom(x, "balance", "Balance", "closingBalance", "ClosingBalance", "amount", "Amount"), 0);

  const attendanceRate = attendance.length && userStats.staff
    ? Math.min(100, (attendance.length / (Math.max(userStats.staff, 1) * 30)) * 100)
    : number(overview?.teams?.productivity?.[0]?.attendanceRate);
  const totalHours = timesheets.reduce((sum, x) => sum + number(x.hours ?? x.Hours), 0);
  const timesheetUsers = new Set(timesheets.map((x) => x.userId ?? x.UserId ?? x.user?.id ?? x.User?.Id).filter(Boolean)).size;
  const avgHours = timesheets.length
    ? totalHours / Math.max(timesheetUsers || userStats.staff || 1, 1)
    : number(overview?.teams?.productivity?.[0]?.avgHours);

  const contentMix = countBy(sermons, (x) => x.type || x.resourceType || "Sermon");
  const reportRoleRows = arrayFrom(reports?.users?.byRole).map((x) => ({ name: roleLabel(x.role ?? x.Role), value: number(x.count ?? x.Count) }));
  const overviewRoleRows = [
    { name: "Admin", value: userStats.admins },
    { name: "Member", value: userStats.members },
    { name: "Staff", value: userStats.staff },
    { name: "Volunteer", value: userStats.volunteers },
  ];
  const usersByRole = positiveRows(reportRoleRows).length
    ? positiveRows(reportRoleRows)
    : positiveRows(userRoleRows).length
      ? positiveRows(userRoleRows)
      : positiveRows(overviewRoleRows);

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
    { label: "Prayer reminders", value: prayerReminderToday, tone: prayerReminderToday > 0 ? "amber" : "emerald", detail: `${prayerReminderTotal} total sent` },
    { label: "Prayer RAG red", value: prayerRagRed, tone: prayerRagRed > 0 ? "rose" : "emerald", detail: `${prayerRagAmber} amber` },
    { label: "Module warnings", value: failed.length, tone: failed.length ? "rose" : "emerald", detail: "Unavailable data feeds" },
  ];

  const operations = [
    { name: "Users", value: userStats.total, detail: `${userStats.new30} new members in 30d`, icon: Users },
    { name: "Chats", value: chatStats.total, detail: `${chatStats.messages30} messages in 30d`, icon: MessageSquare },
    { name: "Teams", value: totalFrom(r.teams?.data, teams) || overview?.teams?.total || 0, detail: `${compactNumber(avgHours)} avg hrs/member`, icon: Layers },
    { name: "Attendance", value: pct(attendanceRate), detail: `${attendance.length} records in 30d`, icon: CalendarCheck },
    { name: "Sermons", value: totalFrom(r.sermons?.data, sermons), detail: `${contentMix.length || 0} content categories`, icon: BarChart3 },
    { name: "Payroll", value: totalFrom(r.payrollRuns?.data, payrollRuns), detail: "Recent salary runs", icon: IndianRupee },
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
    prayerReminderTotal,
    prayerReminderToday,
    prayerRequestsWithReminders,
    prayerRagRed,
    prayerRagAmber,
    prayerRagGreen,
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
    dailyRoutines,
    dailyRoutinesFeed: r.dailyRoutines || { ok: false, error: "Daily routines feed not loaded" },
    pipelines: [
      { name: "Baptism", total: totalFrom(r.baptisms?.data, baptisms), active: baptisms.filter((x) => !/complete/i.test(String(x.status))).length },
      { name: "Marriage", total: totalFrom(r.marriage?.data, marriage), active: marriage.filter((x) => !/complete/i.test(String(x.status))).length },
      { name: "Counselling", total: totalFrom(r.counselling?.data, counselling), active: counselling.filter((x) => !/complete|closed/i.test(String(x.status))).length },
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
      safeGet("balanceSheet", "/accounting/balance-sheet", { params: { toDate: today } }),
      safeGet("sermons", "/sermons"),
      safeGet("baptisms", "/baptisms"),
      safeGet("marriage", "/marriage/admin/applications"),
      safeGet("counselling", "/counselling/admin/sessions"),
      safeGet("payrollRuns", "/payroll/runs"),
      safeGet("prayerRequests", "/prayerrequests", { params: { includeResponses: true } }),
      safeGet("dailyRoutines", "/admin/daily-routines", { params: { date: today } }),
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

  async function blockRoutineUser(userId, reason = "Blocked by admin from Daily Routines dashboard") {
    if (!userId) return;
    const ok = window.confirm("Block this user's access to Mahima App?");
    if (!ok) return;

    try {
      await api.post(`/admin/daily-routines/users/${userId}/block`, { reason });
      await loadDashboard();
    } catch (e) {
      setError(e?.message || "Unable to block user.");
    }
  }

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

        <div className="grid gap-4 2xl:grid-cols-[1.05fr_2fr]">
          <HeroScore dashboard={dashboard} loading={loading} />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-3">
            <MetricCard title="Members" value={dashboard.userStats.members} detail={`${dashboard.userStats.total} total users`} icon={Users} tone="blue" />
            <MetricCard title="Task Completion" value={pct(dashboard.taskTotal ? (dashboard.completedTasks / dashboard.taskTotal) * 100 : 0)} detail={`${dashboard.openTasks} open tasks`} icon={Target} tone="emerald" />
            <MetricCard title="Prayer Response" value={pct(dashboard.responseRate)} detail={`${dashboard.prayer30} requests in 30d`} icon={HeartHandshake} tone="violet" />
            <MetricCard title="Prayer Reminders" value={dashboard.prayerReminderToday} detail={`${dashboard.prayerReminderTotal} total sent`} icon={AlertTriangle} tone={dashboard.prayerReminderToday ? "amber" : "emerald"} />
            <MetricCard title="Net Position" value={currency(dashboard.net)} detail={`${currency(dashboard.cashBank)} cash/bank`} icon={IndianRupee} tone={dashboard.net >= 0 ? "emerald" : "rose"} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3">
          {dashboard.attention.map((item) => (
            <AttentionCard key={item.label} item={item} />
          ))}
        </div>

        <DailyRoutinesPanel data={dashboard.dailyRoutines} feed={dashboard.dailyRoutinesFeed} onBlockUser={blockRoutineUser} />

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
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${toneMap[tone] || toneMap.blue}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="mt-3 truncate text-xl font-bold sm:text-2xl">{typeof value === "number" ? compactNumber(value) : value}</div>
      <div className="text-sm font-semibold leading-snug text-slate-700">{title}</div>
      <div className="mt-1 line-clamp-2 text-xs leading-snug text-slate-500">{detail}</div>
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
    <div className={`min-w-0 rounded-lg border p-4 ${tone}`}>
      <div className="truncate text-xl font-bold sm:text-2xl">{compactNumber(item.value)}</div>
      <div className="text-sm font-semibold leading-snug">{item.label}</div>
      <div className="mt-1 line-clamp-2 text-xs leading-snug opacity-75">{item.detail}</div>
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

function DailyRoutinesPanel({ data, feed, onBlockUser }) {
  const attendance = data?.attendance || {};
  const siteUsage = data?.siteUsage || {};
  const security = data?.security || {};
  const newActivity = data?.newActivity || {};
  const malpractice = data?.malpractice || {};
  const blockedUsers = arrayFrom(data?.blockedUsers);
  const flaggedMessages = arrayFrom(malpractice?.flaggedMessages);
  const flaggedUploads = arrayFrom(malpractice?.flaggedUploads);
  const manipulation = arrayFrom(malpractice?.dataManipulationFlags);
  const cyberEvents = arrayFrom(security?.events);
  const feedError = feed && feed.ok === false ? feed.error || "Daily routines feed is unavailable." : "";

  return (
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
            <CalendarCheck className="w-4 h-4" />
          </span>
          <div>
            <h2 className="font-bold text-slate-900">Automated Daily Routines</h2>
            <p className="text-xs text-slate-500">Attendance, site activity, cyber signals, new records, and conduct review for today.</p>
          </div>
        </div>
        <div className="text-xs rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
          Report date: {data?.date || "Today"}
        </div>
      </div>

      {feedError && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          Daily routines feed error: {feedError}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <RoutineMetric title="Attendance logged" value={attendance.present} tone="emerald" />
        <RoutineMetric title="Attendance missing" value={attendance.missing} tone={attendance.missing ? "rose" : "emerald"} />
        <RoutineMetric title="Site visitors" value={siteUsage.uniqueVisitors} tone="blue" />
        <RoutineMetric title="Page views" value={siteUsage.pageViews} tone="violet" />
        <RoutineMetric title="Cyber signals" value={security.cyberSignals} tone={security.cyberSignals ? "rose" : "emerald"} />
        <RoutineMetric title="Misuse flags" value={malpractice.totalFlags} tone={malpractice.totalFlags ? "amber" : "emerald"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <RoutineList
          title="Attendance Present"
          rows={arrayFrom(attendance.presentUsers)}
          empty="No attendance logged yet."
          render={(row) => (
            <>
              <span className="font-semibold text-slate-800 truncate">{row.name || row.username || "User"}</span>
              <span className="text-xs text-slate-500">{row.role || row.detail || ""}</span>
            </>
          )}
        />
        <RoutineList
          title="Attendance Missing"
          rows={arrayFrom(attendance.missingUsers)}
          empty="Everyone in the attendance population has logged attendance."
          render={(row) => (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 truncate">{row.name || row.username || "User"}</div>
                <div className="text-xs text-slate-500">{row.role || row.detail || ""}</div>
              </div>
              {row.userId && (
                <button
                  onClick={() => onBlockUser?.(row.userId, "Blocked from attendance exception review")}
                  className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  title="Block user access"
                >
                  <Ban className="inline h-3.5 w-3.5 mr-1" />
                  Block
                </button>
              )}
            </div>
          )}
        />
        <RoutineList
          title="Top Pages Today"
          rows={arrayFrom(siteUsage.topPages)}
          empty="No page visits captured yet. Activity will appear after users navigate pages."
          render={(row) => (
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-slate-800 truncate">{row.path || "Page"}</span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">{row.views || 0}</span>
            </div>
          )}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3 mt-4">
        <RoutineList
          title="Cyber Attack Signals"
          rows={cyberEvents}
          empty={security.note || "No cyber signals captured today."}
          render={(row) => (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 truncate">{row.eventType || "Security event"}</div>
                <div className="text-xs text-slate-500 truncate">{row.path || row.details || row.username || "Application security telemetry"}</div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${row.severity === "high" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                {row.severity || "watch"}
              </span>
            </div>
          )}
        />
        <RoutineList
          title="New Users, Tasks, Team Members"
          rows={[
            ...arrayFrom(newActivity.newUsers).map((x) => ({ kind: "User", label: x.name || x.username, detail: x.role })),
            ...arrayFrom(newActivity.newTasks).map((x) => ({ kind: "Task", label: x.title, detail: x.status })),
            ...arrayFrom(newActivity.newTeamMembers).map((x) => ({ kind: "Team", label: x.userName, detail: x.teamName })),
          ]}
          empty="No new users, tasks, or team member joins captured today."
          render={(row) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 truncate">{row.label || "New activity"}</div>
                <div className="text-xs text-slate-500 truncate">{row.detail || ""}</div>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">{row.kind}</span>
            </div>
          )}
        />
        <RoutineList
          title="Misuse & Moderation"
          rows={[
            ...flaggedMessages.map((x) => ({ ...x, kind: "Chat", label: x.userName || x.userId, detail: x.preview, userId: x.userId })),
            ...flaggedUploads.map((x) => ({ ...x, kind: "Upload", label: x.fileName || x.contentType, detail: x.reason, userId: x.userId })),
            ...manipulation.map((x) => ({ ...x, kind: "Data", label: x.userName || x.userId, detail: `${x.totalChanges} changes`, userId: x.userId })),
          ]}
          empty={malpractice.moderationNote || "No misuse flags found today."}
          render={(row) => (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 truncate">{row.label || "Flag"}</div>
                <div className="text-xs text-slate-500 truncate">{row.detail || row.reason || ""}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">{row.kind}</span>
                {row.userId && (
                  <button
                    onClick={() => onBlockUser?.(row.userId, `Blocked after ${row.kind} moderation flag`)}
                    className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Block
                  </button>
                )}
              </div>
            </div>
          )}
        />
      </div>

      {blockedUsers.length > 0 && (
        <div className="mt-4 rounded-lg border border-rose-100 bg-rose-50 p-3">
          <div className="text-sm font-bold text-rose-800 mb-2">Currently Blocked Users</div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {blockedUsers.slice(0, 9).map((row) => (
              <div key={row.userId || row.username} className="rounded-md bg-white/80 border border-rose-100 px-3 py-2 text-sm">
                <div className="font-semibold text-slate-800">{row.name || row.username}</div>
                <div className="text-xs text-rose-700 truncate">{row.reason || "Blocked"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function RoutineMetric({ title, value, tone = "slate" }) {
  const toneMap = {
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-100",
    rose: "bg-rose-50 text-rose-800 border-rose-100",
    blue: "bg-blue-50 text-blue-800 border-blue-100",
    violet: "bg-violet-50 text-violet-800 border-violet-100",
    amber: "bg-amber-50 text-amber-800 border-amber-100",
    slate: "bg-slate-50 text-slate-800 border-slate-100",
  };
  return (
    <div className={`rounded-lg border p-3 ${toneMap[tone] || toneMap.slate}`}>
      <div className="truncate text-xl font-bold sm:text-2xl">{compactNumber(value || 0)}</div>
      <div className="text-xs font-semibold">{title}</div>
    </div>
  );
}

function RoutineList({ title, rows, empty, render }) {
  const allRows = arrayFrom(rows);
  const items = allRows.slice(0, 8);
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600">{allRows.length}</span>
      </div>
      {items.length ? (
        <div className="space-y-2">
          {items.map((row, index) => (
            <div key={row.id || row.userId || row.messageId || row.attachmentId || `${title}-${index}`} className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm">
              {render(row)}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">{empty}</div>
      )}
    </div>
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
      <span className="font-bold">{compactMetric(value)}</span>
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
  const hasAmounts = data.some((row) => Math.abs(number(row.amount)) > 0);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Income" value={currency(income)} />
        <MiniStat label="Expense" value={currency(expense)} />
        <MiniStat label="Net" value={currency(net)} />
      </div>
      {hasAmounts ? <BarChart data={data} barColor={net >= 0 ? colors.emerald : colors.rose} dataKey="amount" nameKey="name" height={210} /> : <EmptyState text="No income or expense movement in the selected 30-day window." />}
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











