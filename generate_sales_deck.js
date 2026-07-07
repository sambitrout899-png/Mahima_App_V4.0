/**
 * Mahima App – Global Sales Plan Deck Generator
 * ================================================
 * Run:
 *   npm install -g pptxgenjs
 *   node generate_sales_deck.js
 *
 * Output: Mahima_App_Sales_Plan_2026.pptx
 */

const pptxgen = require("pptxgenjs");
const path    = require("path");

// ─── PALETTE ────────────────────────────────────────────────
const C = {
  navy:    "1E2B5E",
  purple:  "6C63FF",
  green:   "3ECF8E",
  teal:    "0D9488",
  dark:    "1A1A2E",
  mid:     "4A4A8A",
  muted:   "64748B",
  light:   "F0EFFF",
  white:   "FFFFFF",
  offwh:   "F8F9FF",
  row1:    "F5F4FF",
  row2:    "FFFFFF",
  warn:    "F59E0B",
  red:     "EF4444",
};

const makeShadow = () => ({
  type: "outer", color: "000000", blur: 8, offset: 3, angle: 45, opacity: 0.12
});

// ─── HELPERS ─────────────────────────────────────────────────
function card(slide, x, y, w, h, fillColor, shadow = false) {
  slide.addShape("rect", {
    x, y, w, h,
    fill: { color: fillColor },
    line: { color: fillColor, width: 0 },
    ...(shadow ? { shadow: makeShadow() } : {}),
  });
}

function roundCard(slide, x, y, w, h, fillColor, shadow = true) {
  slide.addShape("roundRect", {
    x, y, w, h, rectRadius: 0.08,
    fill: { color: fillColor },
    line: { color: fillColor, width: 0 },
    ...(shadow ? { shadow: makeShadow() } : {}),
  });
}

function sectionLabel(slide, text, x, y) {
  slide.addText(text.toUpperCase(), {
    x, y, w: 4, h: 0.22,
    fontSize: 8, bold: true, color: C.purple,
    charSpacing: 3, margin: 0,
  });
}

function statBlock(slide, number, label, x, y, dark = false) {
  slide.addText(number, {
    x, y, w: 2.8, h: 0.9,
    fontSize: 44, bold: true,
    color: dark ? C.white : C.purple,
    align: "center", margin: 0,
  });
  slide.addText(label, {
    x, y: y + 0.85, w: 2.8, h: 0.45,
    fontSize: 11, color: dark ? "AAAACC" : C.muted,
    align: "center", margin: 0,
  });
}

function checkRow(slide, text, x, y, color = C.green) {
  slide.addText("✓", {
    x, y, w: 0.3, h: 0.3,
    fontSize: 12, bold: true, color, margin: 0,
  });
  slide.addText(text, {
    x: x + 0.32, y, w: 3.8, h: 0.3,
    fontSize: 11, color: C.dark, margin: 0,
  });
}

// ─── SLIDE BUILDERS ──────────────────────────────────────────

// SLIDE 1 — COVER
function slide01_cover(pres) {
  const s = pres.addSlide();
  s.background = { color: C.navy };

  // Big geometric accent (bottom-right glow block)
  s.addShape("oval", {
    x: 6.5, y: 2.8, w: 5.5, h: 5.5,
    fill: { color: C.purple, transparency: 82 },
    line: { color: C.purple, transparency: 82 },
  });
  s.addShape("oval", {
    x: 7.8, y: 3.5, w: 3.0, h: 3.0,
    fill: { color: C.green, transparency: 88 },
    line: { color: C.green, transparency: 88 },
  });

  // Tag line
  s.addText("GLOBAL SALES PLAN 2026", {
    x: 0.6, y: 1.1, w: 7, h: 0.28,
    fontSize: 9, bold: true, color: C.green,
    charSpacing: 4, margin: 0,
  });

  // Title
  s.addText([
    { text: "Mahima", options: { color: C.white, bold: true } },
    { text: " App", options: { color: C.green, bold: true } },
  ], {
    x: 0.5, y: 1.4, w: 9, h: 1.2,
    fontSize: 58, align: "left", margin: 0,
  });

  // Sub-title
  s.addText("Church Management System", {
    x: 0.6, y: 2.55, w: 7, h: 0.5,
    fontSize: 22, color: "9BA4C7", margin: 0,
  });

  // Description
  s.addText(
    "On-Premise & SaaS Deployment  ·  Global Churches & Ministries  ·  ASP.NET Core + React",
    {
      x: 0.6, y: 3.1, w: 8.5, h: 0.35,
      fontSize: 11, color: "6B7CB3", margin: 0,
    }
  );

  // Three stat pills
  const pills = [
    { label: "41+ Features", x: 0.6 },
    { label: "SaaS Ready",   x: 2.8 },
    { label: "Global Scale", x: 5.0 },
  ];
  pills.forEach(({ label, x }) => {
    roundCard(s, x, 3.65, 2.0, 0.38, "2D3875", false);
    s.addText(label, {
      x: x + 0.08, y: 3.66, w: 1.84, h: 0.36,
      fontSize: 11, bold: true, color: C.white,
      align: "center", margin: 0,
    });
  });

  s.addNotes(
    "Open the deck by briefly positioning Mahima as a full-stack ChMS built from the ground up " +
    "for modern churches — on any device, anywhere in the world."
  );
  return s;
}

// SLIDE 2 — AGENDA
function slide02_agenda(pres) {
  const s = pres.addSlide();
  s.background = { color: C.white };

  sectionLabel(s, "Today's Agenda", 0.5, 0.3);
  s.addText("What We'll Cover", {
    x: 0.5, y: 0.52, w: 9, h: 0.55,
    fontSize: 28, bold: true, color: C.dark, margin: 0,
  });

  const items = [
    { num: "01", title: "Market Opportunity",         desc: "Global church management market & TAM" },
    { num: "02", title: "Product Overview",            desc: "Mahima App modules & capabilities" },
    { num: "03", title: "Deployment Models",           desc: "On-Premise vs SaaS — when to sell which" },
    { num: "04", title: "Pricing Strategy",            desc: "Licensing tiers, subscription plans, add-ons" },
    { num: "05", title: "Target Segments & ICP",      desc: "Who we sell to and how to find them" },
    { num: "06", title: "Go-to-Market & Channels",    desc: "Sales motion, partners, and sales channels" },
    { num: "07", title: "Competitive Landscape",       desc: "Where Mahima wins vs alternatives" },
    { num: "08", title: "Revenue Projections & KPIs", desc: "3-year targets and success metrics" },
    { num: "09", title: "90-Day Action Plan",         desc: "Immediate next steps" },
  ];

  const col1 = items.slice(0, 5);
  const col2 = items.slice(5);

  col1.forEach((item, i) => {
    const y = 1.25 + i * 0.72;
    roundCard(s, 0.4, y, 4.3, 0.6, i % 2 === 0 ? C.offwh : C.white, false);
    s.addText(item.num, {
      x: 0.55, y: y + 0.05, w: 0.55, h: 0.5,
      fontSize: 18, bold: true, color: C.purple, margin: 0,
    });
    s.addText(item.title, {
      x: 1.15, y: y + 0.04, w: 3.4, h: 0.28,
      fontSize: 12, bold: true, color: C.dark, margin: 0,
    });
    s.addText(item.desc, {
      x: 1.15, y: y + 0.3, w: 3.4, h: 0.24,
      fontSize: 9.5, color: C.muted, margin: 0,
    });
  });

  col2.forEach((item, i) => {
    const y = 1.25 + i * 0.72;
    roundCard(s, 5.2, y, 4.3, 0.6, i % 2 === 0 ? C.offwh : C.white, false);
    s.addText(item.num, {
      x: 5.35, y: y + 0.05, w: 0.55, h: 0.5,
      fontSize: 18, bold: true, color: C.purple, margin: 0,
    });
    s.addText(item.title, {
      x: 5.95, y: y + 0.04, w: 3.4, h: 0.28,
      fontSize: 12, bold: true, color: C.dark, margin: 0,
    });
    s.addText(item.desc, {
      x: 5.95, y: y + 0.3, w: 3.4, h: 0.24,
      fontSize: 9.5, color: C.muted, margin: 0,
    });
  });
  return s;
}

// SLIDE 3 — MARKET OPPORTUNITY
function slide03_market(pres) {
  const s = pres.addSlide();
  s.background = { color: C.dark };

  sectionLabel(s, "Market Opportunity", 0.5, 0.3);
  s.addText("A $1.7B+ Global Opportunity", {
    x: 0.5, y: 0.52, w: 9, h: 0.6,
    fontSize: 30, bold: true, color: C.white, margin: 0,
  });
  s.addText(
    "The global Church Management Software market is projected to reach $1.7B+ by 2028, " +
    "driven by digitisation of faith communities worldwide.",
    {
      x: 0.5, y: 1.12, w: 9, h: 0.45,
      fontSize: 12, color: "9BA4C7", margin: 0,
    }
  );

  // 4 stat blocks
  const stats = [
    { n: "2.4B",   l: "Christians globally" },
    { n: "500K+",  l: "Organized churches worldwide" },
    { n: "< 12%",  l: "Using any digital ChMS" },
    { n: "$1.7B",  l: "Market size by 2028" },
  ];
  stats.forEach((st, i) => {
    const x = 0.4 + i * 2.35;
    roundCard(s, x, 1.75, 2.15, 1.45, "242E6A", true);
    s.addText(st.n, {
      x: x + 0.05, y: 1.85, w: 2.05, h: 0.75,
      fontSize: 38, bold: true, color: C.green,
      align: "center", margin: 0,
    });
    s.addText(st.l, {
      x: x + 0.05, y: 2.6, w: 2.05, h: 0.45,
      fontSize: 10, color: "9BA4C7",
      align: "center", margin: 0,
    });
  });

  // Regional breakdown
  s.addText("Key Geographies", {
    x: 0.5, y: 3.35, w: 5, h: 0.3,
    fontSize: 13, bold: true, color: C.white, margin: 0,
  });
  const geos = [
    { r: "Sub-Saharan Africa",    v: "Fastest growing church population. Low digital penetration." },
    { r: "United States",         v: "36,000+ mega-churches. High willingness to pay for ChMS." },
    { r: "South & Southeast Asia",v: "Rapidly growing diaspora communities. Mobile-first audience." },
    { r: "Latin America",         v: "Pentecostal growth driving demand for digital tools." },
    { r: "Europe & UK",           v: "Established denominations seeking modernisation." },
  ];
  geos.forEach((g, i) => {
    const y = 3.75 + i * 0.34;
    s.addShape("oval", {
      x: 0.5, y: y + 0.06, w: 0.18, h: 0.18,
      fill: { color: C.green }, line: { color: C.green },
    });
    s.addText(g.r + ": ", {
      x: 0.75, y, w: 2.2, h: 0.3,
      fontSize: 10, bold: true, color: C.white, margin: 0,
    });
    s.addText(g.v, {
      x: 2.85, y, w: 6.8, h: 0.3,
      fontSize: 10, color: "9BA4C7", margin: 0,
    });
  });

  s.addNotes(
    "Emphasize the 12% penetration figure — this is the white space. " +
    "Most churches globally still rely on spreadsheets, WhatsApp groups, or paper records."
  );
  return s;
}

// SLIDE 4 — PRODUCT OVERVIEW
function slide04_product(pres) {
  const s = pres.addSlide();
  s.background = { color: C.white };

  sectionLabel(s, "Product Overview", 0.5, 0.3);
  s.addText("Everything a Church Needs, in One Platform", {
    x: 0.5, y: 0.52, w: 9, h: 0.6,
    fontSize: 26, bold: true, color: C.dark, margin: 0,
  });

  // Left: description
  s.addText(
    "Mahima App is a complete Church Management System built on enterprise-grade " +
    "technology — ASP.NET Core 8, PostgreSQL, React, and Capacitor Android — " +
    "designed for ministries of all sizes worldwide.",
    {
      x: 0.5, y: 1.22, w: 4.2, h: 0.9,
      fontSize: 11.5, color: C.muted, margin: 0,
    }
  );

  const techItems = [
    "ASP.NET Core 8 Web API (44+ controllers)",
    "PostgreSQL with EF Core migrations",
    "React (Vite) + Capacitor Android",
    "SignalR real-time messaging",
    "JWT auth + Google SSO",
    "QuestPDF for certificates & reports",
  ];
  techItems.forEach((t, i) => {
    checkRow(s, t, 0.5, 2.2 + i * 0.32, C.purple);
  });

  // Right: module grid
  const modules = [
    { t: "Members",      d: "Full profile & enrichment" },
    { t: "Teams",        d: "Positions & assignments" },
    { t: "Chat",         d: "Real-time + mobile push" },
    { t: "Tasks",        d: "Hierarchical task mgmt" },
    { t: "Accounting",   d: "Double-entry + PDF reports" },
    { t: "Payroll",      d: "Payslips & payroll runs" },
    { t: "PastorBot AI", d: "Multi-language AI assistant" },
    { t: "Baptism",      d: "Workflow + certificate PDF" },
    { t: "Analytics",    d: "Live dashboards" },
  ];

  modules.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 5.0 + col * 1.62;
    const y = 1.15 + row * 1.35;
    roundCard(s, x, y, 1.52, 1.18, C.offwh, true);
    s.addText(m.t, {
      x: x + 0.1, y: y + 0.08, w: 1.32, h: 0.35,
      fontSize: 11, bold: true, color: C.purple,
      align: "center", margin: 0,
    });
    s.addText(m.d, {
      x: x + 0.06, y: y + 0.45, w: 1.4, h: 0.55,
      fontSize: 9.5, color: C.muted,
      align: "center", margin: 0,
    });
  });

  return s;
}

// SLIDE 5 — FULL MODULE LIST
function slide05_modules(pres) {
  const s = pres.addSlide();
  s.background = { color: C.offwh };

  sectionLabel(s, "Capabilities", 0.5, 0.3);
  s.addText("41+ Modules Across 8 Functional Areas", {
    x: 0.5, y: 0.52, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.dark, margin: 0,
  });

  const categories = [
    { name: "People & Teams",        items: ["Member Management", "Enriched Profiles (15 fields)", "Teams & Positions", "Attendance Tracking"] },
    { name: "Communication",         items: ["Real-Time Chat (SignalR)", "Group & DM Messaging", "Bulk SMS (Twilio)", "In-App Email Client"] },
    { name: "Pastoral Care",         items: ["Prayer Requests", "Counselling Workflow", "Baptism Management", "Marriage Applications"] },
    { name: "Finance",               items: ["Double-Entry Accounting", "Payroll & Payslips", "Expense Management", "Financial PDF Reports"] },
    { name: "Intelligence",          items: ["Analytics Dashboard", "Custom Report Builder", "PastorBot AI (Multi-lang)", "Ministry Automation"] },
    { name: "Platform Services",     items: ["File & Attachment Mgmt", "Google Drive Integration", "Audit Trail & Security Log", "Mobile Push Notifications"] },
    { name: "Content & Ministry",    items: ["Sermon / Book Library", "Task Management (Sub-tasks)", "Daily Routines", "CMS Landing Page"] },
    { name: "Multi-Tenancy (SaaS)",  items: ["Tenant Isolation", "Module Licensing", "Subscription Plans", "Razorpay Payments"] },
  ];

  const colors = [C.purple, "0D9488", "2563EB", "DC2626", "7C3AED", "059669", "D97706", "6C63FF"];

  categories.forEach((cat, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.35 + col * 2.32;
    const y = 1.2 + row * 2.0;

    roundCard(s, x, y, 2.15, 1.82, C.white, true);
    s.addShape("roundRect", {
      x: x + 0.08, y: y + 0.08, w: 1.99, h: 0.32, rectRadius: 0.06,
      fill: { color: colors[i] }, line: { color: colors[i] },
    });
    s.addText(cat.name, {
      x: x + 0.08, y: y + 0.09, w: 1.99, h: 0.3,
      fontSize: 9.5, bold: true, color: C.white,
      align: "center", margin: 0,
    });
    cat.items.forEach((item, j) => {
      s.addText("▸  " + item, {
        x: x + 0.12, y: y + 0.5 + j * 0.3,
        w: 1.9, h: 0.28,
        fontSize: 9, color: C.dark, margin: 0,
      });
    });
  });

  return s;
}

// SLIDE 6 — DEPLOYMENT COMPARISON
function slide06_deployment(pres) {
  const s = pres.addSlide();
  s.background = { color: C.white };

  sectionLabel(s, "Deployment Models", 0.5, 0.3);
  s.addText("Two Ways to Deliver Mahima App", {
    x: 0.5, y: 0.52, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.dark, margin: 0,
  });

  // On-Premise column
  roundCard(s, 0.4, 1.18, 4.3, 4.15, C.navy, true);
  s.addText("ON-PREMISE", {
    x: 0.5, y: 1.3, w: 4.1, h: 0.38,
    fontSize: 18, bold: true, color: C.white,
    align: "center", charSpacing: 2, margin: 0,
  });
  s.addText("Self-Hosted · Full Control · Single Church", {
    x: 0.5, y: 1.68, w: 4.1, h: 0.25,
    fontSize: 9.5, color: "9BA4C7",
    align: "center", margin: 0,
  });

  const onPremPoints = [
    "Deployed on church's own servers",
    "One-time license fee + annual support",
    "Full data sovereignty",
    "Custom domain & branding",
    "No monthly recurring cost after year 1",
    "Suitable for large/enterprise churches",
    "IT team required for maintenance",
    "Offline capability when needed",
  ];
  onPremPoints.forEach((p, i) => {
    s.addText("✓  " + p, {
      x: 0.6, y: 2.05 + i * 0.36, w: 3.9, h: 0.33,
      fontSize: 10.5, color: i < 4 ? C.green : "9BA4C7",
      bold: i < 4, margin: 0,
    });
  });

  // SaaS column
  roundCard(s, 5.3, 1.18, 4.3, 4.15, "F0EFFF", true);
  s.addShape("roundRect", {
    x: 5.3, y: 1.18, w: 4.3, h: 0.52, rectRadius: 0.08,
    fill: { color: C.purple }, line: { color: C.purple },
  });
  s.addText("SAAS", {
    x: 5.3, y: 1.26, w: 4.3, h: 0.38,
    fontSize: 18, bold: true, color: C.white,
    align: "center", charSpacing: 2, margin: 0,
  });
  s.addText("Cloud-Hosted · Multi-Tenant · Recurring Revenue", {
    x: 5.3, y: 1.74, w: 4.3, h: 0.25,
    fontSize: 9.5, color: C.muted,
    align: "center", margin: 0,
  });

  const saasPoints = [
    "Hosted on our cloud infrastructure",
    "Monthly / annual subscription model",
    "Zero maintenance for the church",
    "Instant onboarding — live in minutes",
    "Module-based licensing (per feature)",
    "Scales from small to mega churches",
    "Built-in Razorpay payment integration",
    "Automatic updates & backups",
  ];
  saasPoints.forEach((p, i) => {
    s.addText("✓  " + p, {
      x: 5.45, y: 2.08 + i * 0.36, w: 3.9, h: 0.33,
      fontSize: 10.5, color: i < 4 ? C.purple : C.muted,
      bold: i < 4, margin: 0,
    });
  });

  // VS badge
  s.addShape("oval", {
    x: 4.63, y: 2.75, w: 0.74, h: 0.74,
    fill: { color: C.green }, line: { color: C.green },
  });
  s.addText("VS", {
    x: 4.63, y: 2.82, w: 0.74, h: 0.5,
    fontSize: 14, bold: true, color: C.dark,
    align: "center", margin: 0,
  });

  s.addNotes(
    "The SaaS model is the primary revenue driver long-term. " +
    "On-Premise is for larger established churches with compliance requirements or data sovereignty needs."
  );
  return s;
}

// SLIDE 7 — ON-PREMISE VALUE PROP
function slide07_onprem(pres) {
  const s = pres.addSlide();
  s.background = { color: C.navy };

  sectionLabel(s, "On-Premise Deployment", 0.5, 0.3);
  s.addText("Built for Churches That Need Full Ownership", {
    x: 0.5, y: 0.52, w: 9, h: 0.6,
    fontSize: 28, bold: true, color: C.white, margin: 0,
  });

  // 3 cards
  const cards = [
    {
      title: "Data Sovereignty",
      body: "All member data, financials, and communications stay on the church's own servers — critical for governments with data localisation laws.",
      icon: "🔒",
    },
    {
      title: "One-Time Investment",
      body: "Pay once, own forever. No ongoing subscription dependency. Annual support contract optional for updates and patches.",
      icon: "💰",
    },
    {
      title: "Custom Integration",
      body: "Direct database access enables deep integration with existing church ERP, accounting systems, or government compliance databases.",
      icon: "🔗",
    },
  ];

  cards.forEach((c, i) => {
    const x = 0.4 + i * 3.2;
    roundCard(s, x, 1.35, 3.0, 2.1, "242E6A", true);
    s.addText(c.icon, {
      x: x + 0.1, y: 1.42, w: 2.8, h: 0.55,
      fontSize: 28, align: "center", margin: 0,
    });
    s.addText(c.title, {
      x: x + 0.1, y: 1.95, w: 2.8, h: 0.38,
      fontSize: 14, bold: true, color: C.green,
      align: "center", margin: 0,
    });
    s.addText(c.body, {
      x: x + 0.14, y: 2.35, w: 2.72, h: 0.85,
      fontSize: 9.5, color: "9BA4C7",
      align: "center", margin: 0,
    });
  });

  // Ideal for
  s.addText("Ideal Customer Profile — On-Premise", {
    x: 0.5, y: 3.6, w: 9, h: 0.32,
    fontSize: 13, bold: true, color: C.white, margin: 0,
  });
  const profiles = [
    "Churches with 500+ active members",
    "Denominational headquarters managing multiple branches",
    "Churches in countries with strict data residency laws",
    "Ministries with existing IT staff or MSP partner",
    "Churches receiving government grants with audit requirements",
  ];
  profiles.forEach((p, i) => {
    const col = i < 3 ? 0 : 1;
    const row = i < 3 ? i : i - 3;
    s.addText("▸  " + p, {
      x: 0.5 + col * 5.0, y: 4.0 + row * 0.32, w: 4.5, h: 0.3,
      fontSize: 10.5, color: "9BA4C7", margin: 0,
    });
  });

  return s;
}

// SLIDE 8 — ON-PREMISE PRICING
function slide08_onprem_pricing(pres) {
  const s = pres.addSlide();
  s.background = { color: C.white };

  sectionLabel(s, "Pricing — On-Premise", 0.5, 0.3);
  s.addText("On-Premise License Pricing", {
    x: 0.5, y: 0.52, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.dark, margin: 0,
  });

  // Tiers
  const tiers = [
    {
      name: "Starter",
      price: "$2,500",
      period: "one-time",
      highlight: false,
      users: "Up to 200 members",
      modules: ["Members & Teams", "Attendance", "Task Management", "Basic Chat", "Prayer Requests"],
      support: "Email support, 1-year updates",
    },
    {
      name: "Professional",
      price: "$6,500",
      period: "one-time",
      highlight: true,
      users: "Up to 1,000 members",
      modules: ["All Starter modules", "Accounting & Payroll", "Counselling", "Baptism & Marriage", "PastorBot AI"],
      support: "Priority support, 2-year updates",
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact us",
      highlight: false,
      users: "Unlimited members",
      modules: ["All Professional modules", "Multi-branch management", "Custom integrations", "Analytics & Reports", "White-labelling"],
      support: "Dedicated support, SLA, unlimited updates",
    },
  ];

  tiers.forEach((t, i) => {
    const x = 0.35 + i * 3.12;
    const bg = t.highlight ? C.purple : C.white;
    const fg = t.highlight ? C.white : C.dark;
    const fgm = t.highlight ? "C0B8FF" : C.muted;

    roundCard(s, x, 1.2, 2.95, 3.95, bg, true);

    if (t.highlight) {
      s.addShape("roundRect", {
        x: x + 0.5, y: 1.08, w: 1.95, h: 0.28, rectRadius: 0.1,
        fill: { color: C.green }, line: { color: C.green },
      });
      s.addText("MOST POPULAR", {
        x: x + 0.5, y: 1.09, w: 1.95, h: 0.26,
        fontSize: 8.5, bold: true, color: C.dark,
        align: "center", margin: 0,
      });
    }

    s.addText(t.name, {
      x: x + 0.1, y: 1.3, w: 2.75, h: 0.38,
      fontSize: 16, bold: true, color: fg,
      align: "center", margin: 0,
    });
    s.addText(t.price, {
      x: x + 0.1, y: 1.66, w: 2.75, h: 0.62,
      fontSize: 34, bold: true, color: t.highlight ? C.green : C.purple,
      align: "center", margin: 0,
    });
    s.addText(t.period, {
      x: x + 0.1, y: 2.25, w: 2.75, h: 0.25,
      fontSize: 10, color: fgm,
      align: "center", margin: 0,
    });
    s.addText(t.users, {
      x: x + 0.1, y: 2.55, w: 2.75, h: 0.25,
      fontSize: 9.5, color: t.highlight ? C.green : C.teal,
      align: "center", bold: true, margin: 0,
    });
    t.modules.forEach((m, j) => {
      s.addText("✓  " + m, {
        x: x + 0.18, y: 2.86 + j * 0.3, w: 2.6, h: 0.28,
        fontSize: 9.5, color: fg, margin: 0,
      });
    });
    s.addText(t.support, {
      x: x + 0.1, y: 4.72, w: 2.75, h: 0.32,
      fontSize: 8.5, color: fgm, align: "center",
      italic: true, margin: 0,
    });
  });

  // Annual support upsell note
  s.addText(
    "Annual Support & Maintenance (optional): 18% of license fee / year — includes all updates, security patches, and priority support.",
    {
      x: 0.4, y: 5.22, w: 9.2, h: 0.3,
      fontSize: 9.5, color: C.muted, italic: true, margin: 0,
    }
  );

  s.addNotes(
    "Professional is the sweet spot. Position Enterprise for denominational HQs. " +
    "Always quote annual support alongside the license — it adds 18% recurring revenue."
  );
  return s;
}

// SLIDE 9 — SAAS VALUE PROP
function slide09_saas(pres) {
  const s = pres.addSlide();
  s.background = { color: "F8F7FF" };

  sectionLabel(s, "SaaS Deployment", 0.5, 0.3);
  s.addText("The Fastest Way to Modernise Any Church", {
    x: 0.5, y: 0.52, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.dark, margin: 0,
  });

  const benefits = [
    {
      title: "Zero Setup",
      body: "Onboard a church in minutes. No servers, no IT team, no infrastructure costs.",
      color: "3B82F6",
    },
    {
      title: "Pay-Per-Feature",
      body: "Churches activate only the modules they need. Start free, upgrade as they grow.",
      color: C.purple,
    },
    {
      title: "Always Up-to-Date",
      body: "Every church gets new features and security patches automatically. No maintenance windows.",
      color: C.teal,
    },
    {
      title: "Scale Infinitely",
      body: "From a 50-member house church to a 10,000-member mega church — same platform, different plan.",
      color: "7C3AED",
    },
    {
      title: "Built-in Payments",
      body: "Razorpay-powered subscription billing. Accept tithes and donations digitally through the app.",
      color: C.green.replace("3E", "0A"),
    },
    {
      title: "Multi-Tenant Ready",
      body: "Denominational networks can onboard hundreds of churches under one platform umbrella.",
      color: "D97706",
    },
  ];

  benefits.forEach((b, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 3.12;
    const y = 1.22 + row * 1.8;
    roundCard(s, x, y, 2.95, 1.6, C.white, true);
    s.addShape("roundRect", {
      x: x + 0.12, y: y + 0.14, w: 0.5, h: 0.5, rectRadius: 0.12,
      fill: { color: b.color }, line: { color: b.color },
    });
    s.addText(b.title, {
      x: x + 0.7, y: y + 0.16, w: 2.15, h: 0.36,
      fontSize: 12, bold: true, color: C.dark, margin: 0,
    });
    s.addText(b.body, {
      x: x + 0.14, y: y + 0.72, w: 2.68, h: 0.72,
      fontSize: 9.5, color: C.muted, margin: 0,
    });
  });

  return s;
}

// SLIDE 10 — SAAS PRICING
function slide10_saas_pricing(pres) {
  const s = pres.addSlide();
  s.background = { color: C.white };

  sectionLabel(s, "Pricing — SaaS Subscription", 0.5, 0.3);
  s.addText("SaaS Subscription Plans", {
    x: 0.5, y: 0.52, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.dark, margin: 0,
  });

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      color: "64748B",
      bg: C.offwh,
      modules: ["Members (up to 50)", "Basic Attendance", "Prayer Requests", "Announcements"],
      cta: "Get Started",
    },
    {
      name: "Essential",
      price: "$29",
      period: "/ month",
      color: C.teal,
      bg: "F0FDFB",
      modules: ["Up to 300 members", "Teams & Tasks", "Chat Messaging", "Resource Library", "Counselling"],
      cta: "Start Trial",
    },
    {
      name: "Professional",
      price: "$79",
      period: "/ month",
      color: C.purple,
      bg: "F5F4FF",
      modules: ["Unlimited members", "Accounting & Payroll", "Analytics Dashboard", "PastorBot AI", "Custom Reports", "Baptism & Marriage"],
      cta: "Most Popular",
      highlight: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "/ month",
      color: C.navy,
      bg: C.offwh,
      modules: ["Multi-branch / tenants", "White-label branding", "Dedicated infra", "SLA guarantee", "Priority onboarding"],
      cta: "Contact Sales",
    },
  ];

  plans.forEach((p, i) => {
    const x = 0.3 + i * 2.35;
    roundCard(s, x, 1.18, 2.22, 4.05, p.bg, true);

    s.addShape("roundRect", {
      x: x, y: 1.18, w: 2.22, h: 0.42, rectRadius: 0.08,
      fill: { color: p.color }, line: { color: p.color },
    });
    s.addText(p.name.toUpperCase(), {
      x: x, y: 1.22, w: 2.22, h: 0.34,
      fontSize: 12, bold: true, color: C.white,
      align: "center", charSpacing: 2, margin: 0,
    });

    s.addText(p.price, {
      x: x + 0.05, y: 1.66, w: 2.12, h: 0.7,
      fontSize: 36, bold: true, color: p.color,
      align: "center", margin: 0,
    });
    s.addText(p.period, {
      x: x + 0.05, y: 2.32, w: 2.12, h: 0.25,
      fontSize: 10, color: C.muted,
      align: "center", margin: 0,
    });

    p.modules.forEach((m, j) => {
      s.addText("✓  " + m, {
        x: x + 0.12, y: 2.68 + j * 0.32, w: 2.0, h: 0.3,
        fontSize: 9.5, color: C.dark, margin: 0,
      });
    });

    const btnColor = p.highlight ? C.purple : p.color;
    roundCard(s, x + 0.22, 4.82, 1.78, 0.32, btnColor, false);
    s.addText(p.cta, {
      x: x + 0.22, y: 4.83, w: 1.78, h: 0.3,
      fontSize: 10, bold: true, color: C.white,
      align: "center", margin: 0,
    });
  });

  s.addText(
    "Add-on modules available à-la-carte from $9/month. Annual billing = 2 months free.",
    {
      x: 0.4, y: 5.3, w: 9.2, h: 0.25,
      fontSize: 9.5, color: C.muted, italic: true, align: "center", margin: 0,
    }
  );

  s.addNotes(
    "Professional at $79/month is the target conversion plan. " +
    "Free plan is the top-of-funnel hook. Enterprise is handled by sales directly."
  );
  return s;
}

// SLIDE 11 — TARGET SEGMENTS
function slide11_segments(pres) {
  const s = pres.addSlide();
  s.background = { color: C.white };

  sectionLabel(s, "Target Segments & ICP", 0.5, 0.3);
  s.addText("Who We Sell To", {
    x: 0.5, y: 0.52, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.dark, margin: 0,
  });

  const segs = [
    {
      title: "Growing Community Churches",
      size: "100–1,000 members",
      model: "SaaS / Essential–Professional",
      pain: "Outgrowing WhatsApp & spreadsheets",
      opp: "High volume, fast conversion, low ACV",
      color: "3B82F6",
    },
    {
      title: "Mega Churches & Denominational HQ",
      size: "1,000–50,000+ members",
      model: "On-Premise / SaaS Enterprise",
      pain: "Need data control & custom workflows",
      opp: "High ACV, long sales cycle, flagship reference",
      color: C.purple,
    },
    {
      title: "Diaspora & Missionary Churches",
      size: "50–500 members, global reach",
      model: "SaaS / Free–Essential",
      pain: "Scattered members, multi-language needs",
      opp: "Viral growth through networks",
      color: C.teal,
    },
    {
      title: "Church Networks & Bible Colleges",
      size: "10–200 affiliated churches",
      model: "SaaS Multi-Tenant / Enterprise",
      pain: "Centralised reporting & oversight",
      opp: "Platform lock-in across entire network",
      color: "D97706",
    },
  ];

  segs.forEach((seg, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.4 + col * 4.85;
    const y = 1.2 + row * 2.1;
    roundCard(s, x, y, 4.65, 1.9, C.offwh, true);
    s.addShape("roundRect", {
      x: x, y: y, w: 4.65, h: 0.38, rectRadius: 0.08,
      fill: { color: seg.color }, line: { color: seg.color },
    });
    s.addText(seg.title, {
      x: x + 0.1, y: y + 0.04, w: 4.45, h: 0.32,
      fontSize: 12, bold: true, color: C.white, margin: 0,
    });
    const fields = [
      { label: "Size", val: seg.size },
      { label: "Model", val: seg.model },
      { label: "Pain", val: seg.pain },
      { label: "Opportunity", val: seg.opp },
    ];
    fields.forEach((f, j) => {
      s.addText(f.label + ":", {
        x: x + 0.12, y: y + 0.48 + j * 0.33, w: 1.0, h: 0.28,
        fontSize: 9.5, bold: true, color: seg.color, margin: 0,
      });
      s.addText(f.val, {
        x: x + 1.12, y: y + 0.48 + j * 0.33, w: 3.4, h: 0.28,
        fontSize: 9.5, color: C.dark, margin: 0,
      });
    });
  });

  return s;
}

// SLIDE 12 — GTM STRATEGY
function slide12_gtm(pres) {
  const s = pres.addSlide();
  s.background = { color: C.navy };

  sectionLabel(s, "Go-to-Market Strategy", 0.5, 0.3);
  s.addText("3-Phase Market Entry", {
    x: 0.5, y: 0.52, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.white, margin: 0,
  });

  const phases = [
    {
      num: "01",
      name: "Seed (Months 1–3)",
      color: C.green,
      actions: [
        "Launch free tier — zero friction onboarding",
        "Target 50 pilot churches across 3 regions",
        "Build case studies from early adopters",
        "Church tech blogger & YouTube partnerships",
        "Attend 2 major denominational conferences",
      ],
      goal: "50 active churches, 10 paid conversions",
    },
    {
      num: "02",
      name: "Grow (Months 4–9)",
      color: C.purple,
      actions: [
        "Activate referral programme — 1 month free per referral",
        "Partner with 5 church planting networks",
        "Launch SaaS Professional with AI upsell",
        "YouTube & podcast content strategy",
        "First On-Premise enterprise closures",
      ],
      goal: "200 paid churches, $15K MRR",
    },
    {
      num: "03",
      name: "Scale (Months 10–18)",
      color: "F59E0B",
      actions: [
        "Reseller network in US, UK, Nigeria, Brazil",
        "Denominational HQ enterprise deals",
        "API marketplace for third-party integrations",
        "Localised versions (Spanish, French, Swahili)",
        "Series A fundraise conversation",
      ],
      goal: "1,000 churches, $80K MRR",
    },
  ];

  phases.forEach((ph, i) => {
    const x = 0.3 + i * 3.22;
    roundCard(s, x, 1.22, 3.06, 3.9, "1E2B5E", true);
    s.addShape("oval", {
      x: x + 1.1, y: 1.28, w: 0.86, h: 0.86,
      fill: { color: ph.color }, line: { color: ph.color },
    });
    s.addText(ph.num, {
      x: x + 1.1, y: 1.34, w: 0.86, h: 0.68,
      fontSize: 22, bold: true, color: C.dark,
      align: "center", margin: 0,
    });
    s.addText(ph.name, {
      x: x + 0.1, y: 2.22, w: 2.86, h: 0.36,
      fontSize: 12, bold: true, color: ph.color,
      align: "center", margin: 0,
    });
    ph.actions.forEach((a, j) => {
      s.addText("▸  " + a, {
        x: x + 0.12, y: 2.64 + j * 0.38, w: 2.82, h: 0.36,
        fontSize: 9.5, color: "9BA4C7", margin: 0,
      });
    });
    roundCard(s, x + 0.1, 4.72, 2.86, 0.3, ph.color, false);
    s.addText("Goal: " + ph.goal, {
      x: x + 0.1, y: 4.73, w: 2.86, h: 0.28,
      fontSize: 9, bold: true, color: C.dark,
      align: "center", margin: 0,
    });
  });

  return s;
}

// SLIDE 13 — SALES CHANNELS
function slide13_channels(pres) {
  const s = pres.addSlide();
  s.background = { color: C.white };

  sectionLabel(s, "Sales Channels", 0.5, 0.3);
  s.addText("How We Reach Churches", {
    x: 0.5, y: 0.52, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.dark, margin: 0,
  });

  const channels = [
    {
      title: "Self-Service / PLG",
      pct: "40%",
      color: "3B82F6",
      items: ["Free tier as top-of-funnel", "In-app upgrade prompts", "Automated email nurture", "Video tutorials & docs"],
    },
    {
      title: "Inside Sales",
      pct: "30%",
      color: C.purple,
      items: ["Inbound trial → paid conversion", "Qualify via church size & needs", "Demo-to-close in < 2 weeks", "Professional & Enterprise target"],
    },
    {
      title: "Channel / Resellers",
      pct: "20%",
      color: C.teal,
      items: ["Church tech consultants", "Regional denominational offices", "Christian bookstore chains", "20–30% reseller margin"],
    },
    {
      title: "Enterprise / Direct",
      pct: "10%",
      color: "D97706",
      items: ["Denominational HQ deals", "Multi-site church networks", "On-Premise deployment focus", "6–12 month sales cycle"],
    },
  ];

  channels.forEach((ch, i) => {
    const x = 0.35 + i * 2.35;
    roundCard(s, x, 1.2, 2.22, 3.9, C.offwh, true);
    s.addShape("roundRect", {
      x: x, y: 1.2, w: 2.22, h: 0.38, rectRadius: 0.08,
      fill: { color: ch.color }, line: { color: ch.color },
    });
    s.addText(ch.title, {
      x: x + 0.05, y: 1.23, w: 2.12, h: 0.32,
      fontSize: 10, bold: true, color: C.white,
      align: "center", margin: 0,
    });
    s.addText(ch.pct, {
      x: x + 0.05, y: 1.65, w: 2.12, h: 0.65,
      fontSize: 42, bold: true, color: ch.color,
      align: "center", margin: 0,
    });
    s.addText("of revenue target", {
      x: x + 0.05, y: 2.28, w: 2.12, h: 0.22,
      fontSize: 8.5, color: C.muted,
      align: "center", margin: 0,
    });
    ch.items.forEach((item, j) => {
      s.addText("▸  " + item, {
        x: x + 0.12, y: 2.6 + j * 0.35, w: 1.98, h: 0.32,
        fontSize: 9.5, color: C.dark, margin: 0,
      });
    });
  });

  // Marketing channels strip
  s.addText("Marketing Channels", {
    x: 0.5, y: 5.12, w: 3, h: 0.28,
    fontSize: 11, bold: true, color: C.dark, margin: 0,
  });
  const mkt = ["YouTube / Podcast", "LinkedIn Ads", "Conference Sponsorships", "Church Tech Forums", "SEO / Content"];
  mkt.forEach((m, i) => {
    roundCard(s, 0.35 + i * 1.88, 5.1, 1.72, 0.3, C.light, false);
    s.addText(m, {
      x: 0.38 + i * 1.88, y: 5.12, w: 1.66, h: 0.26,
      fontSize: 9, color: C.purple, bold: true,
      align: "center", margin: 0,
    });
  });

  return s;
}

// SLIDE 14 — COMPETITIVE LANDSCAPE
function slide14_competitive(pres) {
  const s = pres.addSlide();
  s.background = { color: C.white };

  sectionLabel(s, "Competitive Landscape", 0.5, 0.3);
  s.addText("Where Mahima App Wins", {
    x: 0.5, y: 0.52, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.dark, margin: 0,
  });

  const headers = ["Feature / Capability", "Mahima App", "Planning Center", "Church Community Builder", "Elvanto / Tithely"];
  const colW = [2.6, 1.55, 1.55, 2.05, 1.75];
  const rows = [
    ["Pricing (starting)", "$0 free", "$14/mo", "$40/mo", "$50/mo"],
    ["On-Premise deployment", "✓", "✗", "✗", "✗"],
    ["AI Pastoral Assistant", "✓", "✗", "✗", "✗"],
    ["Built-in Accounting", "✓", "✗", "✗", "Partial"],
    ["Real-time Chat (SignalR)", "✓", "✗", "✗", "✗"],
    ["Baptism & Marriage Mgmt", "✓", "Partial", "✓", "Partial"],
    ["Multi-Tenant / SaaS", "✓", "✓", "✓", "✓"],
    ["Android Mobile App", "✓", "✓", "Partial", "✓"],
    ["Custom Report Builder", "✓", "Partial", "✓", "Partial"],
    ["Global / Multi-Language", "✓", "English only", "English only", "Partial"],
  ];

  const tableData = [
    headers.map((h, i) => ({
      text: h,
      options: {
        fill: { color: i === 1 ? C.purple : C.navy },
        color: C.white,
        bold: true,
        fontSize: 9.5,
        align: "center",
      },
    })),
    ...rows.map((row, ri) =>
      row.map((cell, ci) => {
        const isMahima = ci === 1;
        const isWin = cell === "✓";
        const isLoss = cell === "✗";
        return {
          text: cell,
          options: {
            fill: { color: ri % 2 === 0 ? (isMahima ? "EDE9FF" : "F9F9FF") : (isMahima ? "E0DCFF" : C.white) },
            color: isWin ? (isMahima ? C.purple : "059669") : isLoss ? C.red : C.dark,
            bold: isWin || isLoss,
            fontSize: 9.5,
            align: "center",
          },
        };
      })
    ),
  ];

  s.addTable(tableData, {
    x: 0.35, y: 1.18, w: 9.3,
    colW: colW,
    border: { pt: 0.5, color: "E0E0F0" },
    autoPage: false,
  });

  // Differentiators strip
  s.addText("Mahima App's Unique Differentiators", {
    x: 0.4, y: 4.85, w: 5, h: 0.28,
    fontSize: 11, bold: true, color: C.dark, margin: 0,
  });
  const diffs = ["AI PastorBot", "On-Premise option", "Full Accounting", "Open pricing", "Global languages"];
  diffs.forEach((d, i) => {
    roundCard(s, 0.35 + i * 1.88, 5.15, 1.75, 0.3, C.purple, false);
    s.addText(d, {
      x: 0.37 + i * 1.88, y: 5.17, w: 1.71, h: 0.26,
      fontSize: 9, bold: true, color: C.white,
      align: "center", margin: 0,
    });
  });

  s.addNotes(
    "Planning Center is the main competitor in the US. " +
    "Mahima wins on price, on-premise option, and AI features. " +
    "In emerging markets there are no credible competitors at this price point."
  );
  return s;
}

// SLIDE 15 — REVENUE PROJECTIONS
function slide15_revenue(pres) {
  const s = pres.addSlide();
  s.background = { color: C.white };

  sectionLabel(s, "Revenue Projections", 0.5, 0.3);
  s.addText("3-Year Revenue Plan", {
    x: 0.5, y: 0.52, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.dark, margin: 0,
  });

  // Stat callouts
  const stats = [
    { n: "$180K", l: "Year 1 ARR target" },
    { n: "$720K", l: "Year 2 ARR target" },
    { n: "$2.4M", l: "Year 3 ARR target" },
  ];
  stats.forEach((st, i) => {
    const x = 0.4 + i * 3.1;
    roundCard(s, x, 1.18, 2.9, 1.1, i === 2 ? C.purple : C.offwh, true);
    s.addText(st.n, {
      x: x + 0.1, y: 1.22, w: 2.7, h: 0.72,
      fontSize: 38, bold: true,
      color: i === 2 ? C.green : C.purple,
      align: "center", margin: 0,
    });
    s.addText(st.l, {
      x: x + 0.1, y: 1.9, w: 2.7, h: 0.3,
      fontSize: 10, color: i === 2 ? "C0B8FF" : C.muted,
      align: "center", margin: 0,
    });
  });

  // Revenue mix chart
  s.addChart("bar", [
    {
      name: "SaaS Subscriptions",
      labels: ["Y1", "Y2", "Y3"],
      values: [120000, 520000, 1800000],
    },
    {
      name: "On-Premise Licenses",
      labels: ["Y1", "Y2", "Y3"],
      values: [45000, 140000, 480000],
    },
    {
      name: "Support & Services",
      labels: ["Y1", "Y2", "Y3"],
      values: [15000, 60000, 120000],
    },
  ], {
    x: 0.4, y: 2.45, w: 5.8, h: 2.85,
    barDir: "col",
    barGrouping: "stacked",
    chartColors: [C.purple, C.teal, "D97706"],
    chartArea: { fill: { color: C.white }, roundedCorners: true },
    catAxisLabelColor: C.muted,
    valAxisLabelColor: C.muted,
    valGridLine: { color: "E2E8F0", size: 0.5 },
    catGridLine: { style: "none" },
    showLegend: true,
    legendPos: "b",
    showTitle: false,
  });

  // Assumptions
  s.addText("Key Assumptions", {
    x: 6.45, y: 2.45, w: 3.1, h: 0.3,
    fontSize: 11, bold: true, color: C.dark, margin: 0,
  });
  const assumptions = [
    "SaaS avg. $59/church/month",
    "On-Premise avg. $5,000/deal",
    "5% monthly churn (SaaS)",
    "15% reseller commissions",
    "Y2: Reseller network live",
    "Y3: US & Africa markets mature",
  ];
  assumptions.forEach((a, i) => {
    s.addText("▸  " + a, {
      x: 6.45, y: 2.85 + i * 0.38, w: 3.1, h: 0.34,
      fontSize: 10, color: C.muted, margin: 0,
    });
  });

  return s;
}

// SLIDE 16 — CUSTOMER SUCCESS
function slide16_success(pres) {
  const s = pres.addSlide();
  s.background = { color: "F8F7FF" };

  sectionLabel(s, "Customer Success", 0.5, 0.3);
  s.addText("Onboarding & Retention Journey", {
    x: 0.5, y: 0.52, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.dark, margin: 0,
  });

  const steps = [
    { n: "1", name: "Sign Up", time: "Day 0", desc: "Church admin registers. Free tier active immediately. Welcome email + video walk-through.", color: "3B82F6" },
    { n: "2", name: "Setup",   time: "Day 1–3", desc: "Guided setup: add members, configure teams, enable modules. PastorBot greets all members.", color: C.purple },
    { n: "3", name: "Adopt",   time: "Week 1–4", desc: "Usage milestones trigger in-app upgrade prompts. CS team contacts at day 14.", color: C.teal },
    { n: "4", name: "Upgrade", time: "Month 1–2", desc: "Conversion to paid plan. Unlock Accounting, Payroll, AI. ROI calculator shared.", color: "7C3AED" },
    { n: "5", name: "Expand",  time: "Month 3–6", desc: "Add-on modules. Invite branch churches. Network effect begins.", color: C.green.replace("3E", "0A") },
    { n: "6", name: "Advocate",time: "Month 6+", desc: "Referral programme activated. Case study published. Conference speaking opportunities.", color: "D97706" },
  ];

  steps.forEach((st, i) => {
    const x = 0.35 + i * 1.58;
    roundCard(s, x, 1.22, 1.48, 3.95, C.white, true);
    s.addShape("oval", {
      x: x + 0.44, y: 1.28, w: 0.6, h: 0.6,
      fill: { color: st.color }, line: { color: st.color },
    });
    s.addText(st.n, {
      x: x + 0.44, y: 1.3, w: 0.6, h: 0.55,
      fontSize: 18, bold: true, color: C.white,
      align: "center", margin: 0,
    });
    s.addText(st.name, {
      x: x + 0.06, y: 1.96, w: 1.36, h: 0.3,
      fontSize: 11, bold: true, color: st.color,
      align: "center", margin: 0,
    });
    s.addText(st.time, {
      x: x + 0.06, y: 2.26, w: 1.36, h: 0.24,
      fontSize: 8.5, color: C.muted, italic: true,
      align: "center", margin: 0,
    });
    s.addText(st.desc, {
      x: x + 0.08, y: 2.56, w: 1.32, h: 1.5,
      fontSize: 9, color: C.dark,
      align: "center", margin: 0,
    });
  });

  // KPI strip
  s.addText("Target Metrics", {
    x: 0.4, y: 5.12, w: 2.5, h: 0.28,
    fontSize: 11, bold: true, color: C.dark, margin: 0,
  });
  const kpis = [
    { k: "< 48h", l: "Time to first value" },
    { k: "< 5%", l: "Monthly churn" },
    { k: "> 40%", l: "Free→Paid conversion" },
    { k: "> 120%", l: "Net Revenue Retention" },
  ];
  kpis.forEach((kp, i) => {
    roundCard(s, 0.35 + i * 2.35, 5.12, 2.2, 0.38, C.purple, false);
    s.addText(kp.k + "  ", {
      x: 0.38 + i * 2.35, y: 5.13, w: 1.0, h: 0.34,
      fontSize: 14, bold: true, color: C.green,
      align: "right", margin: 0,
    });
    s.addText(kp.l, {
      x: 1.42 + i * 2.35, y: 5.18, w: 1.08, h: 0.28,
      fontSize: 9, color: "C0B8FF", margin: 0,
    });
  });

  return s;
}

// SLIDE 17 — 90-DAY PLAN
function slide17_90day(pres) {
  const s = pres.addSlide();
  s.background = { color: C.white };

  sectionLabel(s, "Action Plan", 0.5, 0.3);
  s.addText("90-Day Sales Playbook", {
    x: 0.5, y: 0.52, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.dark, margin: 0,
  });

  const months = [
    {
      m: "Month 1",
      sub: "Foundation",
      color: C.purple,
      items: [
        "Finalise pricing & sales collateral",
        "Launch free tier on mahima.app",
        "Reach out to 100 church admins on LinkedIn",
        "Set up CRM (HubSpot / Pipedrive)",
        "Record 3 product demo videos",
        "Submit to 3 church software directories",
      ],
    },
    {
      m: "Month 2",
      sub: "Pipeline Build",
      color: C.teal,
      items: [
        "10 live demo calls with qualified leads",
        "Close first 5 paying SaaS customers",
        "Partner with 2 church planting networks",
        "Publish 2 customer case studies",
        "Launch referral programme",
        "First On-Premise scoping conversation",
      ],
    },
    {
      m: "Month 3",
      sub: "Acceleration",
      color: "D97706",
      items: [
        "25 active paying churches",
        "First enterprise On-Premise deal closed",
        "Reseller agreement with regional partner",
        "Attend 1 church technology conference",
        "Hire first dedicated CS rep",
        "Review & refine ICP based on data",
      ],
    },
  ];

  months.forEach((mo, i) => {
    const x = 0.35 + i * 3.18;
    roundCard(s, x, 1.18, 3.0, 4.1, C.offwh, true);
    s.addShape("roundRect", {
      x: x, y: 1.18, w: 3.0, h: 0.52, rectRadius: 0.08,
      fill: { color: mo.color }, line: { color: mo.color },
    });
    s.addText(mo.m, {
      x: x + 0.1, y: 1.2, w: 2.8, h: 0.28,
      fontSize: 13, bold: true, color: C.white,
      align: "center", margin: 0,
    });
    s.addText(mo.sub.toUpperCase(), {
      x: x + 0.1, y: 1.47, w: 2.8, h: 0.2,
      fontSize: 8, color: "FFFFFF", charSpacing: 2,
      align: "center", margin: 0,
    });
    mo.items.forEach((item, j) => {
      const isKey = j < 2;
      roundCard(s, x + 0.1, 1.82 + j * 0.54, 2.8, 0.46,
        isKey ? (i === 0 ? "EDE9FF" : i === 1 ? "F0FDFB" : "FFFBEB") : C.white, false);
      s.addText((j + 1) + ". " + item, {
        x: x + 0.18, y: 1.86 + j * 0.54, w: 2.64, h: 0.38,
        fontSize: 9.5, color: isKey ? mo.color : C.dark,
        bold: isKey, margin: 0,
      });
    });
  });

  return s;
}

// SLIDE 18 — PARTNERSHIP STRATEGY
function slide18_partners(pres) {
  const s = pres.addSlide();
  s.background = { color: C.navy };

  sectionLabel(s, "Partnership Strategy", 0.5, 0.3);
  s.addText("Ecosystem Partners That Multiply Revenue", {
    x: 0.5, y: 0.52, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.white, margin: 0,
  });

  const partners = [
    {
      type: "Denominational HQ",
      desc: "Partner with denominational headquarters to onboard all affiliated churches at once. Single enterprise deal = 50–500 churches.",
      benefit: "Highest leverage. One deal, massive reach.",
      color: C.purple,
    },
    {
      type: "Church Planting Networks",
      desc: "New churches need ChMS from day one. Partner with planting networks to be the recommended platform for every new church they launch.",
      benefit: "Captive audience at the start of church lifecycle.",
      color: C.teal,
    },
    {
      type: "Christian MSPs / IT Firms",
      desc: "Faith-based IT service providers who set up technology for churches. They become certified Mahima On-Premise resellers.",
      benefit: "Direct pipeline into enterprise on-premise sales.",
      color: "7C3AED",
    },
    {
      type: "Bible Colleges & Seminaries",
      desc: "Students are tomorrow's pastors. Offer free SaaS to all enrolled Bible colleges. Graduate students carry Mahima to their churches.",
      benefit: "Long-term brand loyalty, zero CAC growth engine.",
      color: "D97706",
    },
    {
      type: "Giving & Donor Platforms",
      desc: "Integrate with existing giving platforms (Tithe.ly, Pushpay, PhonePe) to add value and earn integration referral fees.",
      benefit: "Feature complement — not a competitor.",
      color: "059669",
    },
    {
      type: "Christian Media & Events",
      desc: "Sponsor church leadership conferences. Partner with Christian radio, podcast, and YouTube influencers for sponsored content.",
      benefit: "Lowest CAC channel for growing community churches.",
      color: "DC2626",
    },
  ];

  partners.forEach((p, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.35 + col * 3.18;
    const y = 1.22 + row * 2.08;
    roundCard(s, x, y, 3.0, 1.9, "1E2B5E", true);
    s.addShape("roundRect", {
      x: x + 0.1, y: y + 0.1, w: 2.8, h: 0.32, rectRadius: 0.06,
      fill: { color: p.color }, line: { color: p.color },
    });
    s.addText(p.type, {
      x: x + 0.1, y: y + 0.12, w: 2.8, h: 0.28,
      fontSize: 10, bold: true, color: C.white,
      align: "center", margin: 0,
    });
    s.addText(p.desc, {
      x: x + 0.12, y: y + 0.52, w: 2.76, h: 0.78,
      fontSize: 9, color: "9BA4C7", margin: 0,
    });
    s.addText("→ " + p.benefit, {
      x: x + 0.12, y: y + 1.38, w: 2.76, h: 0.38,
      fontSize: 9, color: p.color, bold: true, margin: 0,
    });
  });

  return s;
}

// SLIDE 19 — KPIS
function slide19_kpis(pres) {
  const s = pres.addSlide();
  s.background = { color: C.white };

  sectionLabel(s, "KPIs & Success Metrics", 0.5, 0.3);
  s.addText("How We Measure Success", {
    x: 0.5, y: 0.52, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.dark, margin: 0,
  });

  const kpiGroups = [
    {
      cat: "Acquisition",
      color: "3B82F6",
      kpis: [
        { name: "Monthly Signups", y1: "100", y2: "400", y3: "1,000" },
        { name: "Free→Paid Conversion", y1: "20%", y2: "35%", y3: "40%" },
        { name: "CAC (SaaS)", y1: "$120", y2: "$80", y3: "$50" },
        { name: "Time to First Value", y1: "< 48h", y2: "< 24h", y3: "< 12h" },
      ],
    },
    {
      cat: "Revenue",
      color: C.purple,
      kpis: [
        { name: "MRR", y1: "$15K", y2: "$60K", y3: "$200K" },
        { name: "ARR", y1: "$180K", y2: "$720K", y3: "$2.4M" },
        { name: "ARPU (SaaS)", y1: "$45", y2: "$59", y3: "$72" },
        { name: "On-Prem Revenue", y1: "$45K", y2: "$140K", y3: "$480K" },
      ],
    },
    {
      cat: "Retention",
      color: C.teal,
      kpis: [
        { name: "Monthly Churn", y1: "< 8%", y2: "< 5%", y3: "< 3%" },
        { name: "NPS Score", y1: "> 40", y2: "> 55", y3: "> 65" },
        { name: "Net Revenue Retention", y1: "105%", y2: "115%", y3: "125%" },
        { name: "Support CSAT", y1: "> 80%", y2: "> 88%", y3: "> 92%" },
      ],
    },
  ];

  kpiGroups.forEach((grp, gi) => {
    const x = 0.35 + gi * 3.18;
    roundCard(s, x, 1.18, 3.0, 4.05, C.offwh, true);
    s.addShape("roundRect", {
      x: x, y: 1.18, w: 3.0, h: 0.38, rectRadius: 0.08,
      fill: { color: grp.color }, line: { color: grp.color },
    });
    s.addText(grp.cat.toUpperCase(), {
      x: x + 0.05, y: 1.2, w: 2.9, h: 0.32,
      fontSize: 12, bold: true, color: C.white,
      align: "center", charSpacing: 2, margin: 0,
    });

    // Sub-headers
    ["Metric", "Y1", "Y2", "Y3"].forEach((h, j) => {
      s.addText(h, {
        x: x + [0.08, 1.65, 2.15, 2.62][j],
        y: 1.66,
        w: [1.5, 0.5, 0.5, 0.5][j],
        h: 0.28,
        fontSize: 8.5, bold: true, color: grp.color,
        align: j === 0 ? "left" : "center", margin: 0,
      });
    });

    grp.kpis.forEach((kpi, ki) => {
      const ky = 2.02 + ki * 0.72;
      const bg = ki % 2 === 0 ? C.white : C.offwh;
      roundCard(s, x + 0.04, ky, 2.92, 0.64, bg, false);
      s.addText(kpi.name, {
        x: x + 0.1, y: ky + 0.06, w: 1.55, h: 0.52,
        fontSize: 9.5, color: C.dark, margin: 0,
      });
      [kpi.y1, kpi.y2, kpi.y3].forEach((v, vi) => {
        s.addText(v, {
          x: x + [1.65, 2.12, 2.59][vi], y: ky + 0.14, w: 0.48, h: 0.36,
          fontSize: 10, bold: true, color: grp.color,
          align: "center", margin: 0,
        });
      });
    });
  });

  return s;
}

// SLIDE 20 — CLOSE
function slide20_close(pres) {
  const s = pres.addSlide();
  s.background = { color: C.navy };

  s.addShape("oval", {
    x: -1.0, y: 3.2, w: 6.0, h: 6.0,
    fill: { color: C.purple, transparency: 85 },
    line: { color: C.purple, transparency: 85 },
  });
  s.addShape("oval", {
    x: 7.0, y: -0.5, w: 4.5, h: 4.5,
    fill: { color: C.green, transparency: 88 },
    line: { color: C.green, transparency: 88 },
  });

  s.addText("Ready to Transform", {
    x: 0.6, y: 0.9, w: 9, h: 0.7,
    fontSize: 40, bold: true, color: C.white,
    margin: 0, align: "center",
  });
  s.addText("Your Ministry?", {
    x: 0.6, y: 1.56, w: 9, h: 0.7,
    fontSize: 40, bold: true, color: C.green,
    margin: 0, align: "center",
  });

  s.addText(
    "Mahima App — the complete Church Management System for the global church.\n" +
    "On-Premise for control. SaaS for speed. AI for connection.",
    {
      x: 1.0, y: 2.42, w: 8, h: 0.65,
      fontSize: 12.5, color: "9BA4C7",
      align: "center", margin: 0,
    }
  );

  // CTA buttons
  const ctas = [
    { t: "Start Free Trial", bg: C.purple },
    { t: "Book a Demo",      bg: C.green  },
    { t: "Contact Sales",    bg: "1E2B5E" },
  ];
  ctas.forEach((cta, i) => {
    const x = 1.5 + i * 2.55;
    roundCard(s, x, 3.28, 2.25, 0.5, cta.bg, false);
    s.addText(cta.t, {
      x: x, y: 3.3, w: 2.25, h: 0.46,
      fontSize: 12, bold: true,
      color: cta.bg === C.green ? C.dark : C.white,
      align: "center", margin: 0,
    });
  });

  // Contact info
  const contacts = [
    { label: "Website",  val: "mahima.app" },
    { label: "Email",    val: "sales@mahima.app" },
    { label: "LinkedIn", val: "linkedin.com/company/mahima-app" },
  ];
  contacts.forEach((c, i) => {
    s.addText(c.label + ": ", {
      x: 1.0 + i * 2.75, y: 4.65, w: 1.0, h: 0.28,
      fontSize: 9.5, bold: true, color: "9BA4C7", margin: 0,
    });
    s.addText(c.val, {
      x: 1.8 + i * 2.75, y: 4.65, w: 2.0, h: 0.28,
      fontSize: 9.5, color: C.green, margin: 0,
    });
  });

  s.addText("Mahima App — Version 4.0  ·  Single-Tenancy & Multi-Tenant SaaS", {
    x: 1.0, y: 5.18, w: 8, h: 0.25,
    fontSize: 8.5, color: "3D4B7A",
    align: "center", margin: 0,
  });

  s.addNotes(
    "Close with a specific ask: 'Can we schedule a 30-minute demo this week?' " +
    "or 'Would you like me to set up your free account right now?'"
  );
  return s;
}

// ─── MAIN ────────────────────────────────────────────────────
async function main() {
  console.log("Building Mahima App Sales Plan deck...");

  const pres = new pptxgen();
  pres.layout  = "LAYOUT_16x9";
  pres.author  = "Mahima App Sales Team";
  pres.title   = "Mahima App – Global Sales Plan 2026";
  pres.subject = "Church Management System – On-Premise & SaaS";

  slide01_cover(pres);
  slide02_agenda(pres);
  slide03_market(pres);
  slide04_product(pres);
  slide05_modules(pres);
  slide06_deployment(pres);
  slide07_onprem(pres);
  slide08_onprem_pricing(pres);
  slide09_saas(pres);
  slide10_saas_pricing(pres);
  slide11_segments(pres);
  slide12_gtm(pres);
  slide13_channels(pres);
  slide14_competitive(pres);
  slide15_revenue(pres);
  slide16_success(pres);
  slide17_90day(pres);
  slide18_partners(pres);
  slide19_kpis(pres);
  slide20_close(pres);

  const outFile = path.join(__dirname, "Mahima_App_Sales_Plan_2026.pptx");
  await pres.writeFile({ fileName: outFile });
  console.log("Done! Saved to:", outFile);
  console.log("Slides: 20");
}

main().catch(err => { console.error(err); process.exit(1); });
