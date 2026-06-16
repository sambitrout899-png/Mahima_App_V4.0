/**
 * generate_mahima_anm_pptx.js
 * ────────────────────────────────────────────────────────────────────
 * Generates: Mahima_ANM_Community_Platform_Proposal.pptx
 *
 * 16-slide comprehensive proposal deck showing how Mahima App V4.0
 * (already-built community management platform) meets the ANM RFP —
 * with implementation roadmap, cost, pricing, AMC & platform charges.
 *
 * Run:
 *   npm install pptxgenjs
 *   node generate_mahima_anm_pptx.js
 * ────────────────────────────────────────────────────────────────────
 */

import pptxgen from "pptxgenjs";

// ─── Palette ────────────────────────────────────────────────────────
const C = {
  navy:    "1B2F6E", navylt:  "2A4090", navydim: "253D80",
  green:   "059669", greenlt: "34D399", greenbg: "ECFDF5",
  gold:    "F0A500", golddim: "D49200",
  white:   "FFFFFF", bg:      "F8FBF9", bgpurp:  "F5F3FF",
  border:  "D1FAE5", bordgr:  "A7F3D0",
  text:    "1A1A2E", muted:   "64748B",
  pale:    "CCE5FF", palegreen: "D1FAE5",
  red:     "EF4444", purple:  "7C3AED", purplt:  "8B5CF6",
  teal:    "0D9488", orange:  "EA580C",
};

const shadow = () => ({ type:"outer", blur:6, offset:2, angle:135, color:"000000", opacity:0.08 });

// ─── Helpers ─────────────────────────────────────────────────────────
function tag(s, label, y = 0.28, color = C.green) {
  s.addText(label, {
    x:0, y, w:"100%", h:0.22,
    fontSize:8.5, bold:true, color, align:"center",
    charSpacing:1.4,
  });
}
function title(s, text, y = 0.5, color = C.white, sz = 28) {
  s.addText(text, {
    x:0, y, w:"100%", h:0.6,
    fontSize:sz, bold:true, color, align:"center",
  });
}
function sub(s, text, y = 1.12, color = C.pale) {
  s.addText(text, {
    x:0, y, w:"100%", h:0.28,
    fontSize:10, color, align:"center",
  });
}
function divider(s, y = 1.06, color = C.gold) {
  s.addShape("rect", { x:0.55, y, w:8.9, h:0.04, fill:{ color }, line:{ type:"none" } });
}
function footerBar(s, text = "Mahima Community Platform  ·  ANM RFP Proposal  ·  Confidential  ·  June 2025") {
  s.addShape("rect", { x:0, y:5.435, w:10, h:0.19, fill:{ color:C.gold }, line:{ type:"none" } });
  s.addText(text, { x:0, y:5.437, w:10, h:0.18, fontSize:7, color:C.navy, align:"center" });
}
function statusBadge(s, x, y, label, bg, tc = C.white) {
  s.addShape("rect", { x, y, w:1.15, h:0.24, fill:{ color:bg }, line:{ type:"none" }, rounding:0.12 });
  s.addText(label, { x, y, w:1.15, h:0.24, fontSize:7.5, bold:true, color:tc, align:"center" });
}
function navCard(s, x, y, w, h, title, val, icon, bg = C.white, valColor = C.navy) {
  s.addShape("rect", { x:x+0.04, y:y+0.04, w, h, fill:{ color:"DDDDDD" }, line:{ type:"none" } });
  s.addShape("rect", { x, y, w, h, fill:{ color:bg }, line:{ color:C.border, pt:0.75 }, shadow:shadow() });
  s.addText(icon, { x, y:y+0.1, w, h:0.34, fontSize:18, align:"center" });
  s.addText(val, { x, y:y+0.44, w, h:0.32, fontSize:16, bold:true, color:valColor, align:"center" });
  s.addText(title, { x:x+0.08, y:y+0.76, w:w-0.16, h:0.28, fontSize:8, color:C.muted, align:"center", wrap:true });
}

let pres = new pptxgen();
pres.layout = "LAYOUT_16x9";

// ════════════════════════════════════════════════════════════════════
// SLIDE 1 — COVER
// ════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  // Full navy bg
  s.addShape("rect", { x:0, y:0, w:10, h:5.625, fill:{ color:C.navy }, line:{ type:"none" } });
  // Decorative ovals
  s.addShape("ellipse", { x:7.2, y:-1.0, w:3.5, h:3.5, fill:{ color:C.navydim }, line:{ type:"none" } });
  s.addShape("ellipse", { x:-1.1, y:3.8, w:2.8, h:2.8, fill:{ color:C.navydim }, line:{ type:"none" } });
  s.addShape("ellipse", { x:6.5, y:3.5, w:1.8, h:1.8, fill:{ color:C.navylt }, line:{ type:"none" } });
  // Green accent top
  s.addShape("rect", { x:0, y:0, w:10, h:0.07, fill:{ color:C.green }, line:{ type:"none" } });
  // Gold left edge
  s.addShape("rect", { x:0, y:0, w:0.06, h:5.625, fill:{ color:C.gold }, line:{ type:"none" } });

  // "ALREADY-BUILT PLATFORM  ·  ANM RFP SOLUTION" badge
  s.addShape("rect", { x:3.2, y:0.55, w:3.6, h:0.32, fill:{ color:C.green }, line:{ type:"none" }, rounding:0.06 });
  s.addText("✓  ALREADY-BUILT PLATFORM  ·  ANM RFP SOLUTION", {
    x:3.2, y:0.55, w:3.6, h:0.32, fontSize:7.5, bold:true, color:C.white, align:"center",
  });

  // Main headline
  s.addText("Mahima Community\nPlatform", {
    x:0.4, y:1.0, w:9.2, h:1.5, fontSize:40, bold:true, color:C.white, align:"center", lineSpacingMultiple:1.1,
  });
  s.addText("for ANM Health Community Programme", {
    x:0.4, y:2.5, w:9.2, h:0.38, fontSize:16, color:C.palegreen, align:"center",
  });

  // Gold divider
  s.addShape("rect", { x:2.8, y:3.0, w:4.4, h:0.04, fill:{ color:C.gold }, line:{ type:"none" } });

  // 4 bottom stats
  const stats = [
    ["V4.0","Released Platform"],
    ["8 Weeks","to Go-Live"],
    ["20+","Built Modules"],
    [".NET 8","Enterprise Grade"],
  ];
  stats.forEach(([v,l], i) => {
    const sx = 0.8 + i * 2.15;
    s.addText(v, { x:sx, y:3.2, w:2.0, h:0.36, fontSize:20, bold:true, color:C.gold, align:"center" });
    s.addText(l, { x:sx, y:3.56, w:2.0, h:0.22, fontSize:8.5, color:C.palegreen, align:"center" });
  });

  // Sub-text
  s.addText("ASP.NET Core  ·  React + Ionic/Capacitor  ·  PostgreSQL  ·  AWS S3  ·  Twilio  ·  Firebase Auth  ·  AI Bot", {
    x:0.4, y:3.95, w:9.2, h:0.22, fontSize:9, color:C.muted, align:"center",
  });
  s.addText("Submitted by: Your Company Name  |  Date: June 2025", {
    x:0.4, y:4.25, w:9.2, h:0.22, fontSize:9, color:C.muted, align:"center",
  });

  footerBar(s);
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 2 — EXECUTIVE SUMMARY
// ════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.addShape("rect", { x:0, y:0, w:10, h:5.625, fill:{ color:C.bg }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:10, h:0.07, fill:{ color:C.gold }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:0.06, h:5.625, fill:{ color:C.navy }, line:{ type:"none" } });

  tag(s, "•  EXECUTIVE SUMMARY  •", 0.1, C.gold);
  title(s, "Why Mahima Platform for ANM?", 0.32, C.navy, 24);
  divider(s, 1.0, C.green);

  const cards = [
    { icon:"🏗️", title:"Already Built", color:C.navy, tc:C.white,
      body:"Mahima V4.0 is a production-grade community management platform with 20+ live modules — no greenfield build, no surprises." },
    { icon:"⚡", title:"8-Week Delivery", color:C.green, tc:C.white,
      body:"Deploy a fully-customised ANM platform in 8 weeks vs. 10+ weeks for greenfield — faster ROI, earlier community impact." },
    { icon:"💰", title:"$164,500 All-In", color:C.gold, tc:C.navy,
      body:"One-time customisation investment — 43% less than greenfield alternatives. Proven platform, reduced project risk." },
    { icon:"🏛️", title:"Enterprise .NET 8", color:C.purple, tc:C.white,
      body:"ASP.NET Core .NET 8 backend with PostgreSQL — enterprise-grade security, audit logs, RBAC, and built-in AI assistant." },
  ];
  cards.forEach((c, i) => {
    const cx = 0.18 + i * 2.42, cy = 1.18;
    s.addShape("rect", { x:cx+0.04, y:cy+0.04, w:2.26, h:3.88, fill:{ color:"CCCCCC" }, line:{ type:"none" } });
    s.addShape("rect", { x:cx, y:cy, w:2.26, h:3.88, fill:{ color:c.color }, line:{ type:"none" }, shadow:shadow() });
    // Icon
    s.addText(c.icon, { x:cx, y:cy+0.14, w:2.26, h:0.42, fontSize:22, align:"center" });
    // Title
    s.addText(c.title, { x:cx+0.1, y:cy+0.58, w:2.06, h:0.42, fontSize:13, bold:true, color:c.tc, align:"center" });
    // Divider
    s.addShape("rect", { x:cx+0.22, y:cy+1.04, w:1.82, h:0.03, fill:{ color:c.tc === C.white ? "FFFFFF33" : "00000022" }, line:{ type:"none" } });
    // Body
    s.addText(c.body, { x:cx+0.1, y:cy+1.14, w:2.06, h:2.6, fontSize:9, color:c.tc, wrap:true, valign:"top" });
  });

  // Bottom note
  s.addText("Mahima V4.0 is in active production. No proof-of-concept — a real platform adapted for ANM community health workflows.", {
    x:0.18, y:5.2, w:9.64, h:0.22, fontSize:8.5, italic:true, color:C.muted, align:"center",
  });

  footerBar(s);
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 3 — PLATFORM AT A GLANCE
// ════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.addShape("rect", { x:0, y:0, w:10, h:5.625, fill:{ color:C.bg }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:10, h:0.07, fill:{ color:C.gold }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:0.06, h:5.625, fill:{ color:C.navy }, line:{ type:"none" } });

  tag(s, "•  MAHIMA V4.0  ·  PLATFORM OVERVIEW  •", 0.1, C.gold);
  title(s, "What's Already Built in Mahima V4.0", 0.32, C.navy, 22);
  divider(s, 1.0, C.green);

  s.addText("A fully-functional, production-deployed community platform with enterprise architecture — ready to adapt for ANM health workflows.", {
    x:0.4, y:1.06, w:9.2, h:0.24, fontSize:9.5, color:C.muted, align:"center",
  });

  const modules = [
    { icon:"👥", name:"User & Role Management", desc:"RBAC, multi-role, audit logs, Google OAuth + JWT" },
    { icon:"🏘️", name:"Teams & Groups", desc:"Create teams, assign leaders, bulk member management" },
    { icon:"📅", name:"Meetings & Scheduling", desc:"GPS-enabled events, RSVP, attendance tracking" },
    { icon:"✅", name:"Task Management", desc:"Assign tasks, track status, role-based analytics" },
    { icon:"📋", name:"Attendance Tracking", desc:"Daily check-in/out, status per member per day" },
    { icon:"💬", name:"Chat & Messaging", desc:"Group chats, DMs, read receipts, bulk SMS (Twilio)" },
    { icon:"📝", name:"Request Workflows", desc:"Submit → review → approve → complete (baptism/marriage model)" },
    { icon:"🤝", name:"Counselling Module", desc:"Candidates, sessions, cases with status enums" },
    { icon:"💰", name:"Expense & Payroll", desc:"Category expenses, payroll runs, payslip PDF generation" },
    { icon:"📊", name:"Analytics Dashboard", desc:"User, task, prayer overview — snapshot analytics" },
    { icon:"🤖", name:"AI Assistant Bot", desc:"OpenAI-compatible bot (PastorBot → HealthBot adaptation)" },
    { icon:"📁", name:"Document Management", desc:"AWS S3 attachments, file uploads, Google Drive sync" },
    { icon:"🔔", name:"Notifications & Automation", desc:"Recurring task alerts, scheduled bulk messages" },
    { icon:"🌐", name:"Multi-Language CMS", desc:"Admin-controlled UI translations + content pages" },
    { icon:"📄", name:"PDF Generation", desc:"iText7 + QuestPDF — certificates, reports, payslips" },
    { icon:"🔒", name:"Security & Audit", desc:"Full audit trail, role permissions, JWT + Google Auth" },
    { icon:"📧", name:"Email Notifications", desc:"MailKit SMTP — automated event & task emails" },
    { icon:"⏱️", name:"Timesheets", desc:"Staff time tracking, hours logging, payroll integration" },
  ];

  // 6-column × 3-row grid
  const COLS = 6, MW = 1.52, MH = 1.26, MX0 = 0.18, MY0 = 1.38, GAP = 0.05;
  modules.forEach((m, i) => {
    const col = i % COLS, row = Math.floor(i / COLS);
    const mx = MX0 + col * (MW + GAP), my = MY0 + row * (MH + GAP);
    s.addShape("rect", { x:mx, y:my, w:MW, h:MH, fill:{ color:C.white }, line:{ color:C.border, pt:0.75 }, shadow:shadow() });
    // Green top strip
    s.addShape("rect", { x:mx, y:my, w:MW, h:0.05, fill:{ color:C.green }, line:{ type:"none" } });
    s.addText(m.icon, { x:mx, y:my+0.06, w:MW, h:0.32, fontSize:16, align:"center" });
    s.addText(m.name, { x:mx+0.06, y:my+0.38, w:MW-0.12, h:0.32, fontSize:7.5, bold:true, color:C.navy, align:"center", wrap:true });
    s.addText(m.desc, { x:mx+0.06, y:my+0.7, w:MW-0.12, h:0.5, fontSize:6.5, color:C.muted, align:"center", wrap:true });
  });

  footerBar(s);
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 4 — TECHNOLOGY STACK
// ════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.addShape("rect", { x:0, y:0, w:10, h:5.625, fill:{ color:C.navy }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:10, h:0.07, fill:{ color:C.green }, line:{ type:"none" } });
  s.addShape("ellipse", { x:7.5, y:-0.8, w:3.2, h:3.2, fill:{ color:C.navydim }, line:{ type:"none" } });
  s.addShape("ellipse", { x:-0.8, y:3.6, w:2.4, h:2.4, fill:{ color:C.navydim }, line:{ type:"none" } });

  tag(s, "•  TECHNOLOGY ARCHITECTURE  •", 0.1, C.gold);
  title(s, "Mahima V4.0 — Technology Stack", 0.3, C.white, 24);
  divider(s, 0.98, C.green);

  const layers = [
    {
      label: "MOBILE FRONTEND", color: C.green,
      items: ["React + Vite + TypeScript", "Ionic / Capacitor", "Firebase Auth SDK", "Socket.IO Client (real-time)", "iOS + Android Builds"],
      x: 0.2, w: 2.55,
    },
    {
      label: "BACKEND API", color: C.gold,
      items: ["ASP.NET Core .NET 8", "C# REST Controllers", "JWT Bearer + Google OAuth", "SignalR / Socket.IO Hub", "MailKit Email  ·  Twilio SMS"],
      x: 2.92, w: 2.55,
    },
    {
      label: "DATA & STORAGE", color: C.purplt,
      items: ["PostgreSQL (Npgsql)", "EF Core 8 Migrations", "AWS S3 (Attachments)", "Google Drive Integration", "QuestPDF + iText7 Reports"],
      x: 5.64, w: 2.55,
    },
    {
      label: "INFRA & AI", color: C.teal,
      items: ["AWS EC2 + RDS + S3", "CloudFront CDN", "Nginx Reverse Proxy", "OpenAI-Compatible LLM (HealthBot)", "GitHub Actions CI/CD"],
      x: 8.36, w: 1.44,
    },
  ];

  // Note: 4th layer is narrower so we adjust
  const layersFull = [
    {
      label: "MOBILE FRONTEND", color: C.green,
      items: ["React + Vite + TypeScript", "Ionic / Capacitor", "Firebase Auth SDK", "Socket.IO Client", "iOS + Android Builds"],
      x: 0.18, w: 2.35,
    },
    {
      label: "BACKEND API (.NET 8)", color: C.gold,
      items: ["ASP.NET Core C#", "JWT + Google OAuth", "Socket.IO Hub", "MailKit  ·  Twilio SMS", "Swagger / OpenAPI"],
      x: 2.68, w: 2.35,
    },
    {
      label: "DATA & STORAGE", color: C.purplt,
      items: ["PostgreSQL via Npgsql", "EF Core 8 Migrations", "AWS S3 Attachments", "Google Drive API", "iText7 + QuestPDF"],
      x: 5.18, w: 2.35,
    },
    {
      label: "INFRA & AI", color: C.teal,
      items: ["AWS EC2 + RDS + S3", "CloudFront CDN", "Nginx + SSL", "OpenAI LLM (HealthBot)", "GitHub Actions CI/CD"],
      x: 7.68, w: 2.14,
    },
  ];

  const SY = 1.22, SH = 3.8;
  layersFull.forEach(layer => {
    // Shadow
    s.addShape("rect", { x:layer.x+0.04, y:SY+0.04, w:layer.w, h:SH, fill:{ color:"000000" }, line:{ type:"none" } });
    // Card bg (dark translucent)
    s.addShape("rect", { x:layer.x, y:SY, w:layer.w, h:SH, fill:{ color:"253B8A" }, line:{ color:"3050AA", pt:1 } });
    // Accent top
    s.addShape("rect", { x:layer.x, y:SY, w:layer.w, h:0.06, fill:{ color:layer.color }, line:{ type:"none" } });
    // Label
    s.addText(layer.label, {
      x:layer.x+0.08, y:SY+0.1, w:layer.w-0.16, h:0.3,
      fontSize:8.5, bold:true, color:layer.color, align:"center",
    });
    // Divider
    s.addShape("rect", { x:layer.x+0.12, y:SY+0.44, w:layer.w-0.24, h:0.025, fill:{ color:layer.color }, line:{ type:"none" } });
    // Items
    layer.items.forEach((item, k) => {
      s.addText(`▸  ${item}`, {
        x:layer.x+0.1, y:SY+0.56 + k * 0.56, w:layer.w-0.2, h:0.46,
        fontSize:8.5, color:C.palegreen, wrap:true,
      });
    });
  });

  // Bottom note
  s.addText("All services containerised with Docker · Deployable on AWS ECS Fargate or EC2 · CI/CD via GitHub Actions", {
    x:0.3, y:5.18, w:9.4, h:0.22, fontSize:8, color:C.muted, align:"center",
  });

  footerBar(s);
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 5 — ANM RFP ALIGNMENT MATRIX
// ════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.addShape("rect", { x:0, y:0, w:10, h:5.625, fill:{ color:C.bg }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:10, h:0.07, fill:{ color:C.gold }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:0.06, h:5.625, fill:{ color:C.navy }, line:{ type:"none" } });

  tag(s, "•  FEATURE ALIGNMENT  •", 0.1, C.gold);
  title(s, "ANM RFP Requirements → Mahima Module Mapping", 0.3, C.navy, 20);
  divider(s, 0.98, C.green);

  // Legend
  const legends = [
    { color:C.green, label:"✓  Ready to Deploy" },
    { color:C.gold,  label:"⚙  Adapt / Configure" },
    { color:C.purple, label:"🔧  New Build for ANM" },
  ];
  legends.forEach((l, i) => {
    s.addShape("rect", { x:0.3 + i * 3.0, y:1.04, w:2.7, h:0.22, fill:{ color:l.color }, line:{ type:"none" }, rounding:0.05 });
    s.addText(l.label, { x:0.3 + i * 3.0, y:1.04, w:2.7, h:0.22, fontSize:8, bold:true, color:C.white, align:"center" });
  });

  // Table header
  const hcols = [{ x:0.1,w:3.2,"t":"ANM RFP Requirement" },{ x:3.35,w:3.2,"t":"Mahima Module" },{ x:6.6,w:2.0,"t":"Status" },{ x:8.65,w:1.25,"t":"Effort" }];
  s.addShape("rect", { x:0.1, y:1.34, w:9.8, h:0.3, fill:{ color:C.navy }, line:{ type:"none" } });
  hcols.forEach(col => {
    s.addText(col.t, { x:col.x, y:1.34, w:col.w, h:0.3, fontSize:8, bold:true, color:C.white, align:"center" });
  });

  const rows = [
    ["ANM Worker Registration & Profiles",         "Users + Role Management",         "Ready",    "None",   C.green,  C.greenbg],
    ["Team / Sub-Centre Grouping",                  "Teams + Team Members",            "Ready",    "None",   C.green,  C.white],
    ["Field Visit Scheduling (GPS)",                "Meetings (lat/lng enabled)",       "Adapt",    "2 days", C.gold,   C.greenbg],
    ["Beneficiary Registration (ANC/Immunisation)", "Baptism/Marriage Workflow",       "Adapt",    "5 days", C.gold,   C.white],
    ["Health Counselling Sessions",                 "Counselling Module",              "Adapt",    "3 days", C.gold,   C.greenbg],
    ["Attendance & Daily Check-in",                 "Attendance Records",              "Ready",    "None",   C.green,  C.white],
    ["Task & Duty Assignments",                     "Task Management",                 "Ready",    "None",   C.green,  C.greenbg],
    ["Chat & Bulk SMS Broadcast",                   "Chat + Twilio SMS",               "Ready",    "None",   C.green,  C.white],
    ["MCP / RCH Report Generation",                 "QuestPDF + iText7 (new templates)","New Build","8 days",C.purple, C.greenbg],
    ["Analytics & KPI Dashboard",                   "Analytics Module + Admin Landing", "Adapt",   "4 days", C.gold,   C.white],
    ["Document & Media Upload",                     "Attachments (AWS S3)",            "Ready",    "None",   C.green,  C.greenbg],
    ["AI Health Assistant",                         "PastorBot → HealthBot",           "Adapt",    "1 day",  C.gold,   C.white],
  ];

  rows.forEach((row, i) => {
    const ry = 1.66 + i * 0.31;
    s.addShape("rect", { x:0.1, y:ry, w:9.8, h:0.3, fill:{ color:row[5] }, line:{ color:C.border, pt:0.5 } });
    s.addText(row[0], { x:0.18, y:ry+0.02, w:3.1, h:0.26, fontSize:7.5, color:C.text });
    s.addText(row[1], { x:3.38, y:ry+0.02, w:3.1, h:0.26, fontSize:7.5, color:C.muted });
    s.addShape("rect", { x:6.62, y:ry+0.04, w:1.95, h:0.22, fill:{ color:row[4] }, line:{ type:"none" }, rounding:0.04 });
    s.addText(row[2], { x:6.62, y:ry+0.04, w:1.95, h:0.22, fontSize:7, bold:true, color:C.white, align:"center" });
    s.addText(row[3], { x:8.68, y:ry+0.04, w:1.2, h:0.22, fontSize:7.5, bold:true, color:row[4], align:"center" });
  });

  footerBar(s);
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 6 — INCLUSION MATRIX: PRE-BUILT vs. NEW BUILD
// ════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.addShape("rect", { x:0, y:0, w:10, h:5.625, fill:{ color:C.navy }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:10, h:0.07, fill:{ color:C.green }, line:{ type:"none" } });
  s.addShape("ellipse", { x:7.8, y:-0.6, w:2.8, h:2.8, fill:{ color:C.navydim }, line:{ type:"none" } });

  tag(s, "•  WHAT'S INCLUDED  •", 0.1, C.gold);
  title(s, "Pre-Built Modules vs. ANM-Specific New Builds", 0.3, C.white, 22);
  divider(s, 0.98, C.green);

  // LEFT: Pre-built
  s.addShape("rect", { x:0.18, y:1.14, w:4.5, h:4.12, fill:{ color:"1D3A7A" }, line:{ color:C.green, pt:1.5 } });
  s.addShape("rect", { x:0.18, y:1.14, w:4.5, h:0.06, fill:{ color:C.green }, line:{ type:"none" } });
  s.addText("✓  PRE-BUILT · READY FOR ANM  (saves ~70% build cost)", {
    x:0.26, y:1.22, w:4.34, h:0.32, fontSize:8.5, bold:true, color:C.green,
  });
  const prebuilt = [
    "User registration, login & role-based access control",
    "Teams, group management & team leader assignment",
    "Meeting/event scheduling with GPS location capture",
    "Daily attendance check-in & status tracking",
    "Task creation, assignment & completion tracking",
    "Group chat rooms & 1-on-1 direct messaging",
    "Twilio SMS broadcast for bulk notifications",
    "Expense tracking, payroll & PDF payslips",
    "AWS S3 document & media file storage",
    "Audit logs, role permissions & security controls",
    "AI chatbot (OpenAI-compatible, easy prompt swap)",
    "Multi-language CMS & automated message scheduler",
  ];
  prebuilt.forEach((item, i) => {
    s.addText(`✓  ${item}`, {
      x:0.3, y:1.6 + i * 0.295, w:4.3, h:0.28,
      fontSize:8.5, color:C.palegreen,
    });
  });

  // RIGHT: New builds
  s.addShape("rect", { x:4.88, y:1.14, w:4.94, h:4.12, fill:{ color:"1D3A7A" }, line:{ color:C.gold, pt:1.5 } });
  s.addShape("rect", { x:4.88, y:1.14, w:4.94, h:0.06, fill:{ color:C.gold }, line:{ type:"none" } });
  s.addText("🔧  NEW BUILD FOR ANM  (targeted custom work)", {
    x:4.96, y:1.22, w:4.78, h:0.32, fontSize:8.5, bold:true, color:C.gold,
  });
  const newBuilds = [
    ["Beneficiary Registration", "ANC card, pregnancy tracking, newborn registration"],
    ["Immunisation Schedule", "Vaccination calendar, dose tracker, due-date alerts"],
    ["Home Visit Report", "Structured field visit form with GPS stamp"],
    ["MCP / RCH Report Templates", "Government report formats using QuestPDF"],
    ["Health KPI Dashboard", "Maternal health metrics, coverage %, alerts"],
    ["ANM Mobile UI (iOS)", "Capacitor iOS build + ANM-branded screens"],
    ["Map View — Field Visits", "Leaflet/MapBox map of visit locations"],
  ];
  newBuilds.forEach(([title, desc], i) => {
    const ry = 1.62 + i * 0.5;
    s.addText(`▸  ${title}`, { x:4.98, y:ry, w:4.7, h:0.24, fontSize:9, bold:true, color:C.gold });
    s.addText(`   ${desc}`, { x:4.98, y:ry+0.24, w:4.7, h:0.22, fontSize:8, color:C.pale });
  });

  footerBar(s);
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 7 — IMPLEMENTATION PHASES
// ════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.addShape("rect", { x:0, y:0, w:10, h:5.625, fill:{ color:C.bg }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:10, h:0.07, fill:{ color:C.gold }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:0.06, h:5.625, fill:{ color:C.navy }, line:{ type:"none" } });

  tag(s, "•  IMPLEMENTATION APPROACH  •", 0.1, C.gold);
  title(s, "5-Phase Customisation & Deployment Plan", 0.3, C.navy, 22);
  divider(s, 0.98, C.green);

  const phases = [
    { num:"01", weeks:"Weeks 1–2", name:"Platform Kickoff\n& Discovery", color:C.navy,
      items:["RFP requirements mapping","Domain vocabulary alignment","ANM UI wireframes","Dev environment setup"] },
    { num:"02", weeks:"Weeks 3–4", name:"Domain\nCustomisation", color:C.teal,
      items:["Rebrand UI → ANM theme","Rename modules (beneficiary, visit)","Configure roles & permissions","Adapt existing workflows"] },
    { num:"03", weeks:"Weeks 5–6", name:"ANM-Specific\nModules", color:C.green,
      items:["Beneficiary registration","Immunisation tracker","Home visit GPS form","MCP/RCH report templates"] },
    { num:"04", weeks:"Week 7", name:"Integration\n& iOS Build", color:C.purple,
      items:["Capacitor iOS build","End-to-end integration","Security & performance test","App Store submission prep"] },
    { num:"05", weeks:"Week 8", name:"UAT &\nGo-Live", color:C.orange,
      items:["User acceptance testing","Production deployment","Training & handover","App Store submissions"] },
  ];

  const PY = 1.28, PH = 3.94, PW = 1.76, GAP = 0.08;
  phases.forEach((ph, i) => {
    const px = 0.18 + i * (PW + GAP);
    // Shadow
    s.addShape("rect", { x:px+0.04, y:PY+0.04, w:PW, h:PH, fill:{ color:"CCCCCC" }, line:{ type:"none" } });
    // Card
    s.addShape("rect", { x:px, y:PY, w:PW, h:PH, fill:{ color:C.white }, line:{ color:C.border, pt:0.75 }, shadow:shadow() });
    // Top accent
    s.addShape("rect", { x:px, y:PY, w:PW, h:0.07, fill:{ color:ph.color }, line:{ type:"none" } });
    // Phase number
    s.addShape("ellipse", { x:px+PW/2-0.32, y:PY+0.1, w:0.64, h:0.64, fill:{ color:ph.color }, line:{ type:"none" } });
    s.addText(ph.num, { x:px+PW/2-0.32, y:PY+0.1, w:0.64, h:0.64, fontSize:13, bold:true, color:C.white, align:"center", valign:"middle" });
    // Weeks badge
    s.addShape("rect", { x:px+0.1, y:PY+0.82, w:PW-0.2, h:0.22, fill:{ color:ph.color + "22" }, line:{ type:"none" } });
    s.addText(ph.weeks, { x:px+0.1, y:PY+0.82, w:PW-0.2, h:0.22, fontSize:7.5, bold:true, color:ph.color, align:"center" });
    // Phase name
    s.addText(ph.name, { x:px+0.08, y:PY+1.1, w:PW-0.16, h:0.56, fontSize:10, bold:true, color:ph.color, align:"center", wrap:true });
    // Divider
    s.addShape("rect", { x:px+0.16, y:PY+1.7, w:PW-0.32, h:0.025, fill:{ color:C.border }, line:{ type:"none" } });
    // Items
    ph.items.forEach((item, k) => {
      s.addText(`•  ${item}`, { x:px+0.1, y:PY+1.78+k*0.5, w:PW-0.2, h:0.46, fontSize:8, color:C.muted, wrap:true });
    });
  });

  // Hypercare bar below
  s.addShape("rect", { x:0.18, y:5.24, w:9.64, h:0.18, fill:{ color:C.green }, line:{ type:"none" } });
  s.addText("★  Weeks 9–10: FREE 1-Month Hypercare  ·  Bug fixes · Monitoring · Onboarding · Health check", {
    x:0.18, y:5.24, w:9.64, h:0.18, fontSize:8, bold:true, color:C.white, align:"center",
  });

  footerBar(s);
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 8 — 8-WEEK GANTT ROADMAP
// ════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.addShape("rect", { x:0, y:0, w:10, h:5.625, fill:{ color:C.bg }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:10, h:0.07, fill:{ color:C.gold }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:0.06, h:5.625, fill:{ color:C.navy }, line:{ type:"none" } });

  tag(s, "•  8-WEEK IMPLEMENTATION GANTT  •", 0.1, C.gold);
  title(s, "Delivery Roadmap — Mahima ANM Platform", 0.3, C.navy, 22);
  divider(s, 0.98, C.green);

  // Column headers
  const LABELS = { x:0.15, w:2.55 };
  const COL_X0 = 2.78, COL_W = 0.66, COL_GAP = 0.02;
  const weeks = ["W1","W2","W3","W4","W5","W6","W7","W8","HC1","HC2"];
  const wColors = ["1B2F6E","1B2F6E","0D9488","0D9488","059669","059669","7C3AED","EA580C","D49200","D49200"];

  s.addShape("rect", { x:LABELS.x, y:1.08, w:LABELS.w, h:0.3, fill:{ color:C.navy }, line:{ type:"none" } });
  s.addText("Workstream", { x:LABELS.x, y:1.08, w:LABELS.w, h:0.3, fontSize:8, bold:true, color:C.white, align:"center" });
  weeks.forEach((wk, i) => {
    const wx = COL_X0 + i * (COL_W + COL_GAP);
    s.addShape("rect", { x:wx, y:1.08, w:COL_W, h:0.3, fill:{ color:wColors[i] }, line:{ type:"none" } });
    s.addText(wk, { x:wx, y:1.08, w:COL_W, h:0.3, fontSize:7.5, bold:true, color:C.white, align:"center" });
  });

  const rows = [
    { name:"Project Management",     color:C.navy,    weeks:[1,1,1,1,1,1,1,1,1,1] },
    { name:"Platform Discovery & Mapping", color:C.navy, weeks:[1,1,0,0,0,0,0,0,0,0] },
    { name:"UI/UX Design (ANM)",     color:C.teal,   weeks:[1,1,1,1,0,0,0,0,0,0] },
    { name:"Domain Customisation",   color:C.teal,   weeks:[0,0,1,1,0,0,0,0,0,0] },
    { name:"Beneficiary & ANC Modules",color:C.green, weeks:[0,0,0,0,1,1,0,0,0,0] },
    { name:"Immunisation & Visit Forms",color:C.green,weeks:[0,0,0,0,1,1,0,0,0,0] },
    { name:"MCP/RCH Report Templates",color:C.green,  weeks:[0,0,0,1,1,0,0,0,0,0] },
    { name:"iOS Build + Integration", color:C.purple, weeks:[0,0,0,0,0,0,1,0,0,0] },
    { name:"QA & Security Testing",  color:C.purple, weeks:[0,0,0,0,0,1,1,0,0,0] },
    { name:"UAT & Production Deploy",color:C.orange, weeks:[0,0,0,0,0,0,0,1,0,0] },
    { name:"Hypercare Support",      color:C.golddim, weeks:[0,0,0,0,0,0,0,0,1,1] },
  ];

  rows.forEach((row, i) => {
    const ry = 1.4 + i * 0.365;
    const rowBg = i % 2 === 0 ? C.white : C.greenbg;
    s.addShape("rect", { x:LABELS.x, y:ry, w:LABELS.w, h:0.34, fill:{ color:rowBg }, line:{ color:C.border, pt:0.5 } });
    s.addText(row.name, { x:LABELS.x+0.06, y:ry+0.04, w:LABELS.w-0.12, h:0.26, fontSize:7.5, color:C.text, wrap:true });
    weeks.forEach((_, wi) => {
      const wx = COL_X0 + wi * (COL_W + COL_GAP);
      if (row.weeks[wi]) {
        s.addShape("rect", { x:wx+0.03, y:ry+0.04, w:COL_W-0.06, h:0.26, fill:{ color:row.color }, line:{ type:"none" } });
      } else {
        s.addShape("rect", { x:wx, y:ry, w:COL_W, h:0.34, fill:{ color:rowBg }, line:{ color:C.border, pt:0.25 } });
      }
    });
  });

  // Phase labels at bottom
  const phaseLabels = [
    { x:COL_X0, w:(COL_W+COL_GAP)*2-0.02, label:"Phase 1", color:C.navy },
    { x:COL_X0+(COL_W+COL_GAP)*2, w:(COL_W+COL_GAP)*2-0.02, label:"Phase 2", color:C.teal },
    { x:COL_X0+(COL_W+COL_GAP)*4, w:(COL_W+COL_GAP)*2-0.02, label:"Phase 3", color:C.green },
    { x:COL_X0+(COL_W+COL_GAP)*6, w:COL_W, label:"Phase 4", color:C.purple },
    { x:COL_X0+(COL_W+COL_GAP)*7, w:COL_W, label:"Phase 5", color:C.orange },
    { x:COL_X0+(COL_W+COL_GAP)*8, w:(COL_W+COL_GAP)*2-0.02, label:"Hypercare", color:C.golddim },
  ];
  phaseLabels.forEach(pl => {
    s.addShape("rect", { x:pl.x, y:5.45-0.22, w:pl.w, h:0.18, fill:{ color:pl.color }, line:{ type:"none" } });
    s.addText(pl.label, { x:pl.x, y:5.45-0.22, w:pl.w, h:0.18, fontSize:7, bold:true, color:C.white, align:"center" });
  });

  footerBar(s);
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 9 — RESOURCE PLAN
// ════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.addShape("rect", { x:0, y:0, w:10, h:5.625, fill:{ color:C.bg }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:10, h:0.07, fill:{ color:C.gold }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:0.06, h:5.625, fill:{ color:C.navy }, line:{ type:"none" } });

  tag(s, "•  RESOURCE LOADING  •", 0.1, C.gold);
  title(s, "Team Allocation & Day Matrix — 8-Week + Hypercare", 0.3, C.navy, 20);
  divider(s, 0.98, C.green);

  // Table geometry
  const ROLE_X = 0.1, ROLE_W = 2.15;
  const RATE_X = 2.28, RATE_W = 0.72;
  const W_X0 = 3.03, W_W = 0.56, W_GAP = 0.02;
  const TOT_X = 9.05, TOT_W = 0.58;
  const HY = 1.08, HR = 0.28;

  // Header row
  const allCols = [
    { x:ROLE_X, w:ROLE_W, t:"Role" },
    { x:RATE_X, w:RATE_W, t:"Day Rate" },
    ...[...Array(10)].map((_, i) => ({
      x: W_X0 + i*(W_W+W_GAP), w: W_W,
      t: i < 8 ? `W${i+1}` : `HC${i-7}`,
    })),
    { x:TOT_X, w:TOT_W, t:"Days" },
  ];
  s.addShape("rect", { x:0.1, y:HY, w:9.82, h:HR, fill:{ color:C.navy }, line:{ type:"none" } });
  allCols.forEach(col => {
    s.addText(col.t, { x:col.x, y:HY, w:col.w, h:HR, fontSize:7.5, bold:true, color:C.white, align:"center" });
  });

  const resourceData = [
    { role:"Project Manager",          rate:"$900",  days:[5,5,3,2,2,2,2,3,2,1], total:27 },
    { role:"Solution Architect",       rate:"$1,200",days:[4,3,1,0,0,0,0,1,0,0], total:9  },
    { role:"UI/UX Designer",           rate:"$800",  days:[4,5,3,1,0,0,0,0,0,0], total:13 },
    { role:"Full-Stack Dev (.NET)",    rate:"$950",  days:[1,2,5,5,5,3,1,0,1,0], total:23 },
    { role:"Mobile Developer",         rate:"$950",  days:[0,1,2,3,4,5,3,1,1,1], total:21 },
    { role:"DevOps Engineer",          rate:"$850",  days:[3,2,1,1,1,1,2,3,2,1], total:17 },
    { role:"QA Engineer",              rate:"$750",  days:[0,0,1,1,1,1,4,3,1,1], total:13 },
  ];

  const totals = [18, 18, 16, 13, 13, 12, 12, 11, 7, 4]; // col totals

  resourceData.forEach((r, i) => {
    const ry = HY + HR + i * 0.44;
    const bg = i % 2 === 0 ? C.white : C.greenbg;
    s.addShape("rect", { x:0.1, y:ry, w:9.82, h:0.42, fill:{ color:bg }, line:{ color:C.border, pt:0.4 } });
    s.addText(r.role, { x:ROLE_X+0.04, y:ry+0.04, w:ROLE_W-0.08, h:0.34, fontSize:8, color:C.text, bold:true });
    s.addText(r.rate, { x:RATE_X, y:ry+0.04, w:RATE_W, h:0.34, fontSize:8, color:C.navy, bold:true, align:"center" });
    r.days.forEach((d, wi) => {
      const wx = W_X0 + wi*(W_W+W_GAP);
      if (d > 0) {
        s.addShape("rect", { x:wx+0.03, y:ry+0.07, w:W_W-0.06, h:0.28, fill:{ color: wi >= 8 ? C.golddim : C.green }, line:{ type:"none" } });
        s.addText(`${d}`, { x:wx+0.03, y:ry+0.07, w:W_W-0.06, h:0.28, fontSize:8, bold:true, color:C.white, align:"center" });
      }
    });
    s.addShape("rect", { x:TOT_X, y:ry+0.06, w:TOT_W, h:0.3, fill:{ color:C.navy }, line:{ type:"none" }, rounding:0.04 });
    s.addText(`${r.total}d`, { x:TOT_X, y:ry+0.06, w:TOT_W, h:0.3, fontSize:8.5, bold:true, color:C.white, align:"center" });
  });

  // Totals row
  const TOTAL_Y = HY + HR + 7 * 0.44;
  s.addShape("rect", { x:0.1, y:TOTAL_Y, w:9.82, h:0.36, fill:{ color:C.navy }, line:{ type:"none" } });
  s.addText("DAILY TOTAL", { x:ROLE_X+0.04, y:TOTAL_Y+0.04, w:ROLE_W-0.08, h:0.28, fontSize:8, bold:true, color:C.white });
  totals.forEach((d, wi) => {
    const wx = W_X0 + wi*(W_W+W_GAP);
    s.addText(`${d}`, { x:wx, y:TOTAL_Y+0.04, w:W_W, h:0.28, fontSize:8, bold:true, color:C.gold, align:"center" });
  });
  s.addText("123d", { x:TOT_X, y:TOTAL_Y+0.04, w:TOT_W, h:0.28, fontSize:8.5, bold:true, color:C.gold, align:"center" });

  // Note
  s.addText("123 total days across 7 roles over 8 weeks + 2 weeks hypercare.  All rates are USD day rates.", {
    x:0.1, y:5.18, w:9.82, h:0.2, fontSize:7.5, italic:true, color:C.muted, align:"center",
  });

  footerBar(s);
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 10 — WHY MAHIMA PLATFORM (vs GREENFIELD)
// ════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.addShape("rect", { x:0, y:0, w:10, h:5.625, fill:{ color:C.navy }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:10, h:0.07, fill:{ color:C.gold }, line:{ type:"none" } });
  s.addShape("ellipse", { x:7.5, y:-0.8, w:3, h:3, fill:{ color:C.navydim }, line:{ type:"none" } });

  tag(s, "•  COMPETITIVE ADVANTAGE  •", 0.1, C.gold);
  title(s, "Mahima Platform vs. Greenfield Build", 0.3, C.white, 24);
  divider(s, 0.98, C.green);

  // Table header
  const cols = [
    { x:0.15, w:3.8, t:"Dimension" },
    { x:4.0,  w:2.7, t:"Greenfield Build" },
    { x:6.75, w:3.1, t:"Mahima Platform (Recommended ★)" },
  ];
  s.addShape("rect", { x:0.15, y:1.12, w:9.7, h:0.3, fill:{ color:"2A4090" }, line:{ type:"none" } });
  cols.forEach(col => {
    s.addText(col.t, { x:col.x+0.04, y:1.12, w:col.w-0.08, h:0.3, fontSize:8.5, bold:true, color:col.t.includes("Mahima") ? C.gold : C.pale, align:"center" });
  });

  const compareRows = [
    ["Timeline to Go-Live",       "10–14 weeks",        "8 weeks  ✓ 30% faster"],
    ["Implementation Cost",       "$289,800",           "$164,500  ✓ 43% saving"],
    ["Technology Risk",           "High — unproven",    "Low — production-tested"],
    ["Backend Framework",         "Node.js / Express",  ".NET 8 C# — enterprise grade"],
    ["Database",                  "MongoDB Atlas",      "PostgreSQL — structured health data"],
    ["Built-in AI Assistant",     "Not included",       "✓ HealthBot (OpenAI-compatible)"],
    ["Accounting & Payroll",      "Not included",       "✓ Full accounting module built-in"],
    ["Multi-Language Support",    "Not included",       "✓ Admin-controlled UI translations"],
    ["PDF Report Generation",     "Custom build",       "✓ iText7 + QuestPDF pre-integrated"],
    ["Google Drive Integration",  "Not included",       "✓ Google Drive sync built-in"],
    ["Audit Log & Compliance",    "Basic",              "✓ Full audit trail on all actions"],
  ];

  compareRows.forEach((row, i) => {
    const ry = 1.44 + i * 0.36;
    const bg = i % 2 === 0 ? "1E3580" : "253B8A";
    s.addShape("rect", { x:0.15, y:ry, w:9.7, h:0.34, fill:{ color:bg }, line:{ color:"3050AA", pt:0.4 } });
    s.addText(row[0], { x:0.22, y:ry+0.04, w:3.66, h:0.26, fontSize:8.5, color:C.palegreen });
    // Greenfield (red pill)
    s.addShape("rect", { x:4.04, y:ry+0.04, w:2.62, h:0.26, fill:{ color:"5C0A0A" }, line:{ type:"none" }, rounding:0.04 });
    s.addText(row[1], { x:4.04, y:ry+0.04, w:2.62, h:0.26, fontSize:8, color:"FF9999", align:"center" });
    // Mahima (green pill)
    s.addShape("rect", { x:6.79, y:ry+0.04, w:3.02, h:0.26, fill:{ color:"065F46" }, line:{ type:"none" }, rounding:0.04 });
    s.addText(row[2], { x:6.79, y:ry+0.04, w:3.02, h:0.26, fontSize:8, bold:true, color:C.palegreen, align:"center" });
  });

  footerBar(s);
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 11 — PRICING (ONE-TIME CUSTOMISATION)
// ════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.addShape("rect", { x:0, y:0, w:10, h:5.625, fill:{ color:C.navy }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:10, h:0.07, fill:{ color:C.green }, line:{ type:"none" } });
  s.addShape("ellipse", { x:7.5, y:-0.8, w:3.2, h:3.2, fill:{ color:C.navydim }, line:{ type:"none" } });
  s.addShape("ellipse", { x:-0.8, y:3.8, w:2.5, h:2.5, fill:{ color:C.navydim }, line:{ type:"none" } });

  tag(s, "•  ONE-TIME CUSTOMISATION INVESTMENT  •", 0.1, C.gold);
  title(s, "Mahima Platform Adaptation for ANM", 0.3, C.white, 24);
  divider(s, 0.98, C.green);

  // LEFT — Price
  s.addText("TOTAL ONE-TIME COST", { x:0.55, y:1.12, w:4.5, h:0.28, fontSize:9.5, bold:true, color:C.gold });
  s.addText("$164,500", { x:0.55, y:1.4, w:5.0, h:0.92, fontSize:58, bold:true, color:C.white });
  s.addText("USD  ·  All-inclusive  ·  No hidden costs", {
    x:0.55, y:2.3, w:4.6, h:0.24, fontSize:9.5, color:"99BBFF",
  });

  s.addShape("rect", { x:0.55, y:2.62, w:4.4, h:0.03, fill:{ color:C.navydim }, line:{ type:"none" } });

  s.addText("WHAT'S INCLUDED", { x:0.55, y:2.72, w:4.4, h:0.24, fontSize:8.5, bold:true, color:C.gold });
  const inclusions = [
    "✓  Mahima V4.0 platform license + full source code",
    "✓  ANM-specific UI rebrand (iOS & Android)",
    "✓  Beneficiary, ANC & immunisation modules",
    "✓  MCP / RCH government report templates",
    "✓  GPS home visit form + map view",
    "✓  Health KPI dashboard customisation",
    "✓  PostgreSQL DB setup + EF Core migrations",
    "✓  AWS deployment (EC2 + RDS + S3 + CloudFront)",
  ];
  inclusions.forEach((item, k) => {
    s.addText(item, { x:0.55, y:3.0+k*0.28, w:4.6, h:0.26, fontSize:8.5, color:"CCDDFF" });
  });

  // RIGHT — FREE Hypercare card
  s.addShape("rect", { x:5.35, y:1.1, w:4.45, h:3.64, fill:{ color:C.gold }, line:{ type:"none" } });
  s.addShape("rect", { x:5.35, y:1.1, w:4.45, h:0.06, fill:{ color:C.golddim }, line:{ type:"none" } });

  s.addText("FREE", { x:5.35, y:1.18, w:4.45, h:0.72, fontSize:54, bold:true, color:C.navy, align:"center" });
  s.addText("1-MONTH HYPERCARE", { x:5.43, y:1.9, w:4.28, h:0.3, fontSize:13.5, bold:true, color:C.navy, align:"center" });
  s.addText("Included in adaptation cost  ·  No extra charge", {
    x:5.5, y:2.22, w:4.1, h:0.22, fontSize:9, color:"4A3800", align:"center",
  });
  s.addShape("rect", { x:5.58, y:2.48, w:4.12, h:0.03, fill:{ color:"4A3800" }, line:{ type:"none" } });

  const hcItems = [
    "🔧  Bug fixes & same-day response",
    "📊  AWS CloudWatch monitoring",
    "🔒  Security patch deployment",
    "👥  ANM admin onboarding session",
    "📋  Go-live health check & status report",
  ];
  hcItems.forEach((item, k) => {
    s.addText(item, { x:5.52, y:2.58+k*0.34, w:4.2, h:0.3, fontSize:9, color:C.navy });
  });
  s.addText("Estimated value: ~$5,000  ·  Yours absolutely free.", {
    x:5.43, y:4.44, w:4.28, h:0.24, fontSize:8.5, bold:true, italic:true, color:"4A3800", align:"center",
  });

  // Bottom stats
  const stats = [
    ["43%", "Less than greenfield"],
    ["8 Weeks","Go-live timeline"],
    ["123 Days","Total team effort"],
    ["20+","Modules pre-built"],
  ];
  stats.forEach(([v,l], i) => {
    const sx = 0.55 + i * 2.2;
    s.addText(v, { x:sx, y:4.88, w:2.0, h:0.28, fontSize:14, bold:true, color:C.gold, align:"center" });
    s.addText(l, { x:sx, y:5.14, w:2.0, h:0.2, fontSize:7.5, color:"99BBFF", align:"center" });
  });

  footerBar(s);
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 12 — PLATFORM & INFRASTRUCTURE CHARGES
// ════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.addShape("rect", { x:0, y:0, w:10, h:5.625, fill:{ color:C.bg }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:10, h:0.07, fill:{ color:C.gold }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:0.06, h:5.625, fill:{ color:C.navy }, line:{ type:"none" } });

  tag(s, "•  PLATFORM & INFRASTRUCTURE CHARGES  •", 0.1, C.gold);
  title(s, "Monthly Running Costs — Post Go-Live", 0.3, C.navy, 22);
  divider(s, 0.98, C.green);

  s.addText("These are third-party platform costs passed to the client at actuals. All estimates based on up to 500 ANM users.", {
    x:0.4, y:1.04, w:9.2, h:0.22, fontSize:9, color:C.muted, align:"center",
  });

  // AWS section
  const categories = [
    {
      title:"AWS Infrastructure", color:C.navy, icon:"☁️",
      x:0.15, w:4.65,
      rows:[
        ["EC2 t3.medium (App Server)","~$35/mo"],
        ["RDS db.t3.micro (PostgreSQL)","~$25/mo"],
        ["S3 Storage 100GB + requests","~$10/mo"],
        ["CloudFront CDN (distribution)","~$8/mo"],
        ["Elastic Load Balancer","~$18/mo"],
        ["NAT Gateway","~$15/mo"],
        ["AWS Total","~$111/mo"],
      ],
    },
    {
      title:"Third-Party Services", color:C.teal, icon:"🔌",
      x:4.98, w:4.87,
      rows:[
        ["Twilio SMS (1,000 SMS/mo avg)","~$8/mo"],
        ["Twilio Phone Number","~$1/mo"],
        ["Firebase Auth (up to 50K MAU)","Free"],
        ["MailKit SMTP (SendGrid if needed)","~$5/mo"],
        ["Domain Name (annual / 12)","~$1/mo"],
        ["SSL Certificate (Let's Encrypt)","Free"],
        ["3rd-Party Total","~$15/mo"],
      ],
    },
  ];

  categories.forEach(cat => {
    // Card
    s.addShape("rect", { x:cat.x, y:1.34, w:cat.w, h:3.82, fill:{ color:C.white }, line:{ color:C.border, pt:0.75 }, shadow:shadow() });
    s.addShape("rect", { x:cat.x, y:1.34, w:cat.w, h:0.06, fill:{ color:cat.color }, line:{ type:"none" } });
    // Header
    s.addText(`${cat.icon}  ${cat.title}`, {
      x:cat.x+0.14, y:1.44, w:cat.w-0.28, h:0.3, fontSize:11, bold:true, color:cat.color,
    });
    // Rows
    cat.rows.forEach((row, i) => {
      const isLast = i === cat.rows.length - 1;
      const ry = 1.82 + i * 0.44;
      if (isLast) {
        s.addShape("rect", { x:cat.x+0.1, y:ry-0.04, w:cat.w-0.2, h:0.04, fill:{ color:C.border }, line:{ type:"none" } });
        s.addShape("rect", { x:cat.x+0.1, y:ry, w:cat.w-0.2, h:0.36, fill:{ color:cat.color+"11" }, line:{ type:"none" } });
        s.addText(row[0], { x:cat.x+0.18, y:ry+0.04, w:cat.w-0.62, h:0.28, fontSize:9, bold:true, color:cat.color });
        s.addText(row[1], { x:cat.x+cat.w-0.9, y:ry+0.04, w:0.76, h:0.28, fontSize:10, bold:true, color:cat.color, align:"right" });
      } else {
        s.addShape("rect", { x:cat.x+0.1, y:ry, w:cat.w-0.2, h:0.36, fill:{ color: i%2===0 ? C.bg : C.white }, line:{ type:"none" } });
        s.addText(row[0], { x:cat.x+0.18, y:ry+0.04, w:cat.w-0.62, h:0.28, fontSize:9, color:C.text });
        s.addText(row[1], { x:cat.x+cat.w-0.9, y:ry+0.04, w:0.76, h:0.28, fontSize:9, color:C.muted, align:"right" });
      }
    });
  });

  // Grand total
  s.addShape("rect", { x:0.15, y:5.19, w:9.7, h:0.3, fill:{ color:C.navy }, line:{ type:"none" } });
  s.addText("ESTIMATED TOTAL MONTHLY PLATFORM COST:", {
    x:0.22, y:5.19, w:7.0, h:0.3, fontSize:9, bold:true, color:C.white,
  });
  s.addText("~$126/month  (≈ $1,512/year)", {
    x:7.2, y:5.19, w:2.65, h:0.3, fontSize:10, bold:true, color:C.gold, align:"right",
  });

  footerBar(s);
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 13 — AMC PLANS
// ════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.addShape("rect", { x:0, y:0, w:10, h:5.625, fill:{ color:C.bg }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:10, h:0.07, fill:{ color:C.gold }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:0.06, h:5.625, fill:{ color:C.navy }, line:{ type:"none" } });

  tag(s, "POST GO-LIVE SUPPORT  ·  AMC BEGINS MONTH 2  ·  MONTH 1 IS FREE", 0.1, C.gold);
  title(s, "Annual Maintenance & Support (AMC)", 0.3, C.navy, 22);
  divider(s, 0.98, C.green);
  s.addText("Select the plan that fits your team  ·  Annual billing saves up to $9,000  ·  All prices in USD", {
    x:0, y:1.04, w:10, h:0.22, fontSize:10, color:C.muted, align:"center",
  });

  const plans = [
    {
      name:"STARTER CARE", mo:"$800", yr:"$8,000", save:"Save $1,600/yr vs monthly",
      tag:null, bg:C.white, ac:C.navy, tc:C.navy, fttc:C.muted, yrtc:C.navy,
      btnbg:C.navy, btntc:C.white, divc:C.border,
      features:["Bug fixes & security patches","OS & dependency updates","Monthly health report","Up to 3 hrs support/month","48-hour response SLA","Dedicated support email"],
    },
    {
      name:"PRO CARE", mo:"$1,500", yr:"$15,000", save:"Save $3,000/yr vs monthly",
      tag:"★   MOST POPULAR", bg:C.navy, ac:C.gold, tc:C.white, fttc:"CCDDFF", yrtc:C.white,
      btnbg:C.gold, btntc:C.navy, divc:"3050AA",
      features:["Everything in Starter +","Minor feature enhancements (6 hrs)","DB performance tuning","CloudWatch monitoring review","24-hour response SLA","Monthly PM check-in call"],
    },
    {
      name:"ENTERPRISE CARE", mo:"$2,500", yr:"$25,000", save:"Save $5,000/yr vs monthly",
      tag:null, bg:C.white, ac:C.purple, tc:C.navy, fttc:C.muted, yrtc:C.navy,
      btnbg:C.purple, btntc:C.white, divc:C.border,
      features:["Everything in Pro +","New features (15 hrs/month)","Dedicated DevOps oversight","Quarterly platform version releases","4-hour emergency SLA","Weekly stakeholder report"],
    },
  ];

  const CARD_W=2.95, CARD_H=3.82, CARD_Y=1.3, GAP=0.07;
  const CX0 = (10 - (3*CARD_W + 2*GAP))/2;

  plans.forEach((p, j) => {
    const cx = CX0 + j*(CARD_W+GAP);
    if (p.tag) {
      s.addShape("rect", { x:cx, y:CARD_Y-0.22, w:CARD_W, h:0.22, fill:{ color:p.ac }, line:{ type:"none" } });
      s.addText(p.tag, { x:cx, y:CARD_Y-0.22, w:CARD_W, h:0.22, fontSize:8.5, bold:true, color:C.navy, align:"center" });
    }
    if (p.bg === C.white) {
      s.addShape("rect", { x:cx+0.04, y:CARD_Y+0.04, w:CARD_W, h:CARD_H, fill:{ color:"CCCCCC" }, line:{ type:"none" } });
    }
    s.addShape("rect", { x:cx, y:CARD_Y, w:CARD_W, h:CARD_H, fill:{ color:p.bg }, line:{ color:p.bg===C.white?C.border:"none", pt:0.75 } });
    s.addShape("rect", { x:cx, y:CARD_Y, w:CARD_W, h:0.07, fill:{ color:p.ac }, line:{ type:"none" } });

    s.addText(p.name, { x:cx+0.14, y:CARD_Y+0.12, w:CARD_W-0.28, h:0.26, fontSize:10, bold:true, color:p.ac });
    s.addText(p.mo, { x:cx+0.14, y:CARD_Y+0.4, w:CARD_W-0.28, h:0.52, fontSize:34, bold:true, color:p.tc });
    s.addText("per month", { x:cx+0.14, y:CARD_Y+0.92, w:CARD_W-0.28, h:0.22, fontSize:9, color:C.muted });
    s.addShape("rect", { x:cx+0.14, y:CARD_Y+1.18, w:CARD_W-0.28, h:0.02, fill:{ color:p.divc }, line:{ type:"none" } });
    s.addText(`${p.yr}  / year`, { x:cx+0.14, y:CARD_Y+1.24, w:CARD_W-0.28, h:0.24, fontSize:11, bold:true, color:p.yrtc });
    s.addText(p.save, { x:cx+0.14, y:CARD_Y+1.48, w:CARD_W-0.28, h:0.22, fontSize:8, color:C.green });
    s.addShape("rect", { x:cx+0.14, y:CARD_Y+1.74, w:CARD_W-0.28, h:0.02, fill:{ color:p.divc }, line:{ type:"none" } });
    p.features.forEach((feat, k) => {
      s.addText(`✓  ${feat}`, { x:cx+0.14, y:CARD_Y+1.84+k*0.27, w:CARD_W-0.2, h:0.25, fontSize:8.5, color:p.fttc });
    });
    const BTN_Y = CARD_Y + CARD_H - 0.38;
    s.addShape("rect", { x:cx+0.16, y:BTN_Y, w:CARD_W-0.32, h:0.32, fill:{ color:p.btnbg }, line:{ type:"none" } });
    s.addText("GET STARTED", { x:cx+0.16, y:BTN_Y, w:CARD_W-0.32, h:0.32, fontSize:8.5, bold:true, color:p.btntc, align:"center" });
  });

  s.addText("★  Month 1 hypercare is FREE, included in the one-time customisation cost.  AMC billing begins from Month 2.  Annual plans billed upfront.", {
    x:0.4, y:5.19, w:9.2, h:0.22, fontSize:8, italic:true, color:C.muted, align:"center",
  });

  footerBar(s);
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 14 — COST SUMMARY
// ════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.addShape("rect", { x:0, y:0, w:10, h:5.625, fill:{ color:C.navy }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:10, h:0.07, fill:{ color:C.gold }, line:{ type:"none" } });
  s.addShape("ellipse", { x:7.0, y:-0.5, w:3.5, h:3.5, fill:{ color:C.navydim }, line:{ type:"none" } });

  tag(s, "•  COMPLETE COST SUMMARY  •", 0.1, C.gold);
  title(s, "Total Cost of Ownership — Year 1", 0.3, C.white, 24);
  divider(s, 0.98, C.green);

  const costItems = [
    { label:"One-Time Platform Customisation", value:"$164,500", detail:"8 weeks · 123 days · 7 roles · includes source code", color:C.gold },
    { label:"FREE 1-Month Hypercare", value:"$0", detail:"Included in customisation cost (estimated value ~$5,000)", color:C.green },
    { label:"AWS Infrastructure (12 months)", value:"~$1,332", detail:"EC2 + RDS + S3 + CloudFront + ELB · ~$111/month", color:C.purplt },
    { label:"Third-Party Services (12 months)", value:"~$180", detail:"Twilio SMS + email + domain · ~$15/month", color:C.teal },
    { label:"AMC — Pro Care (10 months, from M2)", value:"$15,000", detail:"$1,500/month for months 2–11 (Pro plan)", color:C.greenlt },
  ];

  costItems.forEach((item, i) => {
    const cy = 1.22 + i * 0.74;
    s.addShape("rect", { x:0.18, y:cy, w:9.64, h:0.66, fill:{ color:"1D3A7A" }, line:{ color:"3050AA", pt:0.6 } });
    s.addShape("rect", { x:0.18, y:cy, w:0.06, h:0.66, fill:{ color:item.color }, line:{ type:"none" } });
    s.addText(item.label, { x:0.34, y:cy+0.06, w:6.8, h:0.3, fontSize:11, bold:true, color:C.white });
    s.addText(item.detail, { x:0.34, y:cy+0.36, w:6.8, h:0.24, fontSize:8.5, color:C.pale });
    s.addText(item.value, { x:7.2, y:cy+0.1, w:2.5, h:0.44, fontSize:20, bold:true, color:item.color, align:"right" });
  });

  // Grand total
  s.addShape("rect", { x:0.18, y:5.0, w:9.64, h:0.38, fill:{ color:C.gold }, line:{ type:"none" } });
  s.addText("TOTAL YEAR 1 INVESTMENT (Pro AMC):", { x:0.3, y:5.0, w:7.0, h:0.38, fontSize:10, bold:true, color:C.navy });
  s.addText("~$181,012", { x:7.3, y:5.0, w:2.4, h:0.38, fontSize:16, bold:true, color:C.navy, align:"right" });

  footerBar(s);
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 15 — IMPLEMENTATION SCHEDULE (CALENDAR VIEW)
// ════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.addShape("rect", { x:0, y:0, w:10, h:5.625, fill:{ color:C.bg }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:10, h:0.07, fill:{ color:C.gold }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:0.06, h:5.625, fill:{ color:C.navy }, line:{ type:"none" } });

  tag(s, "•  IMPLEMENTATION SCHEDULE  •", 0.1, C.gold);
  title(s, "8-Week + Hypercare Delivery Schedule", 0.3, C.navy, 22);
  divider(s, 0.98, C.green);

  const milestones = [
    { week:"Week 1–2",   phase:"Phase 1: Kickoff",            color:C.navy,
      items:["Requirements finalization & sign-off","Platform environment setup","ANM domain mapping complete","UI wireframe approval"] },
    { week:"Week 3–4",   phase:"Phase 2: Customisation",      color:C.teal,
      items:["ANM branding & UI theme live","Role vocabulary adapted (ANM/Supervisor/ASHA)","Meetings → Field Visits reconfigured","Task module adapted to ANM protocols"] },
    { week:"Week 5–6",   phase:"Phase 3: ANM Modules",        color:C.green,
      items:["Beneficiary & ANC registration live","Immunisation schedule tracker","Home visit GPS form deployed","MCP / RCH report templates generated"] },
    { week:"Week 7",     phase:"Phase 4: Integration",        color:C.purple,
      items:["Capacitor iOS build submitted","Full end-to-end integration test","OWASP security scan passed","Performance benchmarking done"] },
    { week:"Week 8",     phase:"Phase 5: Go-Live",            color:C.orange,
      items:["UAT with ANM stakeholders","Production deployment (AWS)","ANM admin training session","App Store & Play Store live"] },
    { week:"Weeks 9–10", phase:"FREE Hypercare",              color:C.golddim,
      items:["Bug triage & fixes (same-day)","Live monitoring & health checks","Admin Q&A and onboarding","Final status report delivered"] },
  ];

  const MW = 1.5, MH = 3.7, MY0 = 1.18, GAP = 0.065;
  milestones.forEach((m, i) => {
    const mx = 0.18 + i * (MW + GAP);
    s.addShape("rect", { x:mx+0.03, y:MY0+0.03, w:MW, h:MH, fill:{ color:"CCCCCC" }, line:{ type:"none" } });
    s.addShape("rect", { x:mx, y:MY0, w:MW, h:MH, fill:{ color:C.white }, line:{ color:C.border, pt:0.75 }, shadow:shadow() });
    s.addShape("rect", { x:mx, y:MY0, w:MW, h:0.07, fill:{ color:m.color }, line:{ type:"none" } });
    // Week badge
    s.addShape("rect", { x:mx+0.08, y:MY0+0.1, w:MW-0.16, h:0.22, fill:{ color:m.color }, line:{ type:"none" }, rounding:0.05 });
    s.addText(m.week, { x:mx+0.08, y:MY0+0.1, w:MW-0.16, h:0.22, fontSize:7, bold:true, color:C.white, align:"center" });
    // Phase name
    s.addText(m.phase, { x:mx+0.08, y:MY0+0.38, w:MW-0.16, h:0.42, fontSize:8.5, bold:true, color:m.color, align:"center", wrap:true });
    s.addShape("rect", { x:mx+0.14, y:MY0+0.84, w:MW-0.28, h:0.025, fill:{ color:C.border }, line:{ type:"none" } });
    m.items.forEach((item, k) => {
      s.addText(`•  ${item}`, { x:mx+0.1, y:MY0+0.92+k*0.68, w:MW-0.2, h:0.62, fontSize:7.5, color:C.muted, wrap:true });
    });
  });

  // Bottom note
  s.addText("Milestone review at end of each phase.  Weekly status reports delivered every Friday.  Escalation SLA: 4 hours.", {
    x:0.18, y:4.92, w:9.64, h:0.22, fontSize:8, italic:true, color:C.muted, align:"center",
  });

  footerBar(s);
}

// ════════════════════════════════════════════════════════════════════
// SLIDE 16 — CLOSING
// ════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.addShape("rect", { x:0, y:0, w:10, h:5.625, fill:{ color:C.navy }, line:{ type:"none" } });
  s.addShape("rect", { x:0, y:0, w:10, h:0.07, fill:{ color:C.green }, line:{ type:"none" } });
  s.addShape("ellipse", { x:7.5, y:-0.6, w:3.0, h:3.0, fill:{ color:C.navydim }, line:{ type:"none" } });
  s.addShape("ellipse", { x:-0.8, y:3.8, w:2.6, h:2.6, fill:{ color:C.navydim }, line:{ type:"none" } });

  tag(s, "•  NEXT STEPS  •", 0.1, C.gold);
  title(s, "Partner with Mahima Platform for ANM Success", 0.3, C.white, 22);
  divider(s, 0.98, C.green);

  const steps = [
    { num:"01", title:"RFP Alignment Call",  desc:"30-min call to walk through the feature mapping matrix and confirm scope alignment with ANM stakeholders.", icon:"📞" },
    { num:"02", title:"Live Platform Demo",   desc:"Hands-on demo of Mahima V4.0 live instance — see all 20+ modules in action before commitment.", icon:"🖥️" },
    { num:"03", title:"Contract & Kickoff",   desc:"Sign off on scope, customisation checklist, and timeline. Week 1 kickoff begins immediately on execution.", icon:"✍️" },
    { num:"04", title:"8-Week Delivery",      desc:"Structured, milestone-driven delivery. Weekly status reports. No surprises — proven platform, proven process.", icon:"🚀" },
  ];

  steps.forEach((st, i) => {
    const cy = 1.2 + i * 0.98;
    s.addShape("rect", { x:0.18, y:cy, w:9.64, h:0.88, fill:{ color:"1D3A7A" }, line:{ color:"3050AA", pt:0.6 } });
    // Number circle
    s.addShape("ellipse", { x:0.28, y:cy+0.12, w:0.64, h:0.64, fill:{ color:C.green }, line:{ type:"none" } });
    s.addText(st.num, { x:0.28, y:cy+0.12, w:0.64, h:0.64, fontSize:12, bold:true, color:C.white, align:"center", valign:"middle" });
    // Icon
    s.addText(st.icon, { x:1.04, y:cy+0.12, w:0.5, h:0.64, fontSize:20, align:"center", valign:"middle" });
    // Content
    s.addText(st.title, { x:1.62, y:cy+0.1, w:8.0, h:0.3, fontSize:11, bold:true, color:C.white });
    s.addText(st.desc, { x:1.62, y:cy+0.4, w:8.0, h:0.42, fontSize:9, color:C.pale, wrap:true });
  });

  // Closing message
  s.addShape("rect", { x:0.18, y:5.1, w:9.64, h:0.22, fill:{ color:C.green }, line:{ type:"none" } });
  s.addText("Mahima Community Platform — Proven. Production-Ready. ANM-Adapted in 8 Weeks.", {
    x:0.18, y:5.1, w:9.64, h:0.22, fontSize:9, bold:true, color:C.white, align:"center",
  });

  footerBar(s);
}

// ─── Save ──────────────────────────────────────────────────────────
pres.writeFile({ fileName:"Mahima_ANM_Community_Platform_Proposal.pptx" })
  .then(() => {
    console.log("\n✅  Mahima_ANM_Community_Platform_Proposal.pptx generated!");
    console.log("   16 slides covering full ANM RFP response.\n");
    console.log("   SLIDE  1 — Cover");
    console.log("   SLIDE  2 — Executive Summary");
    console.log("   SLIDE  3 — Platform At a Glance (18 built modules)");
    console.log("   SLIDE  4 — Technology Stack");
    console.log("   SLIDE  5 — ANM RFP Alignment Matrix");
    console.log("   SLIDE  6 — Pre-Built vs New Build Inclusion Matrix");
    console.log("   SLIDE  7 — 5-Phase Implementation Approach");
    console.log("   SLIDE  8 — 8-Week Gantt Roadmap");
    console.log("   SLIDE  9 — Resource Plan & Day Matrix");
    console.log("   SLIDE 10 — Why Mahima vs Greenfield");
    console.log("   SLIDE 11 — Pricing ($164,500 + FREE Hypercare)");
    console.log("   SLIDE 12 — Platform & Infrastructure Charges");
    console.log("   SLIDE 13 — AMC Plans (3 tiers)");
    console.log("   SLIDE 14 — Total Cost of Ownership Summary");
    console.log("   SLIDE 15 — Implementation Schedule");
    console.log("   SLIDE 16 — Closing & Next Steps");
  })
  .catch(console.error);
