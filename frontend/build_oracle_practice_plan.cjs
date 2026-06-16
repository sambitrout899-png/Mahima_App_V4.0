/**
 * CS Soft Solutions — Oracle Practice Launch Plan
 * Ground-Level Implementation Deck (21 slides)
 *
 * Run:
 *   npm install pptxgenjs          (skip if already installed)
 *   node build_oracle_practice_plan.cjs
 *
 * Output: CS_Soft_Oracle_Practice_Plan.pptx
 */

"use strict";
const PptxGenJS = require("pptxgenjs");
const pres = new PptxGenJS();
pres.layout  = "LAYOUT_16x9";
pres.title   = "CS Soft Solutions – Oracle Practice Launch Plan";
pres.author  = "CS Soft Solutions";
pres.subject = "Oracle Practice Implementation";

// ── BRAND PALETTE ────────────────────────────────────────────────
const C = {
  navy:    "1A2744",   // dominant dark
  red:     "C74634",   // Oracle red accent
  amber:   "E8A020",   // highlight / callout
  steel:   "2C4A7C",   // mid-dark card fill
  lightBg: "F4F7FC",   // slide background
  cardBg:  "EAEFF8",   // content card
  white:   "FFFFFF",
  dark:    "1A1A2E",
  mid:     "4A5568",
  muted:   "8896A8",
  green:   "1E7A4A",
  greenLt: "E6F4EE",
  redLt:   "FDECEA",
  amberLt: "FFF3DC",
  steelLt: "E8EDF8",
};

const mkSh = () => ({ type: "outer", color: "000000", blur: 5, offset: 2, angle: 135, opacity: 0.10 });

// ── HELPERS ──────────────────────────────────────────────────────
function bg(slide, color) { slide.background = { color }; }

function titleBar(slide, text, barColor, textColor) {
  barColor  = barColor  || C.navy;
  textColor = textColor || C.white;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.68,
    fill: { color: barColor }, line: { color: barColor }
  });
  slide.addText(text, {
    x: 0.38, y: 0, w: 9.24, h: 0.68,
    fontSize: 20, bold: true, color: textColor,
    valign: "middle", fontFace: "Calibri", margin: 0
  });
}

function sectionTag(slide, text, x, y, color) {
  color = color || C.red;
  const w = text.length * 0.092 + 0.28;
  slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h: 0.24,
    fill: { color }, line: { color } });
  slide.addText(text, { x, y, w, h: 0.24,
    fontSize: 8, bold: true, color: C.white,
    align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
}

function card(slide, x, y, w, h, fill, border) {
  fill   = fill   || C.white;
  border = border || "D8DFF0";
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: fill }, line: { color: border, width: 1 },
    shadow: mkSh()
  });
}

function txt(slide, text, x, y, w, h, opts) {
  opts = opts || {};
  slide.addText(text, Object.assign({
    x, y, w, h, fontFace: "Calibri", valign: "top", wrap: true
  }, opts));
}

function bigStat(slide, value, label, x, y, valColor) {
  valColor = valColor || C.red;
  txt(slide, value, x, y,        2.0, 0.65, { fontSize: 36, bold: true, color: valColor, align: "center", valign: "bottom" });
  txt(slide, label, x, y + 0.62, 2.0, 0.30, { fontSize: 9,  color: C.muted, align: "center" });
}

function bullets(slide, items, x, y, w, h, size) {
  size = size || 11.5;
  slide.addText(
    items.map(function(t, i) {
      return { text: t, options: { bullet: true, breakLine: i < items.length - 1 } };
    }),
    { x, y, w, h, fontSize: size, color: C.dark, fontFace: "Calibri", paraSpaceAfter: 5, valign: "top" }
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 1 — COVER
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.navy);

  // Left accent stripe
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 5.625,
    fill: { color: C.red }, line: { color: C.red } });

  // Top-right Oracle red triangle accent
  s.addShape(pres.shapes.RIGHT_TRIANGLE, { x: 7.5, y: 0, w: 2.5, h: 2.2,
    fill: { color: "1E3060" }, line: { color: "1E3060" } });

  txt(s, "CS Soft Solutions", 0.42, 0.72, 9, 0.55, {
    fontSize: 18, color: "8AACDA", bold: false });
  txt(s, "Oracle Practice", 0.42, 1.22, 9, 1.05, {
    fontSize: 60, bold: true, color: C.white, charSpacing: 1 });
  txt(s, "Launch Plan", 0.42, 2.18, 9, 0.75, {
    fontSize: 52, bold: true, color: C.red });

  txt(s, "Ground-Level Implementation  ·  Lateral Hire Strategy  ·  Sub-vendor Deployment", 0.42, 3.05, 8.5, 0.38, {
    fontSize: 14, color: "7A96BB", italic: true });

  // Tech tags
  var tags = ["Siebel  25%", "BRM  40%", "OSM · UIM · ASAP  35%"];
  var tagColors = [C.amber, C.red, "2C7BB6"];
  tags.forEach(function(t, i) {
    var tx = 0.42 + i * 2.95;
    s.addShape(pres.shapes.RECTANGLE, { x: tx, y: 3.7, w: 2.7, h: 0.32,
      fill: { color: tagColors[i] }, line: { color: tagColors[i] } });
    txt(s, t, tx, 3.7, 2.7, 0.32, {
      fontSize: 11, bold: true, color: C.white, align: "center", valign: "middle" });
  });

  txt(s, "Confidential  ·  June 2026", 0.42, 5.2, 6, 0.25, {
    fontSize: 9, color: "4A6280", italic: true });
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 2 — OPPORTUNITY IN 60 SECONDS
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.lightBg);
  titleBar(s, "The Opportunity in 60 Seconds");

  var stats = [
    { v: "₹2,400 Cr",  l: "Oracle services addressable\nmarket in India (2025–26)" },
    { v: "85%",         l: "Tier-1 Indian telcos run\nOracle BRM for billing" },
    { v: "2033",        l: "Oracle Siebel extended support —\nlong revenue tail" },
    { v: "< 800",       l: "Senior BRM + OSS consultants\navailable in India" },
  ];
  stats.forEach(function(st, i) {
    var x = 0.32 + i * 2.38;
    card(s, x, 0.82, 2.22, 1.45, C.white);
    bigStat(s, st.v, st.l, x, 0.88, i === 3 ? C.amber : C.red);
  });

  // Two column narrative
  card(s, 0.32, 2.48, 4.55, 2.8, C.white);
  txt(s, "Why CS Soft Solutions — Right Now", 0.52, 2.6, 4.15, 0.32, { fontSize: 13, bold: true, color: C.navy });
  bullets(s, [
    "India's telecom sector is undergoing its largest-ever BSS/OSS transformation — 5G rollout, spectrum auctions, BRM 12.x migration wave",
    "Tier-1 SIs (TCS, Wipro, Infosys) have Oracle CoEs but are chronically short on niche BRM/OSM/UIM talent — creating a ready sub-vendor opportunity",
    "Siebel CRM still runs in 60%+ of large enterprises; scarce talent commands 30–40% premium over general CRM rates",
    "Oracle is actively pushing RODOD partners for last-mile delivery — timing is ideal",
  ], 0.52, 3.0, 4.15, 2.18);

  card(s, 5.13, 2.48, 4.55, 2.8, C.navy);
  txt(s, "The CS Soft Advantage", 5.33, 2.6, 4.15, 0.32, { fontSize: 13, bold: true, color: C.amber });
  bullets(s, [
    "Lean structure = faster hiring, higher offer competitiveness vs large SIs",
    "No bench politics — lateral hires go directly billable within 30–60 days",
    "Sub-vendor model = revenue in Month 3–4, before direct relationships mature",
    "Focus on 3 high-value stacks only — avoid commodity Oracle work",
    "Growth path for hires = attract talent from stagnant SI environments",
  ], 5.33, 3.0, 4.15, 2.18, 11.5);
  // Override text color for dark card
  bullets(s, [
    "Lean structure = faster hiring, higher offer competitiveness vs large SIs",
    "No bench politics — lateral hires go directly billable within 30–60 days",
    "Sub-vendor model = revenue in Month 3–4, before direct relationships mature",
    "Focus on 3 high-value stacks only — avoid commodity Oracle work",
    "Growth path for hires = attract talent from stagnant SI environments",
  ], 5.33, 3.0, 4.15, 2.18, 11.5);
  // Redo with white text
  s.addText(
    [
      { text: "Lean structure — faster hiring, higher offer vs large SIs",         options: { bullet: true, breakLine: true } },
      { text: "No bench politics — lateral hires go directly billable in 30–60 d", options: { bullet: true, breakLine: true } },
      { text: "Sub-vendor model — revenue in Month 3–4, before direct matures",    options: { bullet: true, breakLine: true } },
      { text: "Focus on 3 high-value stacks — avoid commodity Oracle work",         options: { bullet: true, breakLine: true } },
      { text: "Growth path for hires = attract talent from SI environments",        options: { bullet: true, breakLine: false } },
    ],
    { x: 5.33, y: 3.0, w: 4.15, h: 2.18, fontSize: 11, color: "C8D8EE",
      fontFace: "Calibri", paraSpaceAfter: 5, valign: "top" }
  );
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 3 — INDIA ORACLE ECOSYSTEM
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.lightBg);
  titleBar(s, "India Oracle Ecosystem — Market Context");

  // Buyer segments
  var segs = [
    { name: "Telecom", color: "1A5F8A", clients: "Jio · Airtel · Vi\nBSNL · Tata Comm\nVodafone Global", stack: "BRM · OSM · UIM · ASAP" },
    { name: "BFSI", color: "1E7A4A", clients: "HDFC · ICICI · SBI\nKotak · Axis · LIC\nPNB · NABARD", stack: "Siebel CRM · BRM" },
    { name: "Utilities / PSU", color: "8A4A1A", clients: "NTPC · ONGC · IOC\nPowerGrid · Adani\nState DISCOMs", stack: "Siebel · OSS Suite" },
    { name: "IT / Govt", color: "5A1A8A", clients: "NIC · UIDAI · IRCTC\nDefence PSUs\nLarge Manufacturers", stack: "Siebel CRM · ASAP" },
  ];
  segs.forEach(function(sg, i) {
    var x = 0.3 + i * 2.38;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 0.82, w: 2.22, h: 0.36,
      fill: { color: sg.color }, line: { color: sg.color } });
    txt(s, sg.name, x, 0.82, 2.22, 0.36, {
      fontSize: 12, bold: true, color: C.white, align: "center", valign: "middle" });
    card(s, x, 1.18, 2.22, 1.55, C.white);
    txt(s, sg.clients, x + 0.12, 1.26, 1.98, 1.0, { fontSize: 11, color: C.dark, align: "center" });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.1, y: 2.28, w: 2.02, h: 0.3,
      fill: { color: C.steelLt }, line: { color: "BFD0EE" } });
    txt(s, sg.stack, x + 0.1, 2.28, 2.02, 0.3, {
      fontSize: 9, bold: true, color: "1A3A6A", align: "center", valign: "middle" });
  });

  // SI landscape — who's doing it today
  card(s, 0.3, 2.82, 9.4, 2.55, C.white);
  txt(s, "Who's Delivering Oracle Services Today — and Where CS Soft Fits", 0.5, 2.94, 9.0, 0.3,
    { fontSize: 13, bold: true, color: C.navy });

  var sis = [
    { name: "TCS",        role: "Prime vendor to Airtel, BSNL, HDFC.\nOracle Alliance CoE in Siruseri & Pune.\nAlways short on BRM/OSM/ASAP talent.", type: "TARGET SUB-VENDOR", col: C.steelLt, tcol: "1A3A6A" },
    { name: "Wipro",      role: "Oracle Comms practice, key BRM\ndeployments at Vi, Tata Comm.\nActive sub-vendor intake.", type: "TARGET SUB-VENDOR", col: C.steelLt, tcol: "1A3A6A" },
    { name: "Infosys",    role: "Oracle CoE, Telco vertical.\nLarge Siebel footprint in BFSI.\nSub-contract during project spikes.", type: "TARGET SUB-VENDOR", col: C.steelLt, tcol: "1A3A6A" },
    { name: "Tech Mahindra", role: "Deep telco BSS/OSS relationships.\nOSM/UIM projects via Comviva + Oracle.\nOpen to boutique sub-vendors.", type: "TARGET SUB-VENDOR", col: C.steelLt, tcol: "1A3A6A" },
    { name: "Oracle Direct", role: "Oracle India staffs its own projects.\nAugmentation via RODOD partners.\nDirect access via OPN program.", type: "RODOD CHANNEL", col: C.redLt, tcol: C.red },
  ];
  sis.forEach(function(si, i) {
    var x = 0.45 + i * 1.84;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 3.32, w: 1.68, h: 0.26,
      fill: { color: si.tcol === C.red ? C.red : C.navy }, line: { color: si.tcol === C.red ? C.red : C.navy } });
    txt(s, si.name, x, 3.32, 1.68, 0.26, {
      fontSize: 10, bold: true, color: C.white, align: "center", valign: "middle" });
    txt(s, si.role, x, 3.62, 1.68, 0.78, { fontSize: 9, color: C.dark });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 5.08, w: 1.68, h: 0.22,
      fill: { color: si.col }, line: { color: si.col } });
    txt(s, si.type, x, 5.08, 1.68, 0.22, {
      fontSize: 8, bold: true, color: si.tcol, align: "center", valign: "middle" });
  });
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 4 — TECHNOLOGY FOCUS & MARKET TAILWINDS
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.lightBg);
  titleBar(s, "Why Now — Five Market Tailwinds Driving Urgent Demand");

  var winds = [
    { icon: "5G", title: "5G Rollout → OSS Modernization Surge",
      body: "Jio, Airtel and BSNL are mid-roll of the largest 5G infrastructure build in India's history. This directly mandates OSM (order orchestration), UIM (network inventory) and ASAP (activation) upgrades. Projects valued at ₹300-600 Cr are live or in procurement NOW." },
    { icon: "BRM", title: "BRM 12.x Migration Wave",
      body: "Oracle announced end-of-primary support for BRM 7.x/11.x. India's Tier-1 telcos must migrate to BRM 12.x by 2027 — Airtel and Vi projects already funded. Each migration engagement is 18-36 months, ₹15-80 Cr — ideal long-duration staffing play." },
    { icon: "CRM", title: "Siebel Support Extended to 2033",
      body: "Contrary to fears, Oracle extended Siebel Premier Support to 2033. 60%+ of large Indian enterprises (banking, insurance, PSUs) still run Siebel 8.x. Projects: Innovation Pack upgrades, Siebel → Fusion CX migration roadmaps, performance tuning. Long tail." },
    { icon: "GAP", title: "Severe Talent Gap = Premium Rates",
      body: "Only ~800 senior BRM/OSM/UIM/ASAP consultants actively available in India. Demand far exceeds supply. Bill rates for senior BRM architects have risen 22% YoY. CS Soft can command ₹4,000-6,000/hr for the right profiles — margins of 30-40% are routine." },
    { icon: "OPN", title: "Oracle RODOD Program Actively Pushing Partners",
      body: "Oracle India's Alliance team actively funnels deals to certified RODOD partners. OPN Silver (free) registration unlocks deal registration, partner pricing and co-sell motions. CS Soft's niche focus is exactly what Oracle needs — boutique delivery partners, not more large SIs." },
  ];

  winds.forEach(function(w, i) {
    var col  = i % 2 === 0;
    var x    = col ? 0.3 : 5.25;
    var y    = 0.82 + Math.floor(i / 2) * 1.38;
    if (i === 4) { x = 0.3; }

    card(s, x, y, 4.6, 1.25, C.white);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.48, h: 1.25,
      fill: { color: C.red }, line: { color: C.red } });
    txt(s, w.icon, x, y + 0.28, 0.48, 0.65, {
      fontSize: 9, bold: true, color: C.white, align: "center", valign: "middle" });
    txt(s, w.title, x + 0.58, y + 0.1, 3.9, 0.3, { fontSize: 11, bold: true, color: C.navy });
    txt(s, w.body, x + 0.58, y + 0.42, 3.9, 0.76, { fontSize: 9.5, color: C.mid, wrap: true });

    // 5th card full width
    if (i === 4) {
      s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y, w: 9.4, h: 1.25,
        fill: { color: C.white }, line: { color: "D8DFF0", width: 1 }, shadow: mkSh() });
      s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y, w: 0.48, h: 1.25,
        fill: { color: C.red }, line: { color: C.red } });
      txt(s, "OPN", 0.3, y + 0.28, 0.48, 0.65, {
        fontSize: 9, bold: true, color: C.white, align: "center", valign: "middle" });
      txt(s, w.title, 0.88, y + 0.1, 8.7, 0.3, { fontSize: 11, bold: true, color: C.navy });
      txt(s, w.body,  0.88, y + 0.42, 8.7, 0.76, { fontSize: 9.5, color: C.mid });
    }
  });
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 5 — TECHNOLOGY FOCUS BREAKDOWN
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.lightBg);
  titleBar(s, "Our Technology Focus — Deliberate Depth Over Breadth");

  var stacks = [
    {
      name: "Oracle BRM",
      pct: "40%",
      color: C.red,
      why: "Highest demand · Largest projects · Best rates · India telco is #1 BRM market globally",
      skills: "BRM Core Engine · Billing Pipeline · ECE (Elastic Charging Engine) · Mediation · Self-Care · BRM-OCS Integration · Pipeline Manager · BRM Cloud",
      clients: "Jio · Airtel · Vi · BSNL · Tata Comm · Vodafone Global · Regional ISPs",
      rate: "₹2,500 – ₹5,500/hr",
    },
    {
      name: "Oracle OSS Suite",
      pct: "35%",
      color: "2C7BB6",
      why: "5G tailwind · Scarcest talent = highest rates · Long-duration programs · Natural BRM complement",
      skills: "OSM (Order & Service Mgmt) · UIM (Unified Inventory Mgmt) · ASAP (Activation) · OCSM · MSO · Network Design & Analysis",
      clients: "Jio · Airtel · BSNL · Tech Mahindra · Oracle Direct",
      rate: "₹3,000 – ₹6,000/hr",
    },
    {
      name: "Oracle Siebel CRM",
      pct: "25%",
      color: C.amber,
      why: "Still widespread · Extended to 2033 · Migration projects · Scarce architect talent = premium",
      skills: "Siebel 8.x/IP19/IP20 · Siebel Open UI · EIM/EAI · Siebel CTI · Siebel Analytics · Fusion CX Migration Roadmap",
      clients: "HDFC · ICICI · SBI · Kotak · LIC · State Bank Subsidiaries · Govt PSUs",
      rate: "₹2,000 – ₹4,500/hr",
    },
  ];

  stacks.forEach(function(st, i) {
    var x = 0.3 + i * 3.17;
    // Main card
    card(s, x, 0.82, 3.0, 4.58, C.white, st.color);

    // Header
    s.addShape(pres.shapes.RECTANGLE, { x, y: 0.82, w: 3.0, h: 0.45,
      fill: { color: st.color }, line: { color: st.color } });
    txt(s, st.name, x, 0.82, 3.0, 0.45, {
      fontSize: 14, bold: true, color: C.white, align: "center", valign: "middle" });

    // % badge
    txt(s, st.pct, x, 1.28, 3.0, 0.65, {
      fontSize: 42, bold: true, color: st.color, align: "center", valign: "middle" });
    txt(s, "focus weightage", x, 1.9, 3.0, 0.2, {
      fontSize: 9, color: C.muted, align: "center" });

    // Why section
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.1, y: 2.16, w: 2.8, h: 0.26,
      fill: { color: C.lightBg }, line: { color: "D0DBF0" } });
    txt(s, "WHY", x + 0.1, 2.16, 0.38, 0.26, {
      fontSize: 8, bold: true, color: st.color, align: "center", valign: "middle" });
    txt(s, st.why, x + 0.52, 2.16, 2.35, 0.26, {
      fontSize: 8.5, color: C.mid, valign: "middle" });

    // Skills
    txt(s, "KEY SKILLS", x + 0.1, 2.52, 2.8, 0.22, { fontSize: 8, bold: true, color: C.navy });
    txt(s, st.skills, x + 0.1, 2.74, 2.8, 0.88, { fontSize: 9.5, color: C.dark, wrap: true });

    // Clients
    txt(s, "TARGET CLIENTS", x + 0.1, 3.68, 2.8, 0.22, { fontSize: 8, bold: true, color: C.navy });
    txt(s, st.clients, x + 0.1, 3.9, 2.8, 0.38, { fontSize: 9.5, color: C.mid });

    // Rate
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.1, y: 4.34, w: 2.8, h: 0.32,
      fill: { color: C.greenLt }, line: { color: "A8D8BC" } });
    txt(s, "BILL RATE: " + st.rate, x + 0.1, 4.34, 2.8, 0.32, {
      fontSize: 10, bold: true, color: C.green, align: "center", valign: "middle" });
  });
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 6 — PRACTICE LAUNCH MODEL (MASTER TIMELINE)
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.navy);

  txt(s, "Practice Launch Model — 4 Phases, 24 Months", 0.38, 0.15, 9.5, 0.55, {
    fontSize: 22, bold: true, color: C.white });
  txt(s, "From zero to ₹10 Cr revenue run-rate in 24 months via a deliberate hire-deploy-scale flywheel", 0.38, 0.65, 9.5, 0.3, {
    fontSize: 12, color: "7A96BB", italic: true });

  var phases = [
    { num: "01", name: "Foundation",    dur: "Month 0 – 3",   color: C.amber,   head: "5–7 hires",   rev: "₹0",          note: "Invest & Build" },
    { num: "02", name: "First Revenue", dur: "Month 3 – 6",   color: "2C9A5A", head: "8–10 total",  rev: "₹15–30L/mo",  note: "Sub-vendor Deployed" },
    { num: "03", name: "Scale Up",      dur: "Month 6 – 18",  color: "2C7BB6", head: "15–20 total", rev: "₹50–90L/mo",  note: "Mix: Sub-vnd + Direct" },
    { num: "04", name: "Full Practice", dur: "Month 18 – 24", color: C.red,    head: "25–35 total", rev: "₹1.0 Cr+/mo", note: "Direct + Project Mode" },
  ];

  phases.forEach(function(p, i) {
    var x = 0.28 + i * 2.38;
    // Card
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.1, w: 2.22, h: 4.2,
      fill: { color: "1E3060" }, line: { color: p.color, width: 2 } });

    // Number
    txt(s, p.num, x, 1.18, 2.22, 0.7, {
      fontSize: 48, bold: true, color: p.color, align: "center" });
    txt(s, p.name, x, 1.82, 2.22, 0.36, {
      fontSize: 14, bold: true, color: C.white, align: "center" });
    txt(s, p.dur, x, 2.2, 2.22, 0.28, {
      fontSize: 10, color: "7A96BB", align: "center" });

    // Divider
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.2, y: 2.54, w: 1.82, h: 0.02,
      fill: { color: p.color }, line: { color: p.color } });

    txt(s, "HEADCOUNT", x + 0.1, 2.65, 2.02, 0.22, { fontSize: 8, color: "7A96BB", align: "center" });
    txt(s, p.head, x, 2.88, 2.22, 0.38, { fontSize: 20, bold: true, color: C.white, align: "center" });

    txt(s, "MONTHLY REVENUE", x + 0.1, 3.38, 2.02, 0.22, { fontSize: 8, color: "7A96BB", align: "center" });
    txt(s, p.rev, x, 3.6, 2.22, 0.48, { fontSize: 18, bold: true, color: p.color, align: "center" });

    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.1, y: 4.2, w: 2.02, h: 0.26,
      fill: { color: p.color }, line: { color: p.color } });
    txt(s, p.note, x + 0.1, 4.2, 2.02, 0.26, {
      fontSize: 9, bold: true, color: C.navy, align: "center", valign: "middle" });
  });

  // Arrows between phases
  [0,1,2].forEach(function(i) {
    var ax = 0.28 + i * 2.38 + 2.22;
    txt(s, "→", ax, 2.6, 0.16, 0.4, {
      fontSize: 20, bold: true, color: "4A6A9A", align: "center" });
  });
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 7 — PHASE 1: FOUNDATION (Month 0–3)
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.lightBg);
  titleBar(s, "Phase 1 — Foundation: Month 0 to 3", C.amber, C.dark);
  sectionTag(s, "PHASE 1", 0.38, 0.78, C.amber);

  // Left: Hiring plan
  card(s, 0.3, 1.06, 5.8, 4.28, C.white);
  txt(s, "Critical First Hires — The Founding Team", 0.5, 1.16, 5.4, 0.3, { fontSize: 13, bold: true, color: C.navy });

  var hires = [
    { role: "Practice Head / Delivery Manager",           exp: "15+ yr",  ctc: "₹50–70 LPA",  why: "Owns client relationships + sub-vendor connects" },
    { role: "BRM Architect / Technical Lead",              exp: "10+ yr",  ctc: "₹35–48 LPA",  why: "BRM 12.x, ECE, Pipeline — the revenue engine" },
    { role: "BRM Senior Developer (×2)",                   exp: "6–9 yr",  ctc: "₹20–30 LPA",  why: "Billable Day 1 via sub-vendor; 2 gives redundancy" },
    { role: "Siebel Architect / Senior Consultant",        exp: "10+ yr",  ctc: "₹28–40 LPA",  why: "Covers BFSI + PSU demand; support & upgrade deals" },
    { role: "OSM/UIM/ASAP Lead Consultant",                exp: "8+ yr",   ctc: "₹32–45 LPA",  why: "Rarest skill — commands highest bill rate" },
  ];

  hires.forEach(function(h, i) {
    var y = 1.55 + i * 0.7;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.42, y, w: 5.56, h: 0.62,
      fill: { color: i % 2 === 0 ? C.lightBg : C.white }, line: { color: "E0E8F0", width: 0.5 } });
    txt(s, h.role, 0.55, y + 0.04, 2.8, 0.28, { fontSize: 10.5, bold: true, color: C.dark });
    txt(s, h.exp, 3.4, y + 0.04, 0.6, 0.28, { fontSize: 10, color: C.muted, align: "center" });
    txt(s, h.ctc, 4.05, y + 0.04, 1.2, 0.28, { fontSize: 10, bold: true, color: C.red, align: "center" });
    txt(s, h.why, 0.55, y + 0.33, 5.3, 0.22, { fontSize: 9, color: C.mid, italic: true });
  });

  // Right: Actions
  card(s, 6.4, 1.06, 3.28, 4.28, C.navy);
  txt(s, "Month 0-3 Actions", 6.6, 1.16, 2.88, 0.3, { fontSize: 13, bold: true, color: C.amber });

  var actions = [
    { w: "Wk 1",  t: "Register Oracle Partner Network (OPN) Silver — free, unlocks deal reg" },
    { w: "Wk 1",  t: "Reach out to Oracle India Alliance Manager (via OPN portal)" },
    { w: "Wk 2",  t: "Post JDs — LinkedIn Recruiter + Naukri Premium + referral network" },
    { w: "Wk 2",  t: "Contact 3–4 Tier-2 sub-vendor partners (Rapsys, Mastech, Evosys)" },
    { w: "Wk 3",  t: "First round interviews; shortlist 5–6 candidates per role" },
    { w: "Wk 4",  t: "Make first 2 offers; sign sub-vendor NDA / MSA with 2 primes" },
    { w: "Mo 2",  t: "Onboard 4–5 hires; create CV bank + rate cards for sub-vendor subs" },
    { w: "Mo 2",  t: "Register on TCS Vendor Portal + Wipro Vendor Management System" },
    { w: "Mo 3",  t: "Submit profiles to 3 open sub-vendor requirements" },
    { w: "Mo 3",  t: "Complete OPN Cloud learning paths (free) for partner certifications" },
  ];
  actions.forEach(function(a, i) {
    var y = 1.54 + i * 0.38;
    s.addShape(pres.shapes.RECTANGLE, { x: 6.5, y, w: 0.38, h: 0.28,
      fill: { color: C.amber }, line: { color: C.amber } });
    txt(s, a.w, 6.5, y, 0.38, 0.28, { fontSize: 7.5, bold: true, color: C.dark, align: "center", valign: "middle" });
    txt(s, a.t, 6.94, y, 2.6, 0.28, { fontSize: 8.5, color: "C8D8EE", valign: "middle" });
  });

  // Investment callout
  txt(s, "Est. Phase 1 Investment: ₹55–80 L", 0.3, 5.38, 5.8, 0.24, {
    fontSize: 10, bold: true, color: C.mid, italic: true });
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 8 — PHASE 2: FIRST REVENUE (Month 3–6)
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.lightBg);
  titleBar(s, "Phase 2 — First Revenue via Sub-vendor Deployment: Month 3–6", "1E7A4A");
  sectionTag(s, "PHASE 2", 0.38, 0.78, C.green);

  // Deployment model visual
  card(s, 0.3, 1.06, 9.4, 1.58, C.white);
  txt(s, "The Sub-vendor Revenue Machine", 0.5, 1.16, 9, 0.28, { fontSize: 13, bold: true, color: C.navy });

  var flow = ["CS Soft\nHires Resource", "CS Soft\nSub-contracts", "Prime SI\n(TCS/Wipro/Infosys)", "Prime SI\nDeploys At", "End Client\n(Jio/Airtel/HDFC)"];
  var flowColors = [C.navy, C.green, C.steel, C.green, "1A5F8A"];
  flow.forEach(function(f, i) {
    var x = 0.48 + i * 1.78;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.5, w: 1.5, h: 0.72,
      fill: { color: flowColors[i] }, line: { color: flowColors[i] } });
    txt(s, f, x, 1.5, 1.5, 0.72, {
      fontSize: 9.5, bold: true, color: C.white, align: "center", valign: "middle" });
    if (i < flow.length - 1) {
      txt(s, "→", x + 1.5, 1.74, 0.28, 0.28, { fontSize: 16, bold: true, color: C.muted, align: "center" });
    }
  });

  // Left: margin math
  card(s, 0.3, 2.82, 4.55, 2.5, C.white);
  txt(s, "Sub-vendor Margin Model (per resource)", 0.5, 2.94, 4.15, 0.28, { fontSize: 12, bold: true, color: C.navy });
  var lines = [
    { k: "Bill rate to Prime SI",              v: "₹3,500 / hr",    c: C.dark },
    { k: "Monthly billing (8hr × 22 days)",    v: "₹ 6.16 L",      c: C.dark },
    { k: "Resource CTC (e.g. BRM Sr Dev ₹25L)  →  monthly cost", v: "₹ 2.08 L", c: C.dark },
    { k: "+ 40% overhead (benefits, infra)",   v: "₹ 0.83 L",      c: C.dark },
    { k: "Total cost per resource",            v: "₹ 2.91 L",      c: C.dark },
    { k: "GROSS MARGIN per resource/month",    v: "₹ 3.25 L  (53%)", c: C.green },
  ];
  lines.forEach(function(l, i) {
    var y = 3.3 + i * 0.35;
    var bg2 = l.c === C.green ? C.greenLt : (i % 2 === 0 ? C.lightBg : C.white);
    s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y, w: 4.35, h: 0.32,
      fill: { color: bg2 }, line: { color: "E0EEE8", width: 0.5 } });
    txt(s, l.k, 0.52, y + 0.02, 3.0, 0.28, { fontSize: 9.5, bold: l.c === C.green, color: C.dark, valign: "middle" });
    txt(s, l.v, 3.55, y + 0.02, 1.1, 0.28, { fontSize: 9.5, bold: true, color: l.c, align: "right", valign: "middle" });
  });

  // Right: Month 3-6 targets
  card(s, 5.13, 2.82, 4.55, 2.5, C.navy);
  txt(s, "Phase 2 Revenue Targets", 5.33, 2.94, 4.15, 0.28, { fontSize: 12, bold: true, color: C.amber });
  var targets = [
    { mo: "Month 3", head: "2 deployed",  rev: "₹8–10 L/mo" },
    { mo: "Month 4", head: "4 deployed",  rev: "₹18–22 L/mo" },
    { mo: "Month 5", head: "5 deployed",  rev: "₹22–28 L/mo" },
    { mo: "Month 6", head: "6 deployed",  rev: "₹28–35 L/mo" },
  ];
  targets.forEach(function(t, i) {
    var y = 3.3 + i * 0.52;
    s.addShape(pres.shapes.RECTANGLE, { x: 5.23, y, w: 4.35, h: 0.44,
      fill: { color: "223060" }, line: { color: "3A5080", width: 0.5 } });
    txt(s, t.mo, 5.35, y + 0.04, 0.9, 0.36, { fontSize: 10, bold: true, color: "8AACDA", valign: "middle" });
    txt(s, t.head, 6.3, y + 0.04, 1.4, 0.36, { fontSize: 10, color: C.white, valign: "middle" });
    txt(s, t.rev, 7.75, y + 0.04, 1.7, 0.36, { fontSize: 12, bold: true, color: "4ADA8A", align: "right", valign: "middle" });
  });
  txt(s, "Hire additional 2–3 people in parallel to fuel Phase 3", 5.23, 5.1, 4.35, 0.25,
    { fontSize: 9, color: "7A96BB", italic: true, align: "center" });
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 9 — LATERAL HIRE STRATEGY
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.lightBg);
  titleBar(s, "Lateral Hire Strategy — Where & How to Poach the Best Talent");
  sectionTag(s, "TALENT", 0.38, 0.78);

  // Source pools
  txt(s, "Primary Talent Pools to Target", 0.38, 0.88, 9.3, 0.28, { fontSize: 13, bold: true, color: C.navy });

  var pools = [
    { org: "TCS", sub: "Oracle Alliance / Telecom CoE", loc: "Siruseri, Pune, Hyderabad",
      how: "Search LinkedIn 'Oracle BRM TCS', 'Siebel TCS'. Reach out directly. TCS bonuses are mediocre — 15% premium usually converts." },
    { org: "Wipro", sub: "Oracle Communications Practice", loc: "Bangalore, Pune",
      how: "'BRM Wipro', 'OSM UIM Wipro' on LinkedIn. Wipro bench consultants especially receptive — they get paid 50% on bench." },
    { org: "Infosys", sub: "Oracle CoE / BFS Oracle Practice", loc: "Pune, Bangalore, Mysore",
      how: "Infosys Oracle CoE has ~200 BRM/Siebel people. Search Naukri 'Oracle BRM Infosys notice period 30 days'." },
    { org: "Tech Mahindra", sub: "BSS/OSS Telco Practice", loc: "Pune, Hyderabad",
      how: "Strong OSM/UIM/ASAP pool. Bench periods common. TechM Oracle Comms unit is a goldmine for OSS skills." },
    { org: "Oracle India Direct", sub: "ACS / Oracle Consulting", loc: "Bengaluru, Hyderabad",
      how: "Ex-Oracle employees are gold — they know the product roadmap. Search 'Oracle ACS BRM', 'Oracle Consulting Siebel'." },
    { org: "Boutique Firms", sub: "Mastech, Hexaware, Coltivare", loc: "Pan-India",
      how: "Small Oracle shops have well-trained staff looking for growth. Approach with equity / senior role as growth path." },
  ];

  pools.forEach(function(p, i) {
    var col = i % 3;
    var row = Math.floor(i / 3);
    var x = 0.3 + col * 3.17;
    var y = 1.22 + row * 2.08;
    card(s, x, y, 3.0, 1.95, C.white);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 3.0, h: 0.3,
      fill: { color: C.navy }, line: { color: C.navy } });
    txt(s, p.org, x, y, 1.1, 0.3, { fontSize: 12, bold: true, color: C.white, valign: "middle", align: "center" });
    txt(s, p.sub, x + 1.15, y, 1.82, 0.3, { fontSize: 9, color: "8AACDA", valign: "middle" });
    txt(s, "Locations: " + p.loc, x + 0.1, y + 0.36, 2.8, 0.22, { fontSize: 9, color: C.muted, italic: true });
    txt(s, p.how, x + 0.1, y + 0.6, 2.8, 1.24, { fontSize: 9.5, color: C.dark, wrap: true });
  });

  // Bottom tip strip
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.28, w: 10, h: 0.35,
    fill: { color: C.navy }, line: { color: C.navy } });
  txt(s, "Pro tip: One great BRM Architect hire usually knows 4–5 more — ask for referrals from Day 1. Referral bonus of ₹50,000 accelerates this.", 0.38, 5.28, 9.24, 0.35, {
    fontSize: 10, color: C.amber, bold: true, valign: "middle" });
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 10 — TALENT PROFILES & COMPENSATION
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.white);
  titleBar(s, "Target Profiles, Compensation Benchmarks & Bill Rates");

  var hdr = { fill: { color: C.navy }, color: C.white, bold: true, align: "center" };
  var hdrL = { fill: { color: C.navy }, color: C.white, bold: true };

  var rows = [
    // Header
    [{ text: "Role", options: hdrL },
     { text: "Exp", options: hdr },
     { text: "Target CTC (LPA)", options: hdr },
     { text: "Market CTC", options: hdr },
     { text: "Bill Rate (/hr)", options: hdr },
     { text: "Monthly Billing", options: hdr },
     { text: "Margin est.", options: hdr }],

    // BRM
    [{ text: "BRM Architect (Lead)", options: { bold: true, fill: { color: "FFF0EE" }, color: C.dark } },
     { text: "10–14 yr", options: { align: "center" } },
     { text: "₹ 38–48 L", options: { bold: true, color: C.red, align: "center" } },
     { text: "₹ 40–55 L", options: { color: C.muted, align: "center" } },
     { text: "₹ 4,500–5,500", options: { bold: true, color: C.green, align: "center" } },
     { text: "₹ 7.9–9.7 L", options: { align: "center" } },
     { text: "42–48%", options: { bold: true, color: C.green, align: "center" } }],

    [{ text: "BRM Senior Dev / Consultant", options: { color: C.dark } },
     { text: "6–9 yr", options: { align: "center" } },
     { text: "₹ 22–32 L", options: { bold: true, color: C.red, align: "center" } },
     { text: "₹ 25–38 L", options: { color: C.muted, align: "center" } },
     { text: "₹ 3,000–4,000", options: { bold: true, color: C.green, align: "center" } },
     { text: "₹ 5.3–7.0 L", options: { align: "center" } },
     { text: "38–45%", options: { bold: true, color: C.green, align: "center" } }],

    [{ text: "BRM Developer", options: { color: C.dark } },
     { text: "3–6 yr", options: { align: "center" } },
     { text: "₹ 12–18 L", options: { bold: true, color: C.red, align: "center" } },
     { text: "₹ 14–22 L", options: { color: C.muted, align: "center" } },
     { text: "₹ 1,800–2,500", options: { bold: true, color: C.green, align: "center" } },
     { text: "₹ 3.2–4.4 L", options: { align: "center" } },
     { text: "35–42%", options: { bold: true, color: C.green, align: "center" } }],

    // Siebel
    [{ text: "Siebel Architect / Lead", options: { bold: true, fill: { color: "FFFAEE" }, color: C.dark } },
     { text: "10–15 yr", options: { align: "center" } },
     { text: "₹ 32–45 L", options: { bold: true, color: C.amber, align: "center" } },
     { text: "₹ 35–50 L", options: { color: C.muted, align: "center" } },
     { text: "₹ 4,000–5,000", options: { bold: true, color: C.green, align: "center" } },
     { text: "₹ 7.0–8.8 L", options: { align: "center" } },
     { text: "40–46%", options: { bold: true, color: C.green, align: "center" } }],

    [{ text: "Siebel Senior Consultant", options: { color: C.dark } },
     { text: "6–10 yr", options: { align: "center" } },
     { text: "₹ 18–26 L", options: { bold: true, color: C.amber, align: "center" } },
     { text: "₹ 20–30 L", options: { color: C.muted, align: "center" } },
     { text: "₹ 2,500–3,500", options: { bold: true, color: C.green, align: "center" } },
     { text: "₹ 4.4–6.2 L", options: { align: "center" } },
     { text: "36–43%", options: { bold: true, color: C.green, align: "center" } }],

    // OSS
    [{ text: "OSM / UIM Architect", options: { bold: true, fill: { color: "EEF4FF" }, color: C.dark } },
     { text: "8–12 yr", options: { align: "center" } },
     { text: "₹ 38–52 L", options: { bold: true, color: "2C7BB6", align: "center" } },
     { text: "₹ 40–58 L", options: { color: C.muted, align: "center" } },
     { text: "₹ 5,000–6,500", options: { bold: true, color: C.green, align: "center" } },
     { text: "₹ 8.8–11.4 L", options: { align: "center" } },
     { text: "44–52%", options: { bold: true, color: C.green, align: "center" } }],

    [{ text: "ASAP / OSM Senior", options: { color: C.dark } },
     { text: "5–8 yr", options: { align: "center" } },
     { text: "₹ 24–35 L", options: { bold: true, color: "2C7BB6", align: "center" } },
     { text: "₹ 28–40 L", options: { color: C.muted, align: "center" } },
     { text: "₹ 3,500–4,500", options: { bold: true, color: C.green, align: "center" } },
     { text: "₹ 6.2–7.9 L", options: { align: "center" } },
     { text: "38–44%", options: { bold: true, color: C.green, align: "center" } }],

    // Practice Head
    [{ text: "Practice Head (Oracle)", options: { bold: true, fill: { color: "F0F0F8" }, color: C.dark } },
     { text: "15+ yr", options: { align: "center" } },
     { text: "₹ 55–75 L", options: { bold: true, color: C.navy, align: "center" } },
     { text: "₹ 60–85 L", options: { color: C.muted, align: "center" } },
     { text: "Non-billable", options: { color: C.muted, align: "center", italic: true } },
     { text: "—", options: { color: C.muted, align: "center" } },
     { text: "Revenue Gen", options: { color: C.navy, align: "center", italic: true } }],
  ];

  s.addTable(rows, {
    x: 0.3, y: 0.78, w: 9.4, h: 4.62,
    colW: [2.5, 0.72, 1.28, 1.2, 1.35, 1.4, 0.95],
    border: { pt: 0.5, color: "E0E8F0" },
    fontFace: "Calibri", fontSize: 10.5,
    valign: "middle", rowH: 0.44,
  });

  s.addText("Market CTC = current market rate (what others pay). CS Soft to offer 'Target CTC' = competitive enough to attract without overpaying. Monthly billing assumes 8hr/day × 22 working days.", {
    x: 0.3, y: 5.3, w: 9.4, h: 0.22, fontSize: 8.5, color: C.muted, italic: true, fontFace: "Calibri"
  });
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 11 — SUB-VENDOR PARTNER ECOSYSTEM
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.lightBg);
  titleBar(s, "Sub-vendor & Deployment Partner Ecosystem");
  sectionTag(s, "DEPLOYMENT", 0.38, 0.78);

  // Tier 1 SIs
  txt(s, "Tier-1 Prime Vendors (Sub-contract target)", 0.38, 0.9, 9.3, 0.28, { fontSize: 12, bold: true, color: C.navy });

  var t1 = [
    { name: "TCS",          focus: "BRM · Siebel · OSM",  entry: "Register on TCS Vendor Portal\n(supplier.tcs.com); needs GST + MSME",     proj: "Airtel BRM · BSNL Siebel · HDFC CRM",          status: "HIGH PRIORITY" },
    { name: "Wipro",        focus: "BRM · OSM · ASAP",    entry: "Wipro Procurement Portal + TL intro from Oracle Alliance events",           proj: "Vi BRM 12.x · Tata Comm OSM · ONGC Siebel",    status: "HIGH PRIORITY" },
    { name: "Infosys",      focus: "Siebel · BRM",        entry: "InfyME vendor portal; need ISO or reference from existing vendor",          proj: "ICICI Siebel · SBI Siebel · Kotak BRM",        status: "MEDIUM" },
    { name: "Tech Mahindra",focus: "OSM · UIM · ASAP",    entry: "TechM PVMS portal; telecom domain focus helps entry",                       proj: "Airtel OSS · BSNL UIM · MTN Africa",            status: "HIGH PRIORITY" },
    { name: "HCL Tech",     focus: "Siebel · BRM",        entry: "HCL Vendor Management direct contact via Oracle Alliance",                  proj: "ICBC Siebel · SBI BRM · PSU accounts",         status: "MEDIUM" },
  ];

  t1.forEach(function(v, i) {
    var y = 1.22 + i * 0.7;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y, w: 9.4, h: 0.62,
      fill: { color: i % 2 === 0 ? C.white : C.lightBg }, line: { color: "D8E4F0", width: 0.5 } });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: y + 0.08, w: 0.95, h: 0.46,
      fill: { color: C.navy }, line: { color: C.navy } });
    txt(s, v.name, 0.3, y + 0.08, 0.95, 0.46, { fontSize: 10.5, bold: true, color: C.white, align: "center", valign: "middle" });
    txt(s, v.focus, 1.34, y + 0.06, 1.4, 0.24, { fontSize: 9.5, bold: true, color: C.red });
    txt(s, "Entry: " + v.entry, 1.34, y + 0.3, 3.1, 0.28, { fontSize: 8.5, color: C.mid, italic: true, wrap: true });
    txt(s, "Live projects: " + v.proj, 4.52, y + 0.06, 3.8, 0.24, { fontSize: 9, color: C.dark });
    var stColor = v.status === "HIGH PRIORITY" ? C.red : C.amber;
    s.addShape(pres.shapes.RECTANGLE, { x: 8.38, y: y + 0.14, w: 1.22, h: 0.28,
      fill: { color: stColor }, line: { color: stColor } });
    txt(s, v.status, 8.38, y + 0.14, 1.22, 0.28, { fontSize: 7.5, bold: true, color: C.white, align: "center", valign: "middle" });
  });

  // Tier-2 Oracle boutiques
  txt(s, "Tier-2 Oracle Boutiques (faster MSA, smaller margin compression)", 0.38, 4.78, 9.3, 0.25, { fontSize: 11, bold: true, color: C.navy });
  var t2 = ["Mastech Digital", "Rapsys Technologies", "Evosys / Nexgen", "Coltivare Consulting", "Birlasoft Oracle Practice", "Mphasis Oracle CoE"];
  t2.forEach(function(n, i) {
    var x = 0.38 + i * 1.58;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 5.06, w: 1.42, h: 0.28,
      fill: { color: C.cardBg }, line: { color: "BFD0EE" } });
    txt(s, n, x, 5.06, 1.42, 0.28, { fontSize: 8.5, color: C.navy, align: "center", valign: "middle" });
  });
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 12 — DIRECT CLIENT CHANNEL
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.lightBg);
  titleBar(s, "Direct Client Channel — Building Relationships Beyond Sub-vendor");
  sectionTag(s, "DIRECT CLIENTS", 0.38, 0.78);

  txt(s, "Sub-vendor is the fastest path to revenue but direct relationships are the path to sustainable margins. Build in parallel from Month 4.", 0.38, 0.9, 9.3, 0.3, { fontSize: 11, color: C.mid, italic: true });

  var clients = [
    { name: "Jio Platforms",       type: "Telecom",  stack: "BRM · OSM · UIM",  contact: "Oracle Alliance team introductions; Jio has in-house Oracle team that augments from approved vendors",        timeline: "Month 6–9" },
    { name: "Airtel",              type: "Telecom",  stack: "BRM · ASAP",       contact: "Active BRM 12.x migration; primary contact via TCS/Wipro subs first; direct SPOC in Airtel IT Oracle team", timeline: "Month 6–9" },
    { name: "BSNL / MTNL",        type: "Govt PSU", stack: "Siebel · OSM",     contact: "Govt vendor empanelment required (GeM portal + BSNL-specific). Long-term but sticky once in.",               timeline: "Month 9–12" },
    { name: "HDFC Bank / ICICI",   type: "BFSI",     stack: "Siebel CRM",       contact: "Siebel upgrade and support RFPs float every 12–18 months. Register on their vendor portals.",                 timeline: "Month 9–12" },
    { name: "Tata Communications", type: "Telecom",  stack: "BRM · ASAP",       contact: "Oracle BRM for international billing; direct engagement via Oracle India Alliance events and referrals.",     timeline: "Month 6–9" },
    { name: "Vi (Vodafone Idea)",  type: "Telecom",  stack: "BRM",              contact: "BRM stabilization and optimization; Vi is budget-constrained but has immediate need — lower rate tolerance.", timeline: "Month 4–6" },
  ];

  clients.forEach(function(c, i) {
    var col = i % 2;
    var row = Math.floor(i / 2);
    var x = 0.3 + col * 4.78;
    var y = 1.28 + row * 1.38;
    card(s, x, y, 4.6, 1.25, C.white);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.4, h: 1.25,
      fill: { color: C.navy }, line: { color: C.navy } });

    var typeColor = c.type === "Telecom" ? "1A5F8A" : c.type === "BFSI" ? C.green : C.amber;
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.5, y: y + 0.06, w: 0.72, h: 0.22,
      fill: { color: typeColor }, line: { color: typeColor } });
    txt(s, c.type, x + 0.5, y + 0.06, 0.72, 0.22, { fontSize: 7.5, bold: true, color: C.white, align: "center", valign: "middle" });
    txt(s, c.name, x + 1.3, y + 0.06, 2.6, 0.22, { fontSize: 12, bold: true, color: C.navy });
    txt(s, c.stack, x + 0.5, y + 0.33, 3.9, 0.2, { fontSize: 9.5, bold: true, color: C.red });
    txt(s, c.contact, x + 0.5, y + 0.56, 3.9, 0.52, { fontSize: 9, color: C.mid, wrap: true });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 3.7, y: y + 0.06, w: 0.8, h: 0.22,
      fill: { color: C.greenLt }, line: { color: "A8D8BC" } });
    txt(s, c.timeline, x + 3.7, y + 0.06, 0.8, 0.22, { fontSize: 7.5, color: C.green, bold: true, align: "center", valign: "middle" });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.28, w: 10, h: 0.35,
    fill: { color: C.red }, line: { color: C.red } });
  txt(s, "Oracle India Alliance events (OCP Summit, CloudWorld India) are the #1 shortcut to direct client introductions. Budget ₹2–3 L/yr for these.", 0.38, 5.28, 9.24, 0.35, {
    fontSize: 10, color: C.white, bold: true, valign: "middle" });
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 13 — PHASE 3 & 4: SCALE AND FULL PRACTICE
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.lightBg);
  titleBar(s, "Phase 3 & 4 — Scale to Full Practice (Month 6–24)");

  // Phase 3
  card(s, 0.3, 0.82, 4.6, 4.52, C.white);
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 0.82, w: 4.6, h: 0.36,
    fill: { color: "2C7BB6" }, line: { color: "2C7BB6" } });
  txt(s, "Phase 3 — Scale Up (Month 6–18)", 0.3, 0.82, 4.6, 0.36, {
    fontSize: 12, bold: true, color: C.white, align: "center", valign: "middle" });
  bullets(s, [
    "Headcount: 15–20 total (12–15 billable at any time)",
    "Revenue run-rate: ₹50–90 L/month by Month 12",
    "Channel mix: 60% sub-vendor, 40% direct by Month 12",
    "Add 1 Siebel Developer + 1 BRM Developer per month from talent pipeline",
    "Build first direct MSA with 2 customers (Airtel or Jio preferred)",
    "Oracle OPN Gold status unlock — opens deal registration + co-sell",
    "Dedicated project management — move first team to SOW-based delivery",
    "Geographic expansion: Hyderabad + Pune delivery centres",
    "Begin campus hiring pipeline for BRM junior developers (2+ yr fresher training program)",
  ], 0.5, 1.28, 4.2, 3.9);

  // Phase 4
  card(s, 5.1, 0.82, 4.6, 4.52, C.navy);
  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 0.82, w: 4.6, h: 0.36,
    fill: { color: C.red }, line: { color: C.red } });
  txt(s, "Phase 4 — Full Practice (Month 18–24)", 5.1, 0.82, 4.6, 0.36, {
    fontSize: 12, bold: true, color: C.white, align: "center", valign: "middle" });
  s.addText([
    { text: "Headcount: 25–35 (20+ billable)", options: { bullet: true, breakLine: true } },
    { text: "Revenue run-rate: ₹1.0–1.5 Cr/month", options: { bullet: true, breakLine: true } },
    { text: "Channel mix: 30% sub-vendor, 70% direct/project", options: { bullet: true, breakLine: true } },
    { text: "RODOD practice fully active — co-sell Oracle licences", options: { bullet: true, breakLine: true } },
    { text: "Named Oracle Practice Partner of the Year target", options: { bullet: true, breakLine: true } },
    { text: "Delivery CoE: internal knowledge base, reusable BRM/OSM accelerators", options: { bullet: true, breakLine: true } },
    { text: "Managed services offering — BRM/Siebel L1/L2/L3 support contracts", options: { bullet: true, breakLine: true } },
    { text: "Begin cloud migration practice: BRM on OCI, Siebel SaaS migration", options: { bullet: true, breakLine: true } },
    { text: "International expansion: APAC / Middle East Oracle telco deployments", options: { bullet: true, breakLine: false } },
  ], {
    x: 5.3, y: 1.28, w: 4.2, h: 3.9,
    fontSize: 11, color: "C8D8EE", fontFace: "Calibri", paraSpaceAfter: 5, valign: "top"
  });
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 14 — FINANCIAL PROJECTIONS
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.lightBg);
  titleBar(s, "Financial Projections — Revenue & Headcount Ramp (24 Months)");

  // Chart data
  var months = ["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12","M15","M18","M21","M24"];
  var rev     = [0,0,8,18,25,32,40,48,55,62,70,82,100,120,140,160];   // ₹L/month
  var heads   = [3,5,7,8,9,10,11,13,14,15,16,18,22,26,30,34];          // headcount

  s.addChart(pres.charts.BAR, [
    { name: "Monthly Revenue (₹ Lakhs)", labels: months, values: rev },
  ], {
    x: 0.3, y: 0.82, w: 6.1, h: 3.52,
    chartColors: [C.navy],
    chartArea: { fill: { color: C.white } },
    showLegend: true, legendPos: "b", legendFontSize: 10,
    catAxisLabelColor: C.mid, valAxisLabelColor: C.mid,
    valGridLine: { color: "E0E8F0" },
    showTitle: false,
    dataLabelFontSize: 8,
  });

  s.addChart(pres.charts.LINE, [
    { name: "Headcount", labels: months, values: heads },
  ], {
    x: 6.5, y: 0.82, w: 3.18, h: 3.52,
    chartColors: [C.red],
    chartArea: { fill: { color: C.white } },
    lineSize: 3, lineSmooth: true,
    showLegend: true, legendPos: "b", legendFontSize: 10,
    catAxisLabelColor: C.mid, valAxisLabelColor: C.mid,
    valGridLine: { color: "E0E8F0" },
    showTitle: false,
  });

  // Summary table
  var hdrFill = { fill: { color: C.navy }, color: C.white, bold: true, align: "center" };
  var hdrFL   = { fill: { color: C.navy }, color: C.white, bold: true };
  s.addTable([
    [{ text: "Metric",          options: hdrFL },
     { text: "End Year 1",      options: hdrFill },
     { text: "End Year 2",      options: hdrFill }],
    ["Billable Headcount",
     { text: "12–15",  options: { bold: true, color: C.navy, align: "center" } },
     { text: "22–28",  options: { bold: true, color: C.navy, align: "center" } }],
    ["Monthly Revenue Run-rate",
     { text: "₹ 70–90 L",   options: { bold: true, color: C.red, align: "center" } },
     { text: "₹ 1.4–1.8 Cr",options: { bold: true, color: C.red, align: "center" } }],
    ["Annual Revenue",
     { text: "₹ 3.5–4.5 Cr",  options: { bold: true, color: C.dark, align: "center" } },
     { text: "₹ 15–20 Cr",    options: { bold: true, color: C.dark, align: "center" } }],
    ["Gross Margin",
     { text: "38–44%",  options: { bold: true, color: C.green, align: "center" } },
     { text: "42–50%",  options: { bold: true, color: C.green, align: "center" } }],
    ["Investment (cumulative)",
     { text: "₹ 1.5–2.0 Cr",  options: { color: C.mid, align: "center" } },
     { text: "₹ 3.5–4.5 Cr",  options: { color: C.mid, align: "center" } }],
  ], {
    x: 0.3, y: 4.4, w: 9.4, h: 1.1,
    colW: [3.2, 3.1, 3.1],
    border: { pt: 0.5, color: "D8E4F0" },
    fontFace: "Calibri", fontSize: 11,
    valign: "middle", rowH: 0.18,
  });
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 15 — BRM DEEP DIVE (Market Intelligence)
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.lightBg);
  titleBar(s, "BRM Deep Dive — Market Intelligence (40% Focus)");
  sectionTag(s, "BRM", 0.38, 0.78, C.red);

  card(s, 0.3, 1.0, 4.6, 4.28, C.white);
  txt(s, "Active BRM Opportunities in India", 0.5, 1.1, 4.2, 0.28, { fontSize: 12, bold: true, color: C.navy });

  var opps = [
    { cl: "Airtel",           prj: "BRM 12.x Migration from 7.5", val: "₹40–80 Cr", hot: true },
    { cl: "Vodafone Idea",    prj: "BRM Stabilization + ECE Rollout", val: "₹15–30 Cr", hot: true },
    { cl: "Tata Comm",        prj: "International Billing BRM Upgrade", val: "₹10–20 Cr", hot: false },
    { cl: "Jio",              prj: "BRM CoE Augmentation (ongoing)", val: "Perennial", hot: true },
    { cl: "BSNL",             prj: "BRM Refresh (Govt-funded BSNL revamp)", val: "₹20–40 Cr", hot: false },
    { cl: "Regional ISPs",    prj: "BRM SaaS-hosted for cable/ISP billing", val: "₹2–5 Cr each", hot: false },
  ];
  opps.forEach(function(o, i) {
    var y = 1.46 + i * 0.62;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.38, y, w: 4.42, h: 0.54,
      fill: { color: i % 2 === 0 ? C.lightBg : C.white }, line: { color: "E0EAF4", width: 0.5 } });
    if (o.hot) {
      s.addShape(pres.shapes.RECTANGLE, { x: 0.38, y: y + 0.12, w: 0.28, h: 0.28,
        fill: { color: C.red }, line: { color: C.red } });
      txt(s, "HOT", 0.38, y + 0.12, 0.28, 0.28, { fontSize: 5.5, bold: true, color: C.white, align: "center", valign: "middle" });
    }
    txt(s, o.cl, 0.74, y + 0.04, 1.1, 0.22, { fontSize: 10.5, bold: true, color: C.navy });
    txt(s, o.prj, 0.74, y + 0.28, 2.6, 0.22, { fontSize: 9, color: C.mid });
    txt(s, o.val, 3.42, y + 0.12, 1.2, 0.28, { fontSize: 11, bold: true, color: C.green, align: "right" });
  });

  // Right: BRM skills to build
  card(s, 5.1, 1.0, 4.6, 4.28, C.white);
  txt(s, "BRM Skills Inventory — Build First", 5.3, 1.1, 4.2, 0.28, { fontSize: 12, bold: true, color: C.navy });

  var skills = [
    { sk: "BRM 12.x Core",               pri: "MUST HAVE" },
    { sk: "Pipeline Manager",             pri: "MUST HAVE" },
    { sk: "Balance Management",           pri: "MUST HAVE" },
    { sk: "ECE (Elastic Charging Engine)", pri: "MUST HAVE" },
    { sk: "BRM-OCS Integration",          pri: "HIGH VALUE" },
    { sk: "Mediation (ILOG)",             pri: "HIGH VALUE" },
    { sk: "Self-Care (BRM Portal)",        pri: "HIGH VALUE" },
    { sk: "BRM on Oracle Cloud (OCI)",    pri: "FUTURE" },
    { sk: "BRM-OSM Integration",          pri: "FUTURE" },
  ];
  skills.forEach(function(sk, i) {
    var y = 1.46 + i * 0.42;
    var pColor = sk.pri === "MUST HAVE" ? C.red : sk.pri === "HIGH VALUE" ? C.amber : "2C7BB6";
    s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y, w: 3.88, h: 0.34,
      fill: { color: i % 2 === 0 ? C.lightBg : C.white }, line: { color: "E0EAF4", width: 0.5 } });
    txt(s, sk.sk, 5.32, y + 0.04, 2.6, 0.26, { fontSize: 10, color: C.dark });
    s.addShape(pres.shapes.RECTANGLE, { x: 7.94, y: y + 0.04, w: 1.06, h: 0.24,
      fill: { color: pColor }, line: { color: pColor } });
    txt(s, sk.pri, 7.94, y + 0.04, 1.06, 0.24, { fontSize: 7.5, bold: true, color: C.white, align: "center", valign: "middle" });
  });
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 16 — OSS DEEP DIVE
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.lightBg);
  titleBar(s, "OSS Deep Dive — OSM / UIM / ASAP Market Intelligence (35% Focus)", "2C4A7C");
  sectionTag(s, "OSS", 0.38, 0.78, "2C7BB6");

  // OSS component cards
  var comps = [
    { name: "OSM",  full: "Order & Service Management",       role: "Orchestrates end-to-end telecom order fulfillment — from customer order to service activation. Critical for 5G service rollout.", demand: "Jio 5G, Airtel 5G, BSNL revamp" },
    { name: "UIM",  full: "Unified Inventory Management",     role: "Network resource and service inventory — physical and logical. 5G NR/gNB inventory, IP addressing, spectrum records.", demand: "All 5G operators building UIM 7.x" },
    { name: "ASAP", full: "Activation Solution for Access",   role: "Last-mile service activation — connects OSM to network elements. ASAP 7.x with network exposure layer is current ask.", demand: "Airtel, Tata Comm, BSNL activation" },
  ];

  comps.forEach(function(c, i) {
    var x = 0.3 + i * 3.17;
    card(s, x, 0.98, 3.0, 1.75, C.white, "2C7BB6");
    s.addShape(pres.shapes.RECTANGLE, { x, y: 0.98, w: 3.0, h: 0.36,
      fill: { color: "2C4A7C" }, line: { color: "2C4A7C" } });
    txt(s, c.name + " — " + c.full, x, 0.98, 3.0, 0.36, { fontSize: 11, bold: true, color: C.white, align: "center", valign: "middle" });
    txt(s, c.role, x + 0.1, 1.4, 2.8, 0.88, { fontSize: 9.5, color: C.dark, wrap: true });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.1, y: 2.34, w: 2.8, h: 0.28,
      fill: { color: "EEF4FF" }, line: { color: "BFD0EE" } });
    txt(s, "Demand: " + c.demand, x + 0.1, 2.34, 2.8, 0.28, { fontSize: 9, bold: true, color: "1A3A7A", valign: "middle" });
  });

  // OSS Opportunity map
  card(s, 0.3, 2.84, 9.4, 2.46, C.white);
  txt(s, "5G OSS Opportunity Map — India 2025–27", 0.5, 2.95, 9.0, 0.28, { fontSize: 12, bold: true, color: C.navy });

  var ossRows = [
    [{ text: "Operator", options: { fill: { color: "2C4A7C" }, color: C.white, bold: true } },
     { text: "OSM Status", options: { fill: { color: "2C4A7C" }, color: C.white, bold: true, align: "center" } },
     { text: "UIM Status", options: { fill: { color: "2C4A7C" }, color: C.white, bold: true, align: "center" } },
     { text: "ASAP Status", options: { fill: { color: "2C4A7C" }, color: C.white, bold: true, align: "center" } },
     { text: "Entry Point", options: { fill: { color: "2C4A7C" }, color: C.white, bold: true } }],
    ["Jio",
     { text: "Active upgrade", options: { bold: true, color: C.red, align: "center" } },
     { text: "UIM 7.x rollout", options: { bold: true, color: C.red, align: "center" } },
     { text: "ASAP 7.x", options: { bold: true, color: C.red, align: "center" } },
     "Oracle Alliance or TCS sub"],
    ["Airtel",
     { text: "5G OSM go-live", options: { bold: true, color: C.red, align: "center" } },
     { text: "Inventory upgrade", options: { color: C.amber, align: "center" } },
     { text: "Active", options: { bold: true, color: C.red, align: "center" } },
     "TechM / Wipro sub-vendor"],
    ["BSNL",
     { text: "Planning phase", options: { color: C.amber, align: "center" } },
     { text: "RFP expected", options: { color: C.amber, align: "center" } },
     { text: "Planning", options: { color: C.amber, align: "center" } },
     "Govt empanelment / TCS BSNL"],
    ["Tata Comm",
     { text: "Active", options: { bold: true, color: C.red, align: "center" } },
     { text: "Moderate", options: { color: C.mid, align: "center" } },
     { text: "Active", options: { bold: true, color: C.red, align: "center" } },
     "Direct or Wipro sub"],
  ];
  s.addTable(ossRows, {
    x: 0.38, y: 3.28, w: 9.22, h: 1.9,
    colW: [1.5, 1.82, 1.82, 1.62, 2.46],
    border: { pt: 0.5, color: "D0DBF0" },
    fontFace: "Calibri", fontSize: 10,
    valign: "middle", rowH: 0.34,
  });
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 17 — SIEBEL DEEP DIVE
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.lightBg);
  titleBar(s, "Siebel Deep Dive — Market Intelligence (25% Focus)", C.steel);
  sectionTag(s, "SIEBEL", 0.38, 0.78, C.amber);

  txt(s, "Contrary to market perception, Siebel is NOT dying. Oracle extended Premier Support to 2033 — creating a long, high-margin revenue tail.", 0.38, 0.9, 9.3, 0.3, { fontSize: 11, color: C.mid, italic: true, bold: true });

  // Left: Siebel verticals
  card(s, 0.3, 1.28, 4.6, 3.8, C.white);
  txt(s, "Siebel Opportunity by Vertical", 0.5, 1.38, 4.2, 0.28, { fontSize: 12, bold: true, color: C.navy });

  var verts = [
    { v: "Banking / NBFC",   opp: "HDFC, ICICI, Kotak, Axis, SBI — Siebel Contact Centre, Collections, Retail Banking modules. Annual support + IP20 upgrades.", rate: "₹3.5–4.5K/hr" },
    { v: "Insurance",        opp: "LIC, ICICI Pru, HDFC Life — Siebel for policy servicing, complaints, agent management. Very sticky — hard to replace.", rate: "₹3–4K/hr" },
    { v: "Telecom",          opp: "Airtel, Vi — Siebel for B2B Sales, Trouble Ticketing alongside BRM. Cross-sell entry point from BRM engagements.", rate: "₹3–4.5K/hr" },
    { v: "Govt / PSU",       opp: "ONGC, NTPC, BHEL — Siebel for field service, complaint mgmt. Budget driven, slower but sticky.", rate: "₹2.5–3.5K/hr" },
    { v: "Fusion CX Migration", opp: "All verticals evaluating Siebel → Oracle CX Fusion migration path. CS Soft can position as migration specialist.", rate: "₹4–6K/hr" },
  ];
  verts.forEach(function(v, i) {
    var y = 1.74 + i * 0.68;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.38, y, w: 4.42, h: 0.6,
      fill: { color: i % 2 === 0 ? C.lightBg : C.white }, line: { color: "E0EAF4", width: 0.5 } });
    s.addShape(pres.shapes.RECTANGLE, { x: 0.38, y: y + 0.05, w: 1.12, h: 0.22,
      fill: { color: C.amber }, line: { color: C.amber } });
    txt(s, v.v, 0.38, y + 0.05, 1.12, 0.22, { fontSize: 8, bold: true, color: C.dark, align: "center", valign: "middle" });
    txt(s, v.opp, 1.55, y + 0.03, 2.9, 0.34, { fontSize: 8.5, color: C.dark, wrap: true });
    txt(s, v.rate, 4.5, y + 0.12, 0.78, 0.3, { fontSize: 9, bold: true, color: C.green, align: "right", valign: "middle" });
  });

  // Right: Key insight + skills
  card(s, 5.1, 1.28, 4.6, 1.72, "FFF9EE", "F5D080");
  txt(s, "The Scarcity Premium — Why Siebel Pays Well", 5.3, 1.38, 4.2, 0.28, { fontSize: 11, bold: true, color: "7A4400" });
  bullets(s, [
    "Senior Siebel architects are retiring from the market — very few people with 10+ yr experience",
    "No new developers being trained (IT colleges don't teach Siebel)",
    "Oracle themselves now refer Siebel work to RODOD partners — they've stopped growing internal bench",
    "Premium of 30–40% over SAP CRM or Salesforce rates for equivalent experience",
  ], 5.3, 1.72, 4.22, 1.22, 10.5);

  card(s, 5.1, 3.1, 4.6, 1.98, C.white);
  txt(s, "Siebel Skills Inventory — Build", 5.3, 3.2, 4.2, 0.28, { fontSize: 11, bold: true, color: C.navy });
  var sskills = [
    "Siebel 8.1 / 8.2 / IP2018 / IP2019 / IP2020",
    "Siebel Open UI (JS customization)",
    "EIM (Enterprise Integration Manager)",
    "EAI / Web Services / SOAP integration",
    "Siebel CTI / Workflow / Business Services",
    "Siebel to Oracle Fusion CX migration tooling",
  ];
  bullets(s, sskills, 5.3, 3.52, 4.22, 1.5, 10);
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 18 — RISK REGISTER
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.white);
  titleBar(s, "Risk Register & Mitigation Plan");

  var hdrL = { fill: { color: C.navy }, color: C.white, bold: true };
  var hdrC = { fill: { color: C.navy }, color: C.white, bold: true, align: "center" };
  var hi   = { fill: { color: C.red   }, color: C.white, bold: true, align: "center" };
  var med  = { fill: { color: C.amber }, color: C.dark,  bold: true, align: "center" };
  var lo   = { fill: { color: C.green }, color: C.white, bold: true, align: "center" };

  var rows = [
    [{ text: "Risk", options: hdrL }, { text: "Impact", options: hdrC }, { text: "Likelihood", options: hdrC }, { text: "Mitigation", options: hdrL }],

    [{ text: "Talent scarcity / counter-offers", options: { bold: true } },
     { text: "HIGH", options: hi }, { text: "HIGH", options: hi },
     "Offer 10–15% above market + retention bonus (₹3–5L after 12mo on-project). Lock-in via ESOP/profit share roadmap. Start referral pipeline Day 1."],

    [{ text: "Bench cost during ramp (no billing)", options: {} },
     { text: "HIGH", options: hi }, { text: "MED", options: med },
     "Only hire against confirmed or near-confirmed demand. Maintain 1–2 'pre-sales' hires only. Use notice period as buffer — hire only those with 30-day notice."],

    [{ text: "Sub-vendor margin compression by prime SIs", options: {} },
     { text: "MED", options: med }, { text: "HIGH", options: hi },
     "Parallel direct client pipeline from Month 4. Negotiate multi-year sub-vendor rates upfront. Diversify across 4+ primes to avoid dependency."],

    [{ text: "Oracle OPN certification delays", options: {} },
     { text: "MED", options: med }, { text: "LOW", options: lo },
     "OPN Silver is free — register Week 1. OPN Gold requires 2 certified employees + revenue target. Begin OPN Cloud learning paths immediately (free courses)."],

    [{ text: "Key person dependency / attrition", options: {} },
     { text: "HIGH", options: hi }, { text: "MED", options: med },
     "No single-point skills — always have 2 people per tech. Cross-train BRM dev on OSM. Document all client-specific configurations and knowledge bases."],

    [{ text: "Technology obsolescence (Siebel sunset)", options: {} },
     { text: "MED", options: med }, { text: "LOW", options: lo },
     "Siebel support extended to 2033 — long runway. Use Siebel relationships to upsell Oracle Fusion CX migration projects. BRM/OSS are mission-critical — not going away."],

    [{ text: "Collection risk from sub-vendor primes", options: {} },
     { text: "MED", options: med }, { text: "LOW", options: lo },
     "Net-30/45 payment terms — use factoring/invoice discounting if needed. Avoid starting work without PO. TCS/Wipro/Infosys rarely default — negotiate clear terms upfront."],
  ];

  s.addTable(rows, {
    x: 0.3, y: 0.78, w: 9.4, h: 4.72,
    colW: [2.6, 0.88, 0.88, 5.04],
    border: { pt: 0.5, color: "E0E8F0" },
    fontFace: "Calibri", fontSize: 10.5,
    valign: "middle", rowH: 0.52,
  });
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 19 — ORACLE PARTNER NETWORK (OPN) ROADMAP
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.lightBg);
  titleBar(s, "Oracle Partner Network (OPN) — Partnership Ladder & Benefits");

  var tiers = [
    { name: "OPN Silver",    cost: "FREE",         timeline: "Day 1",       badge: "Entry",
      benefits: "Oracle logo usage · Partner portal access · Deal registration (limited) · Oracle University discounts · co-marketing templates" },
    { name: "OPN Gold",      cost: "₹ 2.5 L/yr",  timeline: "Month 6–9",   badge: "Mid-tier",
      benefits: "Deal registration priority · Co-sell with Oracle sales team · Oracle license resell at partner pricing · Training credits · RODOD delivery engagements" },
    { name: "OPN Platinum",  cost: "By invite",    timeline: "Year 2+",     badge: "Premium",
      benefits: "Named Oracle resource · Joint press releases · Oracle-sourced leads · Global opportunity via OPN · Conference speaking slots" },
  ];

  tiers.forEach(function(t, i) {
    var x = 0.3 + i * 3.17;
    var colors = [C.green, "2C7BB6", C.red];
    var c = colors[i];
    card(s, x, 0.88, 3.0, 4.42, C.white);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 0.88, w: 3.0, h: 0.42,
      fill: { color: c }, line: { color: c } });
    txt(s, t.name, x, 0.88, 3.0, 0.42, { fontSize: 13, bold: true, color: C.white, align: "center", valign: "middle" });
    txt(s, "Cost", x + 0.15, 1.38, 1.0, 0.22, { fontSize: 9, color: C.muted });
    txt(s, t.cost, x + 0.15, 1.6, 1.6, 0.36, { fontSize: 22, bold: true, color: c });
    txt(s, "When", x + 0.15, 2.02, 1.0, 0.22, { fontSize: 9, color: C.muted });
    txt(s, t.timeline, x + 0.15, 2.24, 2.6, 0.28, { fontSize: 13, bold: true, color: C.dark });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.15, y: 2.6, w: 2.7, h: 0.02,
      fill: { color: "E0E8F0" }, line: { color: "E0E8F0" } });
    txt(s, "KEY BENEFITS", x + 0.15, 2.72, 2.7, 0.22, { fontSize: 8, bold: true, color: C.navy });
    txt(s, t.benefits, x + 0.15, 2.96, 2.7, 2.28, { fontSize: 10, color: C.dark, wrap: true });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.28, w: 10, h: 0.35,
    fill: { color: C.navy }, line: { color: C.navy } });
  txt(s, "RODOD Programme: CS Soft's Oracle RODOD status unlocks the ability to resell Oracle licences alongside consulting — a 15–25% margin on licence sales. Register at partnernetwork.oracle.com from Day 1.", 0.38, 5.28, 9.24, 0.35, {
    fontSize: 9.5, color: "AABFDD", valign: "middle" });
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 20 — WEEK 1-4 IMMEDIATE ACTION PLAN
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.navy);
  txt(s, "Week 1–4 Immediate Action Plan", 0.38, 0.12, 9.5, 0.55, { fontSize: 22, bold: true, color: C.white });
  txt(s, "Stop planning, start executing. These 20 actions in the first 4 weeks create irreversible momentum.", 0.38, 0.62, 9.5, 0.28, { fontSize: 12, color: "7A96BB", italic: true });

  var weeks = [
    { wk: "WEEK 1", color: C.red, actions: [
      "Register Oracle Partner Network (OPN) Silver at partnernetwork.oracle.com — 30 minutes, FREE",
      "Email / LinkedIn message to Oracle India Alliance Manager (get contact via OPN portal)",
      "Create LinkedIn Recruiter search: 'Oracle BRM', 'Siebel 8', 'OSM UIM' — save 20+ target profiles",
      "Draft and post 5 JDs on LinkedIn Premium + Naukri Premium (BRM Arch, BRM Dev×2, Siebel Arch, OSM/UIM)",
      "Identify 3 sub-vendor partner contacts at Rapsys / Mastech / Evosys — email cold outreach",
    ]},
    { wk: "WEEK 2", color: C.amber, actions: [
      "Begin outreach: send personalised LinkedIn InMails to 20 target profiles per role (60 total)",
      "Register on TCS Supplier Portal (supplier.tcs.com) — start vendor onboarding documentation",
      "Request intro from Oracle Alliance to TCS Oracle CoE head / Wipro Oracle Practice head",
      "Create capability deck (2-page PDF) for sub-vendor positioning — BRM/Siebel/OSS focus",
      "Shortlist 5–6 candidates per role from first responses; schedule calls",
    ]},
    { wk: "WEEK 3", color: "2C9A5A", col2: true, actions: [
      "Conduct 15-20 first-round interviews; shortlist top 3 per role",
      "Submit first profiles to any open sub-vendor requirements found in Week 1–2",
      "Register on Wipro PVMS (Partner Vendor Mgmt System) + Tech Mahindra vendor portal",
      "Begin Oracle OPN Cloud learning paths (free) for BRM and CX certifications",
      "Negotiate and sign first sub-vendor NDA with one prime SI",
    ]},
    { wk: "WEEK 4", color: "2C7BB6", actions: [
      "Make first 2 job offers — Practice Head + BRM Architect are highest priority",
      "Close sub-vendor MSA (Master Services Agreement) with first prime SI",
      "Attend any Oracle India Alliance event / webinar — collect 5 business contacts minimum",
      "Submit at least 2 profiles against open BRM/Siebel requirements via sub-vendor",
      "Set up project management + timesheet tools (basic) for billing readiness",
    ]},
  ];

  weeks.forEach(function(w, i) {
    var col = i % 2;
    var row = Math.floor(i / 2);
    var x = 0.28 + col * 4.88;
    var y = 1.0 + row * 2.28;
    var wColor = w.wk === "WEEK 3" ? "2C9A5A" : (w.color.indexOf(",") > -1 ? "2C9A5A" : w.color);

    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 4.65, h: 0.28,
      fill: { color: wColor }, line: { color: wColor } });
    txt(s, w.wk, x, y, 4.65, 0.28, { fontSize: 11, bold: true, color: C.white, align: "center", valign: "middle" });

    w.actions.forEach(function(a, ai) {
      var ay = y + 0.32 + ai * 0.37;
      txt(s, (ai + 1) + ". " + a, x + 0.08, ay, 4.5, 0.35, {
        fontSize: 9, color: "C8D8EE", wrap: true, valign: "top" });
    });
  });
})();

// ═══════════════════════════════════════════════════════════════
// SLIDE 21 — CLOSE
// ═══════════════════════════════════════════════════════════════
(function() {
  var s = pres.addSlide();
  bg(s, C.navy);

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 5.625,
    fill: { color: C.red }, line: { color: C.red } });

  txt(s, "The Window is NOW.", 0.42, 0.65, 9.2, 0.9, {
    fontSize: 56, bold: true, color: C.white });
  txt(s, "India's BSS/OSS transformation is mid-cycle. BRM 12.x migrations are funded and active.\nSiebel talent is disappearing. 5G is demanding OSS. Every quarter you wait, someone else fills this gap.", 0.42, 1.62, 9, 0.65, {
    fontSize: 14, color: "8AACDA", italic: true });

  // 3 commitment boxes
  var boxes = [
    { num: "01", title: "Hire Fast",      body: "Get Practice Head + BRM Architect hired in 30 days. Every week of delay = ₹6–10 L in lost revenue opportunity." },
    { num: "02", title: "Sub-vend First", body: "Don't wait for direct relationships. Sub-vendor revenue is real revenue. Get first profiles submitted in Week 3." },
    { num: "03", title: "Stay Focused",   body: "BRM → OSS → Siebel. Don't dilute into generic Oracle work. Niche depth is the competitive moat." },
  ];
  boxes.forEach(function(b, i) {
    var x = 0.42 + i * 3.1;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.55, w: 2.88, h: 2.38,
      fill: { color: "1E3060" }, line: { color: C.red, width: 1.5 } });
    txt(s, b.num, x + 0.1, 2.65, 0.65, 0.55, { fontSize: 32, bold: true, color: C.red });
    txt(s, b.title, x + 0.1, 3.22, 2.65, 0.36, { fontSize: 18, bold: true, color: C.white });
    txt(s, b.body,  x + 0.1, 3.62, 2.65, 1.2,  { fontSize: 10, color: "8AACDA", wrap: true });
  });

  txt(s, "CS Soft Solutions  ·  Oracle Practice Launch  ·  Confidential  ·  June 2026", 0.42, 5.28, 9, 0.25, {
    fontSize: 9, color: "4A6280", italic: true });
})();

// ── WRITE ────────────────────────────────────────────────────────
pres.writeFile({ fileName: "CS_Soft_Oracle_Practice_Plan.pptx" })
  .then(function() { console.log("✅  Saved: CS_Soft_Oracle_Practice_Plan.pptx  (21 slides)"); })
  .catch(function(err) { console.error("❌  Error:", err); process.exit(1); });
