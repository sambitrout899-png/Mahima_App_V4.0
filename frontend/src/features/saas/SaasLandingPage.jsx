import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Copy, Globe2, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { API_BASE } from "../../api";
import TenantLogo from "../../components/TenantLogo";

const TENANT_SLUG_KEY = "mahima_tenant_slug";

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function tenantUrl(slug) {
  const base = window.location.origin + window.location.pathname;
  return `${base}#/t/${encodeURIComponent(slug)}`;
}

export default function SaasLandingPage() {
  const [modules, setModules] = useState([]);
  const [form, setForm] = useState({
    churchName: "",
    slug: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    userCodePrefix: "",
    logo: null,
    adminUsername: "",
    adminPassword: "NewPass@123",
    memberUsername: "",
    memberPassword: "Member@123",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/public/modules`, { headers: { Accept: "application/json" } })
      .then((res) => (res.ok ? res.json() : { modules: [] }))
      .then((data) => setModules(Array.isArray(data?.modules) ? data.modules : []))
      .catch(() => setModules([]));
  }, []);

  const suggestedSlug = useMemo(() => slugify(form.churchName), [form.churchName]);

  function update(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "churchName" && (!current.slug || current.slug === slugify(current.churchName))) {
        const nextSlug = slugify(value);
        next.slug = nextSlug;
        if (!current.userCodePrefix) {
          next.userCodePrefix = nextSlug.replace(/[^a-z0-9]/g, "").slice(0, 4).toUpperCase() || "CH";
        }
      }
      if (field === "slug") next.slug = slugify(value);
      if (field === "userCodePrefix") next.userCodePrefix = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setResult(null);
    try {
      const payload = { ...form, slug: form.slug || suggestedSlug };
      const body = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (key === "logo") return;
        if (value !== undefined && value !== null && value !== "") body.append(key, value);
      });
      if (form.logo) body.append("logo", form.logo);
      const res = await fetch(`${API_BASE}/public/tenants/register`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.title || "Church registration failed.");
      const slug = data?.tenant?.slug || payload.slug;
      localStorage.setItem(TENANT_SLUG_KEY, slug);
      setResult({ ...data, tenantUrl: data?.tenant?.publicUrl || tenantUrl(slug) });
    } catch (err) {
      setError(err?.message || "Church registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyUrl() {
    if (!result?.tenantUrl) return;
    await navigator.clipboard?.writeText(result.tenantUrl);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="#/" className="flex items-center gap-3">
            <TenantLogo name="SaaS" className="h-11 w-11 rounded-lg" />
            <span>
              <span className="block text-lg font-black">SaaS Mahima</span>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Powered by Mahima Innovation Center (MIC)</span>
            </span>
          </a>
          <a href="#/login" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">Login</a>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_520px] lg:py-16">
          <div className="self-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-100">
              <Sparkles className="h-4 w-4" />
              Multi-tenant Mahima beta
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-tight text-slate-950 sm:text-6xl">
              Register your church and get a Mahima tenant URL.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Start with free essentials for members, then enable more ministry packages from the subscription page during beta testing.
            </p>
            <div className="mt-8 grid gap-3 text-sm font-bold text-slate-700 sm:grid-cols-3">
              <Feature icon={Globe2} text="Auto-published church URL" />
              <Feature icon={ShieldCheck} text="Tenant isolated login" />
              <Feature icon={CheckCircle2} text="Free essentials included" />
            </div>
          </div>

          <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <h2 className="text-2xl font-black">Register Church</h2>
            <div className="mt-5 grid gap-4">
              <Field label="Church name" value={form.churchName} onChange={(v) => update("churchName", v)} required />
              <Field label="Church URL slug" value={form.slug} onChange={(v) => update("slug", v)} placeholder={suggestedSlug || "your-church"} required />
              <div className="rounded-lg bg-white p-3 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
                URL preview: <span className="text-emerald-800">{tenantUrl(form.slug || suggestedSlug || "your-church")}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <FileField label="Church logo" file={form.logo} onChange={(file) => update("logo", file)} />
                <Field
                  label="User code prefix"
                  value={form.userCodePrefix}
                  onChange={(v) => update("userCodePrefix", v)}
                  placeholder={(form.slug || suggestedSlug || "CH").replace(/[^a-z0-9]/g, "").slice(0, 4).toUpperCase() || "CH"}
                  maxLength={12}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Contact name" value={form.contactName} onChange={(v) => update("contactName", v)} />
                <Field label="Contact phone" value={form.contactPhone} onChange={(v) => update("contactPhone", v)} />
              </div>
              <Field label="Contact email" type="email" value={form.contactEmail} onChange={(v) => update("contactEmail", v)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Admin username" value={form.adminUsername} onChange={(v) => update("adminUsername", v)} placeholder={`${form.slug || suggestedSlug || "church"}-admin`} />
                <Field label="Admin password" value={form.adminPassword} onChange={(v) => update("adminPassword", v)} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Default member username" value={form.memberUsername} onChange={(v) => update("memberUsername", v)} placeholder={`${form.slug || suggestedSlug || "church"}-member`} />
                <Field label="Member password" value={form.memberPassword} onChange={(v) => update("memberPassword", v)} required />
              </div>
              {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{error}</div>}
              <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Create Church Tenant
              </button>
            </div>
          </form>
        </div>
      </section>

      {result && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="text-2xl font-black text-emerald-950">Church tenant created</h2>
            <p className="mt-2 text-sm font-semibold text-emerald-900">Share this URL with your church users.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 ring-1 ring-emerald-100">
              <code className="break-all text-sm font-bold text-slate-800">{result.tenantUrl}</code>
              <button type="button" onClick={copyUrl} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-black">
                <Copy className="h-4 w-4" /> Copy
              </button>
              <a href={result.tenantUrl} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-black text-white">
                Open <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-4 grid gap-3 text-sm font-bold text-slate-700 sm:grid-cols-2">
              <div>Admin: {result.adminUser?.username} / {result.adminUser?.password}</div>
              <div>Member: {result.memberUser?.username} / {result.memberUser?.password}</div>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h2 className="text-2xl font-black">Beta packages</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {modules.map((module) => (
            <div key={module.code} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">{module.isBaseModule ? "Included" : "Paid package"}</div>
              <h3 className="mt-2 text-lg font-black">{module.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{module.description}</p>
              <div className="mt-4 text-xl font-black">{Number(module.monthlyPriceInr || 0) === 0 ? "Free" : `Rs ${module.monthlyPriceInr}/mo`}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Feature({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3">
      <Icon className="h-4 w-4 text-emerald-700" />
      <span>{text}</span>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false, placeholder = "", maxLength }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        type={type}
        required={required}
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  );
}

function FileField({ label, file, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        type="file"
        accept="image/*"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold outline-none file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-black file:text-emerald-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      />
      {file && <span className="mt-1 block text-xs font-bold text-slate-500">{file.name}</span>}
    </label>
  );
}
