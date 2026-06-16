import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Check,
  Database,
  Download,
  Filter,
  LayoutDashboard,
  LineChart,
  Loader2,
  PieChart,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings2,
  Sigma,
  SlidersHorizontal,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import * as Recharts from "recharts";
import { apiFetch } from "../../utils/fetch-auth-shim";

const aggregateOptions = [
  { value: "count", label: "Count rows" },
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
];

const filterOps = [
  { value: "contains", label: "Contains" },
  { value: "equals", label: "Equals" },
  { value: "notEquals", label: "Not equals" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less or equal" },
  { value: "startsWith", label: "Starts with" },
  { value: "endsWith", label: "Ends with" },
  { value: "in", label: "In list" },
  { value: "isEmpty", label: "Is empty" },
  { value: "isNotEmpty", label: "Is not empty" },
];

const chartOptions = [
  { value: "bar", label: "Bar", icon: BarChart3 },
  { value: "line", label: "Line", icon: LineChart },
  { value: "pie", label: "Pie", icon: PieChart },
];

function csvEscape(value) {
  const text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename, columns, rows) {
  const csv = [
    columns.map(csvEscape).join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatValue(value) {
  if (value == null || value === "") return "-";
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleString();
  return String(value);
}

function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0";
}

function typeColor(type) {
  if (type === "number") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (type === "date") return "bg-sky-50 text-sky-700 ring-sky-100";
  if (type === "boolean") return "bg-violet-50 text-violet-700 ring-violet-100";
  if (type === "uuid") return "bg-slate-100 text-slate-600 ring-slate-200";
  if (type === "json") return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-emerald-50 text-emerald-700 ring-emerald-100";
}

export default function ReportsPage() {
  const [cubes, setCubes] = useState([]);
  const [cubeKey, setCubeKey] = useState("");
  const [datasetSearch, setDatasetSearch] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dateField, setDateField] = useState("");
  const [groupBy, setGroupBy] = useState([]);
  const [measure, setMeasure] = useState("");
  const [aggregation, setAggregation] = useState("count");
  const [filters, setFilters] = useState([]);
  const [sortBy, setSortBy] = useState("");
  const [sortDir, setSortDir] = useState("desc");
  const [take, setTake] = useState(1000);
  const [chartType, setChartType] = useState("bar");
  const [result, setResult] = useState({ columns: [], rows: [], totalRows: 0, returnedRows: 0, mode: "detail" });
  const [loading, setLoading] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [error, setError] = useState("");

  const activeCube = useMemo(
    () => cubes.find((cube) => cube.key === cubeKey) || cubes[0] || null,
    [cubes, cubeKey]
  );

  const fields = activeCube?.fields || [];
  const dateFields = fields.filter((field) => field.type === "date");
  const numericFields = fields.filter((field) => field.type === "number");
  const visibleFields = useMemo(() => {
    const term = fieldSearch.trim().toLowerCase();
    if (!term) return fields;
    return fields.filter((field) =>
      `${field.label} ${field.key} ${field.type} ${field.dbType || ""}`.toLowerCase().includes(term)
    );
  }, [fields, fieldSearch]);

  const filteredCubes = useMemo(() => {
    const term = datasetSearch.trim().toLowerCase();
    if (!term) return cubes;
    return cubes.filter((cube) =>
      `${cube.name} ${cube.key} ${cube.description}`.toLowerCase().includes(term)
    );
  }, [cubes, datasetSearch]);

  const chartRows = useMemo(() => {
    const rows = Array.isArray(result?.rows) ? result.rows : [];
    return rows
      .filter((row) => row.value !== undefined || row.rows !== undefined)
      .slice(0, 20)
      .map((row, index) => ({
        name: groupBy.map((field) => row[field]).filter((value) => value != null && value !== "").join(" / ") || `Row ${index + 1}`,
        value: Number(row.value ?? row.rows ?? 0),
        rows: Number(row.rows ?? 0),
      }));
  }, [result, groupBy]);

  const resultColumns = useMemo(() => {
    if (Array.isArray(result.columns) && result.columns.length) return result.columns;
    return Object.keys(result.rows?.[0] || {});
  }, [result]);

  async function loadCubes() {
    setMetadataLoading(true);
    setError("");
    try {
      const data = await apiFetch("/reports/cubes", { timeoutMs: 45000 });
      const nextCubes = Array.isArray(data) ? data : [];
      setCubes(nextCubes);
      if (nextCubes.length) {
        const preferred = nextCubes.find((cube) => cube.key === cubeKey) || nextCubes.find((cube) => cube.key === "users") || nextCubes[0];
        selectCube(preferred, { keepResult: true });
      }
    } catch (err) {
      setError(err?.body || err?.message || "Could not load database tables.");
    } finally {
      setMetadataLoading(false);
    }
  }

  function selectCube(cubeOrKey, options = {}) {
    const cube = typeof cubeOrKey === "string" ? cubes.find((item) => item.key === cubeOrKey) : cubeOrKey;
    if (!cube) return;

    setCubeKey(cube.key);
    setSelectedColumns([]);
    setGroupBy([]);
    setFilters([]);
    setDateField((cube.fields || []).find((field) => field.type === "date")?.key || "");
    setMeasure((cube.fields || []).find((field) => field.type === "number")?.key || "");
    setSortBy((cube.fields || []).find((field) => field.type === "date")?.key || (cube.fields || [])[0]?.key || "");
    setSortDir("desc");
    if (!options.keepResult) {
      setResult({ columns: [], rows: [], totalRows: 0, returnedRows: 0, mode: "detail" });
    }
  }

  async function runReport() {
    if (!activeCube) return;

    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/reports/run", {
        method: "POST",
        timeoutMs: 90000,
        body: JSON.stringify({
          cube: activeCube.key,
          columns: selectedColumns.length ? selectedColumns : null,
          from: from || null,
          to: to || null,
          dateField: dateField || null,
          groupBy,
          measure: measure || null,
          aggregation,
          filters,
          sortBy: sortBy || null,
          sortDir,
          take: Number(take) || 1000,
          skip: 0,
        }),
      });
      setResult({
        columns: Array.isArray(data?.columns) ? data.columns : [],
        rows: Array.isArray(data?.rows) ? data.rows : [],
        totalRows: data?.totalRows || 0,
        returnedRows: data?.returnedRows || 0,
        mode: data?.mode || "detail",
        generatedAtUtc: data?.generatedAtUtc,
        metadata: data?.metadata || [],
      });
    } catch (err) {
      setError(err?.body || err?.message || "Could not generate report.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCubes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSelectedColumn(fieldKey) {
    setSelectedColumns((current) =>
      current.includes(fieldKey) ? current.filter((field) => field !== fieldKey) : [...current, fieldKey]
    );
  }

  function toggleGroup(fieldKey) {
    setGroupBy((current) =>
      current.includes(fieldKey) ? current.filter((field) => field !== fieldKey) : [...current, fieldKey]
    );
  }

  function addFilter() {
    setFilters((current) => [...current, { field: fields[0]?.key || "", op: "contains", value: "" }]);
  }

  function updateFilter(index, patch) {
    setFilters((current) => current.map((filter, i) => (i === index ? { ...filter, ...patch } : filter)));
  }

  function removeFilter(index) {
    setFilters((current) => current.filter((_, i) => i !== index));
  }

  function handleDownload() {
    if (!resultColumns.length || !result.rows?.length) return;
    downloadCsv(`${activeCube?.key || "mahima"}_report.csv`, resultColumns, result.rows);
  }

  function clearDesign() {
    setSelectedColumns([]);
    setGroupBy([]);
    setFilters([]);
    setFrom("");
    setTo("");
    setAggregation("count");
    setMeasure(numericFields[0]?.key || "");
    setResult({ columns: [], rows: [], totalRows: 0, returnedRows: 0, mode: "detail" });
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f7fb] px-3 py-4 text-slate-950 sm:px-5 lg:px-7">
      <div className="mx-auto max-w-[1800px] space-y-4">
        <header className="overflow-hidden rounded-[28px] bg-slate-950 text-white shadow-xl">
          <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-cyan-100">
                <LayoutDashboard className="h-4 w-4" />
                BI Studio
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Advanced Reports</h1>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-black uppercase tracking-wide">
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-100">{cubes.length} tables</span>
                <span className="rounded-full bg-sky-500/15 px-3 py-1 text-sky-100">{fields.length} fields</span>
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-100">{formatNumber(result.totalRows)} matching rows</span>
              </div>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <button onClick={loadCubes} disabled={metadataLoading} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-black text-white hover:bg-white/15 disabled:opacity-50">
                {metadataLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                Refresh Schema
              </button>
              <button onClick={runReport} disabled={loading || !activeCube} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 text-sm font-black text-white hover:bg-emerald-400 disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Run
              </button>
              <button onClick={handleDownload} disabled={!result.rows?.length} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-black text-white hover:bg-white/15 disabled:opacity-40">
                <Download className="h-4 w-4" />
                CSV
              </button>
              <button onClick={() => window.print()} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-black text-white hover:bg-white/15">
                <Printer className="h-4 w-4" />
                Print
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            <X className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="grid min-w-0 gap-4 xl:grid-cols-[330px_minmax(380px,420px)_minmax(0,1fr)]">
          <aside className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-lg font-black">
                <Database className="h-5 w-5 text-emerald-600" />
                Data
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">{filteredCubes.length}</span>
            </div>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={datasetSearch}
                onChange={(event) => setDatasetSearch(event.target.value)}
                placeholder="Search tables..."
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-bold outline-none focus:border-emerald-500 focus:bg-white"
              />
            </label>
            <div className="mt-3 max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {filteredCubes.map((cube) => (
                <button
                  key={cube.key}
                  type="button"
                  onClick={() => selectCube(cube)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    activeCube?.key === cube.key
                      ? "border-emerald-300 bg-emerald-50 shadow-sm"
                      : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900">{cube.name}</p>
                      <p className="truncate text-xs font-bold text-slate-500">{cube.description}</p>
                    </div>
                    {activeCube?.key === cube.key && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-black uppercase tracking-wide">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{cube.fields?.length || 0} fields</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{formatNumber(cube.approximateRows)} est.</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <aside className="min-w-0 space-y-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="inline-flex items-center gap-2 text-lg font-black">
                <Settings2 className="h-5 w-5 text-indigo-600" />
                Builder
              </h2>
              <button onClick={clearDesign} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">
                Clear
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <label>
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">From</span>
                <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-500" />
              </label>
              <label>
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">To</span>
                <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-500" />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">Date column</span>
              <select value={dateField} onChange={(event) => setDateField(event.target.value)} className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500">
                <option value="">No date filter</option>
                {dateFields.map((field) => (
                  <option key={field.key} value={field.key}>{field.label}</option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <label>
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Aggregation</span>
                <select value={aggregation} onChange={(event) => setAggregation(event.target.value)} className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500">
                  {aggregateOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Measure</span>
                <select value={measure} onChange={(event) => setMeasure(event.target.value)} className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500">
                  <option value="">Rows</option>
                  {numericFields.map((field) => (
                    <option key={field.key} value={field.key}>{field.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <label>
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Sort by</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500">
                  <option value="">Default</option>
                  {fields.map((field) => (
                    <option key={field.key} value={field.key}>{field.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Direction</span>
                <select value={sortDir} onChange={(event) => setSortDir(event.target.value)} className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500">
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </label>
              <label>
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Limit</span>
                <input type="number" min="1" max="20000" value={take} onChange={(event) => setTake(event.target.value)} className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-emerald-500" />
              </label>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                  <Sigma className="h-4 w-4" />
                  Group by
                </p>
                <span className="text-xs font-black text-slate-400">{groupBy.length}</span>
              </div>
              <div className="max-h-36 space-y-2 overflow-y-auto rounded-2xl bg-slate-50 p-2">
                {fields.map((field) => (
                  <FieldToggle key={field.key} field={field} active={groupBy.includes(field.key)} onClick={() => toggleGroup(field.key)} />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                  <Filter className="h-4 w-4" />
                  Filters
                </p>
                <button type="button" onClick={addFilter} className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {filters.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-500">No filters</p>
                ) : (
                  filters.map((filter, index) => (
                    <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-slate-500">Filter {index + 1}</span>
                        <button type="button" onClick={() => removeFilter(index)} className="text-slate-400 hover:text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid gap-2">
                        <select value={filter.field} onChange={(event) => updateFilter(index, { field: event.target.value })} className="h-10 rounded-xl border border-slate-200 bg-white px-2 text-sm font-bold">
                          {fields.map((field) => (
                            <option key={field.key} value={field.key}>{field.label}</option>
                          ))}
                        </select>
                        <select value={filter.op} onChange={(event) => updateFilter(index, { op: event.target.value })} className="h-10 rounded-xl border border-slate-200 bg-white px-2 text-sm font-bold">
                          {filterOps.map((op) => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                        {!["isEmpty", "isNotEmpty"].includes(filter.op) && (
                          <input value={filter.value || ""} onChange={(event) => updateFilter(index, { value: event.target.value })} placeholder="Value" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>

          <main className="min-w-0 space-y-4">
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={Database} label="Dataset" value={activeCube?.name || "-"} compact />
              <MetricCard icon={Table2} label="Matched" value={formatNumber(result.totalRows)} />
              <MetricCard icon={LayoutDashboard} label="Returned" value={formatNumber(result.returnedRows || result.rows?.length || 0)} />
              <MetricCard icon={CalendarDays} label="Mode" value={result.mode === "summary" ? "Summary" : "Detail"} />
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-black">Fields</h2>
                  <p className="text-sm font-semibold text-slate-500">{selectedColumns.length ? `${selectedColumns.length} selected` : "All reportable fields selected"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSelectedColumns(fields.map((field) => field.key))} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Select all</button>
                  <button onClick={() => setSelectedColumns([])} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Use all</button>
                </div>
              </div>
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={fieldSearch}
                  onChange={(event) => setFieldSearch(event.target.value)}
                  placeholder="Search fields..."
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-bold outline-none focus:border-emerald-500 focus:bg-white"
                />
              </label>
              <div className="mt-3 grid max-h-52 gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
                {visibleFields.map((field) => {
                  const active = selectedColumns.length === 0 || selectedColumns.includes(field.key);
                  return (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => toggleSelectedColumn(field.key)}
                      className={`rounded-2xl border p-3 text-left transition ${
                        active ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-900">{field.label}</p>
                          <p className="truncate text-xs font-semibold text-slate-500">{field.key}</p>
                        </div>
                        {active && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
                      </div>
                      <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase ring-1 ${typeColor(field.type)}`}>
                        {field.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-black">Visualization</h2>
                  <p className="text-sm font-semibold text-slate-500">{chartRows.length ? `${chartRows.length} plotted groups` : "Add group fields for charts"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {chartOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setChartType(option.value)}
                        className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-black ${
                          chartType === option.value ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="h-[260px] rounded-3xl bg-slate-50 p-3 sm:h-[320px]">
                {chartRows.length ? <ReportChart type={chartType} rows={chartRows} /> : <EmptyChart />}
              </div>
            </section>

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-black">Report Data</h2>
                  <p className="text-sm font-semibold text-slate-500">
                    {result.generatedAtUtc ? `Generated ${new Date(result.generatedAtUtc).toLocaleString()}` : activeCube?.description || ""}
                  </p>
                </div>
                <button onClick={handleDownload} disabled={!result.rows?.length} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-20 text-sm font-black text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating...
                  </div>
                ) : result.rows?.length ? (
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      <tr>
                        {resultColumns.map((column) => (
                          <th key={column} className="whitespace-nowrap px-4 py-3">{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {result.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-slate-50">
                          {resultColumns.map((column) => (
                            <td key={column} className="max-w-[260px] truncate px-3 py-3 font-semibold text-slate-700 sm:max-w-[340px] sm:px-4">
                              {formatValue(row[column])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-5 py-20 text-center">
                    <BarChart3 className="mx-auto h-12 w-12 text-slate-300" />
                    <p className="mt-3 text-lg font-black text-slate-700">No report yet</p>
                    <p className="text-sm font-semibold text-slate-500">Select a table, choose fields, then run.</p>
                  </div>
                )}
              </div>
            </section>
          </main>
        </section>
      </div>
    </div>
  );
}

function FieldToggle({ field, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-bold ${
        active ? "bg-slate-950 text-white" : "bg-white text-slate-700 hover:bg-slate-100"
      }`}
    >
      <span className="truncate">{field.label}</span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>
        {field.type}
      </span>
    </button>
  );
}

function MetricCard({ icon: Icon, label, value, compact = false }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
          <p className={`${compact ? "truncate text-base" : "text-2xl"} font-black text-slate-950`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function ReportChart({ type, rows }) {
  const colors = ["#059669", "#2563eb", "#f59e0b", "#e11d48", "#7c3aed", "#0f766e", "#ea580c", "#0891b2"];

  if (type === "pie") {
    return (
      <Recharts.ResponsiveContainer width="100%" height="100%">
        <Recharts.PieChart>
          <Recharts.Tooltip formatter={(value) => formatNumber(value)} />
          <Recharts.Legend />
          <Recharts.Pie data={rows} dataKey="value" nameKey="name" innerRadius={65} outerRadius={105} paddingAngle={3}>
            {rows.map((_, index) => (
              <Recharts.Cell key={index} fill={colors[index % colors.length]} />
            ))}
          </Recharts.Pie>
        </Recharts.PieChart>
      </Recharts.ResponsiveContainer>
    );
  }

  if (type === "line") {
    return (
      <Recharts.ResponsiveContainer width="100%" height="100%">
        <Recharts.LineChart data={rows} margin={{ top: 12, right: 20, left: -10, bottom: 8 }}>
          <Recharts.CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <Recharts.XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={70} />
          <Recharts.YAxis tick={{ fontSize: 11 }} />
          <Recharts.Tooltip formatter={(value) => formatNumber(value)} />
          <Recharts.Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
        </Recharts.LineChart>
      </Recharts.ResponsiveContainer>
    );
  }

  return (
    <Recharts.ResponsiveContainer width="100%" height="100%">
      <Recharts.BarChart data={rows} margin={{ top: 12, right: 20, left: -10, bottom: 8 }}>
        <Recharts.CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <Recharts.XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={70} />
        <Recharts.YAxis tick={{ fontSize: 11 }} />
        <Recharts.Tooltip formatter={(value) => formatNumber(value)} />
        <Recharts.Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#059669" />
      </Recharts.BarChart>
    </Recharts.ResponsiveContainer>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <SlidersHorizontal className="h-12 w-12 text-slate-300" />
      <p className="mt-3 text-lg font-black text-slate-700">Summary chart appears here</p>
      <p className="text-sm font-semibold text-slate-500">Select at least one group field and run.</p>
    </div>
  );
}
