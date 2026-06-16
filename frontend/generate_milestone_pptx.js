/**
 * ANM Community App — Milestone & Implementation Plan Deck
 * ─────────────────────────────────────────────────────────
 * Run:
 *   npm install pptxgenjs     (skip if already installed)
 *   node generate_milestone_pptx.js
 *
 * Output: ANM_Milestone_Implementation_Plan.pptx
 */

import pptxgen from "pptxgenjs";

// ── Palette ──────────────────────────────────────────────
const C = {
  navy:     "1B2F6E",
  navyDk:   "0F1E4A",
  navyLt:   "243D8C",
  gold:     "F0A500",
  white:    "FFFFFF",
  bg:       "F8F9FC",
  border:   "E2E8F0",
  text:     "1A1A2E",
  muted:    "64748B",
  success:  "10B981",
  warn:     "F59E0B",
  danger:   "EF4444",
  info:     "3B82F6",
  blue100:  "EFF6FF",
  green100: "F0FDF4",
  amber100: "FFFBEB",
  purple100:"F5F3FF",
  red100:   "FFF1F2",
};

// ── Helpers ───────────────────────────────────────────────
const shadow = () => ({ type:"outer", blur:6, offset:2, angle:135, color:"000000", opacity:0.08 });

function tag(s, label, y = 0.28) {
  s.addText(label.toUpperCase(), { x:0.5, y, w:9, h:0.2, fontSize:8, bold:true, color:C.gold, charSpacing:3, fontFace:"Calibri" });
}
function title(s, text, y = 0.5) {
  s.addText(text, { x:0.5, y, w:9, h:0.52, fontSize:28, bold:true, color:C.navy, fontFace:"Calibri" });
}
function divider(s, y = 1.06) {
  s.addShape(pres.ShapeType.line, { x:0.5, y, w:9, h:0, line:{ color:C.gold, width:1.5 } });
}
function footerBar(s, text = "ANM Community App  ·  Delivery Milestone & Implementation Plan  ·  v1.0  ·  Confidential") {
  s.addShape(pres.ShapeType.rect, { x:0, y:5.45, w:10, h:0.175, fill:{ color:C.gold }, line:{ color:C.gold } });
  s.addText(text, { x:0, y:5.455, w:10, h:0.155, fontSize:6.5, color:C.navy, align:"center", fontFace:"Calibri" });
}
function statusBadge(s, x, y, label, bg, tc) {
  s.addShape(pres.ShapeType.roundRect, { x, y, w:0.9, h:0.2, fill:{ color:bg }, line:{ color:bg }, rectRadius:0.07 });
  s.addText(label, { x, y:y+0.01, w:0.9, h:0.19, fontSize:7, bold:true, color:tc, align:"center", valign:"middle", fontFace:"Calibri" });
}

// ── Presentation ──────────────────────────────────────────
let pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title  = "ANM – Delivery Milestone & Implementation Plan";
pres.author = "Solution Development Team";

// ════════════════════════════════════════════════
// SLIDE 1 — COVER
// ════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.navy };

  s.addShape(pres.ShapeType.ellipse, { x:7.6, y:-1.1, w:3.8, h:3.8, fill:{ color:C.navyLt, transparency:72 }, line:{ color:C.navyLt, transparency:72 } });
  s.addShape(pres.ShapeType.ellipse, { x:-0.9, y:3.4, w:3.2, h:3.2, fill:{ color:C.navyLt, transparency:76 }, line:{ color:C.navyLt, transparency:76 } });

  // Badge
  s.addShape(pres.ShapeType.roundRect, { x:3.4, y:0.5, w:3.2, h:0.3, fill:{ color:"2C4499" }, line:{ color:C.gold, width:1 }, rectRadius:0.15 });
  s.addText("PROJECT PLANNING DOCUMENT · v1.0", { x:3.4, y:0.5, w:3.2, h:0.3, fontSize:7.5, color:C.gold, align:"center", valign:"middle", bold:true, charSpacing:1.5, fontFace:"Calibri" });

  s.addText("Delivery Milestone &", { x:0.8, y:0.95, w:8.4, h:0.65, fontSize:40, bold:true, color:C.white, align:"center", fontFace:"Calibri" });
  s.addText("Implementation Plan", { x:0.8, y:1.58, w:8.4, h:0.65, fontSize:40, bold:true, color:C.gold, align:"center", fontFace:"Calibri" });

  s.addShape(pres.ShapeType.rect, { x:4.3, y:2.36, w:1.4, h:0.05, fill:{ color:C.gold }, line:{ color:C.gold } });

  s.addText("ANM Community Mobile App — End-to-End Execution Roadmap\nSprints · Milestones · RACI · Dependencies · Go-Live Checklists", {
    x:1.0, y:2.5, w:8.0, h:0.72, fontSize:11, color:"FFFFFFAA", align:"center", fontFace:"Calibri",
  });

  const meta = [["Project","ANM Community App"],["Duration","8–10 Weeks (MVP)"],["Methodology","Agile / 2-Week Sprints"],["Version","v1.0 — Draft"]];
  meta.forEach(([lbl, val], i) => {
    const x = 0.6 + i * 2.22;
    s.addShape(pres.ShapeType.rect, { x, y:3.5, w:2.05, h:0.72, fill:{ color:"FFFFFF", transparency:90 }, line:{ color:"FFFFFF", transparency:80 } });
    s.addText(lbl.toUpperCase(), { x, y:3.54, w:2.05, h:0.2, fontSize:6.5, color:"FFFFFF88", align:"center", bold:true, charSpacing:1, fontFace:"Calibri" });
    s.addText(val,               { x, y:3.76, w:2.05, h:0.28, fontSize:9,   color:C.white, align:"center", bold:true, fontFace:"Calibri" });
  });

  s.addShape(pres.ShapeType.rect, { x:0, y:5.45, w:10, h:0.175, fill:{ color:C.gold }, line:{ color:C.gold } });
  s.addText("Confidential | ANM Community App", { x:0, y:5.455, w:10, h:0.155, fontSize:6.5, color:C.navy, align:"center", fontFace:"Calibri" });
}

// ════════════════════════════════════════════════
// SLIDE 2 — SUMMARY KPIs
// ════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };
  tag(s, "Overview");
  title(s, "Plan at a Glance");
  divider(s);

  const kpis = [
    ["5",    "Delivery Phases",   "Discovery → Support"],
    ["18",   "Key Milestones",    "4 Formal Sign-off Gates"],
    ["5",    "Agile Sprints",     "2 Weeks Each"],
    ["132",  "Story Points",      "Across All Sprints"],
    ["9",    "Weeks to Go-Live",  "App Store + Play Store"],
    ["40+",  "Checklist Items",   "Pre-launch Verification"],
  ];
  kpis.forEach(([val, lbl, sub], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.5 + col * 3.08, y = 1.2 + row * 2.0;
    s.addShape(pres.ShapeType.rect, { x, y, w:2.9, h:1.82, fill:{ color:C.white }, line:{ color:C.border, width:1 }, shadow:shadow() });
    s.addShape(pres.ShapeType.rect, { x, y, w:2.9, h:0.06, fill:{ color:C.gold }, line:{ color:C.gold } });
    s.addText(val,  { x, y:y+0.28, w:2.9, h:0.72, fontSize:48, bold:true, color:C.navy, align:"center", fontFace:"Calibri" });
    s.addText(lbl,  { x, y:y+1.02, w:2.9, h:0.28, fontSize:11, bold:true, color:C.navy, align:"center", fontFace:"Calibri" });
    s.addText(sub,  { x, y:y+1.32, w:2.9, h:0.22, fontSize:9,  color:C.success, align:"center", fontFace:"Calibri" });
  });
  footerBar(s);
}

// ════════════════════════════════════════════════
// SLIDE 3 — GANTT CHART
// ════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };
  tag(s, "Part One — Delivery Milestone Plan");
  title(s, "Project Gantt — 10-Week Overview");
  divider(s);

  const LEFT = 2.1, TOP = 1.15, ROW = 0.3, FULL = 7.65;

  // Week header labels
  for (let w = 0; w < 10; w++) {
    const wx = LEFT + w * (FULL / 10);
    const ww = FULL / 10;
    s.addShape(pres.ShapeType.rect, { x:wx, y:TOP, w:ww, h:0.28, fill:{ color:w<2?"243D8C":C.bg }, line:{ color:C.border, width:0.5 } });
    s.addText(`Wk ${w+1}`, { x:wx, y:TOP, w:ww, h:0.28, fontSize:8, bold:true, color:w<2?C.white:C.muted, align:"center", valign:"middle", fontFace:"Calibri" });
  }

  // Col label
  s.addShape(pres.ShapeType.rect, { x:0.45, y:TOP, w:LEFT-0.45, h:0.28, fill:{ color:C.navy }, line:{ color:C.navy } });
  s.addText("DELIVERABLE", { x:0.45, y:TOP, w:LEFT-0.45, h:0.28, fontSize:7, bold:true, color:"FFFFFF88", valign:"middle", fontFace:"Calibri" });

  // rows: [label, barStartFraction, barWidthFraction, color, isPhaseHeader]
  const rows = [
    ["📐 PHASE 1 — DISCOVERY",   0, 0.2,  "3B82F6", true],
    ["  Stakeholder Workshops",  0, 0.1,  "60A5FA", false],
    ["  Wireframes & Design",    0, 0.2,  "60A5FA", false],
    ["  DB Schema & API Contract",0.1,0.1,"60A5FA", false],
    ["  CI/CD & Env Setup",      0.1,0.1, "60A5FA", false],
    ["⚙️ PHASE 2 — DEVELOPMENT", 0.2,0.4, "10B981", true],
    ["  Auth + Onboarding",      0.2,0.1, "34D399", false],
    ["  Member Directory+Detail",0.2,0.2, "34D399", false],
    ["  Prayer Requests+History",0.3,0.2, "34D399", false],
    ["  Video Library+Streaming",0.4,0.1, "34D399", false],
    ["  Messaging & VoIP",       0.4,0.2, "34D399", false],
    ["🧪 PHASE 3 — QA",          0.6,0.2, "F59E0B", true],
    ["  Unit+Integration Tests", 0.6,0.1, "FCD34D", false],
    ["  E2E & Perf Testing",     0.65,0.1,"FCD34D", false],
    ["  UAT with ANM Team",      0.7,0.1, "FCD34D", false],
    ["🚀 PHASE 4 — DEPLOY",      0.8,0.1, "8B5CF6", true],
    ["  Store Submissions",      0.8,0.1, "A78BFA", false],
    ["  Backend Prod Deploy",    0.8,0.1, "A78BFA", false],
    ["🔄 PHASE 5 — SUPPORT",     0.9,0.1, "EF4444", true],
    ["  Hypercare+Monitoring",   0.9,0.1, "F87171", false],
  ];

  rows.forEach(([lbl, start, width, color, isPhase], i) => {
    const y = TOP + 0.28 + i * ROW;
    const bg = isPhase ? (color+"22") : (i%2===0 ? C.white : C.bg);
    s.addShape(pres.ShapeType.rect, { x:0.45, y, w:LEFT-0.45, h:ROW, fill:{ color:bg }, line:{ color:C.border, width:0.5 } });
    s.addText(lbl, { x:0.5, y, w:LEFT-0.55, h:ROW, fontSize:isPhase?8:7.5, bold:isPhase, color:isPhase?C.navy:C.muted, valign:"middle", fontFace:"Calibri" });

    s.addShape(pres.ShapeType.rect, { x:LEFT, y, w:FULL, h:ROW, fill:{ color:bg }, line:{ color:C.border, width:0.5 } });
    if (width > 0) {
      const bx = LEFT + start * FULL;
      const bw = width * FULL;
      s.addShape(pres.ShapeType.rect, { x:bx+0.02, y:y+0.04, w:bw-0.04, h:ROW-0.08, fill:{ color }, line:{ color } });
    }
  });

  footerBar(s);
}

// ════════════════════════════════════════════════
// SLIDE 4 — MILESTONE REGISTER (Part 1: M1–M9)
// ════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };
  tag(s, "Part One — Delivery Milestone Plan");
  title(s, "Milestone Register (1 of 2) — M1 to M9");
  divider(s);

  // Header
  s.addShape(pres.ShapeType.rect, { x:0.45, y:1.14, w:9.3, h:0.3, fill:{ color:C.navy }, line:{ color:C.navy } });
  const hcols = [["#",0.48,0.28],["Milestone",0.82,2.1],["Week",2.98,0.75],["Owner",3.78,1.55],["Type",5.38,0.92],["Success Criteria",6.36,3.35]];
  hcols.forEach(([h,x,w]) => s.addText(h, { x, y:1.16, w, h:0.26, fontSize:8.5, bold:true, color:C.white, fontFace:"Calibri" }));

  const milestones = [
    [1,"Project Kickoff","Wk 1 Day 1","PM","Gate","All stakeholders aligned on scope, timeline & comms cadence"],
    [2,"Requirements Sign-Off","Wk 1 Day 3","PM + ANM PO","Sign-off","ANM PO formally approves feature list & out-of-scope items"],
    [3,"Wireframes Delivered","Wk 1 End","UI/UX Designer","Planned","All 5 screens covered; navigation flow approved by ANM team"],
    [4,"Design System Approved","Wk 2 Mid","UI/UX Designer","Planned","Typography, colours, spacing & components locked for dev handoff"],
    [5,"Architecture Sign-Off","Wk 2 End","Architect + PM","Sign-off","DB schema, API contract & infra reviewed & approved"],
    [6,"Dev Environments Live","Wk 2 End","DevOps","Planned","CI/CD pipeline runs; all 3 environments accessible; Atlas provisioned"],
    [7,"Auth + Onboarding Live","Wk 3 End","Mobile Dev","Planned","Users can register, verify OTP & log in on iOS & Android"],
    [8,"Mid-Sprint Demo #1","Wk 4 End","PM + Dev Team","Demo","ANM team sees Members Directory, Detail & History on device"],
    [9,"Prayer Requests Complete","Wk 5 Mid","Backend + Mobile","Planned","Submit (incl. anonymous), browse, and respond to prayer requests"],
  ];

  const typeColors = { "Sign-off":["FEE2E2","991B1B"], "Gate":["FEF3C7","92400E"], "Demo":["EFF6FF","1D4ED8"], "Planned":["F0FDF4","065F46"], "Go-Live":["D1FAE5","065F46"] };

  milestones.forEach(([num, ms, wk, owner, type, criteria], i) => {
    const y = 1.46 + i * 0.43;
    const rowBg = i%2===0 ? C.white : C.bg;
    s.addShape(pres.ShapeType.rect, { x:0.45, y, w:9.3, h:0.43, fill:{ color:rowBg }, line:{ color:C.border, width:0.5 } });
    // Number circle
    s.addShape(pres.ShapeType.ellipse, { x:0.49, y:y+0.09, w:0.25, h:0.25, fill:{ color:C.navy }, line:{ color:C.navy } });
    s.addText(String(num), { x:0.49, y:y+0.09, w:0.25, h:0.25, fontSize:8, bold:true, color:C.white, align:"center", valign:"middle", fontFace:"Calibri" });
    s.addText(ms,      { x:0.82, y:y+0.06, w:2.1,  h:0.32, fontSize:9,   bold:true,  color:C.navy,  fontFace:"Calibri", valign:"middle" });
    s.addText(wk,      { x:2.98, y:y+0.06, w:0.75, h:0.32, fontSize:8,   color:C.muted, fontFace:"Calibri", valign:"middle" });
    s.addText(owner,   { x:3.78, y:y+0.06, w:1.55, h:0.32, fontSize:8,   color:C.text,  fontFace:"Calibri", valign:"middle" });
    const [tbg, ttc] = typeColors[type] || ["F0FDF4","065F46"];
    s.addShape(pres.ShapeType.roundRect, { x:5.38, y:y+0.1, w:0.88, h:0.22, fill:{ color:tbg }, line:{ color:tbg }, rectRadius:0.07 });
    s.addText(type, { x:5.38, y:y+0.11, w:0.88, h:0.2, fontSize:7, bold:true, color:ttc, align:"center", fontFace:"Calibri" });
    s.addText(criteria,{ x:6.36, y:y+0.04, w:3.35, h:0.36, fontSize:7.5, color:C.muted, fontFace:"Calibri", valign:"top" });
  });

  footerBar(s);
}

// ════════════════════════════════════════════════
// SLIDE 5 — MILESTONE REGISTER (Part 2: M10–M18)
// ════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };
  tag(s, "Part One — Delivery Milestone Plan");
  title(s, "Milestone Register (2 of 2) — M10 to M18");
  divider(s);

  s.addShape(pres.ShapeType.rect, { x:0.45, y:1.14, w:9.3, h:0.3, fill:{ color:C.navy }, line:{ color:C.navy } });
  const hcols = [["#",0.48,0.28],["Milestone",0.82,2.1],["Week",2.98,0.75],["Owner",3.78,1.55],["Type",5.38,0.92],["Success Criteria",6.36,3.35]];
  hcols.forEach(([h,x,w]) => s.addText(h, { x, y:1.16, w, h:0.26, fontSize:8.5, bold:true, color:C.white, fontFace:"Calibri" }));

  const typeColors = { "Sign-off":["FEE2E2","991B1B"], "Gate":["FEF3C7","92400E"], "Demo":["EFF6FF","1D4ED8"], "Planned":["F0FDF4","065F46"], "Go-Live":["D1FAE5","065F46"] };

  const milestones2 = [
    [10,"Video Library Complete","Wk 5 End","Backend + DevOps","Planned","Videos stream from S3/CDN; category filtering works on device"],
    [11,"Mid-Sprint Demo #2","Wk 6 Mid","PM + Dev Team","Demo","ANM team sees working in-app chat and VoIP calling"],
    [12,"MVP Feature-Complete","Wk 6 End","Solution Architect","Sign-off","100% Phase 1 stories Done; no P1 bugs open; code review passed"],
    [13,"Test Coverage Target Met","Wk 7 End","QA Engineer","Planned","≥80% unit coverage; all 17 API endpoints covered; E2E pass"],
    [14,"Security Audit Clear","Wk 8 Mid","Security Consultant","Planned","No critical/high OWASP Mobile Top 10 vulnerabilities found"],
    [15,"UAT Sign-Off","Wk 8 End","ANM PO","Sign-off","ANM approves all features on TestFlight & internal Play track"],
    [16,"Store Submissions Filed","Wk 9 Day 1","Mobile Dev + PM","Planned","Both submissions in review (Apple 24–48hr, Google 24–72hr)"],
    [17,"🚀 Production Go-Live","Wk 9 End","Full Team","Go-Live","App live on App Store & Google Play; backend healthy; monitoring active"],
    [18,"Hypercare Handover","Wk 10","PM + DevOps","Planned","Admins trained; runbooks delivered; CloudWatch live; SLA active"],
  ];

  milestones2.forEach(([num, ms, wk, owner, type, criteria], i) => {
    const y = 1.46 + i * 0.43;
    const rowBg = i%2===0 ? C.white : C.bg;
    s.addShape(pres.ShapeType.rect, { x:0.45, y, w:9.3, h:0.43, fill:{ color:rowBg }, line:{ color:C.border, width:0.5 } });
    s.addShape(pres.ShapeType.ellipse, { x:0.49, y:y+0.09, w:0.25, h:0.25, fill:{ color: num===17 ? C.gold : C.navy }, line:{ color: num===17 ? C.gold : C.navy } });
    s.addText(String(num), { x:0.49, y:y+0.09, w:0.25, h:0.25, fontSize:8, bold:true, color:C.white, align:"center", valign:"middle", fontFace:"Calibri" });
    s.addText(ms,      { x:0.82, y:y+0.06, w:2.1,  h:0.32, fontSize:9,   bold:true, color: num===17 ? "065F46" : C.navy, fontFace:"Calibri", valign:"middle" });
    s.addText(wk,      { x:2.98, y:y+0.06, w:0.75, h:0.32, fontSize:8,   color:C.muted, fontFace:"Calibri", valign:"middle" });
    s.addText(owner,   { x:3.78, y:y+0.06, w:1.55, h:0.32, fontSize:8,   color:C.text,  fontFace:"Calibri", valign:"middle" });
    const [tbg, ttc] = typeColors[type] || ["F0FDF4","065F46"];
    s.addShape(pres.ShapeType.roundRect, { x:5.38, y:y+0.1, w:0.88, h:0.22, fill:{ color:tbg }, line:{ color:tbg }, rectRadius:0.07 });
    s.addText(type, { x:5.38, y:y+0.11, w:0.88, h:0.2, fontSize:7, bold:true, color:ttc, align:"center", fontFace:"Calibri" });
    s.addText(criteria,{ x:6.36, y:y+0.04, w:3.35, h:0.36, fontSize:7.5, color:C.muted, fontFace:"Calibri", valign:"top" });
  });

  footerBar(s);
}

// ════════════════════════════════════════════════
// SLIDE 6 — PHASE BREAKDOWN
// ════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };
  tag(s, "Part Two — Implementation Plan");
  title(s, "Phase-by-Phase Breakdown");
  divider(s);

  const phases = [
    { num:"01", name:"Discovery & Design",   weeks:"Wks 1–2", hc:"1D4ED8", hbg:C.blue100,   tasks:["Stakeholder workshops (×2)","User journey mapping","Feature list finalisation","Lo-fi → Hi-fi wireframes","Design system & components","MongoDB schema design","REST API contract doc","Dev / staging / prod setup","CI/CD pipeline (GH Actions)","RN project scaffold + lint"] },
    { num:"02", name:"Core Development",     weeks:"Wks 3–6", hc:"065F46", hbg:"F0FDF4",     tasks:["Firebase Auth (OTP + biometric)","Onboarding (3-step flow)","Member directory API + UI","Member detail & edit","Member history notes log","Prayer request CRUD + anon","Prayer feed + Pray response","S3 upload + presigned URLs","CloudFront streaming + UI","Twilio Chat 1:1 messaging","Twilio Voice VoIP calling","Deep linking + nav polish"] },
    { num:"03", name:"Testing & QA",         weeks:"Wks 7–8", hc:"92400E", hbg:C.amber100,   tasks:["Jest unit tests (≥80% cov.)","Supertest API integration","Detox E2E — iOS Simulator","Detox E2E — Android Emulator","k6 load test (500 users)","Video streaming latency test","VoiceOver + TalkBack audit","WCAG 2.1 AA contrast checks","OWASP penetration test","UAT — 20 ANM pilot members","P1/P2 bug fix sprint","Regression after bug fixes"] },
    { num:"04", name:"Deployment",           weeks:"Week 9",  hc:"6B21A8", hbg:C.purple100,  tasks:["Prod MongoDB Atlas config","ECS Fargate task definitions","CloudFront CDN finalise","DNS records + SSL (ACM)","CloudWatch alarms + dashboards","Sentry crash monitoring setup","App Store submission (EAS)","Google Play submission (AAB)","Phased rollout 10% → 100%","Go-live smoke test on prod"] },
    { num:"05", name:"Support & Phase 2",    weeks:"Wk 10+",  hc:"991B1B", hbg:"FFF1F2",     tasks:["30-day hypercare on-call","ANM admin training (2 hrs)","Runbook & docs delivery","OS update testing","Monthly infra cost review","Phase 2 backlog grooming","Push notifications (FCM)","Group chat / forums","Multi-language i18n setup","Admin dashboard scoping"] },
  ];

  phases.forEach(({ num, name, weeks, hc, hbg, tasks }, i) => {
    const x = 0.45 + i * 1.84;
    const W = 1.74;

    // Header
    s.addShape(pres.ShapeType.rect, { x, y:1.14, w:W, h:0.72, fill:{ color:hc }, line:{ color:hc } });
    s.addText(`Phase ${num}`, { x, y:1.16, w:W, h:0.2,  fontSize:7.5, bold:true, color:"FFFFFFCC", align:"center", fontFace:"Calibri" });
    s.addText(name,           { x, y:1.36, w:W, h:0.28, fontSize:8.5, bold:true, color:C.white, align:"center", fontFace:"Calibri" });
    s.addText(weeks,          { x, y:1.64, w:W, h:0.18, fontSize:7,   color:"FFFFFF99", align:"center", fontFace:"Calibri" });

    // Body
    s.addShape(pres.ShapeType.rect, { x, y:1.86, w:W, h:3.52, fill:{ color:hbg }, line:{ color:C.border, width:0.5 } });
    tasks.forEach((t, j) => {
      s.addText(`› ${t}`, { x:x+0.06, y:1.9 + j*0.32, w:W-0.1, h:0.3, fontSize:7.5, color:C.text, fontFace:"Calibri", valign:"top" });
    });
  });

  footerBar(s);
}

// ════════════════════════════════════════════════
// SLIDE 7 — SPRINT 1 & 2
// ════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };
  tag(s, "Part Two — Sprint Breakdown");
  title(s, "Sprint 1 & 2 — Foundation + Auth & Members");
  divider(s);

  const sprints = [
    {
      name:"Sprint 1 — Discovery & Setup", weeks:"Weeks 1–2", pts:23, hc:C.navy,
      stories:[
        [3,"Stakeholder workshop & requirements doc","PM | 2 sessions, signed off by ANM PO"],
        [5,"Hi-fi wireframes — all 5 screens","UI/UX Designer | Figma, all states covered"],
        [3,"Design system & component library","UI/UX Designer | Colours, type, atoms"],
        [5,"DB schema + API contract doc","Backend + Architect | 5 collections, 17 endpoints"],
        [5,"CI/CD pipeline + environments","DevOps | GitHub Actions, EAS, 3 environments"],
        [2,"React Native project scaffold","Mobile Dev | ESLint, Prettier, nav structure"],
      ],
    },
    {
      name:"Sprint 2 — Auth & Members", weeks:"Weeks 3–4", pts:27, hc:"065F46",
      stories:[
        [5,"Firebase Auth — email/phone OTP","Mobile Dev | Sign up, OTP verify, login"],
        [3,"Biometric login (Face ID / Fingerprint)","Mobile Dev | iOS & Android local auth"],
        [3,"Onboarding flow — 3-step profile setup","Mobile Dev | Photo upload, name, group"],
        [5,"Member directory API + UI","Backend + Mobile | Search, filter, pagination"],
        [5,"Member detail & profile edit screens","Mobile Dev | Contact info, role badge, actions"],
        [4,"Member history — notes log","Backend + Mobile | Leader-only add/view"],
        [2,"Home dashboard screen","Mobile Dev | Tiles, greeting, nav"],
      ],
    },
  ];

  sprints.forEach(({ name, weeks, pts, hc, stories }, si) => {
    const x = 0.45 + si * 4.78;
    const W = 4.58;

    s.addShape(pres.ShapeType.rect, { x, y:1.14, w:W, h:0.42, fill:{ color:hc }, line:{ color:hc } });
    s.addText(name,  { x:x+0.12, y:1.16, w:W-1.0, h:0.38, fontSize:11, bold:true, color:C.white, valign:"middle", fontFace:"Calibri" });
    s.addText(weeks, { x:x+W-0.9, y:1.18, w:0.84, h:0.18, fontSize:8, color:"FFFFFFAA", align:"right", fontFace:"Calibri" });

    s.addShape(pres.ShapeType.rect, { x, y:1.56, w:W, h:3.62, fill:{ color:C.white }, line:{ color:C.border, width:1 }, shadow:shadow() });

    stories.forEach(([sp, ttl, sub], j) => {
      const ry = 1.62 + j * 0.5;
      s.addShape(pres.ShapeType.rect, { x:x+0.1, y:ry, w:0.3, h:0.3, fill:{ color:C.blue100 }, line:{ color:C.blue100 } });
      s.addText(String(sp), { x:x+0.1, y:ry, w:0.3, h:0.3, fontSize:9, bold:true, color:C.navy, align:"center", valign:"middle", fontFace:"Calibri" });
      s.addText(ttl, { x:x+0.46, y:ry+0.02, w:W-0.58, h:0.2, fontSize:9.5, bold:true, color:C.text, fontFace:"Calibri" });
      s.addText(sub, { x:x+0.46, y:ry+0.22, w:W-0.58, h:0.18, fontSize:8, color:C.muted, fontFace:"Calibri" });
    });

    // Footer
    s.addShape(pres.ShapeType.rect, { x, y:5.18, w:W, h:0.25, fill:{ color:C.bg }, line:{ color:C.border, width:0.5 } });
    s.addText("Total Story Points", { x:x+0.12, y:5.19, w:W-1.2, h:0.22, fontSize:9, color:C.muted, valign:"middle", fontFace:"Calibri" });
    s.addText(`${pts} pts`, { x:x+W-1.1, y:5.19, w:1.0, h:0.22, fontSize:11, bold:true, color:C.navy, align:"right", valign:"middle", fontFace:"Calibri" });
  });

  footerBar(s);
}

// ════════════════════════════════════════════════
// SLIDE 8 — SPRINT 3 & 4
// ════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };
  tag(s, "Part Two — Sprint Breakdown");
  title(s, "Sprint 3 & 4 — Prayer & Media + QA & Hardening");
  divider(s);

  const sprints = [
    {
      name:"Sprint 3 — Prayer & Media", weeks:"Weeks 5–6", pts:31, hc:"92400E",
      stories:[
        [5,"Prayer request submission + anon mode","Backend + Mobile | Form, CRUD, status"],
        [4,"Prayer request feed + Pray response","Mobile Dev | Scrollable feed, tap-to-pray"],
        [4,"AWS S3 upload pipeline + presigned URLs","Backend + DevOps | Admin video upload"],
        [4,"CloudFront streaming + video library UI","Mobile Dev | Categories, thumbnails, player"],
        [6,"Twilio Chat SDK — 1:1 messaging","Mobile Dev | Real-time, read receipts, history"],
        [6,"Twilio Voice SDK — VoIP calling","Mobile Dev | In-app call, no phone # shared"],
        [2,"Deep linking + bottom nav polish","Mobile Dev | Universal links, tab state"],
      ],
    },
    {
      name:"Sprint 4 — QA & Hardening", weeks:"Weeks 7–8", pts:32, hc:C.warn,
      stories:[
        [5,"Jest unit tests — ≥80% coverage","QA + Backend | All service-layer logic"],
        [4,"Supertest API integration tests","QA | All 17 endpoints, +/- paths"],
        [6,"Detox E2E — iOS + Android","QA | Login, member, pray, video, call"],
        [3,"k6 performance + load testing","DevOps + QA | 500 concurrent users"],
        [3,"Accessibility audit — VoiceOver/TalkBack","QA + Designer | WCAG 2.1 AA"],
        [4,"OWASP penetration test + security fixes","Security Consultant | Top 10 review"],
        [4,"UAT with 20 ANM pilot members","PM + QA | TestFlight + Play internal"],
        [3,"P1/P2 bug fix sprint + regression","Dev Team | All critical issues resolved"],
      ],
    },
  ];

  sprints.forEach(({ name, weeks, pts, hc, stories }, si) => {
    const x = 0.45 + si * 4.78;
    const W = 4.58;

    s.addShape(pres.ShapeType.rect, { x, y:1.14, w:W, h:0.42, fill:{ color:hc }, line:{ color:hc } });
    s.addText(name,  { x:x+0.12, y:1.16, w:W-1.0, h:0.38, fontSize:11, bold:true, color:C.white, valign:"middle", fontFace:"Calibri" });
    s.addText(weeks, { x:x+W-0.9, y:1.18, w:0.84, h:0.18, fontSize:8, color:"FFFFFFAA", align:"right", fontFace:"Calibri" });
    s.addShape(pres.ShapeType.rect, { x, y:1.56, w:W, h:3.62, fill:{ color:C.white }, line:{ color:C.border, width:1 }, shadow:shadow() });

    stories.forEach(([sp, ttl, sub], j) => {
      const ry = 1.61 + j * 0.44;
      s.addShape(pres.ShapeType.rect, { x:x+0.1, y:ry, w:0.3, h:0.28, fill:{ color:C.amber100 }, line:{ color:C.amber100 } });
      s.addText(String(sp), { x:x+0.1, y:ry, w:0.3, h:0.28, fontSize:8.5, bold:true, color:"92400E", align:"center", valign:"middle", fontFace:"Calibri" });
      s.addText(ttl, { x:x+0.46, y:ry+0.01, w:W-0.58, h:0.18, fontSize:9, bold:true, color:C.text, fontFace:"Calibri" });
      s.addText(sub, { x:x+0.46, y:ry+0.19, w:W-0.58, h:0.16, fontSize:7.5, color:C.muted, fontFace:"Calibri" });
    });

    s.addShape(pres.ShapeType.rect, { x, y:5.18, w:W, h:0.25, fill:{ color:C.bg }, line:{ color:C.border, width:0.5 } });
    s.addText("Total Story Points", { x:x+0.12, y:5.19, w:W-1.2, h:0.22, fontSize:9, color:C.muted, valign:"middle", fontFace:"Calibri" });
    s.addText(`${pts} pts`, { x:x+W-1.1, y:5.19, w:1.0, h:0.22, fontSize:11, bold:true, color:C.navy, align:"right", valign:"middle", fontFace:"Calibri" });
  });

  footerBar(s);
}

// ════════════════════════════════════════════════
// SLIDE 9 — SPRINT 5 + EFFORT SUMMARY
// ════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };
  tag(s, "Part Two — Sprint Breakdown");
  title(s, "Sprint 5 — Deploy & Launch + Effort Summary");
  divider(s);

  // Sprint 5
  const sp5 = [
    [3,"Production infrastructure provisioning","DevOps | ECS, MongoDB Atlas M10, CloudFront"],
    [2,"CloudWatch alarms + dashboards","DevOps | API latency, error rate, uptime"],
    [2,"Sentry crash monitoring setup","DevOps + Mobile | iOS + Android DSN"],
    [3,"Apple App Store submission","Mobile Dev | EAS Build, review guidelines"],
    [3,"Google Play Console submission","Mobile Dev | Internal → prod release (AAB)"],
    [2,"Go-live smoke test on production","QA + PM | All critical paths verified"],
    [2,"ANM admin training session","PM | 2-hr session: uploads, member mgmt"],
    [2,"Runbooks + admin docs delivery","DevOps + PM | Incident response, escalation"],
  ];

  s.addShape(pres.ShapeType.rect, { x:0.45, y:1.14, w:4.58, h:0.42, fill:{ color:"6B21A8" }, line:{ color:"6B21A8" } });
  s.addText("Sprint 5 — Deploy & Launch",  { x:0.57, y:1.16, w:3.5, h:0.38, fontSize:11, bold:true, color:C.white, valign:"middle", fontFace:"Calibri" });
  s.addText("Weeks 9–10", { x:4.15, y:1.18, w:0.82, h:0.18, fontSize:8, color:"FFFFFFAA", align:"right", fontFace:"Calibri" });
  s.addShape(pres.ShapeType.rect, { x:0.45, y:1.56, w:4.58, h:3.62, fill:{ color:C.white }, line:{ color:C.border, width:1 }, shadow:shadow() });

  sp5.forEach(([sp, ttl, sub], j) => {
    const ry = 1.62 + j * 0.43;
    s.addShape(pres.ShapeType.rect, { x:0.55, y:ry, w:0.3, h:0.28, fill:{ color:C.purple100 }, line:{ color:C.purple100 } });
    s.addText(String(sp), { x:0.55, y:ry, w:0.3, h:0.28, fontSize:8.5, bold:true, color:"6B21A8", align:"center", valign:"middle", fontFace:"Calibri" });
    s.addText(ttl, { x:0.92, y:ry+0.01, w:4.04, h:0.18, fontSize:9, bold:true, color:C.text, fontFace:"Calibri" });
    s.addText(sub, { x:0.92, y:ry+0.19, w:4.04, h:0.16, fontSize:7.5, color:C.muted, fontFace:"Calibri" });
  });
  s.addShape(pres.ShapeType.rect, { x:0.45, y:5.18, w:4.58, h:0.25, fill:{ color:C.bg }, line:{ color:C.border, width:0.5 } });
  s.addText("Total Story Points", { x:0.57, y:5.19, w:3.5, h:0.22, fontSize:9, color:C.muted, valign:"middle", fontFace:"Calibri" });
  s.addText("19 pts", { x:4.05, y:5.19, w:0.9, h:0.22, fontSize:11, bold:true, color:C.navy, align:"right", valign:"middle", fontFace:"Calibri" });

  // Effort Summary (right)
  s.addShape(pres.ShapeType.rect, { x:5.23, y:1.14, w:4.52, h:3.62, fill:{ color:C.navy }, line:{ color:C.navy }, shadow:shadow() });
  s.addText("📊 Effort Summary", { x:5.35, y:1.2, w:4.3, h:0.3, fontSize:12, bold:true, color:C.gold, fontFace:"Calibri" });
  s.addShape(pres.ShapeType.line, { x:5.35, y:1.52, w:4.1, h:0, line:{ color:"FFFFFF22", width:1 } });

  const summary = [
    ["Sprint 1","Discovery & Setup","23"],
    ["Sprint 2","Auth & Members","27"],
    ["Sprint 3","Prayer & Media","31"],
    ["Sprint 4","QA & Hardening","32"],
    ["Sprint 5","Deploy & Launch","19"],
  ];
  summary.forEach(([sp, lbl, pts], i) => {
    const ry = 1.6 + i * 0.56;
    s.addShape(pres.ShapeType.rect, { x:5.35, y:ry, w:4.2, h:0.48, fill:{ color:"FFFFFF0A" }, line:{ color:"FFFFFF15" } });
    s.addText(sp,  { x:5.45, y:ry+0.04, w:0.9, h:0.2,  fontSize:8,  bold:true, color:C.gold,  fontFace:"Calibri" });
    s.addText(lbl, { x:5.45, y:ry+0.25, w:2.8, h:0.18, fontSize:8,  color:"FFFFFFAA", fontFace:"Calibri" });
    s.addText(pts, { x:8.65, y:ry+0.08, w:0.85, h:0.3, fontSize:18, bold:true, color:C.white, align:"right", valign:"middle", fontFace:"Calibri" });
    s.addText("pts",{ x:8.65, y:ry+0.3, w:0.85, h:0.14,fontSize:7, color:"FFFFFFAA", align:"right", fontFace:"Calibri" });
  });

  s.addShape(pres.ShapeType.rect, { x:5.23, y:4.76, w:4.52, h:0.38, fill:{ color:C.gold }, line:{ color:C.gold } });
  s.addText("TOTAL", { x:5.35, y:4.79, w:2.5, h:0.32, fontSize:10, bold:true, color:C.navy, valign:"middle", fontFace:"Calibri" });
  s.addText("132 story points", { x:7.27, y:4.79, w:2.4, h:0.32, fontSize:14, bold:true, color:C.navy, align:"right", valign:"middle", fontFace:"Calibri" });

  footerBar(s);
}

// ════════════════════════════════════════════════
// SLIDE 10 — RACI MATRIX
// ════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };
  tag(s, "Part Two — Roles & Responsibilities");
  title(s, "RACI Matrix");
  divider(s);

  // Legend
  const legend = [["R","Responsible","Does the work",C.navy,"DBEAFE"],["A","Accountable","Owns the outcome",C.gold,"FEF3C7"],["C","Consulted","Input required",C.info,"EFF6FF"],["I","Informed","Kept in the loop",C.muted,"F1F5F9"]];
  legend.forEach(([letter, word, desc, tc, bg], i) => {
    const x = 0.45 + i * 2.3;
    s.addShape(pres.ShapeType.rect, { x, y:1.14, w:2.18, h:0.42, fill:{ color:bg }, line:{ color:C.border } });
    s.addShape(pres.ShapeType.rect, { x:x+0.08, y:1.22, w:0.28, h:0.28, fill:{ color:tc }, line:{ color:tc } });
    s.addText(letter, { x:x+0.08, y:1.22, w:0.28, h:0.28, fontSize:9, bold:true, color:C.white, align:"center", valign:"middle", fontFace:"Calibri" });
    s.addText(`${word} — ${desc}`, { x:x+0.42, y:1.22, w:1.68, h:0.28, fontSize:8, color:tc, valign:"middle", fontFace:"Calibri" });
  });

  // Table header
  const cols = ["Activity","PM","Designer","Mobile Dev","Backend","DevOps","QA","Security","Architect","ANM PO"];
  const colW = [2.35, 0.62, 0.74, 0.82, 0.72, 0.62, 0.56, 0.7, 0.72, 0.7];
  let cx = 0.45;
  s.addShape(pres.ShapeType.rect, { x:0.45, y:1.62, w:9.3, h:0.3, fill:{ color:C.navy }, line:{ color:C.navy } });
  cols.forEach((c, i) => {
    s.addText(c, { x:cx+0.04, y:1.64, w:colW[i]-0.04, h:0.26, fontSize:i===0?8:7.5, bold:true, color:C.white, align:i===0?"left":"center", fontFace:"Calibri" });
    cx += colW[i];
  });

  const rows = [
    ["Requirements Gathering",      "A","C","C","C","I","I","I","C","R"],
    ["Wireframes & Design",         "I","R/A","C","I","I","C","I","C","C"],
    ["Architecture Design",         "I","I","C","R","R","I","C","A","I"],
    ["DB Schema & API Design",      "I","I","C","R","I","I","I","A","I"],
    ["CI/CD & Infra Setup",         "I","I","C","C","R/A","I","C","C","I"],
    ["Mobile App Development",      "I","C","R/A","C","I","C","I","C","I"],
    ["Backend API Development",     "I","I","C","R/A","C","C","I","C","I"],
    ["Unit & Integration Testing",  "I","I","R","R","I","A","I","C","I"],
    ["E2E & Performance Testing",   "I","I","C","C","C","R/A","I","I","I"],
    ["Security Audit",              "I","I","C","C","C","C","R/A","C","I"],
    ["UAT Coordination",            "R","I","C","C","I","R","I","I","A"],
    ["App Store Submissions",       "A","I","R","I","C","C","I","I","I"],
    ["Production Deployment",       "A","I","C","C","R","C","I","C","I"],
    ["Stakeholder Reporting",       "R/A","I","I","I","I","I","I","I","C"],
    ["Change Request Management",   "R","C","C","C","C","C","I","A","R"],
  ];

  const raciColor = (v) => {
    if (v==="R"||v==="R/A") return [C.navy, C.blue100];
    if (v==="A")             return [C.gold, "FEF3C7"];
    if (v==="C")             return [C.info, "EFF6FF"];
    return [C.muted, C.bg];
  };

  rows.forEach((row, ri) => {
    const ry = 1.94 + ri * 0.23;
    const rowBg = ri%2===0 ? C.white : C.bg;
    s.addShape(pres.ShapeType.rect, { x:0.45, y:ry, w:9.3, h:0.23, fill:{ color:rowBg }, line:{ color:C.border, width:0.5 } });
    let rx = 0.45;
    row.forEach((cell, ci) => {
      if (ci===0) {
        s.addText(cell, { x:rx+0.06, y:ry+0.02, w:colW[0]-0.08, h:0.19, fontSize:7.5, color:C.text, fontFace:"Calibri", valign:"middle" });
      } else {
        const [tc, bg] = raciColor(cell);
        if (cell !== "I" && cell !== "") {
          s.addShape(pres.ShapeType.rect, { x:rx+0.06, y:ry+0.03, w:colW[ci]-0.1, h:0.17, fill:{ color:bg }, line:{ color:bg } });
        }
        s.addText(cell, { x:rx+0.06, y:ry+0.03, w:colW[ci]-0.1, h:0.17, fontSize:7.5, bold:cell!=="I", color:tc, align:"center", valign:"middle", fontFace:"Calibri" });
      }
      rx += colW[ci];
    });
  });

  footerBar(s);
}

// ════════════════════════════════════════════════
// SLIDE 11 — DEPENDENCIES
// ════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };
  tag(s, "Part Two — Implementation Plan");
  title(s, "Key Dependencies & Blockers");
  divider(s);

  s.addShape(pres.ShapeType.rect, { x:0.45, y:1.14, w:9.3, h:0.3, fill:{ color:C.navy }, line:{ color:C.navy } });
  [["#",0.48,0.28],["Dependency",0.82,2.3],["Due",3.18,0.75],["Owner",3.98,1.2],["Risk",5.24,0.75],["Contingency",6.05,3.64]].forEach(([h,x,w]) =>
    s.addText(h, { x, y:1.16, w, h:0.26, fontSize:8.5, bold:true, color:C.white, fontFace:"Calibri" })
  );

  const deps = [
    ["D1","ANM signs contract & SOW","Before Wk 1","PM + ANM PO","High","No work begins until signed. PM to chase 5 days before planned start."],
    ["D2","ANM brand assets (logo, colour guide)","Wk 1 Day 2","ANM PO","Med","Proceed with placeholder brand; swap assets when received."],
    ["D3","Firebase project credentials provisioned","Wk 2 End","DevOps","High","Create shared Firebase project in advance; transfer ownership post-launch."],
    ["D4","Twilio account & API keys","Wk 4 End","DevOps","Med","Use Twilio trial for dev; upgrade to production before Wk 9."],
    ["D5","AWS account with required service limits","Wk 1 End","DevOps","High","Request limit increases on Day 1 — AWS takes 24–48 hrs."],
    ["D6","Apple Developer Account (ANM enrolled)","Wk 4","ANM PO","Med","Enrolment takes up to 7 business days — must begin Wk 3."],
    ["D7","Google Play Developer Account (ANM)","Wk 4","ANM PO","Med","One-time $25 fee; approval usually same day."],
    ["D8","UAT pilot members identified & invited","Wk 6","ANM PO","Low","QA team can use internal testers if ANM pilot unavailable."],
    ["D9","ANM video content for library seed","Wk 4","ANM PO","Low","Use 3 placeholder videos during dev; replace before go-live."],
  ];

  const riskColor = { "High":C.danger, "Med":C.warn, "Low":C.success };
  deps.forEach(([id, dep, due, owner, risk, cont], i) => {
    const ry = 1.46 + i * 0.42;
    s.addShape(pres.ShapeType.rect, { x:0.45, y:ry, w:9.3, h:0.42, fill:{ color:i%2===0?C.white:C.bg }, line:{ color:C.border, width:0.5 } });
    s.addShape(pres.ShapeType.rect, { x:0.49, y:ry+0.09, w:0.28, h:0.24, fill:{ color:C.navy }, line:{ color:C.navy } });
    s.addText(id, { x:0.49, y:ry+0.09, w:0.28, h:0.24, fontSize:7.5, bold:true, color:C.white, align:"center", valign:"middle", fontFace:"Calibri" });
    s.addText(dep,   { x:0.83, y:ry+0.05, w:2.28, h:0.32, fontSize:9, bold:true, color:C.navy, fontFace:"Calibri", valign:"middle" });
    s.addText(due,   { x:3.18, y:ry+0.08, w:0.73, h:0.26, fontSize:7.5, color:C.muted, fontFace:"Calibri", valign:"middle" });
    s.addText(owner, { x:3.98, y:ry+0.08, w:1.18, h:0.26, fontSize:8, color:C.text,  fontFace:"Calibri", valign:"middle" });
    s.addShape(pres.ShapeType.roundRect, { x:5.26, y:ry+0.1, w:0.68, h:0.22, fill:{ color:riskColor[risk] }, line:{ color:riskColor[risk] }, rectRadius:0.07 });
    s.addText(risk, { x:5.26, y:ry+0.11, w:0.68, h:0.2, fontSize:7.5, bold:true, color:C.white, align:"center", fontFace:"Calibri" });
    s.addText(cont, { x:6.05, y:ry+0.04, w:3.64, h:0.34, fontSize:7.5, color:C.muted, fontFace:"Calibri", valign:"top" });
  });

  footerBar(s);
}

// ════════════════════════════════════════════════
// SLIDE 12 — INFRASTRUCTURE & MONITORING CHECKLISTS
// ════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };
  tag(s, "Part Two — Go-Live Checklists");
  title(s, "Infrastructure & Monitoring Checklists");
  divider(s);

  const sections = [
    {
      icon:"☁️", title:"Infrastructure & Cloud", color:"1D4ED8", hbg:C.blue100,
      items:[
        "AWS RDS PostgreSQL 16 (db.r6g.large) Multi-AZ provisioned in prod region",
        "RDS security group: port 5432 inbound from ECS task CIDR only",
        "AWS ECS Fargate production service created",
        "Auto-scaling policy: CPU ≥ 70% → scale out",
        "S3 production bucket — versioning enabled",
        "CloudFront distribution live with custom domain",
        "ACM SSL certificate issued & attached to ALB",
        "DNS records pointing to ALB (api.anm.org)",
        "Secrets Manager storing all env variables",
        "VPC with private subnets for ECS tasks",
      ],
    },
    {
      icon:"📊", title:"Monitoring & Observability", color:"065F46", hbg:"F0FDF4",
      items:[
        "CloudWatch dashboard — API latency, error rate, 5xx count",
        "CloudWatch alarm: API error rate > 1% → alert",
        "CloudWatch alarm: ECS CPU > 80% for 5 min",
        "CloudWatch alarm: RDS PostgreSQL connections > 80% pool",
        "Sentry project created for iOS app (DSN configured)",
        "Sentry project created for Android app (DSN configured)",
        "Log retention policy set (30d dev, 90d prod)",
        "Health check endpoint /health returning 200",
        "On-call rotation schedule documented",
      ],
    },
  ];

  sections.forEach(({ icon, title: stitle, color, hbg, items }, si) => {
    const x = 0.45 + si * 4.78;
    const W = 4.58;
    s.addShape(pres.ShapeType.rect, { x, y:1.14, w:W, h:0.4, fill:{ color:hbg }, line:{ color:C.border } });
    s.addShape(pres.ShapeType.rect, { x, y:1.14, w:0.06, h:0.4, fill:{ color }, line:{ color } });
    s.addText(`${icon}  ${stitle}`, { x:x+0.14, y:1.17, w:W-0.16, h:0.34, fontSize:11, bold:true, color, valign:"middle", fontFace:"Calibri" });

    items.forEach((item, j) => {
      const iy = 1.58 + j * 0.39;
      s.addShape(pres.ShapeType.rect, { x, y:iy, w:W, h:0.39, fill:{ color:j%2===0?C.white:C.bg }, line:{ color:C.border, width:0.5 } });
      // Checkbox
      s.addShape(pres.ShapeType.rect, { x:x+0.1, y:iy+0.09, w:0.2, h:0.2, fill:{ color:C.white }, line:{ color:C.border, width:1 } });
      s.addText(item, { x:x+0.37, y:iy+0.06, w:W-0.46, h:0.28, fontSize:8.5, color:C.text, fontFace:"Calibri", valign:"middle" });
    });
  });

  footerBar(s);
}

// ════════════════════════════════════════════════
// SLIDE 13 — SECURITY & APP STORE CHECKLISTS
// ════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };
  tag(s, "Part Two — Go-Live Checklists");
  title(s, "Security & App Store Go-Live Checklists");
  divider(s);

  const sections = [
    {
      icon:"🔒", title:"Security & Auth", color:"92400E", hbg:C.amber100,
      items:[
        "Firebase PRODUCTION project created (separate from dev)",
        "JWT expiry: 1 hr with refresh token rotation",
        "All API endpoints require valid JWT (except /auth/*)",
        "Rate limiting: 100 req/min per IP on API Gateway",
        "CORS whitelist: only ANM app bundle IDs allowed",
        "RDS PostgreSQL encryption at rest confirmed (AWS KMS default)",
        "TLS 1.3 enforced on all HTTPS endpoints",
        "S3 public access blocked — only CloudFront reads",
        "OWASP findings resolved — report signed off",
        "Privacy policy linked in app onboarding screen",
      ],
    },
    {
      icon:"📱", title:"App Store & Go-Live", color:"6B21A8", hbg:C.purple100,
      items:[
        "App Store listing: screenshots, description, keywords",
        "App Store privacy manifest submitted (iOS 17+)",
        "App icons: all required sizes (iOS + Android)",
        "Splash screens: iOS + Android all densities",
        "Google Play: feature graphic, screenshots, rating questionnaire",
        "EAS production build tested on physical devices",
        "Deep links tested: iOS Universal Links + Android App Links",
        "Production API base URL in release build",
        "Go-live smoke test completed (all 5 critical paths)",
        "Phased rollout set to 10% on both stores",
        "ANM team notified; member comms ready to send",
      ],
    },
  ];

  sections.forEach(({ icon, title: stitle, color, hbg, items }, si) => {
    const x = 0.45 + si * 4.78;
    const W = 4.58;
    s.addShape(pres.ShapeType.rect, { x, y:1.14, w:W, h:0.4, fill:{ color:hbg }, line:{ color:C.border } });
    s.addShape(pres.ShapeType.rect, { x, y:1.14, w:0.06, h:0.4, fill:{ color }, line:{ color } });
    s.addText(`${icon}  ${stitle}`, { x:x+0.14, y:1.17, w:W-0.16, h:0.34, fontSize:11, bold:true, color, valign:"middle", fontFace:"Calibri" });

    items.forEach((item, j) => {
      const iy = 1.58 + j * 0.37;
      s.addShape(pres.ShapeType.rect, { x, y:iy, w:W, h:0.37, fill:{ color:j%2===0?C.white:C.bg }, line:{ color:C.border, width:0.5 } });
      s.addShape(pres.ShapeType.rect, { x:x+0.1, y:iy+0.08, w:0.2, h:0.2, fill:{ color:C.white }, line:{ color:C.border, width:1 } });
      s.addText(item, { x:x+0.37, y:iy+0.05, w:W-0.46, h:0.28, fontSize:8.5, color:C.text, fontFace:"Calibri", valign:"middle" });
    });
  });

  footerBar(s);
}

// ════════════════════════════════════════════════
// SLIDE 14 — COMMUNICATION CADENCE
// ════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.bg };
  tag(s, "Part Two — Communication Plan");
  title(s, "Communication & Reporting Cadence");
  divider(s);

  s.addShape(pres.ShapeType.rect, { x:0.45, y:1.14, w:9.3, h:0.3, fill:{ color:C.navy }, line:{ color:C.navy } });
  [["Meeting / Report",0.55,2.3],["Frequency",2.9,1.55],["Participants",4.5,1.75],["Format",6.3,1.5],["Owner",7.85,1.85]].forEach(([h,x,w]) =>
    s.addText(h, { x, y:1.16, w, h:0.26, fontSize:8.5, bold:true, color:C.white, fontFace:"Calibri" })
  );

  const comms = [
    ["Sprint Planning",        "Every 2 wks (Mon Wk 1)",  "Full dev team",          "2-hr Zoom",            "PM"],
    ["Daily Stand-up",         "Daily Mon–Fri (15 min)",   "Dev team",               "Async Slack / 9am call","PM"],
    ["Weekly ANM Update",      "Every Friday",             "PM + ANM PO",            "Email summary",        "PM"],
    ["Sprint Demo",            "End of every sprint (Fri)","Full team + ANM stakeholders","60-min live demo on device","PM + Lead Dev"],
    ["Sprint Retrospective",   "Every 2 weeks post-demo",  "Dev team only",          "30-min debrief",       "PM"],
    ["Design Review",          "Wk 1 & 2 (ad hoc)",       "Designer + ANM PO + PM", "Figma walkthrough",    "Designer"],
    ["Architecture Review",    "Wk 2 (once)",              "Architect + Backend + DevOps","Diagram review",  "Architect"],
    ["UAT Feedback Session",   "Wk 8 (2 sessions)",        "ANM pilot + QA + PM",    "Zoom with screen share","PM + QA"],
    ["Go-Live Readiness Review","Wk 9 Day 1",              "Full team + ANM PO",     "Checklist review (45 min)","PM + Architect"],
    ["Monthly Infra Report",   "Monthly (post-launch)",    "PM + ANM PO",            "Email: cost, uptime, usage","DevOps + PM"],
  ];

  comms.forEach(([meet, freq, who, fmt, owner], i) => {
    const ry = 1.46 + i * 0.39;
    s.addShape(pres.ShapeType.rect, { x:0.45, y:ry, w:9.3, h:0.39, fill:{ color:i%2===0?C.white:C.bg }, line:{ color:C.border, width:0.5 } });
    s.addText(meet,  { x:0.55, y:ry+0.05, w:2.28, h:0.28, fontSize:9, bold:true, color:C.navy, fontFace:"Calibri", valign:"middle" });
    s.addText(freq,  { x:2.9,  y:ry+0.05, w:1.53, h:0.28, fontSize:8, color:C.muted, fontFace:"Calibri", valign:"middle" });
    s.addText(who,   { x:4.5,  y:ry+0.05, w:1.73, h:0.28, fontSize:8, color:C.text,  fontFace:"Calibri", valign:"middle" });
    s.addText(fmt,   { x:6.3,  y:ry+0.05, w:1.48, h:0.28, fontSize:8, color:C.muted, fontFace:"Calibri", valign:"middle" });
    s.addText(owner, { x:7.85, y:ry+0.05, w:1.83, h:0.28, fontSize:8, bold:true, color:C.navyLt, fontFace:"Calibri", valign:"middle" });
  });

  // Change control note
  s.addShape(pres.ShapeType.rect, { x:0.45, y:5.22, w:9.3, h:0.24, fill:{ color:C.amber100 }, line:{ color:"FDE68A" } });
  s.addShape(pres.ShapeType.rect, { x:0.45, y:5.22, w:0.06, h:0.24, fill:{ color:C.gold }, line:{ color:C.gold } });
  s.addText("⚠  Change Control: Scope changes require a formal CR after Milestone 5 (Architecture Sign-Off). Architect assesses impact within 48 hrs; PM updates milestone plan accordingly.", {
    x:0.6, y:5.23, w:9.08, h:0.22, fontSize:7.5, color:"92400E", fontFace:"Calibri", valign:"middle",
  });

  footerBar(s);
}

// ════════════════════════════════════════════════
// SLIDE 15 — CLOSING
// ════════════════════════════════════════════════
{
  let s = pres.addSlide();
  s.background = { color: C.navy };

  s.addShape(pres.ShapeType.ellipse, { x:7.5, y:-1.2, w:4.0, h:4.0, fill:{ color:C.navyLt, transparency:72 }, line:{ color:C.navyLt, transparency:72 } });
  s.addShape(pres.ShapeType.ellipse, { x:-1.0, y:3.2, w:3.5, h:3.5, fill:{ color:C.navyLt, transparency:76 }, line:{ color:C.navyLt, transparency:76 } });

  s.addText("✅", { x:0.5, y:0.42, w:9, h:0.6, fontSize:30, align:"center", fontFace:"Calibri" });
  s.addText("Ready to Execute", { x:0.8, y:1.05, w:8.4, h:0.62, fontSize:34, bold:true, color:C.white, align:"center", fontFace:"Calibri" });
  s.addShape(pres.ShapeType.rect, { x:3.9, y:1.76, w:2.2, h:0.05, fill:{ color:C.gold }, line:{ color:C.gold } });
  s.addText("This plan gives ANM full visibility into every milestone, sprint, dependency,\nand go-live requirement — from Day 1 through to production launch and beyond.", {
    x:1.0, y:1.9, w:8.0, h:0.7, fontSize:11, color:"FFFFFFAA", align:"center", fontFace:"Calibri",
  });

  const highlights = [
    ["18", "Milestones Tracked"],
    ["132", "Story Points Planned"],
    ["40+", "Go-Live Checklist Items"],
    ["9 Wks", "To App Store Launch"],
  ];
  highlights.forEach(([val, lbl], i) => {
    const x = 0.5 + i * 2.28;
    s.addShape(pres.ShapeType.rect, { x, y:2.82, w:2.12, h:0.96, fill:{ color:"FFFFFF0A" }, line:{ color:"FFFFFF20", width:1 } });
    s.addText(val, { x, y:2.9, w:2.12, h:0.44, fontSize:26, bold:true, color:C.gold, align:"center", fontFace:"Calibri" });
    s.addText(lbl, { x, y:3.34, w:2.12, h:0.3, fontSize:8.5, color:"FFFFFFCC", align:"center", fontFace:"Calibri" });
  });

  const ctas = [["📅","Schedule Kickoff","Book discovery call with ANM leadership"],["📄","Sign & Start","30% deposit kicks off Week 1 immediately"],["❓","Questions?","hello@yourstudio.com"]];
  ctas.forEach(({ 0:icon, 1:lbl, 2:sub }, i) => {
    const x = 0.7 + i * 2.95;
    s.addShape(pres.ShapeType.rect, { x, y:4.0, w:2.72, h:0.9, fill:{ color:i===0?C.gold:"FFFFFF0F" }, line:{ color:i===0?C.gold:"FFFFFF30", width:1 } });
    s.addText(icon, { x, y:4.06, w:2.72, h:0.32, fontSize:16, align:"center", fontFace:"Calibri" });
    s.addText(lbl,  { x, y:4.4,  w:2.72, h:0.24, fontSize:9,  bold:true, color:i===0?C.navy:C.white, align:"center", fontFace:"Calibri" });
    s.addText(sub,  { x, y:4.65, w:2.72, h:0.2,  fontSize:7.5, color:i===0?"4A3800":"FFFFFFAA", align:"center", fontFace:"Calibri" });
  });

  s.addShape(pres.ShapeType.rect, { x:0, y:5.45, w:10, h:0.175, fill:{ color:C.gold }, line:{ color:C.gold } });
  s.addText("ANM Community App  ·  Delivery Milestone & Implementation Plan  ·  June 2025  ·  Private & Confidential", { x:0, y:5.455, w:10, h:0.155, fontSize:6.5, color:C.navy, align:"center", fontFace:"Calibri" });
}

// ── Write File ─────────────────────────────────────────────
pres.writeFile({ fileName: "ANM_Milestone_Implementation_Plan.pptx" })
  .then(() => console.log("✅  ANM_Milestone_Implementation_Plan.pptx generated successfully!"))
  .catch(err => console.error("❌  Error:", err));
