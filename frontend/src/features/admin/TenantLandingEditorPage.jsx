import React, { useEffect, useMemo, useState } from "react";
import { Eye, Globe2, Loader2, Plus, Save, Trash2, UploadCloud } from "lucide-react";
import { getTenantLanding, saveTenantLanding } from "../../api/multiTenantApi";
import { API_BASE } from "../../api";
import { getToken } from "../../utils/auth";
import TenantLogo from "../../components/TenantLogo";

const blankLanding = {
  heroTitle: "",
  heroSubtitle: "",
  logoUrl: "",
  heroImageUrl: "",
  primaryColor: "#0f766e",
  accentColor: "#f59e0b",
  contactEmail: "",
  contactPhone: "",
  address: "",
  serviceTimes: [],
  socialLinks: [],
  sections: [],
  published: true,
};

const sampleSections = [
  {
    type: "story",
    eyebrow: "Welcome",
    title: "A church for your family",
    text: "Write a short introduction for this church, its pastor, and its heart for the city.",
    imageUrl: "",
  },
  {
    type: "feature-grid",
    eyebrow: "Ministry",
    title: "Ministries",
    subtitle: "Show what people can join.",
    items: [
      { title: "Prayer", text: "Weekly prayer and care." },
      { title: "Youth", text: "Gatherings for young people." },
      { title: "Families", text: "Support for homes and marriages." },
    ],
  },
  {
    type: "cta",
    title: "Plan your visit",
    text: "Tell visitors what to do next.",
    buttonLabel: "Member Login",
    buttonHref: "/#/login",
  },
];

const palettePresets = [
  { name: "Emerald Gold", primaryColor: "#047857", accentColor: "#f59e0b" },
  { name: "Royal Blue", primaryColor: "#1d4ed8", accentColor: "#f97316" },
  { name: "Wine Rose", primaryColor: "#9f1239", accentColor: "#14b8a6" },
  { name: "Charcoal Lime", primaryColor: "#1f2937", accentColor: "#84cc16" },
  { name: "Violet Amber", primaryColor: "#6d28d9", accentColor: "#fbbf24" },
  { name: "Teal Coral", primaryColor: "#0f766e", accentColor: "#fb7185" },
];

function resolvePreviewImage(url = "") {
  const value = String(url || "").trim();
  if (!value) return "";
  const apiBase = String(API_BASE || "").replace(/\/+$/, "");
  const origin = apiBase.replace(/\/api\/?$/i, "").replace(/\/+$/, "");
  if (/^https?:/i.test(value)) {
    try {
      const parsed = new URL(value);
      if (parsed.pathname.startsWith("/uploads/")) {
        parsed.pathname = `/api${parsed.pathname}`;
        return parsed.toString();
      }
    } catch {
      return value;
    }
    return value;
  }
  if (/^(data:|blob:)/i.test(value)) return value;
  if (origin && value.startsWith("/api/uploads/")) return `${origin}${value}`;
  if (origin && value.startsWith("/uploads/")) return `${origin}/api${value}`;
  if (apiBase && value.startsWith("/uploads/")) return `${apiBase}${value}`;
  if (typeof window !== "undefined") return `${window.location.origin}${value.startsWith("/") ? "" : "/"}${value}`;
  return value;
}

export default function TenantLandingEditorPage() {
  const [form, setForm] = useState(blankLanding);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadingKey, setUploadingKey] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setBusy(true);
      try {
        const data = await getTenantLanding();
        if (cancelled) return;
        setForm(normalizeLanding(data));
      } catch (error) {
        if (!cancelled) setMessage(error?.message || "Could not load landing page.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const previewStyle = useMemo(
    () => ({
      "--preview-primary": form.primaryColor || "#0f766e",
      "--preview-accent": form.accentColor || "#f59e0b",
    }),
    [form.primaryColor, form.accentColor]
  );

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadImage(file, onUrl, key = "image") {
    if (!file) return;
    setUploadingKey(key);
    setMessage("");
    try {
      const token = getToken();
      const payload = new FormData();
      payload.append("file", file);
      const res = await fetch(`${API_BASE}/uploads`, {
        method: "POST",
        headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
        body: payload,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const url = data?.url || data?.Url || data?.absoluteUrl || data?.AbsoluteUrl || "";
      if (!url) throw new Error("Upload succeeded but no image URL was returned.");
      onUrl(resolvePreviewImage(url));
      setMessage("Image uploaded and added to the landing page draft.");
    } catch (error) {
      setMessage(error?.message || "Could not upload image.");
    } finally {
      setUploadingKey("");
    }
  }

  function updateList(key, index, patch) {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  function removeListItem(key, index) {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  }

  function addService() {
    setForm((prev) => ({
      ...prev,
      serviceTimes: [...prev.serviceTimes, { day: "Sunday", title: "Worship Service", time: "10:00 AM", note: "" }],
    }));
  }

  function addSocial() {
    setForm((prev) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { label: "Facebook", url: "" }],
    }));
  }

  function addSection(type = "feature-grid") {
    const template = sampleSections.find((section) => section.type === type) || sampleSections[1];
    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, structuredCloneSafe(template)],
    }));
  }

  function updateSection(index, patch) {
    updateList("sections", index, patch);
  }

  function updateSectionItem(sectionIndex, itemIndex, patch) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) => {
        if (i !== sectionIndex) return section;
        const items = Array.isArray(section.items) ? section.items : [];
        return {
          ...section,
          items: items.map((item, j) => (j === itemIndex ? { ...item, ...patch } : item)),
        };
      }),
    }));
  }

  function addSectionItem(sectionIndex) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) => {
        if (i !== sectionIndex) return section;
        return {
          ...section,
          items: [...(section.items || []), { title: "New item", text: "Describe this ministry." }],
        };
      }),
    }));
  }

  function removeSectionItem(sectionIndex, itemIndex) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) => {
        if (i !== sectionIndex) return section;
        return {
          ...section,
          items: (section.items || []).filter((_, j) => j !== itemIndex),
        };
      }),
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const saved = await saveTenantLanding(form);
      const normalized = normalizeLanding(saved);
      setForm(normalized);
      window.dispatchEvent(new CustomEvent("mahima:tenant-brand-changed", {
        detail: {
          name: normalized.heroTitle,
          heroTitle: normalized.heroTitle,
          logoUrl: normalized.logoUrl,
        },
      }));
      setMessage("Landing page saved for this tenant only.");
    } catch (error) {
      setMessage(error?.message || "Could not save landing page.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6">
      <form onSubmit={submit} className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Globe2 className="h-5 w-5 text-emerald-700" />
                <h1 className="text-2xl font-black text-slate-900">Church Landing Page</h1>
              </div>
              <label className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(form.published)}
                  onChange={(event) => setField("published", event.target.checked)}
                />
                Published
              </label>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              This is tenant-owned content. Grace, Test Church, and Mahima root can each have different branding, sections, services, and contact details.
            </p>
          </div>

          {message && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {message}
            </div>
          )}

          <Panel title="Brand And Hero">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Hero title" value={form.heroTitle} onChange={(v) => setField("heroTitle", v)} required />
              <TextField label="Hero subtitle" value={form.heroSubtitle} onChange={(v) => setField("heroSubtitle", v)} />
              <ImageUrlField label="Logo" value={form.logoUrl} onChange={(v) => setField("logoUrl", v)} onUpload={(file) => uploadImage(file, (url) => setField("logoUrl", url), "logo")} uploading={uploadingKey === "logo"} />
              <ImageUrlField label="Hero image" value={form.heroImageUrl} onChange={(v) => setField("heroImageUrl", v)} onUpload={(file) => uploadImage(file, (url) => setField("heroImageUrl", url), "hero")} uploading={uploadingKey === "hero"} wide />
              <ColorField label="Primary color" value={form.primaryColor} onChange={(v) => setField("primaryColor", v)} />
              <ColorField label="Accent color" value={form.accentColor} onChange={(v) => setField("accentColor", v)} />
            </div>
            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Palette presets</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {palettePresets.map((palette) => (
                  <button
                    key={palette.name}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, primaryColor: palette.primaryColor, accentColor: palette.accentColor }))}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                  >
                    <span className="inline-flex overflow-hidden rounded-full ring-1 ring-slate-200">
                      <span className="h-4 w-4" style={{ background: palette.primaryColor }} />
                      <span className="h-4 w-4" style={{ background: palette.accentColor }} />
                    </span>
                    {palette.name}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          <Panel
            title="Service Times"
            action={<SmallButton type="button" onClick={addService}><Plus className="h-4 w-4" /> Add Service</SmallButton>}
          >
            <div className="grid gap-3">
              {form.serviceTimes.map((service, index) => (
                <div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                  <TextField label="Day" value={service.day} onChange={(v) => updateList("serviceTimes", index, { day: v })} />
                  <TextField label="Title" value={service.title} onChange={(v) => updateList("serviceTimes", index, { title: v })} />
                  <TextField label="Time" value={service.time} onChange={(v) => updateList("serviceTimes", index, { time: v })} />
                  <TextField label="Note" value={service.note} onChange={(v) => updateList("serviceTimes", index, { note: v })} />
                  <IconButton label="Remove" onClick={() => removeListItem("serviceTimes", index)} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Contact">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Contact email" value={form.contactEmail} onChange={(v) => setField("contactEmail", v)} />
              <TextField label="Contact phone" value={form.contactPhone} onChange={(v) => setField("contactPhone", v)} />
              <label className="md:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Address</span>
                <textarea
                  value={form.address || ""}
                  onChange={(event) => setField("address", event.target.value)}
                  className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500"
                />
              </label>
            </div>
          </Panel>

          <Panel
            title="Social Links"
            action={<SmallButton type="button" onClick={addSocial}><Plus className="h-4 w-4" /> Add Link</SmallButton>}
          >
            <div className="grid gap-3">
              {form.socialLinks.map((link, index) => (
                <div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_2fr_auto]">
                  <TextField label="Label" value={link.label} onChange={(v) => updateList("socialLinks", index, { label: v })} />
                  <TextField label="URL" value={link.url} onChange={(v) => updateList("socialLinks", index, { url: v })} />
                  <IconButton label="Remove" onClick={() => removeListItem("socialLinks", index)} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Page Sections"
            action={
              <div className="flex flex-wrap gap-2">
                <SmallButton type="button" onClick={() => addSection("story")}>Add Story</SmallButton>
                <SmallButton type="button" onClick={() => addSection("feature-grid")}>Add Cards</SmallButton>
                <SmallButton type="button" onClick={() => addSection("cta")}>Add CTA</SmallButton>
              </div>
            }
          >
            <div className="grid gap-4">
              {form.sections.map((section, index) => (
                <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <select
                      value={section.type || "feature-grid"}
                      onChange={(event) => updateSection(index, { type: event.target.value })}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold"
                    >
                      <option value="story">Story</option>
                      <option value="feature-grid">Cards / Ministries</option>
                      <option value="cta">CTA</option>
                    </select>
                    <IconButton label="Remove section" onClick={() => removeListItem("sections", index)} />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <TextField label="Eyebrow" value={section.eyebrow} onChange={(v) => updateSection(index, { eyebrow: v })} />
                    <TextField label="Title" value={section.title} onChange={(v) => updateSection(index, { title: v })} />
                    <TextField label="Subtitle" value={section.subtitle} onChange={(v) => updateSection(index, { subtitle: v })} />
                    <ImageUrlField label="Section image" value={section.imageUrl} onChange={(v) => updateSection(index, { imageUrl: v })} onUpload={(file) => uploadImage(file, (url) => updateSection(index, { imageUrl: url }), `section-${index}`)} uploading={uploadingKey === `section-${index}`} />
                    <label className="md:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Text</span>
                      <textarea
                        value={section.text || ""}
                        onChange={(event) => updateSection(index, { text: event.target.value })}
                        className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500"
                      />
                    </label>
                  </div>

                  {section.type === "cta" && (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <TextField label="Button label" value={section.buttonLabel} onChange={(v) => updateSection(index, { buttonLabel: v })} />
                      <TextField label="Button link" value={section.buttonHref} onChange={(v) => updateSection(index, { buttonHref: v })} />
                    </div>
                  )}

                  {(section.type || "feature-grid") === "feature-grid" && (
                    <div className="mt-4 rounded-lg bg-white p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <b className="text-sm text-slate-700">Cards</b>
                        <SmallButton type="button" onClick={() => addSectionItem(index)}><Plus className="h-4 w-4" /> Add Card</SmallButton>
                      </div>
                      <div className="grid gap-3">
                        {(section.items || []).map((item, itemIndex) => (
                          <div key={itemIndex} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_2fr_auto]">
                            <TextField label="Card title" value={item.title} onChange={(v) => updateSectionItem(index, itemIndex, { title: v })} />
                            <TextField label="Card text" value={item.text} onChange={(v) => updateSectionItem(index, itemIndex, { text: v })} />
                            <IconButton label="Remove card" onClick={() => removeSectionItem(index, itemIndex)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Save Landing Page
          </button>
        </div>

        <aside className="xl:sticky xl:top-20 xl:h-fit">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
              <Eye className="h-4 w-4" />
              Preview
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200" style={previewStyle}>
              <div className="p-5 text-white" style={{ background: "linear-gradient(135deg, var(--preview-primary), #102033)" }}>
                <div className="flex items-center gap-3">
                  <TenantLogo src={form.logoUrl} name={form.heroTitle || "Church"} className="h-10 w-10 rounded-lg" fallbackClassName="bg-white/20 text-white" />
                  <b>{form.heroTitle || "Church name"}</b>
                </div>
                <p className="mt-5 text-2xl font-black">{form.heroTitle || "Hero title"}</p>
                <p className="mt-2 text-sm text-white/80">{form.heroSubtitle || "Hero subtitle"}</p>
              </div>
              <div className="grid gap-2 bg-slate-50 p-3">
                {form.serviceTimes.slice(0, 2).map((service, index) => (
                  <div key={index} className="rounded bg-white p-3 text-xs">
                    <b>{service.day}</b> - {service.title} at {service.time}
                  </div>
                ))}
                <div className="rounded bg-white p-3 text-xs">
                  {form.sections.length} custom section{form.sections.length === 1 ? "" : "s"}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Panel({ title, action, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function TextField({ label, value, onChange, required = false }) {
  return (
    <label>
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500"
      />
    </label>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <label>
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="mt-1 flex rounded-lg border border-slate-200 bg-white">
        <input type="color" value={value || "#0f766e"} onChange={(event) => onChange(event.target.value)} className="h-10 w-14 bg-transparent p-1" />
        <input value={value || ""} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 px-3 py-2 text-sm font-medium outline-none" />
      </div>
    </label>
  );
}

function ImageUrlField({ label, value, onChange, onUpload, uploading = false, wide = false }) {
  return (
    <label className={wide ? "md:col-span-2" : undefined}>
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="mt-1 grid gap-2">
        <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white">
          <input
            value={value || ""}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Paste image URL or upload"
            className="min-w-0 flex-1 px-3 py-2 text-sm font-medium text-slate-900 outline-none"
          />
          <span className="relative inline-flex min-h-10 cursor-pointer items-center gap-2 border-l border-slate-200 px-3 text-xs font-black text-slate-700 hover:bg-slate-50">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            Upload
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) onUpload?.(file);
              }}
              className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
          </span>
        </div>
        {value ? (
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-2">
            <img src={resolvePreviewImage(value)} alt="" className="h-14 w-20 rounded-md bg-white object-contain p-1 ring-1 ring-slate-200" />
            <span className="min-w-0 truncate text-xs font-semibold text-slate-500">{value}</span>
          </div>
        ) : null}
      </div>
    </label>
  );
}

function SmallButton({ children, ...props }) {
  return (
    <button {...props} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">
      {children}
    </button>
  );
}

function IconButton({ label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="mt-5 grid h-10 w-10 place-items-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700" aria-label={label}>
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

function normalizeLanding(data) {
  return {
    ...blankLanding,
    ...(data || {}),
    serviceTimes: Array.isArray(data?.serviceTimes) ? data.serviceTimes : [],
    socialLinks: Array.isArray(data?.socialLinks) ? data.socialLinks : [],
    sections: Array.isArray(data?.sections) && data.sections.length ? data.sections : sampleSections,
  };
}

function structuredCloneSafe(value) {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}
