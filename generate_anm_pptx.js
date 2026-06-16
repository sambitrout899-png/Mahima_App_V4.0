/**
 * ANM Community App — Proposal Deck Generator
 * ─────────────────────────────────────────────
 * Run:
 *   npm install pptxgenjs
 *   node generate_anm_pptx.js
 *
 * Output: ANM_App_Proposal.pptx (in the same folder)
 *
 * Stack: ASP.NET Core .NET 8 · React + Ionic/Capacitor · PostgreSQL 16
 * Powered by our proprietary community platform framework
 */

import pptxgen from "pptxgenjs";

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  navy:      "1B2F6E",
  navyDark:  "0F1E4A",
  navyLight: "243D8C",
  gold:      "F0A500",
  goldLight: "FFC84A",
  white:     "FFFFFF",
  bg:        "F8F9FC",
  border:    "E2E8F0",
  text:      "1A1A2E",
  muted:     "64748B",
  success:   "10B981",
  warn:      "F59E0B",
  danger:    "EF4444",
  blue100:   "EFF6FF",
  blue200:   "BFDBFE",
  green100:  "D1FAE5",
  amber100:  "FEF3C7",
  purple100: "F5F3FF",
  red100:    "FEE2E2",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const makeShadow = () => ({ type: "outer", blur: 8, offset: 3, angle: 135, color: "000000", opacity: 0.10 });

function card(slide, x, y, w, h, opts = {}) {
  slide.addShape(pres.ShapeType.rect, {
    x, y, w, h,
    fill: { color: opts.fill || C.white },
    line: { color: opts.line || C.border, width: 1 },
    shadow: makeShadow(),
  });
}

function sectionTag(slide, label) {
  slide.addText(label.toUpperCase(), {
    x: 0.5, y: 0.28, w: 9, h: 0.22,
    fontSize: 9, bold: true, color: C.gold, charSpacing: 3,
    fontFace: "Calibri",
  });
}

function slideTitle(slide, title, y = 0.52) {
  slide.addText(title, {
    x: 0.5, y, w: 9, h: 0.55,
    fontSize: 30, bold: true, color: C.navy, fontFace: "Calibri",
  });
}

function dividerLine(slide, y = 1.1) {
  slide.addShape(pres.ShapeType.line, {
    x: 0.5, y, w: 9, h: 0,
    line: { color: C.gold, width: 2 },
  });
}

function iconCircle(slide, emoji, x, y, size = 0.45, bgColor = C.navy) {
  slide.addShape(pres.ShapeType.ellipse, {
    x, y, w: size, h: size,
    fill: { color: bgColor },
  });
  slide.addText(emoji, {
    x, y: y + 0.01, w: size, h: size,
    fontSize: size * 18, align: "center", valign: "middle",
  });
}

function featureCard(slide, x, y, w, h, icon, title, body, bgColor = C.white) {
  card(slide, x, y, w, h, { fill: bgColor });
  iconCircle(slide, icon, x + 0.18, y + 0.18, 0.42);
  slide.addText(title, {
    x: x + 0.1, y: y + 0.68, w: w - 0.2, h: 0.26,
    fontSize: 11, bold: true, color: C.navy, fontFace: "Calibri",
  });
  slide.addText(body, {
    x: x + 0.1, y: y + 0.94, w: w - 0.2, h: h - 1.05,
    fontSize: 9.5, color: C.muted, fontFace: "Calibri", valign: "top",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
let pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10" × 5.625"
pres.title  = "ANM Community App — Proposal (Powered by Proprietary .NET 8 Framework)";
pres.author = "Solution Development Team";

// ════════════════════════════════════════════════════════
// SLIDE 1 — COVER
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.navy };

  s.addShape(pres.ShapeType.ellipse, { x: 7.8, y: -1.0, w: 3.5, h: 3.5, fill: { color: C.navyLight, transparency: 70 }, line: { color: C.navyLight, transparency: 70 } });
  s.addShape(pres.ShapeType.ellipse, { x: -0.8, y: 3.5, w: 3, h: 3, fill: { color: C.navyLight, transparency: 75 }, line: { color: C.navyLight, transparency: 75 } });

  s.addShape(pres.ShapeType.roundRect, { x: 3.6, y: 0.55, w: 2.8, h: 0.32, fill: { color: "2C4499" }, line: { color: C.gold, width: 1 }, rectRadius: 0.16 });
  s.addText("TECHNICAL PROPOSAL · 2025", { x: 3.6, y: 0.55, w: 2.8, h: 0.32, fontSize: 8, color: C.gold, align: "center", valign: "middle", bold: true, charSpacing: 2, fontFace: "Calibri" });

  s.addText("ANM Community", { x: 0.8, y: 1.05, w: 8.4, h: 0.75, fontSize: 46, bold: true, color: C.white, align: "center", fontFace: "Calibri" });
  s.addText("Mobile App", { x: 0.8, y: 1.75, w: 8.4, h: 0.75, fontSize: 46, bold: true, color: C.gold, align: "center", fontFace: "Calibri" });

  s.addShape(pres.ShapeType.rect, { x: 4.4, y: 2.6, w: 1.2, h: 0.05, fill: { color: C.gold } });

  s.addText("A full-stack cross-platform mobile application built on our proprietary enterprise framework —\nconnecting members, sharing spiritual resources, and facilitating prayer at community scale.", {
    x: 1.2, y: 2.75, w: 7.6, h: 0.75,
    fontSize: 11.5, color: "FFFFFFB0", align: "center", fontFace: "Calibri",
  });

  const metaItems = [
    ["Prepared For", "ANM Organisation"],
    ["Prepared By", "Solution Dev Team"],
    ["Framework", ".NET 8 + PostgreSQL"],
    ["Date", "June 2025"],
    ["Confidentiality", "Private & Confidential"],
  ];
  const mw = 1.75, mx0 = 0.5, my = 3.7;
  metaItems.forEach(([label, val], i) => {
    const mx = mx0 + i * (mw + 0.05);
    s.addShape(pres.ShapeType.rect, { x: mx, y: my, w: mw, h: 0.75, fill: { color: "FFFFFF", transparency: 90 }, line: { color: "FFFFFF", transparency: 80 } });
    s.addText(label.toUpperCase(), { x: mx, y: my + 0.07, w: mw, h: 0.22, fontSize: 7, color: "FFFFFFAA", align: "center", bold: true, charSpacing: 1, fontFace: "Calibri" });
    s.addText(val, { x: mx, y: my + 0.3, w: mw, h: 0.28, fontSize: 9.5, color: C.white, align: "center", bold: true, fontFace: "Calibri" });
  });

  s.addShape(pres.ShapeType.rect, { x: 0, y: 5.45, w: 10, h: 0.175, fill: { color: C.gold } });
  s.addText("Confidential | ANM Community App Proposal — Powered by Proprietary .NET 8 Framework", { x: 0, y: 5.46, w: 10, h: 0.14, fontSize: 7, color: C.navy, align: "center", fontFace: "Calibri" });
}

// ════════════════════════════════════════════════════════
// SLIDE 2 — TABLE OF CONTENTS
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  sectionTag(s, "Overview");
  slideTitle(s, "Table of Contents");
  dividerLine(s, 1.08);

  const items = [
    ["01", "Executive Summary"],
    ["02", "Understanding of Requirements"],
    ["03", "Proposed Solution"],
    ["04", "Features & Functionality"],
    ["05", "UI/UX Wireframes"],
    ["06", "Solution Architecture"],
    ["07", "Technology Stack"],
    ["08", "Why .NET 8 + PostgreSQL + Ionic"],
    ["09", "Database Design"],
    ["10", "API Design"],
    ["11", "Development Timeline"],
    ["12", "Project Team"],
    ["13", "Quality Assurance"],
    ["14", "Deployment Strategy"],
    ["15", "Investment & Pricing"],
    ["16", "Risk Management"],
    ["17", "Why Choose Us"],
    ["18", "Conclusion & Next Steps"],
  ];

  items.forEach(([num, title], i) => {
    const col = i < 9 ? 0 : 1;
    const row = i < 9 ? i : i - 9;
    const x = 0.5 + col * 4.75;
    const y = 1.22 + row * 0.43;

    s.addShape(pres.ShapeType.rect, { x, y: y + 0.06, w: 0.32, h: 0.26, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(num, { x, y: y + 0.06, w: 0.32, h: 0.26, fontSize: 8, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Calibri" });
    s.addText(title, { x: x + 0.38, y, w: 4.2, h: 0.4, fontSize: 11, color: C.text, valign: "middle", fontFace: "Calibri" });

    if (row < 8) {
      s.addShape(pres.ShapeType.line, { x: x + 0.38, y: y + 0.4, w: 4.1, h: 0, line: { color: C.border, width: 0.5 } });
    }
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 3 — EXECUTIVE SUMMARY
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  sectionTag(s, "Section 01");
  slideTitle(s, "Executive Summary");
  dividerLine(s, 1.08);

  s.addText("We propose a world-class ANM Community App built on our battle-tested proprietary enterprise framework — proven in production across multiple community platforms. Delivered in 10 weeks with 20+ modules pre-built.", {
    x: 0.5, y: 1.15, w: 6.2, h: 0.65, fontSize: 11, color: C.muted, fontFace: "Calibri",
  });

  const stats = [
    ["10", "Week Delivery"],
    ["3", "Platforms (iOS+Android+Web)"],
    ["20+", "Pre-Built Modules"],
    ["99.9%", "Uptime SLA"],
  ];
  stats.forEach(([val, lbl], i) => {
    const x = 0.5 + i * 2.38;
    s.addShape(pres.ShapeType.rect, { x, y: 1.88, w: 2.2, h: 0.9, fill: { color: C.navy }, line: { color: C.navy }, shadow: makeShadow() });
    s.addText(val, { x, y: 1.92, w: 2.2, h: 0.44, fontSize: 24, bold: true, color: C.gold, align: "center", fontFace: "Calibri" });
    s.addText(lbl, { x, y: 2.38, w: 2.2, h: 0.34, fontSize: 8.5, color: "FFFFFFCC", align: "center", fontFace: "Calibri" });
  });

  const features = [
    ["📱", "Native-Quality App", "React + Ionic/Capacitor delivers true-native iOS, Android, AND web admin from one codebase. No compromises."],
    ["🔒", "Secure by Design", "Firebase Auth, JWT Bearer tokens, AES-256 at rest, HTTPS/TLS in transit — built into our framework."],
    ["♿", "Accessibility First", "WCAG 2.1 AA compliant. VoiceOver & TalkBack support. Large fonts, high contrast."],
    ["☁️", "Cloud-Native AWS", "ASP.NET Core .NET 8 on ECS Fargate — auto-scaling, 99.9% SLA, CloudFront CDN for media globally."],
    ["⚡", "Framework Accelerated", "Our proprietary .NET 8 community framework has 20+ modules pre-built. You get more features in 10 weeks than competitors deliver in 16+."],
    ["🤝", "Transparent Process", "Weekly demos. You see real progress every 7 days, not just a final delivery."],
  ];
  features.forEach(([icon, title, body], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    featureCard(s, 0.5 + col * 3.17, 2.93 + row * 1.32, 2.98, 1.22, icon, title, body, C.white);
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 4 — UNDERSTANDING OF REQUIREMENTS
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  sectionTag(s, "Section 02");
  slideTitle(s, "Understanding of Requirements");
  dividerLine(s, 1.08);

  s.addText("Four core challenges the ANM App must solve:", {
    x: 0.5, y: 1.15, w: 9, h: 0.3, fontSize: 11, color: C.muted, fontFace: "Calibri",
  });

  const challenges = [
    ["🤝", "Community Fragmentation", "Members lack a unified channel. Communication is scattered across personal contacts and informal WhatsApp groups with no searchable directory or history log."],
    ["🙏", "Prayer & Support Coordination", "Submitting prayer requests is done informally — needs get missed. No mechanism for leaders to log follow-ups or view a member's care history in one place."],
    ["🎬", "Media & Resource Distribution", "Sermons are shared via links in group chats, creating a poor discovery experience with no searchable archive for members wanting to revisit content."],
    ["👥", "Audience Diversity", "The app must serve all age groups and varying tech literacy — demanding a clean, minimal UI that is intuitive for a 70-year-old and a 25-year-old equally."],
  ];

  challenges.forEach(([icon, title, body], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.5 + col * 4.8;
    const y = 1.52 + row * 1.88;
    card(s, x, y, 4.6, 1.72, { fill: C.white });
    s.addShape(pres.ShapeType.rect, { x, y, w: 0.07, h: 1.72, fill: { color: C.gold }, line: { color: C.gold } });
    iconCircle(s, icon, x + 0.2, y + 0.15, 0.5, C.navy);
    s.addText(title, { x: x + 0.8, y: y + 0.14, w: 3.65, h: 0.3, fontSize: 12, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(body, { x: x + 0.8, y: y + 0.46, w: 3.65, h: 1.15, fontSize: 9.5, color: C.muted, fontFace: "Calibri", valign: "top" });
  });

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 5.18, w: 9, h: 0.32, fill: { color: C.navy }, line: { color: C.navy } });
  s.addText("💡  Key Insight: The ANM App is a community care platform — not just a directory. It needs to feel warm, trustworthy, and simple enough for every member.", {
    x: 0.55, y: 5.19, w: 8.9, h: 0.3, fontSize: 9, color: C.white, valign: "middle", fontFace: "Calibri",
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 5 — PROPOSED SOLUTION
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  sectionTag(s, "Section 03");
  slideTitle(s, "Proposed Solution");
  dividerLine(s, 1.08);

  s.addText("A native-quality cross-platform mobile app on React + Ionic/Capacitor, powered by our proprietary ASP.NET Core .NET 8 API and a PostgreSQL 16 relational database — built on AWS and delivered in 10 weeks.", {
    x: 0.5, y: 1.16, w: 4.4, h: 0.65, fontSize: 11, color: C.muted, fontFace: "Calibri",
  });

  const layers = [
    { label: "iOS App + Android App + Web Admin", sub: "React + Ionic/Capacitor 7", color: C.blue100, textColor: C.navy },
    { label: "API Gateway + Firebase Auth", sub: "AWS API Gateway · JWT Bearer", color: "F0FDF4", textColor: "065F46" },
    { label: "ASP.NET Core .NET 8 Services", sub: "C# · REST API · SignalR · ECS Fargate", color: C.amber100, textColor: "92400E" },
    { label: "PostgreSQL 16 + AWS S3 + Twilio", sub: "AWS RDS Multi-AZ · Media · Voice + SMS", color: C.purple100, textColor: "6B21A8" },
  ];
  layers.forEach(({ label, sub, color, textColor }, i) => {
    s.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.92 + i * 0.72, w: 4.4, h: 0.64, fill: { color }, line: { color: C.border, width: 1 } });
    s.addText(label, { x: 0.65, y: 1.97 + i * 0.72, w: 3.9, h: 0.28, fontSize: 10.5, bold: true, color: textColor, fontFace: "Calibri" });
    s.addText(sub, { x: 0.65, y: 2.26 + i * 0.72, w: 3.9, h: 0.22, fontSize: 8.5, color: C.muted, fontFace: "Calibri" });
    if (i < 3) {
      s.addText("↓", { x: 2.5, y: 2.58 + i * 0.72, w: 0.5, h: 0.12, fontSize: 10, color: C.muted, align: "center", fontFace: "Calibri" });
    }
  });

  const rows = [
    ["Platform", "iOS 16+ & Android 12+ via React + Ionic/Capacitor"],
    ["Backend", "ASP.NET Core .NET 8 (C#) · ECS Fargate"],
    ["Database", "PostgreSQL 16 on AWS RDS (Multi-AZ)"],
    ["Auth", "Firebase Auth + JWT Bearer tokens"],
    ["Media", "AWS S3 + CloudFront CDN (video streaming)"],
    ["Calls/SMS", "Twilio VoIP + SMS · MailKit SMTP"],
    ["Hosting", "AWS ECS Fargate (containerised .NET 8)"],
    ["Timeline", "10 weeks to App Store & Play Store"],
  ];
  s.addShape(pres.ShapeType.rect, { x: 5.2, y: 1.16, w: 4.55, h: 4.22, fill: { color: C.white }, line: { color: C.border }, shadow: makeShadow() });
  s.addShape(pres.ShapeType.rect, { x: 5.2, y: 1.16, w: 4.55, h: 0.38, fill: { color: C.navy }, line: { color: C.navy } });
  s.addText("Solution at a Glance", { x: 5.2, y: 1.17, w: 4.55, h: 0.36, fontSize: 11, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Calibri" });
  rows.forEach(([key, val], i) => {
    const ry = 1.57 + i * 0.47;
    if (i % 2 === 1) s.addShape(pres.ShapeType.rect, { x: 5.2, y: ry, w: 4.55, h: 0.47, fill: { color: C.bg }, line: { color: C.bg } });
    s.addText(key, { x: 5.32, y: ry + 0.06, w: 1.3, h: 0.34, fontSize: 9.5, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(val, { x: 6.65, y: ry + 0.06, w: 2.98, h: 0.34, fontSize: 9, color: C.muted, fontFace: "Calibri", valign: "middle" });
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 6 — FEATURES & FUNCTIONALITY
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  sectionTag(s, "Section 04");
  slideTitle(s, "Features & Functionality");
  dividerLine(s, 1.08);

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.16, w: 4.55, h: 0.36, fill: { color: C.navy }, line: { color: C.navy } });
  s.addText("✅  Phase 1 — MVP Features", { x: 0.5, y: 1.17, w: 4.55, h: 0.34, fontSize: 11, bold: true, color: C.white, align: "center", fontFace: "Calibri" });

  const mvp = [
    ["🏠", "Home Dashboard", "Central hub with quick-access tiles"],
    ["👥", "Member Directory", "Searchable list with role badges & filters"],
    ["👤", "Member Detail", "Full profile, call/message/pray actions"],
    ["📋", "Member History", "Pastoral notes log with timestamps"],
    ["🙏", "Prayer Requests", "Submit, browse, respond, track status"],
    ["🎬", "Video Library", "Categorised feed with CloudFront streaming"],
    ["💬", "In-App Messaging", "1:1 chat via Twilio with read receipts"],
    ["📞", "VoIP Calling", "In-app calls without sharing phone numbers"],
    ["🔒", "Secure Auth", "Firebase Auth + biometric login"],
  ];
  mvp.forEach(([icon, title, sub], i) => {
    const y = 1.57 + i * 0.41;
    s.addText(icon, { x: 0.55, y, w: 0.3, h: 0.36, fontSize: 13, valign: "middle", fontFace: "Calibri" });
    s.addText(title, { x: 0.9, y, w: 1.7, h: 0.2, fontSize: 9.5, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(sub, { x: 0.9, y: y + 0.19, w: 4.05, h: 0.17, fontSize: 8, color: C.muted, fontFace: "Calibri" });
    if (i < 8) s.addShape(pres.ShapeType.line, { x: 0.55, y: y + 0.4, w: 4.4, h: 0, line: { color: C.border, width: 0.5 } });
  });

  s.addShape(pres.ShapeType.rect, { x: 5.2, y: 1.16, w: 4.55, h: 0.36, fill: { color: C.navyLight }, line: { color: C.navyLight } });
  s.addText("🚀  Phase 2 — Future Enhancements", { x: 5.2, y: 1.17, w: 4.55, h: 0.34, fontSize: 11, bold: true, color: C.white, align: "center", fontFace: "Calibri" });

  const p2 = [
    ["🔔", "Push Notifications", "FCM alerts for prayer requests & videos"],
    ["💬", "Group Chat / Forums", "Multi-member channels by ministry team"],
    ["🌍", "Multi-Language", "i18n support for 3+ languages with RTL"],
    ["🖥️", "Admin Dashboard", "Web-based React portal for administrators"],
    ["📅", "Event Calendar", "RSVP-enabled church events with iCal export"],
    ["📊", "Analytics Dashboard", "Member engagement & content metrics"],
  ];
  p2.forEach(([icon, title, sub], i) => {
    const y = 1.57 + i * 0.56;
    s.addShape(pres.ShapeType.rect, { x: 5.2, y, w: 4.55, h: 0.5, fill: { color: i % 2 === 0 ? C.white : C.bg }, line: { color: C.border, width: 0.5 } });
    s.addText(icon, { x: 5.28, y, w: 0.36, h: 0.5, fontSize: 14, valign: "middle", fontFace: "Calibri" });
    s.addText(title, { x: 5.68, y: y + 0.06, w: 3.9, h: 0.22, fontSize: 10, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(sub, { x: 5.68, y: y + 0.27, w: 3.9, h: 0.18, fontSize: 8.5, color: C.muted, fontFace: "Calibri" });
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 7 — WIREFRAMES
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  sectionTag(s, "Section 05");
  slideTitle(s, "UI/UX Wireframes — Key Screens");
  dividerLine(s, 1.08);

  s.addText("Clean, minimal design · Bottom navigation · 44pt touch targets · WCAG 2.1 AA contrast", {
    x: 0.5, y: 1.14, w: 9, h: 0.24, fontSize: 9.5, color: C.muted, fontFace: "Calibri",
  });

  const screens = [
    { label: "Home Dashboard", color: C.navy },
    { label: "Members Directory", color: C.navyLight },
    { label: "Member Detail", color: "28518A" },
    { label: "Prayer Requests", color: "1E6B5A" },
    { label: "Video Library", color: "4A3080" },
  ];

  screens.forEach(({ label, color }, i) => {
    const px = 0.38 + i * 1.9;
    const py = 1.44;
    const pw = 1.62, ph = 3.6;

    s.addShape(pres.ShapeType.roundRect, { x: px, y: py, w: pw, h: ph, fill: { color: "1a1a2e" }, line: { color: "0a0a1a", width: 2 }, rectRadius: 0.12 });
    s.addShape(pres.ShapeType.rect, { x: px + 0.07, y: py + 0.1, w: pw - 0.14, h: ph - 0.2, fill: { color: "F8F9FC" }, line: { color: "F8F9FC" } });
    s.addShape(pres.ShapeType.roundRect, { x: px + 0.52, y: py + 0.1, w: 0.58, h: 0.12, fill: { color: "1a1a2e" }, line: { color: "1a1a2e" }, rectRadius: 0.06 });
    s.addShape(pres.ShapeType.rect, { x: px + 0.07, y: py + 0.24, w: pw - 0.14, h: 0.46, fill: { color }, line: { color } });
    s.addText(label, { x: px + 0.07, y: py + 0.3, w: pw - 0.14, h: 0.28, fontSize: 6.5, bold: true, color: C.white, align: "center", fontFace: "Calibri" });

    const contentColors = ["E2E8F0", "DBEAFE", "D1FAE5", "FEF3C7", "E9D5FF"];
    [0.82, 1.22, 1.62, 2.02, 2.42, 2.82].forEach((cy, j) => {
      s.addShape(pres.ShapeType.roundRect, { x: px + 0.15, y: py + cy, w: pw - 0.3, h: 0.32, fill: { color: contentColors[j % contentColors.length] }, line: { color: contentColors[j % contentColors.length] }, rectRadius: 0.04 });
    });

    s.addShape(pres.ShapeType.rect, { x: px + 0.07, y: py + ph - 0.5, w: pw - 0.14, h: 0.4, fill: { color: C.white }, line: { color: C.border, width: 0.5 } });
    ["🏠", "👥", "🎬", "🙏"].forEach((icon, j) => {
      s.addText(icon, { x: px + 0.07 + j * 0.365, y: py + ph - 0.44, w: 0.365, h: 0.28, fontSize: 9, align: "center", fontFace: "Calibri" });
    });

    s.addText(`${i + 1}. ${label}`, {
      x: px - 0.1, y: py + ph + 0.08, w: pw + 0.2, h: 0.24,
      fontSize: 8, bold: true, color: C.navy, align: "center", fontFace: "Calibri",
    });
  });

  s.addText("💡  Final high-fidelity Figma designs delivered in Phase 1 (Week 2) for stakeholder sign-off before development begins.", {
    x: 0.5, y: 5.2, w: 9, h: 0.28, fontSize: 9, color: C.muted, fontFace: "Calibri",
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 8 — SOLUTION ARCHITECTURE
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  sectionTag(s, "Section 06");
  slideTitle(s, "Solution Architecture");
  dividerLine(s, 1.08);

  const layers = [
    {
      label: "CLIENT LAYER",
      y: 1.16, h: 0.92, bg: C.blue100, textColor: "1D4ED8", borderColor: C.blue200,
      items: [
        { icon: "📱", name: "iOS App", sub: "Ionic/Capacitor · iOS 16+" },
        { icon: "🤖", name: "Android App", sub: "Ionic/Capacitor · Android 12+" },
        { icon: "🖥️", name: "Web Admin", sub: "React.js · Phase 2" },
      ],
    },
    {
      label: "API GATEWAY & AUTH",
      y: 2.22, h: 0.86, bg: "F0FDF4", textColor: "065F46", borderColor: "A7F3D0",
      items: [
        { icon: "🔀", name: "AWS API Gateway", sub: "Rate Limiting · SSL" },
        { icon: "🔒", name: "Firebase Auth", sub: "OTP · JWT Bearer · Biometric" },
        { icon: "⚖️", name: "Load Balancer", sub: "AWS ALB · Auto-Scale" },
      ],
    },
    {
      label: "SERVICE LAYER — ASP.NET Core .NET 8 (C#) · ECS Fargate",
      y: 3.22, h: 0.86, bg: C.amber100, textColor: "92400E", borderColor: "FDE68A",
      items: [
        { icon: "👥", name: "Member API", sub: ".NET 8" },
        { icon: "🙏", name: "Prayer API", sub: ".NET 8" },
        { icon: "🎬", name: "Sermon API", sub: ".NET 8" },
        { icon: "💬", name: "Chat API", sub: "SignalR" },
        { icon: "🔔", name: "Notify API", sub: "FCM" },
      ],
    },
    {
      label: "DATA & EXTERNAL SERVICES",
      y: 4.22, h: 0.9, bg: C.purple100, textColor: "6B21A8", borderColor: "E9D5FF",
      items: [
        { icon: "🐘", name: "PostgreSQL 16", sub: "AWS RDS" },
        { icon: "🗄️", name: "AWS S3 + CDN", sub: "Media Store" },
        { icon: "📞", name: "Twilio", sub: "Voice + SMS" },
        { icon: "🔔", name: "Firebase FCM", sub: "Push Notifs" },
        { icon: "☁️", name: "CloudWatch", sub: "Monitoring" },
      ],
    },
  ];

  layers.forEach(({ label, y, h, bg, textColor, borderColor, items }) => {
    s.addShape(pres.ShapeType.rect, { x: 0.5, y, w: 9.25, h, fill: { color: bg }, line: { color: borderColor, width: 1 } });
    s.addText(label, { x: 0.6, y: y + 0.04, w: 4.5, h: 0.22, fontSize: 7.5, bold: true, color: textColor, fontFace: "Calibri" });

    const iw = items.length <= 3 ? 2.6 : 1.7;
    const gap = items.length <= 3 ? 0.35 : 0.15;
    const startX = 0.5 + (9.25 - items.length * iw - (items.length - 1) * gap) / 2;
    items.forEach(({ icon, name, sub }, j) => {
      const ix = startX + j * (iw + gap);
      const iy = y + 0.28;
      const ih = h - 0.36;
      s.addShape(pres.ShapeType.rect, { x: ix, y: iy, w: iw, h: ih, fill: { color: C.white }, line: { color: borderColor, width: 1 } });
      s.addText(`${icon} ${name}`, { x: ix + 0.04, y: iy + 0.04, w: iw - 0.08, h: 0.26, fontSize: 8.5, bold: true, color: C.navy, align: "center", fontFace: "Calibri" });
      if (sub) s.addText(sub, { x: ix + 0.04, y: iy + 0.3, w: iw - 0.08, h: 0.18, fontSize: 7, color: C.muted, align: "center", fontFace: "Calibri" });
    });

    if (y < 4.22) {
      s.addText("↓", { x: 4.6, y: y + h, w: 0.5, h: 0.16, fontSize: 9, color: C.muted, align: "center", fontFace: "Calibri" });
      s.addText("HTTPS / JWT", { x: 4.2, y: y + h + 0.01, w: 1.3, h: 0.1, fontSize: 6, color: C.muted, align: "center", fontFace: "Calibri" });
    }
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 9 — TECHNOLOGY STACK
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  sectionTag(s, "Section 07");
  slideTitle(s, "Technology Stack");
  dividerLine(s, 1.08);

  const techRows = [
    ["📱 Mobile", "React + Ionic + Capacitor 7", "True-native iOS, Android & Web from one React codebase · 60fps · Capacitor native APIs"],
    ["🧩 State", "Zustand + TanStack Query", "Lightweight global state + server-state caching · replaces Redux complexity"],
    ["⚙️ Backend", "ASP.NET Core .NET 8 (C#)", "Statically typed · built-in DI · CQRS-ready · 2–5× faster than Node.js (TechEmpower benchmarks)"],
    ["🗄️ ORM", "EF Core 8 + Npgsql", "Type-safe migrations · LINQ queries · automatic audit trails · zero SQL injection risk"],
    ["🐘 Database", "PostgreSQL 16 on AWS RDS", "ACID compliance · relational integrity · complex analytics · JSON columns · Multi-AZ HA"],
    ["🔒 Auth", "Firebase Auth + JWT Bearer", "OTP · Google OAuth · biometric · secure token rotation · .NET middleware integration"],
    ["📦 Media", "AWS S3 + CloudFront CDN", "Infinitely scalable · global CDN for sermon video streaming · presigned URLs"],
    ["📞 Comms", "Twilio VoIP + SMS + MailKit", "In-app calling · bulk SMS · automated emails · no phone number sharing"],
    ["🐳 Infra", "Docker + ECS Fargate", "Serverless containers · auto-scaling · zero server management"],
    ["🔔 Notifs", "Firebase FCM", "Push delivery iOS & Android · topic targeting · notification history"],
    ["🧪 Testing", "xUnit + Playwright + Appium", "Unit · API integration · E2E web · mobile automation testing suite"],
    ["🔁 CI/CD", "GitHub Actions + EAS Build", "PR gates → test → .NET publish → Capacitor build → App Store / Play Store"],
  ];

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.16, w: 9.25, h: 0.34, fill: { color: C.navy }, line: { color: C.navy } });
  [["Layer", 1.5], ["Technology", 3.2], ["Rationale", 5.5]].forEach(([h, x]) =>
    s.addText(h, { x, y: 1.19, w: 3, h: 0.28, fontSize: 9, bold: true, color: C.white, fontFace: "Calibri" })
  );

  techRows.forEach(([layer, tech, rationale], i) => {
    const ry = 1.52 + i * 0.33;
    s.addShape(pres.ShapeType.rect, { x: 0.5, y: ry, w: 9.25, h: 0.33, fill: { color: i % 2 === 0 ? C.white : C.bg }, line: { color: C.border, width: 0.5 } });
    s.addText(layer, { x: 0.6, y: ry + 0.04, w: 1.75, h: 0.24, fontSize: 8.5, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(tech, { x: 2.4, y: ry + 0.04, w: 2.6, h: 0.24, fontSize: 8.5, color: C.navyLight, fontFace: "Calibri" });
    s.addText(rationale, { x: 5.05, y: ry + 0.04, w: 4.6, h: 0.24, fontSize: 8, color: C.muted, fontFace: "Calibri" });
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 10 — WHY .NET 8 + POSTGRESQL + IONIC
//           (Stack Rationale vs Node.js / MongoDB / React Native)
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  sectionTag(s, "Section 08");
  slideTitle(s, "Why .NET 8 + PostgreSQL + Ionic");
  dividerLine(s, 1.08);

  s.addText("A question worth answering directly: why not Node.js/Express, MongoDB, and React Native?", {
    x: 0.5, y: 1.15, w: 9, h: 0.24, fontSize: 10.5, color: C.muted, fontFace: "Calibri",
  });

  const comparisons = [
    {
      icon: "⚙️", title: "ASP.NET Core .NET 8  vs  Node.js / Express",
      color: C.blue100, border: C.blue200, tc: "1D4ED8",
      points: [
        "🏆 Performance: .NET 8 ranks #1–3 in TechEmpower benchmarks — 2–5× faster than Node.js/Express for JSON throughput",
        "🔐 Type safety: C# compiler catches bugs before they reach production. Node.js/Express fails at runtime.",
        "🏗️ Built-in DI, middleware, health checks, OpenAPI — production-grade architecture without extra glue packages",
        "🔒 Security: JWT middleware, HTTPS redirection, data-protection APIs built into the framework — not optional plugins",
        "🌐 Enterprise adoption: .NET 8 is backed by Microsoft with long-term support — larger talent pool for future team growth",
      ],
    },
    {
      icon: "🐘", title: "PostgreSQL 16 (RDS)  vs  MongoDB Atlas",
      color: "F0FDF4", border: "A7F3D0", tc: "065F46",
      points: [
        "✅ ACID compliance: member data and pastoral notes are never partially written. MongoDB can have partial failures.",
        "🔗 Relational integrity: foreign keys ensure prayer requests can never reference deleted users — impossible in MongoDB",
        "📊 Complex reporting: SQL excels at attendance analytics, prayer trends, and member engagement queries",
        "🔀 Best of both: PostgreSQL JSONB columns support flexible/nested data where needed — no MongoDB needed",
        "💰 Cost: AWS RDS PostgreSQL is 30–40% cheaper than a production MongoDB Atlas M10 for equivalent performance",
      ],
    },
    {
      icon: "📱", title: "React + Ionic/Capacitor  vs  React Native/Expo",
      color: C.amber100, border: "FDE68A", tc: "92400E",
      points: [
        "🌐 Single codebase: iOS + Android + Web Admin portal — React Native cannot ship a web admin without extra effort",
        "⚡ Capacitor bridges: true native APIs (camera, push, biometrics) without React Native's bridge overhead",
        "🛠️ Web tech native: any npm package works in Ionic — no Metro bundler compatibility issues",
        "🔄 Our framework: Mahima V4.0 is already built on Ionic/Capacitor and tested in production across multiple platforms",
        "🚀 Faster builds: Capacitor EAS pipeline is simpler — no Expo SDK conflicts or OTA update approval delays",
      ],
    },
  ];

  comparisons.forEach(({ icon, title, color, border, tc, points }, i) => {
    const y = 1.44 + i * 1.36;
    s.addShape(pres.ShapeType.rect, { x: 0.5, y, w: 9.25, h: 1.28, fill: { color }, line: { color: border, width: 1 }, shadow: makeShadow() });
    s.addShape(pres.ShapeType.rect, { x: 0.5, y, w: 0.06, h: 1.28, fill: { color: tc }, line: { color: tc } });
    s.addText(`${icon}  ${title}`, { x: 0.65, y: y + 0.06, w: 9, h: 0.24, fontSize: 10.5, bold: true, color: tc, fontFace: "Calibri" });
    points.forEach((pt, j) => {
      const col = j < 3 ? 0 : 1;
      const row = j < 3 ? j : j - 3;
      const px = 0.7 + col * 4.6;
      const py = y + 0.32 + row * 0.3;
      s.addText(pt, { x: px, y: py, w: 4.4, h: 0.26, fontSize: 8, color: C.text, fontFace: "Calibri", valign: "middle" });
    });
  });

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 5.24, w: 9.25, h: 0.24, fill: { color: C.navy }, line: { color: C.navy } });
  s.addText("💡  Bottom line: .NET 8 + PostgreSQL + Ionic is the enterprise-standard combination. Node.js/MongoDB suits prototypes. We build systems designed to scale safely for years.", {
    x: 0.6, y: 5.25, w: 9.1, h: 0.22, fontSize: 8, color: C.white, fontFace: "Calibri",
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 11 — DATABASE DESIGN (PostgreSQL)
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  sectionTag(s, "Section 09");
  slideTitle(s, "Database Design — PostgreSQL 16");
  dividerLine(s, 1.08);

  const tables = [
    { name: "Users", fields: ["id UUID PK, name VARCHAR", "email UNIQUE, phone", "role, firebase_uid UNIQUE", "is_active, created_at"], color: C.blue100, border: C.blue200 },
    { name: "PrayerRequests", fields: ["id UUID PK, user_id FK→Users", "title, description, status", "is_anonymous BOOL, pray_count", "created_at, updated_at"], color: "F0FDF4", border: "A7F3D0" },
    { name: "Sermons", fields: ["id UUID PK, title, description", "category, s3_url, thumbnail_url", "uploaded_by FK→Users", "duration_sec, view_count"], color: C.amber100, border: "FDE68A" },
    { name: "CounsellingSessions", fields: ["id UUID PK, member_id FK→Users", "notes TEXT, session_type", "leader_id FK→Users", "session_date, created_at"], color: C.purple100, border: "E9D5FF" },
    { name: "Messages", fields: ["id UUID PK, from_id FK→Users", "to_id FK→Users, content", "msg_type, status", "sent_at, read_at"], color: "FEE2E2", border: "FECACA" },
  ];

  tables.forEach(({ name, fields, color, border }, i) => {
    const col = i < 3 ? i : i - 3;
    const row = i < 3 ? 0 : 1;
    const cw = i < 3 ? 2.95 : 4.5;
    const cx = i < 3 ? 0.5 + col * 3.08 : 0.5 + col * 4.7;
    const cy = 1.18 + row * 2.18;
    const ch = 2.0;

    s.addShape(pres.ShapeType.rect, { x: cx, y: cy, w: cw, h: ch, fill: { color: C.white }, line: { color: border, width: 1.5 }, shadow: makeShadow() });
    s.addShape(pres.ShapeType.rect, { x: cx, y: cy, w: cw, h: 0.36, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(`🗂  ${name}`, { x: cx + 0.1, y: cy + 0.05, w: cw - 0.2, h: 0.26, fontSize: 10, bold: true, color: C.white, fontFace: "Courier New" });

    fields.forEach((field, j) => {
      s.addShape(pres.ShapeType.rect, { x: cx + 0.08, y: cy + 0.44 + j * 0.36, w: cw - 0.16, h: 0.32, fill: { color: j % 2 === 0 ? color : C.white }, line: { color: C.border, width: 0.5 } });
      s.addText(field, { x: cx + 0.14, y: cy + 0.47 + j * 0.36, w: cw - 0.28, h: 0.24, fontSize: 8, color: C.text, fontFace: "Courier New" });
    });
  });

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 5.22, w: 9.25, h: 0.25, fill: { color: C.navy }, line: { color: C.navy } });
  s.addText("Key Indexes:  Users.email (UNIQUE) · Users.firebase_uid (UNIQUE) · PrayerRequests.status · CounsellingSessions.member_id · Messages.from_id+to_id (composite)", {
    x: 0.6, y: 5.23, w: 9.1, h: 0.22, fontSize: 7.5, color: C.white, fontFace: "Calibri",
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 12 — API DESIGN
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  sectionTag(s, "Section 10");
  slideTitle(s, "API Design");
  dividerLine(s, 1.08);

  s.addText("RESTful API · JSON responses · JWT Bearer auth on all endpoints (except /auth/*) · Base: https://api.anm.org/v1  ·  Built on ASP.NET Core .NET 8", {
    x: 0.5, y: 1.15, w: 9, h: 0.26, fontSize: 9.5, color: C.muted, fontFace: "Calibri",
  });

  const apiRows = [
    ["POST", "1D4ED8", "/auth/register", "Public", "Register new member with Firebase UID"],
    ["POST", "1D4ED8", "/auth/login", "Public", "Exchange Firebase token for app JWT"],
    ["GET",  "065F46", "/members", "JWT", "List members (paginated, searchable, filterable)"],
    ["GET",  "065F46", "/members/:id", "JWT", "Full member profile"],
    ["PUT",  "92400E", "/members/:id", "JWT self/admin", "Update member profile fields"],
    ["GET",  "065F46", "/members/:id/history", "JWT leader+", "All pastoral notes for a member"],
    ["POST", "1D4ED8", "/members/:id/history", "JWT leader+", "Add new note to member history"],
    ["GET",  "065F46", "/prayer-requests", "JWT", "Paginated prayer request feed"],
    ["POST", "1D4ED8", "/prayer-requests", "JWT", "Submit prayer request (anon supported)"],
    ["POST", "1D4ED8", "/prayer-requests/:id/pray", "JWT", "Add pray response & increment count"],
    ["GET",  "065F46", "/sermons", "JWT", "Sermon list with category filter & pagination"],
    ["GET",  "065F46", "/sermons/:id", "JWT", "Sermon details + signed CloudFront URL"],
    ["POST", "1D4ED8", "/messages", "JWT", "Send direct message via Twilio"],
    ["POST", "1D4ED8", "/calls/token", "JWT", "Generate Twilio Voice access token"],
  ];

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.44, w: 9.25, h: 0.3, fill: { color: C.navy }, line: { color: C.navy } });
  [["Method", 0.55], ["Endpoint", 1.4], ["Auth", 4.2], ["Description", 5.4]].forEach(([h, x]) =>
    s.addText(h, { x, y: 1.47, w: 2, h: 0.24, fontSize: 8.5, bold: true, color: C.white, fontFace: "Calibri" })
  );

  apiRows.forEach(([method, mc, endpoint, auth, desc], i) => {
    const ry = 1.76 + i * 0.27;
    s.addShape(pres.ShapeType.rect, { x: 0.5, y: ry, w: 9.25, h: 0.27, fill: { color: i % 2 === 0 ? C.white : C.bg }, line: { color: C.border, width: 0.5 } });
    const mbg = method === "GET" ? "DBEAFE" : method === "POST" ? "D1FAE5" : "FEF3C7";
    s.addShape(pres.ShapeType.roundRect, { x: 0.55, y: ry + 0.04, w: 0.62, h: 0.19, fill: { color: mbg }, line: { color: mbg }, rectRadius: 0.03 });
    s.addText(method, { x: 0.55, y: ry + 0.04, w: 0.62, h: 0.19, fontSize: 7, bold: true, color: mc, align: "center", valign: "middle", fontFace: "Calibri" });
    s.addText(endpoint, { x: 1.22, y: ry + 0.03, w: 2.9, h: 0.22, fontSize: 8, color: C.navy, fontFace: "Courier New" });
    s.addText(auth, { x: 4.18, y: ry + 0.03, w: 1.15, h: 0.22, fontSize: 7.5, color: C.muted, fontFace: "Calibri" });
    s.addText(desc, { x: 5.38, y: ry + 0.03, w: 4.25, h: 0.22, fontSize: 8, color: C.muted, fontFace: "Calibri" });
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 13 — DEVELOPMENT TIMELINE (10 Weeks)
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  sectionTag(s, "Section 11");
  slideTitle(s, "Development Timeline");
  dividerLine(s, 1.08);

  s.addText("5 structured phases · Weekly demos · UAT window before launch · Framework advantage: 10 weeks (vs 14–16 for greenfield .NET 8 build)", {
    x: 0.5, y: 1.15, w: 9, h: 0.24, fontSize: 10, color: C.muted, fontFace: "Calibri",
  });

  const phases = [
    {
      num: "01", name: "Discovery &\nFramework Config", weeks: "Wk 1–2", color: C.blue100, tcolor: "1D4ED8",
      items: ["Stakeholder workshops", "ANM branding & UI config", "DB schema & API contract", "Framework modules mapped", "CI/CD env setup", "Figma design sign-off"],
    },
    {
      num: "02", name: "Core\nCustomisation", weeks: "Wk 3–6", color: "F0FDF4", tcolor: "065F46",
      items: ["Auth + onboarding flow", "Member directory & detail", "Member history notes", "Prayer requests module", "Video library + CDN", "ANM-specific branding"],
    },
    {
      num: "03", name: "Feature\nCompletion", weeks: "Wk 7–8", color: C.amber100, tcolor: "92400E",
      items: ["Messaging (Twilio Chat)", "VoIP calling (Twilio)", "Admin backend APIs", "Push notifications (FCM)", "Deep linking & nav polish", "Performance tuning"],
    },
    {
      num: "04", name: "QA, UAT\n& Launch", weeks: "Wk 9–10", color: C.purple100, tcolor: "6B21A8",
      items: ["xUnit + Playwright tests", "Appium mobile E2E", "OWASP security check", "UAT with ANM team", "App Store submission", "🚀 Go-live!"],
    },
    {
      num: "✨", name: "FREE\nHypercare", weeks: "30 Days", color: "FEE2E2", tcolor: "991B1B",
      items: ["30-day free support", "Performance monitoring", "Bug fixes included", "Admin training", "Phase 2 planning", "Handover docs"],
    },
  ];

  phases.forEach(({ num, name, weeks, color, tcolor, items }, i) => {
    const px = 0.5 + i * 1.85;
    const ph = 4.08;
    s.addShape(pres.ShapeType.rect, { x: px, y: 1.44, w: 1.72, h: ph, fill: { color }, line: { color: C.border, width: 1 } });
    const headerBg = tcolor === "1D4ED8" ? C.navy : tcolor === "065F46" ? "065F46" : tcolor === "92400E" ? C.warn : tcolor === "6B21A8" ? "6B21A8" : C.danger;
    s.addShape(pres.ShapeType.rect, { x: px, y: 1.44, w: 1.72, h: 0.84, fill: { color: headerBg }, line: { color: "transparent" } });
    s.addText(i < 4 ? `Phase ${num}` : "🎁 BONUS", { x: px, y: 1.46, w: 1.72, h: 0.24, fontSize: 8, bold: true, color: "FFFFFFCC", align: "center", fontFace: "Calibri" });
    s.addText(name, { x: px, y: 1.68, w: 1.72, h: 0.36, fontSize: 9.5, bold: true, color: C.white, align: "center", fontFace: "Calibri" });
    s.addText(weeks, { x: px, y: 2.1, w: 1.72, h: 0.18, fontSize: 8, color: "FFFFFF99", align: "center", fontFace: "Calibri" });

    items.forEach((item, j) => {
      s.addText(`• ${item}`, { x: px + 0.1, y: 2.36 + j * 0.49, w: 1.52, h: 0.42, fontSize: 8, color: C.text, fontFace: "Calibri", valign: "top" });
    });

    if (i < 4) {
      s.addText("→", { x: px + 1.72, y: 2.88, w: 0.13, h: 0.24, fontSize: 11, color: C.muted, align: "center", fontFace: "Calibri" });
    }
  });

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 5.22, w: 9.25, h: 0.26, fill: { color: C.navy }, line: { color: C.navy } });
  s.addText("🏁  Key Milestone: Week 6 — Full MVP feature-complete   |   Week 9 — UAT signed off + Store submissions   |   🚀 Live in 10 weeks", {
    x: 0.6, y: 5.24, w: 9.1, h: 0.22, fontSize: 7.5, color: C.white, fontFace: "Calibri",
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 14 — PROJECT TEAM
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  sectionTag(s, "Section 12");
  slideTitle(s, "Project Team");
  dividerLine(s, 1.08);

  s.addText("A lean, senior-heavy team structured to minimise communication overhead while maximising quality and speed.", {
    x: 0.5, y: 1.14, w: 9, h: 0.28, fontSize: 10.5, color: C.muted, fontFace: "Calibri",
  });

  const team = [
    { icon: "🧑‍💼", role: "Project Manager", focus: "Delivery · Stakeholder comms · Risk tracking · Weekly reports" },
    { icon: "🎨", role: "UI/UX Designer", focus: "ANM brand config · Design system · Figma prototypes · Accessibility" },
    { icon: "📱", role: "Mobile Dev ×2", focus: "React + Ionic/Capacitor · Capacitor native APIs · Firebase Auth integration" },
    { icon: "⚙️", role: "Backend Dev", focus: "ASP.NET Core .NET 8 · PostgreSQL/EF Core 8 · AWS ECS · S3 pipeline" },
    { icon: "☁️", role: "DevOps Engineer", focus: "CI/CD · AWS RDS/ECS · CloudWatch monitoring · Security hardening" },
    { icon: "🧪", role: "QA Engineer", focus: "Test plans · Playwright + Appium E2E · Performance benchmarks · UAT" },
    { icon: "🔒", role: "Security Consultant", focus: "OWASP Mobile Top 10 · Penetration testing · Data privacy audit" },
    { icon: "🎯", role: "Solution Architect", focus: "Tech oversight · Architecture decisions · Code review · Scalability" },
  ];

  team.forEach(({ icon, role, focus }, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 0.5 + col * 2.35;
    const y = 1.5 + row * 1.95;
    card(s, x, y, 2.18, 1.8, { fill: C.white });
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.74, y: y + 0.12, w: 0.7, h: 0.7, fill: { color: C.navy }, line: { color: C.navyLight } });
    s.addText(icon, { x: x + 0.74, y: y + 0.13, w: 0.7, h: 0.68, fontSize: 18, align: "center", valign: "middle", fontFace: "Calibri" });
    s.addText(role, { x: x + 0.08, y: y + 0.87, w: 2.02, h: 0.3, fontSize: 10, bold: true, color: C.navy, align: "center", fontFace: "Calibri" });
    s.addText(focus, { x: x + 0.08, y: y + 1.18, w: 2.02, h: 0.54, fontSize: 7.5, color: C.muted, align: "center", fontFace: "Calibri" });
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 15 — QA STRATEGY
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  sectionTag(s, "Section 13");
  slideTitle(s, "Quality Assurance Strategy");
  dividerLine(s, 1.08);

  const qa = [
    { icon: "🔬", title: "Unit Testing", tool: "xUnit", body: "80%+ code coverage on all ASP.NET Core service-layer business logic. Runs on every commit via GitHub Actions CI pipeline." },
    { icon: "🔗", title: "Integration Testing", tool: "xUnit + Testcontainers", body: "All API endpoints tested against a Dockerised PostgreSQL test database with real data scenarios — positive and negative." },
    { icon: "📲", title: "End-to-End Testing", tool: "Playwright + Appium", body: "Full user journeys on iOS Simulator and Android Emulator: login → find member → call → submit prayer request." },
    { icon: "⚡", title: "Performance Testing", tool: "k6", body: "Load tests simulating 500 concurrent users. Video streaming benchmarked at <2s initial load via CloudFront CDN." },
    { icon: "♿", title: "Accessibility Testing", tool: "Manual + axe", body: "VoiceOver (iOS) and TalkBack (Android) audit. Colour contrast verified. WCAG 2.1 AA compliance target." },
    { icon: "🛡️", title: "Security Testing", tool: "OWASP", body: "OWASP Mobile Top 10 review. JWT expiry & refresh validation. Full penetration test before go-live." },
  ];

  qa.forEach(({ icon, title, tool, body }, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.5 + col * 3.08;
    const y = 1.2 + row * 2.06;
    card(s, x, y, 2.9, 1.9, { fill: C.white });
    iconCircle(s, icon, x + 0.18, y + 0.16, 0.48, C.navy);
    s.addShape(pres.ShapeType.roundRect, { x: x + 1.4, y: y + 0.18, w: 1.35, h: 0.22, fill: { color: C.gold }, line: { color: C.gold }, rectRadius: 0.1 });
    s.addText(tool, { x: x + 1.4, y: y + 0.19, w: 1.35, h: 0.2, fontSize: 7, bold: true, color: C.white, align: "center", fontFace: "Calibri" });
    s.addText(title, { x: x + 0.1, y: y + 0.7, w: 2.7, h: 0.28, fontSize: 11, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(body, { x: x + 0.1, y: y + 1.0, w: 2.7, h: 0.78, fontSize: 8.5, color: C.muted, fontFace: "Calibri", valign: "top" });
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 16 — INVESTMENT & PRICING
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  sectionTag(s, "Section 15");
  slideTitle(s, "Investment & Pricing");
  dividerLine(s, 1.08);

  s.addText("Fixed-scope packages · All prices in INR · Full source code ownership on final payment · 10-week delivery", {
    x: 0.5, y: 1.14, w: 9, h: 0.26, fontSize: 10, color: C.muted, fontFace: "Calibri",
  });

  // ── Implementation Packages (top half) ──
  const plans = [
    {
      name: "Starter", price: "₹32L", time: "10 weeks",
      color: C.white, headerColor: "475569", featured: false,
      items: ["Home Dashboard", "Member Directory & Detail", "Prayer Requests (basic)", "Video Library", "Firebase Auth", "iOS & Android builds", "30-day bug warranty"],
    },
    {
      name: "⭐ Standard", price: "₹38L", time: "10 weeks",
      color: C.blue100, headerColor: C.navy, featured: true,
      items: ["Everything in Starter", "In-App Messaging (Twilio)", "VoIP Calling", "Member History & Notes", "AWS S3 + CloudFront media", "CI/CD pipeline", "30-day FREE hypercare"],
    },
    {
      name: "Enterprise", price: "₹48L", time: "10 weeks",
      color: C.white, headerColor: "374151", featured: false,
      items: ["Everything in Standard", "Push Notifications (FCM)", "Group Chat / Forums", "Multi-language (3 langs)", "Web Admin Dashboard", "Event Calendar + RSVP", "12-month support SLA"],
    },
  ];

  plans.forEach(({ name, price, time, color, headerColor, featured, items }, i) => {
    const x = 0.5 + i * 3.08;
    const tw = featured ? 3.0 : 2.9;
    const ty = featured ? 1.44 : 1.6;
    const th = featured ? 2.5 : 2.3;

    card(s, x, ty, tw, th, { fill: color });
    if (featured) {
      s.addShape(pres.ShapeType.rect, { x, y: ty, w: tw, h: 0.06, fill: { color: C.gold }, line: { color: C.gold } });
    }
    s.addShape(pres.ShapeType.rect, { x, y: ty + (featured ? 0.06 : 0), w: tw, h: 0.78, fill: { color: headerColor }, line: { color: headerColor } });
    s.addText(name, { x, y: ty + (featured ? 0.08 : 0) + 0.04, w: tw, h: 0.22, fontSize: 10.5, bold: true, color: C.white, align: "center", fontFace: "Calibri" });
    s.addText(price, { x, y: ty + (featured ? 0.08 : 0) + 0.28, w: tw, h: 0.32, fontSize: 22, bold: true, color: featured ? C.gold : C.white, align: "center", fontFace: "Calibri" });
    s.addText(`⏱ ${time}`, { x, y: ty + (featured ? 0.08 : 0) + 0.62, w: tw, h: 0.16, fontSize: 7.5, color: "FFFFFFCC", align: "center", fontFace: "Calibri" });

    items.forEach((item, j) => {
      const iy = ty + 0.9 + (featured ? 0.06 : 0) + j * 0.22;
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.1, y: iy + 0.05, w: 0.1, h: 0.1, fill: { color: C.success }, line: { color: C.success } });
      s.addText(item, { x: x + 0.26, y: iy, w: tw - 0.36, h: 0.2, fontSize: 7.5, color: C.text, fontFace: "Calibri", valign: "middle" });
    });
  });

  // ── AMC Tiers (bottom left) ──
  const amcY = 4.08;
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: amcY, w: 5.5, h: 0.22, fill: { color: C.navy }, line: { color: C.navy } });
  s.addText("📋  Annual Maintenance Contract (AMC) — Post Go-Live", {
    x: 0.56, y: amcY + 0.03, w: 5.4, h: 0.16, fontSize: 8, bold: true, color: C.white, fontFace: "Calibri",
  });

  const amcPlans = [
    { tier: "Basic", price: "₹15,000/mo", color: "F8FAFC", hc: "64748B", items: ["Bug fixes", "OS compatibility", "Monthly health check"] },
    { tier: "Standard", price: "₹25,000/mo", color: C.blue100, hc: C.navy, items: ["Basic +", "Minor enhancements", "SLA: 4-hr response"] },
    { tier: "Premium", price: "₹40,000/mo", color: "FEF3C7", hc: "92400E", items: ["Standard +", "Priority feature dev", "Dedicated support mgr"] },
  ];

  amcPlans.forEach(({ tier, price, color, hc, items }, i) => {
    const ax = 0.5 + i * 1.86;
    s.addShape(pres.ShapeType.rect, { x: ax, y: amcY + 0.22, w: 1.76, h: 1.14, fill: { color }, line: { color: C.border, width: 1 } });
    s.addShape(pres.ShapeType.rect, { x: ax, y: amcY + 0.22, w: 1.76, h: 0.38, fill: { color: hc }, line: { color: hc } });
    s.addText(tier, { x: ax, y: amcY + 0.24, w: 1.76, h: 0.16, fontSize: 7.5, bold: true, color: C.white, align: "center", fontFace: "Calibri" });
    s.addText(price, { x: ax, y: amcY + 0.42, w: 1.76, h: 0.16, fontSize: 8.5, bold: true, color: C.gold, align: "center", fontFace: "Calibri" });
    items.forEach((it, j) => {
      s.addText(`• ${it}`, { x: ax + 0.08, y: amcY + 0.64 + j * 0.22, w: 1.6, h: 0.2, fontSize: 7, color: C.text, fontFace: "Calibri" });
    });
  });

  // ── Platform & Infrastructure Costs (bottom right) ──
  const pcX = 6.2;
  s.addShape(pres.ShapeType.rect, { x: pcX, y: amcY, w: 3.55, h: 0.22, fill: { color: "374151" }, line: { color: "374151" } });
  s.addText("☁️  Estimated Monthly Platform Costs (client-borne)", {
    x: pcX + 0.06, y: amcY + 0.03, w: 3.45, h: 0.16, fontSize: 7.5, bold: true, color: C.white, fontFace: "Calibri",
  });

  const platformCosts = [
    ["AWS RDS PostgreSQL 16", "₹18,500"],
    ["AWS ECS Fargate", "₹12,000"],
    ["AWS S3 + CloudFront CDN", "₹6,000"],
    ["AWS CloudWatch + ALB", "₹3,500"],
    ["Twilio Voice + SMS", "₹4,825"],
    ["Firebase FCM", "Free"],
    ["Apple Dev + Google Play", "₹8,299 /yr"],
  ];

  platformCosts.forEach(([label, cost], i) => {
    const py = amcY + 0.28 + i * 0.16;
    s.addText(label, { x: pcX + 0.1, y: py, w: 2.6, h: 0.15, fontSize: 7, color: C.text, fontFace: "Calibri" });
    s.addText(cost, { x: pcX + 2.72, y: py, w: 0.9, h: 0.15, fontSize: 7, bold: true, color: C.navy, align: "right", fontFace: "Calibri" });
  });
  s.addShape(pres.ShapeType.rect, { x: pcX + 0.1, y: amcY + 1.42, w: 3.35, h: 0.001, fill: { color: C.border }, line: { color: C.border } });
  s.addText("Total est. infra/month", { x: pcX + 0.1, y: amcY + 1.45, w: 2.6, h: 0.16, fontSize: 7.5, bold: true, color: C.text, fontFace: "Calibri" });
  s.addText("~₹44,825", { x: pcX + 2.72, y: amcY + 1.45, w: 0.9, h: 0.16, fontSize: 7.5, bold: true, color: C.danger, align: "right", fontFace: "Calibri" });
}

// ════════════════════════════════════════════════════════
// SLIDE 17 — RISK MANAGEMENT
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  sectionTag(s, "Section 16");
  slideTitle(s, "Risk Management");
  dividerLine(s, 1.08);

  const risks = [
    { risk: "App Store Rejection", likelihood: "Low", impact: "High", lc: C.success, ic: C.danger,
      mitigation: "Strict adherence to Apple/Google guidelines · TestFlight UAT · 1-week buffer in timeline" },
    { risk: "Scope Creep", likelihood: "Medium", impact: "Medium", lc: C.warn, ic: C.warn,
      mitigation: "Signed scope doc · Formal change request process · Phase 2 backlog established upfront" },
    { risk: "Third-Party API Downtime", likelihood: "Low", impact: "Medium", lc: C.success, ic: C.warn,
      mitigation: "Twilio & Firebase have 99.95%+ SLAs · App remains usable during outage (members, videos, prayer)" },
    { risk: "Data Privacy / GDPR", likelihood: "Medium", impact: "High", lc: C.warn, ic: C.danger,
      mitigation: "Privacy policy at onboarding · AES-256 at rest (PostgreSQL) · TLS 1.3 in transit · Soft-delete on request" },
    { risk: "Low User Adoption", likelihood: "Medium", impact: "Medium", lc: C.warn, ic: C.warn,
      mitigation: "20-member UAT pilot · Leadership champions programme · Simple 3-step onboarding · Anonymous prayer" },
    { risk: "Performance Under Load", likelihood: "Low", impact: "Medium", lc: C.success, ic: C.warn,
      mitigation: "ECS Fargate auto-scaling · CloudFront CDN offloads video · k6 load test to 500 concurrent users" },
  ];

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.16, w: 9.25, h: 0.3, fill: { color: C.navy }, line: { color: C.navy } });
  [["Risk", 0.6], ["Likelihood", 3.3], ["Impact", 4.4], ["Mitigation Strategy", 5.5]].forEach(([h, x]) =>
    s.addText(h, { x, y: 1.19, w: 2, h: 0.24, fontSize: 9, bold: true, color: C.white, fontFace: "Calibri" })
  );

  risks.forEach(({ risk, likelihood, impact, lc, ic, mitigation }, i) => {
    const ry = 1.48 + i * 0.64;
    s.addShape(pres.ShapeType.rect, { x: 0.5, y: ry, w: 9.25, h: 0.62, fill: { color: i % 2 === 0 ? C.white : C.bg }, line: { color: C.border, width: 0.5 } });
    s.addText(risk, { x: 0.6, y: ry + 0.07, w: 2.6, h: 0.24, fontSize: 9.5, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addShape(pres.ShapeType.roundRect, { x: 3.3, y: ry + 0.16, w: 0.9, h: 0.22, fill: { color: lc }, line: { color: lc }, rectRadius: 0.06 });
    s.addText(likelihood, { x: 3.3, y: ry + 0.17, w: 0.9, h: 0.2, fontSize: 7.5, bold: true, color: C.white, align: "center", fontFace: "Calibri" });
    s.addShape(pres.ShapeType.roundRect, { x: 4.38, y: ry + 0.16, w: 0.9, h: 0.22, fill: { color: ic }, line: { color: ic }, rectRadius: 0.06 });
    s.addText(impact, { x: 4.38, y: ry + 0.17, w: 0.9, h: 0.2, fontSize: 7.5, bold: true, color: C.white, align: "center", fontFace: "Calibri" });
    s.addText(mitigation, { x: 5.44, y: ry + 0.06, w: 4.2, h: 0.5, fontSize: 8, color: C.muted, fontFace: "Calibri", valign: "top" });
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 18 — WHY CHOOSE US
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };

  sectionTag(s, "Section 17");
  slideTitle(s, "Why Choose Us");
  dividerLine(s, 1.08);

  const reasons = [
    ["🏆", "Community App Experience", "We've delivered faith-based apps for 500–5,000 member organisations. We know what makes community platforms succeed."],
    ["🤝", "Transparent Partnership", "Weekly demos = you see real progress every 7 days. No surprises at delivery. Your stakeholders stay aligned throughout."],
    ["📐", "Accessibility-First Design", "Specific expertise designing for all age groups. A 65-year-old and a 25-year-old will both feel at home in the ANM App."],
    ["🔓", "Full Source Code Ownership", "You own everything. Code, databases, and AWS infra transferred on final payment. No vendor lock-in, ever."],
    ["⚡", "Proprietary Framework Advantage", "We don't build from scratch — our .NET 8 community framework has 20+ modules pre-built. Faster delivery, lower risk, more features on day one."],
    ["🏗️", "Enterprise-Grade, Not Prototype-Grade", ".NET 8 + PostgreSQL is what banks, hospitals, and enterprise apps run on. Node.js/Express suits startups. We build platforms designed to scale safely for years."],
  ];

  reasons.forEach(([icon, title, body], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.5 + col * 3.08;
    const y = 1.2 + row * 2.06;
    card(s, x, y, 2.9, 1.92, { fill: C.white });
    s.addShape(pres.ShapeType.rect, { x, y, w: 2.9, h: 0.06, fill: { color: C.gold }, line: { color: C.gold } });
    iconCircle(s, icon, x + 0.2, y + 0.18, 0.48, C.navy);
    s.addText(title, { x: x + 0.1, y: y + 0.74, w: 2.7, h: 0.28, fontSize: 11, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(body, { x: x + 0.1, y: y + 1.04, w: 2.7, h: 0.78, fontSize: 8.5, color: C.muted, fontFace: "Calibri", valign: "top" });
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 19 — CONCLUSION / CTA
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.navy };

  s.addShape(pres.ShapeType.ellipse, { x: 7.5, y: -1.2, w: 4, h: 4, fill: { color: C.navyLight, transparency: 70 }, line: { color: C.navyLight, transparency: 70 } });
  s.addShape(pres.ShapeType.ellipse, { x: -1.0, y: 3.2, w: 3.5, h: 3.5, fill: { color: C.navyLight, transparency: 75 }, line: { color: C.navyLight, transparency: 75 } });

  s.addText("🙏", { x: 0.5, y: 0.4, w: 9, h: 0.7, fontSize: 36, align: "center", fontFace: "Calibri" });
  s.addText("Ready to Build Something Meaningful Together?", {
    x: 0.8, y: 1.1, w: 8.4, h: 0.7, fontSize: 28, bold: true, color: C.white, align: "center", fontFace: "Calibri",
  });

  s.addShape(pres.ShapeType.rect, { x: 3.9, y: 1.9, w: 2.2, h: 0.06, fill: { color: C.gold }, line: { color: C.gold } });

  s.addText("Built on our proprietary .NET 8 enterprise framework — the ANM Community App will be delivered in 10 weeks, fully owned by ANM, and built to scale with your community's vision.", {
    x: 1.0, y: 2.05, w: 8.0, h: 0.7, fontSize: 11.5, color: "FFFFFFB0", align: "center", fontFace: "Calibri",
  });

  const ctas = [
    { icon: "📅", label: "Schedule a Discovery Call", sub: "30-min call with ANM leadership" },
    { icon: "📧", label: "Email Us", sub: "hello@yourstudio.com" },
    { icon: "📄", label: "Sign & Get Started", sub: "30% deposit to kick off Week 1" },
  ];
  ctas.forEach(({ icon, label, sub }, i) => {
    const x = 0.62 + i * 2.98;
    s.addShape(pres.ShapeType.rect, { x, y: 2.95, w: 2.75, h: 1.1, fill: { color: i === 0 ? C.gold : "FFFFFF14" }, line: { color: i === 0 ? C.gold : "FFFFFF40", width: 1 } });
    s.addText(icon, { x, y: 3.02, w: 2.75, h: 0.36, fontSize: 18, align: "center", fontFace: "Calibri" });
    s.addText(label, { x, y: 3.38, w: 2.75, h: 0.3, fontSize: 9.5, bold: true, color: i === 0 ? C.navy : C.white, align: "center", fontFace: "Calibri" });
    s.addText(sub, { x, y: 3.7, w: 2.75, h: 0.26, fontSize: 8, color: i === 0 ? "4A3800" : "FFFFFFAA", align: "center", fontFace: "Calibri" });
  });

  const highlights = ["10 Weeks to Launch", "iOS + Android + Web", "Full Source Code Ownership", "99.9% Uptime SLA"];
  highlights.forEach((h, i) => {
    const x = 0.5 + i * 2.32;
    s.addShape(pres.ShapeType.rect, { x, y: 4.35, w: 2.2, h: 0.55, fill: { color: "FFFFFF0A" }, line: { color: "FFFFFF20", width: 1 } });
    s.addText(`✓  ${h}`, { x, y: 4.38, w: 2.2, h: 0.48, fontSize: 8.5, color: "FFFFFFCC", align: "center", valign: "middle", fontFace: "Calibri" });
  });

  s.addShape(pres.ShapeType.rect, { x: 0, y: 5.45, w: 10, h: 0.175, fill: { color: C.gold } });
  s.addText("Prepared for ANM Organisation  ·  June 2025  ·  Powered by Proprietary .NET 8 Framework  ·  Private & Confidential", {
    x: 0, y: 5.46, w: 10, h: 0.14, fontSize: 7, color: C.navy, align: "center", fontFace: "Calibri",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// WRITE FILE
// ─────────────────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: "ANM_App_Proposal.pptx" })
  .then(() => console.log("✅  ANM_App_Proposal.pptx generated successfully!"))
  .catch(err => console.error("❌  Error:", err));
