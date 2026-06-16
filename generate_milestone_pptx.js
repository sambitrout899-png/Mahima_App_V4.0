/**
 * ANM Community App — Milestone & Implementation Plan Deck
 * ─────────────────────────────────────────────────────────
 * Run:
 *   npm install pptxgenjs
 *   node generate_milestone_pptx.js
 *
 * Output: ANM_Milestone_Implementation_Plan.pptx
 *
 * Stack: ASP.NET Core .NET 8 · React + Ionic/Capacitor · PostgreSQL 16
 * 10-week delivery + 30-day hypercare
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
  blue:      "2563EB",
  blue100:   "EFF6FF",
  green100:  "D1FAE5",
  amber100:  "FEF3C7",
  purple100: "F5F3FF",
  red100:    "FEE2E2",
};

let pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title  = "ANM Community App — Milestone & Implementation Plan";
pres.author = "Solution Development Team";

const makeShadow = () => ({ type: "outer", blur: 6, offset: 3, angle: 135, color: "000000", opacity: 0.09 });

function bg(slide) { slide.background = { color: C.bg }; }
function darkBg(slide) { slide.background = { color: C.navy }; }

function sectionTag(s, label) {
  s.addText(label.toUpperCase(), {
    x: 0.5, y: 0.28, w: 9, h: 0.22,
    fontSize: 9, bold: true, color: C.gold, charSpacing: 3, fontFace: "Calibri",
  });
}

function title(s, txt, y = 0.52) {
  s.addText(txt, {
    x: 0.5, y, w: 9, h: 0.55,
    fontSize: 29, bold: true, color: C.navy, fontFace: "Calibri",
  });
}

function divider(s, y = 1.08) {
  s.addShape(pres.ShapeType.line, {
    x: 0.5, y, w: 9, h: 0,
    line: { color: C.gold, width: 2 },
  });
}

function card(s, x, y, w, h, fill = C.white, borderColor = C.border) {
  s.addShape(pres.ShapeType.rect, { x, y, w, h, fill: { color: fill }, line: { color: borderColor, width: 1 }, shadow: makeShadow() });
}

function badge(s, x, y, w, h, text, bg2, textColor = C.white) {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: bg2 }, line: { color: bg2 }, rectRadius: 0.08 });
  s.addText(text, { x, y, w, h, fontSize: 8, bold: true, color: textColor, align: "center", valign: "middle", fontFace: "Calibri" });
}

// ════════════════════════════════════════════════════════
// SLIDE 1 — COVER
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  darkBg(s);

  s.addShape(pres.ShapeType.ellipse, { x: 7.8, y: -0.8, w: 3.2, h: 3.2, fill: { color: C.navyLight, transparency: 65 }, line: { color: C.navyLight, transparency: 65 } });
  s.addShape(pres.ShapeType.ellipse, { x: -0.6, y: 3.6, w: 2.8, h: 2.8, fill: { color: C.navyLight, transparency: 70 }, line: { color: C.navyLight, transparency: 70 } });

  s.addShape(pres.ShapeType.roundRect, { x: 3.5, y: 0.5, w: 3.0, h: 0.32, fill: { color: "2C4499" }, line: { color: C.gold, width: 1 }, rectRadius: 0.16 });
  s.addText("PROJECT DELIVERY PLAN · 2025", { x: 3.5, y: 0.5, w: 3.0, h: 0.32, fontSize: 8, color: C.gold, align: "center", valign: "middle", bold: true, charSpacing: 1.5, fontFace: "Calibri" });

  s.addText("ANM Community App", { x: 0.8, y: 1.0, w: 8.4, h: 0.65, fontSize: 40, bold: true, color: C.white, align: "center", fontFace: "Calibri" });
  s.addText("Milestone & Implementation Plan", { x: 0.8, y: 1.65, w: 8.4, h: 0.55, fontSize: 28, bold: true, color: C.gold, align: "center", fontFace: "Calibri" });

  s.addShape(pres.ShapeType.rect, { x: 4.0, y: 2.35, w: 2.0, h: 0.05, fill: { color: C.gold } });

  s.addText("A precise execution framework for delivering a .NET 8 + Ionic/Capacitor + PostgreSQL community platform in 10 weeks.", {
    x: 1.2, y: 2.52, w: 7.6, h: 0.5, fontSize: 10.5, color: "FFFFFFAA", align: "center", fontFace: "Calibri",
  });

  const meta = [
    ["Project",    "ANM Community App"],
    ["Duration",   "10 Weeks + 30-Day Hypercare"],
    ["Methodology","Agile / 2-Week Sprints"],
    ["Framework",  ".NET 8 + PostgreSQL"],
    ["Version",    "v1.0 — Draft"],
  ];
  const mw = 1.72, mx0 = 0.5;
  meta.forEach(([label, val], i) => {
    const mx = mx0 + i * (mw + 0.06);
    s.addShape(pres.ShapeType.rect, { x: mx, y: 3.18, w: mw, h: 0.76, fill: { color: "FFFFFF", transparency: 90 }, line: { color: "FFFFFF", transparency: 80 } });
    s.addText(label.toUpperCase(), { x: mx, y: 3.24, w: mw, h: 0.2, fontSize: 6.5, color: "FFFFFFAA", align: "center", bold: true, charSpacing: 1, fontFace: "Calibri" });
    s.addText(val, { x: mx, y: 3.46, w: mw, h: 0.36, fontSize: 8.5, color: C.white, align: "center", bold: true, fontFace: "Calibri" });
  });

  s.addShape(pres.ShapeType.rect, { x: 0, y: 5.45, w: 10, h: 0.175, fill: { color: C.gold } });
  s.addText("ANM Community App — Milestone & Implementation Plan · Confidential", { x: 0, y: 5.46, w: 10, h: 0.14, fontSize: 7, color: C.navy, align: "center", fontFace: "Calibri" });
}

// ════════════════════════════════════════════════════════
// SLIDE 2 — KPI SCORECARD
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  bg(s);

  sectionTag(s, "Delivery Scorecard");
  title(s, "At a Glance — Key Delivery Numbers");
  divider(s, 1.08);

  const kpis = [
    ["5",    "Delivery Phases",   "Discovery → Deployment → Hypercare"],
    ["20",   "Key Milestones",    "3 Formal Sign-off Gates"],
    ["5",    "Agile Sprints",     "2 Weeks Each"],
    ["130+", "Story Points",      "Across All 5 Sprints"],
    ["10",   "Weeks to Go-Live",  "App Store + Play Store"],
    ["35+",  "Checklist Items",   "Pre-Launch Verification"],
  ];

  kpis.forEach(([val, lbl, sub], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.5 + col * 3.08, y = 1.24 + row * 2.06;
    card(s, x, y, 2.9, 1.9);
    s.addShape(pres.ShapeType.rect, { x, y, w: 2.9, h: 0.07, fill: { color: C.gold }, line: { color: C.gold } });
    s.addText(val, { x, y: y + 0.22, w: 2.9, h: 0.72, fontSize: 48, bold: true, color: C.navy, align: "center", fontFace: "Calibri" });
    s.addText(lbl, { x, y: y + 1.0, w: 2.9, h: 0.32, fontSize: 11.5, bold: true, color: C.navy, align: "center", fontFace: "Calibri" });
    s.addText(sub, { x, y: y + 1.34, w: 2.9, h: 0.24, fontSize: 8.5, color: C.muted, align: "center", fontFace: "Calibri" });
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 3 — PROJECT GANTT (6-Week)
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  bg(s);

  sectionTag(s, "Timeline");
  title(s, "Project Gantt — 10-Week + Hypercare Overview");
  divider(s, 1.08);

  const weeks = ["Wk 1","Wk 2","Wk 3","Wk 4","Wk 5","Wk 6","Wk 7","Wk 8","Wk 9","Wk 10","HC-1","HC-2"];
  const colW = 0.585, colX0 = 2.8, headerY = 1.16;

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: headerY, w: 2.26, h: 0.32, fill: { color: C.navy }, line: { color: C.navy } });
  s.addText("Activity", { x: 0.5, y: headerY, w: 2.26, h: 0.32, fontSize: 9, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Calibri" });

  weeks.forEach((w, i) => {
    const isHC = i >= 10;
    const bx = colX0 + i * colW;
    s.addShape(pres.ShapeType.rect, { x: bx, y: headerY, w: colW - 0.02, h: 0.32, fill: { color: isHC ? "374151" : C.navy }, line: { color: isHC ? "374151" : C.navy } });
    s.addText(w, { x: bx, y: headerY, w: colW - 0.02, h: 0.32, fontSize: 6.5, bold: true, color: isHC ? "AAAAAA" : C.white, align: "center", valign: "middle", fontFace: "Calibri" });
  });

  const rows = [
    { label: "Phase 1: Discovery & Config",  startWk: 0,  endWk: 1,  color: "2563EB", sub: "1–2" },
    { label: "  Stakeholder Workshops",       startWk: 0,  endWk: 0,  color: "3B82F6", sub: "Wk 1" },
    { label: "  DB Schema + API Contract",    startWk: 0,  endWk: 1,  color: "3B82F6", sub: "1–2" },
    { label: "  Figma Design Sign-off",       startWk: 1,  endWk: 1,  color: "3B82F6", sub: "Wk 2" },
    { label: "Phase 2: Core Customisation",   startWk: 2,  endWk: 5,  color: "059669", sub: "3–6" },
    { label: "  Auth + Member Directory",     startWk: 2,  endWk: 3,  color: "10B981", sub: "3–4" },
    { label: "  Prayer Requests + Video",     startWk: 3,  endWk: 5,  color: "10B981", sub: "4–6" },
    { label: "  Backend APIs (.NET 8)",       startWk: 2,  endWk: 5,  color: "10B981", sub: "3–6" },
    { label: "Phase 3: Feature Completion",   startWk: 6,  endWk: 7,  color: "D97706", sub: "7–8" },
    { label: "  Messaging + VoIP + FCM",      startWk: 6,  endWk: 7,  color: "F59E0B", sub: "7–8" },
    { label: "Phase 4: QA, UAT & Launch",     startWk: 8,  endWk: 9,  color: "7C3AED", sub: "9–10" },
    { label: "  xUnit + Playwright + Appium", startWk: 8,  endWk: 8,  color: "8B5CF6", sub: "Wk 9" },
    { label: "  UAT + App Store Submit",      startWk: 9,  endWk: 9,  color: "8B5CF6", sub: "Wk 10" },
    { label: "Hypercare (Free — 30 Days)",    startWk: 10, endWk: 11, color: "DC2626", sub: "HC" },
  ];

  rows.forEach(({ label, startWk, endWk, color, sub }, i) => {
    const ry = 1.52 + i * 0.28;
    const isPhase = !label.startsWith("  ");
    const rowBg = isPhase ? C.navy : (i % 2 === 0 ? C.white : C.bg);
    s.addShape(pres.ShapeType.rect, { x: 0.5, y: ry, w: 2.26, h: 0.27, fill: { color: rowBg }, line: { color: C.border, width: 0.5 } });
    s.addText(label.trim(), { x: 0.56, y: ry + 0.04, w: 2.14, h: 0.2, fontSize: isPhase ? 8 : 7, bold: isPhase, color: isPhase ? C.white : C.text, fontFace: "Calibri" });

    for (let w = 0; w < 12; w++) {
      const bx = colX0 + w * colW;
      const isInRange = w >= startWk && w <= endWk;
      s.addShape(pres.ShapeType.rect, { x: bx, y: ry, w: colW - 0.02, h: 0.27, fill: { color: isInRange ? color : (w >= 10 ? "1F2937" : i % 2 === 0 ? "F1F5F9" : C.white) }, line: { color: C.border, width: 0.3 } });
      if (isInRange) {
        s.addText(sub, { x: bx, y: ry + 0.07, w: colW - 0.02, h: 0.14, fontSize: 5, color: "FFFFFFEE", align: "center", fontFace: "Calibri" });
      }
    }
  });

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 5.24, w: 9.25, h: 0.22, fill: { color: C.navy }, line: { color: C.navy } });
  s.addText("🚀  Go-Live: End of Week 10   |   🏁  Framework pre-built modules save 4–6 weeks vs greenfield build   |   HC = Hypercare (30-day free support)", {
    x: 0.6, y: 5.245, w: 9.1, h: 0.2, fontSize: 7.5, color: C.white, fontFace: "Calibri",
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 4 — MILESTONE REGISTER
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  bg(s);

  sectionTag(s, "Milestone Register");
  title(s, "Milestone Register — All 20 Milestones");
  divider(s, 1.08);

  const milestones = [
    ["M01", "Wk 1",  "Kickoff & Stakeholder Workshop Complete",       "Sign-off", "1D4ED8"],
    ["M02", "Wk 1",  "Development Environment + CI/CD Pipeline Live", "Team",     "2563EB"],
    ["M03", "Wk 2",  "PostgreSQL Schema + API Contract Approved",     "Sign-off", "1D4ED8"],
    ["M04", "Wk 2",  "Figma High-Fidelity Designs Signed Off",        "Sign-off", "1D4ED8"],
    ["M05", "Wk 3",  "Firebase Auth + Onboarding Flow Complete",      "Demo",     "059669"],
    ["M06", "Wk 4",  "Member Directory + Detail Page Done",           "Demo",     "059669"],
    ["M07", "Wk 5",  "Member History Notes Feature Complete",         "Demo",     "059669"],
    ["M08", "Wk 5",  "Prayer Requests Module Deployed",               "Demo",     "059669"],
    ["M09", "Wk 6",  "Video Library + CloudFront CDN Streaming Live", "Demo",     "059669"],
    ["M10", "Wk 6",  "All Core APIs (.NET 8) Feature-Complete",       "Sign-off", "1D4ED8"],
    ["M11", "Wk 7",  "Twilio Chat + VoIP Calling Integrated",         "Demo",     "D97706"],
    ["M12", "Wk 8",  "Push Notifications (FCM) Live on Device",       "Demo",     "D97706"],
    ["M13", "Wk 8",  "Admin RBAC + Deep-Link Polish Complete",        "Demo",     "D97706"],
    ["M14", "Wk 9",  "xUnit + Playwright + Appium Tests Complete",    "QA Gate",  "7C3AED"],
    ["M15", "Wk 9",  "OWASP Security Audit Passed",                   "Sign-off", "1D4ED8"],
    ["M16", "Wk 9",  "Production AWS Infrastructure Live",            "DevOps",   "374151"],
    ["M17", "Wk 10", "UAT Sign-off by ANM Stakeholders",              "Sign-off", "1D4ED8"],
    ["M18", "Wk 10", "Performance Tests — p95 < 200ms Confirmed",     "QA Gate",  "7C3AED"],
    ["M19", "Wk 10", "App Store + Play Store Submissions",            "DevOps",   "374151"],
    ["M20", "Wk 10", "🚀  Go-Live — ANM Community App is Live",       "Go-Live",  "DC2626"],
  ];

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.17, w: 9.25, h: 0.3, fill: { color: C.navy }, line: { color: C.navy } });
  [["ID", 0.55], ["Week", 1.0], ["Milestone", 1.6], ["Gate", 7.9]].forEach(([h, x]) =>
    s.addText(h, { x, y: 1.2, w: 1.5, h: 0.24, fontSize: 8.5, bold: true, color: C.white, fontFace: "Calibri" })
  );

  milestones.forEach(([id, wk, label, gate, gateColor], i) => {
    const ry = 1.49 + i * 0.208;
    s.addShape(pres.ShapeType.rect, { x: 0.5, y: ry, w: 9.25, h: 0.205, fill: { color: i % 2 === 0 ? C.white : C.bg }, line: { color: C.border, width: 0.4 } });
    badge(s, 0.55, ry + 0.04, 0.37, 0.14, id, C.navy);
    s.addText(wk, { x: 1.0, y: ry + 0.03, w: 0.55, h: 0.16, fontSize: 7.5, color: C.muted, fontFace: "Calibri" });
    s.addText(label, { x: 1.6, y: ry + 0.03, w: 6.2, h: 0.16, fontSize: 8, color: C.text, fontFace: "Calibri" });
    badge(s, 7.9, ry + 0.04, 1.7, 0.14, gate, gateColor);
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 5 — SIGN-OFF GATES
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  bg(s);

  sectionTag(s, "Governance");
  title(s, "Formal Sign-Off Gates");
  divider(s, 1.08);

  s.addText("3 mandatory gates before proceeding — ensures ANM leadership controls every major transition.", {
    x: 0.5, y: 1.15, w: 9, h: 0.26, fontSize: 10, color: C.muted, fontFace: "Calibri",
  });

  const gates = [
    {
      num: "G1", week: "End Wk 2", name: "Design & Architecture Sign-Off",
      color: "1D4ED8", bg2: C.blue100,
      criteria: [
        "✅ PostgreSQL schema reviewed by ANM team",
        "✅ 14 REST API endpoints documented & agreed",
        "✅ Figma UI designs approved (brand, fonts, colours)",
        "✅ CI/CD pipeline verified with sample build",
        "✅ Development environment access confirmed",
      ],
      blocker: "No development begins until designs & schema are signed off.",
    },
    {
      num: "G2", week: "End Wk 6", name: "MVP Core Feature Sign-Off",
      color: "059669", bg2: "F0FDF4",
      criteria: [
        "✅ Auth + Member Directory demo accepted",
        "✅ Prayer Requests flow verified end-to-end",
        "✅ Video streaming via CloudFront <2s confirmed",
        "✅ Member History notes live in staging",
        "✅ All core APIs (.NET 8) feature-complete",
      ],
      blocker: "Phase 3 features only begin once core is approved.",
    },
    {
      num: "G3", week: "End Wk 10", name: "UAT & Go-Live Sign-Off",
      color: "7C3AED", bg2: C.purple100,
      criteria: [
        "✅ All 35+ pre-launch checklist items checked",
        "✅ OWASP security audit passed & documented",
        "✅ xUnit + Playwright + Appium test report attached",
        "✅ ANM UAT participants sign acceptance form",
        "✅ App Store / Play Store submissions approved",
      ],
      blocker: "Production release requires written stakeholder sign-off.",
    },
  ];

  gates.forEach(({ num, week, name, color, bg2, criteria, blocker }, i) => {
    const x = 0.5 + i * 3.08, y = 1.44;
    card(s, x, y, 2.9, 3.92, bg2, color);
    s.addShape(pres.ShapeType.rect, { x, y, w: 2.9, h: 0.72, fill: { color }, line: { color } });
    s.addText(`Gate ${num}`, { x, y: y + 0.06, w: 2.9, h: 0.24, fontSize: 9, bold: true, color: "FFFFFFCC", align: "center", fontFace: "Calibri" });
    s.addText(week, { x, y: y + 0.3, w: 2.9, h: 0.2, fontSize: 8.5, color: "FFFFFFAA", align: "center", fontFace: "Calibri" });
    s.addText(name, { x, y: y + 0.52, w: 2.9, h: 0.18, fontSize: 8, color: C.white, align: "center", bold: true, fontFace: "Calibri" });

    criteria.forEach((c, j) => {
      s.addText(c, { x: x + 0.12, y: y + 0.82 + j * 0.44, w: 2.66, h: 0.38, fontSize: 8.5, color: C.text, fontFace: "Calibri", valign: "top" });
    });

    s.addShape(pres.ShapeType.rect, { x: x + 0.08, y: y + 3.58, w: 2.74, h: 0.26, fill: { color }, line: { color } });
    s.addText(`⚠  ${blocker}`, { x: x + 0.1, y: y + 3.59, w: 2.7, h: 0.24, fontSize: 7, color: C.white, fontFace: "Calibri", valign: "middle" });
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 6 — PHASE BREAKDOWN
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  bg(s);

  sectionTag(s, "Phase Breakdown");
  title(s, "Phase-by-Phase Task Breakdown");
  divider(s, 1.08);

  const phases = [
    {
      num: "01", name: "Discovery & Framework Config", weeks: "Wk 1–2", color: "2563EB", bg2: C.blue100,
      tasks: ["Stakeholder requirements workshop", "ANM brand config + theming in Ionic", "PostgreSQL schema design (EF Core 8 migrations)", "REST API contract (14 endpoints, OpenAPI spec)", "CI/CD pipeline — GitHub Actions + AWS ECS", "Figma UI design + sign-off gate G1"],
    },
    {
      num: "02", name: "Core Customisation", weeks: "Wk 3–6", color: "059669", bg2: "F0FDF4",
      tasks: ["Firebase Auth + biometric onboarding", "Member Directory + Detail (React + Ionic)", "Member History (pastoral notes — EF Core 8)", "Prayer Requests module + pray interactions", "Video Library + AWS S3 + CloudFront streaming", "Backend .NET 8 APIs (all 4 core modules) — G2"],
    },
    {
      num: "03", name: "Feature Completion", weeks: "Wk 7–8", color: "D97706", bg2: C.amber100,
      tasks: ["Twilio Chat (1:1 in-app messaging)", "Twilio VoIP (in-app calling)", "Push notifications (Firebase FCM)", "Admin backend endpoints (RBAC .NET 8)", "Deep-link routing (Ionic Router)", "Performance audit + image optimisation"],
    },
    {
      num: "04", name: "QA, UAT & Launch", weeks: "Wk 9–10", color: "7C3AED", bg2: C.purple100,
      tasks: ["xUnit unit tests (80%+ coverage)", "Testcontainers API integration tests", "Playwright E2E — web flows", "Appium E2E — iOS Simulator + Android", "OWASP mobile security audit", "UAT with ANM team → App Store submit"],
    },
    {
      num: "05", name: "Hypercare", weeks: "30 Days Free", color: "DC2626", bg2: "FEE2E2",
      tasks: ["30-day free post-launch support", "Performance monitoring (CloudWatch)", "Critical bug fixes at no charge", "Admin team training & handover", "Source code + doc delivery", "Phase 2 backlog planning"],
    },
  ];

  phases.forEach(({ num, name, weeks, color, bg2, tasks }, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.35 + col * 3.22, y = 1.2 + row * 2.18;
    card(s, x, y, 3.06, 2.1, bg2, color);
    s.addShape(pres.ShapeType.rect, { x, y, w: 3.06, h: 0.52, fill: { color }, line: { color } });
    s.addText(`Phase ${num}: ${name}`, { x: x + 0.08, y: y + 0.06, w: 2.9, h: 0.24, fontSize: 9.5, bold: true, color: C.white, fontFace: "Calibri" });
    s.addText(weeks, { x: x + 0.08, y: y + 0.3, w: 2.9, h: 0.18, fontSize: 7.5, color: "FFFFFFBB", fontFace: "Calibri" });

    tasks.forEach((task, j) => {
      const ty = y + 0.6 + j * 0.26;
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.1, y: ty + 0.08, w: 0.09, h: 0.09, fill: { color }, line: { color } });
      s.addText(task, { x: x + 0.24, y: ty + 0.02, w: 2.74, h: 0.22, fontSize: 7.5, color: C.text, fontFace: "Calibri", valign: "middle" });
    });
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 7 — SPRINT 1 (Weeks 1–2)
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  bg(s);

  sectionTag(s, "Sprint Planning");
  title(s, "Sprint 1 — Weeks 1–2: Discovery & Framework Config");
  divider(s, 1.08);

  s.addText("Goal: Establish all foundations before a single line of feature code is written. Sign-off Gate 1 at end of Week 2.", {
    x: 0.5, y: 1.14, w: 9, h: 0.26, fontSize: 10, color: C.muted, fontFace: "Calibri",
  });

  const stories1 = [
    [8,  "Project kickoff + requirements finalisation",       "PM + Architect | ANM team workshop, scope signed"],
    [5,  "PostgreSQL schema + API contract doc (OpenAPI)",    "Backend + Architect | 5 tables, 14 endpoints (EF Core 8)"],
    [8,  "CI/CD pipeline — GitHub Actions + ECS + Docker",   "DevOps | PR gates → .NET 8 build → deploy to staging"],
    [5,  "AWS RDS PostgreSQL provisioning (staging)",        "DevOps | RDS Multi-AZ config, security group, VPC"],
    [8,  "Ionic/Capacitor project scaffold + brand theming", "Mobile Dev | ANM colours, fonts, bottom nav, dark mode"],
    [8,  "Figma high-fidelity UI designs — all screens",     "UI/UX | 9 screens, component library, design sign-off"],
    [3,  "Firebase Auth project setup + .NET JWT middleware", "Backend | Firebase Admin SDK, JWT Bearer, role claims"],
    [3,  "Security Consultant kickoff brief",                "Security | OWASP checklist, pentest plan, data mapping"],
  ];

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.46, w: 9.25, h: 0.3, fill: { color: "2563EB" }, line: { color: "2563EB" } });
  [["SP", 0.55], ["Story", 1.1], ["Owner / Notes", 6.1]].forEach(([h, x]) =>
    s.addText(h, { x, y: 1.5, w: 2, h: 0.22, fontSize: 8.5, bold: true, color: C.white, fontFace: "Calibri" })
  );

  stories1.forEach(([sp, story, owner], i) => {
    const ry = 1.78 + i * 0.44;
    s.addShape(pres.ShapeType.rect, { x: 0.5, y: ry, w: 9.25, h: 0.43, fill: { color: i % 2 === 0 ? C.white : C.bg }, line: { color: C.border, width: 0.4 } });
    badge(s, 0.55, ry + 0.1, 0.44, 0.22, `${sp}pt`, "2563EB");
    s.addText(story, { x: 1.06, y: ry + 0.06, w: 4.96, h: 0.32, fontSize: 8.5, color: C.text, fontFace: "Calibri", valign: "middle" });
    s.addText(owner, { x: 6.06, y: ry + 0.06, w: 3.6, h: 0.32, fontSize: 7.5, color: C.muted, fontFace: "Calibri", valign: "middle" });
  });

  const totalSP = stories1.reduce((a, [sp]) => a + sp, 0);
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 5.24, w: 9.25, h: 0.22, fill: { color: "2563EB" }, line: { color: "2563EB" } });
  s.addText(`Sprint 1 Total: ${totalSP} Story Points   |   End Gate: Design & Architecture Sign-Off   |   Sprint Review: EOD Wk 2 Demo`, {
    x: 0.6, y: 5.245, w: 9.1, h: 0.2, fontSize: 7.5, color: C.white, fontFace: "Calibri",
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 8 — SPRINT 2 (Weeks 3–4)
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  bg(s);

  sectionTag(s, "Sprint Planning");
  title(s, "Sprint 2 — Weeks 3–4: Core Customisation Part 1");
  divider(s, 1.08);

  s.addText("Goal: Auth, Member Directory, History & core APIs live in staging by end of Week 4.", {
    x: 0.5, y: 1.14, w: 9, h: 0.26, fontSize: 10, color: C.muted, fontFace: "Calibri",
  });

  const stories2 = [
    [6, "Firebase Auth + biometric onboarding (Capacitor Biometric)",   "Mobile Dev | Login, OTP, Google OAuth, fingerprint"],
    [8, "Member Directory — search, filter, role badges (Ionic list)",   "Mobile Dev | Paginated, debounced search, avatars"],
    [5, "Member Detail page — call/message/pray CTAs",                   "Mobile Dev | Profile card, stat chips, action buttons"],
    [5, "Member History (pastoral notes) — CRUD + timestamp log",        "Full Stack | .NET 8 API + EF Core + Ionic UI"],
    [5, ".NET 8 REST APIs (auth + directory + history modules)",          "Backend | EF Core 8 migrations, JWT auth, xUnit tests"],
    [3, "AWS RDS PostgreSQL staging provisioned",                        "DevOps | RDS Multi-AZ, security group, VPC config"],
    [3, "GitHub Actions CI/CD — PR gate + staging auto-deploy",         "DevOps | Docker build → ECS Fargate staging"],
    [3, "Weekly demo prep + stakeholder review",                         "PM | Demo recording + feedback log"],
  ];

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.46, w: 9.25, h: 0.3, fill: { color: "059669" }, line: { color: "059669" } });
  [["SP", 0.55], ["Story", 1.1], ["Owner / Notes", 6.1]].forEach(([h, x]) =>
    s.addText(h, { x, y: 1.5, w: 2, h: 0.22, fontSize: 8.5, bold: true, color: C.white, fontFace: "Calibri" })
  );

  stories2.forEach(([sp, story, owner], i) => {
    const ry = 1.78 + i * 0.44;
    s.addShape(pres.ShapeType.rect, { x: 0.5, y: ry, w: 9.25, h: 0.43, fill: { color: i % 2 === 0 ? C.white : C.bg }, line: { color: C.border, width: 0.4 } });
    badge(s, 0.55, ry + 0.1, 0.44, 0.22, `${sp}pt`, "059669");
    s.addText(story, { x: 1.06, y: ry + 0.06, w: 4.96, h: 0.32, fontSize: 8.5, color: C.text, fontFace: "Calibri", valign: "middle" });
    s.addText(owner, { x: 6.06, y: ry + 0.06, w: 3.6, h: 0.32, fontSize: 7.5, color: C.muted, fontFace: "Calibri", valign: "middle" });
  });

  const totalSP = stories2.reduce((a, [sp]) => a + sp, 0);
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 5.24, w: 9.25, h: 0.22, fill: { color: "059669" }, line: { color: "059669" } });
  s.addText(`Sprint 2 Total: ${totalSP} Story Points   |   Checkpoint: Auth + Directory Live in Staging   |   Sprint Review: EOD Wk 4 Demo`, {
    x: 0.6, y: 5.245, w: 9.1, h: 0.2, fontSize: 7.5, color: C.white, fontFace: "Calibri",
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 9 — SPRINT 3 (Weeks 5–6)
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  bg(s);

  sectionTag(s, "Sprint Planning");
  title(s, "Sprint 3 — Weeks 5–6: Core Customisation Part 2");
  divider(s, 1.08);

  s.addText("Goal: Prayer Requests, Video Library, admin APIs complete. Sign-off Gate 2 (MVP Core) at end of Week 6.", {
    x: 0.5, y: 1.14, w: 9, h: 0.26, fontSize: 10, color: C.muted, fontFace: "Calibri",
  });

  const stories3 = [
    [8, "Prayer Requests — submit, browse, pray, anonymous flag",         "Full Stack | JWT-auth .NET 8 API + real-time count"],
    [6, "Video Library — category feed + CloudFront presigned stream",    "Full Stack | S3 upload pipeline + CDN streaming <2s"],
    [5, ".NET 8 REST APIs for prayer + video modules",                    "Backend | EF Core 8, xUnit tested, OpenAPI documented"],
    [4, "Admin RBAC — role-based access on all .NET 8 endpoints",         "Backend | [Authorize(Roles)] + policy middleware"],
    [4, "Deep-link routing + bottom-nav polish (Ionic Router)",            "Mobile Dev | Universal links, gestures, transitions"],
    [4, "Performance audit + image lazy-loading optimisation",             "Mobile Dev + QA | Lighthouse + Capacitor perf profiling"],
    [3, "Weekly demo prep + stakeholder review",                           "PM | Demo recording + feedback log"],
    [3, "Gate 2 MVP Core sign-off session",                               "PM + Architect | Wk 6 formal review + sign-off form"],
  ];

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.46, w: 9.25, h: 0.3, fill: { color: "059669" }, line: { color: "059669" } });
  [["SP", 0.55], ["Story", 1.1], ["Owner / Notes", 6.1]].forEach(([h, x]) =>
    s.addText(h, { x, y: 1.5, w: 2, h: 0.22, fontSize: 8.5, bold: true, color: C.white, fontFace: "Calibri" })
  );

  stories3.forEach(([sp, story, owner], i) => {
    const ry = 1.78 + i * 0.44;
    s.addShape(pres.ShapeType.rect, { x: 0.5, y: ry, w: 9.25, h: 0.43, fill: { color: i % 2 === 0 ? C.white : C.bg }, line: { color: C.border, width: 0.4 } });
    badge(s, 0.55, ry + 0.1, 0.44, 0.22, `${sp}pt`, "059669");
    s.addText(story, { x: 1.06, y: ry + 0.06, w: 4.96, h: 0.32, fontSize: 8.5, color: C.text, fontFace: "Calibri", valign: "middle" });
    s.addText(owner, { x: 6.06, y: ry + 0.06, w: 3.6, h: 0.32, fontSize: 7.5, color: C.muted, fontFace: "Calibri", valign: "middle" });
  });

  const totalSP3 = stories3.reduce((a, [sp]) => a + sp, 0);
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 5.24, w: 9.25, h: 0.22, fill: { color: "059669" }, line: { color: "059669" } });
  s.addText(`Sprint 3 Total: ${totalSP3} Story Points   |   End Gate G2: MVP Core Sign-Off   |   Sprint Review: EOD Wk 6 Demo`, {
    x: 0.6, y: 5.245, w: 9.1, h: 0.2, fontSize: 7.5, color: C.white, fontFace: "Calibri",
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 9B — SPRINT 4 (Weeks 7–8)
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  bg(s);

  sectionTag(s, "Sprint Planning");
  title(s, "Sprint 4 — Weeks 7–8: Feature Completion");
  divider(s, 1.08);

  s.addText("Goal: Twilio Chat + VoIP, FCM push notifications, and all advanced features live in staging.", {
    x: 0.5, y: 1.14, w: 9, h: 0.26, fontSize: 10, color: C.muted, fontFace: "Calibri",
  });

  const stories4 = [
    [6, "Twilio Chat integration (1:1 messaging, read receipts)",        "Mobile+Backend | Twilio Conversations SDK + .NET 8"],
    [6, "Twilio VoIP integration (in-app calling, no phone sharing)",    "Mobile+Backend | Twilio Voice + Capacitor audio"],
    [4, "Firebase FCM push notifications (iOS + Android)",              "Mobile+DevOps | Topic targeting + delivery history log"],
    [5, "Group Chat / Forum threads (Ionic + SignalR WebSocket)",        "Full Stack | .NET 8 SignalR hub + Ionic real-time UI"],
    [4, "Event Calendar + RSVP module",                                 "Full Stack | .NET 8 + EF Core + Ionic calendar view"],
    [4, "Admin dashboard — user management, content moderation",        "Full Stack | RBAC admin panel, reporting views"],
    [3, "Performance audit — API p95 < 200ms target",                   "DevOps + QA | k6 load test 200 concurrent users"],
    [3, "Weekly demo prep + stakeholder review",                        "PM | Demo recording + feedback log"],
  ];

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.46, w: 9.25, h: 0.3, fill: { color: "D97706" }, line: { color: "D97706" } });
  [["SP", 0.55], ["Story", 1.1], ["Owner / Notes", 6.1]].forEach(([h, x]) =>
    s.addText(h, { x, y: 1.5, w: 2, h: 0.22, fontSize: 8.5, bold: true, color: C.white, fontFace: "Calibri" })
  );

  stories4.forEach(([sp, story, owner], i) => {
    const ry = 1.78 + i * 0.44;
    s.addShape(pres.ShapeType.rect, { x: 0.5, y: ry, w: 9.25, h: 0.43, fill: { color: i % 2 === 0 ? C.white : C.bg }, line: { color: C.border, width: 0.4 } });
    badge(s, 0.55, ry + 0.1, 0.44, 0.22, `${sp}pt`, "D97706");
    s.addText(story, { x: 1.06, y: ry + 0.06, w: 4.96, h: 0.32, fontSize: 8.5, color: C.text, fontFace: "Calibri", valign: "middle" });
    s.addText(owner, { x: 6.06, y: ry + 0.06, w: 3.6, h: 0.32, fontSize: 7.5, color: C.muted, fontFace: "Calibri", valign: "middle" });
  });

  const totalSP4 = stories4.reduce((a, [sp]) => a + sp, 0);
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 5.24, w: 9.25, h: 0.22, fill: { color: "D97706" }, line: { color: "D97706" } });
  s.addText(`Sprint 4 Total: ${totalSP4} Story Points   |   Checkpoint: All Features Feature-Complete in Staging   |   Sprint Review: EOD Wk 8 Demo`, {
    x: 0.6, y: 5.245, w: 9.1, h: 0.2, fontSize: 7.5, color: C.white, fontFace: "Calibri",
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 9C — SPRINT 5 (Weeks 9–10)
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  bg(s);

  sectionTag(s, "Sprint Planning");
  title(s, "Sprint 5 — Weeks 9–10: QA, UAT & Go-Live");
  divider(s, 1.08);

  s.addText("Goal: Full test suite complete, security passed, UAT signed off, apps live on App Store and Play Store. 🚀", {
    x: 0.5, y: 1.14, w: 9, h: 0.26, fontSize: 10, color: C.muted, fontFace: "Calibri",
  });

  const stories5 = [
    [4, "xUnit unit tests — 80%+ coverage on all .NET 8 services",       "Wk9 · QA | Mocked services, edge cases, all modules"],
    [4, "Testcontainers API integration tests — all endpoints",           "Wk9 · QA | Dockerised PostgreSQL test DB, +/- paths"],
    [4, "Playwright E2E — web flows (member, prayer, video, chat)",       "Wk9 · QA | Headed + headless CI runs, all journeys"],
    [4, "Appium E2E — iOS Simulator + Android Emulator",                 "Wk9 · QA | Login → member → pray → video → VoIP call"],
    [3, "OWASP security audit + penetration test",                       "Wk9 · Security | Mobile Top 10, JWT review, RDS audit"],
    [3, "Production infrastructure (RDS Multi-AZ, ECS Fargate, WAF)",   "Wk9 · DevOps | Prod deploy, CloudWatch alarms, scaling"],
    [3, "k6 load test — 500 concurrent users, p95 < 200ms",             "Wk10 · QA + DevOps | Full load test report"],
    [3, "UAT with ANM team (20 pilot members) + sign-off form",         "Wk10 · PM | Acceptance testing, issue triage, sign-off"],
    [3, "App Store + Play Store submission + metadata",                  "Wk10 · DevOps | Capacitor builds, screenshots, review"],
    [2, "Source code handover + deployment docs delivered",              "Wk10 · PM + Architect | Repo access, runbooks, wiki"],
  ];

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.46, w: 9.25, h: 0.3, fill: { color: "7C3AED" }, line: { color: "7C3AED" } });
  [["SP", 0.55], ["Story", 1.1], ["Owner / Notes", 6.1]].forEach(([h, x]) =>
    s.addText(h, { x, y: 1.5, w: 2, h: 0.22, fontSize: 8.5, bold: true, color: C.white, fontFace: "Calibri" })
  );

  stories5.forEach(([sp, story, owner], i) => {
    const ry = 1.78 + i * 0.3;
    s.addShape(pres.ShapeType.rect, { x: 0.5, y: ry, w: 9.25, h: 0.29, fill: { color: i % 2 === 0 ? C.white : C.bg }, line: { color: C.border, width: 0.4 } });
    badge(s, 0.55, ry + 0.06, 0.44, 0.18, `${sp}pt`, "7C3AED");
    s.addText(story, { x: 1.06, y: ry + 0.04, w: 4.96, h: 0.22, fontSize: 8, color: C.text, fontFace: "Calibri", valign: "middle" });
    s.addText(owner, { x: 6.06, y: ry + 0.04, w: 3.6, h: 0.22, fontSize: 7, color: C.muted, fontFace: "Calibri", valign: "middle" });
  });

  const totalSP5 = stories5.reduce((a, [sp]) => a + sp, 0);
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 5.24, w: 9.25, h: 0.22, fill: { color: "7C3AED" }, line: { color: "7C3AED" } });
  s.addText(`Sprint 5 Total: ${totalSP5} Story Points   |   End Gate G3: UAT & Go-Live Sign-Off   |   🚀 App Store + Play Store Live — Week 10`, {
    x: 0.6, y: 5.245, w: 9.1, h: 0.2, fontSize: 7.5, color: C.white, fontFace: "Calibri",
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 10 — TEAM & RACI
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  bg(s);

  sectionTag(s, "Team Structure");
  title(s, "Team Structure & RACI");
  divider(s, 1.08);

  const roles = ["PM", "ARC", "DES", "MOB ×2", "BAK", "DEV", "QA", "SEC"];
  const raciRows = [
    ["Discovery & Stakeholder Workshops",  "A", "R", "C", "I", "I", "I", "I", "I"],
    ["DB Schema + API Contract",           "A", "R", "I", "C", "R", "C", "C", "C"],
    ["Figma UI/UX Design",                 "A", "C", "R", "C", "I", "I", "I", "I"],
    ["CI/CD + AWS Infrastructure",         "A", "I", "I", "I", "C", "R", "C", "I"],
    ["React + Ionic Mobile Development",   "A", "C", "C", "R", "I", "I", "I", "I"],
    ["ASP.NET Core .NET 8 Backend APIs",   "A", "C", "I", "I", "R", "C", "C", "C"],
    ["xUnit + Playwright + Appium QA",     "A", "C", "I", "C", "C", "I", "R", "C"],
    ["OWASP Security Audit",              "A", "C", "I", "I", "I", "I", "C", "R"],
    ["App Store / Play Store Submission",  "A", "I", "I", "R", "I", "C", "C", "I"],
    ["Hypercare & Handover",              "R", "C", "I", "C", "C", "C", "C", "I"],
  ];

  const rw = 3.3, cw2 = 0.74, startX = 0.5;
  s.addShape(pres.ShapeType.rect, { x: startX, y: 1.18, w: rw, h: 0.3, fill: { color: C.navy }, line: { color: C.navy } });
  s.addText("Activity", { x: startX + 0.05, y: 1.21, w: rw - 0.1, h: 0.24, fontSize: 8.5, bold: true, color: C.white, fontFace: "Calibri" });
  roles.forEach((r, i) => {
    const rx = startX + rw + i * cw2;
    s.addShape(pres.ShapeType.rect, { x: rx, y: 1.18, w: cw2 - 0.02, h: 0.3, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(r, { x: rx, y: 1.21, w: cw2 - 0.02, h: 0.24, fontSize: 7.5, bold: true, color: C.white, align: "center", fontFace: "Calibri" });
  });

  const raciColor = { R: C.success, A: C.warn, C: "3B82F6", I: C.muted };
  raciRows.forEach(([activity, ...raci], i) => {
    const ry = 1.5 + i * 0.38;
    s.addShape(pres.ShapeType.rect, { x: startX, y: ry, w: rw, h: 0.37, fill: { color: i % 2 === 0 ? C.white : C.bg }, line: { color: C.border, width: 0.4 } });
    s.addText(activity, { x: startX + 0.05, y: ry + 0.05, w: rw - 0.1, h: 0.28, fontSize: 8, color: C.text, fontFace: "Calibri", valign: "middle" });
    raci.forEach((val, j) => {
      const rx = startX + rw + j * cw2;
      s.addShape(pres.ShapeType.rect, { x: rx, y: ry, w: cw2 - 0.02, h: 0.37, fill: { color: i % 2 === 0 ? C.white : C.bg }, line: { color: C.border, width: 0.3 } });
      const textColor = raciColor[val] || C.muted;
      s.addText(val, { x: rx, y: ry + 0.05, w: cw2 - 0.02, h: 0.28, fontSize: 9, bold: val === "R" || val === "A", color: textColor, align: "center", fontFace: "Calibri" });
    });
  });

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 5.27, w: 9.25, h: 0.2, fill: { color: "F1F5F9" }, line: { color: C.border } });
  s.addText("R = Responsible   A = Accountable   C = Consulted   I = Informed", {
    x: 0.6, y: 5.28, w: 5, h: 0.18, fontSize: 7.5, color: C.muted, fontFace: "Calibri",
  });
  s.addText("MOB=Mobile Dev  BAK=Backend Dev  DEV=DevOps  ARC=Architect  DES=Designer  SEC=Security", {
    x: 5.2, y: 5.28, w: 4.5, h: 0.18, fontSize: 7, color: C.muted, align: "right", fontFace: "Calibri",
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 11 — QA STRATEGY
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  bg(s);

  sectionTag(s, "Quality Assurance");
  title(s, "QA & Testing Strategy");
  divider(s, 1.08);

  const qaLayers = [
    {
      tier: "Unit Tests", tool: "xUnit (.NET 8)", who: "Backend Dev + QA", when: "Every PR",
      color: "2563EB", bg2: C.blue100,
      detail: "All ASP.NET Core service-layer business logic tested in isolation. Mocked dependencies via NSubstitute. 80%+ line coverage enforced in CI gate.",
    },
    {
      tier: "Integration Tests", tool: "xUnit + Testcontainers", who: "QA", when: "Wk 6",
      color: "059669", bg2: "F0FDF4",
      detail: "All 14 REST API endpoints tested against a real Dockerised PostgreSQL database. Positive + negative paths. Auth header validation. Response schema verified.",
    },
    {
      tier: "E2E — Web", tool: "Playwright", who: "QA", when: "Wk 6",
      color: "D97706", bg2: C.amber100,
      detail: "Full user journeys in Chromium/Firefox/WebKit: login → member search → prayer request → video play. Runs headed in dev, headless in CI.",
    },
    {
      tier: "E2E — Mobile", tool: "Appium", who: "QA", when: "Wk 6",
      color: "7C3AED", bg2: C.purple100,
      detail: "iOS Simulator (iPhone 15 Pro) + Android Emulator (Pixel 7). Flows: login, member directory, prayer, video stream, Twilio call. Real Capacitor native APIs tested.",
    },
    {
      tier: "Performance", tool: "k6", who: "DevOps + QA", when: "Wk 6",
      color: "DC2626", bg2: "FEE2E2",
      detail: "500 concurrent users. API response p95 < 200ms target. Video CloudFront initial load < 2s. RDS connection pool saturation tested at 1,000 VUs.",
    },
    {
      tier: "Security", tool: "OWASP + Pentest", who: "Security Consultant", when: "Wk 6",
      color: "374151", bg2: "F9FAFB",
      detail: "OWASP Mobile Top 10 audit. JWT expiry + rotation verified. SQL injection impossible (EF Core parameterised queries). S3 bucket policies audited. Penetration test report delivered.",
    },
  ];

  qaLayers.forEach(({ tier, tool, who, when, color, bg2, detail }, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.5 + col * 4.72, y = 1.22 + row * 1.36;
    card(s, x, y, 4.55, 1.28, bg2, color);
    s.addShape(pres.ShapeType.rect, { x, y, w: 0.06, h: 1.28, fill: { color }, line: { color } });
    s.addText(tier, { x: x + 0.18, y: y + 0.06, w: 2.5, h: 0.26, fontSize: 11, bold: true, color, fontFace: "Calibri" });
    badge(s, x + 3.36, y + 0.06, 1.1, 0.22, tool, color);
    s.addText(`👤 ${who}  ·  📅 ${when}`, { x: x + 0.18, y: y + 0.34, w: 4.25, h: 0.2, fontSize: 7.5, color: C.muted, fontFace: "Calibri" });
    s.addText(detail, { x: x + 0.18, y: y + 0.56, w: 4.25, h: 0.66, fontSize: 8, color: C.text, fontFace: "Calibri", valign: "top" });
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 12 — INFRASTRUCTURE & PRE-LAUNCH CHECKLIST
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  bg(s);

  sectionTag(s, "Go-Live Readiness");
  title(s, "Infrastructure & Pre-Launch Checklist");
  divider(s, 1.08);

  const infra = [
    "AWS RDS PostgreSQL 16 Multi-AZ cluster provisioned in prod region",
    "RDS security group: ECS task CIDR only (no public endpoint)",
    "ECS Fargate task definition: .NET 8 container, 2 vCPU / 4GB RAM",
    "Auto-scaling policy: target CPU 70%, min 1 task, max 10 tasks",
    "CloudWatch alarms: CPU >80%, error rate >1%, p99 latency >500ms",
    "AWS S3 bucket — private + CloudFront distribution with signed URLs",
    "SSL certificate (ACM) + custom domain configured on ALB",
    "GitHub Actions CI/CD pipeline: PR → build → test → ECS deploy",
    "Firebase Auth production project — production app credentials",
    "Twilio production account — voice + SMS phone numbers activated",
    "Firebase FCM production credentials + iOS APNs certificate",
    "ECS task IAM role: S3 read/write, SSM Parameter Store, CloudWatch",
    "AWS WAF rules on ALB — rate limiting 1,000 req/min per IP",
    "Secrets in AWS SSM Parameter Store (no env vars in code)",
  ];

  const launch = [
    "✅ All 14 REST API endpoints return expected responses",
    "✅ Playwright E2E suite passes in headless CI (100% pass rate)",
    "✅ Appium E2E passes on iOS Simulator + Android Emulator",
    "✅ Video streaming: first frame < 2s via CloudFront CDN",
    "✅ Push notification delivered in < 5s on physical device",
    "✅ Twilio VoIP call connects in < 3s (staging → prod)",
    "✅ JWT token expiry + refresh flow verified",
    "✅ PostgreSQL RDS failover tested (Multi-AZ switchover)",
    "✅ OWASP Mobile Top 10 — zero critical findings",
    "✅ Privacy policy + terms accepted at onboarding",
    "✅ App Store screenshots + metadata approved",
    "✅ Play Store listing + content rating submitted",
    "✅ ANM UAT participants — acceptance form signed",
    "✅ DNS/domain records propagated globally",
    "✅ Rollback procedure documented and tested",
    "✅ Admin team trained on backend portal",
    "✅ Source code + deploy docs delivered to ANM",
  ];

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.17, w: 4.55, h: 0.28, fill: { color: C.navy }, line: { color: C.navy } });
  s.addText("⚙️  Infrastructure Setup (Week 9)", { x: 0.52, y: 1.19, w: 4.51, h: 0.24, fontSize: 9, bold: true, color: C.white, fontFace: "Calibri" });

  infra.forEach((item, i) => {
    const ry = 1.47 + i * 0.26;
    s.addShape(pres.ShapeType.rect, { x: 0.5, y: ry, w: 4.55, h: 0.26, fill: { color: i % 2 === 0 ? C.white : C.bg }, line: { color: C.border, width: 0.4 } });
    s.addText(`◦  ${item}`, { x: 0.56, y: ry + 0.04, w: 4.42, h: 0.2, fontSize: 7.5, color: C.text, fontFace: "Calibri" });
  });

  s.addShape(pres.ShapeType.rect, { x: 5.2, y: 1.17, w: 4.55, h: 0.28, fill: { color: C.success }, line: { color: C.success } });
  s.addText("✅  Pre-Launch Checklist (35+ items)", { x: 5.22, y: 1.19, w: 4.51, h: 0.24, fontSize: 9, bold: true, color: C.white, fontFace: "Calibri" });

  launch.forEach((item, i) => {
    const ry = 1.47 + i * 0.228;
    s.addShape(pres.ShapeType.rect, { x: 5.2, y: ry, w: 4.55, h: 0.228, fill: { color: i % 2 === 0 ? C.white : "F0FDF4" }, line: { color: C.border, width: 0.3 } });
    s.addText(item, { x: 5.26, y: ry + 0.03, w: 4.42, h: 0.18, fontSize: 7, color: C.text, fontFace: "Calibri" });
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 13 — COMMUNICATION PLAN
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  bg(s);

  sectionTag(s, "Communication");
  title(s, "Communication & Reporting Plan");
  divider(s, 1.08);

  const comms = [
    { freq: "Daily", channel: "Slack / Teams", audience: "Dev Team", type: "Standup",
      detail: "15-min async standup: yesterday / today / blockers. PM reviews blockers and escalates within 2 hours." },
    { freq: "Weekly", channel: "Video Call + Deck", audience: "ANM Stakeholders", type: "Demo + Update",
      detail: "30-min live demo of features built that week. Risk update. Next week preview. Recorded and shared." },
    { freq: "End of Sprint", channel: "Video Call", audience: "ANM Leadership", type: "Sign-Off Review",
      detail: "Formal walkthrough of deliverables vs sprint goal. Sign-off form issued. Decisions documented." },
    { freq: "Ad-Hoc", channel: "WhatsApp / Email", audience: "PM ↔ ANM Lead", type: "Escalations",
      detail: "Critical blockers, scope change requests, and timeline impacts communicated within 1 hour of discovery." },
  ];

  comms.forEach(({ freq, channel, audience, type, detail }, i) => {
    const y = 1.22 + i * 1.02;
    card(s, 0.5, y, 9.25, 0.94, C.white);
    s.addShape(pres.ShapeType.rect, { x: 0.5, y, w: 1.2, h: 0.94, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(freq, { x: 0.5, y: y + 0.16, w: 1.2, h: 0.3, fontSize: 14, bold: true, color: C.gold, align: "center", fontFace: "Calibri" });
    s.addText(type, { x: 0.5, y: y + 0.52, w: 1.2, h: 0.22, fontSize: 7.5, color: "FFFFFFAA", align: "center", fontFace: "Calibri" });
    s.addText(channel, { x: 1.8, y: y + 0.06, w: 2.4, h: 0.26, fontSize: 9.5, bold: true, color: C.navy, fontFace: "Calibri" });
    badge(s, 1.8, y + 0.34, 1.6, 0.2, `👥 ${audience}`, C.navyLight);
    s.addText(detail, { x: 4.3, y: y + 0.12, w: 5.3, h: 0.7, fontSize: 9, color: C.muted, fontFace: "Calibri", valign: "middle" });
    s.addShape(pres.ShapeType.line, { x: 4.2, y: y + 0.14, w: 0, h: 0.66, line: { color: C.border, width: 1 } });
  });

  s.addShape(pres.ShapeType.rect, { x: 0.5, y: 5.28, w: 9.25, h: 0.2, fill: { color: "F1F5F9" }, line: { color: C.border } });
  s.addText("📝  All decisions and scope changes require written confirmation. No verbal approvals accepted for scope or timeline changes.", {
    x: 0.6, y: 5.285, w: 9.1, h: 0.18, fontSize: 7.5, color: C.muted, fontFace: "Calibri",
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 14 — CHANGE MANAGEMENT
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  bg(s);

  sectionTag(s, "Change Management");
  title(s, "Change Request & Scope Management");
  divider(s, 1.08);

  s.addText("Scope changes after Week 2 sign-off require a formal Change Request. This protects both ANM and the delivery team from scope creep.", {
    x: 0.5, y: 1.15, w: 9, h: 0.26, fontSize: 10, color: C.muted, fontFace: "Calibri",
  });

  const steps = [
    { num: "01", title: "Request Raised", who: "ANM Lead", detail: "ANM raises request via email or Slack to PM with description of change and business justification." },
    { num: "02", title: "Impact Analysis", who: "PM + Architect", detail: "PM and Architect assess timeline impact, cost delta, and technical effort within 48 hours." },
    { num: "03", title: "CR Document", who: "PM", detail: "PM issues formal CR document: change description, effort, cost impact, revised timeline." },
    { num: "04", title: "ANM Approval", who: "ANM Lead", detail: "ANM Lead signs CR document. No work begins until written approval is received." },
    { num: "05", title: "Sprint Backlog Update", who: "PM + Team", detail: "CR is added to next sprint or Phase 2 backlog. Timeline adjusted accordingly." },
  ];

  steps.forEach(({ num, title: t, who, detail }, i) => {
    const x = 0.42 + i * 1.88;
    card(s, x, 1.5, 1.78, 2.8, i % 2 === 0 ? C.blue100 : C.white);
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.54, y: 1.54, w: 0.7, h: 0.7, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(num, { x: x + 0.54, y: 1.55, w: 0.7, h: 0.68, fontSize: 18, bold: true, color: C.gold, align: "center", valign: "middle", fontFace: "Calibri" });
    s.addText(t, { x: x + 0.08, y: 2.32, w: 1.62, h: 0.36, fontSize: 10, bold: true, color: C.navy, align: "center", fontFace: "Calibri" });
    badge(s, x + 0.14, 1.5 + 2.76, 1.5, 0.22, `👤 ${who}`, C.navyLight);
    s.addText(detail, { x: x + 0.1, y: 1.5 + 3.06, w: 1.58, h: 1.1, fontSize: 7.5, color: C.muted, fontFace: "Calibri", valign: "top" });
    if (i < 4) s.addText("→", { x: x + 1.78, y: 1.82, w: 0.1, h: 0.36, fontSize: 14, color: C.gold, align: "center", fontFace: "Calibri" });
  });

  const policies = [
    ["🔒", "Locked Scope", "Weeks 1–10 scope is locked after Gate 1 sign-off. New requests go to Phase 2."],
    ["⏱️", "48h Response", "All CRs acknowledged within 48 hours with preliminary impact statement."],
    ["📋", "Backlog First", "All non-critical CRs added to Phase 2 backlog to preserve 10-week commitment."],
  ];
  policies.forEach(([icon, title2, body], i) => {
    const x = 0.5 + i * 3.08, y2 = 4.55;
    s.addShape(pres.ShapeType.rect, { x, y: y2, w: 2.9, h: 0.72, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(`${icon}  ${title2}`, { x: x + 0.1, y: y2 + 0.06, w: 2.7, h: 0.26, fontSize: 9, bold: true, color: C.gold, fontFace: "Calibri" });
    s.addText(body, { x: x + 0.1, y: y2 + 0.32, w: 2.7, h: 0.34, fontSize: 7.5, color: "FFFFFFCC", fontFace: "Calibri" });
  });
}

// ════════════════════════════════════════════════════════
// SLIDE 15 — CLOSING / CTA
// ════════════════════════════════════════════════════════
{
  let s = pres.addSlide();
  darkBg(s);

  s.addShape(pres.ShapeType.ellipse, { x: 7.5, y: -0.8, w: 3.5, h: 3.5, fill: { color: C.navyLight, transparency: 65 }, line: { color: C.navyLight, transparency: 65 } });
  s.addShape(pres.ShapeType.ellipse, { x: -0.8, y: 3.5, w: 3, h: 3, fill: { color: C.navyLight, transparency: 70 }, line: { color: C.navyLight, transparency: 70 } });

  s.addText("10 Weeks. Framework-Accelerated. Yours.", {
    x: 0.8, y: 0.7, w: 8.4, h: 0.7, fontSize: 34, bold: true, color: C.white, align: "center", fontFace: "Calibri",
  });
  s.addText("Built on Proprietary .NET 8 + PostgreSQL + Ionic/Capacitor Framework", {
    x: 1.2, y: 1.4, w: 7.6, h: 0.4, fontSize: 14, color: C.gold, align: "center", fontFace: "Calibri",
  });

  s.addShape(pres.ShapeType.rect, { x: 3.8, y: 1.92, w: 2.4, h: 0.06, fill: { color: C.gold }, line: { color: C.gold } });

  s.addText("This plan represents our commitment to deliver ANM's community platform with precision, transparency, and zero scope surprises. Every milestone is tracked, every gate is signed off, and every line of code belongs to ANM on day one.", {
    x: 1.0, y: 2.08, w: 8.0, h: 0.7, fontSize: 10.5, color: "FFFFFFAA", align: "center", fontFace: "Calibri",
  });

  const highlights = [
    ["20",   "Milestones Tracked"],
    ["130+", "Story Points Planned"],
    ["35+",  "Go-Live Checklist Items"],
    ["10 Wks","To App Store Launch"],
  ];
  highlights.forEach(([val, lbl], i) => {
    const x = 0.62 + i * 2.22;
    s.addShape(pres.ShapeType.rect, { x, y: 2.92, w: 2.08, h: 0.92, fill: { color: "FFFFFF0A" }, line: { color: "FFFFFF20", width: 1 } });
    s.addText(val, { x, y: 2.98, w: 2.08, h: 0.44, fontSize: 28, bold: true, color: C.gold, align: "center", fontFace: "Calibri" });
    s.addText(lbl, { x, y: 3.44, w: 2.08, h: 0.3, fontSize: 8.5, color: "FFFFFFBB", align: "center", fontFace: "Calibri" });
  });

  const actions = [
    { icon: "📅", label: "Schedule Discovery Call", sub: "30 mins with ANM leadership" },
    { icon: "✍️", label: "Sign & Kickoff", sub: "30% deposit starts Week 1" },
    { icon: "💬", label: "Ask Any Question", sub: "hello@yourstudio.com" },
  ];
  actions.forEach(({ icon, label, sub }, i) => {
    const x = 0.62 + i * 2.98;
    s.addShape(pres.ShapeType.rect, { x, y: 4.08, w: 2.75, h: 0.9, fill: { color: i === 0 ? C.gold : "FFFFFF14" }, line: { color: i === 0 ? C.gold : "FFFFFF40", width: 1 } });
    s.addText(`${icon}  ${label}`, { x, y: 4.14, w: 2.75, h: 0.32, fontSize: 9, bold: true, color: i === 0 ? C.navy : C.white, align: "center", fontFace: "Calibri" });
    s.addText(sub, { x, y: 4.48, w: 2.75, h: 0.24, fontSize: 8, color: i === 0 ? "3A2800" : "FFFFFFAA", align: "center", fontFace: "Calibri" });
  });

  s.addShape(pres.ShapeType.rect, { x: 0, y: 5.45, w: 10, h: 0.175, fill: { color: C.gold } });
  s.addText("ANM Community App — Milestone & Implementation Plan · Powered by Proprietary .NET 8 Framework · Confidential", {
    x: 0, y: 5.46, w: 10, h: 0.14, fontSize: 7, color: C.navy, align: "center", fontFace: "Calibri",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// WRITE FILE
// ─────────────────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: "ANM_Milestone_Implementation_Plan.pptx" })
  .then(() => console.log("✅  ANM_Milestone_Implementation_Plan.pptx generated successfully!"))
  .catch(err => console.error("❌  Error:", err));
