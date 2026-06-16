// CRYPTA — Secure Pastoral Messaging Platform
// Proposal Deck Generator (Node.js) — run with: node generate_crypta_deck.js
// Requires: npm install pptxgenjs  (or: npx pptxgenjs)

const pptxgen = require("pptxgenjs");
const path = require("path");

process.on("unhandledRejection", (err) => {
  console.error("\n❌ UNHANDLED REJECTION:", err && err.message ? err.message : err);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.error("\n❌ UNCAUGHT EXCEPTION:", err && err.message ? err.message : err);
  process.exit(1);
});

const pres = new pptxgen();

// pptxgenjs v3.12 shape constants
const RECT = pres.shapes ? pres.shapes.RECTANGLE : (pres.ShapeType ? pres.ShapeType.rect : "rect");
const OVAL = pres.shapes ? pres.shapes.OVAL       : (pres.ShapeType ? pres.ShapeType.oval : "ellipse");
pres.layout = "LAYOUT_16x9";
pres.author = "Mahima Technology Team";
pres.title = "CRYPTA – Secure Pastoral Communications Platform";

const C = {
  navy: "1C3557", teal: "0D9488", amber: "F59E0B", red: "DC2626",
  white: "FFFFFF", offWhite: "F8FAFC", slate: "1E293B", muted: "64748B",
  light: "E2E8F0", card: "F1F5F9", navyLight: "DBEAFE",
};
const TOTAL = 22;

function makeShadow() {
  return { type: "outer", blur: 8, offset: 3, angle: 135, color: "000000", opacity: 0.12 };
}
function addSlideNumber(s, num, total, dark) {
  s.addText(`${num} / ${total}`, { x: 8.8, y: 5.25, w: 1, h: 0.25, fontSize: 9, color: dark ? "FFFFFF" : C.muted, align: "right" });
}
function sectionHeader(s, label) {
  s.addShape(RECT, { x: 0.5, y: 0.18, w: 0.06, h: 0.5, fill: { color: C.amber }, line: { color: C.amber } });
  s.addText(label, { x: 0.65, y: 0.18, w: 8, h: 0.5, fontSize: 11, bold: true, color: C.teal, charSpacing: 2, margin: 0, valign: "middle" });
}
function sectionTitle(s, title, sub) {
  s.addText(title, { x: 0.5, y: 0.72, w: 9, h: 0.7, fontSize: 28, bold: true, color: C.navy, margin: 0 });
  if (sub) s.addText(sub, { x: 0.5, y: 1.38, w: 9, h: 0.45, fontSize: 13, color: C.muted, margin: 0 });
}
function card(s, x, y, w, h, color) {
  s.addShape(RECT, { x, y, w, h, fill: { color: color || C.card }, line: { color: C.light, width: 1 }, shadow: makeShadow() });
}

console.log("Building CRYPTA deck — 22 slides...");

// ── SLIDE 1 — COVER ─────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  s.addShape(RECT, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.amber }, line: { color: C.amber } });
  s.addShape(OVAL, { x: 0.6, y: 0.9, w: 1.6, h: 1.6, fill: { color: C.teal, transparency: 30 }, line: { color: C.teal, width: 2 } });
  s.addText("CRYPTA", { x: 2.5, y: 1.0, w: 7, h: 1.0, fontSize: 56, bold: true, color: C.white, charSpacing: 8, margin: 0 });
  s.addText("COVERT  REALTIME  YOKED  PASTORAL  TRUST  ARCHITECTURE", { x: 2.5, y: 1.92, w: 7, h: 0.4, fontSize: 7.5, color: C.teal, charSpacing: 1, margin: 0 });
  s.addText("Secure · Encrypted · Stealth-Ready Messaging for Pastors in High-Risk Environments", { x: 2.5, y: 2.55, w: 7, h: 0.65, fontSize: 13, color: "B0C4DE", italic: true, margin: 0 });
  s.addText("End-to-End Proposal — Implementation, Platform & AMC", { x: 2.5, y: 3.4, w: 7, h: 0.4, fontSize: 12, color: C.amber, bold: true, margin: 0 });
  s.addText("Built on Mahima App V4.0  |  Delta Analysis Included  |  INR Commercials", { x: 2.5, y: 3.85, w: 7, h: 0.35, fontSize: 10, color: C.muted, margin: 0 });
  s.addShape(RECT, { x: 0, y: 5.12, w: 10, h: 0.5, fill: { color: "0F172A" }, line: { color: "0F172A" } });
  s.addText("CONFIDENTIAL  |  Prepared for Jai Masih Ministry  |  June 2026", { x: 0.3, y: 5.15, w: 9.4, h: 0.42, fontSize: 9, color: C.muted, align: "center", margin: 0 });
  console.log("  Slide 1 done");
}

// ── SLIDE 2 — AGENDA ────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionHeader(s, "AGENDA");
  sectionTitle(s, "What This Proposal Covers", "A complete blueprint — from threat to solution to commercials");
  [["01","The Threat Landscape","Why pastors are uniquely vulnerable & what attackers exploit"],
   ["02","Introducing CRYPTA","Architecture, unique features, and AI enrichment"],
   ["03","7-Layer Security Stack","E2E encryption, stealth mode, panic wipe & more"],
   ["04","Admin Console & Mgmt","Web dashboard, pastor profiles, audit trail, RBAC"],
   ["05","Delta Analysis","What exists in Mahima V4.0 vs. what needs to be built"],
   ["06","Commercials (INR)","Implementation, platform costs & AMC with 50% margin"]].forEach(([num,title,desc],i) => {
    const col = i<3?0:1, row = i%3;
    const x = col===0?0.5:5.25, y = 1.95+row*1.1;
    card(s, x, y, 4.55, 0.95);
    s.addShape(RECT, { x, y, w: 0.5, h: 0.95, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(num, { x, y, w: 0.5, h: 0.95, fontSize: 13, bold: true, color: C.amber, align: "center", valign: "middle", margin: 0 });
    s.addText(title, { x: x+0.55, y: y+0.08, w: 3.9, h: 0.35, fontSize: 12, bold: true, color: C.navy, margin: 0 });
    s.addText(desc,  { x: x+0.55, y: y+0.44, w: 3.9, h: 0.42, fontSize: 9.5, color: C.muted, margin: 0 });
  });
  addSlideNumber(s, 2, TOTAL);
  console.log("  Slide 2 done");
}

// ── SLIDE 3 — THREAT LANDSCAPE ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: "0F172A" };
  s.addShape(RECT, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.red }, line: { color: C.red } });
  s.addText("THE THREAT LANDSCAPE", { x: 0.5, y: 0.25, w: 9, h: 0.45, fontSize: 11, bold: true, color: C.red, charSpacing: 3, margin: 0 });
  s.addText("Pastors in high-risk zones face systematic, technology-assisted persecution", { x: 0.5, y: 0.72, w: 9, h: 0.55, fontSize: 22, bold: true, color: C.white, margin: 0 });
  [["Phone Gallery Raids","Law enforcement confiscates phones and scans photo galleries for evidence of prayer meetings, Bible studies, and baptisms to build conversion cases."],
   ["Chat Screenshot Evidence","WhatsApp chats are extracted via physical access or cloud backup. Group names, member lists, and messages are used as legal evidence in FIR filings."],
   ["Informer-Assisted Stings","Moles inside congregations secretly capture media and forward to hostile actors. A single compromised member can expose an entire network."]].forEach(([title,body],i) => {
    const x = 0.4+i*3.1;
    s.addShape(RECT, { x, y: 1.55, w: 2.9, h: 3.4, fill: { color: "1E293B" }, line: { color: C.red, width: 1 }, shadow: makeShadow() });
    s.addText(title, { x, y: 2.42, w: 2.9, h: 0.55, fontSize: 12, bold: true, color: C.amber, align: "center", margin: 0 });
    s.addText(body,  { x: x+0.15, y: 3.0, w: 2.6, h: 1.8, fontSize: 10, color: "B0C4DE", align: "left", margin: 0 });
  });
  s.addShape(RECT, { x: 0.4, y: 5.05, w: 9.2, h: 0.4, fill: { color: "1E293B" }, line: { color: C.red, width: 0.5 } });
  s.addText("The danger is REAL. Pastors need a purpose-built tool — not a consumer app — to stay protected.", { x: 0.5, y: 5.1, w: 9, h: 0.3, fontSize: 10, bold: true, color: C.amber, align: "center", margin: 0 });
  addSlideNumber(s, 3, TOTAL, true);
  console.log("  Slide 3 done");
}

// ── SLIDE 4 — WHY WHATSAPP FAILS ────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionHeader(s, "PROBLEM ANALYSIS");
  sectionTitle(s, "Why WhatsApp & Standard Apps Fail Pastors", "Consumer messaging apps were never built for life-threatening operational security");
  [["Files saved to Gallery","Every photo/video lands in device gallery — instant evidence on confiscation"],
   ["Cloud backups exploitable","iCloud/Google Drive backups expose entire chat history"],
   ["No remote wipe","No authority can erase data from a pastor's phone remotely"],
   ["Metadata leaks identity","Contact lists, group names, timestamps reveal ministry networks"],
   ["No decoy layer","App opens to full data — hostile actors see everything immediately"],
   ["No admin kill-switch","Head office cannot disable the app for a compromised field pastor"],
   ["Screen-capture unprotected","Screenshots of sensitive content trivially shared as evidence"],
   ["No AI-aided threat detection","No system warns when a contact pattern suggests a sting"]].forEach(([title,desc],i) => {
    const col=i%2, row=Math.floor(i/2);
    const x=col===0?0.4:5.2, y=1.9+row*0.82;
    s.addShape(RECT, { x, y, w: 0.32, h: 0.32, fill: { color: C.red }, line: { color: C.red } });
    s.addText("X", { x, y, w: 0.32, h: 0.32, fontSize: 12, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(title, { x: x+0.4, y, w: 4.2, h: 0.3, fontSize: 11, bold: true, color: C.navy, margin: 0 });
    s.addText(desc,  { x: x+0.4, y: y+0.3, w: 4.2, h: 0.42, fontSize: 9.5, color: C.muted, margin: 0 });
  });
  addSlideNumber(s, 4, TOTAL);
  console.log("  Slide 4 done");
}

// ── SLIDE 5 — INTRODUCING CRYPTA ────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  s.addShape(RECT, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.teal }, line: { color: C.teal } });
  s.addText("INTRODUCING", { x: 0.5, y: 0.3, w: 9, h: 0.45, fontSize: 11, bold: true, color: C.teal, charSpacing: 4, margin: 0 });
  s.addText("CRYPTA", { x: 0.5, y: 0.7, w: 9, h: 1.1, fontSize: 64, bold: true, color: C.white, charSpacing: 10, margin: 0 });
  s.addText("The world's first pastoral-hardened secure messaging platform.", { x: 0.5, y: 1.72, w: 9, h: 0.55, fontSize: 17, italic: true, color: C.amber, margin: 0 });
  ["Signal-Protocol E2E Encryption","Zero Local File Storage","One-Tap Panic Wipe","Stealth / Decoy Mode",
   "AI Field Safety Assistant","Admin Kill-Switch","Auto-Expiring Messages","SOS Duress Alerts",
   "7 Protective Security Layers","Web Admin Dashboard"].forEach((pill,i) => {
    const col=i%2, row=Math.floor(i/2);
    const x=col===0?0.4:5.2, y=2.52+row*0.55;
    s.addShape(RECT, { x, y, w: 4.5, h: 0.44, fill: { color: "162844" }, line: { color: C.teal, width: 0.75 } });
    s.addText(pill, { x: x+0.15, y, w: 4.2, h: 0.44, fontSize: 11, color: C.white, valign: "middle", margin: 0 });
  });
  addSlideNumber(s, 5, TOTAL, true);
  console.log("  Slide 5 done");
}

// ── SLIDE 6 — 7-LAYER SECURITY ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionHeader(s, "SECURITY ARCHITECTURE");
  sectionTitle(s, "7-Layer Protection Stack", "Defence-in-depth — no single point of failure can expose a pastor");
  [{num:"L1",label:"Signal Protocol E2E Encryption",color:"1C3557",desc:"Double Ratchet + X25519 ECDH. Zero-knowledge server — we cannot read your messages."},
   {num:"L2",label:"Biometric + PIN App Lock",color:"1D4E6B",desc:"Fingerprint / Face ID + time-out auto-lock. PIN entry required after 3 failed attempts."},
   {num:"L3",label:"Zero Local Storage",color:"0D6B6B",desc:"Media previewed ephemerally in secure viewer. No write to gallery. DRM-level rendering."},
   {num:"L4",label:"Screen Capture Prevention",color:"0D9488",desc:"Android FLAG_SECURE + iOS overlay blocking. Screenshots appear blank to attacker."},
   {num:"L5",label:"Stealth / Decoy Mode",color:"D97706",desc:"Fake calculator or utility UI hides app contents. Panic gesture activates wipe or decoy."},
   {num:"L6",label:"Server-Side Panic Kill-Switch",color:"B45309",desc:"Admin or pastor triggers remote kill — app becomes permanently unusable, data purged."},
   {num:"L7",label:"AI Threat & Anomaly Detection",color:"7C3AED",desc:"AI monitors behaviour patterns, suspicious logins, contact anomalies, sends instant alerts."}].forEach(({num,label,color,desc},i) => {
    const y=1.92+i*0.48;
    s.addShape(RECT, { x: 0.4, y, w: 9.2, h: 0.44, fill: { color: i%2===0?C.card:C.white }, line: { color: C.light, width: 0.5 } });
    s.addShape(RECT, { x: 0.4, y, w: 0.6, h: 0.44, fill: { color }, line: { color } });
    s.addText(num, { x: 0.4, y, w: 0.6, h: 0.44, fontSize: 9, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(label, { x: 1.1, y: y+0.04, w: 3.8, h: 0.36, fontSize: 11, bold: true, color: C.navy, valign: "middle", margin: 0 });
    s.addText(desc,  { x: 5.0, y: y+0.04, w: 4.5, h: 0.36, fontSize: 9.5, color: C.muted, valign: "middle", margin: 0 });
  });
  addSlideNumber(s, 6, TOTAL);
  console.log("  Slide 6 done");
}

// ── SLIDE 7 — E2E + ZERO STORAGE ────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionHeader(s, "FEATURE DEEP DIVE — LAYERS 1 & 3");
  sectionTitle(s, "E2E Encryption & Zero Local Storage", "Server sees only ciphertext. Device stores nothing.");
  card(s, 0.4, 1.88, 4.5, 3.5);
  s.addText("Encryption Engine", { x: 0.5, y: 1.98, w: 4.3, h: 0.45, fontSize: 13, bold: true, color: C.navy, margin: 0 });
  ["Signal Protocol — Double Ratchet Algorithm","X25519 ECDH key exchange per session","AES-256-GCM for message body encryption","Per-message ephemeral keys — no key reuse","Forward secrecy: past sessions unbreakable","Server stores only encrypted ciphertext","No server-side decryption capability","Key pairs stored in device secure enclave"].forEach((line,i) => {
    s.addShape(OVAL, { x: 0.55, y: 2.53+i*0.35, w: 0.14, h: 0.14, fill: { color: C.teal }, line: { color: C.teal } });
    s.addText(line, { x: 0.76, y: 2.48+i*0.35, w: 4.0, h: 0.32, fontSize: 10, color: C.slate, valign: "middle", margin: 0 });
  });
  card(s, 5.15, 1.88, 4.5, 3.5);
  s.addText("Zero Local Storage", { x: 5.25, y: 1.98, w: 4.3, h: 0.45, fontSize: 13, bold: true, color: C.navy, margin: 0 });
  ["Media streamed — never written to disk","Secure in-memory renderer (DRM-class)","Android MediaProjection API blocked","Ephemeral file token expires in 60 sec","Cache encrypted with session-scoped key","On logout: all cached data destroyed","File attachments: server-only, no download","Received images: view-once mode default"].forEach((line,i) => {
    s.addShape(OVAL, { x: 5.3, y: 2.53+i*0.35, w: 0.14, h: 0.14, fill: { color: C.amber }, line: { color: C.amber } });
    s.addText(line, { x: 5.52, y: 2.48+i*0.35, w: 4.0, h: 0.32, fontSize: 10, color: C.slate, valign: "middle", margin: 0 });
  });
  addSlideNumber(s, 7, TOTAL);
  console.log("  Slide 7 done");
}

// ── SLIDE 8 — STEALTH & PANIC WIPE ──────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: "0F172A" };
  s.addShape(RECT, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.amber }, line: { color: C.amber } });
  s.addText("FEATURE DEEP DIVE — LAYERS 5 & 6", { x: 0.5, y: 0.22, w: 9, h: 0.4, fontSize: 10, bold: true, color: C.amber, charSpacing: 2, margin: 0 });
  s.addText("Stealth Mode & Panic Wipe", { x: 0.5, y: 0.62, w: 9, h: 0.65, fontSize: 26, bold: true, color: C.white, margin: 0 });
  s.addText("When lives are at stake, the app must disappear — instantly.", { x: 0.5, y: 1.25, w: 9, h: 0.4, fontSize: 13, italic: true, color: C.amber, margin: 0 });
  card(s, 0.4, 1.78, 4.4, 3.55, "162844");
  s.addText("Stealth / Decoy Mode", { x: 0.55, y: 1.88, w: 4.1, h: 0.45, fontSize: 13, bold: true, color: C.teal, margin: 0 });
  ["App appears as 'Smart Calculator Pro' on home screen","Enter PIN -> opens to innocent calculator","Enter secret code -> reveals CRYPTA","Wrong attempt by hostile party -> decoy data shown","App icon, name and splash screen replaceable","Admin can push a 'rename' command remotely","Different app appearance after trigger","Supports multiple stealth personas per role"].forEach((line,i) => {
    s.addShape(OVAL, { x: 0.55, y: 2.45+i*0.35, w: 0.12, h: 0.12, fill: { color: C.teal }, line: { color: C.teal } });
    s.addText(line, { x: 0.73, y: 2.4+i*0.35, w: 3.95, h: 0.32, fontSize: 10, color: "B0C4DE", valign: "middle", margin: 0 });
  });
  card(s, 5.15, 1.78, 4.4, 3.55, "1E1535");
  s.addText("Panic Wipe System", { x: 5.3, y: 1.88, w: 4.1, h: 0.45, fontSize: 13, bold: true, color: C.amber, margin: 0 });
  ["1-tap emergency wipe from pastor's phone","Admin console remote wipe from head office","Auto-wipe on N failed PIN attempts","Scheduled silent wipe (e.g., every 7 days)","Geo-trigger: enters hostile zone -> auto-wipe","Wipe destroys: keys, contacts, messages, media","App becomes a blank dummy after wipe","Wipe event logged (tamper-proof) on server"].forEach((line,i) => {
    s.addShape(OVAL, { x: 5.3, y: 2.45+i*0.35, w: 0.12, h: 0.12, fill: { color: C.amber }, line: { color: C.amber } });
    s.addText(line, { x: 5.48, y: 2.4+i*0.35, w: 3.95, h: 0.32, fontSize: 10, color: "B0C4DE", valign: "middle", margin: 0 });
  });
  addSlideNumber(s, 8, TOTAL, true);
  console.log("  Slide 8 done");
}

// ── SLIDE 9 — AI SAFETY ─────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionHeader(s, "FEATURE DEEP DIVE — LAYER 7 / AI ENRICHMENT");
  sectionTitle(s, "CRYPTA AI: PastorBot+ Field Safety Engine", "Built on existing PastorBot foundation — enriched with active threat intelligence");
  [["LLM","OpenAI / Ollama / Groq (configurable, self-hosted)"],["Real-time","Threat pattern analysis on every message event"],["Zero Cloud","Can run fully on-premise for maximum privacy"]].forEach(([val,lbl],i) => {
    const x=0.4+i*3.1;
    card(s, x, 1.88, 2.9, 1.2, C.navyLight);
    s.addText(val, { x, y: 1.95, w: 2.9, h: 0.55, fontSize: 16, bold: true, color: C.navy, align: "center", valign: "middle", margin: 0 });
    s.addText(lbl, { x: x+0.1, y: 2.5, w: 2.7, h: 0.48, fontSize: 9.5, color: C.muted, align: "center", margin: 0 });
  });
  [["Sting Detector","AI analyses new contact behaviour, message timing, and content to flag potential informer stings before engagement."],
   ["Geo-Risk Advisor","Real-time area risk scoring. Warns pastor when entering a zone flagged by other field workers or news sources."],
   ["Safe Language Coach","Suggests coded, neutral language for sensitive topics to reduce incriminating content in messages."],
   ["Anomaly Alerts","Unusual login location, new device, rapid message deletion — AI triggers immediate admin notification."],
   ["Pastoral Guidance AI","Existing PastorBot upgraded with field safety knowledge — advises on legal rights and how to act safely."],
   ["Legal Shield Drafter","Generates standard legal protection statements and formats for pastors to carry in the field."]].forEach(([title,desc],i) => {
    const col=i%2, row=Math.floor(i/2);
    const x=col===0?0.4:5.2, y=3.28+row*0.72;
    card(s, x, y, 4.55, 0.62, C.card);
    s.addText(title, { x: x+0.6, y: y+0.04, w: 3.82, h: 0.26, fontSize: 11, bold: true, color: C.navy, margin: 0 });
    s.addText(desc,  { x: x+0.6, y: y+0.3,  w: 3.82, h: 0.28, fontSize: 9,  color: C.muted, margin: 0 });
  });
  addSlideNumber(s, 9, TOTAL);
  console.log("  Slide 9 done");
}

// ── SLIDE 10 — SOS & EXPIRING MESSAGES ──────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionHeader(s, "FEATURE DEEP DIVE — EMERGENCY & TEMPORAL FEATURES");
  sectionTitle(s, "SOS System & Auto-Expiring Messages", "Active safety for pastors plus time-limited evidence reduction");
  card(s, 0.4, 1.88, 4.45, 3.5);
  s.addShape(RECT, { x: 0.4, y: 1.88, w: 4.45, h: 0.55, fill: { color: C.red }, line: { color: C.red } });
  s.addText("SOS & Duress Alert System", { x: 0.5, y: 1.88, w: 4.25, h: 0.55, fontSize: 13, bold: true, color: C.white, valign: "middle", margin: 0 });
  [["Shake-to-SOS","Rapid device shake triggers silent SOS to admin"],["Volume Panic","Volume up x3 sends emergency alert with GPS coords"],["Duress PIN","Different PIN shows decoy data AND alerts admin"],["Network SOS","SOS pushed to admin console + designated contacts"],["Offline SOS","Pre-queued SMS SOS when no internet is available"],["Check-in System","Pastor marks safe at intervals; missed = auto-alert"],["Pastor Tracker","Optional: head office views last-known location"]].forEach(([t,d],i) => {
    s.addShape(OVAL, { x: 0.55, y: 2.56+i*0.37, w: 0.12, h: 0.12, fill: { color: C.red }, line: { color: C.red } });
    s.addText(`${t}:`, { x: 0.73, y: 2.52+i*0.37, w: 1.4,  h: 0.32, fontSize: 10, bold: true, color: C.navy, valign: "middle", margin: 0 });
    s.addText(d,        { x: 2.13, y: 2.52+i*0.37, w: 2.6,  h: 0.32, fontSize: 10, color: C.muted, valign: "middle", margin: 0 });
  });
  card(s, 5.1, 1.88, 4.45, 3.5);
  s.addShape(RECT, { x: 5.1, y: 1.88, w: 4.45, h: 0.55, fill: { color: C.navy }, line: { color: C.navy } });
  s.addText("Auto-Expiring Messages", { x: 5.2, y: 1.88, w: 4.25, h: 0.55, fontSize: 13, bold: true, color: C.white, valign: "middle", margin: 0 });
  [["View-Once","Message destroys itself after first read"],["TTL Timer","Set: 1 hour / 1 day / 7 days / 30 days"],["Server Purge","Server also purges at TTL — no server residue"],["Group TTL","Admin sets policy TTL for entire group chats"],["Forced Delete","Admin can recall & purge any message globally"],["Proof of Delete","Deletion certificate logged in audit trail"],["Scrub Mode","Wipe all messages older than N days on schedule"]].forEach(([t,d],i) => {
    s.addShape(OVAL, { x: 5.25, y: 2.56+i*0.37, w: 0.12, h: 0.12, fill: { color: C.teal }, line: { color: C.teal } });
    s.addText(`${t}:`, { x: 5.43, y: 2.52+i*0.37, w: 1.3,  h: 0.32, fontSize: 10, bold: true, color: C.navy, valign: "middle", margin: 0 });
    s.addText(d,        { x: 6.75, y: 2.52+i*0.37, w: 2.65, h: 0.32, fontSize: 10, color: C.muted, valign: "middle", margin: 0 });
  });
  addSlideNumber(s, 10, TOTAL);
  console.log("  Slide 10 done");
}

// ── SLIDE 11 — ADMIN CONSOLE ─────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionHeader(s, "ADMIN CONSOLE");
  sectionTitle(s, "Web Control Panel & Real-Time Dashboard", "Complete operational visibility and command for head office administrators");
  [["Live Dashboard","Real-time KPIs: active sessions, message volume, alerts triggered, pastor check-in status, system health."],
   ["Field Map","Visual map of pastor locations (opt-in), last-seen status, SOS pins, and geo-fenced risk zones."],
   ["Pastor Management","Full profile CRUD, role assignments, status (active/suspended/danger), and communication history."],
   ["Access Control","Granular RBAC — who can see what, message whom, and access which admin functions. Time-limited access."],
   ["Alert Centre","Incoming SOS alerts, AI-flagged anomalies, missed check-ins, and system warnings in a unified feed."],
   ["Remote Wipe Console","Select one or many pastors -> initiate remote wipe or app disable. Requires dual-admin confirmation."],
   ["Audit Trail","Every action logged with actor, timestamp, IP, device fingerprint. Tamper-proof, exportable to PDF."],
   ["Broadcast Hub","Send encrypted one-to-many alerts, prayer updates, and safety advisories to all or filtered groups."]].forEach(([title,desc],i) => {
    const col=i%2, row=Math.floor(i/2);
    const x=col===0?0.4:5.2, y=1.9+row*0.88;
    card(s, x, y, 4.55, 0.78, C.card);
    s.addShape(RECT, { x, y, w: 0.52, h: 0.78, fill: { color: C.navy }, line: { color: C.navy } });
    s.addText(title, { x: x+0.6, y: y+0.06, w: 3.82, h: 0.28, fontSize: 11, bold: true, color: C.navy, margin: 0 });
    s.addText(desc,  { x: x+0.6, y: y+0.34, w: 3.82, h: 0.38, fontSize: 9.5, color: C.muted, margin: 0 });
  });
  addSlideNumber(s, 11, TOTAL);
  console.log("  Slide 11 done");
}

// ── SLIDE 12 — PASTOR MANAGEMENT ────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionHeader(s, "PASTOR DATA MANAGEMENT");
  sectionTitle(s, "Comprehensive Pastor Profile & Security Tier System", "Ministry-grade identity management with data sensitivity controls");
  card(s, 0.4, 1.88, 4.4, 3.6);
  s.addText("Pastor Profile Fields", { x: 0.55, y: 1.98, w: 4.1, h: 0.4, fontSize: 12, bold: true, color: C.navy, margin: 0 });
  ["Full identity: Name, Code, Photo (encrypted)","Ministry zone / district / region assignment","Security tier: Green / Amber / Red / Critical","Emergency contacts (encrypted, admin-only)","Device fingerprints & trusted devices list","Aadhaar / ID references (encrypted at rest)","Baptism & ministry history records","Assigned groups, channels & broadcast lists","Last-check-in + SOS history log"].forEach((line,i) => {
    s.addShape(OVAL, { x: 0.55, y: 2.5+i*0.33, w: 0.11, h: 0.11, fill: { color: C.teal }, line: { color: C.teal } });
    s.addText(line, { x: 0.73, y: 2.46+i*0.33, w: 3.95, h: 0.3, fontSize: 10, color: C.slate, valign: "middle", margin: 0 });
  });
  card(s, 5.1, 1.88, 4.4, 3.6);
  s.addText("Security Tier Classification", { x: 5.25, y: 1.98, w: 4.1, h: 0.4, fontSize: 12, bold: true, color: C.navy, margin: 0 });
  [{tier:"GREEN",color:"16A34A",desc:"Low risk. Standard access. No special restrictions."},{tier:"AMBER",color:"D97706",desc:"Elevated risk. Geo-alerts enabled. Check-in required daily."},{tier:"RED",color:C.red,desc:"Active threat. Limited contacts. Auto-delete 24h. Admin notified."},{tier:"CRITICAL",color:"7C3AED",desc:"Imminent danger. Admin remote-controls session. Panic mode always on."}].forEach(({tier,color,desc},i) => {
    const y=2.5+i*0.72;
    s.addShape(RECT, { x: 5.15, y, w: 1.1, h: 0.55, fill: { color }, line: { color } });
    s.addText(tier, { x: 5.15, y, w: 1.1, h: 0.55, fontSize: 8, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(desc, { x: 6.35, y, w: 3.0, h: 0.55, fontSize: 10, color: C.slate, valign: "middle", margin: 0 });
  });
  s.addShape(RECT, { x: 5.15, y: 4.42, w: 4.2, h: 0.88, fill: { color: C.navyLight }, line: { color: C.navy, width: 0.75 } });
  s.addText("RBAC Roles: SuperAdmin · RegionAdmin · FieldSupervisor · PastorSelf\nSensitive fields (Aadhaar, phone, location) require dual-admin approval to view.", { x: 5.25, y: 4.52, w: 4.0, h: 0.7, fontSize: 9.5, color: C.navy, margin: 0 });
  addSlideNumber(s, 12, TOTAL);
  console.log("  Slide 12 done");
}

// ── SLIDE 13 — AUDIT TRAIL ──────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionHeader(s, "GOVERNANCE & COMPLIANCE");
  sectionTitle(s, "Tamper-Proof Audit Trail & Legal Compliance", "Every admin action, wipe, and access event is immutably logged");
  const auditRows = [
    ["Login / Logout","User, device, IP, location, timestamp","365 days"],
    ["Message Sent","ChatId, SenderHash (no content), size, TTL","90 days"],
    ["File Access Attempt","Resource, actor, outcome (allowed/denied)","365 days"],
    ["Admin Config Change","Field changed, old/new value, dual-auth ref","Forever"],
    ["Remote Wipe Triggered","Initiator, target pastor, reason, confirmation","Forever"],
    ["SOS Alert","Pastor, GPS coords, timestamp, resolution","Forever"],
    ["Permission Change","Role, grantor, grantee, scope","Forever"],
    ["AI Alert Fired","Alert type, confidence, actor, disposition","180 days"],
  ];
  s.addTable([
    [{text:"Event Type",options:{bold:true,fontSize:10,color:C.white,fill:{color:C.navy}}},{text:"Data Captured",options:{bold:true,fontSize:10,color:C.white,fill:{color:C.navy}}},{text:"Retention",options:{bold:true,fontSize:10,color:C.white,fill:{color:C.navy}}}],
    ...auditRows.map(([event,detail,retained],i) => [
      {text:event,    options:{fontSize:10,bold:true,color:C.navy,fill:{color:i%2===0?C.card:C.white}}},
      {text:detail,   options:{fontSize:10,color:C.slate,fill:{color:i%2===0?C.card:C.white}}},
      {text:retained, options:{fontSize:10,color:retained==="Forever"?C.red:C.muted,bold:retained==="Forever",fill:{color:i%2===0?C.card:C.white}}},
    ]),
  ], { x: 0.4, y: 1.9, w: 9.2, h: 3.7, colW: [2.8,5.0,1.4], border: { pt: 0.5, color: C.light } });
  s.addShape(RECT, { x: 0.4, y: 5.0, w: 9.2, h: 0.48, fill: { color: C.navyLight }, line: { color: C.navy, width: 0.75 } });
  s.addText("Audit logs are append-only (no delete API). Export to PDF or CSV. Integration with SIEM systems available.", { x: 0.5, y: 5.05, w: 9.0, h: 0.38, fontSize: 10, color: C.navy, valign: "middle", margin: 0 });
  addSlideNumber(s, 13, TOTAL);
  console.log("  Slide 13 done");
}

// ── SLIDE 14 — TECHNOLOGY STACK ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: "0F172A" };
  s.addShape(RECT, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.teal }, line: { color: C.teal } });
  s.addText("TECHNOLOGY ARCHITECTURE", { x: 0.5, y: 0.2, w: 9, h: 0.4, fontSize: 10, bold: true, color: C.teal, charSpacing: 3, margin: 0 });
  s.addText("Built on proven Mahima V4.0 stack — enhanced for adversarial environments", { x: 0.5, y: 0.6, w: 9, h: 0.5, fontSize: 16, color: C.white, margin: 0 });
  [{label:"MOBILE APP",tech:"React + Capacitor (Android/iOS) · Signal Protocol JS · Biometric API · FLAG_SECURE",color:"1D4E6B"},
   {label:"ADMIN WEB CONSOLE",tech:"React SPA · Role-gated routes · Real-time SignalR · Chart.js dashboards",color:"1D4E6B"},
   {label:"API GATEWAY",tech:"ASP.NET Core 8 Web API · JWT Bearer · Rate Limiting · IP Whitelisting · WAF",color:"0D6B6B"},
   {label:"REAL-TIME HUB",tech:"SignalR (WebSockets) · Presence tracking · Group channels · Push Notifications",color:"0D6B6B"},
   {label:"AI ENGINE",tech:"OpenAI-Compatible LLM (Ollama/Groq/GPT-4o) · Vision API · Threat Pattern Models",color:"4B2681"},
   {label:"DATA LAYER",tech:"PostgreSQL (EF Core 8) · Encrypted columns (AES-256) · Append-only audit tables",color:"1C3557"},
   {label:"INFRA",tech:"AWS (ECS / RDS / S3 / CloudFront / WAF) · OR Azure / Self-Hosted · Let's Encrypt",color:"1E293B"}].forEach(({label,tech,color},i) => {
    s.addShape(RECT, { x: 0.4, y: 1.25+i*0.6, w: 9.2, h: 0.52, fill: { color }, line: { color: C.teal, width: 0.5 } });
    s.addText(label, { x: 0.55, y: 1.27+i*0.6, w: 2.4, h: 0.48, fontSize: 11, bold: true, color: C.amber, valign: "middle", margin: 0 });
    s.addText(tech,  { x: 3.1, y: 1.27+i*0.6, w: 6.4, h: 0.48, fontSize: 10.5, color: "B0C4DE", valign: "middle", margin: 0 });
  });
  addSlideNumber(s, 14, TOTAL, true);
  console.log("  Slide 14 done");
}

// ── SLIDE 15 — EXISTING MAHIMA V4.0 ─────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionHeader(s, "BASELINE ASSESSMENT — MAHIMA APP V4.0");
  sectionTitle(s, "What's Already Built in Mahima V4.0", "Audit of existing messaging, auth & AI features — reduces delta effort");
  [["Chat Model (1:1 + Group)",70,"Chat, ChatMember, IChatService, basic CRUD + soft delete"],
   ["SignalR Real-time Hub",70,"useChatConnection, presence, group join/leave, auto-reconnect"],
   ["Message Model & CRUD",70,"Message, MessageRead, ContentType, delete-for-all"],
   ["User Block System",80,"UserBlock model, BlockChatUserAsync, UnblockChatUserAsync"],
   ["JWT Auth + Role System",75,"JwtTokenService, Role, RolePermission, RBAC claims"],
   ["AuditLog Model",40,"AuditLog with ActorId, Action, EntityType — needs expansion"],
   ["Attachment / S3 Uploads",55,"AttachmentsController, S3Key, multi-attachment DTOs"],
   ["PastorBot AI (OpenAI-compat)",60,"PastorBotController, OpenAiCompatibleLlmProvider, vision"],
   ["User Model (Pastor fields)",65,"IsPastor, AadharNumber, BaptismDate, EmergencyContact"],
   ["Admin Controllers (partial)",30,"AdminLandingController — full dashboard missing"],
   ["E2E Encryption",0,"NOT BUILT — messages stored as plain text in PostgreSQL"],
   ["Remote Wipe / Panic Mode",0,"NOT BUILT — no kill-switch mechanism of any kind"]].forEach(([feature,pct,note],i) => {
    const y=1.9+i*0.3;
    const barColor=pct>=60?C.teal:pct>=30?C.amber:C.red;
    s.addText(feature, { x: 0.4, y, w: 3.1, h: 0.28, fontSize: 9.5, bold: pct>0, color: pct===0?C.red:C.navy, valign: "middle", margin: 0 });
    s.addShape(RECT, { x: 3.58, y: y+0.06, w: 2.0, h: 0.16, fill: { color: C.light }, line: { color: C.light } });
    if (pct>0) s.addShape(RECT, { x: 3.58, y: y+0.06, w: 2.0*pct/100, h: 0.16, fill: { color: barColor }, line: { color: barColor } });
    s.addText(`${pct}%`, { x: 5.65, y, w: 0.55, h: 0.28, fontSize: 9.5, bold: true, color: barColor, align: "right", valign: "middle", margin: 0 });
    s.addText(note, { x: 6.25, y, w: 3.5, h: 0.28, fontSize: 9, color: C.muted, valign: "middle", margin: 0 });
  });
  addSlideNumber(s, 15, TOTAL);
  console.log("  Slide 15 done");
}

// ── SLIDE 16 — DELTA ANALYSIS ────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionHeader(s, "DELTA ANALYSIS");
  sectionTitle(s, "Gap Analysis: New Features Required for CRYPTA", "Features scored by complexity and month estimation");
  const rows = [
    ["Signal Protocol E2E Encryption","Not built","Full implementation (Signal JS + server key mgmt)","5 months","P1"],
    ["Zero Local Storage / Secure Viewer","Not built","DRM viewer, block gallery write, cache encryption","2 months","P1"],
    ["Biometric + PIN App Lock","Not built","Capacitor Biometrics plugin + timeout policy","1 month","P1"],
    ["Screen Capture Prevention","Not built","Android FLAG_SECURE, iOS overlay","0.5m","P1"],
    ["Standalone CRYPTA App","Embedded in Mahima","New app project, branding, stealth persona","1.5 months","P1"],
    ["Remote Wipe / Panic Kill-Switch","Not built","Server-side disable + client wipe protocol","2 months","P2"],
    ["Stealth / Decoy Mode","Not built","Decoy UI, secret PIN routing, remote rename","2 months","P2"],
    ["Auto-Expiring Messages (TTL)","Not built","TTL field, server purge job, forced delete","1 month","P2"],
    ["SOS & Duress Alert System","Not built","Shake/volume triggers, GPS, SMS fallback","2 months","P2"],
    ["Geofencing & Location Alerts","Not built","Zone management, entry/exit triggers","1.5 months","P2"],
    ["Full Admin Console & Dashboard","30% partial","React admin SPA, charts, maps, wipe console","3 months","P3"],
    ["Pastor Mgmt + Security Tiers","IsPastor flag only","Full profile module, tier system, RBAC","1.5 months","P3"],
    ["Expanded Audit Trail","40% partial","Append-only, tamper-proof, export, SIEM hook","1 month","P3"],
    ["AI Safety (PastorBot+)","60% partial","Threat model, geo-risk, safe language, alerts","2 months","P3"],
    ["Certificate Pinning + MFA","Not built","SSL pin, TOTP-based 2FA, trusted device mgmt","1.5 months","P3"],
    ["Security Audit + Pen Test","Not done","External pen test, OWASP Top 10 remediation","1 month","P4"],
  ];
  s.addTable([
    [{text:"Feature / Module",options:{bold:true,fontSize:9,color:C.white,fill:{color:C.navy}}},{text:"Status in V4.0",options:{bold:true,fontSize:9,color:C.white,fill:{color:C.navy}}},{text:"Delta Work",options:{bold:true,fontSize:9,color:C.white,fill:{color:C.navy}}},{text:"Effort",options:{bold:true,fontSize:9,color:C.white,fill:{color:C.navy}}},{text:"Phase",options:{bold:true,fontSize:9,color:C.white,fill:{color:C.navy}}}],
    ...rows.map(([feat,status,work,effort,phase],i) => {
      const isNew=status==="Not built";
      const fill={color:i%2===0?C.card:C.white};
      return [
        {text:feat,   options:{fontSize:9,color:C.navy,fill,bold:isNew}},
        {text:status, options:{fontSize:9,color:isNew?C.red:C.amber,fill}},
        {text:work,   options:{fontSize:9,color:C.muted,fill}},
        {text:effort, options:{fontSize:9,bold:true,color:C.teal,fill}},
        {text:phase,  options:{fontSize:9,bold:true,color:C.navy,fill,align:"center"}},
      ];
    }),
  ], { x: 0.3, y: 1.82, w: 9.4, h: 3.6, colW: [2.85,1.4,3.15,1.0,0.5], border: { pt: 0.3, color: C.light } });
  addSlideNumber(s, 16, TOTAL);
  console.log("  Slide 16 done");
}

// ── SLIDE 17 — ROADMAP ──────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionHeader(s, "IMPLEMENTATION ROADMAP");
  sectionTitle(s, "4-Phase Delivery Plan (12 Months)", "Prioritised for maximum security impact — working app by end of Phase 2");
  [{phase:"Phase 1",title:"Security Foundation",months:"Months 1-5",color:"1C3557",items:["Standalone CRYPTA app build","E2E Signal Protocol encryption","Zero local storage + secure viewer","Biometric + PIN lock","Screen capture prevention"]},
   {phase:"Phase 2",title:"Active Protection",months:"Months 6-8",color:"0D9488",items:["Stealth / Decoy mode","Panic Wipe (pastor + admin)","Auto-expiring messages (TTL)","SOS & Duress alert system","Geofencing & location alerts"]},
   {phase:"Phase 3",title:"Command & Intelligence",months:"Months 9-11",color:"7C3AED",items:["Full admin console + dashboard","Pastor management + tiers","Expanded audit trail","AI PastorBot+ field safety","MFA + certificate pinning"]},
   {phase:"Phase 4",title:"Harden & Launch",months:"Month 12",color:"B45309",items:["External pen test (OWASP)","Security audit & remediation","Load & performance testing","UAT with pilot pastors","Go-live + team training"]}].forEach(({phase,title,months,color,items},i) => {
    const x=0.35+i*2.35;
    card(s, x, 1.88, 2.18, 3.6, C.card);
    s.addShape(RECT, { x, y: 1.88, w: 2.18, h: 0.65, fill: { color }, line: { color } });
    s.addText(phase,  { x, y: 1.9,  w: 2.18, h: 0.28, fontSize: 10, bold: true, color: C.amber, align: "center", margin: 0 });
    s.addText(title,  { x, y: 2.18, w: 2.18, h: 0.22, fontSize: 9,  bold: true, color: C.white, align: "center", margin: 0 });
    s.addText(months, { x, y: 2.4,  w: 2.18, h: 0.2,  fontSize: 8.5, color: "B0C4DE", align: "center", italic: true, margin: 0 });
    items.forEach((item,j) => {
      s.addShape(OVAL, { x: x+0.12, y: 2.72+j*0.5, w: 0.11, h: 0.11, fill: { color }, line: { color } });
      s.addText(item, { x: x+0.28, y: 2.68+j*0.5, w: 1.82, h: 0.46, fontSize: 9.5, color: C.slate, margin: 0 });
    });
  });
  addSlideNumber(s, 17, TOTAL);
  console.log("  Slide 17 done");
}

// ── SLIDE 18 — TEAM COMPOSITION ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionHeader(s, "TEAM COMPOSITION");
  sectionTitle(s, "Recommended India Delivery Team", "Specialist roles for security-hardened mobile + web platform build");
  s.addTable([
    [{text:"Role",options:{bold:true,fontSize:10,color:C.white,fill:{color:C.navy}}},{text:"Qty",options:{bold:true,fontSize:10,color:C.white,fill:{color:C.navy}}},{text:"Key Skills",options:{bold:true,fontSize:10,color:C.white,fill:{color:C.navy}}},{text:"Rate / Month",options:{bold:true,fontSize:10,color:C.white,fill:{color:C.navy}}},{text:"Monthly Cost",options:{bold:true,fontSize:10,color:C.white,fill:{color:C.navy}}}],
    ...([
      ["Tech Lead / Architect","1","Security arch, ASP.NET, Signal Protocol","Rs.1,20,000","Rs.1,20,000"],
      ["Sr. Full-Stack Dev (Backend)","2","C# .NET 8, PostgreSQL, E2E crypto, SignalR","Rs.90,000","Rs.1,80,000"],
      ["Sr. Mobile Dev (Capacitor)","1","React + Capacitor, Android/iOS, biometrics","Rs.90,000","Rs.90,000"],
      ["Mid Full-Stack Dev","2","React, .NET, admin console, REST APIs","Rs.65,000","Rs.1,30,000"],
      ["DevOps / Security Engineer","1","AWS/Azure, WAF, CI/CD, pen-test tooling","Rs.90,000","Rs.90,000"],
      ["QA / Security Tester","1","OWASP, API testing, mobile QA, Burp Suite","Rs.55,000","Rs.55,000"],
      ["UI/UX Designer","0.5","Mobile UX, stealth persona design, dashboards","Rs.65,000","Rs.32,500"],
      ["Project Manager","0.5","Agile delivery, client reporting, risk mgmt","Rs.90,000","Rs.45,000"],
    ].map(([role,qty,skills,rate,cost],i) => {
      const fill={color:i%2===0?C.card:C.white};
      return [{text:role,options:{fontSize:10,bold:true,color:C.navy,fill}},{text:qty,options:{fontSize:10,color:C.muted,fill,align:"center"}},{text:skills,options:{fontSize:9.5,color:C.muted,fill}},{text:rate,options:{fontSize:10,color:C.teal,fill,align:"right"}},{text:cost,options:{fontSize:10,bold:true,color:C.navy,fill,align:"right"}}];
    })),
    [{text:"TOTAL MONTHLY TEAM COST",options:{bold:true,fontSize:11,color:C.white,fill:{color:C.navy},colspan:4}},{text:"Rs.6,42,500",options:{bold:true,fontSize:11,color:C.amber,fill:{color:C.navy},align:"right"}}],
  ], { x: 0.3, y: 1.85, w: 9.4, h: 3.65, colW: [2.8,0.45,3.4,1.45,1.3], border: { pt: 0.5, color: C.light } });
  addSlideNumber(s, 18, TOTAL);
  console.log("  Slide 18 done");
}

// ── SLIDE 19 — IMPLEMENTATION COST ──────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionHeader(s, "COMMERCIALS -- IMPLEMENTATION COST");
  sectionTitle(s, "One-Time Implementation Cost (INR)", "12-month delivery · India team · 50% margin applied");
  s.addTable([
    [{text:"Phase",options:{bold:true,fontSize:10,color:C.white,fill:{color:C.navy}}},{text:"Duration",options:{bold:true,fontSize:10,color:C.white,fill:{color:C.navy}}},{text:"Team (FTEs)",options:{bold:true,fontSize:10,color:C.white,fill:{color:C.navy}}},{text:"Base Cost",options:{bold:true,fontSize:10,color:C.white,fill:{color:C.navy}}},{text:"Margin (50%)",options:{bold:true,fontSize:10,color:C.white,fill:{color:C.navy}}},{text:"Billable (INR)",options:{bold:true,fontSize:10,color:C.white,fill:{color:C.navy}}}],
    ...([
      ["P1 - Security Foundation","5 months","8.0 FTEs","Rs.32,12,500","Rs.16,06,250","Rs.48,18,750"],
      ["P2 - Active Protection","3 months","8.0 FTEs","Rs.19,27,500","Rs.9,63,750","Rs.28,91,250"],
      ["P3 - Command & AI","3 months","8.0 FTEs","Rs.19,27,500","Rs.9,63,750","Rs.28,91,250"],
      ["P4 - Harden & Launch","1 month","4.5 FTEs","Rs.4,12,500","Rs.2,06,250","Rs.6,18,750"],
    ].map(([phase,dur,fte,base,margin,bill],i) => {
      const fill={color:i%2===0?C.card:C.white};
      return [{text:phase,options:{fontSize:10,bold:true,color:C.navy,fill}},{text:dur,options:{fontSize:10,color:C.muted,fill}},{text:fte,options:{fontSize:10,color:C.muted,fill}},{text:base,options:{fontSize:10,color:C.slate,fill,align:"right"}},{text:margin,options:{fontSize:10,color:C.amber,fill,align:"right"}},{text:bill,options:{fontSize:10,bold:true,color:C.teal,fill,align:"right"}}];
    })),
    [{text:"TOTAL IMPLEMENTATION",options:{bold:true,fontSize:11,color:C.white,fill:{color:C.navy},colspan:3}},{text:"Rs.74,80,000",options:{bold:true,fontSize:11,color:"B0C4DE",fill:{color:C.navy},align:"right"}},{text:"Rs.37,40,000",options:{bold:true,fontSize:11,color:C.amber,fill:{color:C.navy},align:"right"}},{text:"Rs.1,12,20,000",options:{bold:true,fontSize:12,color:C.amber,fill:{color:C.navy},align:"right"}}],
  ], { x: 0.3, y: 1.85, w: 9.4, h: 2.9, colW: [2.75,1.1,1.25,1.7,1.3,1.3], border: { pt: 0.5, color: C.light } });
  s.addShape(RECT, { x: 0.3, y: 4.95, w: 9.4, h: 0.72, fill: { color: C.navyLight }, line: { color: C.navy, width: 0.5 } });
  s.addText("Notes: Base cost = team rates x duration. Margin = 50% on base. Monthly team cost = Rs.6,42,500.\nPayment: 30% on signing, 20% each at Phase 1/2/3 completion, 10% on go-live.\nPricing excludes platform/infrastructure costs (see next slide).", { x: 0.45, y: 5.0, w: 9.1, h: 0.62, fontSize: 9.5, color: C.navy, margin: 0 });
  addSlideNumber(s, 19, TOTAL);
  console.log("  Slide 19 done");
}

// ── SLIDE 20 — PLATFORM & AMC ───────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionHeader(s, "COMMERCIALS -- PLATFORM & AMC");
  sectionTitle(s, "Annual Platform Costs & AMC (INR)", "Recurring annual costs after go-live");
  card(s, 0.35, 1.88, 4.5, 3.7);
  s.addShape(RECT, { x: 0.35, y: 1.88, w: 4.5, h: 0.52, fill: { color: C.teal }, line: { color: C.teal } });
  s.addText("Platform / Infrastructure (Annual)", { x: 0.45, y: 1.91, w: 4.3, h: 0.47, fontSize: 11, bold: true, color: C.white, valign: "middle", margin: 0 });
  [["AWS / Azure Hosting","Rs.3,60,000"],["WAF + DDoS Protection","Rs.1,80,000"],["Monitoring & Alerts","Rs.1,20,000"],["AI / LLM API","Rs.1,20,000"],["SMS / OTP (Twilio)","Rs.72,000"],["SSL Certificates","Rs.12,000"],["App Store Fees","Rs.12,000"],["Subtotal (Base)","Rs.7,76,000"],["50% Margin","Rs.3,88,000"],["TOTAL PLATFORM (Annual)","Rs.11,64,000"]].forEach(([item,cost],i) => {
    const isTotal=item.startsWith("TOTAL"), isSub=item.startsWith("Subtotal")||item.startsWith("50%");
    const y=2.52+i*0.32;
    s.addShape(RECT, { x: 0.35, y, w: 4.5, h: 0.3, fill: { color: isTotal?C.navy:i%2===0?C.card:C.white }, line: { color: C.light, width: 0.3 } });
    s.addText(item, { x: 0.45, y, w: 3.0, h: 0.3, fontSize: isTotal?10:9.5, bold: isTotal||isSub, color: isTotal?C.amber:C.slate, valign: "middle", margin: 0 });
    s.addText(cost, { x: 3.7,  y, w: 1.0, h: 0.3, fontSize: isTotal?10:9.5, bold: isTotal||isSub, color: isTotal?C.amber:isSub?C.amber:C.teal, align: "right", valign: "middle", margin: 0 });
  });
  card(s, 5.15, 1.88, 4.5, 3.7);
  s.addShape(RECT, { x: 5.15, y: 1.88, w: 4.5, h: 0.52, fill: { color: C.navy }, line: { color: C.navy } });
  s.addText("Annual Maintenance Contract (AMC)", { x: 5.25, y: 1.91, w: 4.3, h: 0.47, fontSize: 11, bold: true, color: C.white, valign: "middle", margin: 0 });
  [["Sr. Dev (Bug Fixes)","Rs.90,000 x 12"],["Mid Dev (Enhancements)","Rs.65,000 x 12"],["DevOps (Infra + Security)","Rs.45,000 x 12"],["QA / Security Testing","Rs.27,500 x 12"],["Support Manager","Rs.22,500 x 12"],["Base Annual Labour","Rs.30,00,000"],["50% Margin","Rs.15,00,000"],["TOTAL AMC (Annual)","Rs.45,00,000"]].forEach(([item,cost],i) => {
    const isTotal=item.startsWith("TOTAL"), isBase=item.startsWith("Base")||item.startsWith("50%");
    const y=2.52+i*0.32;
    s.addShape(RECT, { x: 5.15, y, w: 4.5, h: 0.3, fill: { color: isTotal?C.navy:i%2===0?C.card:C.white }, line: { color: C.light, width: 0.3 } });
    s.addText(item, { x: 5.25, y, w: 2.6, h: 0.3, fontSize: isTotal?10:9.5, bold: isTotal||isBase, color: isTotal?C.amber:C.slate, valign: "middle", margin: 0 });
    s.addText(cost, { x: 8.5,  y, w: 1.0, h: 0.3, fontSize: isTotal?10:9.5, bold: isTotal||isBase, color: isTotal?C.amber:isBase?C.amber:C.teal, align: "right", valign: "middle", margin: 0 });
  });
  addSlideNumber(s, 20, TOTAL);
  console.log("  Slide 20 done");
}

// ── SLIDE 21 — INVESTMENT SUMMARY ───────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.navy };
  s.addShape(RECT, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.amber }, line: { color: C.amber } });
  s.addText("INVESTMENT SUMMARY", { x: 0.5, y: 0.22, w: 9, h: 0.4, fontSize: 11, bold: true, color: C.amber, charSpacing: 3, margin: 0 });
  s.addText("Total Cost of Ownership -- INR (with 50% Margin)", { x: 0.5, y: 0.62, w: 9, h: 0.5, fontSize: 18, color: C.white, margin: 0 });
  s.addTable([
    [{text:"Cost Component",options:{bold:true,fontSize:12,color:C.white,fill:{color:"0F172A"}}},{text:"Year 1 (INR)",options:{bold:true,fontSize:12,color:C.white,fill:{color:"0F172A"},align:"right"}},{text:"Year 2+ Annual (INR)",options:{bold:true,fontSize:12,color:C.white,fill:{color:"0F172A"},align:"right"}}],
    ...([["One-Time Implementation","Rs.1,12,20,000","--"],["Annual Platform Costs","Rs.11,64,000","Rs.11,64,000"],["Annual AMC","Rs.45,00,000","Rs.45,00,000"],["TOTAL","Rs.1,68,84,000","Rs.56,64,000"]].map(([label,y1,y2]) => [
      {text:label,options:{fontSize:12,bold:label==="TOTAL",color:label==="TOTAL"?"0F172A":C.white,fill:{color:label==="TOTAL"?C.amber:"162844"}}},
      {text:y1,   options:{fontSize:12,bold:label==="TOTAL",color:label==="TOTAL"?"0F172A":C.amber,fill:{color:label==="TOTAL"?C.amber:"162844"},align:"right"}},
      {text:y2,   options:{fontSize:12,bold:label==="TOTAL",color:label==="TOTAL"?"0F172A":C.amber,fill:{color:label==="TOTAL"?C.amber:"162844"},align:"right"}},
    ])),
  ], { x: 0.5, y: 1.3, w: 9.0, h: 2.1, colW: [4.5,2.25,2.25], border: { pt: 0.5, color: C.teal } });
  [{val:"Rs.1.68 Cr",lbl:"Total Year 1 Investment"},{val:"Rs.56.6 L",lbl:"Annual Year 2+ Running Cost"},{val:"12 Months",lbl:"Delivery Timeline"},{val:"8 FTEs",lbl:"Peak Team Size"}].forEach(({val,lbl},i) => {
    const x=0.5+i*2.3;
    s.addShape(RECT, { x, y: 3.75, w: 2.1, h: 1.2, fill: { color: "162844" }, line: { color: C.amber, width: 1 } });
    s.addText(val, { x, y: 3.82, w: 2.1, h: 0.55, fontSize: 22, bold: true, color: C.amber, align: "center", valign: "middle", margin: 0 });
    s.addText(lbl, { x, y: 4.38, w: 2.1, h: 0.45, fontSize: 9.5, color: "B0C4DE", align: "center", valign: "middle", margin: 0 });
  });
  addSlideNumber(s, 21, TOTAL, true);
  console.log("  Slide 21 done");
}

// ── SLIDE 22 — NEXT STEPS & CLOSE ───────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: "0F172A" };
  s.addShape(RECT, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.amber }, line: { color: C.amber } });
  s.addText("NEXT STEPS", { x: 0.5, y: 0.22, w: 9, h: 0.4, fontSize: 11, bold: true, color: C.amber, charSpacing: 3, margin: 0 });
  s.addText("From Proposal to Production -- 5 Steps", { x: 0.5, y: 0.65, w: 9, h: 0.5, fontSize: 20, color: C.white, margin: 0 });
  [{step:"1",action:"Proposal Review Meeting",detail:"Walk through scope, features, and commercials with all stakeholders. Address questions and agree on scope boundaries."},
   {step:"2",action:"SOW Finalisation",detail:"Sign Statement of Work. Lock Phase 1 scope and payment milestone schedule."},
   {step:"3",action:"Team Mobilisation",detail:"Assign Tech Lead + team. Set up dev environment, repo, and CI/CD pipeline."},
   {step:"4",action:"Phase 1 Kickoff Sprint",detail:"2-week sprint planning. First deliverable: CRYPTA skeleton app with encryption POC."},
   {step:"5",action:"Monthly Steering Cadence",detail:"Monthly progress demos + burn-down reviews. Admin console demo at Month 9."}].forEach(({step,action,detail},i) => {
    const y=1.32+i*0.75;
    s.addShape(OVAL, { x: 0.4, y: y+0.06, w: 0.52, h: 0.52, fill: { color: C.amber }, line: { color: C.amber } });
    s.addText(step,   { x: 0.4,  y: y+0.06, w: 0.52, h: 0.52, fontSize: 16, bold: true, color: C.navy, align: "center", valign: "middle", margin: 0 });
    s.addText(action, { x: 1.05, y,          w: 8.2,  h: 0.35, fontSize: 13, bold: true, color: C.white, margin: 0 });
    s.addText(detail, { x: 1.05, y: y+0.34,  w: 8.2,  h: 0.38, fontSize: 10.5, color: "B0C4DE", margin: 0 });
  });
  s.addShape(RECT, { x: 0, y: 5.05, w: 10, h: 0.57, fill: { color: C.amber }, line: { color: C.amber } });
  s.addText("CRYPTA  --  Protecting Those Who Protect the Flock", { x: 0.3, y: 5.08, w: 9.4, h: 0.5, fontSize: 16, bold: true, color: C.navy, align: "center", valign: "middle", charSpacing: 1, margin: 0 });
  console.log("  Slide 22 done");
}

// ── WRITE FILE ───────────────────────────────────────────────────────────────
const outFile = path.join(__dirname, "CRYPTA_Proposal_JaiMasih_2026.pptx");
console.log("\nWriting PPTX file...");
try {
  pres.writeFile({ fileName: outFile }).then(() => {
    console.log(`\n✅  SUCCESS! File saved to:\n    ${outFile}`);
  }).catch(err => {
    console.error("\n❌  writeFile rejected:", err && err.message ? err.message : String(err));
    process.exit(1);
  });
} catch (e) {
  console.error("\n❌  writeFile threw:", e && e.message ? e.message : String(e));
  process.exit(1);
}
