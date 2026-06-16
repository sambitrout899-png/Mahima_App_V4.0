/**
 * Mahima Pricing Deck Builder
 * Run: npm install pptxgenjs  →  node build_pricing_ppt.js
 * Output: Mahima_Pricing_Guide_India_2026.pptx (same folder)
 */

const pptxgen = require("pptxgenjs");
const pres = new pptxgen();
pres.layout  = "LAYOUT_16x9";
pres.title   = "Mahima – Pricing & Costing Guide India 2026";
pres.author  = "Mahima Team";
pres.subject = "Pricing";

// ── PALETTE ─────────────────────────────────────────────────────
const C = {
  navy:    "1A3C6E",
  orange:  "E8701A",
  purple:  "6B3FA0",
  green:   "2D8C4E",
  red:     "C0392B",
  light:   "EBF1F9",
  lavend:  "F0EBF8",
  white:   "FFFFFF",
  offwht:  "F8F9FB",
  grey:    "F2F2F2",
  dark:    "1A1A1A",
  mid:     "555555",
  muted:   "888888",
};

// Shadow factory – must be fresh object every call (pptxgenjs mutates in place)
const mkShadow = () => ({ type: "outer", color: "000000", blur: 5, offset: 2, angle: 135, opacity: 0.10 });

// ── SLIDE HELPERS ────────────────────────────────────────────────
function bg(slide, color) { slide.background = { color }; }

/** Full-width title bar at top of slide */
function titleBar(slide, text, barColor = C.navy, textColor = C.white) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 0.72,
    fill: { color: barColor }, line: { color: barColor }
  });
  slide.addText(text, {
    x: 0.35, y: 0, w: 9.3, h: 0.72,
    fontSize: 22, bold: true, color: textColor,
    valign: "middle", fontFace: "Calibri", margin: 0
  });
}

/** Small section label pill */
function pill(slide, text, x, y, color = C.orange) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w: text.length * 0.095 + 0.2, h: 0.25,
    fill: { color }, line: { color }, rectRadius: 0.04
  });
  slide.addText(text, {
    x, y, w: text.length * 0.095 + 0.2, h: 0.25,
    fontSize: 8, bold: true, color: C.white,
    align: "center", valign: "middle", fontFace: "Calibri", margin: 0
  });
}

/** Card background rectangle */
function card(slide, x, y, w, h, fillColor = C.white, lineColor = "DDDDDD") {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: fillColor },
    line: { color: lineColor, width: 1 },
    shadow: mkShadow()
  });
}

/** Standard body text */
function body(slide, text, x, y, w, h, opts = {}) {
  const { size = 13, color = C.dark, bold = false, align = "left", italic = false } = opts;
  slide.addText(text, {
    x, y, w, h,
    fontSize: size, color, bold, align, italic,
    valign: "top", fontFace: "Calibri", wrap: true
  });
}

/** Bullet list */
function bullets(slide, items, x, y, w, h, size = 12) {
  slide.addText(
    items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1 } })),
    { x, y, w, h, fontSize: size, color: C.dark, fontFace: "Calibri", paraSpaceAfter: 4 }
  );
}

/** Metric callout: big number + label */
function metric(slide, value, label, x, y, valColor = C.orange) {
  slide.addText(value, { x, y,       w: 2.1, h: 0.65, fontSize: 32, bold: true, color: valColor, align: "center", valign: "bottom", fontFace: "Calibri" });
  slide.addText(label, { x, y: y + 0.62, w: 2.1, h: 0.28, fontSize: 10, color: C.mid, align: "center", fontFace: "Calibri" });
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 1 — COVER
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s, C.navy);

  // Orange accent strip left
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.22, h: 5.625, fill: { color: C.orange }, line: { color: C.orange } });

  // Title
  s.addText("MAHIMA", {
    x: 0.55, y: 1.1, w: 6.5, h: 1.15,
    fontSize: 72, bold: true, color: C.white,
    fontFace: "Calibri", charSpacing: 8
  });
  s.addText("Church Management Platform", {
    x: 0.55, y: 2.2, w: 7, h: 0.55,
    fontSize: 24, bold: false, color: C.orange,
    fontFace: "Calibri"
  });
  s.addText("Pricing & Costing Guide  |  India  |  June 2026", {
    x: 0.55, y: 2.82, w: 7.5, h: 0.38,
    fontSize: 14, color: "AABFDD", fontFace: "Calibri", italic: true
  });

  // Version badge
  s.addShape(pres.shapes.RECTANGLE, { x: 0.55, y: 3.38, w: 2.9, h: 0.35, fill: { color: C.orange }, line: { color: C.orange } });
  s.addText("v2.0 · SaaS & On-Premise Editions", {
    x: 0.55, y: 3.38, w: 2.9, h: 0.35,
    fontSize: 10, bold: true, color: C.white,
    align: "center", valign: "middle", fontFace: "Calibri", margin: 0
  });

  // Right side tagline
  s.addText([
    { text: "Built with prayer,", options: { breakLine: true } },
    { text: "designed for purpose." }
  ], {
    x: 6.8, y: 4.5, w: 3, h: 0.8,
    fontSize: 12, color: "7799BB", italic: true,
    align: "right", fontFace: "Calibri"
  });
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 2 — WHAT IS MAHIMA
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s, C.white);
  titleBar(s, "What is Mahima?");

  body(s, "A cloud-based, multi-tenant Church Management Platform built for Indian churches of all sizes.", 0.35, 0.88, 9.3, 0.5, { size: 14 });

  // Left column — capabilities
  card(s, 0.35, 1.52, 4.5, 3.75, C.offwht);
  s.addText("Key Capabilities", { x: 0.55, y: 1.65, w: 4.1, h: 0.32, fontSize: 13, bold: true, color: C.navy, fontFace: "Calibri" });
  bullets(s, [
    "Member directory (Aadhaar, marital, baptism records)",
    "Attendance, Events & Meetings (RSVP, geo-location)",
    "Prayer requests, Counselling case management",
    "Marriage workflow & Baptism certificate (PDF)",
    "Real-time chat + bulk SMS / email (Twilio, MailKit)",
    "Accounting, Expenses & Staff Payroll",
    "PastorBot AI — multilingual spiritual Q&A",
    "Ministry Automation (Daily Word, Night Prayer …)",
    "Multi-language UI, RBAC, Audit log",
  ], 0.55, 2.02, 4.1, 3.1, 11);

  // Right column — delivery models
  card(s, 5.15, 1.52, 4.5, 1.7, C.light);
  s.addText("☁️  SaaS (Cloud)", { x: 5.35, y: 1.65, w: 4.1, h: 0.3, fontSize: 13, bold: true, color: C.navy, fontFace: "Calibri" });
  bullets(s, [
    "Hosted by Mahima · monthly or annual billing",
    "Zero infrastructure overhead · auto-updates",
  ], 5.35, 2.0, 4.1, 0.9, 11);

  card(s, 5.15, 3.38, 4.5, 1.7, C.lavend);
  s.addText("🖥️  On-Premise", { x: 5.35, y: 3.52, w: 4.1, h: 0.3, fontSize: 13, bold: true, color: C.purple, fontFace: "Calibri" });
  bullets(s, [
    "Installed on church's own server",
    "One-time perpetual licence + annual AMC",
    "Full data sovereignty",
  ], 5.35, 3.88, 4.1, 1.1, 11);
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 3 — SAAS PLANS OVERVIEW (4 cards)
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s, C.offwht);
  titleBar(s, "SaaS Subscription Plans");

  pill(s, "CLOUD", 0.35, 0.82);

  const plans = [
    { name: "STARTER",      sub: "≤ 200 members",   price: "₹ 1,499", annual: "₹ 14,390 / yr",  seats: "1 Admin  ·  2 Staff  ·  5 Volunteers", tag: null,           col: C.navy },
    { name: "GROWTH",       sub: "≤ 1,000 members",  price: "₹ 3,799", annual: "₹ 36,470 / yr",  seats: "2 Admin  ·  8 Staff  ·  20 Volunteers", tag: "MOST POPULAR", col: C.orange },
    { name: "CHURCH PLUS",  sub: "≤ 5,000 members",  price: "₹ 7,499", annual: "₹ 71,990 / yr",  seats: "5 Admin  ·  20 Staff  ·  Unlimited Vol.", tag: null,          col: C.navy },
    { name: "ENTERPRISE",   sub: "Multi-campus",     price: "Custom",   annual: "Contact us",      seats: "Unlimited all roles",                   tag: null,           col: C.mid  },
  ];

  plans.forEach((p, i) => {
    const x = 0.28 + i * 2.37;
    const isHighlight = p.tag !== null;

    // Card
    card(s, x, 1.1, 2.22, 4.22, C.white, isHighlight ? C.orange : "DDDDDD");

    // Coloured top bar
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.1, w: 2.22, h: 0.38, fill: { color: p.col }, line: { color: p.col } });
    s.addText(p.name, { x, y: 1.1, w: 2.22, h: 0.38, fontSize: 11, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });

    if (p.tag) {
      s.addShape(pres.shapes.RECTANGLE, { x: x + 0.35, y: 0.9, w: 1.52, h: 0.22, fill: { color: C.orange }, line: { color: C.orange } });
      s.addText(p.tag, { x: x + 0.35, y: 0.9, w: 1.52, h: 0.22, fontSize: 8, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
    }

    // Sub
    s.addText(p.sub, { x, y: 1.52, w: 2.22, h: 0.25, fontSize: 9, color: C.muted, align: "center", fontFace: "Calibri" });

    // Price
    s.addText(p.price, { x, y: 1.8, w: 2.22, h: 0.58, fontSize: p.price === "Custom" ? 22 : 26, bold: true, color: C.orange, align: "center", valign: "middle", fontFace: "Calibri" });
    s.addText("/month", { x, y: 2.36, w: 2.22, h: 0.22, fontSize: 9, color: C.muted, align: "center", fontFace: "Calibri" });

    // Annual
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.1, y: 2.62, w: 2.02, h: 0.25, fill: { color: C.light }, line: { color: C.light } });
    s.addText(p.annual + " (20% off)", { x: x + 0.1, y: 2.62, w: 2.02, h: 0.25, fontSize: 8, color: C.green, bold: true, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });

    // Seats
    s.addText(p.seats, { x: x + 0.08, y: 3.0, w: 2.06, h: 0.45, fontSize: 9, color: C.dark, align: "center", fontFace: "Calibri" });

    // Members FREE
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.1, y: 3.5, w: 2.02, h: 0.26, fill: { color: "E8F5EE" }, line: { color: "C8E6C9" } });
    s.addText("Members: FREE", { x: x + 0.1, y: 3.5, w: 2.02, h: 0.26, fontSize: 10, bold: true, color: C.green, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });

    // Note
    s.addText(i === 0 ? "Core modules" : i === 1 ? "Core + Advanced" : i === 2 ? "All modules" : "All + custom branding",
      { x, y: 3.85, w: 2.22, h: 0.22, fontSize: 8.5, color: C.muted, align: "center", fontFace: "Calibri" });
  });

  // Footer note
  s.addText("All prices in INR, excl. 18% GST. Annual billing = 20% off base plan.", {
    x: 0.35, y: 5.28, w: 9.3, h: 0.22, fontSize: 9, color: C.muted, italic: true, fontFace: "Calibri"
  });
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 4 — PER-USER PRICING
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s, C.white);
  titleBar(s, "Per-User Pricing (SaaS)");

  body(s, "Each plan includes base seats. Additional seats below. Members (congregation) are always FREE.", 0.35, 0.82, 9.3, 0.36, { size: 12, color: C.mid });

  const rows = [
    [{ text: "User Role", options: { bold: true, fill: { color: C.navy }, color: C.white } },
     { text: "Starter",      options: { bold: true, fill: { color: C.navy }, color: C.white, align: "center" } },
     { text: "Growth",       options: { bold: true, fill: { color: C.navy }, color: C.white, align: "center" } },
     { text: "Church Plus",  options: { bold: true, fill: { color: C.navy }, color: C.white, align: "center" } },
     { text: "Enterprise",   options: { bold: true, fill: { color: C.navy }, color: C.white, align: "center" } }],

    ["Admin — included seats",
     { text: "1 included",    options: { align: "center" } },
     { text: "2 included",    options: { align: "center" } },
     { text: "5 included",    options: { align: "center" } },
     { text: "Unlimited",     options: { align: "center" } }],

    [{ text: "Additional Admin (per seat/mo)", options: { bold: true } },
     { text: "₹ 449",  options: { bold: true, color: C.orange, align: "center" } },
     { text: "₹ 374",  options: { bold: true, color: C.orange, align: "center" } },
     { text: "₹ 299",  options: { bold: true, color: C.orange, align: "center" } },
     { text: "Included", options: { bold: true, color: C.green, align: "center" } }],

    ["Staff — included seats",
     { text: "2 included",    options: { align: "center" } },
     { text: "8 included",    options: { align: "center" } },
     { text: "20 included",   options: { align: "center" } },
     { text: "Unlimited",     options: { align: "center" } }],

    [{ text: "Additional Staff (per seat/mo)", options: { bold: true } },
     { text: "₹ 229",  options: { bold: true, color: C.orange, align: "center" } },
     { text: "₹ 199",  options: { bold: true, color: C.orange, align: "center" } },
     { text: "₹ 149",  options: { bold: true, color: C.orange, align: "center" } },
     { text: "Included", options: { bold: true, color: C.green, align: "center" } }],

    ["Volunteer — included seats",
     { text: "5 included",    options: { align: "center" } },
     { text: "20 included",   options: { align: "center" } },
     { text: "Unlimited",     options: { align: "center" } },
     { text: "Unlimited",     options: { align: "center" } }],

    [{ text: "Additional Volunteer (per seat/mo)", options: { bold: true } },
     { text: "₹ 74",   options: { bold: true, color: C.orange, align: "center" } },
     { text: "₹ 59",   options: { bold: true, color: C.orange, align: "center" } },
     { text: "Included", options: { bold: true, color: C.green, align: "center" } },
     { text: "Included", options: { bold: true, color: C.green, align: "center" } }],

    [{ text: "Member (congregation)", options: { bold: true } },
     { text: "FREE", options: { bold: true, color: C.green, align: "center" } },
     { text: "FREE", options: { bold: true, color: C.green, align: "center" } },
     { text: "FREE", options: { bold: true, color: C.green, align: "center" } },
     { text: "FREE", options: { bold: true, color: C.green, align: "center" } }],
  ];

  s.addTable(rows, {
    x: 0.35, y: 1.22, w: 9.3, h: 4.0,
    colW: [3.2, 1.52, 1.52, 1.52, 1.52],
    border: { pt: 0.5, color: "DDDDDD" },
    autoPage: false,
    fontFace: "Calibri",
    fontSize: 11,
    align: "left",
    valign: "middle",
    rowH: 0.42,
  });
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 5 — MODULE AVAILABILITY
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s, C.white);
  titleBar(s, "Module Availability by Plan");

  const Y = (i) => ({ bold: true, color: C.green, align: "center" });
  const N = ()   => ({ color: "BBBBBB", align: "center" });
  const A = ()   => ({ color: C.orange, italic: true, align: "center" });  // Add-on

  const hdr = { fill: { color: C.navy }, color: C.white, bold: true, align: "center" };
  const hdrL = { fill: { color: C.navy }, color: C.white, bold: true };
  const grpHdr = { fill: { color: C.light }, color: C.navy, bold: true, colspan: 5 };

  const rows = [
    [{ text: "Module / Feature", options: hdrL },
     { text: "Starter",     options: hdr },
     { text: "Growth",      options: hdr },
     { text: "Church Plus", options: hdr },
     { text: "Enterprise",  options: hdr }],

    [{ text: "CORE — All Plans", options: grpHdr }],
    ["Member Profiles & Directory",
     { text: "✓", options: Y() }, { text: "✓", options: Y() }, { text: "✓", options: Y() }, { text: "✓", options: Y() }],
    ["Attendance, Events, Prayer Requests, Sermons",
     { text: "✓", options: Y() }, { text: "✓", options: Y() }, { text: "✓", options: Y() }, { text: "✓", options: Y() }],
    ["Roles, Permissions, Audit Log, Multi-language",
     { text: "✓", options: Y() }, { text: "✓", options: Y() }, { text: "✓", options: Y() }, { text: "✓", options: Y() }],

    [{ text: "ADVANCED — Growth and above", options: grpHdr }],
    ["Chat, Counselling, Marriage, Baptism PDF",
     { text: "Add-on", options: A() }, { text: "✓", options: Y() }, { text: "✓", options: Y() }, { text: "✓", options: Y() }],
    ["Accounting, Payroll, Expenses, Google Drive",
     { text: "Add-on", options: A() }, { text: "✓", options: Y() }, { text: "✓", options: Y() }, { text: "✓", options: Y() }],

    [{ text: "PREMIUM — Church Plus and above", options: grpHdr }],
    ["PastorBot AI (Multilingual Q&A)",
     { text: "Add-on", options: A() }, { text: "Add-on", options: A() }, { text: "✓", options: Y() }, { text: "✓", options: Y() }],
    ["Ministry Automation (Daily Word, Prayer …)",
     { text: "Add-on", options: A() }, { text: "Add-on", options: A() }, { text: "✓", options: Y() }, { text: "✓", options: Y() }],
    ["Analytics Dashboards, Priority Support",
     { text: "—", options: N() }, { text: "—", options: N() }, { text: "✓", options: Y() }, { text: "✓", options: Y() }],

    [{ text: "ENTERPRISE only", options: grpHdr }],
    ["Custom Domain, Multi-campus, Account Manager",
     { text: "—", options: N() }, { text: "—", options: N() }, { text: "—", options: N() }, { text: "✓", options: Y() }],
  ];

  s.addTable(rows, {
    x: 0.35, y: 0.84, w: 9.3, h: 4.6,
    colW: [4.0, 1.32, 1.32, 1.32, 1.32],
    border: { pt: 0.5, color: "E0E0E0" },
    fontFace: "Calibri",
    fontSize: 10.5,
    valign: "middle",
    rowH: 0.31,
  });
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 6 — ADD-ONS & DISCOUNTS
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s, C.offwht);
  titleBar(s, "SaaS Add-ons & Discounts");

  const addons = [
    { name: "PastorBot AI",          price: "₹ 1,499/mo",  note: "Add-on on Starter & Growth\nIncluded from Church Plus" },
    { name: "Ministry Automation",   price: "₹ 749/mo",    note: "WhatsApp/SMS automation\n+ Twilio message costs*" },
    { name: "Accounting Module",     price: "₹ 749/mo",    note: "Add-on on Starter only\nIncluded from Growth up" },
    { name: "Payroll Module",        price: "₹ 449/mo",    note: "Add-on on Starter only\nIncluded from Growth up" },
    { name: "Extra Storage (Drive)", price: "₹ 299/mo",    note: "Available on all plans" },
  ];

  addons.forEach((a, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.35 + col * 3.15;
    const y = 0.92 + row * 1.72;

    card(s, x, y, 3.0, 1.55, C.white);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.16, h: 1.55, fill: { color: C.orange }, line: { color: C.orange } });
    s.addText(a.name, { x: x + 0.25, y: y + 0.1, w: 2.65, h: 0.32, fontSize: 12, bold: true, color: C.navy, fontFace: "Calibri" });
    s.addText(a.price, { x: x + 0.25, y: y + 0.43, w: 2.65, h: 0.32, fontSize: 18, bold: true, color: C.orange, fontFace: "Calibri" });
    s.addText(a.note, { x: x + 0.25, y: y + 0.78, w: 2.65, h: 0.68, fontSize: 9, color: C.mid, fontFace: "Calibri", wrap: true });
  });

  // Discount boxes
  const dx = 0.35 + 2 * 3.15;
  const dy = 0.92;

  card(s, dx, dy, 3.0, 1.55, "E8F5EE", "B2DFDB");
  s.addShape(pres.shapes.RECTANGLE, { x: dx, y: dy, w: 0.16, h: 1.55, fill: { color: C.green }, line: { color: C.green } });
  s.addText("Annual Billing", { x: dx + 0.25, y: dy + 0.1, w: 2.65, h: 0.32, fontSize: 12, bold: true, color: C.navy, fontFace: "Calibri" });
  s.addText("−20% off", { x: dx + 0.25, y: dy + 0.43, w: 2.65, h: 0.32, fontSize: 22, bold: true, color: C.green, fontFace: "Calibri" });
  s.addText("Base plan price billed\nupfront for 12 months", { x: dx + 0.25, y: dy + 0.78, w: 2.65, h: 0.68, fontSize: 9, color: C.mid, fontFace: "Calibri", wrap: true });

  const dy2 = 0.92 + 1.72;
  card(s, dx, dy2, 3.0, 1.55, "EEF2FF", "C7D2FE");
  s.addShape(pres.shapes.RECTANGLE, { x: dx, y: dy2, w: 0.16, h: 1.55, fill: { color: "4F46E5" }, line: { color: "4F46E5" } });
  s.addText("NGO / Mission Discount", { x: dx + 0.25, y: dy2 + 0.1, w: 2.65, h: 0.32, fontSize: 12, bold: true, color: C.navy, fontFace: "Calibri" });
  s.addText("−30% off", { x: dx + 0.25, y: dy2 + 0.43, w: 2.65, h: 0.32, fontSize: 22, bold: true, color: "4F46E5", fontFace: "Calibri" });
  s.addText("Valid 12A / 80G certificate\nrequired", { x: dx + 0.25, y: dy2 + 0.78, w: 2.65, h: 0.68, fontSize: 9, color: C.mid, fontFace: "Calibri", wrap: true });

  s.addText("* Twilio message costs ~₹ 0.35 – ₹ 0.80/message billed directly by Twilio. Mahima does not mark up messaging.", {
    x: 0.35, y: 5.3, w: 9.3, h: 0.22, fontSize: 9, color: C.muted, italic: true, fontFace: "Calibri"
  });
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 7 — SAAS COST SCENARIOS
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s, C.white);
  titleBar(s, "SaaS — Sample Cost Scenarios");

  const scen = [
    { title: "Small Church · 80 members",     plan: "STARTER",      cost: "₹ 1,499/mo",   annual: "₹ 14,390/yr (annual)", note: "1 Admin + 2 Staff + 5 Vol — all included in base plan" },
    { title: "Growing Church · 350 members",  plan: "GROWTH",       cost: "₹ 4,492/mo",   annual: "≈ ₹ 43,123/yr",        note: "₹3,799 + 2 extra Staff×₹199 + 5 extra Vol×₹59" },
    { title: "Large Church · 2,000 members",  plan: "CHURCH PLUS",  cost: "₹ 8,989/mo",   annual: "≈ ₹ 86,294/yr",        note: "₹7,499 + 10 extra Staff×₹149 · PastorBot included" },
    { title: "Denomination · 5 campuses",     plan: "ENTERPRISE",   cost: "Custom",        annual: "Contact sales",         note: "Custom domain, multi-campus, dedicated account manager" },
  ];

  scen.forEach((sc, i) => {
    const x = 0.28 + i * 2.37;
    card(s, x, 0.92, 2.22, 4.42, C.white, C.light);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 0.92, w: 2.22, h: 0.3, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(sc.plan, { x, y: 0.92, w: 2.22, h: 0.3, fontSize: 9, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
    s.addText(sc.title, { x: x + 0.1, y: 1.3, w: 2.02, h: 0.52, fontSize: 11, bold: true, color: C.navy, fontFace: "Calibri", wrap: true });
    s.addText(sc.cost, { x: x + 0.1, y: 1.88, w: 2.02, h: 0.52, fontSize: sc.cost === "Custom" ? 20 : 22, bold: true, color: C.orange, fontFace: "Calibri" });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.1, y: 2.45, w: 2.02, h: 0.28, fill: { color: C.light }, line: { color: C.light } });
    s.addText(sc.annual, { x: x + 0.1, y: 2.45, w: 2.02, h: 0.28, fontSize: 9, color: C.green, bold: true, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
    s.addText(sc.note, { x: x + 0.1, y: 2.82, w: 2.02, h: 1.38, fontSize: 9.5, color: C.mid, fontFace: "Calibri", wrap: true });
  });

  s.addText("Scenarios assume monthly billing. Scroll up for annual rates (20% off).", {
    x: 0.35, y: 5.3, w: 9.3, h: 0.22, fontSize: 9, color: C.muted, italic: true, fontFace: "Calibri"
  });
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 8 — ON-PREMISE INTRO (dark)
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s, "1C0A38");

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.22, h: 5.625, fill: { color: C.purple }, line: { color: C.purple } });

  s.addText("On-Premise Edition", {
    x: 0.55, y: 1.0, w: 9, h: 1.0,
    fontSize: 52, bold: true, color: C.white, fontFace: "Calibri", charSpacing: 2
  });
  s.addText("Perpetual Licence + Annual Maintenance Contract (AMC)", {
    x: 0.55, y: 2.1, w: 8.5, h: 0.5,
    fontSize: 20, color: "C9A8F0", fontFace: "Calibri"
  });

  const points = [
    { icon: "🖥️", text: "Installed on the church's own server or private cloud" },
    { icon: "🔑", text: "One-time perpetual software licence — own it forever" },
    { icon: "🔧", text: "Annual AMC covers all updates, patches & support" },
    { icon: "🛡️", text: "Full data sovereignty — data never leaves your premises" },
  ];

  points.forEach((p, i) => {
    s.addText(p.icon + "  " + p.text, {
      x: 0.55, y: 2.78 + i * 0.55, w: 8.5, h: 0.45,
      fontSize: 14, color: "DDD0EE", fontFace: "Calibri"
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 9 — ON-PREMISE LICENCE PRICING
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s, C.offwht);
  titleBar(s, "On-Premise Perpetual Licence Fees", C.purple);
  pill(s, "ON-PREMISE", 0.35, 0.82, C.purple);

  const plans = [
    { name: "STARTER",      sub: "≤ 200 members",  lic: "₹ 44,999",    amc: "₹ 11,249/yr AMC", seats: "1 Admin · 2 Staff · 5 Vol", highlight: false },
    { name: "GROWTH",       sub: "≤ 1,000 members", lic: "₹ 1,09,999", amc: "₹ 27,499/yr AMC", seats: "2 Admin · 8 Staff · 20 Vol", highlight: true  },
    { name: "CHURCH PLUS",  sub: "≤ 5,000 members", lic: "₹ 2,24,999", amc: "₹ 56,249/yr AMC", seats: "5 Admin · 20 Staff · Unlim.", highlight: false },
    { name: "ENTERPRISE",   sub: "Multi-campus",    lic: "Custom",      amc: "Custom AMC",      seats: "Unlimited all roles",        highlight: false },
  ];

  plans.forEach((p, i) => {
    const x = 0.28 + i * 2.37;
    card(s, x, 1.1, 2.22, 4.22, C.white, p.highlight ? C.purple : "CCCCCC");

    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.1, w: 2.22, h: 0.38, fill: { color: C.purple }, line: { color: C.purple } });
    s.addText(p.name, { x, y: 1.1, w: 2.22, h: 0.38, fontSize: 11, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });

    if (p.highlight) {
      s.addShape(pres.shapes.RECTANGLE, { x: x + 0.35, y: 0.9, w: 1.52, h: 0.22, fill: { color: C.purple }, line: { color: C.purple } });
      s.addText("RECOMMENDED", { x: x + 0.35, y: 0.9, w: 1.52, h: 0.22, fontSize: 8, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
    }

    s.addText(p.sub, { x, y: 1.52, w: 2.22, h: 0.25, fontSize: 9, color: C.muted, align: "center", fontFace: "Calibri" });
    s.addText("ONE-TIME", { x, y: 1.8, w: 2.22, h: 0.2, fontSize: 8, color: C.muted, align: "center", fontFace: "Calibri" });
    s.addText(p.lic, { x, y: 1.98, w: 2.22, h: 0.52, fontSize: p.lic === "Custom" ? 22 : 20, bold: true, color: C.purple, align: "center", valign: "middle", fontFace: "Calibri" });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.1, y: 2.55, w: 2.02, h: 0.28, fill: { color: C.lavend }, line: { color: C.lavend } });
    s.addText("+ " + p.amc, { x: x + 0.1, y: 2.55, w: 2.02, h: 0.28, fontSize: 9, color: C.purple, bold: true, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
    s.addText(p.seats, { x: x + 0.08, y: 2.98, w: 2.06, h: 0.4, fontSize: 9, color: C.dark, align: "center", fontFace: "Calibri" });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.1, y: 3.48, w: 2.02, h: 0.26, fill: { color: "E8F5EE" }, line: { color: "C8E6C9" } });
    s.addText("Members: FREE", { x: x + 0.1, y: 3.48, w: 2.02, h: 0.26, fontSize: 10, bold: true, color: C.green, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
    s.addText("AMC = 25% of licence/yr", { x, y: 3.82, w: 2.22, h: 0.22, fontSize: 8, color: C.muted, align: "center", fontFace: "Calibri" });
  });

  s.addText("Licence fee payable in full before software delivery. AMC invoiced annually in advance. All prices excl. 18% GST.", {
    x: 0.35, y: 5.3, w: 9.3, h: 0.22, fontSize: 9, color: C.muted, italic: true, fontFace: "Calibri"
  });
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 10 — ON-PREMISE PER-USER
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s, C.white);
  titleBar(s, "On-Premise — Additional User Licences (One-Time)", C.purple);

  body(s, "Base licence includes the same seat counts as the SaaS plans. Extra users require a one-time per-user purchase.", 0.35, 0.82, 9.3, 0.32, { size: 12, color: C.mid });

  const hdr = { fill: { color: C.purple }, color: C.white, bold: true, align: "center" };
  const hdrL = { fill: { color: C.purple }, color: C.white, bold: true };

  const rows = [
    [{ text: "User Role", options: hdrL },
     { text: "Starter",     options: hdr },
     { text: "Growth",      options: hdr },
     { text: "Church Plus", options: hdr },
     { text: "Enterprise",  options: hdr }],

    [{ text: "Admin — included seats", options: {} },
     { text: "1", options: { align: "center" } }, { text: "2", options: { align: "center" } },
     { text: "5", options: { align: "center" } }, { text: "Unlimited", options: { align: "center" } }],

    [{ text: "Additional Admin (one-time/user)", options: { bold: true } },
     { text: "₹ 6,999", options: { bold: true, color: C.purple, align: "center" } },
     { text: "₹ 5,999", options: { bold: true, color: C.purple, align: "center" } },
     { text: "₹ 4,499", options: { bold: true, color: C.purple, align: "center" } },
     { text: "Included", options: { bold: true, color: C.green, align: "center" } }],

    [{ text: "Staff — included seats", options: {} },
     { text: "2", options: { align: "center" } }, { text: "8", options: { align: "center" } },
     { text: "20", options: { align: "center" } }, { text: "Unlimited", options: { align: "center" } }],

    [{ text: "Additional Staff (one-time/user)", options: { bold: true } },
     { text: "₹ 3,499", options: { bold: true, color: C.purple, align: "center" } },
     { text: "₹ 2,999", options: { bold: true, color: C.purple, align: "center" } },
     { text: "₹ 2,249", options: { bold: true, color: C.purple, align: "center" } },
     { text: "Included", options: { bold: true, color: C.green, align: "center" } }],

    [{ text: "Volunteer — included seats", options: {} },
     { text: "5", options: { align: "center" } }, { text: "20", options: { align: "center" } },
     { text: "Unlimited", options: { align: "center" } }, { text: "Unlimited", options: { align: "center" } }],

    [{ text: "Additional Volunteer (one-time/user)", options: { bold: true } },
     { text: "₹ 1,499", options: { bold: true, color: C.purple, align: "center" } },
     { text: "₹ 999",   options: { bold: true, color: C.purple, align: "center" } },
     { text: "Included", options: { bold: true, color: C.green, align: "center" } },
     { text: "Included", options: { bold: true, color: C.green, align: "center" } }],

    [{ text: "Member (congregation)", options: { bold: true } },
     { text: "FREE", options: { bold: true, color: C.green, align: "center" } },
     { text: "FREE", options: { bold: true, color: C.green, align: "center" } },
     { text: "FREE", options: { bold: true, color: C.green, align: "center" } },
     { text: "FREE", options: { bold: true, color: C.green, align: "center" } }],
  ];

  s.addTable(rows, {
    x: 0.35, y: 1.18, w: 9.3, h: 3.85,
    colW: [3.2, 1.52, 1.52, 1.52, 1.52],
    border: { pt: 0.5, color: "DDDDDD" },
    fontFace: "Calibri", fontSize: 11,
    align: "left", valign: "middle", rowH: 0.42,
  });

  // Module add-ons
  s.addShape(pres.shapes.RECTANGLE, { x: 0.35, y: 5.1, w: 9.3, h: 0.32, fill: { color: C.lavend }, line: { color: C.lavend } });
  s.addText("Module Add-ons (one-time):  PastorBot AI ₹44,999  ·  Ministry Automation ₹24,999  ·  Accounting ₹19,999  ·  Payroll ₹12,999", {
    x: 0.45, y: 5.1, w: 9.1, h: 0.32, fontSize: 10, bold: true, color: C.purple,
    valign: "middle", fontFace: "Calibri", margin: 0
  });
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 11 — ON-PREMISE SCENARIOS
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s, C.white);
  titleBar(s, "On-Premise — Sample Cost Scenarios", C.purple);

  const scen = [
    { title: "Small Church · 80 members",     plan: "STARTER",     cost: "₹ 44,999",    sub: "one-time licence", amc: "+ ₹ 11,249/yr AMC",   note: "Break-even vs SaaS in ~30 months" },
    { title: "Growing Church · 350 members",  plan: "GROWTH",      cost: "₹ 1,27,993",  sub: "one-time total",   amc: "+ ₹ 27,499/yr AMC",   note: "Licence + 2 extra Staff seats (₹2,999 each)" },
    { title: "Large Church · 2,000 members",  plan: "CHURCH PLUS", cost: "₹ 2,47,489",  sub: "one-time total",   amc: "+ ₹ 56,249/yr AMC",   note: "Licence + 10 extra Staff (₹2,249 each)" },
    { title: "Denomination · 5 campuses",     plan: "ENTERPRISE",  cost: "Custom",       sub: "quote",            amc: "Custom AMC",           note: "On-site install, private cloud, custom SLA" },
  ];

  scen.forEach((sc, i) => {
    const x = 0.28 + i * 2.37;
    card(s, x, 0.92, 2.22, 4.4, C.white, C.lavend);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 0.92, w: 2.22, h: 0.3, fill: { color: C.purple }, line: { color: C.purple } });
    s.addText(sc.plan, { x, y: 0.92, w: 2.22, h: 0.3, fontSize: 9, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
    s.addText(sc.title, { x: x + 0.1, y: 1.28, w: 2.02, h: 0.52, fontSize: 11, bold: true, color: C.navy, fontFace: "Calibri", wrap: true });
    s.addText(sc.cost, { x: x + 0.1, y: 1.84, w: 2.02, h: 0.46, fontSize: sc.cost === "Custom" ? 22 : 20, bold: true, color: C.purple, fontFace: "Calibri" });
    s.addText(sc.sub, { x: x + 0.1, y: 2.3, w: 2.02, h: 0.22, fontSize: 9, color: C.muted, fontFace: "Calibri" });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.1, y: 2.56, w: 2.02, h: 0.28, fill: { color: C.lavend }, line: { color: C.lavend } });
    s.addText(sc.amc, { x: x + 0.1, y: 2.56, w: 2.02, h: 0.28, fontSize: 9, color: C.purple, bold: true, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
    s.addText(sc.note, { x: x + 0.1, y: 2.94, w: 2.02, h: 1.28, fontSize: 9.5, color: C.mid, fontFace: "Calibri", wrap: true });
  });

  s.addText("Infrastructure costs (server, IT) borne by the church. Break-even is approximate, assuming monthly SaaS billing.", {
    x: 0.35, y: 5.3, w: 9.3, h: 0.22, fontSize: 9, color: C.muted, italic: true, fontFace: "Calibri"
  });
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 12 — SAAS vs ON-PREMISE COMPARISON
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s, C.white);
  titleBar(s, "SaaS vs On-Premise — Which is Right for You?");

  const hdrS = { fill: { color: C.navy   }, color: C.white, bold: true, align: "center" };
  const hdrO = { fill: { color: C.purple }, color: C.white, bold: true, align: "center" };
  const hdrL = { fill: { color: "444444" }, color: C.white, bold: true };
  const saas = (t) => ({ text: t, options: { color: C.navy, bold: true, align: "center" } });
  const onp  = (t) => ({ text: t, options: { color: C.purple, bold: true, align: "center" } });

  const rows = [
    [{ text: "Factor", options: hdrL }, { text: "☁️  SaaS (Cloud)", options: hdrS }, { text: "🖥️  On-Premise", options: hdrO }],
    ["Upfront Cost",         saas("Low — monthly / annual"),        onp("Higher — one-time licence")],
    ["Long-term (5 yr)",     saas("Higher — recurring fees"),       onp("Lower — licence + AMC only")],
    ["Infrastructure",       saas("None — Mahima managed"),         onp("Church-managed server needed")],
    ["Data Sovereignty",     saas("Hosted in India-region"),        onp("Fully on-site, max control")],
    ["Software Updates",     saas("Automatic, always latest"),      onp("Via AMC — manual deployment")],
    ["Scalability",          saas("Instant, no IT effort"),         onp("Requires server upgrade")],
    ["IT Team Required",     saas("No"),                            onp("Yes (or outsourced IT)")],
    ["Internet Required",    saas("Yes — always online"),           onp("LAN use possible offline")],
    ["Best For",             saas("Most churches (fast start)"),    onp("Large churches / seminaries with IT staff")],
  ];

  s.addTable(rows, {
    x: 0.35, y: 0.84, w: 9.3, h: 4.62,
    colW: [2.8, 3.25, 3.25],
    border: { pt: 0.5, color: "E0E0E0" },
    fontFace: "Calibri", fontSize: 12,
    valign: "middle", rowH: 0.44,
  });

  s.addText("💡  On-premise typically break-even vs SaaS in 24–36 months.", {
    x: 0.35, y: 5.3, w: 9.3, h: 0.22, fontSize: 10, color: C.orange, bold: true, fontFace: "Calibri"
  });
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 13 — BREAK-EVEN CHART
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s, C.white);
  titleBar(s, "Cumulative Cost Over 5 Years — Growth Plan Example");

  // SaaS: ₹4,492/mo (scenario 2, monthly)
  // On-prem: ₹1,27,993 upfront + ₹27,499/yr AMC

  const months   = [0,6,12,18,24,30,36,42,48,54,60];
  const saasCum  = months.map(m => Math.round(4492 * m / 1000));
  const opCum    = months.map(m => Math.round((127993 + 27499 * m / 12) / 1000));

  s.addChart(pres.charts.LINE, [
    { name: "SaaS (₹4,492/mo)",          labels: months.map(m => m === 0 ? "0" : m + " mo"), values: saasCum },
    { name: "On-Premise (₹1,27,993 + AMC)", labels: months.map(m => m === 0 ? "0" : m + " mo"), values: opCum  },
  ], {
    x: 0.4, y: 0.82, w: 9.2, h: 4.5,
    chartColors: [C.navy, C.purple],
    chartArea: { fill: { color: C.white }, roundedCorners: false },
    lineSize: 3,
    lineSmooth: true,
    showLegend: true,
    legendPos: "b",
    legendFontSize: 11,
    catAxisLabelColor: "64748B",
    valAxisLabelColor: "64748B",
    valGridLine: { color: "E2E8F0", size: 0.5 },
    catGridLine: { style: "none" },
    showTitle: false,
    valAxisDisplayUnit: "thousands",
    valAxisLabelFormatCode: '₹#,##0K',
    showValue: false,
  });

  s.addText("X-axis = months from go-live · Y-axis = cumulative cost (₹ thousands). Crossover ≈ 28 months for Growth plan.", {
    x: 0.35, y: 5.3, w: 9.3, h: 0.22, fontSize: 9, color: C.muted, italic: true, fontFace: "Calibri"
  });
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 14 — IMPLEMENTATION FEES
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s, C.white);
  titleBar(s, "Implementation & Onboarding Fees");
  body(s, "Available for both SaaS and On-Premise customers. One-time services.", 0.35, 0.82, 9.3, 0.3, { size: 12, color: C.mid });

  const hdrL = { fill: { color: C.navy }, color: C.white, bold: true };
  const hdrC = { fill: { color: C.navy }, color: C.white, bold: true, align: "center" };

  const rows = [
    [{ text: "Service", options: hdrL }, { text: "Fee (INR)", options: hdrC }, { text: "Notes", options: hdrL }],
    ["Self-Onboarding (SaaS only)",
     { text: "FREE", options: { bold: true, color: C.green, align: "center" } },
     "Guided wizard + video tutorials"],
    ["Assisted Onboarding (up to 4 hrs)",
     { text: "₹ 7,499", options: { bold: true, color: C.orange, align: "center" } },
     "Screen-share setup + data import"],
    ["Full Migration (data + staff training)",
     { text: "₹ 14,999", options: { bold: true, color: C.orange, align: "center" } },
     "CSV/Excel migration + 2 training sessions"],
    ["On-Premise Remote Installation (On-Prem)",
     { text: "₹ 19,999", options: { bold: true, color: C.purple, align: "center" } },
     "Server setup, DB config, SSL, smoke-testing"],
    ["On-Site Installation (travel extra)",
     { text: "₹ 34,999", options: { bold: true, color: C.purple, align: "center" } },
     "Engineer visit + on-site staff training"],
    ["Custom Development / Integration",
     { text: "₹ 2,250/hr", options: { bold: true, color: C.orange, align: "center" } },
     "ERP connectors, custom reports, denomination integrations"],
  ];

  s.addTable(rows, {
    x: 0.35, y: 1.2, w: 9.3, h: 4.1,
    colW: [3.8, 1.9, 3.6],
    border: { pt: 0.5, color: "DDDDDD" },
    fontFace: "Calibri", fontSize: 11.5,
    valign: "middle", rowH: 0.52,
  });

  s.addText("All prices excl. 18% GST. On-premise installation fees are separate from the licence fee.", {
    x: 0.35, y: 5.3, w: 9.3, h: 0.22, fontSize: 9, color: C.muted, italic: true, fontFace: "Calibri"
  });
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 15 — KEY TERMS
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s, C.white);
  titleBar(s, "Key Commercial Terms");

  const terms = [
    "All prices in INR, exclusive of 18% GST.",
    "SaaS: monthly billing on 1st via Razorpay / UPI. Annual plans billed upfront, non-refundable after 30 days.",
    "On-Premise: licence fee in full before delivery. AMC invoiced annually in advance.",
    "SaaS subscriptions auto-renew unless cancelled 7 days before billing date.",
    "Lapsed AMC renewable with 20% re-activation surcharge. On-Premise AMC rates locked for 3 years.",
    "Data export (CSV/PDF) available any time at no charge. Church data stored in India-region servers.",
    "Price revisions with 60 days' advance notice to existing subscribers.",
  ];

  bullets(s, terms, 0.45, 0.88, 9.1, 4.4, 12.5);
}

// ═══════════════════════════════════════════════════════════════
// SLIDE 16 — CLOSE / CONTACT
// ═══════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  bg(s, C.navy);

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.22, h: 5.625, fill: { color: C.orange }, line: { color: C.orange } });

  s.addText("Get Started with Mahima", {
    x: 0.55, y: 0.9, w: 9, h: 0.85,
    fontSize: 40, bold: true, color: C.white, fontFace: "Calibri"
  });
  s.addText("Choose your plan · SaaS or On-Premise · Go live in days", {
    x: 0.55, y: 1.82, w: 9, h: 0.42,
    fontSize: 16, color: C.orange, fontFace: "Calibri"
  });

  // Contact boxes
  const contacts = [
    { label: "Email",     val: "sales@mahimaapp.in" },
    { label: "WhatsApp",  val: "+91 98XXX XXXXX"    },
    { label: "Website",   val: "www.mahimaapp.in"   },
  ];
  contacts.forEach((c, i) => {
    const x = 0.55 + i * 3.1;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.5, w: 2.85, h: 1.0, fill: { color: "22365A" }, line: { color: "3A5A8A" } });
    s.addText(c.label, { x, y: 2.6, w: 2.85, h: 0.3, fontSize: 10, color: "7799BB", align: "center", fontFace: "Calibri" });
    s.addText(c.val,   { x, y: 2.93, w: 2.85, h: 0.42, fontSize: 13, bold: true, color: C.white, align: "center", fontFace: "Calibri" });
  });

  // Summary metrics
  metric(s, "4",         "Subscription Plans",    0.55, 3.8, C.orange);
  metric(s, "2",         "Delivery Models",       2.85, 3.8, C.orange);
  metric(s, "₹0",        "Member Seat Cost",      5.15, 3.8, C.green);
  metric(s, "20%",       "Annual Billing Saving", 7.45, 3.8, C.orange);

  s.addText("Confidential · Prices in INR excl. GST · Version 2.0 · June 2026", {
    x: 0.55, y: 5.22, w: 9, h: 0.28, fontSize: 9, color: "6688AA", align: "center", italic: true, fontFace: "Calibri"
  });
}

// ═══════════════════════════════════════════════════════════════
// WRITE FILE
// ═══════════════════════════════════════════════════════════════
pres.writeFile({ fileName: "Mahima_Pricing_Guide_India_2026.pptx" })
  .then(() => console.log("✅  Saved: Mahima_Pricing_Guide_India_2026.pptx  (16 slides)"))
  .catch(err => { console.error("❌  Error:", err); process.exit(1); });
