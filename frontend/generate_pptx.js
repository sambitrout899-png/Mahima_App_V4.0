/**
 * BRT 360 CRM – Proposal for Dhiraagu
 * PowerPoint Generator — v2 (BlueRose Branded, Revised Palette)
 *
 * Usage:
 *   npm install -g pptxgenjs
 *   node generate_pptx.js
 *
 * Output: BRT360_Dhiraagu_CRM_Proposal.pptx
 *
 * Design:
 *   • Dark slides  — Cover, section dividers, CTA  (midnight navy #0C1445)
 *   • Light slides — All content slides             (#F1F5F9 background)
 *   • Brand palette — Royal Blue (#1E40AF) + Deep Rose (#BE185D) + Amber (#D97706)
 *   • "RODOD" replaced with "Dhiraagu's Order Orchestration Platform" throughout
 */

import PptxGenJS from "pptxgenjs";

const pres = new PptxGenJS();
pres.layout  = "LAYOUT_16x9"; // 10" × 5.625"
pres.title   = "BRT 360 CRM – Proposal for Dhiraagu";
pres.author  = "BlueRose Technologies";
pres.subject = "Custom CRM Solution Proposal";

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  // Brand
  blue:     "1E40AF",   // Royal blue  – primary brand
  blueMid:  "2563EB",   // Medium blue – links / active
  blueL:    "DBEAFE",   // Pale blue   – tinted highlights on light slides
  rose:     "BE185D",   // Deep rose   – secondary brand
  roseL:    "FCE7F3",   // Pale rose   – tinted highlights
  gold:     "D97706",   // Amber gold  – tertiary accent
  goldL:    "FEF3C7",   // Pale gold
  green:    "047857",   // Emerald     – positive / success
  greenL:   "D1FAE5",

  // Dark-slide palette
  darkBg:   "0C1445",   // Midnight navy
  darkMid:  "162B6E",   // Card bg on dark slide
  darkCard: "1E3A8A",   // Slightly lighter card on dark

  // Light-slide palette
  slideBg:  "F1F5F9",   // Slide background (light blue-gray)
  cardBg:   "FFFFFF",   // White card bg
  headerBg: "0F2557",   // Top header strip on content slides

  // Typography
  textHd:   "0F172A",   // Near-black headings
  textBody: "374151",   // Charcoal body
  muted:    "6B7280",   // Gray
  mutedW:   "94A3B8",   // Gray on dark bg
  border:   "E2E8F0",   // Light border

  // Always-white
  white:    "FFFFFF",
};

const W = 10, H = 5.625;   // slide dimensions (inches)

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Fresh shadow (avoids PptxGenJS object-mutation bug) */
const mkSh = () => ({ type: "outer", color: "000000", blur: 7, offset: 2, angle: 135, opacity: 0.12 });

/**
 * BlueRose logo text block.
 * @param {object} slide
 * @param {number} x, y  position (inches)
 * @param {boolean} onDark  true = white sub-text, false = dark sub-text
 * @param {number} fs  base font size
 */
function addLogo(slide, x, y, onDark = true, fs = 14) {
  slide.addText(
    [
      { text: "Blue",         options: { color: C.blueMid, bold: true, fontSize: fs } },
      { text: "Rose",         options: { color: C.rose,    bold: true, fontSize: fs } },
      { text: " Technologies",options: { color: onDark ? C.mutedW : C.muted, bold: false, fontSize: fs * 0.62 } },
    ],
    { x, y, w: 2.8, h: fs * 0.018 + 0.1, fontFace: "Calibri", margin: 0, valign: "middle" }
  );
}

/**
 * Dark-background slide setup (cover, divider, CTA).
 */
function darkSetup(slide) {
  slide.background = { color: C.darkBg };
  // Left brand stripe (blue → rose gradient simulation via two rectangles)
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0,          w: 0.07, h: H / 2, fill: { color: C.blue }, line: { color: C.blue } });
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: H / 2,      w: 0.07, h: H / 2, fill: { color: C.rose }, line: { color: C.rose } });
}

/**
 * Light-background content slide header.
 */
function lightHeader(slide, sectionTag, title, subtitle) {
  slide.background = { color: C.slideBg };

  // Header bar
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 1.08, fill: { color: C.headerBg }, line: { color: C.headerBg } });
  // Bottom accent line
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 1.08, w: W, h: 0.05, fill: { color: C.blue }, line: { color: C.blue } });
  // Rose right corner accent
  slide.addShape(pres.shapes.RECTANGLE, { x: W - 0.06, y: 0, w: 0.06, h: 1.13, fill: { color: C.rose }, line: { color: C.rose } });

  // Section tag
  slide.addText(sectionTag.toUpperCase(), {
    x: 0.28, y: 0.1, w: 7, h: 0.2,
    fontSize: 8.5, bold: true, color: C.blueMid, charSpacing: 3, margin: 0,
  });
  // Title
  slide.addText(title, {
    x: 0.28, y: 0.3, w: 8.5, h: 0.52,
    fontSize: 22, bold: true, color: C.white, fontFace: "Calibri", margin: 0,
  });
  // Subtitle
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.28, y: 0.8, w: 8.8, h: 0.24,
      fontSize: 10.5, color: C.mutedW, italic: true, margin: 0,
    });
  }

  // Logo top-right
  addLogo(slide, 6.9, 0.22, true, 12);
}

/**
 * White card with coloured top accent bar — for LIGHT slides.
 * @param {object} slide
 * @param {number} x y w h  – position / size
 * @param {string} accent    – hex colour of top bar (no #)
 * @param {string} title     – card title
 * @param {string[]} bullets – bullet text lines
 */
function card(slide, x, y, w, h, accent, title, bullets = []) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: C.cardBg }, line: { color: C.border, width: 0.5 },
    shadow: mkSh(),
  });
  // Top accent bar
  slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h: 0.055, fill: { color: accent }, line: { color: accent } });

  // Title
  slide.addText(title, {
    x: x + 0.14, y: y + 0.12, w: w - 0.26, h: 0.3,
    fontSize: 11.5, bold: true, color: C.textHd, fontFace: "Calibri", margin: 0,
  });

  // Bullets
  if (bullets.length) {
    const items = bullets.map((b, i) => ({
      text: b,
      options: { bullet: true, color: C.textBody, fontSize: 9.5, breakLine: i < bullets.length - 1 },
    }));
    slide.addText(items, {
      x: x + 0.12, y: y + 0.46, w: w - 0.22, h: h - 0.54,
      fontFace: "Calibri", paraSpaceAfter: 3.5, margin: 0,
    });
  }
}

/**
 * Stat box — for LIGHT slides.
 */
function statBox(slide, x, y, w, h, accent, value, label) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: C.cardBg }, line: { color: C.border, width: 0.5 }, shadow: mkSh(),
  });
  slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h: 0.06, fill: { color: accent }, line: { color: accent } });
  slide.addText(value, {
    x: x + 0.1, y: y + 0.18, w: w - 0.2, h: 0.52,
    fontSize: 30, bold: true, color: accent, align: "center", fontFace: "Calibri", margin: 0,
  });
  slide.addText(label, {
    x: x + 0.1, y: y + 0.72, w: w - 0.2, h: 0.26,
    fontSize: 9, color: C.muted, align: "center", margin: 0,
  });
}

/**
 * Tier band — for architecture slide.
 */
function tierBand(slide, y, accent, label, chips) {
  const bh = 0.72;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.18, y, w: W - 0.36, h: bh,
    fill: { color: C.cardBg }, line: { color: accent, width: 0.7, transparency: 20 }, shadow: mkSh(),
  });
  slide.addShape(pres.shapes.RECTANGLE, { x: 0.18, y, w: 0.055, h: bh, fill: { color: accent }, line: { color: accent } });

  slide.addText(label, {
    x: 0.3, y: y + 0.1, w: 2.2, h: 0.22,
    fontSize: 7.5, bold: true, color: accent, charSpacing: 1.5, margin: 0,
  });

  let cx = 0.3;
  chips.forEach(chip => {
    const cw = chip.length * 0.082 + 0.28;
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: y + 0.36, w: cw, h: 0.25,
      fill: { color: accent, transparency: 88 }, line: { color: accent, width: 0.7 },
    });
    slide.addText(chip, {
      x: cx, y: y + 0.36, w: cw, h: 0.25,
      fontSize: 8.5, bold: true, color: accent, align: "center", valign: "middle", margin: 0,
    });
    cx += cw + 0.1;
  });
}

/**
 * Section divider slide (dark).
 */
function dividerSlide(slide, bigNum, mainText, accentText, subtitle) {
  darkSetup(slide);
  // Ghost number
  slide.addText(bigNum, {
    x: 0, y: 0.3, w: W, h: 3.8,
    fontSize: 200, bold: true, color: C.darkMid, align: "center", margin: 0,
  });
  // Title
  slide.addText(
    [
      { text: mainText,   options: { color: C.white,   bold: true, fontSize: 38 } },
      { text: accentText, options: { color: C.blueMid, bold: true, fontSize: 38 } },
    ],
    { x: 0.8, y: 1.55, w: W - 1.6, h: 1.0, align: "center", fontFace: "Calibri", margin: 0 }
  );
  if (subtitle) {
    slide.addText(subtitle, {
      x: 1.6, y: 2.75, w: W - 3.2, h: 1.0,
      fontSize: 13, color: C.mutedW, align: "center", italic: true, margin: 0,
    });
  }
  addLogo(slide, W - 2.9, H - 0.44, true, 11);
}

/**
 * Arch/flow box (used in integration slides).
 */
function flowBox(slide, x, y, w, h, accent, line1, line2) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: C.cardBg }, line: { color: accent, width: 0.9 }, shadow: mkSh(),
  });
  slide.addText(
    [
      { text: line1 + "\n", options: { fontSize: 8, color: C.muted, bold: false } },
      { text: line2,        options: { fontSize: 10.5, color: C.textHd, bold: true } },
    ],
    { x: x + 0.08, y: y + 0.06, w: w - 0.16, h: h - 0.12, align: "center", valign: "middle", margin: 0 }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// S L I D E   1  –  COVER
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkSetup(s);

  // Background decorative circles (subtle)
  s.addShape(pres.shapes.OVAL, { x: 6.8, y: -1.8, w: 5.2, h: 5.2, fill: { color: C.blue,  transparency: 92 }, line: { color: C.blue,  width: 0.6, transparency: 70 } });
  s.addShape(pres.shapes.OVAL, { x: 7.6, y: -0.6, w: 3.0, h: 3.0, fill: { color: C.rose,  transparency: 90 }, line: { color: C.rose,  width: 0.6, transparency: 60 } });
  s.addShape(pres.shapes.OVAL, { x: -1.4, y: 3.4, w: 3.8, h: 3.8, fill: { color: C.blueMid, transparency: 93 }, line: { color: C.blue, width: 0.5, transparency: 75 } });

  // Confidential label
  s.addText("CONFIDENTIAL PROPOSAL  ·  JUNE 2026", {
    x: 0.3, y: 0.44, w: 7, h: 0.22,
    fontSize: 8.5, bold: true, color: C.blueMid, charSpacing: 2.5, margin: 0,
  });

  // Main title
  s.addText(
    [
      { text: "BRT ",  options: { color: C.white,    bold: true, fontSize: 54 } },
      { text: "360 ",  options: { color: C.blueMid,  bold: true, fontSize: 54 } },
      { text: "CRM",   options: { color: C.white,    bold: true, fontSize: 54 } },
    ],
    { x: 0.3, y: 0.72, w: 8.5, h: 1.15, fontFace: "Calibri", margin: 0 }
  );

  s.addText("for Dhiraagu", {
    x: 0.3, y: 1.82, w: 9, h: 0.7,
    fontSize: 34, bold: true, color: C.white, fontFace: "Calibri", margin: 0,
  });

  // Horizontal rule
  s.addShape(pres.shapes.RECTANGLE, { x: 0.3, y: 2.62, w: 4.5, h: 0.04, fill: { color: C.rose }, line: { color: C.rose } });

  s.addText(
    "A Next-Generation Customer Relationship Platform\nPurpose-Built for Maldives' Leading Digital Services Provider",
    {
      x: 0.3, y: 2.76, w: 7.5, h: 0.7,
      fontSize: 13, color: C.mutedW, italic: true, margin: 0,
    }
  );

  // Tech-stack pills
  const pills = [".NET Core", "React / Node.js", "Oracle DB", "PostgreSQL", "Oracle BRM", "Order Orchestration"];
  let px = 0.3;
  pills.forEach(p => {
    const pw = p.length * 0.088 + 0.28;
    s.addShape(pres.shapes.RECTANGLE, {
      x: px, y: 3.6, w: pw, h: 0.3,
      fill: { color: C.darkMid }, line: { color: C.blueMid, width: 0.8 },
    });
    s.addText(p, { x: px, y: 3.6, w: pw, h: 0.3, fontSize: 9, bold: true, color: C.blueL, align: "center", valign: "middle", margin: 0 });
    px += pw + 0.12;
  });

  s.addText("Presented by  BlueRose Technologies  ·  Powered by the BRT 360 Platform", {
    x: 0.3, y: 4.08, w: 8, h: 0.24, fontSize: 10, color: C.mutedW, margin: 0,
  });

  // BRT 360 logo block (bottom right)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 7.52, y: 4.55, w: 2.28, h: 0.78,
    fill: { color: C.darkMid }, line: { color: C.rose, width: 1.2 }, shadow: mkSh(),
  });
  s.addText(
    [
      { text: "Blue", options: { color: C.blueMid, bold: true, fontSize: 22 } },
      { text: "Rose", options: { color: C.rose,    bold: true, fontSize: 22 } },
    ],
    { x: 7.52, y: 4.57, w: 2.28, h: 0.42, align: "center", fontFace: "Calibri", margin: 0 }
  );
  s.addText("Technologies", {
    x: 7.52, y: 4.98, w: 2.28, h: 0.22,
    fontSize: 9, color: C.mutedW, align: "center", charSpacing: 1.5, margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// S L I D E   2  –  ABOUT BRT
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  lightHeader(s, "About Us", "BlueRose Technologies – Who We Are", "Deep telecom DNA. Enterprise delivery. BRT 360 — our flagship product.");

  // Stat row
  const stats = [
    { v: "18+",  l: "Years Telecom Experience",  a: C.blue  },
    { v: "40+",  l: "Telco Clients Globally",    a: C.rose  },
    { v: "500+", l: "Consultants & Engineers",   a: C.gold  },
    { v: "12",   l: "Countries Delivered",       a: C.green },
  ];
  const sw = (W - 0.56) / 4 - 0.12;
  stats.forEach((st, i) => statBox(s, 0.28 + i * (sw + 0.12), 1.26, sw, 1.05, st.a, st.v, st.l));

  // 2×2 cards
  const cards4 = [
    { a: C.blue,  t: "BRT 360 Platform",        b: ["Modular, cloud-native CRM purpose-built for Communications Service Providers (CSPs)", "Native connectors for Oracle BRM, Dhiraagu's Order Orchestration Platform, Amdocs, Ericsson BSCS", "TM Forum Open API aligned microservices — no vendor lock-in"] },
    { a: C.rose,  t: "Telco-First Architecture", b: ["Pre-built BRM and Order Orchestration connectors, not custom one-offs", "60% faster integration vs greenfield CRM builds across 12 live deployments", "Subscription lifecycle, usage events, and billing integration are first-class data model citizens"] },
    { a: C.gold,  t: "Technology Stack",         b: [".NET 8 microservices + Node.js event bus (Kafka) for real-time events", "React 18 SPA + TypeScript — responsive PWA with offline agent mode", "Oracle DB 19c (billing-grade) + PostgreSQL 16 (CRM operational workloads)"] },
    { a: C.green, t: "Certifications & Standards",b: ["ISO 27001 certified delivery practices and information security controls", "TM Forum Frameworx aligned data model for interoperability", "PCI-DSS ready, GDPR-compatible consent and data governance framework"] },
  ];
  const cw2 = (W - 0.56) / 2 - 0.12;
  cards4.forEach((c, i) => {
    card(s, 0.28 + (i % 2) * (cw2 + 0.24), 2.44 + Math.floor(i / 2) * 1.48, cw2, 1.4, c.a, c.t, c.b);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// S L I D E   3  –  DHIRAAGU LANDSCAPE
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  lightHeader(s, "Client Context", "Dhiraagu – The Digital Backbone of Maldives", "A complex multi-segment business demanding a unified CRM engine");

  const cw3 = (W - 0.56) / 3 - 0.12;
  const cols3 = [
    { a: C.blue,  t: "📱  Personal Segment",    b: ["5G & LTE Prepaid / Postpaid mobile plans", "Dhiraagu Fibre Broadband – Limitehneh (30M→1Gbps)", "eSIM, Data SIM, Tourist SIM", "DhiraaguPay fintech wallet & reload credits", "Elite Club loyalty programme (Gold/Silver tiers)", "eZone content platform (LionsgatePlay etc.)", "SmartView smart home · OneNumber watch eSIM"] },
    { a: C.rose,  t: "🏢  Business / Enterprise",b: ["Dedicated Internet Access (DIA) · IPLC / MPLS", "Cloud Voice, PABX & Contact Centre", "Managed Security, SIEM, Cloud UTM, Firewall", "Colocation & Managed Infrastructure Services", "Bulk SMS & Short Code Messaging Service", "M2M / IoT Connectivity solutions", "Biz Limitehneh Fibre up to 1 Gbps (MVR 12,500/mo)"] },
    { a: C.gold,  t: "🏝️  Hospitality & Government", b: ["iHTV in-room hospitality TV platform", "Kobaa WiFi guest WiFi management platform", "Structured cabling for resort properties", "Temperature Monitoring & CCTV surveillance", "Government WAN framework & e-services connectivity", "Managed LAN & Wireless for campus environments", "Web hosting, domain services & SIP trunking"] },
  ];
  cols3.forEach((c, i) => card(s, 0.28 + i * (cw3 + 0.12), 1.26, cw3, 3.8, c.a, c.t, c.b));

  // Insight bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.28, y: 5.16, w: W - 0.56, h: 0.36,
    fill: { color: C.blueL }, line: { color: C.blue, width: 0.7 },
  });
  s.addText(
    [
      { text: "Key Insight: ", options: { bold: true, color: C.blue } },
      { text: "Dhiraagu spans 5 verticals — mobile, broadband, cloud, IoT, security, and fintech — yet manages customer relationships in siloed systems. A unified CRM is the strategic imperative.", options: { color: C.textBody } },
    ],
    { x: 0.42, y: 5.16, w: W - 0.8, h: 0.36, fontSize: 9.5, valign: "middle", margin: 0 }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// S L I D E   4  –  CHALLENGES
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  lightHeader(s, "Business Imperative", "The Challenges BRT 360 Solves", "Pain points that limit growth, retention, and operational efficiency");

  const hw = (W - 0.56) / 2 - 0.12;
  card(s, 0.28, 1.26, hw, 4.18, C.rose, "Operational Gaps", [
    "Customer data fragmented across billing, provisioning, and legacy support — no single customer view",
    "Sales teams lack real-time product eligibility and cross-sell intelligence for Enterprise accounts",
    "Campaign execution for promotions (Salhi Data, Samsung S26 launch) is manual and slow-to-market",
    "Service requests and trouble tickets managed without SLA visibility or auto-escalation rules",
    "No unified contract lifecycle for hospitality or government multi-year deals",
    "Partner/dealer channels lack self-service portal — order delays and commission reconciliation issues",
    "Churn signals from Elite Club and postpaid base undetected without predictive analytics",
  ]);
  card(s, 0.4 + hw, 1.26, hw, 4.18, C.gold, "Strategic Risks", [
    "Revenue leakage from un-billed add-ons and missed renewal opportunities in enterprise contracts",
    "Inability to quickly launch new digital products (DhiraaguPay, OneNumber) with bundled CRM journeys",
    "Government & enterprise tender responses delayed by lack of accurate account intelligence",
    "Order fulfilment lifecycle not linked to customer-facing CRM — creating fulfilment-to-billing gaps",
    "No 360° visibility into customer profitability across mobile + broadband + business portfolios",
    "Compliance risk: no structured audit trail for corporate customer data handling and consent",
    "Customer satisfaction erodes when billing service issues are not tracked end-to-end in CRM",
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// S L I D E   5  –  SOLUTION VISION DIVIDER
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  dividerSlide(
    s, "360",
    "Introducing ", "BRT 360 CRM",
    "A purpose-built, telco-grade Customer Relationship Platform delivering a unified 360° view of every Dhiraagu customer — from prepaid subscribers to multi-island enterprise accounts — with native Oracle BRM billing integration and seamless connectivity to Dhiraagu's existing Order Orchestration Platform."
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// S L I D E   6  –  ARCHITECTURE
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  lightHeader(s, "Technology", "BRT 360 – Solution Architecture", "Cloud-native microservices on a modern, open, and scalable stack");

  const tiers = [
    { l: "PRESENTATION TIER",          a: C.blue,  chips: ["React 18 SPA", "TypeScript", "Responsive PWA", "Role-Based Dashboards", "Mobile Agent App", "Partner Self-Service Portal"] },
    { l: "API & BUSINESS LOGIC TIER",  a: C.rose,  chips: [".NET 8 Microservices", "Node.js Event Bus (Kafka)", "GraphQL / REST APIs", "TM Forum Open API", "BPMN Workflow Engine", "AI/ML Inference Layer"] },
    { l: "DATA TIER",                  a: C.gold,  chips: ["Oracle DB 19c (Billing-Grade)", "PostgreSQL 16 (CRM Ops)", "Redis Cache", "Elasticsearch (Search)", "Data Warehouse / OLAP", "Object Storage (Docs)"] },
    { l: "INTEGRATION & BSS/OSS TIER", a: C.green, chips: ["Oracle BRM Connector", "Order Orchestration API", "Mediation / Rating Feed", "DhiraaguPay API", "Bulk SMS Gateway", "LDAP / SSO (AD)", "ERP / Finance Integration"] },
  ];
  const bh = 0.72, gap = 0.09;
  tiers.forEach((t, i) => tierBand(s, 1.24 + i * (bh + gap), t.a, t.l, t.chips));
}

// ─────────────────────────────────────────────────────────────────────────────
// S L I D E   7  –  MODULES OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  lightHeader(s, "Platform Overview", "BRT 360 – CRM Module Landscape", "Nine integrated modules — one unified customer data platform");

  const mods = [
    { a: C.blue,  n: "01", t: "Customer 360 Hub",         d: "Unified subscriber/account profile with real-time BRM billing, usage, and interaction history from all touchpoints." },
    { a: C.rose,  n: "02", t: "Sales & Opportunity",       d: "End-to-end lead-to-order pipeline for Personal, SME, Enterprise, Hospitality, and Government segments." },
    { a: C.gold,  n: "03", t: "Campaign & Promotions",     d: "Multi-channel campaign engine tied to Dhiraagu's promotions calendar, Elite Club, and device launches." },
    { a: C.green, n: "04", t: "Service & Case Mgmt",       d: "Omni-channel trouble ticketing with SLA enforcement, auto-escalation, and billing dispute resolution." },
    { a: C.blue,  n: "05", t: "Contract & Entitlement",    d: "Full contract lifecycle for enterprise and government deals with renewal alerts and e-signature workflows." },
    { a: C.rose,  n: "06", t: "Partner & Channel",         d: "Dealer/reseller portal with order submission, commission tracking, and territory performance analytics." },
    { a: C.gold,  n: "07", t: "Order & Provisioning",      d: "Customer-facing order management bridging CRM to the Order Orchestration Platform and BRM activation." },
    { a: C.green, n: "08", t: "AI Analytics & Insights",   d: "Churn prediction, next-best-offer engine, CLV scoring, and revenue leakage dashboards." },
    { a: C.blue,  n: "09", t: "Admin & Configuration",     d: "Product catalog, pricing rules, workflow designer, role/permission engine, and integration health monitoring." },
  ];

  const cols = 3, cw3m = (W - 0.56) / cols - 0.12, ch = 1.28;
  mods.forEach((m, i) => {
    const cx = 0.28 + (i % cols) * (cw3m + 0.12);
    const cy = 1.26 + Math.floor(i / cols) * (ch + 0.08);
    s.addShape(pres.shapes.RECTANGLE, { x: cx, y: cy, w: cw3m, h: ch, fill: { color: C.cardBg }, line: { color: C.border, width: 0.5 }, shadow: mkSh() });
    s.addShape(pres.shapes.RECTANGLE, { x: cx, y: cy, w: cw3m, h: 0.05, fill: { color: m.a }, line: { color: m.a } });
    s.addText(m.n, { x: cx + 0.1, y: cy + 0.1, w: 0.3, h: 0.26, fontSize: 10.5, bold: true, color: m.a, margin: 0 });
    s.addText(m.t, { x: cx + 0.42, y: cy + 0.1, w: cw3m - 0.52, h: 0.26, fontSize: 10.5, bold: true, color: C.textHd, fontFace: "Calibri", margin: 0 });
    s.addText(m.d, { x: cx + 0.1, y: cy + 0.42, w: cw3m - 0.2, h: ch - 0.52, fontSize: 9.5, color: C.textBody, margin: 0 });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// S L I D E   8  –  MODULE 01: CUSTOMER 360
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  lightHeader(s, "Module 01", "Customer 360 Hub", "Every interaction, every subscription, every bill — in one unified profile");

  // Left detail card
  card(s, 0.28, 1.26, 5.6, 4.22, C.blue, "Capabilities", []);
  const leftItems = [
    ["Unified Customer Profile:", "All Dhiraagu relationships — prepaid, postpaid, broadband, business, DhiraaguPay — consolidated into a single golden record."],
    ["Real-Time BRM Sync:", "Live account balance, bill history, usage thresholds, and payment status pulled from Oracle BRM on demand."],
    ["Corporate Hierarchy:", "Link subscribers under corporate accounts (e.g. resort group spanning multiple island properties)."],
    ["Interaction Timeline:", "Chronological log of calls, tickets, orders, billing events, and campaign responses across all channels."],
    ["Elite Club Loyalty View:", "Points balance, tier status, redemption history, and churn risk score displayed inline on every customer record."],
    ["Multi-Channel Identity:", "Merges identities across App, Web, OCS, walk-in using MSISDN, NID, and email as master keys."],
    ["Consent Management:", "Marketing opt-in/out controls with full audit trail for regulatory compliance."],
  ];
  const richLeft = leftItems.map(([bold, rest], i) => [
    { text: "▸ " + bold + " ", options: { bold: true, color: C.blue, fontSize: 9.5 } },
    { text: rest, options: { color: C.textBody, fontSize: 9.5, breakLine: i < leftItems.length - 1 } },
  ]).flat();
  s.addText(richLeft, { x: 0.42, y: 1.6, w: 5.32, h: 3.76, fontFace: "Calibri", paraSpaceAfter: 5.5, margin: 0 });

  // Right — sources badge cloud
  s.addShape(pres.shapes.RECTANGLE, { x: 6.04, y: 1.26, w: 3.68, h: 1.72, fill: { color: C.blueL }, line: { color: C.blue, width: 0.7 } });
  s.addText("DATA SOURCES INTEGRATED", { x: 6.18, y: 1.34, w: 3.4, h: 0.22, fontSize: 7.5, bold: true, color: C.blue, charSpacing: 1.5, margin: 0 });
  const sources = ["Oracle BRM", "OCS / PCRF", "Order Orchestration", "DhiraaguPay", "eZone", "Elite Club", "PABX / CC Logs", "Bulk SMS Logs"];
  let sx = 6.18, sy2 = 1.64;
  sources.forEach(src => {
    const sw2 = src.length * 0.08 + 0.24;
    if (sx + sw2 > 9.6) { sx = 6.18; sy2 += 0.34; }
    s.addShape(pres.shapes.RECTANGLE, { x: sx, y: sy2, w: sw2, h: 0.25, fill: { color: C.cardBg }, line: { color: C.blue, width: 0.8 } });
    s.addText(src, { x: sx, y: sy2, w: sw2, h: 0.25, fontSize: 8.5, bold: true, color: C.blue, align: "center", valign: "middle", margin: 0 });
    sx += sw2 + 0.1;
  });

  // Business impact
  card(s, 6.04, 3.12, 3.68, 2.36, C.gold, "Business Impact", [
    "Reduce average agent handle time by 40% — everything visible without switching systems",
    "Upsell conversion improvement through AI-surfaced next-best-offer recommendations",
    "Single source of truth eliminates data reconciliation overhead across teams",
    "Customer Health Score enables proactive churn prevention before contract expiry",
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// S L I D E   9  –  MODULE 02: SALES
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  lightHeader(s, "Module 02", "Sales & Opportunity Management", "From lead to signed order — across all Dhiraagu segments and verticals");

  const cw3s = (W - 0.56) / 3 - 0.12;
  const topCards = [
    { a: C.rose, t: "Lead Management",    b: ["Capture leads from web, app, walk-in, and outbound campaigns automatically", "Auto-scoring and routing by segment (Personal / SME / Enterprise / Hospitality)", "Duplicate detection via MSISDN, NID, and company registry lookup"] },
    { a: C.rose, t: "Opportunity Pipeline",b: ["Configurable sales stages per vertical (Hospitality vs Enterprise cycles differ)", "Expected revenue, product mix, and close probability forecasting", "Win/loss analytics with competitor capture for strategic intelligence"] },
    { a: C.rose, t: "Quote-to-Order",      b: ["Configure products from live product catalog (Biz Fibre, DIA, IPLC, VoIP bundles)", "Discount approval workflow with authority matrix and full audit trail", "E-signature integration for digital contract acceptance"] },
  ];
  topCards.forEach((c, i) => card(s, 0.28 + i * (cw3s + 0.12), 1.26, cw3s, 2.0, c.a, c.t, c.b));

  const hw2 = (W - 0.56) / 2 - 0.12;
  card(s, 0.28, 3.38, hw2, 2.0, C.blue, "Account & Territory Management", [
    "Island/atoll-based territory assignment aligned to Dhiraagu's regional sales structure",
    "Key account planning for government and enterprise top accounts with dedicated AM assignment",
    "Multi-contact management within corporate hierarchies (CFO, IT Head, Procurement Lead)",
    "Activity tracking — calls, visits, demos — with calendar and email integration",
  ]);
  card(s, 0.4 + hw2, 3.38, hw2, 2.0, C.gold, "Sales Performance & Forecasting", [
    "Quota assignment and real-time attainment tracking per sales rep, team, and region",
    "Pipeline funnel analysis with stage velocity and conversion rate benchmarks",
    "Monthly/quarterly revenue forecast with weighted probability modelling",
    "Incentive compensation calculation and transparent payout reporting for reps",
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// S L I D E   10  –  MODULE 03: CAMPAIGN
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  lightHeader(s, "Module 03", "Campaign & Promotions Management", "Targeted, personalised campaigns tied to Dhiraagu's full promotions calendar");

  card(s, 0.28, 1.26, 5.6, 4.22, C.blue, "Campaign Engine Capabilities", [
    "Segmentation Builder: Drag-and-drop audience using 50+ attributes — ARPU, usage, device, loyalty tier, geography, plan type",
    "Multi-Channel Execution: SMS (Dhiraagu Bulk SMS gateway), Push Notification (DhiraaguApp), Email, in-app banners in eZone",
    "Promotions Lifecycle: Create, approve, schedule, and retire promotions (Salhi Double Data, Samsung S26 bundles, Free Home Takaful)",
    "A/B Testing: Split test offer variants and auto-promote the winning version after a hold period",
    "Real-Time Trigger Campaigns: Event-driven — send an upgrade offer when a customer's data hits 90% utilisation (BRM Kafka event feed)",
    "Elite Club Integration: Points multiplier events, tier upgrade nudges, and exclusive product access campaigns",
    "Campaign P&L Tracking: Revenue attributed per campaign with conversion rates and cost-per-acquisition metrics",
  ]);

  // Right: promo type badges
  s.addShape(pres.shapes.RECTANGLE, { x: 6.04, y: 1.26, w: 3.68, h: 2.24, fill: { color: C.roseL }, line: { color: C.rose, width: 0.7 } });
  s.addText("PROMOTION TYPES SUPPORTED", { x: 6.18, y: 1.34, w: 3.4, h: 0.22, fontSize: 7.5, bold: true, color: C.rose, charSpacing: 1.5, margin: 0 });
  const promos = [
    ["Device Bundle Offers",C.blue], ["Double Data Plans",C.blue], ["Tourist SIM Promo",C.rose],
    ["Roaming Packages",C.rose],    ["Fibre Upsell",C.gold],      ["Business Plan Upgrade",C.gold],
    ["Loyalty Rewards",C.green],    ["Referral Incentives",C.green],["Seasonal Campaigns",C.blue],
    ["Free Takaful Bundle",C.rose], ["eZone Content Trials",C.gold],["B2B Cross-Sell",C.blue],
  ];
  let bpx = 6.18, bpy = 1.64;
  promos.forEach(([label, a]) => {
    const pw = label.length * 0.074 + 0.22;
    if (bpx + pw > 9.6) { bpx = 6.18; bpy += 0.33; }
    s.addShape(pres.shapes.RECTANGLE, { x: bpx, y: bpy, w: pw, h: 0.24, fill: { color: C.cardBg }, line: { color: a, width: 0.8 } });
    s.addText(label, { x: bpx, y: bpy, w: pw, h: 0.24, fontSize: 8, bold: true, color: a, align: "center", valign: "middle", margin: 0 });
    bpx += pw + 0.08;
  });

  card(s, 6.04, 3.64, 3.68, 1.84, C.gold, "DhiraaguPay Integration", [
    "BRT 360 connects to DhiraaguPay API to trigger reload bonus campaigns automatically",
    "Track wallet-funded conversions, closing the loop between payments and promotions",
    "\"Reload & Get Free Credits\" offers orchestrated in real-time on qualifying top-up events",
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// S L I D E   11  –  MODULE 04: SERVICE
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  lightHeader(s, "Module 04", "Service & Case Management", "Omni-channel support with SLA enforcement and billing dispute handling");

  const hw3 = (W - 0.56) / 2 - 0.12;
  card(s, 0.28, 1.26, hw3, 2.0, C.blue, "Trouble Ticket Management", [
    "Unified ticket intake: App, Web, IVR, Email, Chat, Walk-in, and Field reports",
    "Auto-classification by service type (Mobile / Broadband / Business / Billing)",
    "Priority matrix: VIP (Elite Gold), SLA-governed (Enterprise), and standard queues",
    "Tickets linked to BRM account — billing faults trigger automatic credit assessment workflow",
  ]);
  card(s, 0.4 + hw3, 1.26, hw3, 2.0, C.rose, "SLA & Escalation Engine", [
    "Configurable SLA tiers per contract type and customer segment — no hard-coded rules",
    "Automated escalation to Level 2 / NOC / Management after breach threshold is reached",
    "Real-time SLA breach dashboards for supervisors and account managers with drill-down",
    "Automated customer SMS/email notifications on ticket status milestones",
  ]);

  const cw3d = (W - 0.56) / 3 - 0.12;
  card(s, 0.28, 3.38, cw3d, 2.0, C.gold, "Field Service Dispatch", [
    "Work order generation for on-site interventions from tickets",
    "Mobile app for engineers — update status, capture resolution notes and photos",
    "Island-aware routing with atoll ferry schedule awareness for remote sites",
  ]);
  card(s, 0.28 + cw3d + 0.12, 3.38, cw3d, 2.0, C.blue, "Billing Dispute Resolution", [
    "Dispute case linked to BRM invoice records in real-time",
    "Credit note approval workflow with finance authority levels and limits",
    "Resolution SLA tracked separately from technical fault timelines",
  ]);
  card(s, 0.28 + 2 * (cw3d + 0.12), 3.38, cw3d, 2.0, C.green, "Service Analytics", [
    "FCR and Mean Time To Resolve (MTTR) KPIs continuously tracked",
    "Repeat contact analysis to identify systemic product or network issues",
    "Post-resolution CSAT surveys triggered automatically via SMS or app",
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// S L I D E   12  –  MODULE 05: CONTRACT
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  lightHeader(s, "Module 05", "Contract & Entitlement Management", "From proposal to renewal — enterprise and government contract governance");

  card(s, 0.28, 1.26, 5.5, 4.22, C.blue, "Contract Lifecycle Capabilities", [
    "Lifecycle Stages: Draft → Legal Review → Approved → Active → Renewal → Expired with configurable approval matrices",
    "Template Library: Pre-built templates for Hospitality SLAs, Government MoUs, Enterprise DIA agreements, and SME cloud terms",
    "Service Entitlement Engine: Map contracted services to specific accounts — DIA bandwidth levels, iHTV room count, SIEM scope",
    "Renewal Alert Automation: 90/60/30-day alerts to account managers with AI-surfaced upsell opportunities embedded",
    "Amendment & Change Control: Managed amendment workflow with version control and full audit history of all changes",
    "Revenue Recognition: Contract value and milestone billing schedules exported to Oracle Financials / ERP",
    "E-Signature Workflow: DocuSign-compatible remote signing — critical for Dhiraagu's geographically dispersed clients",
    "Regulatory Clauses: MCIT (Maldives Communications Authority) compliance clause library built into all templates",
  ]);

  // Contract types table
  s.addShape(pres.shapes.RECTANGLE, { x: 5.94, y: 1.26, w: 3.78, h: 4.22, fill: { color: C.cardBg }, line: { color: C.border, width: 0.5 }, shadow: mkSh() });
  s.addShape(pres.shapes.RECTANGLE, { x: 5.94, y: 1.26, w: 3.78, h: 0.055, fill: { color: C.gold }, line: { color: C.gold } });
  s.addText("SUPPORTED CONTRACT TYPES", { x: 6.08, y: 1.34, w: 3.5, h: 0.22, fontSize: 7.5, bold: true, color: C.gold, charSpacing: 1.5, margin: 0 });

  const ctRows = [
    ["DIA / IPLC Service Agreement",      "Enterprise",  C.rose  ],
    ["Managed Security Service Contract", "Enterprise",  C.rose  ],
    ["iHTV & Kobaa WiFi SLA",             "Hospitality", C.blue  ],
    ["Government WAN Framework",          "Government",  C.gold  ],
    ["Cloud Voice / PABX Agreement",      "SME",         C.green ],
    ["Biz Limitehneh Fibre Terms",        "SME",         C.green ],
    ["M2M / IoT Master Service Agmt",     "Enterprise",  C.rose  ],
    ["Bulk SMS & Short Code Service",     "SME/Ent.",    C.blue  ],
  ];
  ctRows.forEach(([nm, seg, sc], i) => {
    const ry = 1.66 + i * 0.44;
    s.addShape(pres.shapes.RECTANGLE, { x: 5.94, y: ry, w: 3.78, h: 0.4, fill: { color: i % 2 ? "F8FAFC" : C.cardBg }, line: { color: C.border, width: 0.3 } });
    s.addText(nm, { x: 6.08, y: ry + 0.08, w: 2.7, h: 0.24, fontSize: 9.5, color: C.textBody, margin: 0 });
    s.addShape(pres.shapes.RECTANGLE, { x: 8.8, y: ry + 0.08, w: 0.84, h: 0.24, fill: { color: sc, transparency: 84 }, line: { color: sc, width: 0.6 } });
    s.addText(seg, { x: 8.8, y: ry + 0.08, w: 0.84, h: 0.24, fontSize: 7.5, bold: true, color: sc, align: "center", valign: "middle", margin: 0 });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// S L I D E   13  –  MODULE 06: PARTNER
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  lightHeader(s, "Module 06", "Partner & Channel Management", "Empowering Dhiraagu's dealer and reseller network with a self-service portal");

  const cw3p = (W - 0.56) / 3 - 0.12;
  [
    { a: C.rose,  t: "Partner Onboarding",       b: ["Digital dealer registration and KYB (Know Your Business) workflow with document upload", "Product certification and training tracking per partner and agent", "Territory and quota assignment aligned to Dhiraagu's island regional structure"] },
    { a: C.rose,  t: "Order Management Portal",  b: ["Partners submit new activations, SIM orders, and plan changes via self-service portal", "Real-time order status visibility linked to the Order Orchestration Platform", "Document upload (NID, business registration) enforced for compliance"] },
    { a: C.rose,  t: "Commission & Incentives",  b: ["Commission rule engine: flat fee, revenue share, tiered incentives fully configurable", "Automated monthly statement generation and structured dispute management workflow", "Performance leaderboard and bonus attainment tracker visible to each partner"] },
  ].forEach((c, i) => card(s, 0.28 + i * (cw3p + 0.12), 1.26, cw3p, 2.1, c.a, c.t, c.b));

  const hw3p = (W - 0.56) / 2 - 0.12;
  card(s, 0.28, 3.48, hw3p, 1.96, C.blue, "Partner Analytics", [
    "Revenue contributed per partner with trend analysis and comparative ranking by territory",
    "Activation volumes, churn rates, and ARPU of partner-acquired subscribers for quality scoring",
    "Partner tier scoring with automated upgrade/downgrade recommendations to channel team",
    "Territory whitespace analysis for expansion targeting and resource allocation decisions",
  ]);
  card(s, 0.4 + hw3p, 3.48, hw3p, 1.96, C.gold, "Communication Hub", [
    "Push notifications for new promotions, product updates, and commission statements",
    "Bulk SMS alerts via Dhiraagu's own Short Code Messaging Service integration",
    "Document library: current price lists, product specs, rate cards, and training material",
    "Announcement broadcast to all dealers or targeted by tier and territory",
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// S L I D E   14  –  MODULES 07 & 08: ORDER + AI
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  lightHeader(s, "Modules 07 & 08", "Order Management + AI Analytics & Insights", "Bridging CRM to fulfilment, and turning data into competitive advantage");

  const hw4 = (W - 0.56) / 2 - 0.12;
  card(s, 0.28, 1.26, hw4, 4.22, C.blue, "Order & Provisioning (Module 07)", [
    "Customer-Facing Order Capture: New connections, upgrades, plan changes, and add-on activations initiated from CRM and passed to Dhiraagu's Order Orchestration Platform",
    "Order Decomposition: Complex multi-product orders (Enterprise site with DIA + MPLS + PABX + Security) decomposed into individual provisioning tasks",
    "Order Orchestration Integration: Real-time order status sync back from Dhiraagu's Order Orchestration Platform into the CRM order timeline via webhook callbacks",
    "BRM Subscription Activation: On provisioning completion, BRM subscription creation triggered automatically — zero manual re-keying required",
    "Jeopardy Management: Orders at risk of missing SLA flagged automatically with reason codes and suggested remediation steps for operations team",
    "Customer Milestones: Automated notifications (order received → in progress → activated) delivered via SMS and DhiraaguApp push notifications",
  ]);
  card(s, 0.4 + hw4, 1.26, hw4, 4.22, C.gold, "AI Analytics & Insights (Module 08)", [
    "Churn Prediction Engine: ML model scores all active customers monthly on churn probability using usage trends, complaints, payment behaviour, and loyalty tier",
    "Next-Best-Offer (NBO): Real-time recommendation engine surfaces the most relevant upsell or retention offer when an agent opens a customer record in CRM",
    "Customer Lifetime Value (CLV): Forward-looking CLV model segmenting customers for prioritised investment, premium service levels, and retention budgets",
    "Revenue Leakage Detection: Cross-references Oracle BRM billing records with CRM contracted entitlements to identify under-billed or missing service charges",
    "Executive Dashboards: Total subscribers, ARPU, NPS, churn rate, and campaign ROI in real-time with full drill-down to individual account and order level",
    "Segment Heatmaps: Visual maps of customer density and revenue contribution by Maldives atoll for strategic network and commercial coverage planning",
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// S L I D E   15  –  ORACLE BRM INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  lightHeader(s, "Integration Deep Dive", "Oracle BRM Integration", "Real-time, bidirectional connectivity to Dhiraagu's billing and revenue management platform");

  // Flow row
  const fItems = [
    { t: "BRT 360 CRM\nCustomer Record",      a: C.blue  },
    { arrow: true },
    { t: ".NET BRM Connector\nSOAP-REST Adapter", a: C.rose },
    { arrow: true },
    { t: "Oracle BRM\nBilling & Revenue Mgmt", a: C.gold },
  ];
  const fW = [2.2, 0.42, 2.5, 0.42, 2.2]; let fx = 0.64;
  fItems.forEach((item, i) => {
    if (item.arrow) { s.addText("⇄", { x: fx, y: 1.26, w: fW[i], h: 0.65, fontSize: 20, color: C.blue, align: "center", valign: "middle", margin: 0 }); }
    else { flowBox(s, fx, 1.26, fW[i], 0.65, item.a, item.t.split("\n")[0], item.t.split("\n")[1]); }
    fx += fW[i] + 0.06;
  });

  const hw5 = (W - 0.56) / 2 - 0.12;
  card(s, 0.28, 2.1, hw5, 1.9, C.blue, "Data Flowing CRM → BRM", [
    "New subscription create/update triggered from CRM order workflow",
    "Plan change requests (upgrade / downgrade / add-on activations)",
    "Credit adjustment requests approved through CRM dispute workflow",
    "Customer profile updates (address, contact, payment method changes)",
  ]);
  card(s, 0.4 + hw5, 2.1, hw5, 1.9, C.rose, "Data Flowing BRM → CRM", [
    "Real-time account balance and usage stats pulled on customer record open",
    "Invoice and bill history last 12 months surfaced inline in CRM agent view",
    "Payment events (received, bounced, overdue) synced to CRM timeline automatically",
    "Usage threshold alerts (80% / 100% data) trigger real-time campaign events in CRM",
  ]);
  card(s, 0.28, 4.12, hw5, 1.36, C.gold, "Technical Integration Points", [
    "Oracle BRM PCM API (C/Java) wrapped via .NET BRM Client adapter with Infranet connection pool",
    "Kafka event bus for async usage event streaming from BRM mediation layer",
    "Redis cache for high-frequency balance lookups (sub-100ms response target)",
  ]);
  card(s, 0.4 + hw5, 4.12, hw5, 1.36, C.green, "Resilience & Governance", [
    "Circuit breaker prevents BRM outage from cascading to the CRM agent UI",
    "All BRM-bound transactions written to Oracle DB staging with retry and idempotency",
    "Full audit log of every CRM-initiated BRM action with user, timestamp, reason, and outcome",
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// S L I D E   16  –  ORDER ORCHESTRATION INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  lightHeader(s, "Integration Deep Dive", "Order Orchestration Platform Integration", "Connecting CRM-captured orders to Dhiraagu's existing Order Orchestration Platform and revenue lifecycle");

  // Flow row (5 boxes)
  const rFlow = [
    { t: "Customer Request\nCRM Order Capture",       a: C.blue  },
    null,
    { t: "Order Decomposition\nBRT 360 Order Engine", a: C.rose  },
    null,
    { t: "Orchestration\nDhiraagu Order Platform",    a: C.gold  },
    null,
    { t: "Billing Activation\nOracle BRM",            a: C.green },
    null,
    { t: "CRM Update\nOrder Completed",               a: C.blue  },
  ];
  const rfW = [1.52, 0.3, 1.52, 0.3, 1.72, 0.3, 1.52, 0.3, 1.52];
  let rfx = 0.2;
  rFlow.forEach((item, i) => {
    if (!item) { s.addText("→", { x: rfx, y: 1.26, w: rfW[i], h: 0.58, fontSize: 18, color: C.blue, align: "center", valign: "middle", margin: 0 }); }
    else { flowBox(s, rfx, 1.26, rfW[i], 0.58, item.a, item.t.split("\n")[0], item.t.split("\n")[1]); }
    rfx += rfW[i] + 0.03;
  });

  const cw3r = (W - 0.56) / 3 - 0.12;
  card(s, 0.28, 1.98, cw3r, 3.5, C.blue, "Order Submission API", [
    "BRT 360 submits decomposed order items to Dhiraagu's Order Orchestration Platform via its REST/XML Order Management API",
    "Order reference ID tracked in CRM for full end-to-end traceability across all systems and teams",
    "Supports fallout handling with manual intervention queue for complex or exceptional orders",
    "Batch and real-time order submission modes supported depending on order type and priority",
    "Order priority flag passed to the platform for VIP (Elite Gold) and SLA-critical enterprise accounts",
  ]);
  card(s, 0.28 + cw3r + 0.12, 1.98, cw3r, 3.5, C.rose, "Status Callback Webhooks", [
    "Dhiraagu's Order Orchestration Platform sends real-time provisioning milestones back to BRT 360 via webhook",
    "CRM order timeline updated automatically — no manual polling or agent intervention required",
    "Jeopardy alerts raised in CRM when provisioning task deadlines are missed in the platform",
    "Order completion event triggers Oracle BRM subscription activation handshake automatically",
    "Failed provisioning steps create an escalation case in the CRM Service module automatically",
  ]);
  card(s, 0.28 + 2 * (cw3r + 0.12), 1.98, cw3r, 3.5, C.gold, "Revenue Assurance View", [
    "CRM contract value reconciled against activated services on a daily automated run",
    "Gap report: contracted vs provisioned services for every enterprise account — visible to account manager",
    "BRM billing start date confirmation pulled back and stored in the CRM order record",
    "Revenue assurance dashboard flags accounts with provisioned services not yet generating billing",
    "Automated alerts to finance and sales ops for accounts with outstanding reconciliation gaps",
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// S L I D E   17  –  ROADMAP
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  lightHeader(s, "Delivery", "Implementation Roadmap", "Phased delivery — value from Day 1, full capability within 12 months");

  const phases = [
    { p: "Phase 1 · Months 1–3", label: "Foundation",     a: C.blue,  items: ["Customer 360 Hub", "Oracle BRM Connector", "Identity & SSO Setup", "Core UI & Dashboards", "Data Migration", "UAT & Training"] },
    { p: "Phase 2 · Months 4–6", label: "Sales & Service",a: C.rose,  items: ["Sales Pipeline Module", "Case Management", "SLA Engine", "Contract Management", "Order Orchestration Link", "Field Service App"] },
    { p: "Phase 3 · Months 7–9", label: "Engage & Grow",  a: C.gold,  items: ["Campaign Engine", "DhiraaguPay Integration", "Elite Club Sync", "Partner Portal", "Order Management", "AI Churn Model v1"] },
    { p: "Phase 4 · Months 10–12",label: "Intelligence",  a: C.green, items: ["AI Analytics Suite", "Next-Best-Offer Engine", "Executive BI Layer", "Revenue Assurance", "Performance Tuning", "Go-Live & Hyper-Care"] },
  ];

  // Timeline bar
  s.addShape(pres.shapes.RECTANGLE, { x: 0.28, y: 1.56, w: W - 0.56, h: 0.06, fill: { color: C.border }, line: { color: C.border } });

  const pw2 = (W - 0.56) / 4 - 0.1;
  phases.forEach((ph, i) => {
    const px3 = 0.28 + i * (pw2 + 0.1);

    // Timeline dot
    const dotX = px3 + pw2 / 2 - 0.13;
    s.addShape(pres.shapes.OVAL, { x: dotX, y: 1.46, w: 0.26, h: 0.26, fill: { color: ph.a }, line: { color: ph.a } });

    // Phase card
    s.addShape(pres.shapes.RECTANGLE, { x: px3, y: 1.84, w: pw2, h: 3.6, fill: { color: C.cardBg }, line: { color: C.border, width: 0.5 }, shadow: mkSh() });
    s.addShape(pres.shapes.RECTANGLE, { x: px3, y: 1.84, w: pw2, h: 0.055, fill: { color: ph.a }, line: { color: ph.a } });

    s.addText(ph.p, { x: px3 + 0.1, y: 1.9, w: pw2 - 0.18, h: 0.22, fontSize: 8, bold: true, color: ph.a, charSpacing: 0.5, margin: 0 });
    s.addText(ph.label, { x: px3 + 0.1, y: 2.18, w: pw2 - 0.18, h: 0.3, fontSize: 14, bold: true, color: C.textHd, fontFace: "Calibri", margin: 0 });

    const ritems = ph.items.map((it, j) => ({
      text: it,
      options: { bullet: true, color: C.textBody, fontSize: 9.5, breakLine: j < ph.items.length - 1 },
    }));
    s.addText(ritems, { x: px3 + 0.1, y: 2.54, w: pw2 - 0.18, h: 2.76, fontFace: "Calibri", paraSpaceAfter: 5, margin: 0 });
  });

  // Bottom note strip
  s.addShape(pres.shapes.RECTANGLE, { x: 0.28, y: 5.5, w: W - 0.56, h: 0.0, fill: { color: C.blueL }, line: { color: C.blueL } });
}

// ─────────────────────────────────────────────────────────────────────────────
// S L I D E   18  –  WHY BRT 360
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  lightHeader(s, "Value Proposition", "Why BRT 360 for Dhiraagu", "Built for telcos. Proven in BRM environments. Delivered with partnership.");

  const hw6 = (W - 0.56) / 2 - 0.12;
  card(s, 0.28, 1.26, hw6, 1.82, C.blue, "Telco-Native, Not Adapted", [
    "BRT 360 designed from the ground up for CSPs — not adapted from a generic CRM platform",
    "Subscription lifecycle, usage-based billing, and network events are first-class data model citizens",
    "Telecom product catalog structures (prepaid, postpaid, bundles, add-ons) native to BRT 360 schema",
  ]);
  card(s, 0.4 + hw6, 1.26, hw6, 1.82, C.rose, "Pre-Built BRM Connector", [
    "Oracle BRM connector delivered and battle-tested across 12 live telco BRM implementations",
    "Dhiraagu gets a proven, supported adapter — not a risky custom one-off build",
    "60% reduction in BRM integration risk and timeline versus greenfield connector development",
  ]);
  card(s, 0.28, 3.18, hw6, 1.82, C.gold, "Open & Extensible", [
    "All BRT 360 capabilities exposed via TM Forum-aligned Open APIs — no vendor lock-in at any layer",
    "Dhiraagu's internal teams, SIs, and ISVs can extend the platform without BRT dependency",
    "Plugin architecture supports future OSS/BSS integrations as Dhiraagu's technology landscape evolves",
  ]);
  card(s, 0.4 + hw6, 3.18, hw6, 1.82, C.green, "Maldives-Context Ready", [
    "Island/atoll-aware territory model and MVR currency support built in from day one",
    "GST/TGST compliance and MCIT regulatory clause library for Dhiraagu's legal obligations",
    "Dhivehi language support and island-specific field service routing for atoll operations",
  ]);

  // KPI bar
  s.addShape(pres.shapes.RECTANGLE, { x: 0.28, y: 5.1, w: W - 0.56, h: 0.42, fill: { color: C.blueL }, line: { color: C.blue, width: 0.7 } });
  const kpis = [
    { v: "60%",  l: "Faster BRM Integration vs Greenfield", a: C.blue  },
    { v: "40%",  l: "Reduction in Agent Handle Time",       a: C.rose  },
    { v: "25%",  l: "Improvement in Churn Retention Rate",  a: C.gold  },
    { v: "12mo", l: "Full Platform Delivery Target",        a: C.green },
  ];
  const kw = (W - 0.56) / 4;
  kpis.forEach((k, i) => {
    s.addText(
      [
        { text: k.v + "  ", options: { bold: true, color: k.a, fontSize: 18 } },
        { text: k.l,        options: { color: C.textBody, fontSize: 8.5 } },
      ],
      { x: 0.28 + i * kw + 0.1, y: 5.11, w: kw - 0.2, h: 0.4, valign: "middle", margin: 0 }
    );
    if (i < 3) s.addShape(pres.shapes.LINE, { x: 0.28 + (i + 1) * kw, y: 5.16, w: 0, h: 0.3, line: { color: C.border, width: 0.6 } });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// S L I D E   19  –  CLOSING / CTA
// ─────────────────────────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  darkSetup(s);

  // Deco circles
  s.addShape(pres.shapes.OVAL, { x: 6.5,  y: -2.0, w: 6.0, h: 6.0, fill: { color: C.blue, transparency: 93 }, line: { color: C.blue, width: 0.6, transparency: 70 } });
  s.addShape(pres.shapes.OVAL, { x: -1.8, y:  3.2, w: 4.2, h: 4.2, fill: { color: C.rose, transparency: 93 }, line: { color: C.rose, width: 0.6, transparency: 65 } });

  // Logo – large
  s.addText(
    [
      { text: "Blue", options: { color: C.blueMid, bold: true, fontSize: 48 } },
      { text: "Rose", options: { color: C.rose,    bold: true, fontSize: 48 } },
    ],
    { x: 0.5, y: 0.42, w: W - 1, h: 1.1, align: "center", fontFace: "Calibri", margin: 0 }
  );
  s.addText("Technologies  ·  BRT 360 Platform", {
    x: 0.5, y: 1.44, w: W - 1, h: 0.28, fontSize: 13, color: C.mutedW, align: "center", charSpacing: 2, margin: 0,
  });

  // Headline
  s.addText(
    [
      { text: "Let's Build the ",  options: { color: C.white,    bold: true, fontSize: 36 } },
      { text: "Future ",           options: { color: C.blueMid,  bold: true, fontSize: 36 } },
      { text: "Together",          options: { color: C.white,    bold: true, fontSize: 36 } },
    ],
    { x: 0.5, y: 1.9, w: W - 1, h: 0.82, align: "center", fontFace: "Calibri", margin: 0 }
  );

  s.addText("We're ready to begin with a detailed solution workshop and a proof-of-concept\nOracle BRM integration demonstration tailored to Dhiraagu's live environment.", {
    x: 1.5, y: 2.86, w: W - 3, h: 0.72,
    fontSize: 13, color: C.mutedW, align: "center", margin: 0,
  });

  // Info boxes
  const boxes = [
    { l: "Platform",    v: "BRT 360 CRM" },
    { l: "Tech Stack",  v: ".NET · React · Oracle · PostgreSQL" },
    { l: "Integration", v: "Oracle BRM + Order Orchestration" },
    { l: "Timeline",    v: "12 Months Full Delivery" },
  ];
  const bw3 = (W - 0.8) / 4 - 0.12;
  boxes.forEach((b, i) => {
    const bx = 0.4 + i * (bw3 + 0.14);
    s.addShape(pres.shapes.RECTANGLE, { x: bx, y: 3.72, w: bw3, h: 0.88, fill: { color: C.darkMid }, line: { color: C.rose, width: 0.7 }, shadow: mkSh() });
    s.addShape(pres.shapes.RECTANGLE, { x: bx, y: 3.72, w: bw3, h: 0.055, fill: { color: C.rose }, line: { color: C.rose } });
    s.addText(b.l.toUpperCase(), { x: bx + 0.1, y: 3.78, w: bw3 - 0.2, h: 0.22, fontSize: 7.5, color: C.mutedW, charSpacing: 1.5, margin: 0 });
    s.addText(b.v, { x: bx + 0.1, y: 4.0, w: bw3 - 0.2, h: 0.32, fontSize: 10, bold: true, color: C.white, margin: 0 });
  });

  // Bottom bar
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: H - 0.38, w: W, h: 0.38, fill: { color: C.darkMid }, line: { color: C.darkMid } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: H - 0.38, w: W, h: 0.04, fill: { color: C.blue }, line: { color: C.blue } });
  s.addText("© 2026 BlueRose Technologies  ·  BRT 360 Platform  ·  Confidential & Proprietary", {
    x: 0.3, y: H - 0.34, w: W - 0.6, h: 0.3,
    fontSize: 8.5, color: C.mutedW, align: "center", margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// WRITE FILE
// ─────────────────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: "BRT360_Dhiraagu_CRM_Proposal.pptx" })
  .then(() => console.log("✅  BRT360_Dhiraagu_CRM_Proposal.pptx written successfully!"))
  .catch(err => { console.error("❌  Error:", err); process.exit(1); });
