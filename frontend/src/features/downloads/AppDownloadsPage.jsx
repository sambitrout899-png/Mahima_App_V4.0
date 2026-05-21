import React, { useEffect, useMemo, useState } from "react";
import {
  Apple,
  Bell,
  Bot,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  MessageSquare,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Star,
  UploadCloud,
  Wifi,
} from "lucide-react";
import mahimaLogo from "../../assets/mahima-logo.png";
import { API_BASE } from "../../api";
import { getToken } from "../../utils/auth";

function envValue(key, fallback) {
  const value = import.meta.env[key];
  return value && String(value).trim() ? String(value).trim() : fallback;
}

function absoluteUrl(url) {
  if (!url) return "";
  if (/^(https?:|itms-services:|market:)/i.test(url)) return url;
  if (typeof window === "undefined") return url;
  return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

function isExternal(url) {
  if (!url || typeof window === "undefined") return false;
  return /^(https?:|itms-services:|market:)/i.test(url) && !url.startsWith(window.location.origin);
}

function detectPlatform() {
  if (typeof navigator === "undefined") return "android";
  const ua = navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "android";
}

function getCurrentUserSync() {
  try {
    const raw = localStorage.getItem("mahima_user") || localStorage.getItem("user") || localStorage.getItem("me");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function canManageReleases(user) {
  const role = String(user?.role || user?.Role || "").toLowerCase();
  return role === "admin" || role === "1";
}

function formatBytes(bytes = 0) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return "Not available";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function StoreButton({ platform, primary = false }) {
  const Icon = platform.icon;
  const external = isExternal(platform.href);

  return (
    <a
      href={platform.href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      download={platform.download ? true : undefined}
      className={[
        "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-extrabold transition",
        primary
          ? "bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-800"
          : "border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
      ].join(" ")}
    >
      {external ? <ExternalLink className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      {platform.cta}
    </a>
  );
}

function PlatformCard({ platform, preferred }) {
  const Icon = platform.icon;

  return (
    <section
      className={[
        "rounded-lg border bg-white p-5 shadow-sm",
        preferred ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <div
          className={[
            "grid h-14 w-14 shrink-0 place-items-center rounded-lg",
            platform.key === "android" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-900",
          ].join(" ")}
        >
          <Icon className="h-8 w-8" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-slate-950">{platform.title}</h2>
            {preferred ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-emerald-800">
                Recommended
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-600">{platform.subtitle}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-black uppercase text-slate-500">Version</p>
          <p className="mt-1 text-lg font-black text-slate-950">{platform.version}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-black uppercase text-slate-500">Build</p>
          <p className="mt-1 text-lg font-black text-slate-950">{platform.build}</p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-black uppercase text-slate-500">Release</p>
          <p className="mt-1 text-lg font-black text-slate-950">{platform.release}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <StoreButton platform={platform} primary={preferred} />
        <a
          href={platform.href}
          target={isExternal(platform.href) ? "_blank" : undefined}
          rel={isExternal(platform.href) ? "noreferrer" : undefined}
          download={platform.download ? true : undefined}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-base font-extrabold text-slate-800 hover:bg-slate-100"
        >
          <RefreshCw className="h-5 w-5" />
          Upgrade
        </a>
      </div>
    </section>
  );
}

function AdminReleaseUploader({ releaseInfo, releaseLoading, releaseError, onRefresh, onUploaded }) {
  const android = releaseInfo?.android || {};
  const [file, setFile] = useState(null);
  const [version, setVersion] = useState(android.latestVersion || releaseInfo?.latestVersion || "");
  const [build, setBuild] = useState(android.build || "");
  const [minSupportedVersion, setMinSupportedVersion] = useState(android.minSupportedVersion || releaseInfo?.minSupportedVersion || "");
  const [releaseNotes, setReleaseNotes] = useState(android.releaseNotes || "");
  const [forceUpgrade, setForceUpgrade] = useState(Boolean(android.forceUpgrade));
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!releaseInfo) return;
    const nextAndroid = releaseInfo.android || {};
    setVersion(nextAndroid.latestVersion || releaseInfo.latestVersion || "");
    setBuild(nextAndroid.build || "");
    setMinSupportedVersion(nextAndroid.minSupportedVersion || releaseInfo.minSupportedVersion || "");
    setReleaseNotes(nextAndroid.releaseNotes || "");
    setForceUpgrade(Boolean(nextAndroid.forceUpgrade));
  }, [releaseInfo]);

  function uploadApk(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!file) {
      setError("Choose the tested Android APK first.");
      return;
    }
    if (!String(version || "").trim()) {
      setError("Enter the latest version number.");
      return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("version", version.trim());
    form.append("build", String(build || "").trim());
    form.append("minSupportedVersion", String(minSupportedVersion || version).trim());
    form.append("releaseNotes", releaseNotes || "");
    form.append("forceUpgrade", forceUpgrade ? "true" : "false");

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/app-releases/android`);
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Accept", "application/json");

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      setProgress(Math.round((evt.loaded / evt.total) * 100));
    };
    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        const json = JSON.parse(xhr.responseText || "{}");
        onUploaded?.(json);
        setMessage("Latest Android APK published. App download and upgrade prompts now point to this tested build.");
        setFile(null);
        setProgress(100);
        return;
      }
      setError(xhr.responseText || `Upload failed (${xhr.status})`);
    };
    xhr.onerror = () => {
      setUploading(false);
      setError("Network error while uploading APK.");
    };
    xhr.onabort = () => {
      setUploading(false);
      setError("Upload cancelled.");
    };

    setUploading(true);
    setProgress(0);
    xhr.send(form);
  }

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white text-amber-800">
            <PackageCheck className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">Admin release control</p>
            <h2 className="text-xl font-black text-slate-950">Upload Latest Tested Android APK</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
              This replaces `/downloads/mahima-app.apk` and refreshes `/app-version.json` for mobile upgrade prompts.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={releaseLoading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-black text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        >
          {releaseLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      <div className="mt-4 grid gap-3 rounded-lg border border-amber-100 bg-white p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-black uppercase text-slate-500">Current Android</p>
          <p className="mt-1 text-lg font-black text-slate-950">{android.latestVersion || releaseInfo?.latestVersion || "Not published"}</p>
        </div>
        <div>
          <p className="text-xs font-black uppercase text-slate-500">Build</p>
          <p className="mt-1 text-lg font-black text-slate-950">{android.build || "Latest APK"}</p>
        </div>
        <div>
          <p className="text-xs font-black uppercase text-slate-500">Package Size</p>
          <p className="mt-1 text-lg font-black text-slate-950">{formatBytes(android.sizeBytes)}</p>
        </div>
      </div>

      {(releaseError || error || message) && (
        <div
          className={[
            "mt-4 rounded-lg border px-4 py-3 text-sm font-bold",
            error || releaseError ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700",
          ].join(" ")}
        >
          {error || releaseError || message}
        </div>
      )}

      <form onSubmit={uploadApk} className="mt-4 grid gap-4">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase text-slate-600">Tested APK file</span>
            <input
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="min-h-12 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase text-slate-600">Latest version</span>
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.8"
              className="min-h-12 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase text-slate-600">Build number</span>
            <input
              value={build}
              onChange={(e) => setBuild(e.target.value)}
              placeholder="20260521"
              className="min-h-12 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
            />
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.4fr]">
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase text-slate-600">Minimum supported version</span>
            <input
              value={minSupportedVersion}
              onChange={(e) => setMinSupportedVersion(e.target.value)}
              placeholder={version || "1.0.8"}
              className="min-h-12 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase text-slate-600">Release notes</span>
            <input
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              placeholder="What was tested and released in this APK?"
              className="min-h-12 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={forceUpgrade}
              onChange={(e) => setForceUpgrade(e.target.checked)}
              className="h-4 w-4 accent-emerald-700"
            />
            Force upgrade for older app versions
          </label>

          <button
            type="submit"
            disabled={uploading}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-base font-black text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-800 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
            {uploading ? `Uploading ${progress}%` : "Publish Tested APK"}
          </button>
        </div>

        {uploading ? (
          <div className="h-3 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        ) : null}
      </form>
    </section>
  );
}

export default function AppDownloadsPage({ publicMode = false }) {
  const detected = useMemo(() => detectPlatform(), []);
  const webVersion = envValue("VITE_APP_VERSION", "0.1.0");
  const [releaseInfo, setReleaseInfo] = useState(null);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releaseError, setReleaseError] = useState("");
  const user = useMemo(() => getCurrentUserSync(), []);
  const showAdminReleaseTools = !publicMode && canManageReleases(user);

  async function loadReleaseInfo() {
    setReleaseLoading(true);
    setReleaseError("");
    try {
      const res = await fetch(`${API_BASE}/app-releases/latest?t=${Date.now()}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setReleaseInfo(json);
    } catch (err) {
      setReleaseError(err?.message || "Could not load latest app release.");
    } finally {
      setReleaseLoading(false);
    }
  }

  useEffect(() => {
    loadReleaseInfo();
  }, []);

  const platforms = useMemo(() => {
    const android = releaseInfo?.android || {};
    const ios = releaseInfo?.ios || {};
    const androidUrl = absoluteUrl(android.apkUrl || releaseInfo?.androidApkUrl || envValue("VITE_ANDROID_APK_URL", "/downloads/mahima-app.apk"));
    const iosUrl = absoluteUrl(ios.url || releaseInfo?.iosUrl || envValue("VITE_IOS_APP_URL", "/downloads/mahima-ios.ipa"));

    return [
      {
        key: "android",
        title: "Mahima Android",
        subtitle: "Install or upgrade the Mahima app on Android phones.",
        icon: Smartphone,
        href: androidUrl,
        cta: "Download Android App",
        version: android.latestVersion || releaseInfo?.latestVersion || envValue("VITE_ANDROID_VERSION", webVersion),
        build: android.build || envValue("VITE_ANDROID_BUILD", "Latest APK"),
        release: android.releaseDate || envValue("VITE_ANDROID_RELEASE_DATE", "Current"),
        size: android.sizeBytes,
        notes: android.releaseNotes,
        download: !isExternal(androidUrl),
      },
      {
        key: "ios",
        title: "Mahima iOS",
        subtitle: "Install or upgrade the Mahima app on iPhone and iPad.",
        icon: Apple,
        href: iosUrl,
        cta: "Open iOS Install",
        version: ios.latestVersion || envValue("VITE_IOS_VERSION", webVersion),
        build: ios.build || envValue("VITE_IOS_BUILD", "Latest iOS"),
        release: envValue("VITE_IOS_RELEASE_DATE", "Current"),
        download: false,
      },
    ];
  }, [releaseInfo, webVersion]);

  const preferredPlatform = platforms.find((p) => p.key === detected) || platforms[0];
  const otherPlatforms = platforms.filter((p) => p.key !== preferredPlatform.key);

  const releaseNotes = [
    { icon: MessageSquare, text: "Jai Masih chat, voice notes, calls, and mobile notifications." },
    { icon: Bot, text: "AI Pastor access for staff and admin users." },
    { icon: Bell, text: "Daily reminders, prayer messages, and ministry announcements." },
    { icon: Wifi, text: "Improved app session handling for long-running mobile use." },
  ];

  return (
    <main
      className={[
        "min-h-screen bg-slate-50",
        publicMode ? "px-4 py-6 sm:px-6 lg:px-8" : "px-4 py-6 sm:px-6 lg:px-8",
      ].join(" ")}
    >
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-lg border border-emerald-900/10 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-950 px-5 py-6 text-white sm:px-8 sm:py-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-white p-2">
                  <img src={mahimaLogo} alt="Mahima Ministry" className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-wider text-amber-200">Mahima Ministry</p>
                  <h1 className="mt-1 text-3xl font-black leading-tight sm:text-4xl">App Downloads</h1>
                  <p className="mt-2 max-w-2xl text-sm font-semibold text-emerald-50 sm:text-base">
                    Download the latest Mahima mobile app or upgrade your installed version.
                  </p>
                </div>
              </div>

              <div className="grid gap-2 rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur sm:min-w-72">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-emerald-50">Web version</span>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-emerald-900">
                    {webVersion}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-50">
                  <ShieldCheck className="h-4 w-4 text-amber-200" />
                  Secure ministry distribution
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-6">
              {showAdminReleaseTools ? (
                <AdminReleaseUploader
                  releaseInfo={releaseInfo}
                  releaseLoading={releaseLoading}
                  releaseError={releaseError}
                  onRefresh={loadReleaseInfo}
                  onUploaded={setReleaseInfo}
                />
              ) : null}
              <PlatformCard platform={preferredPlatform} preferred />
              {otherPlatforms.map((platform) => (
                <PlatformCard key={platform.key} platform={platform} preferred={false} />
              ))}
            </div>

            <aside className="space-y-6">
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-amber-100 text-amber-800">
                    <Star className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-950">Latest Release</h2>
                    <p className="text-sm font-semibold text-slate-600">Ready for Android and iOS.</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {releaseNotes.map((note) => {
                    const Icon = note.icon;
                    return (
                      <div key={note.text} className="flex gap-3 rounded-md bg-slate-50 p-3">
                        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                        <p className="text-sm font-semibold leading-6 text-slate-700">{note.text}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                <h2 className="text-lg font-black text-emerald-950">Upgrade Check</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-emerald-900">
                  If the installed app is older than the latest version shown here, use the Upgrade button for your phone.
                </p>
                <div className="mt-4 flex items-center gap-2 rounded-md bg-white p-3 text-sm font-black text-emerald-800">
                  <CheckCircle2 className="h-5 w-5" />
                  Latest package links are live from this page.
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-slate-950">Direct Links</h2>
                <div className="mt-4 grid gap-3">
                  {platforms.map((platform) => (
                    <a
                      key={platform.key}
                      href={platform.href}
                      target={isExternal(platform.href) ? "_blank" : undefined}
                      rel={isExternal(platform.href) ? "noreferrer" : undefined}
                      download={platform.download ? true : undefined}
                      className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-3 text-sm font-black text-slate-800 hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      <span className="flex items-center gap-2">
                        <platform.icon className="h-5 w-5 text-emerald-700" />
                        {platform.key === "android" ? "Android package" : "iOS package"}
                      </span>
                      <Download className="h-4 w-4 text-slate-500" />
                    </a>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
