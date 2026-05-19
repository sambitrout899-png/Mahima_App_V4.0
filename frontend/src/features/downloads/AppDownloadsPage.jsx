import React, { useMemo } from "react";
import {
  Apple,
  Bell,
  Bot,
  CheckCircle2,
  Download,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Star,
  Wifi,
} from "lucide-react";
import mahimaLogo from "../../assets/mahima-logo.png";

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

export default function AppDownloadsPage({ publicMode = false }) {
  const detected = useMemo(() => detectPlatform(), []);
  const webVersion = envValue("VITE_APP_VERSION", "0.1.0");

  const platforms = useMemo(() => {
    const androidUrl = absoluteUrl(envValue("VITE_ANDROID_APK_URL", "/downloads/mahima-app.apk"));
    const iosUrl = absoluteUrl(envValue("VITE_IOS_APP_URL", "/downloads/mahima-ios.ipa"));

    return [
      {
        key: "android",
        title: "Mahima Android",
        subtitle: "Install or upgrade the Mahima app on Android phones.",
        icon: Smartphone,
        href: androidUrl,
        cta: "Download Android App",
        version: envValue("VITE_ANDROID_VERSION", webVersion),
        build: envValue("VITE_ANDROID_BUILD", "Latest APK"),
        release: envValue("VITE_ANDROID_RELEASE_DATE", "Current"),
        download: !isExternal(androidUrl),
      },
      {
        key: "ios",
        title: "Mahima iOS",
        subtitle: "Install or upgrade the Mahima app on iPhone and iPad.",
        icon: Apple,
        href: iosUrl,
        cta: "Open iOS Install",
        version: envValue("VITE_IOS_VERSION", webVersion),
        build: envValue("VITE_IOS_BUILD", "Latest iOS"),
        release: envValue("VITE_IOS_RELEASE_DATE", "Current"),
        download: false,
      },
    ];
  }, [webVersion]);

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
