// src/pages/CostsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import {
  Plus,
  Pencil,
  Trash2,
  Wallet,
  Users,
  CalendarRange,
  Filter,
  X,
} from "lucide-react";

//import { getToken as authGetToken } from "../auth/authService";
import { getToken as authGetToken } from "../utils/auth";
const CATEGORY_OPTIONS = [
  { value: "PAYROLL", label: "Payroll" },
  { value: "RENT", label: "Rent" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "MINISTRY_EVENT", label: "Ministry Event" },
  { value: "OUTREACH", label: "Outreach" },
  { value: "ADMIN", label: "Admin / Office" },
  { value: "OTHER", label: "Other" },
];

function attachAuth() {
  const token = authGetToken();
  if (!token) return;
  axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

const CostsPage = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [expenses, setExpenses] = useState([]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [monthFilter, setMonthFilter] = useState(dayjs().format("YYYY-MM"));

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // ------- Fetch expenses -------
  useEffect(() => {
    attachAuth();
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

 const fetchExpenses = async () => {
  try {
    setLoading(true);
    const res = await axios.get("http://localhost:5001/api/expenses");
    setExpenses(res.data || []);
  } catch (err) {
    console.error("Error fetching expenses", err);
    alert("Unable to load expenses. Please try again.");
  } finally {
    setLoading(false);
  }
};

  // ------- Computed + filtered data -------
  const filteredExpenses = useMemo(() => {
    const month = monthFilter ? dayjs(monthFilter) : null;

    return expenses.filter((exp) => {
      const matchesSearch =
        !search ||
        (exp.description || "")
          .toLowerCase()
          .includes(search.trim().toLowerCase()) ||
        (exp.vendor || "")
          .toLowerCase()
          .includes(search.trim().toLowerCase());

      const matchesCategory =
        categoryFilter === "ALL" || exp.category === categoryFilter;

      const matchesMonth =
        !month ||
        (exp.date &&
          dayjs(exp.date).format("YYYY-MM") === month.format("YYYY-MM"));

      return matchesSearch && matchesCategory && matchesMonth;
    });
  }, [expenses, search, categoryFilter, monthFilter]);

  const summary = useMemo(() => {
    let total = 0;
    let payroll = 0;
    let other = 0;

    filteredExpenses.forEach((e) => {
      const amount = Number(e.amount || 0);
      total += amount;
      if (e.category === "PAYROLL") payroll += amount;
      else other += amount;
    });

    return { total, payroll, other };
  }, [filteredExpenses]);

  // ------- CRUD handlers -------
  const openCreate = () => {
    setEditingExpense(null);
    setModalOpen(true);
  };

  const openEdit = (exp) => {
    setEditingExpense(exp);
    setModalOpen(true);
  };

  const handleSave = async (payload) => {
    try {
      setSaving(true);
      attachAuth();

      if (editingExpense?.id) {
        await axios.put(`http://localhost:5001/api/expenses/${editingExpense.id}`, payload);
      } else {
        await axios.post("http://localhost:5001/api/expenses", payload);
      }

      await fetchExpenses();
      setModalOpen(false);
      setEditingExpense(null);
    } catch (err) {
      console.error("Error saving expense", err);
      alert("Unable to save expense. Please check and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exp) => {
    if (!window.confirm(`Delete this expense: "${exp.description}" ?`)) return;

    try {
      setDeletingId(exp.id);
      attachAuth();
      await axios.delete(`http://localhost:5001/api/expenses/${exp.id}`);
      await fetchExpenses();
    } catch (err) {
      console.error("Error deleting expense", err);
      alert("Unable to delete expense.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-amber-50">
      <div className="mx-auto max-w-6xl px-3 pb-24 pt-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Costs &amp; Expenditures
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track payroll and ministry expenses in one simple view.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-amber-200 transition hover:bg-amber-600 active:scale-95"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Expense
          </button>
        </div>

        {/* Summary cards */}
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <SummaryCard
            icon={Wallet}
            label="Total this period"
            value={summary.total}
          />
          <SummaryCard
            icon={Users}
            label="Payroll"
            value={summary.payroll}
          />
          <SummaryCard
            icon={Filter}
            label="Other expenses"
            value={summary.other}
          />
        </div>

        {/* Filters */}
        <div className="mb-4 rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-100 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search description or vendor..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 pl-8 text-sm text-slate-800 outline-none ring-0 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span className="pointer-events-none absolute left-2.5 top-2.5 text-xs text-slate-400">
                  🔍
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs text-slate-500">
                  <CalendarRange className="mr-1 h-3.5 w-3.5" />
                  <input
                    type="month"
                    className="border-none bg-transparent text-xs text-slate-700 outline-none focus:ring-0"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                >
                  <option value="ALL">All categories</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 sm:justify-end">
              <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                {filteredExpenses.length} records
              </span>
              {loading && (
                <span className="animate-pulse text-xs text-amber-600">
                  Loading…
                </span>
              )}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          {filteredExpenses.length === 0 && !loading && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-500">
              No expenses found for this period.{" "}
              <button
                onClick={openCreate}
                className="font-semibold text-amber-600 underline underline-offset-2"
              >
                Add your first expense
              </button>
            </div>
          )}

          {filteredExpenses.map((exp) => (
            <article
              key={exp.id}
              className="flex flex-col rounded-2xl bg-white/90 p-3 shadow-sm ring-1 ring-slate-100 sm:flex-row sm:items-center sm:px-4"
            >
              {/* Left – main info */}
              <div className="flex flex-1 items-start gap-3">
                <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-400 text-xs font-semibold text-white shadow-sm">
                  {exp.category === "PAYROLL" ? "PR" : "EX"}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {exp.description || "Untitled expense"}
                    </h3>
                    <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                      {CATEGORY_OPTIONS.find((c) => c.value === exp.category)
                        ?.label || "Uncategorised"}
                    </span>
                    {exp.payrollPerson && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        Payroll • {exp.payrollPerson}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    <span>
                      Date:{" "}
                      <strong className="font-medium text-slate-700">
                        {exp.date
                          ? dayjs(exp.date).format("DD MMM YYYY")
                          : "-"}
                      </strong>
                    </span>
                    {exp.vendor && (
                      <span>
                        Vendor:{" "}
                        <strong className="font-medium text-slate-700">
                          {exp.vendor}
                        </strong>
                      </span>
                    )}
                    {exp.notes && (
                      <span className="max-w-xs truncate">
                        Notes:{" "}
                        <span className="font-medium text-slate-700">
                          {exp.notes}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right – amount + actions */}
              <div className="mt-3 flex items-center justify-between gap-3 sm:mt-0 sm:flex-col sm:items-end">
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">
                    ₹{Number(exp.amount || 0).toLocaleString("en-IN")}
                  </div>
                  {exp.category === "PAYROLL" && exp.payrollMonth && (
                    <div className="text-[11px] text-slate-500">
                      Payroll month:{" "}
                      <span className="font-medium text-slate-700">
                        {exp.payrollMonth}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEdit(exp)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-200 transition hover:bg-amber-50 hover:text-amber-600"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(exp)}
                    disabled={deletingId === exp.id}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-500 ring-1 ring-rose-100 transition hover:bg-rose-100 hover:text-rose-600 disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {modalOpen && (
          <ExpenseModal
            initial={editingExpense}
            onClose={() => {
              setModalOpen(false);
              setEditingExpense(null);
            }}
            onSave={handleSave}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
};

export default CostsPage;

// ---------- Summary card component ----------
const SummaryCard = ({ icon: Icon, label, value }) => (
  <div className="flex items-center rounded-2xl bg-white/90 px-4 py-3 shadow-sm ring-1 ring-slate-100">
    <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-400 text-white shadow-sm">
      <Icon className="h-5 w-5" />
    </div>
    <div className="flex flex-col">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-900">
        ₹{Number(value || 0).toLocaleString("en-IN")}
      </span>
    </div>
  </div>
);

// ---------- Modal form ----------
const ExpenseModal = ({ initial, onClose, onSave, saving }) => {
  const [form, setForm] = useState(() => ({
    description: initial?.description || "",
    category: initial?.category || "PAYROLL",
    amount: initial?.amount || "",
    date: initial?.date
      ? dayjs(initial.date).format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD"),
    vendor: initial?.vendor || "",
    notes: initial?.notes || "",
    payrollPerson: initial?.payrollPerson || "",
    payrollMonth:
      initial?.payrollMonth || dayjs().format("YYYY-MM"), // YYYY-MM
  }));

  const isPayroll = form.category === "PAYROLL";

  const updateField = (name, value) =>
    setForm((f) => ({
      ...f,
      [name]: value,
    }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.description || !form.amount) {
      alert("Description and amount are required.");
      return;
    }

    const payload = {
      ...form,
      amount: Number(form.amount),
      date: form.date ? dayjs(form.date).toISOString() : null,
    };

    if (!isPayroll) {
      payload.payrollPerson = null;
      payload.payrollMonth = null;
    }

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-3">
      <div className="w-full max-w-md rounded-3xl bg-white p-4 shadow-xl ring-1 ring-slate-200">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {initial ? "Edit expense" : "Add new expense"}
            </h2>
            <p className="text-xs text-slate-500">
              Keep your ministry finances clean and transparent.
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Description *
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
              placeholder="Example: November salary – Worship team"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Category *
              </label>
              <select
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Amount (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => updateField("amount", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Date *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => updateField("date", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Vendor / Party
              </label>
              <input
                type="text"
                value={form.vendor}
                onChange={(e) => updateField("vendor", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                placeholder="Person, shop, account…"
              />
            </div>
          </div>

          {isPayroll && (
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-emerald-50 px-3 py-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-emerald-900">
                  Staff / Worker name
                </label>
                <input
                  type="text"
                  value={form.payrollPerson}
                  onChange={(e) =>
                    updateField("payrollPerson", e.target.value)
                  }
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder="E.g. John – Worship leader"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-emerald-900">
                  Payroll month
                </label>
                <input
                  type="month"
                  value={form.payrollMonth}
                  onChange={(e) =>
                    updateField("payrollMonth", e.target.value)
                  }
                  className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              Notes
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
              placeholder="Any extra details that will help later."
            />
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-full bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-60"
            >
              {saving ? "Saving…" : initial ? "Update expense" : "Add expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
