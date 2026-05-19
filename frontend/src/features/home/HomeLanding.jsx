// src/features/home/HomeLanding.jsx
//
// Mahima Ministry landing page — sleeker, leaner, no duplicates.
//
// Flow:
//   TopNav  → Hero  → Services  → About+Visit  → Get Involved
//          → Ministries  → Scripture Marquee  → Gallery  → Footer
//
// Removed from the old version:
//   - NextService (its content is now inside Services)
//   - Hero FloatingCards (Welcome/Daily Word) — those live in Get Involved
//   - Old GetInvolved trio (Serve/Pray/Give) — merged into one richer
//     Get Involved section with four well-labelled paths
//   - Standalone Testimony block — Scripture Marquee covers the role
//
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Clock,
  Heart,
  HelpCircle,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  Moon,
  Phone,
  PhoneCall,
  Play,
  Quote,
  Sparkles,
  Sun,
  Users,
  X,
} from "lucide-react";
import { getToken, logout as authLogout } from "../auth/authService";
import mahimaLogo from "../../assets/mahima-logo.png";

const galleryImages = [
  "/images/prayer.jpg",
  "/images/welcome.jpg",
  "/images/worship.jpg",
  "/images/Mahima-Word.png",
  "/images/1000236883.jpg",
  "/images/1000236884.jpg",
  "/images/1000236885.jpg",
  "/images/1000236887.jpg",
  "/images/1000236888.jpg",
  "/images/1000236889.jpg",
  "/images/1000236890.jpg",
  "/images/1000236891.jpg",
];

const verses = [
  '"Come to Me, all you who labor and are heavy laden, and I will give you rest." — Matthew 11:28',
  '"The Lord is my shepherd; I shall not want." — Psalm 23:1',
  '"I can do all things through Christ who strengthens me." — Philippians 4:13',
  '"Be still, and know that I am God." — Psalm 46:10',
  '"For with God nothing will be impossible." — Luke 1:37',
  '"Therefore if anyone is in Christ, he is a new creation; old things have passed away; all things have become new." — 2 Corinthians 5:17',
];

const contact = {
  phone: "+91 7087775465",
  phoneHref: "tel:+917087775465",
  email: "Contact@mahimaministries.in",
  address: "Universal Public School, Gurunanak Nagar, Gulab Devi Road, Jalandhar, Punjab 144021",
};

const services = [
  { day: "Saturday", title: "Worship Service", time: "6:00 – 9:00 PM", tag: "Weekly",
    bg: "linear-gradient(135deg, #881337 0%, #b45309 100%)" },
  { day: "Tuesday",  title: "Night Prayer",    time: "10:30 PM",       tag: "Prayer",
    bg: "linear-gradient(135deg, #312e81 0%, #9f1239 100%)" },
  { day: "Friday",   title: "Night Prayer",    time: "10:30 PM",       tag: "Prayer",
    bg: "linear-gradient(135deg, #b45309 0%, #881337 100%)" },
];

function hasToken() {
  return Boolean(
    localStorage.getItem("mahima_token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("mahima:user") ||
      getToken?.()
  );
}
function isMobileAppMode() {
  try {
    return import.meta.env.MODE === "mobile" ||
      Boolean(window.Capacitor?.isNativePlatform?.());
  } catch { return false; }
}
function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ========================================================================
   MAIN
   ===================================================================== */
export default function HomeLanding() {
  const [showDonate, setShowDonate] = useState(false);
  const appMode = isMobileAppMode();

  useEffect(() => {
    const openDonate = () => setShowDonate(true);
    window.addEventListener("mahima_open_donate", openDonate);
    window.addEventListener("mahima_show_donate_modal", openDonate);
    return () => {
      window.removeEventListener("mahima_open_donate", openDonate);
      window.removeEventListener("mahima_show_donate_modal", openDonate);
    };
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#f7f1e3] text-stone-900 antialiased selection:bg-rose-900 selection:text-amber-100 dark:bg-[#0b0807] dark:text-stone-50">
      <Background />
      <GlobalStyles />

      <TopNav onDonate={() => setShowDonate(true)} />

      <div className="mx-auto w-full max-w-[1280px] px-4 pb-32 sm:px-6 sm:pb-12">
        <Hero onDonate={() => setShowDonate(true)} />
        <Services />
        {!appMode && <AboutVisit />}
        <GetInvolved onDonate={() => setShowDonate(true)} />
        {!appMode && <Ministries />}
        <ScriptureMarquee />
        {!appMode && <Gallery />}
        <Footer />
      </div>

      <MobileCTA onDonate={() => setShowDonate(true)} />

      {showDonate && <DonateModal onClose={() => setShowDonate(false)} />}
    </main>
  );
}

function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(180,83,9,.18),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(159,18,57,.14),transparent_60%),linear-gradient(180deg,#f7f1e3,#fbf6ea_60%,#f3ecd7)] dark:bg-[radial-gradient(ellipse_at_top,rgba(180,83,9,.16),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(159,18,57,.16),transparent_60%),linear-gradient(180deg,#0b0807,#120c0a_60%,#0b0807)]" />
      <div className="absolute inset-0 opacity-[0.07] mix-blend-multiply [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/><feColorMatrix values=%220 0 0 0 0.4 0 0 0 0 0.25 0 0 0 0 0.1 0 0 0 0 0.6 0%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.55%22/></svg>')] dark:opacity-[0.10] dark:mix-blend-overlay" />
    </div>
  );
}

/* ========================================================================
   TOP NAV
   ===================================================================== */
function TopNav({ onDonate }) {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(() => hasToken());
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false
  );
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const sync = () => setLoggedIn(hasToken());
    window.addEventListener("auth:change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("auth:change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (localStorage.getItem("mahima_theme") === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function toggleTheme() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("mahima_theme", next ? "dark" : "light");
    setDark(next);
  }

  function jump(id) {
    setMenuOpen(false);
    setTimeout(() => scrollToSection(id), 60);
  }

  function handleAuthClick() {
    if (loggedIn) {
      if (isMobileAppMode()) { navigate("/home", { replace: true }); return; }
      authLogout();
      localStorage.removeItem("mahima_user");
      localStorage.removeItem("mahima:user");
      setLoggedIn(false);
      navigate("/login", { replace: true });
      return;
    }
    navigate("/login");
  }

  const navLinks = [
    ["Services",     "services"],
    ["About",        "about"],
    ["Get Involved", "get-involved"],
    ["Ministries",   "ministries"],
    ["Moments",      "moments"],
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          scrolled
            ? "border-b border-stone-900/5 bg-[#f7f1e3]/85 backdrop-blur-xl dark:border-white/5 dark:bg-[#0b0807]/85"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button type="button" onClick={() => scrollToSection("top")}
            className="flex min-w-0 items-center gap-2.5 transition active:scale-[0.97]">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-stone-900 shadow-sm dark:bg-stone-100">
              <img src={mahimaLogo} alt="Mahima Ministry" className="h-7 w-7 object-contain" />
            </span>
            <span className="min-w-0 text-left leading-none">
              <span className="block truncate font-serif text-[15px] font-black tracking-tight text-stone-900 dark:text-stone-50 sm:text-base">Mahima Ministry</span>
              <span className="mt-1 hidden text-[10px] font-bold uppercase tracking-[0.28em] text-amber-700 dark:text-amber-300 sm:block">Restoration · Healing · Mission</span>
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map(([label, id]) => (
              <button key={id} type="button" onClick={() => jump(id)} className="navBtn">{label}</button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={toggleTheme} className="iconBtn" aria-label="Toggle theme">
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <button type="button" onClick={handleAuthClick}
              className="inline-flex h-11 items-center rounded-full bg-stone-900 px-3.5 text-[13px] font-bold text-stone-50 transition active:scale-[0.97] dark:bg-stone-50 dark:text-stone-900 sm:px-4 sm:text-sm">
              {loggedIn ? (isMobileAppMode() ? "Open App" : "Logout") : "Login"}
            </button>

            <button type="button" onClick={onDonate}
              className="hidden h-11 items-center gap-2 rounded-full bg-gradient-to-br from-rose-800 to-amber-600 px-5 text-sm font-black text-amber-50 shadow-[0_8px_24px_-8px_rgba(159,18,57,.5)] transition active:scale-[0.97] lg:inline-flex">
              <Heart size={14} fill="currentColor" /> Donate
            </button>

            <button type="button" onClick={() => setMenuOpen(true)} className="iconBtn lg:hidden" aria-label="Open menu">
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-stone-950/50 backdrop-blur-sm" />
          <div className="absolute inset-x-3 top-3 overflow-hidden rounded-3xl bg-[#f7f1e3] p-5 shadow-2xl ring-1 ring-stone-900/10 dark:bg-[#120c0a] dark:ring-white/10 animate-slideDown">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-stone-900 dark:bg-stone-100">
                  <img src={mahimaLogo} alt="" className="h-7 w-7 object-contain" />
                </span>
                <span className="font-serif text-base font-black">Mahima Ministry</span>
              </div>
              <button type="button" onClick={() => setMenuOpen(false)} className="iconBtn" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <nav className="mt-5 grid grid-cols-1 gap-1">
              {navLinks.map(([label, id]) => (
                <button key={id} type="button" onClick={() => jump(id)}
                  className="flex h-14 items-center justify-between rounded-2xl bg-white px-5 text-base font-bold text-stone-900 ring-1 ring-stone-900/5 active:scale-[0.99] dark:bg-white/[0.06] dark:text-stone-50 dark:ring-white/10">
                  {label} <ArrowUpRight size={18} className="text-rose-800 dark:text-amber-300" />
                </button>
              ))}
            </nav>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button"
                onClick={() => { setMenuOpen(false); if (!hasToken()) window.location.hash = "#/login"; }}
                className="h-14 rounded-2xl bg-stone-900 text-sm font-black text-stone-50 active:scale-[0.98] dark:bg-stone-100 dark:text-stone-900">
                {hasToken() ? "My Account" : "Login"}
              </button>
              <button type="button" onClick={() => { setMenuOpen(false); onDonate(); }}
                className="h-14 rounded-2xl bg-gradient-to-br from-rose-800 to-amber-600 text-sm font-black text-amber-50 active:scale-[0.98]">
                Donate
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ========================================================================
   HERO  (clean: 3 CTAs, no inline floating cards)
   ===================================================================== */
function Hero({ onDonate }) {
  const navigate = useNavigate();
  return (
    <section id="top"
      className="relative mt-3 overflow-hidden rounded-[2rem] bg-stone-950 shadow-[0_30px_60px_-30px_rgba(0,0,0,.5)] sm:mt-4">
      <div className="absolute inset-0">
        <img src="/assets/mahimachurch-hero.jpg" alt=""
          className="h-full w-full animate-kenburns object-cover opacity-65" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(180,83,9,.35),transparent_60%)] mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/40 via-stone-950/45 to-stone-950/95" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-stone-950 to-transparent" />
      </div>

      <div className="relative flex min-h-[80svh] flex-col justify-end p-6 pb-8 sm:min-h-[72svh] sm:p-10 lg:min-h-[640px] lg:p-14">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200/30 bg-amber-100/10 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-amber-200 backdrop-blur-md">
          <span className="relative grid h-2 w-2 place-items-center">
            <span className="absolute inset-0 rounded-full bg-amber-300 animate-pingSoft" />
            <span className="relative h-2 w-2 rounded-full bg-amber-300" />
          </span>
          Jalandhar, Punjab
        </div>

        <h1 className="mt-5 font-serif text-[2.85rem] font-black leading-[0.94] tracking-[-0.03em] text-amber-50 sm:text-7xl lg:text-[6.5rem]">
          Worship.<br />
          <span className="italic text-amber-200">Heal.</span><br />
          Send.
        </h1>

        <p className="mt-5 max-w-xl text-base leading-7 text-stone-200/85 sm:text-lg sm:leading-8">
          A Christ-centred ministry in Punjab where faith becomes practical worship,
          healing prayer, discipleship, and mission for everyday life.
        </p>

        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
          <button type="button" onClick={() => navigate("/sermons")}
            className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-amber-50 px-6 text-[15px] font-black text-stone-900 shadow-lg transition active:scale-[0.98]">
            <Play size={16} fill="currentColor" /> Watch Sermons
            <ArrowRight size={15} className="opacity-60 transition group-hover:translate-x-0.5" />
          </button>
          <button type="button"
            onClick={() => {
              if (!hasToken()) { alert("Please create an account / sign in to submit a prayer request."); return; }
              navigate("/prayerrequests");
            }}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-amber-100/25 bg-white/8 px-6 text-[15px] font-black text-amber-50 backdrop-blur-md transition active:scale-[0.98] hover:bg-white/14">
            <Heart size={16} /> Request Prayer
          </button>
          <button type="button" onClick={onDonate}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-rose-800 to-amber-600 px-6 text-[15px] font-black text-amber-50 shadow-lg transition active:scale-[0.98]">
            <Sparkles size={16} /> Give
          </button>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] font-bold text-amber-100/85">
          <a href={contact.phoneHref} className="inline-flex items-center gap-1.5">
            <Phone size={13} /> {contact.phone}
          </a>
          <span className="text-amber-100/30">/</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={13} /> Sat 6–9 PM · Night prayer Tue & Fri 10:30 PM
          </span>
        </div>
      </div>
    </section>
  );
}

/* ========================================================================
   SERVICES  (merged NextService + ServiceTimes)
   ===================================================================== */
function Services() {
  return (
    <section id="services" className="mt-12 scroll-mt-24">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="kicker">Plan your visit</p>
          <h2 className="sectionTitle">Service times</h2>
        </div>
        <p className="max-w-md text-[14px] leading-6 text-stone-600 dark:text-stone-300">
          First time? Come as you are — there's a place at the table.
        </p>
      </div>

      <div className="mt-5 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:pb-0 hideScrollbar">
        {services.map((s, i) => (
          <article key={i}
            className="relative shrink-0 snap-center w-[82%] sm:w-auto overflow-hidden rounded-[1.75rem] p-6 text-amber-50 shadow-lg"
            style={{ background: s.bg }}>
            <div className="pointer-events-none absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-amber-100/15 blur-3xl" />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="text-[10.5px] font-black uppercase tracking-[0.24em] text-amber-100/85">{s.day}</div>
                <div className="mt-2 font-serif text-2xl font-black leading-tight">{s.title}</div>
              </div>
              <span className="rounded-full bg-amber-50/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest backdrop-blur">{s.tag}</span>
            </div>
            <div className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-amber-50/15 px-3.5 py-1.5 text-[13px] font-black backdrop-blur">
              <Clock size={13} /> {s.time}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ========================================================================
   ABOUT + VISIT
   ===================================================================== */
function AboutVisit() {
  return (
    <section id="about" className="mt-12 scroll-mt-24 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="relative overflow-hidden rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-stone-900/5 dark:bg-white/[0.04] dark:ring-white/10 sm:p-10">
        <p className="kicker">Who we are</p>
        <h2 className="sectionTitle mt-1">
          A warm church family in{" "}
          <em className="font-serif italic text-rose-800 dark:text-amber-300">Jalandhar</em>
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-stone-700 dark:text-stone-300 sm:text-base">
          Mahima Ministry is dedicated to worship, healing, discipleship, and local care.
          We believe broken lives can be restored — and every believer can be equipped for ministry.
        </p>
        <div className="mt-7 grid grid-cols-3 gap-3">
          <Stat label="Members" value="300+" />
          <Stat label="Year" value="1+" />
          <Stat label="Groups" value="10" />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-rose-900 via-rose-800 to-amber-700 p-6 text-amber-50 shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-12 -bottom-12 h-56 w-56 rounded-full bg-amber-200/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-8 -top-8 h-36 w-36 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50/15 px-3 py-1 text-[10.5px] font-black uppercase tracking-[0.24em] backdrop-blur">
            <MapPin size={11} /> Visit Us
          </div>
          <h3 className="mt-3 font-serif text-2xl font-black tracking-tight">Drop by & say hello</h3>
          <div className="mt-5 space-y-3.5 text-[14.5px]">
            <a href={contact.phoneHref} className="contactRow group">
              <span className="contactIcon"><PhoneCall size={13} /></span>
              <span className="font-bold">{contact.phone}</span>
              <ArrowUpRight size={14} className="ml-auto opacity-50 transition group-hover:opacity-100" />
            </a>
            <a href={`mailto:${contact.email}`} className="contactRow group">
              <span className="contactIcon"><Mail size={13} /></span>
              <span className="break-all font-bold">{contact.email}</span>
            </a>
            <div className="contactRow !items-start">
              <span className="contactIcon mt-0.5"><MapPin size={13} /></span>
              <span className="leading-6">{contact.address}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-900/5 dark:bg-white/[0.05] dark:ring-white/10">
      <div className="font-serif text-3xl font-black leading-none tracking-tight text-rose-900 dark:text-amber-200 sm:text-4xl">{value}</div>
      <div className="mt-2 text-[10.5px] font-black uppercase tracking-[0.22em] text-stone-500 dark:text-stone-300">{label}</div>
    </div>
  );
}

/* ========================================================================
   GET INVOLVED  (single source of all secondary actions)
   ===================================================================== */
function GetInvolved({ onDonate }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(null); // null | "daily" | "welcome" | "serve"

  const cards = [
    {
      key: "daily",
      title: "Daily Word",
      text: "A short verse. Fresh hope for today, every day.",
      icon: <BookOpen size={22} />,
      iconBg: "#9f1239",
      glow: "linear-gradient(135deg, #fecdd3 0%, #fde68a 100%)",
      onClick: () => setOpen("daily"),
    },
    {
      key: "welcome",
      title: "Welcome Guide",
      text: "New here? Start with who we are and what to expect.",
      icon: <Sun size={22} />,
      iconBg: "#b45309",
      glow: "linear-gradient(135deg, #fde68a 0%, #fcd34d 100%)",
      onClick: () => setOpen("welcome"),
    },
    {
      key: "prayer",
      title: "Request Prayer",
      text: "Share a confidential need. Our team will pray with you.",
      icon: <Heart size={22} />,
      iconBg: "#9f1239",
      glow: "linear-gradient(135deg, #fecdd3 0%, #fda4af 100%)",
      onClick: () => {
        if (!hasToken()) { alert("Please create an account / sign in to submit a prayer request."); return; }
        navigate("/prayerrequests");
      },
    },
    {
      key: "serve",
      title: "Serve with us",
      text: "Worship, kids, hospitality, media — there's a doorway in.",
      icon: <Users size={22} />,
      iconBg: "#312e81",
      glow: "linear-gradient(135deg, #c7d2fe 0%, #fecdd3 100%)",
      onClick: () => setOpen("serve"),
    },
    {
      key: "give",
      title: "Give",
      text: "Support Mahima's worship, healing & outreach work.",
      icon: <Sparkles size={22} />,
      iconBg: "#b45309",
      glow: "linear-gradient(135deg, #fde68a 0%, #fecdd3 100%)",
      onClick: onDonate,
    },
    {
      key: "ask",
      title: "Ask a question",
      text: "Reach out — we'll respond personally as a team.",
      icon: <HelpCircle size={22} />,
      iconBg: "#0f172a",
      glow: "linear-gradient(135deg, #ddd6fe 0%, #fcd34d 100%)",
      onClick: () => (window.location.href = `mailto:${contact.email}?subject=Question%20for%20Mahima%20Ministry`),
    },
  ];

  return (
    <section id="get-involved" className="mt-12 scroll-mt-24">
      <div>
        <p className="kicker">Get involved</p>
        <h2 className="sectionTitle">Take the next step</h2>
        <p className="mt-2 max-w-xl text-[14px] leading-6 text-stone-600 dark:text-stone-300">
          Whatever season you're in, choose your doorway in.
        </p>
      </div>

      <div className="mt-5 quickGrid">
        {cards.map((c) => (
          <button key={c.key} type="button" onClick={c.onClick} className="quickCard">
            <div aria-hidden="true" className="quickGlow" style={{ background: c.glow }} />
            <div className="quickIcon" style={{ background: c.iconBg }}>{c.icon}</div>
            <div className="quickTitle">{c.title}</div>
            <div className="quickText">{c.text}</div>
            <div className="quickLink">Open <ArrowRight size={12} /></div>
          </button>
        ))}
      </div>

      {open === "daily" && (
        <Modal onClose={() => setOpen(null)}>
          <ModalCard title="Daily Word">
            <p className="font-serif text-lg italic leading-8 text-stone-700 dark:text-stone-200">
              {'"For God so loved the world that He gave His only begotten Son, that whoever believes in Him should not perish but have everlasting life."'}
            </p>
            <p className="mt-4 font-black text-rose-800 dark:text-rose-300">John 3:16</p>
          </ModalCard>
        </Modal>
      )}
      {open === "welcome" && (
        <Modal onClose={() => setOpen(null)}>
          <ModalCard title="Welcome Guide">
            <div className="space-y-4 text-stone-700 dark:text-stone-300">
              <p><strong>Salvation & Word of God:</strong> We believe salvation is by grace through faith in Jesus Christ.</p>
              <p><strong>Prayer Support:</strong> Submit confidential prayer needs and our team will pray with you.</p>
              <p><strong>Community:</strong> Join worship, discipleship, outreach, and care ministries.</p>
            </div>
          </ModalCard>
        </Modal>
      )}
      {open === "serve" && (
        <Modal onClose={() => setOpen(null)}>
          <ModalCard title="Serve with us">
            <p className="text-stone-700 dark:text-stone-300">
              Get in touch with us for team assignments, training, and scheduling.
            </p>
            <p className="mt-4 font-black text-rose-800 dark:text-rose-300">
              Phone: {contact.phone}
            </p>
          </ModalCard>
        </Modal>
      )}
    </section>
  );
}

/* ========================================================================
   MINISTRIES
   ===================================================================== */
function Ministries() {
  const items = [
    ["Worship & Services",    "Biblical teaching and worship.",            <Play size={20} />],
    ["Healing Ministry",      "Prayer, deliverance, and counselling.",     <Heart size={20} />],
    ["Children & Youth",      "Safe discipleship programs.",               <Users size={20} />],
    ["Outreach & Mercy",      "Serving the local community.",              <Sparkles size={20} />],
    ["Small Groups",          "Life-on-life discipleship.",                <MessageSquare size={20} />],
    ["Training & Leadership", "Equipping believers to serve.",             <BookOpen size={20} />],
  ];
  return (
    <section id="ministries" className="mt-12 scroll-mt-24">
      <p className="kicker">Ministries</p>
      <h2 className="sectionTitle">Many ways to grow & serve</h2>
      <p className="mt-2 max-w-xl text-[14px] leading-6 text-stone-600 dark:text-stone-300">
        Whatever season you're in, there's a doorway in.
      </p>

      <div className="mt-6 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pb-0 lg:grid-cols-3 hideScrollbar">
        {items.map(([title, desc, icon], i) => (
          <article key={title}
            className="group relative shrink-0 snap-center w-[78%] sm:w-auto overflow-hidden rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-stone-900/5 transition hover:-translate-y-0.5 hover:shadow-xl dark:bg-white/[0.05] dark:ring-white/10"
            style={{ minHeight: 200 }}>
            <span className="absolute right-5 top-5 font-serif text-xs font-black text-stone-300 dark:text-white/20">
              0{i + 1}
            </span>
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-stone-900 text-amber-50 transition group-hover:bg-gradient-to-br group-hover:from-rose-800 group-hover:to-amber-700 dark:bg-stone-100 dark:text-stone-900">
              {icon}
            </div>
            <h3 className="font-serif text-lg font-black leading-tight">{title}</h3>
            <p className="mt-2 text-[13.5px] leading-6 text-stone-600 dark:text-stone-300">{desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ========================================================================
   SCRIPTURE MARQUEE  (replaces Testimony + VerseMarquee duplication)
   ===================================================================== */
function ScriptureMarquee() {
  return (
    <section className="mt-12 overflow-hidden rounded-full border border-stone-900/5 bg-amber-50/80 py-3 backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="marquee flex items-center gap-10 whitespace-nowrap font-serif text-[14px] italic text-stone-800 dark:text-stone-200">
        {[...verses, ...verses].map((v, i) => (
          <span key={i} className="inline-flex items-center gap-3">
            <Quote size={13} className="text-rose-800 dark:text-amber-300" />
            <span>{v}</span>
            <span className="text-rose-800/40 dark:text-amber-300/40">·</span>
          </span>
        ))}
      </div>
    </section>
  );
}

/* ========================================================================
   GALLERY
   ===================================================================== */
function Gallery() {
  return (
    <section id="moments" className="mt-12 scroll-mt-24">
      <p className="kicker">Moments</p>
      <h2 className="sectionTitle">Worship, prayer, community</h2>

      <div className="mt-5 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 sm:hidden hideScrollbar">
        {galleryImages.map((src, i) => (
          <figure key={src} className="relative shrink-0 snap-center w-[78%] aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-stone-200 dark:bg-white/5">
            <img src={src} alt={`Mahima moment ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
            <figcaption className="absolute inset-x-3 bottom-3 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-amber-50">
              <span className="rounded-full bg-stone-950/60 px-2.5 py-1 backdrop-blur">Moment {String(i + 1).padStart(2, "0")}</span>
              <Sparkles size={12} className="text-amber-200" />
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-5 hidden columns-2 gap-4 sm:block lg:columns-3">
        {galleryImages.map((src, i) => (
          <figure key={src}
            className="group relative mb-4 break-inside-avoid overflow-hidden rounded-[1.5rem] bg-stone-200 ring-1 ring-stone-900/5 dark:bg-white/5 dark:ring-white/10">
            <img src={src} alt={`Mahima Ministry moment ${i + 1}`}
              className="w-full object-cover transition duration-700 group-hover:scale-[1.04]" loading="lazy" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-950/55 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            <figcaption className="pointer-events-none absolute inset-x-5 bottom-4 flex items-center justify-between text-[10.5px] font-black uppercase tracking-widest text-amber-50 opacity-0 transition group-hover:opacity-100">
              <span>Moment {String(i + 1).padStart(2, "0")}</span>
              <Sparkles size={12} className="text-amber-200" />
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ========================================================================
   FOOTER  (slimmer — no nav-link duplication)
   ===================================================================== */
function Footer() {
  return (
    <footer className="mt-14 border-t border-stone-900/10 py-10 text-[13.5px] text-stone-500 dark:border-white/10 dark:text-stone-400">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-stone-900 dark:bg-stone-100">
              <img src={mahimaLogo} alt="" className="h-7 w-7 object-contain" />
            </span>
            <span className="font-serif text-base font-black tracking-tight text-stone-900 dark:text-stone-50">
              Mahima Ministry
            </span>
          </div>
          <p className="mt-4 max-w-sm leading-6">
            Restoration, healing, and mission. A Christ-centred ministry family in Jalandhar, Punjab.
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-[10.5px] font-black uppercase tracking-[0.24em] text-rose-800 dark:text-amber-300">Connect</p>
          <ul className="mt-3 space-y-2">
            <li><a className="hover:text-rose-800 dark:hover:text-amber-300" href={contact.phoneHref}>{contact.phone}</a></li>
            <li><a className="hover:text-rose-800 dark:hover:text-amber-300" href={`mailto:${contact.email}`}>{contact.email}</a></li>
            <li className="leading-6">{contact.address}</li>
          </ul>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-stone-900/10 pt-6 sm:flex-row sm:items-center dark:border-white/10">
        <p>© {new Date().getFullYear()} Mahima Ministry. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="/privacy" className="hover:text-rose-800 dark:hover:text-amber-300">Privacy</a>
          <a href="/terms" className="hover:text-rose-800 dark:hover:text-amber-300">Terms</a>
        </div>
      </div>
    </footer>
  );
}

/* ========================================================================
   MOBILE CTA
   ===================================================================== */
function MobileCTA({ onDonate }) {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-x-3 bottom-3 z-50 lg:hidden">
      <div className="flex items-center gap-1.5 rounded-full bg-stone-950/95 p-1.5 shadow-[0_18px_50px_-15px_rgba(0,0,0,.5)] backdrop-blur ring-1 ring-white/10">
        <button type="button" onClick={() => navigate("/sermons")}
          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-black text-amber-50 active:scale-[0.98]" aria-label="Sermons">
          <Play size={14} /> Sermons
        </button>
        <button type="button"
          onClick={() => {
            if (!hasToken()) { alert("Please create an account / sign in to submit a prayer request."); return; }
            navigate("/prayerrequests");
          }}
          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-black text-amber-50 active:scale-[0.98]" aria-label="Prayer">
          <Heart size={14} /> Prayer
        </button>
        <button type="button" onClick={onDonate}
          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-rose-700 to-amber-500 text-[13px] font-black text-amber-50 shadow-md active:scale-[0.98]" aria-label="Give">
          <Sparkles size={14} /> Give
        </button>
      </div>
    </div>
  );
}

/* ========================================================================
   MODALS
   ===================================================================== */
function Modal({ children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div ref={ref}
      className="fixed inset-0 z-[100] grid place-items-center bg-stone-950/65 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === ref.current) onClose(); }}>
      {children}
    </div>
  );
}

function ModalCard({ title, children }) {
  return (
    <div className="w-full max-w-xl rounded-[1.5rem] bg-[#f7f1e3] p-6 shadow-2xl ring-1 ring-stone-900/10 dark:bg-[#120c0a] dark:ring-white/10 sm:p-8">
      <h2 className="font-serif text-2xl font-black tracking-tight text-rose-900 dark:text-amber-200">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function DonateModal({ onClose }) {
  return (
    <Modal onClose={onClose}>
      <div className="w-[22rem] max-w-full overflow-hidden rounded-[1.5rem] bg-[#f7f1e3] text-center shadow-2xl ring-1 ring-stone-900/10 dark:bg-[#120c0a] dark:ring-white/10">
        <div className="relative bg-gradient-to-br from-rose-900 to-amber-700 px-6 py-7 text-amber-50">
          <button type="button" onClick={onClose}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-amber-50/15 backdrop-blur" aria-label="Close">
            <X size={16} />
          </button>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-50/15 backdrop-blur">
            <Heart size={20} fill="currentColor" />
          </div>
          <h2 className="mt-3 font-serif text-2xl font-black tracking-tight">Support Mahima</h2>
          <p className="mt-1 text-[12.5px] uppercase tracking-[0.22em] text-amber-100/80">Scan to give via UPI</p>
        </div>
        <div className="p-6">
          <img src="/assets/upi-qr.jpg" alt="UPI QR Code" className="mx-auto rounded-2xl shadow-lg" loading="lazy" />
          <p className="mt-5 font-serif text-[12.5px] italic text-stone-600 dark:text-stone-300">
            {'"Each one must give as he has decided in his heart." — 2 Corinthians 9:7'}
          </p>
        </div>
      </div>
    </Modal>
  );
}

/* ========================================================================
   GLOBAL STYLES
   ===================================================================== */
function GlobalStyles() {
  return (
    <style>{`
      :root { --paper: #f7f1e3; }

      .font-serif {
        font-family: "Cormorant Garamond", "EB Garamond", "Source Serif Pro",
                     ui-serif, Georgia, "Times New Roman", serif;
        font-feature-settings: "ss01", "liga";
      }

      .kicker {
        font-size: 10.5px; font-weight: 900; letter-spacing: 0.28em;
        text-transform: uppercase; color: #9f1239;
      }
      .dark .kicker { color: #fcd34d; }

      .sectionTitle {
        margin-top: 6px;
        font-family: "Cormorant Garamond", "EB Garamond", ui-serif, Georgia, serif;
        font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.02;
        font-weight: 900; letter-spacing: -0.025em;
      }

      .navBtn {
        padding: 10px 14px; border-radius: 999px;
        font-size: 13.5px; font-weight: 800; color: #1c1917;
        transition: background .2s ease, color .2s ease;
      }
      .navBtn:hover { background: rgba(0,0,0,0.05); }
      .dark .navBtn { color: #fafaf9; }
      .dark .navBtn:hover { background: rgba(255,255,255,0.06); }

      .iconBtn {
        width: 44px; height: 44px; display: grid; place-items: center;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(0,0,0,0.05);
        transition: all .15s ease;
      }
      .iconBtn:active { transform: scale(0.96); }
      .dark .iconBtn {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.08);
      }

      .contactRow { display: flex; align-items: center; gap: 12px; min-height: 36px; }
      .contactIcon {
        display: grid; place-items: center; width: 30px; height: 30px;
        border-radius: 10px; background: rgba(255,255,255,.22); backdrop-filter: blur(8px);
      }

      .hideScrollbar { scrollbar-width: none; }
      .hideScrollbar::-webkit-scrollbar { display: none; }

      .quickGrid { display: grid; grid-template-columns: 1fr; gap: 16px; }
      @media (min-width: 640px) { .quickGrid { grid-template-columns: 1fr 1fr; gap: 18px; } }
      @media (min-width: 1024px) { .quickGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }

      .quickCard {
        position: relative; display: flex; flex-direction: column;
        align-items: flex-start; text-align: left;
        min-height: 210px; padding: 22px; border-radius: 28px;
        background: #ffffff;
        box-shadow: 0 6px 18px -8px rgba(28, 25, 23, 0.10);
        border: 1px solid rgba(28, 25, 23, 0.06);
        overflow: hidden; cursor: pointer;
        transition: transform .18s ease, box-shadow .18s ease;
      }
      .quickCard:hover { transform: translateY(-3px); box-shadow: 0 22px 40px -18px rgba(28, 25, 23, 0.22); }
      .quickCard:active { transform: scale(0.985); }
      .dark .quickCard { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }

      .quickGlow {
        position: absolute; top: -48px; right: -48px;
        width: 160px; height: 160px; border-radius: 9999px;
        filter: blur(36px); opacity: 0.7; pointer-events: none;
      }
      .dark .quickGlow { opacity: 0.35; }

      .quickIcon {
        position: relative; z-index: 1;
        display: grid; place-items: center;
        width: 52px; height: 52px; margin-bottom: 16px;
        border-radius: 16px; color: #fffbeb;
        box-shadow: 0 10px 24px -10px rgba(0,0,0,0.35);
      }

      .quickTitle {
        position: relative; z-index: 1;
        font-family: "Cormorant Garamond", "EB Garamond", ui-serif, Georgia, serif;
        font-size: 22px; font-weight: 900; line-height: 1.1;
        letter-spacing: -0.01em; color: #1c1917;
      }
      .dark .quickTitle { color: #fafaf9; }

      .quickText {
        position: relative; z-index: 1; margin-top: 8px;
        font-size: 13.5px; line-height: 1.55; color: #57534e;
      }
      .dark .quickText { color: #d6d3d1; }

      .quickLink {
        position: relative; z-index: 1; margin-top: auto; padding-top: 14px;
        display: inline-flex; align-items: center; gap: 4px;
        font-size: 11.5px; font-weight: 900; letter-spacing: 0.18em;
        text-transform: uppercase; color: #9f1239;
      }
      .dark .quickLink { color: #fcd34d; }

      @keyframes kenburns {
        0%   { transform: scale(1.05); }
        50%  { transform: scale(1.15) translate3d(-1.5%, -1%, 0); }
        100% { transform: scale(1.05); }
      }
      .animate-kenburns { animation: kenburns 24s ease-in-out infinite; }

      @keyframes marquee {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      .marquee { animation: marquee 42s linear infinite; width: max-content; }
      .marquee:hover { animation-play-state: paused; }

      @keyframes pingSoft {
        0%   { transform: scale(1); opacity: 0.7; }
        80%, 100% { transform: scale(2.2); opacity: 0; }
      }
      .animate-pingSoft { animation: pingSoft 1.8s cubic-bezier(0,0,.2,1) infinite; }

      @keyframes slideDown {
        from { transform: translateY(-12px); opacity: 0; }
        to   { transform: translateY(0); opacity: 1; }
      }
      .animate-slideDown { animation: slideDown .22s ease-out; }

      @media (pointer: coarse) {
        .snap-x { scroll-padding-left: 1rem; scroll-padding-right: 1rem; }
      }

      @media (prefers-reduced-motion: reduce) {
        .animate-kenburns, .marquee, .animate-pingSoft, .animate-slideDown {
          animation: none !important;
        }
      }

      /* Lift chat-widget launchers above the mobile CTA bar. */
      @media (max-width: 1023px) {
        #tawk-bubble-container, .tawk-min-container,
        .intercom-launcher, .intercom-launcher-frame,
        .intercom-lightweight-app-launcher, .intercom-lightweight-app,
        #intercom-container .intercom-launcher,
        .crisp-client, .crisp-client .cc-kv-cw,
        .woot-widget-bubble, .woot-widget-holder, .woot--bubble-holder,
        #chat-widget-container,
        .drift-frame-controller, .drift-widget-content,
        .helpcrunch-iframe-wrapper,
        #hubspot-messages-iframe-container,
        #livechat-compact-container, #launcher,
        iframe[id^="chat-widget"], iframe[id*="chat-widget"],
        iframe[id*="livechat"], iframe[title*="chat" i] {
          bottom: 80px !important;
        }
      }
    `}</style>
  );
}
