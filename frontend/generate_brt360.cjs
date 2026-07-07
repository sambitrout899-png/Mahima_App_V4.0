"use strict";
const pptxgen = require("pptxgenjs");

// ── Color palette ──────────────────────────────────────────────────────────────
const C = {
  navy:    "1A2E5A",
  rose:    "E8416B",
  lightBg: "F4F6FB",
  white:   "FFFFFF",
  dark:    "1E293B",
  light:   "64748B",
  accentL: "DBEAFE",
  roseD:   "C02D55",
  navyL:   "253F78",
};

const makeShadow = () => ({ type: "outer", blur: 8, offset: 3, angle: 135, color: "000000", opacity: 0.12 });

// ── Helper: light content slide background ─────────────────────────────────────
function lightBg(slide) {
  slide.background = { color: C.lightBg };
}
function darkBg(slide) {
  slide.background = { color: C.navy };
}

// ── Helper: slide title on dark background ─────────────────────────────────────
function addDarkTitle(slide, text) {
  slide.addText(text, {
    x: 0.5, y: 0.25, w: 9, h: 0.65,
    fontSize: 28, bold: true, fontFace: "Calibri",
    color: C.white, align: "left", margin: 0,
  });
  // Rose accent left bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.12, h: 5.625,
    fill: { color: C.rose }, line: { color: C.rose },
  });
}

// ── Helper: slide title on light background ────────────────────────────────────
function addLightTitle(slide, text) {
  slide.addText(text, {
    x: 0.5, y: 0.22, w: 9, h: 0.65,
    fontSize: 26, bold: true, fontFace: "Calibri",
    color: C.navy, align: "left", margin: 0,
  });
  // thin rose line under title
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 0.92, w: 8.8, h: 0.04,
    fill: { color: C.rose }, line: { color: C.rose },
  });
}

// ── Helper: card (rectangle with shadow) ──────────────────────────────────────
function addCard(slide, x, y, w, h, fillColor) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: fillColor || C.white },
    line: { color: "E2E8F0", width: 0.5 },
    shadow: makeShadow(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author  = "BlueRose Technologies";
pres.title   = "BRT 360 CRM – Dhiraagu Proposal";

// ════════════════════════════════════════════════════════════════
// SLIDE 1 – COVER
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkBg(s);

  // Rose accent left bar
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.5, h: 5.625, fill: { color: C.rose }, line: { color: C.rose } });

  // Decorative rose circle top-right
  s.addShape(pres.shapes.OVAL, { x: 8.2, y: -0.8, w: 2.5, h: 2.5, fill: { color: "E8416B", transparency: 75 }, line: { color: "E8416B", transparency: 75 } });
  s.addShape(pres.shapes.OVAL, { x: 8.7, y: -0.3, w: 1.8, h: 1.8, fill: { color: "E8416B", transparency: 55 }, line: { color: "E8416B", transparency: 55 } });

  // Main Title
  s.addText("BRT 360 CRM", {
    x: 0.8, y: 1.2, w: 8.5, h: 1.3,
    fontSize: 60, bold: true, fontFace: "Calibri",
    color: C.white, align: "left", margin: 0,
  });

  // Subtitle
  s.addText("A Visionary Customer Relationship Management\nPlatform for Dhiraagu", {
    x: 0.8, y: 2.65, w: 7.5, h: 1.1,
    fontSize: 20, fontFace: "Calibri Light",
    color: "B8C9E8", align: "left", margin: 0,
  });

  // Rose divider line
  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 3.85, w: 3.5, h: 0.05, fill: { color: C.rose }, line: { color: C.rose } });

  // Bottom info
  s.addText("Powered by BlueRose Technologies", {
    x: 0.8, y: 4.1, w: 5, h: 0.4,
    fontSize: 14, fontFace: "Calibri", color: C.rose, align: "left", margin: 0,
  });
  s.addText("June 2026", {
    x: 7.5, y: 5.0, w: 2.2, h: 0.35,
    fontSize: 12, fontFace: "Calibri Light", color: "8899BB", align: "right", margin: 0,
  });
  s.addText("www.bluerose-tech.com", {
    x: 7.5, y: 5.2, w: 2.2, h: 0.3,
    fontSize: 11, fontFace: "Calibri Light", color: "8899BB", align: "right", margin: 0,
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 2 – AGENDA
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addLightTitle(s, "Agenda");

  const items = [
    "About BlueRose Technologies",
    "Dhiraagu Business Landscape",
    "The CRM Imperative",
    "BRT 360 Platform Architecture",
    "Technology Stack",
    "11 CRM Modules — Deep Dive",
    "Oracle BRM & RODOD Integration",
    "Implementation Roadmap & Why BRT 360",
  ];

  const col1 = items.slice(0, 4);
  const col2 = items.slice(4);

  col1.forEach((item, i) => {
    // Circle with number
    s.addShape(pres.shapes.OVAL, { x: 0.5, y: 1.15 + i * 0.95, w: 0.42, h: 0.42, fill: { color: C.rose }, line: { color: C.rose } });
    s.addText(String(i + 1), { x: 0.5, y: 1.15 + i * 0.95, w: 0.42, h: 0.42, fontSize: 14, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    addCard(s, 1.05, 1.13 + i * 0.95, 3.8, 0.46, C.white);
    s.addText(item, { x: 1.15, y: 1.14 + i * 0.95, w: 3.6, h: 0.44, fontSize: 13, fontFace: "Calibri", color: C.dark, valign: "middle", margin: 0 });
  });

  col2.forEach((item, i) => {
    s.addShape(pres.shapes.OVAL, { x: 5.3, y: 1.15 + i * 0.95, w: 0.42, h: 0.42, fill: { color: C.rose }, line: { color: C.rose } });
    s.addText(String(i + 5), { x: 5.3, y: 1.15 + i * 0.95, w: 0.42, h: 0.42, fontSize: 14, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    addCard(s, 5.85, 1.13 + i * 0.95, 3.8, 0.46, C.white);
    s.addText(item, { x: 5.95, y: 1.14 + i * 0.95, w: 3.6, h: 0.44, fontSize: 13, fontFace: "Calibri", color: C.dark, valign: "middle", margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 3 – ABOUT BLUEROSE TECHNOLOGIES
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addLightTitle(s, "About BlueRose Technologies");

  // Left column – description
  addCard(s, 0.4, 1.1, 5.0, 4.1, C.white);
  s.addText("BlueRose Technologies", {
    x: 0.6, y: 1.25, w: 4.6, h: 0.4,
    fontSize: 17, bold: true, fontFace: "Calibri", color: C.navy, margin: 0,
  });
  s.addText([
    { text: "Full-stack digital solutions partner specializing in telecommunications and enterprise software. We architect, build, and operate mission-critical systems for Tier-1 CSPs and government bodies across Asia-Pacific and the Middle East.\n\n", options: { breakLine: false } },
    { text: "Our Expertise:\n", options: { bold: true, breakLine: true } },
    { text: "Telecom CRM & BSS Platforms", options: { bullet: true, breakLine: true } },
    { text: "Oracle BRM / RODOD Integration", options: { bullet: true, breakLine: true } },
    { text: ".NET Microservices & Node.js/React Frontends", options: { bullet: true, breakLine: true } },
    { text: "Oracle Certified Implementation Partner", options: { bullet: true, breakLine: true } },
    { text: "Cloud-native & On-premise Deployments", options: { bullet: true, breakLine: true } },
    { text: "ISO 27001 & GDPR-aligned Security Practices", options: { bullet: true } },
  ], {
    x: 0.6, y: 1.75, w: 4.6, h: 3.2,
    fontSize: 12.5, fontFace: "Calibri Light", color: C.dark,
    valign: "top", margin: 0,
  });

  // Right column – stat callouts
  const stats = [
    { val: "150+", label: "Projects Delivered" },
    { val: "30+",  label: "Telecom Clients" },
    { val: "10",   label: "Years of Expertise" },
    { val: "98%",  label: "Client Retention Rate" },
  ];
  stats.forEach((st, i) => {
    const gy = 1.1 + i * 1.06;
    addCard(s, 5.7, gy, 3.9, 0.9, i % 2 === 0 ? C.navy : C.rose);
    s.addText(st.val, { x: 5.7, y: gy + 0.03, w: 1.4, h: 0.9, fontSize: 32, bold: true, fontFace: "Calibri", color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(st.label, { x: 7.1, y: gy + 0.2, w: 2.4, h: 0.5, fontSize: 13, fontFace: "Calibri Light", color: C.white, align: "left", valign: "middle", margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 4 – DHIRAAGU AT A GLANCE
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkBg(s);
  addDarkTitle(s, "Understanding Dhiraagu's Business Landscape");

  const segs = [
    { title: "Personal",           desc: "5G · Prepaid · Postpaid\nFibre Broadband · eSIM\nTourist SIM · OneNumber\nSmartView · eZone",   col: "253F78" },
    { title: "Business/Enterprise",desc: "Dedicated Internet · WAN\nIPLC · M2M · Cloud Voice\nPABX / Contact Center\nManaged Security · SIEM", col: "1D3461" },
    { title: "Hospitality",        desc: "Kobaa WiFi · iHTV\nGuest Connectivity\nHospitality CRM Portal\nCustom Bandwidth Packages",         col: "253F78" },
    { title: "Government",         desc: "Colocation · Firewall\nSecure WAN · CCTV\nStructured Cabling\nBulk SMS for Agencies",             col: "1D3461" },
  ];

  segs.forEach((seg, i) => {
    const x = 0.35 + i * 2.35;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.05, w: 2.18, h: 3.7, fill: { color: seg.col }, line: { color: C.rose, width: 1.5 } });
    // Top accent bar
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.05, w: 2.18, h: 0.08, fill: { color: C.rose }, line: { color: C.rose } });
    s.addText(seg.title, { x: x + 0.08, y: 1.2, w: 2.0, h: 0.5, fontSize: 13, bold: true, fontFace: "Calibri", color: C.rose, align: "center", margin: 0 });
    s.addText(seg.desc, { x: x + 0.1, y: 1.8, w: 1.98, h: 2.8, fontSize: 11, fontFace: "Calibri Light", color: "C8D8F0", align: "center", valign: "top", margin: 0 });
  });

  // Bottom innovation bar
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 4.9, w: 9.4, h: 0.55, fill: { color: C.rose }, line: { color: C.rose } });
  s.addText("Innovation Highlights: 5G Nationwide · eSIM · DhiraaguPay · Elite Club · SmartView IPTV · eZone Digital Retail", {
    x: 0.4, y: 4.9, w: 9.2, h: 0.55,
    fontSize: 12, fontFace: "Calibri", color: C.white, bold: true, align: "center", valign: "middle", margin: 0,
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 5 – THE CRM IMPERATIVE
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addLightTitle(s, "Why Dhiraagu Needs a Unified CRM");

  // Pain points header
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 1.1, w: 4.3, h: 0.45, fill: { color: "FEE2E2" }, line: { color: "FCA5A5" } });
  s.addText("PAIN POINTS", { x: 0.4, y: 1.1, w: 4.3, h: 0.45, fontSize: 13, bold: true, fontFace: "Calibri", color: "991B1B", align: "center", valign: "middle", margin: 0 });

  const pains = [
    { t: "Fragmented Customer Data", d: "Siloed prepaid, postpaid, broadband and enterprise data with no single source of truth." },
    { t: "No Unified 360° View",     d: "Customer-facing teams cannot see the full account picture — subscriptions, usage, billing, and interactions." },
    { t: "Manual BRM Reconciliation", d: "Billing reconciliation with Oracle BRM is manual, error-prone, and delays revenue recognition." },
  ];
  pains.forEach((p, i) => {
    addCard(s, 0.4, 1.65 + i * 1.2, 4.3, 1.05, C.white);
    s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 1.65 + i * 1.2, w: 0.08, h: 1.05, fill: { color: "EF4444" }, line: { color: "EF4444" } });
    s.addText(p.t, { x: 0.6, y: 1.68 + i * 1.2, w: 3.9, h: 0.32, fontSize: 13, bold: true, fontFace: "Calibri", color: C.dark, margin: 0 });
    s.addText(p.d, { x: 0.6, y: 2.02 + i * 1.2, w: 3.9, h: 0.6, fontSize: 11.5, fontFace: "Calibri Light", color: C.light, margin: 0 });
  });

  // Opportunities header
  s.addShape(pres.shapes.RECTANGLE, { x: 5.3, y: 1.1, w: 4.3, h: 0.45, fill: { color: "DCFCE7" }, line: { color: "86EFAC" } });
  s.addText("OPPORTUNITIES", { x: 5.3, y: 1.1, w: 4.3, h: 0.45, fontSize: 13, bold: true, fontFace: "Calibri", color: "166534", align: "center", valign: "middle", margin: 0 });

  const opps = [
    { t: "AI-Driven Upsell & Cross-Sell", d: "Leverage unified data to identify the right offer, at the right time, across all customer segments." },
    { t: "Proactive Churn Prevention",    d: "Predict at-risk customers using ML signals and intervene with targeted retention offers before churn occurs." },
    { t: "Seamless Omnichannel Service",  d: "Deliver consistent experience across app, web, PABX, walk-in stores, and partner channels." },
  ];
  opps.forEach((o, i) => {
    addCard(s, 5.3, 1.65 + i * 1.2, 4.3, 1.05, C.white);
    s.addShape(pres.shapes.RECTANGLE, { x: 5.3, y: 1.65 + i * 1.2, w: 0.08, h: 1.05, fill: { color: "22C55E" }, line: { color: "22C55E" } });
    s.addText(o.t, { x: 5.5, y: 1.68 + i * 1.2, w: 3.9, h: 0.32, fontSize: 13, bold: true, fontFace: "Calibri", color: C.dark, margin: 0 });
    s.addText(o.d, { x: 5.5, y: 2.02 + i * 1.2, w: 3.9, h: 0.6, fontSize: 11.5, fontFace: "Calibri Light", color: C.light, margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 6 – BRT 360 PLATFORM OVERVIEW (Architecture)
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkBg(s);
  addDarkTitle(s, "BRT 360 — The Intelligent Telecom CRM");

  const bw = 3.2, bh = 0.52;
  const addBox = (x, y, w, h, label, fill, textColor) => {
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: "FFFFFF", width: 0.75 } });
    s.addText(label, { x, y, w, h, fontSize: 11, bold: true, fontFace: "Calibri", color: textColor || C.white, align: "center", valign: "middle", margin: 0 });
  };

  // Row 1 – Frontend
  addBox(3.4, 1.05, bw, bh, "React / Node.js Frontend", C.rose);

  // Arrow down
  s.addShape(pres.shapes.LINE, { x: 5.0, y: 1.57, w: 0, h: 0.32, line: { color: "8899CC", width: 1.5 } });

  // Row 2 – API Gateway
  addBox(3.4, 1.89, bw, bh, ".NET API Gateway", "1D4ED8");

  // Arrows down to 3 boxes
  s.addShape(pres.shapes.LINE, { x: 2.05, y: 2.41, w: 0, h: 0.3, line: { color: "8899CC", width: 1.5 } });
  s.addShape(pres.shapes.LINE, { x: 5.0,  y: 2.41, w: 0, h: 0.3, line: { color: "8899CC", width: 1.5 } });
  s.addShape(pres.shapes.LINE, { x: 7.95, y: 2.41, w: 0, h: 0.3, line: { color: "8899CC", width: 1.5 } });
  // Horizontal connector
  s.addShape(pres.shapes.LINE, { x: 2.05, y: 2.71, w: 5.9, h: 0, line: { color: "8899CC", width: 1.5 } });

  // Row 3 – Databases
  addBox(0.7, 2.71, 2.7, bh, "Oracle DB", "253F78");
  addBox(3.65, 2.71, 2.7, bh, "PostgreSQL", "253F78");
  addBox(6.6, 2.71, 2.7, bh, "Cache Layer", "253F78");

  // Arrows down
  s.addShape(pres.shapes.LINE, { x: 2.6, y: 3.23, w: 0, h: 0.3, line: { color: "8899CC", width: 1.5 } });
  s.addShape(pres.shapes.LINE, { x: 7.45, y: 3.23, w: 0, h: 0.3, line: { color: "8899CC", width: 1.5 } });
  // Horizontal
  s.addShape(pres.shapes.LINE, { x: 2.6, y: 3.53, w: 4.85, h: 0, line: { color: C.rose, width: 1.5 } });

  // Row 4 – Integrations
  addBox(0.7, 3.53, 4.0, bh, "Oracle BRM — Billing Revenue Management", "7C3AED");
  addBox(5.3, 3.53, 4.0, bh, "RODOD Stack — Digital Operations Domain", "0D9488");

  // Label
  s.addText("BRT 360 Integration Orchestration Layer", {
    x: 1.5, y: 4.2, w: 7, h: 0.4,
    fontSize: 11, fontFace: "Calibri Light", color: "8899CC", align: "center", italic: true, margin: 0,
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 7 – TECHNOLOGY STACK
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addLightTitle(s, "Built for Scale, Built for Telecoms");

  const cols = [
    { title: "Frontend",    color: C.rose,   items: ["React 18", "Node.js 20", "TypeScript", "REST / GraphQL", "Micro-frontends", "PWA Support"] },
    { title: "Backend",     color: "1D4ED8", items: [".NET 8", "Microservices", "gRPC", "Event Bus", "CQRS Pattern", "OpenAPI 3.1"] },
    { title: "Database",    color: "0D9488", items: ["Oracle 21c", "PostgreSQL 15", "Redis Cache", "Elasticsearch", "Data Vault 2.0", "CDC Streams"] },
    { title: "Integration", color: "7C3AED", items: ["Oracle BRM APIs", "RODOD Adapters", "Apache Kafka", "MuleSoft ESB", "REST Webhooks", "SFTP/EDI"] },
  ];

  cols.forEach((col, i) => {
    const x = 0.38 + i * 2.35;
    // Card
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.1, w: 2.2, h: 4.2, fill: { color: C.white }, line: { color: "E2E8F0", width: 0.75 }, shadow: makeShadow() });
    // Top colored bar
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.1, w: 2.2, h: 0.55, fill: { color: col.color }, line: { color: col.color } });
    s.addText(col.title, { x, y: 1.1, w: 2.2, h: 0.55, fontSize: 14, bold: true, fontFace: "Calibri", color: C.white, align: "center", valign: "middle", margin: 0 });
    // Items
    s.addText(col.items.map(it => ({ text: it, options: { bullet: true, breakLine: true } })), {
      x: x + 0.1, y: 1.72, w: 2.0, h: 3.4,
      fontSize: 12, fontFace: "Calibri Light", color: C.dark, valign: "top", margin: 0,
    });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 8 – MODULE 1: CUSTOMER 360
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addLightTitle(s, "Module 1 — Customer 360 & Account Management");

  // Rose accent strip
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 1.1, w: 0.08, h: 4.2, fill: { color: C.rose }, line: { color: C.rose } });

  // Left description
  s.addText("Unified Customer Intelligence", {
    x: 0.55, y: 1.15, w: 4.5, h: 0.4, fontSize: 15, bold: true, fontFace: "Calibri", color: C.navy, margin: 0,
  });
  s.addText(
    "BRT 360 creates a single, real-time customer profile that consolidates every touchpoint across Dhiraagu's product portfolio — from prepaid mobile to enterprise WAN. Agents gain instant context, enabling faster resolution and smarter upsell.",
    { x: 0.55, y: 1.6, w: 4.5, h: 1.2, fontSize: 12.5, fontFace: "Calibri Light", color: C.dark, margin: 0 }
  );

  const features = [
    "Household & corporate account hierarchy",
    "360° subscription overview (all Dhiraagu products)",
    "Full interaction & service history timeline",
    "Credit profile & payment behaviour scoring",
    "Real-time balance via Oracle BRM",
    "Linked eSIM, DhiraaguPay, Elite Club profiles",
  ];
  s.addText(features.map((f, i) => ({ text: f, options: { bullet: true, breakLine: i < features.length - 1 } })), {
    x: 0.55, y: 2.85, w: 4.5, h: 2.3,
    fontSize: 12.5, fontFace: "Calibri Light", color: C.dark, valign: "top", margin: 0,
  });

  // Right: 3 mini stat cards
  const kpis = [
    { label: "Single Source of Truth",   sub: "All products, one profile" },
    { label: "Real-Time BRM Sync",        sub: "Balance & billing live" },
    { label: "AI-Assisted Next Action",   sub: "Churn & upsell signals" },
    { label: "Omnichannel History",        sub: "App · Web · PABX · Walk-in" },
  ];
  kpis.forEach((k, i) => {
    const ky = 1.1 + i * 1.1;
    addCard(s, 5.35, ky, 4.25, 0.92, i % 2 === 0 ? C.navy : "253F78");
    s.addShape(pres.shapes.RECTANGLE, { x: 5.35, y: ky, w: 0.08, h: 0.92, fill: { color: C.rose }, line: { color: C.rose } });
    s.addText(k.label, { x: 5.55, y: ky + 0.1, w: 3.9, h: 0.38, fontSize: 13, bold: true, fontFace: "Calibri", color: C.white, margin: 0 });
    s.addText(k.sub,   { x: 5.55, y: ky + 0.5, w: 3.9, h: 0.32, fontSize: 11, fontFace: "Calibri Light", color: "A8BADA", margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 9 – MODULE 2: LEAD & OPPORTUNITY
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addLightTitle(s, "Module 2 — Lead & Opportunity Pipeline");

  s.addText(
    "BRT 360 provides a structured B2B sales pipeline covering Enterprise, SME, Hospitality, and Government segments. Lead scoring, territory management, quota tracking, and automated forecasting give sales leaders full pipeline visibility.",
    { x: 0.4, y: 1.12, w: 9.2, h: 0.9, fontSize: 13, fontFace: "Calibri Light", color: C.dark, margin: 0 }
  );

  // Pipeline flow
  const stages = ["Prospect", "Qualify", "Propose", "Negotiate", "Close"];
  const stageColors = ["253F78", "1D4ED8", C.navy, "7C3AED", C.rose];
  stages.forEach((st, i) => {
    const x = 0.35 + i * 1.87;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.2, w: 1.7, h: 0.7, fill: { color: stageColors[i] }, line: { color: stageColors[i] } });
    s.addText(st, { x, y: 2.2, w: 1.7, h: 0.7, fontSize: 13, bold: true, fontFace: "Calibri", color: C.white, align: "center", valign: "middle", margin: 0 });
    if (i < stages.length - 1) {
      s.addShape(pres.shapes.LINE, { x: x + 1.7, y: 2.55, w: 0.17, h: 0, line: { color: C.rose, width: 2 } });
    }
  });

  // Feature cards below
  const features = [
    { t: "Lead Scoring",       d: "ML-based scoring from web, email, event signals" },
    { t: "Territory Mgmt",     d: "Assign accounts by atoll, region, or industry" },
    { t: "Quota Tracking",     d: "Individual & team targets with real-time attainment" },
    { t: "Forecast Engine",    d: "Weighted pipeline with confidence-band forecasting" },
    { t: "Auto Follow-ups",    d: "Task & reminder automation for each stage gate" },
  ];
  features.forEach((f, i) => {
    const x = 0.35 + i * 1.87;
    addCard(s, x, 3.15, 1.73, 1.95, C.white);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 3.15, w: 1.73, h: 0.06, fill: { color: C.rose }, line: { color: C.rose } });
    s.addText(f.t, { x: x + 0.08, y: 3.23, w: 1.55, h: 0.4, fontSize: 12, bold: true, fontFace: "Calibri", color: C.navy, margin: 0 });
    s.addText(f.d, { x: x + 0.08, y: 3.65, w: 1.55, h: 1.3, fontSize: 11, fontFace: "Calibri Light", color: C.dark, margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 10 – MODULE 3: SERVICE REQUEST & CASE MANAGEMENT
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addLightTitle(s, "Module 3 — Service Request & Case Management");

  // Left column – content
  s.addText("Omnichannel Trouble Ticketing & SLA Governance", {
    x: 0.4, y: 1.12, w: 5.2, h: 0.4, fontSize: 15, bold: true, fontFace: "Calibri", color: C.navy, margin: 0,
  });
  s.addText(
    "All service requests — network faults, billing disputes, provisioning tasks — are captured, routed, and tracked in a single system. Agents and field teams share the same real-time view, eliminating duplicates and blind spots.",
    { x: 0.4, y: 1.6, w: 5.1, h: 1.0, fontSize: 12.5, fontFace: "Calibri Light", color: C.dark, margin: 0 }
  );

  const bullets = [
    "Trouble ticketing: network, billing, provisioning",
    "SLA tracking with breach alerts & escalations",
    "Omnichannel intake: App · Web · PABX · Walk-in",
    "PABX / Contact Center deep integration",
    "Automated tier-1 → tier-2 escalation workflows",
    "Customer notification via SMS & push",
    "Case analytics: MTTR, FCR, CSAT trending",
  ];
  s.addText(bullets.map((b, i) => ({ text: b, options: { bullet: true, breakLine: i < bullets.length - 1 } })), {
    x: 0.4, y: 2.7, w: 5.1, h: 2.7, fontSize: 12.5, fontFace: "Calibri Light", color: C.dark, valign: "top", margin: 0,
  });

  // Right – channel cards
  const channels = [
    { name: "Mobile App",     sub: "iOS & Android self-service" },
    { name: "Web Portal",     sub: "B2C & B2B online support" },
    { name: "PABX / IVR",    sub: "Contact center integration" },
    { name: "Walk-in Store",  sub: "Branch agent console" },
  ];
  channels.forEach((ch, i) => {
    addCard(s, 5.7, 1.1 + i * 1.12, 3.95, 0.96, i % 2 === 0 ? C.accentL : C.white);
    s.addShape(pres.shapes.OVAL, { x: 5.82, y: 1.22 + i * 1.12, w: 0.5, h: 0.5, fill: { color: C.rose }, line: { color: C.rose } });
    s.addText(ch.name, { x: 6.45, y: 1.15 + i * 1.12, w: 3.0, h: 0.4, fontSize: 13, bold: true, fontFace: "Calibri", color: C.navy, margin: 0 });
    s.addText(ch.sub,  { x: 6.45, y: 1.55 + i * 1.12, w: 3.0, h: 0.35, fontSize: 11.5, fontFace: "Calibri Light", color: C.light, margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 11 – MODULE 4: CAMPAIGN & MARKETING AUTOMATION
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addLightTitle(s, "Module 4 — Campaign & Marketing Automation");

  s.addText(
    "Target the right customer with the right offer at the right time. BRT 360's campaign engine leverages unified CRM data to deliver hyper-personalized campaigns across prepaid, postpaid, fibre, roaming, and enterprise segments.",
    { x: 0.4, y: 1.12, w: 9.2, h: 0.8, fontSize: 13, fontFace: "Calibri Light", color: C.dark, margin: 0 }
  );

  const features = [
    { t: "Segment Builder",    d: "Dynamic cohorts by product, usage, tenure, ARPU, geography" },
    { t: "Offer Engine",       d: "Elite Club, DhiraaguPay & roaming promotional offer automation" },
    { t: "Bulk SMS Gateway",   d: "Native Bulk SMS integration with delivery tracking" },
    { t: "Push & Email",       d: "Multi-channel delivery — app push, email, in-app messages" },
    { t: "A/B Testing",        d: "Split-test offers and messaging with statistical significance" },
    { t: "ROI Dashboard",      d: "Per-campaign revenue attribution, conversion funnel & ROAS" },
  ];

  features.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 3.18;
    const y = 2.1 + row * 1.55;
    addCard(s, x, y, 2.95, 1.35, C.white);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 2.95, h: 0.07, fill: { color: C.rose }, line: { color: C.rose } });
    s.addText(f.t, { x: x + 0.1, y: y + 0.12, w: 2.75, h: 0.38, fontSize: 13, bold: true, fontFace: "Calibri", color: C.navy, margin: 0 });
    s.addText(f.d, { x: x + 0.1, y: y + 0.54, w: 2.75, h: 0.72, fontSize: 11.5, fontFace: "Calibri Light", color: C.dark, margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 12 – MODULE 5: ORDER MANAGEMENT & PRODUCT CATALOG
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addLightTitle(s, "Module 5 — Order Management & Product Catalog");

  // Left - flow diagram
  s.addText("Quote-to-Order Lifecycle", {
    x: 0.4, y: 1.12, w: 4.8, h: 0.4, fontSize: 15, bold: true, fontFace: "Calibri", color: C.navy, margin: 0,
  });

  const flow = ["Catalog Browse", "Configure & Quote", "Approval Workflow", "Order Created", "BRM Provisioning", "Service Active"];
  flow.forEach((step, i) => {
    const y = 1.65 + i * 0.58;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 3.5, h: 0.45, fill: { color: i === flow.length - 1 ? C.rose : (i % 2 === 0 ? C.navy : "253F78") }, line: { color: C.navy } });
    s.addText(step, { x: 0.5, y, w: 3.5, h: 0.45, fontSize: 12, bold: true, fontFace: "Calibri", color: C.white, align: "center", valign: "middle", margin: 0 });
    if (i < flow.length - 1) {
      s.addShape(pres.shapes.LINE, { x: 2.25, y: y + 0.45, w: 0, h: 0.13, line: { color: C.rose, width: 1.5 } });
    }
  });

  // Right - catalog content
  s.addText("Centralized Product Catalog", {
    x: 4.6, y: 1.12, w: 5.0, h: 0.4, fontSize: 15, bold: true, fontFace: "Calibri", color: C.navy, margin: 0,
  });

  const catalog = [
    "5G Plans — Consumer & Enterprise",
    "Prepaid & Postpaid Mobile",
    "Fibre Broadband — Residential & Business",
    "M2M / IoT Connectivity",
    "Dedicated Internet & WAN/IPLC",
    "Cloud Voice & PABX",
    "Managed Security & Firewall",
    "Colocation & Hosting",
  ];
  s.addText(catalog.map((c, i) => ({ text: c, options: { bullet: true, breakLine: i < catalog.length - 1 } })), {
    x: 4.6, y: 1.65, w: 5.0, h: 3.7,
    fontSize: 12.5, fontFace: "Calibri Light", color: C.dark, valign: "top", margin: 0,
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 13 – MODULE 6: CONTRACT & SLA MANAGEMENT
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addLightTitle(s, "Module 6 — Contract & SLA Management");

  const items = [
    { icon: "1", title: "Contract Lifecycle",       desc: "End-to-end management — creation, legal review, approval, execution, renewal, and termination — for all enterprise agreements." },
    { icon: "2", title: "SLA Commitments",           desc: "Service-level definitions for Dedicated Internet, IPLC, WAN, and Colocation with real-time monitoring and breach alerting." },
    { icon: "3", title: "Digital Signature",         desc: "Integrated e-signature workflow with audit trail — eliminate paper and accelerate deal closure by up to 60%." },
    { icon: "4", title: "Auto-Renewal Alerts",       desc: "90/60/30-day renewal notifications to account managers and customers, with upsell prompts on expiring contracts." },
    { icon: "5", title: "Document Repository",       desc: "Versioned contract storage with role-based access, linked to the customer 360 profile." },
    { icon: "6", title: "Compliance Tracking",       desc: "TRCSL regulatory compliance flags and audit-ready reporting for all enterprise agreements." },
  ];

  items.forEach((it, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.4 + col * 4.85;
    const y = 1.1 + row * 1.45;
    addCard(s, x, y, 4.65, 1.3, C.white);
    s.addShape(pres.shapes.OVAL, { x: x + 0.12, y: y + 0.38, w: 0.44, h: 0.44, fill: { color: C.rose }, line: { color: C.rose } });
    s.addText(it.icon, { x: x + 0.12, y: y + 0.38, w: 0.44, h: 0.44, fontSize: 14, bold: true, fontFace: "Calibri", color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(it.title, { x: x + 0.7, y: y + 0.1, w: 3.8, h: 0.35, fontSize: 13, bold: true, fontFace: "Calibri", color: C.navy, margin: 0 });
    s.addText(it.desc,  { x: x + 0.7, y: y + 0.48, w: 3.8, h: 0.75, fontSize: 11.5, fontFace: "Calibri Light", color: C.dark, margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 14 – MODULE 7: PARTNER & CHANNEL MANAGEMENT
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addLightTitle(s, "Module 7 — Partner & Channel Management");

  // Left description
  s.addText("Empower Your Indirect Sales Network", {
    x: 0.4, y: 1.12, w: 5.2, h: 0.4, fontSize: 15, bold: true, fontFace: "Calibri", color: C.navy, margin: 0,
  });
  s.addText(
    "BRT 360's partner portal provides dealers, resellers, ISPs, and hospitality partners a dedicated workspace to manage their pipeline, commissions, and customer accounts — all connected to the central Dhiraagu CRM.",
    { x: 0.4, y: 1.6, w: 5.1, h: 1.0, fontSize: 12.5, fontFace: "Calibri Light", color: C.dark, margin: 0 }
  );

  const bullets = [
    "Dealer & reseller onboarding workflow",
    "Commission calculation & disbursement",
    "Partner performance dashboards",
    "Kobaa WiFi & iHTV hospitality reseller portal",
    "Lead sharing with indirect channels",
    "Co-branded marketing asset management",
    "Partner-level SLA tracking",
  ];
  s.addText(bullets.map((b, i) => ({ text: b, options: { bullet: true, breakLine: i < bullets.length - 1 } })), {
    x: 0.4, y: 2.7, w: 5.1, h: 2.7, fontSize: 12.5, fontFace: "Calibri Light", color: C.dark, valign: "top", margin: 0,
  });

  // Right – partner type cards
  const partners = [
    { name: "Dealers & Resellers", sub: "Commission & performance mgmt" },
    { name: "Hospitality Partners", sub: "Kobaa WiFi & iHTV resellers" },
    { name: "ISP Partners",         sub: "Wholesale & interconnect" },
    { name: "Government Agents",    sub: "Bulk services channel" },
  ];
  partners.forEach((p, i) => {
    addCard(s, 5.7, 1.1 + i * 1.12, 3.95, 0.96, i % 2 === 0 ? C.navy : "253F78");
    s.addText(p.name, { x: 5.9, y: 1.15 + i * 1.12, w: 3.55, h: 0.42, fontSize: 13, bold: true, fontFace: "Calibri", color: C.white, margin: 0 });
    s.addText(p.sub,  { x: 5.9, y: 1.57 + i * 1.12, w: 3.55, h: 0.35, fontSize: 11.5, fontFace: "Calibri Light", color: "A8BADA", margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 15 – MODULE 8: ANALYTICS & REPORTING (dark)
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkBg(s);
  addDarkTitle(s, "Module 8 — Analytics & Intelligent Reporting");

  // Left – chart
  s.addChart(pres.charts.BAR, [{
    name: "Revenue Share (%)",
    labels: ["Personal", "Enterprise", "SME", "Government", "Hospitality"],
    values: [45, 25, 20, 7, 3],
  }], {
    x: 0.3, y: 1.0, w: 5.5, h: 4.0,
    barDir: "col",
    chartColors: [C.rose, "1D4ED8", "0D9488", "7C3AED", "D97706"],
    chartArea: { fill: { color: "1E3A5F" }, roundedCorners: false },
    plotArea: { fill: { color: "1E3A5F" } },
    catAxisLabelColor: "A8BADA",
    valAxisLabelColor: "A8BADA",
    valGridLine: { color: "2D4A7A", size: 0.5 },
    catGridLine: { style: "none" },
    showValue: true,
    dataLabelColor: "FFFFFF",
    dataLabelFontSize: 11,
    showLegend: false,
    showTitle: true,
    title: "Customer Revenue by Segment (%)",
    titleColor: "A8BADA",
    titleFontSize: 12,
  });

  // Right – capability cards
  const caps = [
    { t: "AI Churn Prediction",   d: "ML models identify at-risk subscribers 60 days ahead" },
    { t: "Revenue Forecasting",    d: "Segment-level revenue projection with confidence intervals" },
    { t: "NPS Tracking",           d: "Net Promoter Score by product, channel, and agent" },
    { t: "Real-Time KPI Dashboards", d: "Executive, operational, and agent-level live views" },
  ];
  caps.forEach((c, i) => {
    addCard(s, 6.05, 1.1 + i * 1.12, 3.6, 0.96, "1E3A5F");
    s.addShape(pres.shapes.RECTANGLE, { x: 6.05, y: 1.1 + i * 1.12, w: 0.08, h: 0.96, fill: { color: C.rose }, line: { color: C.rose } });
    s.addText(c.t, { x: 6.25, y: 1.15 + i * 1.12, w: 3.25, h: 0.38, fontSize: 12.5, bold: true, fontFace: "Calibri", color: C.white, margin: 0 });
    s.addText(c.d, { x: 6.25, y: 1.55 + i * 1.12, w: 3.25, h: 0.42, fontSize: 11, fontFace: "Calibri Light", color: "A8BADA", margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 16 – MODULE 9: FIELD FORCE MANAGEMENT
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addLightTitle(s, "Module 9 — Field Force Management");

  s.addText(
    "A mobile-first platform for Dhiraagu's field technicians — enabling work order dispatch, GPS-based routing, on-site service capture, and offline operations across even the most remote Maldivian atolls.",
    { x: 0.4, y: 1.12, w: 9.2, h: 0.8, fontSize: 13, fontFace: "Calibri Light", color: C.dark, margin: 0 }
  );

  const features = [
    { t: "Mobile Work Orders",     d: "Dispatch, accept, and close work orders from Android/iOS field app" },
    { t: "GPS Tracking",           d: "Real-time technician location on dispatcher map with ETA calculations" },
    { t: "On-site Capture",        d: "Photo, signature, and checklist capture for proof-of-installation" },
    { t: "CCTV & Cabling",         d: "Specialized forms for CCTV install, structured cabling, temp monitoring" },
    { t: "Offline-First Design",   d: "Full functionality without connectivity — sync when back in coverage" },
    { t: "SLA Integration",        d: "Field work orders linked to CRM cases with automatic SLA tracking" },
  ];

  features.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.4 + col * 4.85;
    const y = 2.1 + row * 1.12;
    addCard(s, x, y, 4.65, 1.0, C.white);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.07, h: 1.0, fill: { color: C.rose }, line: { color: C.rose } });
    s.addText(f.t, { x: x + 0.2, y: y + 0.1, w: 4.3, h: 0.36, fontSize: 13, bold: true, fontFace: "Calibri", color: C.navy, margin: 0 });
    s.addText(f.d, { x: x + 0.2, y: y + 0.48, w: 4.3, h: 0.44, fontSize: 11.5, fontFace: "Calibri Light", color: C.dark, margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 17 – MODULE 10: LOYALTY & REWARDS ENGINE
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addLightTitle(s, "Module 10 — Loyalty & Rewards Engine");

  // Tier cards
  const tiers = [
    { name: "Silver",   color: "94A3B8", perks: "Base points earning\nMonthly bonus offers\nPriority support access" },
    { name: "Gold",     color: "D97706", perks: "2x points on top-ups\nElite Club offers\nDedicated account rep" },
    { name: "Platinum", color: "7C3AED", perks: "3x points everywhere\nDhiraaguPay cashback\nVIP event invitations" },
  ];
  tiers.forEach((t, i) => {
    const x = 0.4 + i * 3.18;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.1, w: 3.0, h: 2.1, fill: { color: C.white }, line: { color: "E2E8F0", width: 0.75 }, shadow: makeShadow() });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.1, w: 3.0, h: 0.7, fill: { color: t.color }, line: { color: t.color } });
    s.addText(t.name, { x, y: 1.1, w: 3.0, h: 0.7, fontSize: 18, bold: true, fontFace: "Calibri", color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(t.perks, { x: x + 0.15, y: 1.88, w: 2.7, h: 1.25, fontSize: 12, fontFace: "Calibri Light", color: C.dark, margin: 0 });
  });

  // Bottom features
  const feats = [
    { t: "Points Economy",      d: "Earn on mobile top-ups, fibre bills, DhiraaguPay transactions, and partner spend" },
    { t: "Redemption Catalog",  d: "Redeem for data bundles, device discounts, eZone vouchers, and partner rewards" },
    { t: "Gamification",        d: "Streak bonuses, milestone badges, and referral multipliers drive engagement" },
    { t: "Real-Time BRM Check", d: "Live eligibility verification via Oracle BRM before any offer redemption" },
  ];
  feats.forEach((f, i) => {
    const x = 0.4 + i * 2.38;
    addCard(s, x, 3.4, 2.2, 1.92, C.white);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 3.4, w: 2.2, h: 0.06, fill: { color: C.rose }, line: { color: C.rose } });
    s.addText(f.t, { x: x + 0.1, y: 3.5, w: 2.0, h: 0.38, fontSize: 12, bold: true, fontFace: "Calibri", color: C.navy, margin: 0 });
    s.addText(f.d, { x: x + 0.1, y: 3.92, w: 2.0, h: 1.3, fontSize: 11, fontFace: "Calibri Light", color: C.dark, margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 18 – MODULE 11: SELF-SERVICE CUSTOMER HUB
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addLightTitle(s, "Module 11 — Self-Service Customer Hub");

  s.addText(
    "A unified digital portal mirroring Dhiraagu's App experience — empowering B2C and B2B customers to self-manage without calling support, reducing contact center load and improving NPS.",
    { x: 0.4, y: 1.12, w: 9.2, h: 0.75, fontSize: 13, fontFace: "Calibri Light", color: C.dark, margin: 0 }
  );

  const portals = [
    { title: "Account Management",  desc: "View and update personal/business profile, contacts, and preferences",         col: C.navy },
    { title: "Bill & Payments",      desc: "View invoices, pay online, set up auto-pay, and download statements",          col: "1D4ED8" },
    { title: "Data Usage Monitor",   desc: "Real-time usage by SIM, line, or department with alert thresholds",             col: "0D9488" },
    { title: "Plan Upgrades",        desc: "Browse and activate new plans, bundles, and add-ons without agent intervention", col: "7C3AED" },
    { title: "Support Tickets",      desc: "Raise, track, and close service requests with full conversation history",       col: C.rose },
    { title: "Single Sign-On",       desc: "Federated identity with Dhiraagu's existing IAM / LDAP stack — no new login",  col: "D97706" },
  ];

  portals.forEach((p, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 3.18;
    const y = 2.05 + row * 1.65;
    addCard(s, x, y, 3.0, 1.5, C.white);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 3.0, h: 0.08, fill: { color: p.col }, line: { color: p.col } });
    s.addText(p.title, { x: x + 0.12, y: y + 0.14, w: 2.76, h: 0.4, fontSize: 13, bold: true, fontFace: "Calibri", color: p.col, margin: 0 });
    s.addText(p.desc,  { x: x + 0.12, y: y + 0.58, w: 2.76, h: 0.85, fontSize: 11.5, fontFace: "Calibri Light", color: C.dark, margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 19 – ORACLE BRM & RODOD INTEGRATION (dark)
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkBg(s);
  addDarkTitle(s, "Seamless Integration with Oracle BRM & RODOD");

  // Oracle BRM box (left)
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 1.1, w: 3.5, h: 4.1, fill: { color: "1E3A5F" }, line: { color: "7C3AED", width: 1.5 } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 1.1, w: 3.5, h: 0.52, fill: { color: "7C3AED" }, line: { color: "7C3AED" } });
  s.addText("Oracle BRM", { x: 0.3, y: 1.1, w: 3.5, h: 0.52, fontSize: 14, bold: true, fontFace: "Calibri", color: C.white, align: "center", valign: "middle", margin: 0 });

  const brmPoints = ["Real-time balance query", "Billing plan sync", "Payment event hooks", "Usage data feed", "Invoice generation", "Credit limit management"];
  s.addText(brmPoints.map((b, i) => ({ text: b, options: { bullet: true, breakLine: i < brmPoints.length - 1 } })), {
    x: 0.45, y: 1.72, w: 3.2, h: 3.3,
    fontSize: 12, fontFace: "Calibri Light", color: "C8D8F0", valign: "top", margin: 0,
  });

  // Center BRT 360 orchestration
  s.addShape(pres.shapes.RECTANGLE, { x: 3.95, y: 1.85, w: 2.1, h: 2.55, fill: { color: C.rose }, line: { color: C.rose } });
  s.addText("BRT 360\nOrchestration\nLayer", { x: 3.95, y: 1.85, w: 2.1, h: 2.55, fontSize: 15, bold: true, fontFace: "Calibri", color: C.white, align: "center", valign: "middle", margin: 0 });

  // Arrows left to center
  s.addShape(pres.shapes.LINE, { x: 3.8, y: 3.12, w: 0.15, h: 0, line: { color: C.rose, width: 2 } });
  // Arrows center to right
  s.addShape(pres.shapes.LINE, { x: 6.05, y: 3.12, w: 0.15, h: 0, line: { color: "0D9488", width: 2 } });

  // RODOD box (right)
  s.addShape(pres.shapes.RECTANGLE, { x: 6.2, y: 1.1, w: 3.5, h: 4.1, fill: { color: "0A2A2A" }, line: { color: "0D9488", width: 1.5 } });
  s.addShape(pres.shapes.RECTANGLE, { x: 6.2, y: 1.1, w: 3.5, h: 0.52, fill: { color: "0D9488" }, line: { color: "0D9488" } });
  s.addText("RODOD Stack", { x: 6.2, y: 1.1, w: 3.5, h: 0.52, fontSize: 14, bold: true, fontFace: "Calibri", color: C.white, align: "center", valign: "middle", margin: 0 });

  const rodPoints = ["Product order fulfillment", "Network provisioning triggers", "Service activation events", "Digital catalog sync", "Order status callbacks", "Inventory management"];
  s.addText(rodPoints.map((r, i) => ({ text: r, options: { bullet: true, breakLine: i < rodPoints.length - 1 } })), {
    x: 6.35, y: 1.72, w: 3.2, h: 3.3,
    fontSize: 12, fontFace: "Calibri Light", color: "A8D8C8", valign: "top", margin: 0,
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 20 – IMPLEMENTATION ROADMAP
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addLightTitle(s, "Implementation Roadmap — 18 Months");

  const phases = [
    {
      phase: "Phase 1", months: "Months 1–6", label: "Foundation",
      items: ["Customer 360 & Account Management", "Service Request & Case Management", "Oracle BRM Integration", "Core Data Migration"],
      color: C.navy,
    },
    {
      phase: "Phase 2", months: "Months 7–12", label: "Growth",
      items: ["Order Management & Product Catalog", "Campaign & Marketing Automation", "Analytics & Reporting", "RODOD Integration"],
      color: "1D4ED8",
    },
    {
      phase: "Phase 3", months: "Months 13–18", label: "Excellence",
      items: ["Loyalty & Rewards Engine", "Field Force Management", "Partner Portal", "Self-Service Customer Hub"],
      color: C.rose,
    },
  ];

  // Timeline bar
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 1.2, w: 9.2, h: 0.15, fill: { color: "CBD5E1" }, line: { color: "CBD5E1" } });

  phases.forEach((ph, i) => {
    const x = 0.4 + i * 3.08;
    // Dot
    s.addShape(pres.shapes.OVAL, { x: x + 1.4, y: 1.05, w: 0.35, h: 0.35, fill: { color: ph.color }, line: { color: ph.color } });
    // Phase card
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.58, w: 3.0, h: 3.7, fill: { color: C.white }, line: { color: "E2E8F0", width: 0.75 }, shadow: makeShadow() });
    // Top colored bar
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.58, w: 3.0, h: 0.7, fill: { color: ph.color }, line: { color: ph.color } });
    s.addText(ph.phase + " · " + ph.months, { x, y: 1.58, w: 3.0, h: 0.38, fontSize: 12, bold: true, fontFace: "Calibri", color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(ph.label, { x, y: 1.96, w: 3.0, h: 0.32, fontSize: 13, fontFace: "Calibri Light", color: "D0E0FF", align: "center", valign: "middle", margin: 0 });
    // Items
    s.addText(ph.items.map((it, ii) => ({ text: it, options: { bullet: true, breakLine: ii < ph.items.length - 1 } })), {
      x: x + 0.15, y: 2.35, w: 2.7, h: 2.85,
      fontSize: 12, fontFace: "Calibri Light", color: C.dark, valign: "top", margin: 0,
    });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 21 – WHY BRT 360
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  lightBg(s);
  addLightTitle(s, "Why BRT 360 for Dhiraagu");

  const reasons = [
    { num: "1", title: "Telecom-Native Design",   desc: "Purpose-built for Communications Service Providers — not an adapted generic CRM. Every module reflects telecom data models, billing cycles, and customer journeys." },
    { num: "2", title: "Oracle BRM Ready",          desc: "Pre-built connectors and adapters for Oracle BRM — zero custom middleware, proven API patterns, and battle-tested integration scripts." },
    { num: "3", title: "RODOD Compatible",          desc: "Digital order orchestration is built in. BRT 360 speaks the RODOD language natively — service activation, provisioning triggers, and catalog sync all included." },
    { num: "4", title: "Open Architecture",         desc: ".NET + Node.js/React stack with standard APIs — no proprietary runtime, no vendor lock-in. Dhiraagu retains full ownership of the platform." },
    { num: "5", title: "Maldives-Ready",            desc: "Offline-first design for multi-atoll operations. Works seamlessly in low-connectivity environments and syncs automatically when online." },
    { num: "6", title: "Proven Delivery",           desc: "30+ telecom deployments globally, 98% client retention, Oracle-certified team. BlueRose brings Tier-1 CSP experience to Dhiraagu." },
  ];

  reasons.forEach((r, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.38 + col * 3.18;
    const y = 1.1 + row * 2.15;
    addCard(s, x, y, 3.0, 2.0, C.white);
    // Number circle
    s.addShape(pres.shapes.OVAL, { x: x + 0.15, y: y + 0.15, w: 0.55, h: 0.55, fill: { color: C.rose }, line: { color: C.rose } });
    s.addText(r.num, { x: x + 0.15, y: y + 0.15, w: 0.55, h: 0.55, fontSize: 16, bold: true, fontFace: "Calibri", color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(r.title, { x: x + 0.85, y: y + 0.18, w: 2.0, h: 0.5, fontSize: 13, bold: true, fontFace: "Calibri", color: C.navy, margin: 0 });
    s.addText(r.desc,  { x: x + 0.15, y: y + 0.8, w: 2.7, h: 1.1, fontSize: 11.5, fontFace: "Calibri Light", color: C.dark, margin: 0 });
  });
}

// ════════════════════════════════════════════════════════════════
// SLIDE 22 – THANK YOU / NEXT STEPS
// ════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  darkBg(s);

  // Rose accent left bar
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.5, h: 5.625, fill: { color: C.rose }, line: { color: C.rose } });

  // Decorative circles
  s.addShape(pres.shapes.OVAL, { x: 7.5, y: 3.8, w: 3.5, h: 3.5, fill: { color: "E8416B", transparency: 82 }, line: { color: "E8416B", transparency: 82 } });
  s.addShape(pres.shapes.OVAL, { x: 8.2, y: 4.2, w: 2.2, h: 2.2, fill: { color: "E8416B", transparency: 68 }, line: { color: "E8416B", transparency: 68 } });

  s.addText("Thank You", {
    x: 0.8, y: 0.5, w: 7, h: 1.2,
    fontSize: 58, bold: true, fontFace: "Calibri",
    color: C.white, align: "left", margin: 0,
  });

  s.addText("Next Steps", {
    x: 0.8, y: 1.95, w: 7, h: 0.45,
    fontSize: 18, bold: true, fontFace: "Calibri",
    color: C.rose, align: "left", margin: 0,
  });

  const steps = [
    "Discovery Workshop with Dhiraagu IT & Business teams",
    "Proof-of-Concept: Customer 360 module demonstration",
    "Commercial Proposal & SLA definition agreement",
  ];
  steps.forEach((step, i) => {
    s.addShape(pres.shapes.OVAL, { x: 0.82, y: 2.52 + i * 0.72, w: 0.35, h: 0.35, fill: { color: C.rose }, line: { color: C.rose } });
    s.addText(String(i + 1), { x: 0.82, y: 2.52 + i * 0.72, w: 0.35, h: 0.35, fontSize: 12, bold: true, fontFace: "Calibri", color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(step, { x: 1.3, y: 2.52 + i * 0.72, w: 6.5, h: 0.35, fontSize: 14, fontFace: "Calibri Light", color: "C8D8F0", valign: "middle", margin: 0 });
  });

  // Divider
  s.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 4.72, w: 5, h: 0.04, fill: { color: C.rose }, line: { color: C.rose } });

  // Contact block
  s.addText("BlueRose Technologies", {
    x: 0.8, y: 4.85, w: 5, h: 0.38,
    fontSize: 16, bold: true, fontFace: "Calibri", color: C.white, margin: 0,
  });
  s.addText("www.bluerose-tech.com", {
    x: 0.8, y: 5.22, w: 4, h: 0.3,
    fontSize: 13, fontFace: "Calibri Light", color: C.rose, margin: 0,
  });
}

// ── Save ───────────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: "./BRT360_CRM_Dhiraagu_Proposal.pptx" })
  .then(() => console.log("✅ Saved: BRT360_CRM_Dhiraagu_Proposal.pptx"))
  .catch(err => { console.error("❌ Error:", err); process.exit(1); });
