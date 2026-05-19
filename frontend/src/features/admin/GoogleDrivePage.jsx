import React, { useEffect, useState } from "react";
import { CheckCircle2, Cloud, Download, FileUp, FolderOpen, Loader2, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { API_BASE } from "../../api";
import { getToken } from "../../utils/auth";
import { apiFetch } from "../../utils/fetch-auth-shim";

const emptySettings = {
  clientId: "",
  clientSecret: "",
  refreshToken: "",
  defaultFolderId: "",
};

export default function GoogleDrivePage() {
  const [settings, setSettings] = useState(emptySettings);
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listing, setListing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  async function load() {
    setLoading(true);
    setMessage("");
    try {
      const data = await apiFetch("/google-drive/settings");
      setSettings({ ...emptySettings, ...(data || {}) });
    } catch (err) {
      setMessage(err?.message || "Could not load Google Drive settings.");
    } finally {
      setLoading(false);
    }
  }

  async function listFiles() {
    setListing(true);
    setMessage("");
    try {
      const data = await apiFetch(`/google-drive/files?folderId=${encodeURIComponent(settings.defaultFolderId || "")}`);
      setFiles(Array.isArray(data?.files) ? data.files : []);
    } catch (err) {
      setMessage(err?.message || "Could not list Google Drive files.");
    } finally {
      setListing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    try {
      const saved = await apiFetch("/google-drive/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSettings({ ...emptySettings, ...(saved || settings) });
      setMessage("Google Drive connectivity saved.");
    } catch (err) {
      setMessage(err?.message || "Could not save Google Drive settings.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(e) {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      if (settings.defaultFolderId) form.append("folderId", settings.defaultFolderId);
      await apiFetch("/google-drive/files", { method: "POST", body: form });
      setSelectedFile(null);
      setMessage("File uploaded to Google Drive.");
      await listFiles();
    } catch (err) {
      setMessage(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function downloadFile(file) {
    const token = getToken();
    const res = await fetch(`${API_BASE}/google-drive/files/${encodeURIComponent(file.id)}/download`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: "include",
    });
    if (!res.ok) {
      setMessage(await res.text().catch(() => "Download failed."));
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name || "google-drive-file";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-full bg-slate-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              <ShieldCheck className="h-4 w-4" /> Admin Only
            </div>
            <h1 className="mt-3 text-3xl font-bold text-slate-950">Google Drive</h1>
            <p className="mt-1 text-sm text-slate-500">Upload, download, and manage ministry files from one secure Admin panel.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={listFiles}
              disabled={listing || loading}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              {listing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
            <button
              type="button"
              onClick={saveSettings}
              disabled={saving || loading}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>
        </div>

        {message && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
            <CheckCircle2 className="h-4 w-4" /> {message}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-700" />
              <h2 className="text-lg font-bold text-slate-950">Connectivity</h2>
            </div>
            <div className="space-y-4">
              <Field label="Client ID" value={settings.clientId} onChange={(v) => update("clientId", v)} />
              <Field label="Client Secret" type="password" value={settings.clientSecret} onChange={(v) => update("clientSecret", v)} placeholder="Leave masked value to keep existing" />
              <Field label="Refresh Token" type="password" value={settings.refreshToken} onChange={(v) => update("refreshToken", v)} placeholder="Leave masked value to keep existing" />
              <Field label="Default Folder ID" value={settings.defaultFolderId} onChange={(v) => update("defaultFolderId", v)} />
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <FileUp className="h-5 w-5 text-blue-700" />
              <h2 className="text-lg font-bold text-slate-950">Upload</h2>
            </div>
            <form onSubmit={uploadFile} className="flex flex-col gap-3 sm:flex-row">
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="h-11 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                Upload
              </button>
            </form>

            <div className="mt-5">
              <div className="mb-3 flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-slate-700" />
                <h2 className="text-lg font-bold text-slate-950">Files</h2>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                {files.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm font-medium text-slate-500">No files loaded.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-slate-900">{file.name}</div>
                          <div className="text-xs text-slate-500">{file.mimeType || "File"}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadFile(file)}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}
