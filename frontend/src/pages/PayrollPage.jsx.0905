// src/pages/PayrollPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  FileText,
  Download,
  Calendar as CalendarIcon,
  User as UserIcon,
  Settings as SettingsIcon,
  Loader2,
  History as HistoryIcon,
  Trash2,
} from "lucide-react";
import api from "../api";

// Helper: current month range
function getCurrentMonthRange() {
  const now = dayjs();
  const from = now.startOf("month").format("YYYY-MM-DD");
  const to = now.endOf("month").format("YYYY-MM-DD");
  return { from, to };
}

// Read current user (for header + slip filename)
function useCurrentUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem("mahima:user") ||
        localStorage.getItem("currentUser") ||
        null;
      if (raw) setUser(JSON.parse(raw));
    } catch (e) {
      console.warn("Cannot parse current user from localStorage", e);
    }
  }, []);

  return { user };
}

const INITIAL_SUMMARY = {
  userId: "",
  displayName: "",
  from: "",
  to: "",
  totalHours: 0,
  hourlyRate: 0,
  fixedAmount: 0,
  hourlyAmount: 0,
  allowances: 0,
  deductions: 0,
  grossAmount: 0,
  netAmount: 0,
};

export default function PayrollPage() {
  const { from: initialFrom, to: initialTo } = getCurrentMonthRange();
  const { user: currentUser } = useCurrentUser();

  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [staffList, setStaffList] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [summary, setSummary] = useState(INITIAL_SUMMARY);
  const [settings, setSettings] = useState({
    userId: "",
    hourlyRate: 0,
    monthlyFixedAmount: 0,
    allowances: 0,
    deductions: 0,
    isActive: true,
  });

  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingSlip, setLoadingSlip] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // DB-backed payroll history for selected staff
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [downloadingHistoryId, setDownloadingHistoryId] = useState(null);
  const [deletingRunId, setDeletingRunId] = useState(null);
  const [currentRunId, setCurrentRunId] = useState(null);

  // Load all staff (role = Staff)
  useEffect(() => {
    let cancelled = false;

    const loadStaff = async () => {
      try {
        const res = await api.get("/users", { params: { role: "Staff" } });

        if (!cancelled) {
          const data = res?.data;
          let list = [];

          if (Array.isArray(data)) list = data;
          else if (Array.isArray(data?.data)) list = data.data;
          else if (Array.isArray(data?.items)) list = data.items;

          setStaffList(list);
        }
      } catch (err) {
        console.warn("Failed to load staff list", err);
        if (!cancelled) setStaffList([]);
      }
    };

    loadStaff();
    return () => {
      cancelled = true;
    };
  }, []);

  // When staff changes: load payroll settings and history
  useEffect(() => {
    if (!selectedUserId) {
      setSettings({
        userId: "",
        hourlyRate: 0,
        monthlyFixedAmount: 0,
        allowances: 0,
        deductions: 0,
        isActive: true,
      });
      setHistory([]);
      setSummary(INITIAL_SUMMARY);
      setCurrentRunId(null);
      return;
    }

    let cancelled = false;

    const loadSettings = async () => {
      try {
        const res = await api.get("/payroll/settings");
        const all = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

        const s = all.find((x) => x.userId === selectedUserId);
        if (!cancelled) {
          if (s) {
            setSettings({
              userId: s.userId,
              hourlyRate: s.hourlyRate ?? 0,
              monthlyFixedAmount: s.monthlyFixedAmount ?? 0,
              allowances: s.allowances ?? 0,
              deductions: s.deductions ?? 0,
              isActive: s.isActive !== false,
            });
          } else {
            setSettings({
              userId: selectedUserId,
              hourlyRate: 0,
              monthlyFixedAmount: 0,
              allowances: 0,
              deductions: 0,
              isActive: true,
            });
          }
        }
      } catch (err) {
        // 401/403 => not authorized to manage settings – backend will still enforce
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          console.warn("Not authorized to load payroll settings.", err);
          return;
        }
        console.error("Failed to load payroll settings", err);
      }
    };

    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await api.get("/payroll/runs", {
          params: { userId: selectedUserId },
        });
        const data = res?.data;
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : [];
        if (!cancelled) setHistory(list);
      } catch (err) {
        if (err?.response?.status === 404) {
          console.warn("Payroll runs endpoint not found yet, history disabled.");
          if (!cancelled) setHistory([]);
        } else {
          console.error("Failed to load payroll history", err);
          if (!cancelled) setHistory([]);
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };

    loadSettings();
    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [selectedUserId]);

  const effectiveUserId = useMemo(
    () => selectedUserId || "",
    [selectedUserId]
  );

  const reloadHistory = async (userId) => {
    if (!userId) return;
    setLoadingHistory(true);
    try {
      const res = await api.get("/payroll/runs", { params: { userId } });
      const data = res?.data;
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];
      setHistory(list);
    } catch (err) {
      if (err?.response?.status === 404) {
        console.warn("Payroll runs endpoint not found.");
        setHistory([]);
      } else {
        console.error("Failed to reload history", err);
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  /**
   * Calculate payroll on frontend (attendance + expenses + settings)
   * then persist the final summary into staff_payroll_runs.
   */
  const handleCalculate = async () => {
    setError("");
    setSuccessMsg("");

    if (!effectiveUserId) {
      setError("Please select a staff member for payroll summary.");
      return;
    }

    setLoadingSummary(true);
    try {
      const params = {
        from: fromDate,
        to: toDate,
        userId: effectiveUserId,
      };

      const monthKey = dayjs(fromDate).format("YYYY-MM");

      const [payrollRes, attendanceRes, expensesRes] = await Promise.all([
        api.get("/payroll/summary", { params }),
        api.get("/attendance", {
          params: {
            from: fromDate,
            to: toDate,
            userId: effectiveUserId,
          },
        }),
        api.get("/expenses", {
          params: { month: monthKey, category: "PAYROLL" },
        }),
      ]);

      const data = payrollRes.data || {};

      // ---- ATTENDANCE: count present days ----
      const rawAttendance = attendanceRes?.data || [];
      const attendanceList = Array.isArray(rawAttendance)
        ? rawAttendance
        : Array.isArray(rawAttendance?.data)
        ? rawAttendance.data
        : [];

      const attendancePresentDays = attendanceList.filter((r) => {
        const s = (r.status ?? r.Status ?? "")
          .toString()
          .trim()
          .toLowerCase();
        return s === "present" || s === "p";
      }).length;

      const totalHours = attendancePresentDays * 9;

      // ---- HOURLY RATE ----
      const hourlyRate =
        Number(settings.hourlyRate) ||
        Number(data.hourlyRate ?? data.HourlyRate ?? 0);

      // ---- FIXED + ALLOWANCES ----
      const fixedAmount =
        Number(data.fixedAmount ?? data.monthlyFixedAmount) ||
        Number(settings.monthlyFixedAmount) ||
        0;

      const allowances =
        Number(data.allowances ?? data.Allowances) ||
        Number(settings.allowances) ||
        0;

      // ---- PAYROLL ADVANCE FROM EXPENSES ----
      const expensesRaw = expensesRes?.data || [];
      const expensesList = Array.isArray(expensesRaw)
        ? expensesRaw
        : Array.isArray(expensesRaw?.data)
        ? expensesRaw.data
        : [];

      const staff = (Array.isArray(staffList) ? staffList : []).find(
        (u) => (u.id || u.userId) === effectiveUserId
      );

      const staffId = String(
        staff?.id ?? staff?.userId ?? effectiveUserId ?? ""
      )
        .trim()
        .toLowerCase();
      const staffUsername = (staff?.username || "").trim().toLowerCase();
      const staffEmail = (staff?.email || "").trim().toLowerCase();
      const staffDisplay = (
        staff?.displayName ||
        staff?.fullName ||
        ""
      )
        .trim()
        .toLowerCase();

      const payrollAdvance = expensesList
        .filter((e) => {
          const person = (
            e.payrollPerson ??
            e.PayrollPerson ??
            ""
          )
            .toString()
            .trim()
            .toLowerCase();
          const month = (e.payrollMonth ?? e.PayrollMonth ?? "")
            .toString()
            .trim();

          const monthMatches = !month || month === monthKey;
          if (!person || !monthMatches) return false;

          return (
            person === staffDisplay ||
            person === staffUsername ||
            person === staffEmail ||
            person === staffId
          );
        })
        .reduce((sum, e) => sum + Number(e.amount ?? e.Amount ?? 0), 0);

      const fines = Number(settings.deductions || 0);

      const grossAmount = totalHours * hourlyRate;
      let deductions = fines + payrollAdvance;
      if (deductions < 0) deductions = 0;

      let netAmount = grossAmount - deductions;
      if (netAmount < 0) netAmount = 0;

      const hourlyAmount = totalHours * hourlyRate;

      const fromVal = data.from || fromDate;
      const toVal = data.to || toDate;
      const userIdVal = data.userId || effectiveUserId;
      const displayNameVal =
        data.displayName ||
        staff?.displayName ||
        staff?.fullName ||
        staff?.username ||
        staff?.email ||
        userIdVal;

      const newSummary = {
        ...INITIAL_SUMMARY,
        ...data,
        from: fromVal,
        to: toVal,
        userId: userIdVal,
        displayName: displayNameVal,
        totalHours,
        hourlyRate,
        fixedAmount,
        hourlyAmount,
        allowances,
        deductions,
        grossAmount,
        netAmount,
      };

      setSummary(newSummary);

      // ---- SAVE RUN SNAPSHOT INTO DB ----
      try {
        const runPayload = {
          userId: newSummary.userId,
          displayName: newSummary.displayName,
          from: newSummary.from,
          to: newSummary.to,
          totalHours: newSummary.totalHours,
          hourlyRate: newSummary.hourlyRate,
          fixedAmount: newSummary.fixedAmount,
          hourlyAmount: newSummary.hourlyAmount,
          allowances: newSummary.allowances,
          deductions: newSummary.deductions,
          grossAmount: newSummary.grossAmount,
          netAmount: newSummary.netAmount,
        };

        const runRes = await api.post("/payroll/runs", runPayload);
        const created = runRes?.data || {};
        const runId = created.id ?? created.Id ?? null;
        setCurrentRunId(runId);

        await reloadHistory(effectiveUserId);
      } catch (saveErr) {
        if (saveErr?.response?.status === 404) {
          console.warn("POST /payroll/runs not found – history disabled.");
        } else {
          console.error("Failed to save payroll run", saveErr);
        }
      }

      setSuccessMsg("Payroll summary updated from attendance and costs.");
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data ||
          "Failed to calculate payroll."
      );
    } finally {
      setLoadingSummary(false);
    }
  };

  // Generate payslip PDF based on current period using legacy /payroll/slip
  const handleDownloadSlip = async () => {
    setError("");
    setSuccessMsg("");

    if (!effectiveUserId) {
      setError("Please select a staff member to download salary slip.");
      return;
    }

    setLoadingSlip(true);
    try {
      const res = await api.get("/payroll/slip", {
        params: {
          userId: effectiveUserId,
          from: fromDate,
          to: toDate,
        },
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      const name =
        summary.displayName ||
        summary.userId ||
        currentUser?.displayName ||
        "salary";

      link.href = url;
      link.setAttribute(
        "download",
        `SalarySlip_${name}_${dayjs(fromDate).format("YYYYMM")}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMsg("Salary slip downloaded.");
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data ||
          "Failed to download salary slip."
      );
    } finally {
      setLoadingSlip(false);
    }
  };

  // Generate payslip PDF for a specific historical run (if /runs exists)
  const handleDownloadSlipForHistory = async (record) => {
    setError("");
    setSuccessMsg("");
    if (!record) return;

    const runId = record.id || record.Id;
    if (!runId) return;

    setDownloadingHistoryId(runId);
    try {
      const res = await api.get(`/payroll/runs/${runId}/slip`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      const name =
        record.displayName ||
        record.DisplayName ||
        record.userId ||
        record.UserId ||
        currentUser?.displayName ||
        "salary";

      const fromVal = record.from || record.From;

      link.href = url;
      link.setAttribute(
        "download",
        `SalarySlip_${name}_${dayjs(fromVal).format("YYYYMM")}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMsg("Salary slip downloaded for selected payroll run.");
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data ||
          "Failed to download salary slip for the selected run."
      );
    } finally {
      setDownloadingHistoryId(null);
    }
  };

  // Delete a payroll run
  const handleDeleteRun = async (record) => {
    const runId = record.id || record.Id;
    if (!runId) return;

    setError("");
    setSuccessMsg("");
    setDeletingRunId(runId);

    try {
      await api.delete(`/payroll/runs/${runId}`);
      await reloadHistory(effectiveUserId);

      if (currentRunId === runId) setCurrentRunId(null);

      setSuccessMsg("Payroll run deleted.");
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data ||
          "Failed to delete payroll run."
      );
    } finally {
      setDeletingRunId(null);
    }
  };

  // Save payroll setup for selected staff
  const handleSaveSettings = async () => {
    if (!settings.userId) {
      setError("Select a staff member before saving payroll setup.");
      return;
    }

    setError("");
    setSuccessMsg("");
    setSavingSettings(true);

    try {
      const payload = {
        userId: settings.userId,
        hourlyRate: Number(settings.hourlyRate) || 0,
        monthlyFixedAmount: Number(settings.monthlyFixedAmount) || 0,
        allowances: Number(settings.allowances) || 0,
        deductions: Number(settings.deductions) || 0,
        isActive: !!settings.isActive,
      };

      await api.post("/payroll/settings", payload);
      setSuccessMsg("Payroll settings saved for this staff member.");
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data ||
          "Failed to save payroll settings."
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSettingsChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const roleLabel = useMemo(() => {
    if (!currentUser) return "";
    const primary =
      currentUser.role ||
      currentUser.Role ||
      (Array.isArray(currentUser.roles) && currentUser.roles[0]) ||
      (Array.isArray(currentUser.authorities) &&
        currentUser.authorities[0]) ||
      "";
    return primary ? String(primary).toUpperCase() : "";
  }, [currentUser]);

  const showSummary = !!summary && !!summary.from;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-orange-50 px-3 sm:px-6 py-4 sm:py-6">
      {/* Header */}
      <header className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800">
            Payroll
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Step 1: Configure staff payroll setup. Step 2: Calculate salary
            from attendance and generate payslips.
          </p>
        </div>
        {currentUser && (
          <div className="flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 shadow-sm border border-rose-50">
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-rose-100 text-rose-700 text-sm font-semibold">
              {(currentUser.displayName || currentUser.username || "A")
                .charAt(0)
                .toUpperCase()}
            </div>
            <div className="leading-tight">
              <div className="text-xs font-medium text-slate-700">
                {currentUser.displayName || currentUser.username || "User"}
              </div>
              <div className="text-[11px] uppercase tracking-wide text-rose-500">
                {roleLabel}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Filters & actions */}
      <section className="mb-4 sm:mb-6 rounded-2xl bg-white/80 border border-rose-50 shadow-sm p-3 sm:p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <CalendarIcon className="w-4 h-4 text-rose-500" />
          <h2 className="text-sm font-semibold text-slate-800">
            Payroll period
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="col-span-1 flex flex-col gap-1">
            <label className="text-[11px] text-slate-500">From</label>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-400"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="col-span-1 flex flex-col gap-1">
            <label className="text-[11px] text-slate-500">To</label>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-400"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          {/* Staff selector */}
          <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
            <label className="text-[11px] text-slate-500 flex items-center gap-1">
              <UserIcon className="w-3 h-3 text-rose-500" />
              Staff
            </label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-400"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Choose staff</option>
              {(Array.isArray(staffList) ? staffList : []).map((u) => (
                <option key={u.id || u.userId} value={u.id || u.userId}>
                  {u.displayName ||
                    u.fullName ||
                    u.username ||
                    u.email ||
                    u.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            onClick={handleCalculate}
            disabled={loadingSummary}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 text-white text-xs sm:text-sm px-4 py-2 font-medium shadow-sm hover:bg-rose-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loadingSummary ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Calculating…
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Calculate payroll
              </>
            )}
          </button>

          <button
            onClick={handleDownloadSlip}
            disabled={loadingSlip}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-rose-600 text-xs sm:text-sm px-4 py-2 font-medium shadow-sm border border-rose-100 hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loadingSlip ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating slip…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download salary slip (PDF)
              </>
            )}
          </button>
        </div>

        {(error || successMsg) && (
          <div className="pt-1 text-xs">
            {error && (
              <div className="text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-1">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="text-emerald-600 bg-emerald-50 border-emerald-100 rounded-xl px-3 py-2">
                {successMsg}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Summary cards */}
      {showSummary && (
        <section className="mb-4 sm:mb-6 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard
              label="Net Pay"
              value={`₹ ${summary.netAmount?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              accent="from-orange-400 to-rose-500"
            />
            <SummaryCard
              label="Gross"
              value={`₹ ${summary.grossAmount?.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
            />
            <SummaryCard
              label="Total Hours"
              value={summary.totalHours?.toFixed(2)}
            />
            <SummaryCard
              label="Hourly Rate"
              value={`₹ ${summary.hourlyRate?.toFixed(2)}`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard
              label="Fixed Amount"
              value={`₹ ${summary.fixedAmount?.toFixed(2)}`}
              subtle
            />
            <SummaryCard
              label="Allowances"
              value={`₹ ${summary.allowances?.toFixed(2)}`}
              subtle
            />
            <SummaryCard
              label="Deductions (Fines + Adv)"
              value={`₹ ${summary.deductions?.toFixed(2)}`}
              subtle
            />
          </div>
        </section>
      )}

      {/* Staff payroll setup */}
      <section className="mb-6 rounded-2xl bg-white/80 border border-rose-50 shadow-sm p-3 sm:p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <SettingsIcon className="w-4 h-4 text-rose-500" />
          <h2 className="text-sm font-semibold text-slate-800">
            Staff payroll setup
          </h2>
        </div>
        <p className="text-[11px] text-slate-500">
          Create and maintain payroll setup records for every staff member.
          These values are used when calculating salary from attendance.
        </p>

        {!selectedUserId && (
          <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            Select a staff member in the filters above to view or edit their
            payroll setup.
          </div>
        )}

        {selectedUserId && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <InputField
                label="Hourly rate (₹)"
                value={settings.hourlyRate}
                onChange={(v) =>
                  handleSettingsChange("hourlyRate", v.replace(",", ""))
                }
                type="number"
              />
              <InputField
                label="Fixed monthly (₹)"
                value={settings.monthlyFixedAmount}
                onChange={(v) =>
                  handleSettingsChange(
                    "monthlyFixedAmount",
                    v.replace(",", "")
                  )
                }
                type="number"
              />
              <InputField
                label="Allowances (₹)"
                value={settings.allowances}
                onChange={(v) =>
                  handleSettingsChange("allowances", v.replace(",", ""))
                }
                type="number"
              />
              <InputField
                label="Fines (₹)"
                value={settings.deductions}
                onChange={(v) =>
                  handleSettingsChange("deductions", v.replace(",", ""))
                }
                type="number"
              />
              <div className="flex flex-col justify-end">
                <label className="text-[11px] text-slate-500 mb-1">
                  Active
                </label>
                <button
                  type="button"
                  onClick={() =>
                    handleSettingsChange("isActive", !settings.isActive)
                  }
                  className={`inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-medium border transition ${
                    settings.isActive
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}
                >
                  {settings.isActive ? "Active" : "Inactive"}
                </button>
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 text-white text-xs sm:text-sm px-4 py-2 font-medium shadow-sm hover:bg-rose-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingSettings ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <SettingsIcon className="w-4 h-4" />
                  Save settings
                </>
              )}
            </button>
          </>
        )}
      </section>

      {/* Payroll history */}
      <section className="mb-8 rounded-2xl bg-white/80 border border-rose-50 shadow-sm p-3 sm:p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <HistoryIcon className="w-4 h-4 text-rose-500" />
          <h2 className="text-sm font-semibold text-slate-800">
            Payroll history
          </h2>
        </div>
        <p className="text-[11px] text-slate-500">
          Each payroll calculation is stored as a record. You can re-download
          the salary slip or delete records when needed. If history is empty,
          your backend might not have <code>/payroll/runs</code> enabled
          yet.
        </p>

        {!selectedUserId && (
          <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            Select a staff member to view their payroll history.
          </div>
        )}

        {selectedUserId && loadingHistory && (
          <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading history…
          </div>
        )}

        {selectedUserId && !loadingHistory && history.length === 0 && (
          <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
            No payroll runs found yet for this staff, or the runs API is not
            enabled. Calculate payroll to create a record (if the backend
            supports it).
          </div>
        )}

        {selectedUserId && !loadingHistory && history.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-rose-50 text-[11px] text-slate-600">
                  <th className="px-3 py-2 text-left">Period</th>
                  <th className="px-3 py-2 text-right">Net (₹)</th>
                  <th className="px-3 py-2 text-right">Gross (₹)</th>
                  <th className="px-3 py-2 text-right">Deductions (₹)</th>
                  <th className="px-3 py-2 text-right">Hours</th>
                  <th className="px-3 py-2 text-center">Slip</th>
                  <th className="px-3 py-2 text-center">Delete</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => {
                  const runId = r.id || r.Id;
                  const fromVal = r.from || r.From;
                  const toVal = r.to || r.To;
                  const net = r.netAmount ?? r.NetAmount ?? 0;
                  const gross = r.grossAmount ?? r.GrossAmount ?? 0;
                  const ded = r.deductions ?? r.Deductions ?? 0;
                  const hours = r.totalHours ?? r.TotalHours ?? 0;

                  return (
                    <tr
                      key={runId}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-3 py-2">
                        {dayjs(fromVal).format("DD MMM YYYY")} –{" "}
                        {dayjs(toVal).format("DD MMM YYYY")}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {net.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {gross.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {ded.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {Number(hours).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleDownloadSlipForHistory(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-100 bg-white px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={downloadingHistoryId === runId}
                        >
                          {downloadingHistoryId === runId ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          Slip
                        </button>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleDeleteRun(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-100 bg-white px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={deletingRunId === runId}
                        >
                          {deletingRunId === runId ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bottom padding for mobile */}
      <div className="h-6" />
    </div>
  );
}

/* --- Small reusable components --- */

function SummaryCard({ label, value, accent, subtle }) {
  const gradient = accent || "from-slate-50 to-rose-50";
  const borderColor = subtle ? "border-slate-100" : "border-rose-100";
  const textColor = subtle ? "text-slate-700" : "text-slate-800";

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br ${gradient} border ${borderColor} shadow-sm px-3 py-3 flex flex-col justify-between`}
    >
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className={`mt-1 text-base sm:text-lg font-semibold ${textColor}`}>
        {value ?? "-"}
      </span>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text" }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-slate-500">{label}</label>
      <input
        type={type}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-400"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
