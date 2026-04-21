// src/pages/PayrollPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import {
  FileText,
  Download,
  Calendar as CalendarIcon,
  User as UserIcon,
  Settings as SettingsIcon,
  Loader2,
} from "lucide-react";

// Helper: current month range
function getCurrentMonthRange() {
  const now = dayjs();
  const from = now.startOf("month").format("YYYY-MM-DD");
  const to = now.endOf("month").format("YYYY-MM-DD");
  return { from, to };
}

// Try to read current user & role (adjust to your auth storage as needed)
function useCurrentUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem("mahima:user") ||
        localStorage.getItem("currentUser") ||
        null;
      if (raw) {
        setUser(JSON.parse(raw));
      }
    } catch (e) {
      console.warn("Cannot parse current user from localStorage", e);
    }
  }, []);

  const isAdmin = useMemo(() => {
    if (!user || !user.role) return false;
    const r = String(user.role).toLowerCase();
    return r === "admin" || r === "administrator";
  }, [user]);

  return { user, isAdmin };
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

  const { user: currentUser, isAdmin } = useCurrentUser();

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

  // Load staff list for admins only (you can adjust the API as per your backend)
  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;

    const loadStaff = async () => {
      try {
        // If you use another endpoint, adjust here (e.g. /api/users?role=Staff)
        const res = await axios.get("/api/users", {
          params: { role: "Staff" },
        });
        if (!cancelled) {
          setStaffList(res.data || []);
        }
      } catch (err) {
        console.warn("Failed to load staff list", err);
      }
    };

    loadStaff();

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // When admin selects a staff member, also load their payroll settings
  useEffect(() => {
    if (!isAdmin || !selectedUserId) return;

    let cancelled = false;

    const loadSettings = async () => {
      try {
        const res = await axios.get("/api/payroll/settings");
        const all = res.data || [];
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
        console.error("Failed to load payroll settings", err);
      }
    };

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, selectedUserId]);

  const effectiveUserId = useMemo(() => {
    // For non-admin, we let API pick from JWT – userId param is omitted.
    if (!isAdmin) return "";
    return selectedUserId || "";
  }, [isAdmin, selectedUserId]);

  const handleCalculate = async () => {
    setError("");
    setSuccessMsg("");
    setLoadingSummary(true);
    try {
      const params = {
        from: fromDate,
        to: toDate,
      };
      if (effectiveUserId) params.userId = effectiveUserId;

      const res = await axios.get("/api/payroll/summary", { params });
      setSummary(res.data || INITIAL_SUMMARY);
      setSuccessMsg("Payroll summary updated.");
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

  const handleDownloadSlip = async () => {
    setError("");
    setSuccessMsg("");
    setLoadingSlip(true);
    try {
      const params = {
        from: fromDate,
        to: toDate,
      };
      if (effectiveUserId) params.userId = effectiveUserId;

      const res = await axios.get("/api/payroll/slip", {
        params,
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

  const handleSaveSettings = async () => {
    if (!isAdmin || !settings.userId) return;

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

      await axios.post("/api/payroll/settings", payload);
      setSuccessMsg("Payroll settings saved.");
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
    if (!currentUser?.role) return "";
    return String(currentUser.role).toUpperCase();
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
            Automatically calculate staff salaries from timesheets and generate
            salary slips.
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

          {isAdmin && (
            <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
              <label className="text-[11px] text-slate-500 flex items-center gap-1">
                <UserIcon className="w-3 h-3 text-rose-500" />
                Staff (admin only)
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-400"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Choose staff</option>
                {staffList.map((u) => (
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
          )}
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
              <div className="text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
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
              label="Deductions"
              value={`₹ ${summary.deductions?.toFixed(2)}`}
              subtle
            />
          </div>
        </section>
      )}

      {/* Admin settings */}
      {isAdmin && (
        <section className="mb-8 rounded-2xl bg-white/80 border border-rose-50 shadow-sm p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon className="w-4 h-4 text-rose-500" />
            <h2 className="text-sm font-semibold text-slate-800">
              Staff payroll settings
            </h2>
          </div>
          <p className="text-[11px] text-slate-500">
            Configure salary structure for the selected staff member. These
            values are used when calculating payroll from timesheets.
          </p>

          {!selectedUserId && (
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              Select a staff member in the filters above to view or edit their
              payroll settings.
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
                  label="Deductions (₹)"
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
      )}

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
