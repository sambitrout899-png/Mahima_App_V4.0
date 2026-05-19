import React, { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import mahimaLogo from "../assets/mahima-logo.png";

function isNativeAppMode() {
  try {
    return (
      import.meta.env.MODE === "mobile" ||
      Boolean(window.Capacitor?.isNativePlatform?.()) ||
      window.location?.protocol === "capacitor:" ||
      (window.location?.protocol === "https:" && window.location?.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

function detectPlatform() {
  const ua = navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "android";
}

function normalizeVersion(version = "0.0.0") {
  return String(version)
    .split(/[.+-]/)
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

function compareVersions(a, b) {
  const left = normalizeVersion(a);
  const right = normalizeVersion(b);
  const length = Math.max(left.length, right.length, 3);
  for (let i = 0; i < length; i += 1) {
    const x = left[i] || 0;
    const y = right[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

function configuredCurrentVersion() {
  return (
    import.meta.env.VITE_APP_VERSION ||
    import.meta.env.VITE_ANDROID_VERSION ||
    import.meta.env.VITE_IOS_VERSION ||
    "0.1.0"
  );
}

async function openUpgradeLink(url) {
  if (!url) return;

  try {
    const browser = window.Capacitor?.Plugins?.Browser;
    if (browser?.open) {
      await browser.open({ url });
      return;
    }
  } catch {}

  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    window.location.href = url;
  }
}

export default function AppUpdatePrompt() {
  const [versionInfo, setVersionInfo] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const currentVersion = useMemo(() => configuredCurrentVersion(), []);
  const platform = useMemo(() => detectPlatform(), []);

  useEffect(() => {
    if (!isNativeAppMode()) return;

    let cancelled = false;
    const base = "https://mahimaministries.in/app-version.json";

    fetch(`${base}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json) setVersionInfo(json);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  if (!versionInfo || dismissed) return null;

  const latestVersion =
    platform === "ios"
      ? versionInfo.ios?.latestVersion || versionInfo.latestVersion
      : versionInfo.android?.latestVersion || versionInfo.latestVersion;
  const minSupportedVersion =
    platform === "ios"
      ? versionInfo.ios?.minSupportedVersion || versionInfo.minSupportedVersion
      : versionInfo.android?.minSupportedVersion || versionInfo.minSupportedVersion;

  const upgradeRequired =
    latestVersion && compareVersions(latestVersion, currentVersion) > 0;
  const forceUpgrade =
    minSupportedVersion && compareVersions(minSupportedVersion, currentVersion) > 0;

  if (!upgradeRequired && !forceUpgrade) return null;

  const upgradeUrl =
    platform === "ios"
      ? versionInfo.ios?.url || versionInfo.iosUrl || versionInfo.downloadPageUrl
      : versionInfo.android?.apkUrl || versionInfo.androidApkUrl || versionInfo.downloadPageUrl;

  const message =
    versionInfo.message ||
    "New version of the Mahima App is available - Please upgrade now";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 bg-emerald-800 px-5 py-4 text-white">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white p-1.5">
            <img src={mahimaLogo} alt="Mahima Ministry" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black">Mahima App Update</h2>
            <p className="text-xs font-bold text-emerald-100">
              Installed {currentVersion} · Latest {latestVersion}
            </p>
          </div>
          {!forceUpgrade ? (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label="Close update reminder"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-base font-extrabold leading-7 text-amber-950">
            {message}
          </div>
          <p className="text-sm font-semibold leading-6 text-slate-600">
            Tap upgrade to download the latest package. Android will ask you to confirm the install for security.
          </p>
        </div>

        <div className="grid gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:grid-cols-2">
          {!forceUpgrade ? (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
            >
              Later
            </button>
          ) : (
            <div className="hidden sm:block" />
          )}
          <button
            type="button"
            onClick={() => openUpgradeLink(upgradeUrl)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/20"
          >
            {platform === "ios" ? <RefreshCw className="h-5 w-5" /> : <Download className="h-5 w-5" />}
            Yes, upgrade now
          </button>
        </div>
      </div>
    </div>
  );
}
