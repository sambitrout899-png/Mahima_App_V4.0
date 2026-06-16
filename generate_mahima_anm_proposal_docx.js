/**
 * generate_mahima_anm_proposal_docx.js
 * ─────────────────────────────────────────────────────────────────
 * Generates: ANM_Proposal_Mahima_Platform.docx
 *
 * Revised ANM Mobile App Proposal — powered by Mahima Platform V4.0
 * (Already-built church/community management platform)
 *
 * Run:
 *   npm install -g docx
 *   node generate_mahima_anm_proposal_docx.js
 * ─────────────────────────────────────────────────────────────────
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
  ExternalHyperlink
} = require("docx");
const fs = require("fs");

// ── Colours ───────────────────────────────────────────────────────
const NAVY   = "1B2F6E";
const GREEN  = "059669";
const GOLD   = "F0A500";
const WHITE  = "FFFFFF";
const BGBLUE = "EFF6FF";
const BGGRN  = "ECFDF5";
const BGGOLD = "FFFBEB";
const LIGHT  = "F8FBF9";
const MUTED  = "64748B";
const BORDER = "CBD5E1";

// ── Border helper ─────────────────────────────────────────────────
const bdr = (color = BORDER, sz = 4) => ({
  style: BorderStyle.SINGLE, size: sz, color
});
const cellBorders = (color = BORDER) => ({
  top: bdr(color), bottom: bdr(color), left: bdr(color), right: bdr(color)
});
const noBorder = () => ({
  top: { style: BorderStyle.NONE },
  bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE },
  right: { style: BorderStyle.NONE },
});
const shade = (fill, type = ShadingType.CLEAR) => ({ fill, type });
const cellPad = { top: 120, bottom: 120, left: 160, right: 160 };
const cellPadSm = { top: 80, bottom: 80, left: 120, right: 120 };

// ── Text helpers ──────────────────────────────────────────────────
const run = (text, opts = {}) =>
  new TextRun({ text, font: "Calibri", size: opts.size || 22, ...opts });

const bold = (text, opts = {}) =>
  new TextRun({ text, font: "Calibri", size: opts.size || 22, bold: true, ...opts });

const para = (children, opts = {}) =>
  new Paragraph({
    children: Array.isArray(children) ? children : [children],
    spacing: { after: opts.after ?? 160, before: opts.before ?? 0 },
    alignment: opts.align || AlignmentType.LEFT,
    ...opts,
  });

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, font: "Calibri", size: 36, bold: true, color: NAVY })],
    spacing: { before: 480, after: 160 },
    border: { bottom: bdr(GREEN, 8) },
  });

const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, font: "Calibri", size: 28, bold: true, color: NAVY })],
    spacing: { before: 360, after: 120 },
  });

const h3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, font: "Calibri", size: 24, bold: true, color: GREEN })],
    spacing: { before: 240, after: 80 },
  });

const bullet = (text, indent = 360) =>
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [run(text)],
    spacing: { after: 80 },
    indent: { left: indent, hanging: 360 },
  });

const sub = (text) =>
  para([run(text, { color: MUTED, size: 20, italics: true })], { after: 80 });

const divider = () =>
  new Paragraph({
    border: { bottom: bdr(BORDER, 4) },
    spacing: { before: 240, after: 240 },
    children: [],
  });

const pageBreak = () =>
  new Paragraph({ children: [new PageBreak()] });

// ── Table helpers ─────────────────────────────────────────────────
const headerCell = (text, width, bg = NAVY, color = WHITE) =>
  new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: shade(bg),
    borders: cellBorders(bg),
    margins: cellPadSm,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [bold(text, { color, size: 20 })],
        spacing: { after: 0 },
      }),
    ],
  });

const dataCell = (text, width, bg = WHITE, color = "000000", align = AlignmentType.LEFT, isBold = false) =>
  new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: shade(bg),
    borders: cellBorders(BORDER),
    margins: cellPadSm,
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text, font: "Calibri", size: 20, color, bold: isBold })],
        spacing: { after: 0 },
      }),
    ],
  });

// Full content width: A4 with 1" margins = 11906 - 2 × 1440 = 9026 DXA
const TW = 9026;

// ── Coloured highlight box ─────────────────────────────────────────
const infoBox = (lines, bg = BGGRN, borderColor = GREEN) =>
  new Table({
    width: { size: TW, type: WidthType.DXA },
    columnWidths: [TW],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: TW, type: WidthType.DXA },
            shading: shade(bg),
            borders: {
              top: bdr(borderColor, 8),
              bottom: bdr(BORDER),
              left: bdr(BORDER),
              right: bdr(BORDER),
            },
            margins: cellPad,
            children: lines.map((l) =>
              new Paragraph({
                children: Array.isArray(l) ? l : [run(l, { size: 20 })],
                spacing: { after: 80 },
              })
            ),
          }),
        ],
      }),
    ],
  });

// ── Code block ────────────────────────────────────────────────────
const codeBlock = (lines) =>
  new Table({
    width: { size: TW, type: WidthType.DXA },
    columnWidths: [TW],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: TW, type: WidthType.DXA },
            shading: shade("1E293B"),
            borders: cellBorders("334155"),
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: lines.map((l) =>
              new Paragraph({
                children: [new TextRun({ text: l, font: "Courier New", size: 18, color: "86EFAC" })],
                spacing: { after: 40 },
              })
            ),
          }),
        ],
      }),
    ],
  });

// ── Two-column feature table ──────────────────────────────────────
const featureTable = (rows) => {
  const COL = TW / 2;
  return new Table({
    width: { size: TW, type: WidthType.DXA },
    columnWidths: [COL, COL],
    rows: [
      new TableRow({
        children: [
          headerCell("ANM App Feature", COL, NAVY),
          headerCell("Mahima Platform Module  ·  Status", COL, GREEN),
        ],
      }),
      ...rows.map(([feat, status, bg], i) =>
        new TableRow({
          children: [
            dataCell(feat, COL, i % 2 === 0 ? BGBLUE : WHITE),
            dataCell(status, COL, i % 2 === 0 ? BGGRN : WHITE, GREEN, AlignmentType.LEFT, true),
          ],
        })
      ),
    ],
  });
};

// ── Three-column AMC table ────────────────────────────────────────
const amcTable = (rows) => {
  const C = [3000, 2100, 2100, 1826];
  return new Table({
    width: { size: TW, type: WidthType.DXA },
    columnWidths: C,
    rows: [
      new TableRow({
        children: [
          headerCell("Feature", C[0], NAVY),
          headerCell("Starter Care", C[1], "0D9488"),
          headerCell("Pro Care ★", C[2], GREEN),
          headerCell("Enterprise", C[3], "7C3AED"),
        ],
      }),
      ...rows.map(([f, s, p, e], i) =>
        new TableRow({
          children: [
            dataCell(f, C[0], i % 2 === 0 ? LIGHT : WHITE, NAVY, AlignmentType.LEFT, f.startsWith("Monthly") || f.startsWith("Annual")),
            dataCell(s, C[1], i % 2 === 0 ? "ECFDF5" : WHITE, s === "✓" ? GREEN : (s === "—" ? MUTED : "000000"), AlignmentType.CENTER),
            dataCell(p, C[2], i % 2 === 0 ? "ECFDF5" : WHITE, p === "✓" ? GREEN : (p === "—" ? MUTED : "000000"), AlignmentType.CENTER, true),
            dataCell(e, C[3], i % 2 === 0 ? "F5F3FF" : WHITE, e === "✓" ? GREEN : (e === "—" ? MUTED : "000000"), AlignmentType.CENTER),
          ],
        })
      ),
    ],
  });
};

// ════════════════════════════════════════════════════════════════════
// DOCUMENT
// ════════════════════════════════════════════════════════════════════
const doc = new Document({
  creator: "Mahima Platform Team",
  title: "ANM App — Revised Proposal (Mahima Platform V4.0)",
  description: "Revised ANM mobile app proposal using Mahima Platform V4.0 as the ready-built solution",

  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
      {
        reference: "check",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "✓",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  },

  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22 } },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Calibri", color: NAVY },
        paragraph: { spacing: { before: 480, after: 160 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Calibri", color: NAVY },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Calibri", color: GREEN },
        paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 2 },
      },
    ],
  },

  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },

    headers: {
      default: new Header({
        children: [
          new Paragraph({
            children: [
              bold("ANM App  ·  Mahima Platform V4.0  ", { color: NAVY, size: 18 }),
              run("·  Revised Proposal", { color: MUTED, size: 18 }),
            ],
            spacing: { after: 0 },
            border: { bottom: bdr(GREEN, 6) },
          }),
        ],
      }),
    },

    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            children: [
              run("Confidential  ·  Mahima Platform V4.0  ·  ", { color: MUTED, size: 18 }),
              run("Page ", { color: MUTED, size: 18 }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 18, color: MUTED }),
              run(" of ", { color: MUTED, size: 18 }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Calibri", size: 18, color: MUTED }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 0, after: 0 },
            border: { top: bdr(BORDER, 4) },
          }),
        ],
      }),
    },

    children: [

      // ── COVER ────────────────────────────────────────────────────
      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [TW],
        rows: [new TableRow({ children: [new TableCell({
          width: { size: TW, type: WidthType.DXA },
          shading: shade(NAVY),
          borders: cellBorders(NAVY),
          margins: { top: 720, bottom: 720, left: 640, right: 640 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "📱  MOBILE APP PROPOSAL", font: "Calibri", size: 22, color: GOLD, bold: true })],
              spacing: { after: 200 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "ANM App", font: "Calibri", size: 72, bold: true, color: WHITE })],
              spacing: { after: 120 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "Powered by Mahima Platform V4.0", font: "Calibri", size: 30, color: GOLD })],
              spacing: { after: 360 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "✓  Ready-Built Platform  ·  6-Week Delivery  ·  iOS & Android", font: "Calibri", size: 22, color: "86EFAC" })],
              spacing: { after: 480 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "Prepared by: Your Company Name  |  June 2025", font: "Calibri", size: 20, color: "93C5FD" })],
              spacing: { after: 0 },
            }),
          ],
        })]})],
      }),

      para([run("")], { after: 320 }),

      infoBox([
        [bold("Why Mahima Platform?", { color: GREEN, size: 22 })],
        [run("Mahima App V4.0 is a production-grade church & community management platform that already includes ", { size: 20 }),
         bold("every core feature ", { size: 20, color: NAVY }),
         run("listed in this ANM App proposal — Members, Prayer Requests, Videos, Chat, Calling, Member History, and more. ", { size: 20 }),
         run("Instead of building from scratch (8–10 weeks, high risk), we deliver a ", { size: 20 }),
         bold("customised, branded, production-ready ANM App in 6 weeks ", { size: 20, color: GREEN }),
         run("— at significantly lower cost and zero feature risk.", { size: 20 })],
      ], BGGRN, GREEN),

      pageBreak(),

      // ── 1. EXECUTIVE SUMMARY ─────────────────────────────────────
      h1("1. Executive Summary"),

      para([run(
        "The ANM App is designed to provide a simple and effective way to connect members, share video resources, and submit prayer requests. The app enables church members and community participants to stay connected, request support, and communicate through calls and messages."
      )]),

      para([
        bold("This revised proposal presents Mahima Platform V4.0 ", { color: NAVY }),
        run("as the solution — an already-built, production-deployed church and community management platform that directly meets all ANM App requirements without the cost and risk of a greenfield build."),
      ]),

      h2("What This Proposal Delivers"),

      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [TW / 2, TW / 2],
        rows: [
          new TableRow({ children: [headerCell("Original ANM Proposal", TW/2, NAVY), headerCell("Revised — Mahima Platform", TW/2, GREEN)] }),
          ...[
            ["Greenfield build required", "✓  Production platform — already built"],
            ["8–10 weeks to go-live", "✓  6 weeks to customised go-live"],
            ["High delivery risk", "✓  Low risk — battle-tested codebase"],
            ["Members & profiles only", "✓  Members + Teams + Groups + Analytics"],
            ["Prayer requests basic", "✓  Full lifecycle: submit → assign → close → testify"],
            ["Video sharing planned", "✓  Sermon/media library — already built"],
            ["Chat + VoIP planned", "✓  Twilio chat + VoIP — already integrated"],
            ["Push notifications (Phase 2)", "✓  Admin notifications + automation — ready now"],
            ["Multi-language (Phase 2)", "✓  Admin-controlled UI translation — ready now"],
            ["Admin dashboard (Phase 2)", "✓  Full admin landing + analytics — ready now"],
            ["AI Assistant not included", "✓  Built-in AI Health/Community Bot"],
          ].map(([orig, mah], i) =>
            new TableRow({ children: [
              dataCell(orig, TW/2, i % 2 === 0 ? "FEF2F2" : WHITE, "991B1B"),
              dataCell(mah, TW/2, i % 2 === 0 ? BGGRN : WHITE, GREEN, AlignmentType.LEFT, true),
            ]})
          ),
        ],
      }),

      pageBreak(),

      // ── 2. OBJECTIVES & GOALS ─────────────────────────────────────
      h1("2. Objectives & Goals"),

      para([run("The ANM App objectives remain the same — Mahima Platform V4.0 delivers all of them out-of-the-box:")]),

      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [4200, 4826],
        rows: [
          new TableRow({ children: [headerCell("Objective", 4200, NAVY), headerCell("Mahima Platform — Delivery", 4826, GREEN)] }),
          ...[
            ["Centralised platform for ANM members", "User directory, profiles, RBAC — fully built & tested"],
            ["View member details, history, activities", "Member profiles + counselling history + audit logs"],
            ["Quick communication — messaging & calling", "Twilio chat, direct messaging & VoIP calling — live"],
            ["Video sharing & prayer request space", "Sermon/media library + Prayer Requests module"],
            ["Simple, intuitive UI for all age groups", "Clean Ionic/React UI — designed for broad accessibility"],
          ].map(([obj, del], i) =>
            new TableRow({ children: [
              dataCell(obj, 4200, i % 2 === 0 ? BGBLUE : WHITE),
              dataCell(del, 4826, i % 2 === 0 ? BGGRN : WHITE, GREEN, AlignmentType.LEFT, true),
            ]})
          ),
        ],
      }),

      // ── 3. TARGET AUDIENCE ────────────────────────────────────────
      h1("3. Target Audience"),

      para([run("The target audience for the ANM App aligns precisely with Mahima Platform's user roles:")]),

      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [3000, 3000, 3026],
        rows: [
          new TableRow({ children: [headerCell("ANM Target Audience", 3000, NAVY), headerCell("Mahima Role", 3000, GREEN), headerCell("Permissions", 3026, GREEN)] }),
          ...[
            ["Church/community members", "Member role", "View content, submit prayer requests, chat, view videos"],
            ["Group leaders / administrators", "Admin / Staff role", "Manage members, approve requests, post videos, run reports"],
            ["Volunteers offering support", "Volunteer role", "Respond to prayer requests, view assignments, chat"],
          ].map(([aud, role, perm], i) =>
            new TableRow({ children: [
              dataCell(aud, 3000, i % 2 === 0 ? BGBLUE : WHITE),
              dataCell(role, 3000, i % 2 === 0 ? BGGRN : WHITE, GREEN, AlignmentType.CENTER, true),
              dataCell(perm, 3026, i % 2 === 0 ? LIGHT : WHITE, MUTED),
            ]})
          ),
        ],
      }),

      pageBreak(),

      // ── 4. FEATURES & FUNCTIONALITY ───────────────────────────────
      h1("4. Features & Functionality"),

      h2("4a. Core Features — Already Built in Mahima"),

      featureTable([
        ["Home Page — Central dashboard", "Admin Landing + Analytics Dashboard  ✓ Ready"],
        ["Navigation Menu — Members, Video, Prayer", "Bottom navigation — Mahima UI includes all sections  ✓ Ready"],
        ["Members Directory — Registered members list", "Users module with search, filter, profile cards  ✓ Ready"],
        ["Video Section — Resource/media sharing", "Sermon/Media library with S3-hosted videos  ✓ Ready"],
        ["Prayer Request Section — Submit & view", "Prayer Requests module — submit, assign, close  ✓ Ready"],
        ["Member Detail Page — Profile, call, message", "User profile + Twilio Chat + VoIP calling  ✓ Ready"],
        ["Member History — Notes, support logs, timestamps", "Counselling sessions + Audit logs per member  ✓ Ready"],
      ]),

      h2("4b. Phase 2 Enhancements — Also Already Built"),

      para([run("Features the original proposal listed as Phase 2 are already included in Mahima V4.0:")]),

      featureTable([
        ["Push notifications (prayer requests, video updates)", "Admin Notifications + Automation scheduler  ✓ Ready"],
        ["Group chat or discussion forum", "Group chats with read receipts + Socket.IO real-time  ✓ Ready"],
        ["Multi-language support", "Admin-controlled UI language translations  ✓ Ready"],
        ["Admin dashboard (web-based)", "Full analytics dashboard — users, tasks, prayer overview  ✓ Ready"],
        ["Bulk SMS broadcast", "Twilio bulk SMS + automated message scheduler  ✓ Bonus"],
        ["AI community assistant", "Built-in AI bot (OpenAI-compatible)  ✓ Bonus"],
        ["Expense & payroll tracking", "Accounting, expenses, payroll module  ✓ Bonus"],
        ["Attendance tracking", "Daily attendance records per member  ✓ Bonus"],
        ["Meetings & event scheduling", "Meetings with GPS location, RSVP  ✓ Bonus"],
        ["Audit trail & compliance", "Full audit log on all user actions  ✓ Bonus"],
      ]),

      pageBreak(),

      // ── 5. TECHNOLOGY STACK ───────────────────────────────────────
      h1("5. Technology Stack"),

      para([
        run("Mahima Platform V4.0 uses an "),
        bold("enterprise-grade technology stack ", { color: NAVY }),
        run("that exceeds the original ANM proposal requirements. Comparison below:"),
      ]),

      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [2200, 3200, 3626],
        rows: [
          new TableRow({ children: [headerCell("Layer", 2200, NAVY), headerCell("Original ANM Proposal", 3200, "64748B"), headerCell("Mahima Platform V4.0", 3626, GREEN)] }),
          ...[
            ["Mobile Frontend", "React Native / Flutter", "React + Ionic/Capacitor (iOS & Android native)"],
            ["Backend", "Node.js with Express.js", "ASP.NET Core .NET 8 (C#) — enterprise-grade"],
            ["Database", "MongoDB / PostgreSQL", "PostgreSQL via EF Core 8 (structured, relational)"],
            ["APIs", "REST APIs", "REST APIs + SignalR/Socket.IO (real-time)"],
            ["Authentication", "Firebase Auth / JWT", "Firebase Auth + JWT + Google OAuth 2.0"],
            ["Hosting", "AWS / Google Cloud", "AWS EC2 + RDS + S3 + CloudFront"],
            ["Chat & VoIP", "Twilio / Firebase", "Twilio SMS + VoIP — already integrated"],
            ["Email", "Not specified", "MailKit SMTP — already integrated"],
            ["PDF Generation", "Not specified", "iText7 + QuestPDF — certificates, reports"],
            ["AI Assistant", "Not specified", "OpenAI-compatible LLM — already integrated"],
            ["File Storage", "S3/CDN mentioned", "AWS S3 + CloudFront — already connected"],
          ].map(([layer, orig, mah], i) =>
            new TableRow({ children: [
              dataCell(layer, 2200, i % 2 === 0 ? LIGHT : WHITE, NAVY, AlignmentType.LEFT, true),
              dataCell(orig, 3200, i % 2 === 0 ? "FEF9C3" : WHITE, "78350F"),
              dataCell(mah, 3626, i % 2 === 0 ? BGGRN : WHITE, GREEN, AlignmentType.LEFT, true),
            ]})
          ),
        ],
      }),

      para([run("")], { after: 120 }),

      infoBox([
        [bold("Why .NET 8 over Node.js?", { color: NAVY, size: 20 })],
        [run("ASP.NET Core .NET 8 is Microsoft's enterprise-grade, high-performance framework — ideal for community/church apps handling sensitive member data. It offers built-in dependency injection, strong typing, EF Core ORM, and superior performance under load compared to Node.js/Express. PostgreSQL provides ACID compliance, relational integrity, and better query performance for member history and reporting than MongoDB.", { size: 20 })],
      ], BGBLUE, NAVY),

      pageBreak(),

      // ── 6. DATABASE DESIGN ────────────────────────────────────────
      h1("6. Database Design"),

      para([
        run("Mahima Platform uses "),
        bold("PostgreSQL ", { color: NAVY }),
        run("with Entity Framework Core 8 migrations — production-tested, fully normalised. Below are the Mahima table equivalents for each MongoDB collection in the original proposal:"),
      ]),

      h3("a) Users Table  (equivalent to users collection)"),
      sub("Already exists in Mahima — zero build required"),
      codeBlock([
        "CREATE TABLE Users (",
        "  Id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),",
        "  Name       VARCHAR(200)  NOT NULL,",
        "  Email      VARCHAR(200)  UNIQUE NOT NULL,",
        "  Phone      VARCHAR(20),",
        "  Role       VARCHAR(50)   DEFAULT 'member', -- member | admin | staff | volunteer",
        "  ProfilePicS3Key  TEXT,  -- S3 key for profile photo",
        "  GoogleId   VARCHAR(200),  -- Firebase / Google OAuth",
        "  CreatedAt  TIMESTAMPTZ  DEFAULT now(),",
        "  UpdatedAt  TIMESTAMPTZ  DEFAULT now()",
        ");",
        "CREATE UNIQUE INDEX idx_users_email ON Users(Email);",
      ]),

      h3("b) Sermons Table  (equivalent to videos collection)"),
      sub("Already exists in Mahima as sermon/media records"),
      codeBlock([
        "CREATE TABLE Sermons (",
        "  Id          BIGINT       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,",
        "  Title       TEXT         NOT NULL,",
        "  Description TEXT,",
        "  S3Key       TEXT,        -- S3 key; served via CloudFront CDN",
        "  ThumbnailS3Key TEXT,",
        "  UploadedBy  UUID         REFERENCES Users(Id),",
        "  UploadedAt  TIMESTAMPTZ  DEFAULT now(),",
        "  ViewCount   INT          DEFAULT 0",
        ");",
        "CREATE INDEX idx_sermons_uploader ON Sermons(UploadedBy);",
      ]),

      h3("c) PrayerRequests Table  (equivalent to prayer_requests collection)"),
      sub("Already exists in Mahima — full status lifecycle built-in"),
      codeBlock([
        "CREATE TABLE prayerrequests (",
        "  id          BIGINT       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,",
        "  userid      UUID         REFERENCES Users(Id),",
        "  title       VARCHAR(500),",
        "  message     TEXT,",
        "  anonymous   BOOLEAN      DEFAULT false,",
        "  status      VARCHAR(50)  DEFAULT 'open', -- open | assigned | closed | testified",
        "  assignedto  UUID         REFERENCES Users(Id),",
        "  createdat   TIMESTAMPTZ  DEFAULT now(),",
        "  createdby   VARCHAR(200),",
        "  closecomment TEXT",
        ");",
        "CREATE INDEX idx_pr_status ON prayerrequests(status);",
        "CREATE INDEX idx_pr_user   ON prayerrequests(userid);",
      ]),

      para([run("")], { after: 80 }),

      infoBox([
        [bold("Prayer Request Responses: ", { color: GREEN, size: 20 }),
         run("Stored in a separate PrayerResponses table with responderId → UserId FK, message TEXT, and timestamp — fully normalised, indexed for fast dashboard queries.", { size: 20 })],
      ], BGGRN, GREEN),

      h3("d) Member History  (equivalent to member_history collection)"),
      sub("Covered by Mahima's CounsellingSession + AuditLogs"),
      codeBlock([
        "-- Counselling sessions = structured member interaction history",
        "CREATE TABLE CounsellingSessions (",
        "  Id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),",
        "  CaseId      UUID         REFERENCES CounsellingCases(Id),",
        "  CandidateId UUID         REFERENCES Users(Id),  -- the member",
        "  Notes       TEXT,        -- free-form interaction notes",
        "  SessionBy   UUID         REFERENCES Users(Id),  -- admin / volunteer",
        "  SessionAt   TIMESTAMPTZ  DEFAULT now()",
        ");",
        "",
        "-- AuditLogs = every system action on a member",
        "CREATE TABLE AuditLogs (",
        "  Id          BIGINT       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,",
        "  ActorId     UUID,        -- who took the action",
        "  Action      TEXT,        -- 'CALL_MADE', 'PRAYER_CLOSED', etc.",
        "  EntityType  TEXT,        -- 'User', 'PrayerRequest', etc.",
        "  EntityId    TEXT,",
        "  Details     TEXT,",
        "  CreatedAt   TIMESTAMPTZ  DEFAULT now()",
        ");",
      ]),

      h3("e) Messages Table  (equivalent to messages collection)"),
      sub("Already exists in Mahima — with group chats, read receipts, and real-time via Socket.IO"),
      codeBlock([
        "CREATE TABLE Chats (",
        "  Id          BIGINT       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,",
        "  Name        TEXT,        -- null for 1-on-1 DMs",
        "  IsGroup     BOOLEAN      DEFAULT false",
        ");",
        "",
        "CREATE TABLE Messages (",
        "  Id          BIGINT       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,",
        "  ChatId      BIGINT       REFERENCES Chats(Id),",
        "  SenderId    UUID         REFERENCES Users(Id),",
        "  Content     TEXT,",
        "  MessageType TEXT         DEFAULT 'text', -- text | image | file | voip",
        "  SentAt      TIMESTAMPTZ  DEFAULT now()",
        ");",
        "CREATE INDEX idx_msgs_chat   ON Messages(ChatId, SentAt DESC);",
        "CREATE INDEX idx_msgs_sender ON Messages(SenderId);",
      ]),

      pageBreak(),

      // ── 7. MAHIMA PLATFORM OVERVIEW ────────────────────────────────
      h1("7. Mahima Platform V4.0 — What's Pre-Built"),

      para([run("The following 20+ modules are already built, tested, and in production in Mahima V4.0. Every module is immediately available for the ANM App with configuration and branding — no new code required:")]),

      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [300, 2100, 3300, 3326],
        rows: [
          new TableRow({ children: [
            headerCell("#", 300, NAVY),
            headerCell("Module", 2100, NAVY),
            headerCell("Description", 3300, NAVY),
            headerCell("ANM App Use", 3326, GREEN),
          ]}),
          ...[
            ["1", "User & Role Management", "RBAC, profiles, Google OAuth + JWT", "Member registration, login, role assignment"],
            ["2", "Teams & Groups", "Create groups, assign leaders, bulk members", "Ministry teams, volunteer groups, committees"],
            ["3", "Meetings & Events", "Schedule with GPS, RSVP, attendance", "Church events, prayer meetings, home visits"],
            ["4", "Prayer Requests", "Submit, assign, close, testify", "Core ANM prayer request workflow"],
            ["5", "Sermon / Media Library", "S3-hosted videos with CDN thumbnails", "ANM video sharing section"],
            ["6", "Member Counselling", "Candidates, sessions, case notes", "Member history & support logs"],
            ["7", "Chat & Direct Messaging", "Group chats, DMs, read receipts", "Member-to-member and admin messaging"],
            ["8", "Twilio VoIP & SMS", "In-app calling + bulk SMS", "Quick call from member profile page"],
            ["9", "Task Management", "Assign tasks, track completion", "Volunteer duty assignments"],
            ["10", "Attendance Records", "Daily check-in per member", "Meeting/event attendance tracking"],
            ["11", "Expense & Payroll", "Category expenses, payroll PDFs", "Church finance management"],
            ["12", "Analytics Dashboard", "User, prayer, task analytics", "Admin overview of community health"],
            ["13", "Admin Notifications", "Push alerts + scheduled automation", "Prayer request alerts, video updates"],
            ["14", "Multi-Language CMS", "Admin-controlled UI translations", "Local language support for members"],
            ["15", "PDF Generation", "iText7 + QuestPDF", "Prayer certificates, payslips, reports"],
            ["16", "Google Drive Integration", "Document sync + storage", "Shared resource library"],
            ["17", "AI Community Bot", "OpenAI-compatible assistant", "ANM member support chatbot"],
            ["18", "Audit Logs", "Full action trail per member", "Member history & compliance"],
            ["19", "File Attachments", "AWS S3 upload/download", "Member documents, media upload"],
            ["20", "Baptism / Registration Workflow", "Form → review → approve → certificate", "New member registration workflow"],
          ].map(([num, mod, desc, use], i) =>
            new TableRow({ children: [
              dataCell(num, 300, i % 2 === 0 ? BGBLUE : WHITE, NAVY, AlignmentType.CENTER, true),
              dataCell(mod, 2100, i % 2 === 0 ? BGBLUE : WHITE, NAVY, AlignmentType.LEFT, true),
              dataCell(desc, 3300, i % 2 === 0 ? BGBLUE : WHITE, MUTED),
              dataCell(use, 3326, i % 2 === 0 ? BGGRN : WHITE, GREEN),
            ]})
          ),
        ],
      }),

      pageBreak(),

      // ── 8. DEVELOPMENT PLAN & TIMELINE ───────────────────────────
      h1("8. Development Plan & Timeline"),

      para([
        run("Since Mahima Platform V4.0 already includes all core ANM App features, the project is a "),
        bold("customisation & configuration engagement ", { color: GREEN }),
        run("— not a greenfield build. This reduces the timeline from 8–10 weeks to "),
        bold("6 weeks + 2 weeks free hypercare:", { color: NAVY }),
      ]),

      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [1800, 1400, 2400, 3426],
        rows: [
          new TableRow({ children: [
            headerCell("Phase", 1800, NAVY),
            headerCell("Duration", 1400, NAVY),
            headerCell("Deliverables", 2400, NAVY),
            headerCell("Activities", 3426, NAVY),
          ]}),
          ...[
            ["Phase 1\nKickoff & Discovery", "Weeks 1–2",
             "Signed-off scope, UI wireframes, dev env setup",
             "Requirements mapping, ANM branding wireframes, vocabulary alignment (member/video/prayer), architecture review"],
            ["Phase 2\nCustomisation", "Weeks 3–4",
             "Branded ANM UI, configured roles, adapted workflows",
             "ANM theme & logo, rename modules, configure Member/Video/Prayer roles and permissions"],
            ["Phase 3\nANM-Specific Config", "Week 5",
             "Full ANM feature set live on staging",
             "Video upload workflow, prayer request categories, member history views, AI bot prompt for ANM context"],
            ["Phase 4\nTesting & App Store", "Week 6",
             "iOS + Android builds, App Store submissions",
             "QA testing, Capacitor iOS build, Play Store + App Store submissions, UAT with ANM admin"],
            ["FREE Hypercare\n(1 month)", "Weeks 7–8",
             "Bug fixes, monitoring, onboarding",
             "Same-day bug fixes, CloudWatch monitoring, admin training, go-live health check"],
          ].map(([phase, dur, del, act], i) =>
            new TableRow({ children: [
              new TableCell({
                width: { size: 1800, type: WidthType.DXA },
                shading: shade(i === 4 ? BGGOLD : (i % 2 === 0 ? BGBLUE : WHITE)),
                borders: cellBorders(BORDER),
                margins: cellPadSm,
                children: [
                  ...phase.split("\n").map((line, j) =>
                    new Paragraph({
                      children: [new TextRun({ text: line, font: "Calibri", size: 20, bold: j === 0, color: i === 4 ? "92400E" : NAVY })],
                      spacing: { after: 40 },
                    })
                  )
                ],
              }),
              dataCell(dur, 1400, i === 4 ? BGGOLD : (i % 2 === 0 ? BGBLUE : WHITE), i === 4 ? "92400E" : GREEN, AlignmentType.CENTER, true),
              dataCell(del, 2400, i === 4 ? BGGOLD : (i % 2 === 0 ? BGBLUE : WHITE), i === 4 ? "92400E" : NAVY),
              dataCell(act, 3426, i === 4 ? BGGOLD : (i % 2 === 0 ? BGBLUE : WHITE), MUTED),
            ]})
          ),
        ],
      }),

      para([run("")], { after: 120 }),

      infoBox([
        [bold("Total Estimated Timeline: 6 Weeks  ", { color: GREEN, size: 22 }),
         run("(vs 8–10 weeks for greenfield build)", { color: MUTED, size: 20 })],
        [run("Milestone review at end of each phase  ·  Weekly status reports every Friday  ·  Free 1-month hypercare post go-live", { size: 20, color: MUTED })],
      ], BGGRN, GREEN),

      pageBreak(),

      // ── 9. RESOURCE PLAN ─────────────────────────────────────────
      h1("9. Resource Plan"),

      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [2200, 900, 700, 700, 700, 700, 700, 700, 600, 600, 1026],
        rows: [
          new TableRow({ children: [
            headerCell("Role", 2200, NAVY),
            headerCell("Day Rate", 900, NAVY),
            headerCell("W1", 700, NAVY),
            headerCell("W2", 700, NAVY),
            headerCell("W3", 700, NAVY),
            headerCell("W4", 700, NAVY),
            headerCell("W5", 700, NAVY),
            headerCell("W6", 700, NAVY),
            headerCell("HC1", 600, "D49200"),
            headerCell("HC2", 600, "D49200"),
            headerCell("Total Days", 1026, GREEN),
          ]}),
          ...[
            ["Project Manager",        "$900",   4, 4, 3, 2, 2, 3, 1, 1, 20],
            ["Solution Architect",     "$1,200", 4, 3, 1, 0, 0, 1, 0, 0,  9],
            ["UI/UX Designer",         "$800",   4, 4, 2, 0, 0, 0, 0, 0, 10],
            ["Full-Stack Dev (.NET)",  "$950",   1, 2, 5, 5, 3, 1, 1, 0, 18],
            ["Mobile Developer",       "$950",   0, 1, 3, 4, 5, 3, 1, 1, 18],
            ["DevOps Engineer",        "$850",   2, 2, 1, 1, 1, 3, 1, 1, 12],
            ["QA Engineer",            "$750",   0, 0, 1, 1, 2, 3, 1, 0,  8],
          ].map(([role, rate, ...nums], i) =>
            new TableRow({ children: [
              dataCell(role, 2200, i % 2 === 0 ? BGBLUE : WHITE, NAVY, AlignmentType.LEFT, true),
              dataCell(rate, 900, i % 2 === 0 ? BGBLUE : WHITE, NAVY, AlignmentType.CENTER),
              ...[0,1,2,3,4,5,6,7].map(wi =>
                new TableCell({
                  width: { size: wi >= 6 ? 600 : 700, type: WidthType.DXA },
                  shading: shade(nums[wi] > 0 ? (wi >= 6 ? "FEF9C3" : BGGRN) : (i % 2 === 0 ? BGBLUE : WHITE)),
                  borders: cellBorders(BORDER),
                  margins: cellPadSm,
                  children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: nums[wi] > 0 ? String(nums[wi]) : "—", font: "Calibri", size: 20, bold: nums[wi] > 0, color: nums[wi] > 0 ? (wi >= 6 ? "92400E" : GREEN) : MUTED })],
                    spacing: { after: 0 },
                  })],
                })
              ),
              new TableCell({
                width: { size: 1026, type: WidthType.DXA },
                shading: shade(BGGRN),
                borders: cellBorders(GREEN),
                margins: cellPadSm,
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [bold(String(nums[8]) + " d", { color: GREEN, size: 20 })], spacing: { after: 0 } })],
              }),
            ]})
          ),
          new TableRow({ children: [
            new TableCell({ width: { size: 2200, type: WidthType.DXA }, shading: shade(NAVY), borders: cellBorders(NAVY), margins: cellPadSm, children: [new Paragraph({ children: [bold("TOTAL", { color: WHITE, size: 20 })], spacing: { after: 0 } })] }),
            new TableCell({ width: { size: 900, type: WidthType.DXA }, shading: shade(NAVY), borders: cellBorders(NAVY), margins: cellPadSm, children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "", font: "Calibri", size: 20 })] })] }),
            ...[16, 16, 16, 13, 13, 14, 5, 3].map((tot, wi) =>
              new TableCell({
                width: { size: wi >= 6 ? 600 : 700, type: WidthType.DXA },
                shading: shade(NAVY),
                borders: cellBorders(NAVY),
                margins: cellPadSm,
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [bold(String(tot), { color: GOLD, size: 20 })], spacing: { after: 0 } })],
              })
            ),
            new TableCell({ width: { size: 1026, type: WidthType.DXA }, shading: shade(NAVY), borders: cellBorders(NAVY), margins: cellPadSm, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [bold("95 d", { color: GOLD, size: 22 })], spacing: { after: 0 } })] }),
          ]}),
        ],
      }),

      pageBreak(),

      // ── 10. PRICING ──────────────────────────────────────────────
      h1("10. Pricing"),

      h2("10a. One-Time Customisation Investment"),

      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [4000, 2500, 2526],
        rows: [
          new TableRow({ children: [headerCell("Role", 4000, NAVY), headerCell("Days × Rate", 2500, NAVY), headerCell("Cost (USD)", 2526, NAVY)] }),
          ...[
            ["Project Manager",       "20 days × $900",   "$18,000"],
            ["Solution Architect",    " 9 days × $1,200", "$10,800"],
            ["UI/UX Designer",        "10 days × $800",   " $8,000"],
            ["Full-Stack Dev (.NET)", "18 days × $950",   "$17,100"],
            ["Mobile Developer",      "18 days × $950",   "$17,100"],
            ["DevOps Engineer",       "12 days × $850",   "$10,200"],
            ["QA Engineer",           " 8 days × $750",   " $6,000"],
          ].map(([role, calc, cost], i) =>
            new TableRow({ children: [
              dataCell(role, 4000, i % 2 === 0 ? BGBLUE : WHITE),
              dataCell(calc, 2500, i % 2 === 0 ? BGBLUE : WHITE, MUTED, AlignmentType.CENTER),
              dataCell(cost, 2526, i % 2 === 0 ? BGBLUE : WHITE, NAVY, AlignmentType.RIGHT, true),
            ]})
          ),
          new TableRow({ children: [
            dataCell("TOTAL COST (BASE)", 4000, LIGHT, NAVY, AlignmentType.LEFT, true),
            dataCell("95 days, 7 roles", 2500, LIGHT, MUTED, AlignmentType.CENTER),
            dataCell("$87,200", 2526, LIGHT, NAVY, AlignmentType.RIGHT, true),
          ]}),
          new TableRow({ children: [
            dataCell("PROFIT MARGIN (50%)", 4000, BGGOLD, "92400E", AlignmentType.LEFT, true),
            dataCell("", 2500, BGGOLD, MUTED, AlignmentType.CENTER),
            dataCell("$43,700", 2526, BGGOLD, "92400E", AlignmentType.RIGHT, true),
          ]}),
        ],
      }),

      para([run("")], { after: 120 }),

      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [TW],
        rows: [new TableRow({ children: [new TableCell({
          width: { size: TW, type: WidthType.DXA },
          shading: shade(NAVY),
          borders: cellBorders(NAVY),
          margins: { top: 240, bottom: 240, left: 400, right: 400 },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [bold("ONE-TIME CLIENT PRICE", { color: GOLD, size: 22 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [bold("$129,900 USD", { color: WHITE, size: 56 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [run("All-inclusive  ·  Source code included  ·  Mahima Platform V4.0 license  ·  No hidden costs", { color: "93C5FD", size: 20 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [bold("FREE: 1-Month Hypercare  (~$4,000 value)  included at no extra charge", { color: GOLD, size: 20 })] }),
          ],
        })]})],
      }),

      para([run("")], { after: 120 }),

      para([bold("Compared to greenfield build: ", { color: NAVY }), run("A Node.js + React Native + MongoDB build of this specification would cost $180,000–$220,000 and take 10–12 weeks. Mahima Platform delivers more features, faster, at $129,900.")]),

      h2("10b. Platform & Infrastructure Charges"),

      para([run("Monthly third-party costs passed to the client at actuals (estimates for up to 300 members):")]),

      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [4500, 2000, 2526],
        rows: [
          new TableRow({ children: [headerCell("Service", 4500, NAVY), headerCell("Monthly Cost", 2000, NAVY), headerCell("Annual Cost", 2526, NAVY)] }),
          ...[
            ["AWS EC2 t3.small (App Server)",            "$18/mo",  "$216/yr"],
            ["AWS RDS db.t3.micro (PostgreSQL)",         "$15/mo",  "$180/yr"],
            ["AWS S3 + CloudFront (videos, media)",      "$12/mo",  "$144/yr"],
            ["AWS Load Balancer + Networking",           "$22/mo",  "$264/yr"],
            ["Twilio SMS (avg 500 SMS/month)",           "$4/mo",   "$48/yr"],
            ["Twilio Phone Number",                       "$1/mo",   "$12/yr"],
            ["Firebase Auth (up to 50K MAU)",            "Free",    "Free"],
            ["Email / SMTP (MailKit)",                   "$3/mo",   "$36/yr"],
            ["Domain + SSL (Let's Encrypt)",             "$1/mo",   "$12/yr"],
          ].map(([svc, mo, yr], i) =>
            new TableRow({ children: [
              dataCell(svc, 4500, i % 2 === 0 ? BGBLUE : WHITE),
              dataCell(mo, 2000, i % 2 === 0 ? BGBLUE : WHITE, mo === "Free" ? GREEN : NAVY, AlignmentType.CENTER, mo !== "Free"),
              dataCell(yr, 2526, i % 2 === 0 ? BGBLUE : WHITE, yr === "Free" ? GREEN : MUTED, AlignmentType.RIGHT),
            ]})
          ),
          new TableRow({ children: [
            dataCell("TOTAL MONTHLY PLATFORM COST", 4500, BGGRN, GREEN, AlignmentType.LEFT, true),
            dataCell("~$76/mo", 2000, BGGRN, GREEN, AlignmentType.CENTER, true),
            dataCell("~$912/yr", 2526, BGGRN, GREEN, AlignmentType.RIGHT, true),
          ]}),
        ],
      }),

      pageBreak(),

      // ── 11. AMC ──────────────────────────────────────────────────
      h1("11. Annual Maintenance & Support (AMC)"),

      para([
        run("Month 1 hypercare is "),
        bold("FREE ", { color: GREEN }),
        run("and included in the one-time customisation cost. AMC billing begins from Month 2. Choose the plan that fits ANM's support needs:"),
      ]),

      amcTable([
        ["Monthly Price (USD)",          "$800/mo",   "$1,500/mo",   "$2,500/mo"],
        ["Annual Price (USD)",           "$8,000/yr", "$15,000/yr",  "$25,000/yr"],
        ["Annual Saving vs Monthly",     "$1,600",    "$3,000",      "$5,000"],
        ["Bug fixes & security patches", "✓",         "✓",           "✓"],
        ["OS & dependency updates",      "✓",         "✓",           "✓"],
        ["Monthly health report",        "✓",         "✓",           "✓"],
        ["Support hours per month",      "3 hrs",     "6 hrs",       "15 hrs"],
        ["Response SLA",                 "48 hrs",    "24 hrs",      "4 hrs"],
        ["DB tuning & optimisation",     "—",         "✓",           "✓"],
        ["Minor feature enhancements",   "—",         "✓",           "✓"],
        ["New feature development",      "—",         "—",           "✓ (15hrs)"],
        ["Dedicated DevOps oversight",   "—",         "—",           "✓"],
        ["PM monthly check-in call",     "—",         "✓",           "✓"],
        ["Emergency SLA",                "—",         "—",           "4 hours"],
      ]),

      para([run("")], { after: 120 }),

      infoBox([
        [bold("Year 1 Total Cost of Ownership (Pro AMC):", { color: NAVY, size: 22 })],
        [run("$129,900  (one-time)  +  $912  (AWS/platform, 12mo)  +  $15,000  (Pro AMC, 10mo from M2)  =  ", { size: 20, color: MUTED }),
         bold("~$145,812", { color: NAVY, size: 22 })],
      ], BGBLUE, NAVY),

      pageBreak(),

      // ── 12. WHY MAHIMA ───────────────────────────────────────────
      h1("12. Why Mahima Platform"),

      h2("12a. Direct Feature Comparison"),

      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [3200, 2700, 3126],
        rows: [
          new TableRow({ children: [headerCell("Dimension", 3200, NAVY), headerCell("Greenfield Build", 2700, "64748B"), headerCell("Mahima Platform ★", 3126, GREEN)] }),
          ...[
            ["Timeline",               "8–10 weeks",        "6 weeks  ✓ 40% faster"],
            ["Cost",                   "$180k–$220k",       "$129,900  ✓ ~40% saving"],
            ["Delivery Risk",          "High — unproven",   "Low — production-tested V4.0"],
            ["Prayer Requests",        "Build from scratch", "✓ Full lifecycle — built & live"],
            ["Member History",         "Build from scratch", "✓ Counselling sessions + audit log"],
            ["Video/Media Library",    "Build from scratch", "✓ Sermon library + S3 CDN — built"],
            ["Chat + VoIP",            "Build + integrate",  "✓ Twilio already integrated"],
            ["Push Notifications",     "Phase 2 only",      "✓ Available now"],
            ["Multi-language",         "Phase 2 only",      "✓ Available now"],
            ["Admin Dashboard",        "Phase 2 only",      "✓ Available now"],
            ["AI Community Bot",       "Not planned",       "✓ Available now — bonus"],
            ["Audit Logs",             "Not planned",       "✓ Available now — bonus"],
          ].map(([dim, gf, mah], i) =>
            new TableRow({ children: [
              dataCell(dim, 3200, i % 2 === 0 ? LIGHT : WHITE, NAVY, AlignmentType.LEFT, true),
              dataCell(gf, 2700, i % 2 === 0 ? "FEF2F2" : WHITE, "991B1B"),
              dataCell(mah, 3126, i % 2 === 0 ? BGGRN : WHITE, GREEN, AlignmentType.LEFT, true),
            ]})
          ),
        ],
      }),

      h2("12b. Built-in Bonuses (Not in Original Proposal)"),

      para([run("Mahima Platform V4.0 delivers the following features at no additional cost — they are pre-built and ready to configure for ANM:")]),

      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [TW / 2, TW / 2],
        rows: [
          new TableRow({ children: [headerCell("Bonus Feature", TW/2, GREEN), headerCell("Value to ANM", TW/2, GREEN)] }),
          ...[
            ["AI Community Bot (OpenAI-compatible)", "Members can ask questions, get support 24/7 without admin involvement"],
            ["Expense & Payroll Management", "Church finance tracking, staff payroll, PDF payslips"],
            ["Attendance Records", "Track who attends events, meetings, and services"],
            ["Google Drive Integration", "Store and share documents in a familiar cloud environment"],
            ["Marriage & Baptism Workflows", "Structured registration forms with approval workflows"],
            ["Ministry Automation", "Scheduled automated messages to groups or individuals"],
          ].map(([feat, val], i) =>
            new TableRow({ children: [
              dataCell(feat, TW/2, i % 2 === 0 ? BGGRN : WHITE, GREEN, AlignmentType.LEFT, true),
              dataCell(val, TW/2, i % 2 === 0 ? BGGRN : WHITE, MUTED),
            ]})
          ),
        ],
      }),

      pageBreak(),

      // ── 13. NEXT STEPS ────────────────────────────────────────────
      h1("13. Next Steps"),

      para([run("We recommend the following path to get the ANM App live in 6 weeks:")]),

      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [800, 2400, 5826],
        rows: [
          new TableRow({ children: [headerCell("Step", 800, NAVY), headerCell("Action", 2400, NAVY), headerCell("Description", 5826, NAVY)] }),
          ...[
            ["01", "Live Platform Demo", "30-minute walkthrough of Mahima V4.0 — see Members, Prayer Requests, Video, Chat, and Admin Dashboard live before committing."],
            ["02", "Requirements Sign-Off", "Review the feature mapping table (Section 4) and confirm scope. Identify any ANM-specific configurations beyond standard modules."],
            ["03", "Contract & Kickoff", "Sign proposal, confirm ANM branding assets (logo, colours, name). Week 1 discovery begins within 5 business days of signing."],
            ["04", "6-Week Delivery", "Structured, milestone-driven delivery with weekly Friday status reports. No surprises — proven platform, proven process."],
            ["05", "App Store Go-Live", "ANM App live on Google Play Store and Apple App Store. 1-month free hypercare support begins immediately."],
          ].map(([step, action, desc], i) =>
            new TableRow({ children: [
              new TableCell({
                width: { size: 800, type: WidthType.DXA },
                shading: shade(i % 2 === 0 ? GREEN : BGGRN),
                borders: cellBorders(BORDER),
                margins: cellPadSm,
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [bold(step, { color: i % 2 === 0 ? WHITE : GREEN, size: 24 })], spacing: { after: 0 } })],
              }),
              dataCell(action, 2400, i % 2 === 0 ? BGGRN : WHITE, NAVY, AlignmentType.LEFT, true),
              dataCell(desc, 5826, i % 2 === 0 ? BGGRN : WHITE, MUTED),
            ]})
          ),
        ],
      }),

      para([run("")], { after: 240 }),

      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [TW],
        rows: [new TableRow({ children: [new TableCell({
          width: { size: TW, type: WidthType.DXA },
          shading: shade(NAVY),
          borders: cellBorders(NAVY),
          margins: { top: 300, bottom: 300, left: 500, right: 500 },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [bold("Mahima Platform V4.0  ·  Already Built. Ready for ANM.", { color: WHITE, size: 28 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [run("6 weeks  ·  $129,900  ·  20+ modules  ·  iOS + Android  ·  FREE 1-month Hypercare", { color: GOLD, size: 22 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [run("Contact us to schedule a live demo and kick off in 5 business days.", { color: "93C5FD", size: 20 })] }),
          ],
        })]})],
      }),
    ],
  }],
});

// ── Save ─────────────────────────────────────────────────────────
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("ANM_Proposal_Mahima_Platform.docx", buffer);
  console.log("\n✅  ANM_Proposal_Mahima_Platform.docx generated!");
  console.log("   Complete revised ANM proposal — Mahima Platform edition.\n");
  console.log("   Sections:");
  console.log("    1. Executive Summary          — Mahima vs greenfield comparison");
  console.log("    2. Objectives & Goals         — mapped to Mahima modules");
  console.log("    3. Target Audience            — with Mahima role mappings");
  console.log("    4. Features & Functionality   — all original + Phase 2 features ready");
  console.log("    5. Technology Stack           — Mahima actual stack vs original proposal");
  console.log("    6. Database Design            — PostgreSQL schemas (eq. MongoDB docs)");
  console.log("    7. Mahima Platform Overview   — 20 pre-built modules");
  console.log("    8. Development Plan           — 6-week timeline");
  console.log("    9. Resource Plan              — 7 roles × 8 weeks table");
  console.log("   10. Pricing                   — $129,900 one-time + platform + AMC");
  console.log("   11. AMC Plans                 — Starter/Pro/Enterprise tiers");
  console.log("   12. Why Mahima Platform       — comparison + bonus features");
  console.log("   13. Next Steps");
});
