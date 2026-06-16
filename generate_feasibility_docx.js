/**
 * ANM Community App — Technical Feasibility Study
 * Generates: ANM_Technical_Feasibility_Study.docx
 * Run: node generate_feasibility_docx.js
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, LevelFormat,
  ExternalHyperlink, TableOfContents
} = require("docx");
const fs = require("fs");

// ── Palette ──────────────────────────────────────────────
const NAVY   = "1B2F6E";
const GOLD   = "F0A500";
const WHITE  = "FFFFFF";
const MUTED  = "64748B";
const GREEN  = "065F46";
const RED    = "991B1B";
const BG_ALT = "F8F9FC";
const BG_HDR = "EEF2F7";
const LIGHT_GOLD = "FEF3C7";
const LIGHT_GREEN = "DCFCE7";
const LIGHT_RED   = "FEE2E2";
const LIGHT_BLUE  = "EFF6FF";

// ── Helpers ──────────────────────────────────────────────
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" };
const navyBorder = { style: BorderStyle.SINGLE, size: 6, color: NAVY };
const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorder    = { style: BorderStyle.NONE, size: 0, color: WHITE };
const noBorders   = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function run(text, opts = {}) {
  return new TextRun({ text, font: "Arial", size: opts.sz || 20, bold: opts.bold || false, color: opts.color || "1A1A2E", italics: opts.italic || false, ...opts });
}

function para(children, opts = {}) {
  return new Paragraph({
    children: Array.isArray(children) ? children : [children],
    spacing: { before: opts.before || 60, after: opts.after || 60 },
    alignment: opts.align || AlignmentType.LEFT,
    ...opts,
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, font: "Arial", size: 36, bold: true, color: WHITE })],
    spacing: { before: 360, after: 160 },
    shading: { fill: NAVY, type: ShadingType.CLEAR },
    indent: { left: 180 },
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, font: "Arial", size: 28, bold: true, color: NAVY })],
    spacing: { before: 320, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD } },
  });
}

function h3(text, color = NAVY) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, font: "Arial", size: 24, bold: true, color })],
    spacing: { before: 200, after: 80 },
  });
}

function body(text, opts = {}) {
  return para([run(text, { sz: 20, color: "1A1A2E", ...opts })], { before: 80, after: 80, ...opts });
}

function bullet(text, indent = 720) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [run(text, { sz: 20 })],
    spacing: { before: 40, after: 40 },
  });
}

function subbullet(text) {
  return new Paragraph({
    numbering: { reference: "sub-bullets", level: 0 },
    children: [run(text, { sz: 19, color: MUTED })],
    spacing: { before: 30, after: 30 },
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function gap(sz = 120) {
  return new Paragraph({ children: [run("")], spacing: { before: 0, after: sz } });
}

// ── Divider line ──────────────────────────────────────────
function divider() {
  return new Paragraph({
    children: [run("")],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD } },
    spacing: { before: 40, after: 40 },
  });
}

// ── Label-Value inline ──────────────────────────────────
function labelValue(label, value) {
  return para([
    run(label + ": ", { bold: true, sz: 20, color: NAVY }),
    run(value, { sz: 20 }),
  ], { before: 60, after: 60 });
}

// ── Info box ──────────────────────────────────────────────
function infoBox(lines, fillColor = LIGHT_BLUE, borderColor = NAVY) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        borders: {
          top: { style: BorderStyle.SINGLE, size: 8, color: borderColor },
          bottom: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
          left: { style: BorderStyle.SINGLE, size: 12, color: borderColor },
          right: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
        },
        shading: { fill: fillColor, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        width: { size: 9360, type: WidthType.DXA },
        children: lines.map((l, i) => para([
          run(l, { sz: 19, color: i === 0 ? "1A1A2E" : MUTED, bold: i === 0 })
        ], { before: 40, after: 40 })),
      })]
    })]
  });
}

// ── Section header bar ───────────────────────────────────
function sectionBar(text, bg = NAVY) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        borders: noBorders,
        shading: { fill: bg, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 200, right: 200 },
        width: { size: 9360, type: WidthType.DXA },
        children: [para([run(text, { sz: 22, bold: true, color: WHITE })], { before: 0, after: 0 })],
      })]
    })]
  });
}

// ── Pros/Cons table ──────────────────────────────────────
function prosConsTable(pros, cons) {
  const maxRows = Math.max(pros.length, cons.length);
  const rows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 4560, type: WidthType.DXA },
          shading: { fill: "166534", type: ShadingType.CLEAR },
          borders: noBorders,
          margins: { top: 80, bottom: 80, left: 160, right: 160 },
          children: [para([run("✅  PROS", { sz: 20, bold: true, color: WHITE })], { before: 0, after: 0 })],
        }),
        new TableCell({ width: { size: 200, type: WidthType.DXA }, borders: noBorders, children: [para([run("")], { before: 0, after: 0 })] }),
        new TableCell({
          width: { size: 4600, type: WidthType.DXA },
          shading: { fill: "991B1B", type: ShadingType.CLEAR },
          borders: noBorders,
          margins: { top: 80, bottom: 80, left: 160, right: 160 },
          children: [para([run("❌  CONS", { sz: 20, bold: true, color: WHITE })], { before: 0, after: 0 })],
        }),
      ],
    }),
  ];

  for (let i = 0; i < maxRows; i++) {
    rows.push(new TableRow({
      children: [
        new TableCell({
          width: { size: 4560, type: WidthType.DXA },
          borders: { top: thinBorder, bottom: thinBorder, left: { style: BorderStyle.SINGLE, size: 4, color: "166534" }, right: noBorder },
          shading: { fill: LIGHT_GREEN, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 160, right: 160 },
          children: [para([run(pros[i] || "", { sz: 19 })], { before: 30, after: 30 })],
        }),
        new TableCell({ width: { size: 200, type: WidthType.DXA }, borders: noBorders, children: [para([run("")], { before: 0, after: 0 })] }),
        new TableCell({
          width: { size: 4600, type: WidthType.DXA },
          borders: { top: thinBorder, bottom: thinBorder, left: { style: BorderStyle.SINGLE, size: 4, color: "991B1B" }, right: noBorder },
          shading: { fill: LIGHT_RED, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 160, right: 160 },
          children: [para([run(cons[i] || "", { sz: 19 })], { before: 30, after: 30 })],
        }),
      ],
    }));
  }
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [4560, 200, 4600], rows });
}

// ── Risk table row ────────────────────────────────────────
function riskRow(risk, impact, prob, mitigation, i) {
  const bg = i % 2 === 0 ? WHITE : BG_ALT;
  const impactColor = impact === "High" ? RED : impact === "Medium" ? "D97706" : GREEN;
  const probColor   = prob   === "High" ? RED : prob   === "Medium" ? "D97706" : GREEN;
  return new TableRow({
    children: [
      new TableCell({ width: { size: 3000, type: WidthType.DXA }, borders: cellBorders, shading: { fill: bg, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(risk, { sz: 18, bold: true })], { before: 0, after: 0 })] }),
      new TableCell({ width: { size: 1000, type: WidthType.DXA }, borders: cellBorders, shading: { fill: bg, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [para([run(impact, { sz: 18, bold: true, color: impactColor })], { before: 0, after: 0, align: AlignmentType.CENTER })] }),
      new TableCell({ width: { size: 1000, type: WidthType.DXA }, borders: cellBorders, shading: { fill: bg, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [para([run(prob, { sz: 18, bold: true, color: probColor })], { before: 0, after: 0, align: AlignmentType.CENTER })] }),
      new TableCell({ width: { size: 4360, type: WidthType.DXA }, borders: cellBorders, shading: { fill: bg, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(mitigation, { sz: 18, color: MUTED })], { before: 0, after: 0 })] }),
    ],
  });
}

// ── Alternative comparison table ─────────────────────────
function altRow(tech, chosen, alt1, alt2, reason, i) {
  const bg = i % 2 === 0 ? WHITE : BG_ALT;
  return new TableRow({
    children: [
      new TableCell({ width: { size: 1400, type: WidthType.DXA }, borders: cellBorders, shading: { fill: bg, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(tech, { sz: 18, bold: true, color: NAVY })], { before: 0, after: 0 })] }),
      new TableCell({ width: { size: 1800, type: WidthType.DXA }, borders: { ...cellBorders, left: { style: BorderStyle.SINGLE, size: 6, color: "166534" } }, shading: { fill: LIGHT_GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run("✅ " + chosen, { sz: 18, bold: true, color: GREEN })], { before: 0, after: 0 })] }),
      new TableCell({ width: { size: 1500, type: WidthType.DXA }, borders: cellBorders, shading: { fill: bg, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(alt1, { sz: 18, color: MUTED })], { before: 0, after: 0 })] }),
      new TableCell({ width: { size: 1500, type: WidthType.DXA }, borders: cellBorders, shading: { fill: bg, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(alt2, { sz: 18, color: MUTED })], { before: 0, after: 0 })] }),
      new TableCell({ width: { size: 3160, type: WidthType.DXA }, borders: cellBorders, shading: { fill: bg, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(reason, { sz: 18, color: MUTED, italic: true })], { before: 0, after: 0 })] }),
    ],
  });
}

// ════════════════════════════════════════════════════════════
// DOCUMENT CONTENT
// ════════════════════════════════════════════════════════════

const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets",     levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "sub-bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } }] },
      { reference: "numbers",     levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 36, bold: true, font: "Arial", color: WHITE }, paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, font: "Arial", color: NAVY }, paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: "Arial", color: NAVY }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1008, right: 1008, bottom: 1008, left: 1008 },
      }
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "ANM Community App  |  Technical Feasibility Study  |  Confidential", font: "Arial", size: 16, color: MUTED }),
              new TextRun({ children: ["\t", PageNumber.CURRENT], font: "Arial", size: 16, color: MUTED }),
            ],
            tabStops: [{ type: "right", position: 9360 }],
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD } },
            spacing: { after: 0 },
          })
        ]
      })
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "Prepared by: Solution Development Team  |  Stack: .NET 8 + Ionic/Capacitor + PostgreSQL 16  |  June 2025", font: "Arial", size: 15, color: MUTED }),
            ],
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: GOLD } },
            spacing: { before: 0 },
            alignment: AlignmentType.CENTER,
          })
        ]
      })
    },
    children: [

      // ── COVER ──────────────────────────────────────────
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [9360],
        rows: [new TableRow({ children: [new TableCell({
          shading: { fill: NAVY, type: ShadingType.CLEAR },
          borders: noBorders,
          margins: { top: 600, bottom: 600, left: 400, right: 400 },
          width: { size: 9360, type: WidthType.DXA },
          children: [
            para([run("TECHNICAL FEASIBILITY STUDY", { sz: 18, bold: true, color: GOLD })], { before: 0, after: 120, align: AlignmentType.CENTER }),
            para([run("ANM Community App", { sz: 52, bold: true, color: WHITE })], { before: 0, after: 80, align: AlignmentType.CENTER }),
            para([run("Proprietary .NET 8 Enterprise Framework", { sz: 28, color: GOLD })], { before: 0, after: 200, align: AlignmentType.CENTER }),
            para([run("", { sz: 10 })], { border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD } }, before: 0, after: 200 }),
            new Table({ width: { size: 8560, type: WidthType.DXA }, columnWidths: [2133, 2133, 2134, 2160], rows: [new TableRow({
              children: [
                ["Stack", "ASP.NET Core .NET 8 + Ionic 7"],
                ["Database", "PostgreSQL 16 on AWS RDS"],
                ["Delivery", "10 Weeks + 30-Day HC"],
                ["Version", "v1.0  |  June 2025"],
              ].map(([k, v]) => new TableCell({ width: { size: 2133, type: WidthType.DXA }, borders: noBorders, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [
                para([run(k.toUpperCase(), { sz: 15, color: GOLD })], { before: 0, after: 40, align: AlignmentType.CENTER }),
                para([run(v, { sz: 17, bold: true, color: WHITE })], { before: 0, after: 0, align: AlignmentType.CENTER }),
              ]}))
            })]})
          ]
        })]})],
      }),

      gap(300),

      // ── EXECUTIVE SUMMARY ──────────────────────────────
      h1("1. Executive Summary"),

      body("This document presents a comprehensive technical feasibility study for the ANM Community App — a native iOS, Android, and web community platform for Assemblies of Nagaland Ministries. The study evaluates the selected technology stack across six dimensions: technical viability, team capability, infrastructure readiness, timeline feasibility, cost sustainability, and risk profile."),

      gap(60),

      infoBox([
        "VERDICT: FULLY FEASIBLE",
        "All selected technologies are production-proven, actively maintained, and well-supported. The proprietary .NET 8 enterprise framework provides a significant head-start, reducing delivery risk and accelerating the 10-week timeline vs. an estimated 14–16 weeks for a greenfield build.",
        "No blocking technical risks identified. Three medium risks flagged with clear mitigations.",
      ], LIGHT_BLUE, NAVY),

      gap(120),

      body("The proposed stack — ASP.NET Core .NET 8, React + Ionic/Capacitor 7, and PostgreSQL 16 on AWS RDS — represents an enterprise-grade combination that is battle-tested at scale across banking, healthcare, and community platforms globally. All individual components are MIT or Apache-2 licensed (or commercially backed with SLA), ensuring no licensing risk for ANM."),

      pageBreak(),

      // ── PROJECT OVERVIEW ──────────────────────────────
      h1("2. Project Overview"),

      h2("2.1  Application Scope"),
      body("The ANM Community App is a multi-platform community engagement application delivering the following functional domains:"),
      bullet("Member Directory — searchable, filterable member roster with detail pages and pastoral notes"),
      bullet("Prayer Requests — anonymous/named prayer submission, browse, and pray interactions"),
      bullet("Video Library — categorized sermon/content library with CloudFront CDN streaming"),
      bullet("In-App Messaging — 1:1 chat via Twilio Conversations SDK"),
      bullet("VoIP Calling — in-app voice calls via Twilio Voice (no phone number sharing)"),
      bullet("Push Notifications — Firebase FCM for iOS and Android"),
      bullet("Admin Backend — role-based admin portal for content and user management"),
      bullet("Real-time features — SignalR WebSocket for live prayer counts and notifications"),

      h2("2.2  Finalized Technology Stack"),
      gap(40),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2200, 3000, 4160],
        rows: [
          new TableRow({ children: [
            new TableCell({ width: { size: 2200, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [para([run("Layer", { sz: 18, bold: true, color: WHITE })], { before: 0, after: 0 })] }),
            new TableCell({ width: { size: 3000, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [para([run("Technology", { sz: 18, bold: true, color: WHITE })], { before: 0, after: 0 })] }),
            new TableCell({ width: { size: 4160, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children: [para([run("Version / Details", { sz: 18, bold: true, color: WHITE })], { before: 0, after: 0 })] }),
          ]}),
          ...[
            ["Frontend / Mobile", "React + Vite + Ionic / Capacitor", "Ionic 7, Capacitor 7 — iOS 16+, Android 12+, Web (PWA)"],
            ["Backend API", "ASP.NET Core", ".NET 8 LTS (C#) — OpenAPI, Middleware, DI, Health Checks"],
            ["ORM / Database", "EF Core + PostgreSQL", "EF Core 8 + Npgsql + PostgreSQL 16 on AWS RDS"],
            ["Authentication", "Firebase Auth + JWT", "Firebase Auth v9 SDK + JWT Bearer (.NET 8 middleware)"],
            ["Real-time", "SignalR", ".NET 8 SignalR — WebSocket hub for live features"],
            ["Messaging / VoIP", "Twilio", "Twilio Conversations (chat), Voice SDK (VoIP), SMS (OTP)"],
            ["Storage + CDN", "AWS S3 + CloudFront", "Private S3 bucket + signed CloudFront URLs"],
            ["Push Notifications", "Firebase FCM", "Firebase Cloud Messaging — topic + device targeting"],
            ["Testing (Unit)", "xUnit + NSubstitute", "xUnit 2.x, Testcontainers for Dockerised PostgreSQL tests"],
            ["Testing (E2E)", "Playwright + Appium", "Playwright (web), Appium 2.x (iOS Simulator + Android)"],
            ["Security", "OWASP + AWS WAF", "OWASP Mobile Top 10, JWT rotation, WAF rate limiting"],
            ["CI/CD", "GitHub Actions + ECS", "PR gates → .NET 8 build → Docker → ECS Fargate deploy"],
            ["Infrastructure", "AWS ECS Fargate", "Serverless containers; RDS Multi-AZ, CloudWatch, ALB"],
          ].map(([layer, tech, detail], i) => new TableRow({
            children: [
              new TableCell({ width: { size: 2200, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i % 2 === 0 ? WHITE : BG_ALT, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [para([run(layer, { sz: 18, bold: true, color: NAVY })], { before: 0, after: 0 })] }),
              new TableCell({ width: { size: 3000, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i % 2 === 0 ? WHITE : BG_ALT, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [para([run(tech, { sz: 18 })], { before: 0, after: 0 })] }),
              new TableCell({ width: { size: 4160, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i % 2 === 0 ? WHITE : BG_ALT, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [para([run(detail, { sz: 17, color: MUTED })], { before: 0, after: 0 })] }),
            ]
          }))
        ]
      }),

      pageBreak(),

      // ── COMPONENT FEASIBILITY ─────────────────────────
      h1("3. Component-by-Component Feasibility"),

      // ── 3.1 Frontend / Mobile ─────────────────────────
      h2("3.1  Frontend / Mobile — React + Ionic/Capacitor 7"),
      body("Ionic/Capacitor 7 is a web-native mobile framework that compiles a React/TypeScript web app into native iOS and Android binaries using Capacitor's native bridge. This enables a single codebase to deploy to iOS, Android, and the web simultaneously."),
      gap(80),
      infoBox([
        "Feasibility: HIGH",
        "Ionic 7 + Capacitor 7 is actively developed by Ionic Inc. (Series B funded). Used in production by NASA, GE Healthcare, and Burger King. All required Capacitor plugins (Biometric, Camera, Push, VoIP) are available and maintained.",
      ], LIGHT_GREEN, "166534"),
      gap(100),
      prosConsTable(
        [
          "Single codebase for iOS, Android, and Web (PWA) — eliminates 3 separate codebases",
          "Uses standard React/HTML/CSS skills — broad talent pool for future team growth",
          "Capacitor 7 provides first-class access to native APIs (Biometrics, Camera, NFC, Notifications)",
          "Ionic component library optimized for touch — professional UX out of the box",
          "Hot reload during development dramatically speeds up iteration",
          "Web version deployable as PWA — accessible on any browser without App Store download",
          "Strong TypeScript support — catches bugs at compile time, not production",
        ],
        [
          "Performance ceiling below fully native Swift/Kotlin for GPU-intensive apps (not applicable here)",
          "Capacitor plugin ecosystem smaller than React Native for some edge-case hardware features",
          "WebView rendering subtle differences from native UI components (mitigated by Ionic's themed components)",
          "App bundle size larger than pure native apps (~15–25 MB vs. ~8 MB native)",
          "Twilio VoIP requires Capacitor community plugin — additional integration testing needed",
        ]
      ),

      gap(120),

      // ── 3.2 Backend ──────────────────────────────────
      h2("3.2  Backend API — ASP.NET Core .NET 8"),
      body("ASP.NET Core .NET 8 is Microsoft's Long-Term Support (LTS) runtime for server-side applications. It delivers high-performance REST APIs, built-in dependency injection, OpenAPI (Swagger) integration, SignalR for real-time communication, and enterprise-grade middleware."),
      gap(80),
      infoBox([
        "Feasibility: HIGH",
        ".NET 8 LTS is supported until November 2026. TechEmpower benchmarks rank ASP.NET Core in the top 5 fastest API frameworks globally. Used by StackOverflow, Azure, and thousands of enterprise applications.",
      ], LIGHT_GREEN, "166534"),
      gap(100),
      prosConsTable(
        [
          "TechEmpower Benchmark Top 5: ASP.NET Core outperforms Node.js/Express by 3–5x in throughput",
          "Long-Term Support (LTS) until November 2026 — guaranteed security patches",
          "Built-in DI container, middleware pipeline, health checks, and OpenAPI — no extra packages needed",
          "EF Core 8 ORM provides type-safe database access with automatic migration management",
          "SignalR built-in for WebSocket real-time features — no additional runtime or library",
          "C# strong typing prevents entire categories of runtime bugs that TypeScript cannot catch",
          "Microsoft-backed enterprise adoption — banks, hospitals, and government systems run on .NET 8",
          "Docker + ECS Fargate containerization is first-class — minimal devops friction",
        ],
        [
          "C# / .NET skills less common in pure startup market vs. Node.js developers",
          "Cold start time for ECS containers slightly higher than Lambda (mitigated with min-task=1 config)",
          "License requirement: .NET 8 runtime is MIT open-source — zero cost; no commercial license needed",
          "Verbosity: C# is more verbose than Python/Node for simple scripts (not relevant for production APIs)",
        ]
      ),

      gap(120),
      pageBreak(),

      // ── 3.3 Database ─────────────────────────────────
      h2("3.3  Database — PostgreSQL 16 on AWS RDS"),
      body("PostgreSQL 16 is the world's most advanced open-source relational database. On AWS RDS, it runs as a managed service — automated backups, failover, patching, and monitoring without manual DBA overhead."),
      gap(80),
      infoBox([
        "Feasibility: HIGH",
        "PostgreSQL is the #1 most admired database in Stack Overflow Developer Survey 2023 & 2024. AWS RDS PostgreSQL is AWS's second most-used managed database product. Netflix, Instagram, and Shopify use PostgreSQL at scale.",
      ], LIGHT_GREEN, "166534"),
      gap(100),
      prosConsTable(
        [
          "ACID compliant — transactions guaranteed; no data loss on node failure",
          "JSON + JSONB support for semi-structured data without sacrificing relational integrity",
          "Full-text search built-in — no Elasticsearch needed for member directory search",
          "Row-level security (RLS) for multi-tenant data isolation — critical for community platforms",
          "AWS RDS Multi-AZ: automatic failover in <60 seconds — 99.95% availability SLA",
          "Automated backups, point-in-time recovery to any second in last 35 days",
          "EF Core 8 + Npgsql provides full LINQ-to-SQL with compiled query caching",
          "PostGIS extension available if location features added in Phase 2",
        ],
        [
          "Vertical scaling required before horizontal sharding — requires db.t4g.xlarge beyond ~10,000 concurrent users",
          "Cost: db.t4g.medium (~₹18,500/mo) is higher than self-managed PostgreSQL on EC2 (~₹6,000/mo)",
          "Schema migrations must be managed carefully — EF Core migrations need review before production deploy",
          "Connection pooling (PgBouncer) recommended at >500 concurrent API connections — adds one component",
        ]
      ),

      gap(120),

      // ── 3.4 Auth ─────────────────────────────────────
      h2("3.4  Authentication — Firebase Auth + JWT Bearer"),
      body("Firebase Authentication handles user identity (Google OAuth, email/password, OTP via SMS) and issues signed JWT tokens. The .NET 8 backend validates these tokens via the Firebase Admin SDK's JWT Bearer middleware."),
      gap(80),
      infoBox([
        "Feasibility: HIGH",
        "Firebase Auth is used by 3 million+ apps globally. The .NET Firebase Admin SDK is officially maintained by Google. The JWT validation approach is industry-standard and requires no additional infrastructure.",
      ], LIGHT_GREEN, "166534"),
      gap(100),
      prosConsTable(
        [
          "Zero infrastructure to manage — Google handles identity servers, rate limiting, and uptime",
          "Built-in OTP/SMS verification — eliminates custom OTP logic",
          "Google and Apple OAuth flows supported out of the box",
          "JWT tokens stateless — backend validates without database lookups on every request",
          "10,000 users/month free — scales commercially at low cost beyond that",
          "Biometric authentication delegates to device (no biometric data stored in server)",
          "Token refresh handled automatically by Firebase SDK",
        ],
        [
          "Dependency on Google infrastructure — Firebase outages (rare, <0.01% annually) affect auth",
          "Firebase project locked to Google Cloud — migration to self-hosted auth is significant effort",
          "Phone number verification via SMS costs ~₹4.9/SMS beyond free tier",
          "Custom auth claims (roles) must be set via Admin SDK — adds one API call per role assignment",
        ]
      ),

      gap(120),
      pageBreak(),

      // ── 3.5 Twilio ───────────────────────────────────
      h2("3.5  Communications — Twilio (Chat + VoIP + SMS)"),
      body("Twilio provides three communication channels: Conversations SDK for in-app messaging, Twilio Voice for VoIP calling (no phone numbers exchanged between users), and SMS for OTP and system notifications."),
      gap(80),
      infoBox([
        "Feasibility: HIGH",
        "Twilio powers communications for Airbnb, Uber, WhatsApp Business, and 290,000+ businesses. Twilio Conversations and Voice SDKs are available as Capacitor-compatible packages for iOS and Android.",
      ], LIGHT_GREEN, "166534"),
      gap(100),
      prosConsTable(
        [
          "No phone numbers shared between users — VoIP calls stay in-app (privacy-first)",
          "Twilio Conversations handles message persistence, read receipts, and typing indicators automatically",
          "Global infrastructure: <150ms call connection latency in India",
          "SDK available for React/Ionic and .NET — single vendor for chat + voice + SMS",
          "Compliance: HIPAA-eligible, GDPR-ready, ISO 27001 certified",
          "Webhook-based event delivery to .NET 8 backend — no polling required",
          "Programmable — custom logic for message filtering, moderation, and escalation",
        ],
        [
          "Usage-based pricing: costs scale with call minutes and message volume (~₹4,825/mo estimated)",
          "Twilio Voice requires Capacitor community plugin — not officially maintained by Twilio",
          "Network quality affects VoIP call quality — requires graceful degradation UX",
          "India regulatory compliance for SMS: DLT registration required for transactional SMS (1–2 week process)",
          "Twilio outages (rare) affect in-app calling — fallback to phone calling recommended as backup",
        ]
      ),

      gap(120),

      // ── 3.6 Infrastructure ───────────────────────────
      h2("3.6  Infrastructure — AWS ECS Fargate + RDS + S3 + CloudFront"),
      body("The entire backend infrastructure runs on AWS managed services — ECS Fargate for serverless .NET 8 containers, RDS PostgreSQL 16 for managed database, S3 for media storage, and CloudFront CDN for global video delivery."),
      gap(80),
      infoBox([
        "Feasibility: HIGH",
        "AWS is the world's largest cloud platform with 99.99% compute SLA. ECS Fargate eliminates EC2 management overhead. CloudFront's 450+ PoPs ensure <100ms latency for video delivery across India.",
      ], LIGHT_GREEN, "166534"),
      gap(100),
      prosConsTable(
        [
          "ECS Fargate: zero server management — AWS handles OS patching, scaling, and container placement",
          "Auto-scaling: ECS scales .NET 8 containers 1–10 tasks based on CPU threshold — handles traffic spikes",
          "RDS Multi-AZ: automatic failover in <60 seconds — no manual intervention during node failure",
          "CloudFront CDN: 450+ edge locations globally — sub-2-second video load time from India",
          "AWS WAF: rate limiting + bot protection without custom firewall code",
          "GitHub Actions + ECS deploy pipeline: PR → build → test → deploy in ~8 minutes",
          "CloudWatch: centralized logging, metrics, and alerts — no separate monitoring infrastructure",
          "SSM Parameter Store: secrets management at zero cost — no HashiCorp Vault needed",
        ],
        [
          "Monthly cost ~₹44,825 (AWS + Twilio) is client-borne operating expense — must be budgeted",
          "AWS vendor lock-in: migrating to Azure/GCP later requires re-engineering CI/CD and some services",
          "ECS cold start: first request after scale-to-zero ~2–3 seconds (mitigated with min 1 task always running)",
          "CloudFront egress costs scale with video consumption — unexpected viral content could spike costs",
          "Multi-region setup not included in base plan — DR scenario requires additional configuration",
        ]
      ),

      pageBreak(),

      // ── ALTERNATIVES CONSIDERED ───────────────────────
      h1("4. Alternatives Considered & Rejected"),

      body("The following table documents the alternative technologies evaluated for each layer and the rationale for the chosen approach."),
      gap(100),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1400, 1800, 1500, 1500, 3160],
        rows: [
          new TableRow({ children: [
            new TableCell({ width: { size: 1400, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run("Layer", { sz: 17, bold: true, color: WHITE })], { before: 0, after: 0 })] }),
            new TableCell({ width: { size: 1800, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run("Chosen", { sz: 17, bold: true, color: GOLD })], { before: 0, after: 0 })] }),
            new TableCell({ width: { size: 1500, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run("Alt 1", { sz: 17, bold: true, color: WHITE })], { before: 0, after: 0 })] }),
            new TableCell({ width: { size: 1500, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run("Alt 2", { sz: 17, bold: true, color: WHITE })], { before: 0, after: 0 })] }),
            new TableCell({ width: { size: 3160, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run("Why Chosen", { sz: 17, bold: true, color: WHITE })], { before: 0, after: 0 })] }),
          ]}),
          ...([
            ["Mobile",       "Ionic/Capacitor 7",      "React Native/Expo",   "Flutter",          "Single codebase incl. Web PWA; React skills reusable; Capacitor gives direct native API access vs. React Native's bridge abstraction layer"],
            ["Backend",      "ASP.NET Core .NET 8",    "Node.js / Express",   "Spring Boot",      "3–5x higher throughput; LTS until 2026; built-in SignalR; EF Core 8 ORM; C# strong typing reduces production bugs vs. JavaScript runtime errors"],
            ["Database",     "PostgreSQL 16",           "MongoDB",             "MySQL 8",          "ACID compliance; full-text search; RLS row security; JSON support; better EF Core integration than MongoDB; superior to MySQL for complex queries"],
            ["Auth",         "Firebase Auth + JWT",    "AWS Cognito",         "Auth0",            "Simpler SDK; better mobile SDKs; free tier more generous; Google OAuth first-class; same JWT standard — no lock-in on protocol"],
            ["Real-time",    "SignalR (built-in)",      "Socket.io (Node)",    "Pusher",           "Zero additional infrastructure; built into .NET 8 runtime; scales with ECS tasks; no per-message pricing like Pusher"],
            ["Chat / VoIP",  "Twilio",                  "Vonage (Nexmo)",      "Agora.io",         "Best-in-class Conversations SDK; Voice SDK available for Capacitor; single vendor for SMS+Chat+VoIP reduces integration complexity"],
            ["Storage",      "AWS S3 + CloudFront",    "Cloudinary",          "Azure Blob",       "Cost: S3 is 60% cheaper than Cloudinary at scale; CloudFront CDN has 450+ PoPs vs. Azure's 130; native AWS integration with ECS"],
            ["CI/CD",        "GitHub Actions + ECS",   "Jenkins + EC2",       "GitLab CI",        "Zero infrastructure for build agents; ECS deploy action is first-party; free for public repos; better secrets management via GitHub Secrets"],
            ["Monitoring",   "CloudWatch",              "Datadog",             "New Relic",        "Zero additional cost as part of AWS; native ECS + RDS integration; custom dashboards available; no agent installation required"],
          ]).map(altRow)
        ]
      }),

      pageBreak(),

      // ── RISK ASSESSMENT ──────────────────────────────
      h1("5. Risk Assessment"),

      body("The following risks were identified during feasibility analysis. No showstopper risks were found. All risks have documented mitigations."),
      gap(100),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 1000, 1000, 4360],
        rows: [
          new TableRow({ children: [
            new TableCell({ width: { size: 3000, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run("Risk", { sz: 18, bold: true, color: WHITE })], { before: 0, after: 0 })] }),
            new TableCell({ width: { size: 1000, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [para([run("Impact", { sz: 18, bold: true, color: WHITE })], { before: 0, after: 0, align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 1000, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [para([run("Prob.", { sz: 18, bold: true, color: WHITE })], { before: 0, after: 0, align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 4360, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run("Mitigation", { sz: 18, bold: true, color: WHITE })], { before: 0, after: 0 })] }),
          ]}),
          ...([
            ["Twilio VoIP Capacitor Plugin Instability", "Medium", "Low", "Plugin is community-maintained. Mitigated by integration testing in Sprint 4 (Wk 7–8) with fallback to standard phone call if VoIP fails. Twilio also has official React Native SDK as reference."],
            ["RDS PostgreSQL Schema Migration Conflict", "Medium", "Low", "EF Core migrations will be reviewed by Architect before every production deploy. Staging environment mirrors prod — all migrations tested in staging first. Point-in-time recovery available if rollback needed."],
            ["Twilio DLT Registration Delay (SMS India)", "Low", "Medium", "India's TRAI DLT registration for transactional SMS can take 1–2 weeks. Mitigation: initiate registration in Week 1 alongside development. WhatsApp OTP used as fallback during DLT pending period."],
            ["Firebase Auth Outage", "Medium", "Very Low", "Firebase has 99.99% monthly uptime SLA. Mitigation: JWT tokens have 1-hour validity so brief outages do not log out active users. Offline mode caches last valid session."],
            ["CloudFront Video Egress Cost Spike", "Medium", "Low", "Set CloudFront data transfer budget alarm at ₹8,000/mo in CloudWatch. Implement server-side pagination and lazy loading to avoid bulk pre-fetches. S3 Lifecycle policies archive old videos to Glacier."],
            ["Scope Creep Post Gate 1", "High", "Medium", "Formal Change Request process mandated after Week 2 sign-off. All post-gate changes go to Phase 2 backlog. Written CR required with cost and timeline delta — no verbal approvals."],
            ["iOS App Store Review Delay", "Medium", "Low", "Apple review averages 24–48 hours but can extend to 7 days. Mitigation: submit binary by end of Week 9 (not Week 10) to absorb delays. Expedite review available for critical bugs."],
            ["PostgreSQL Connection Pool Exhaustion at Scale", "Medium", "Very Low", "At ANM's expected scale (500–1,000 MAU), RDS connection pool will not be saturated. PgBouncer connection pooler can be added in Phase 2 if user base grows beyond 5,000 MAU."],
            ["Team .NET 8 Skill Gap", "Medium", "Low", "Team has experience with proprietary .NET 8 framework. Junior team members onboarded via pair programming in Week 1. .NET 8 documentation and training resources are comprehensive."],
            ["AWS Cost Overrun", "Low", "Low", "CloudWatch billing alarms set at 80% and 100% of monthly budget. ECS auto-scaling max cap of 10 tasks prevents runaway compute. RDS instance right-sizing reviewed quarterly."],
          ]).map((r, i) => riskRow(...r, i))
        ]
      }),

      pageBreak(),

      // ── TEAM FEASIBILITY ─────────────────────────────
      h1("6. Team & Capability Feasibility"),

      h2("6.1  Required Skills vs. Team Profile"),
      gap(60),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2200, 1800, 1600, 3760],
        rows: [
          new TableRow({ children: [
            new TableCell({ width: { size: 2200, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run("Role", { sz: 17, bold: true, color: WHITE })], { before: 0, after: 0 })] }),
            new TableCell({ width: { size: 1800, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run("Key Skills Required", { sz: 17, bold: true, color: WHITE })], { before: 0, after: 0 })] }),
            new TableCell({ width: { size: 1600, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [para([run("Availability", { sz: 17, bold: true, color: WHITE })], { before: 0, after: 0, align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 3760, type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run("Feasibility Note", { sz: 17, bold: true, color: WHITE })], { before: 0, after: 0 })] }),
          ]}),
          ...([
            ["Project Manager",          "Agile PM, client comms, risk",         "Full (Wks 1–10)", "Assigned. Experienced in .NET delivery and stakeholder management."],
            ["Solution Architect",       ".NET 8, PostgreSQL, AWS architecture", "Part-time (gates)", "Assigned. Reviews schema, API contracts, and sign-off gates."],
            ["UI/UX Designer",           "Figma, Ionic, mobile UX patterns",     "Full (Wks 1–7)",  "Assigned. Ionic design system experience; Figma delivery in Week 2."],
            ["Mobile Developer (Sr.)",   "React, Ionic 7, Capacitor, TypeScript","Full (Wks 2–10)", "Assigned. Experience with Ionic and Capacitor native bridge integrations."],
            ["Backend Developer (Sr.)",  "C#, .NET 8, EF Core, PostgreSQL",      "Full (Wks 1–10)", "Assigned. Prior .NET 8 production experience with the framework."],
            ["DevOps Engineer",          "AWS ECS, RDS, GitHub Actions, Docker", "Part-time + surge","Assigned. AWS Certified Solutions Architect."],
            ["QA Engineer",              "xUnit, Playwright, Appium 2.x",        "Ramps Wk 7",     "Assigned. Playwright + Appium experience. Testcontainers onboarding in Week 1."],
            ["Security Consultant",      "OWASP Mobile Top 10, pentest, JWT",    "Wks 9–10 only",   "Assigned. OWASP-certified. Written pentest report delivered with results."],
          ]).map(([role, skills, avail, note], i) => new TableRow({
            children: [
              new TableCell({ width: { size: 2200, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i % 2 === 0 ? WHITE : BG_ALT, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(role, { sz: 17, bold: true, color: NAVY })], { before: 0, after: 0 })] }),
              new TableCell({ width: { size: 1800, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i % 2 === 0 ? WHITE : BG_ALT, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(skills, { sz: 16, color: MUTED })], { before: 0, after: 0 })] }),
              new TableCell({ width: { size: 1600, type: WidthType.DXA }, borders: cellBorders, shading: { fill: LIGHT_GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [para([run(avail, { sz: 16, bold: true, color: GREEN })], { before: 0, after: 0, align: AlignmentType.CENTER })] }),
              new TableCell({ width: { size: 3760, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i % 2 === 0 ? WHITE : BG_ALT, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(note, { sz: 16, color: MUTED, italic: true })], { before: 0, after: 0 })] }),
            ]
          }))
        ]
      }),

      pageBreak(),

      // ── TIMELINE FEASIBILITY ─────────────────────────
      h1("7. Timeline Feasibility"),

      h2("7.1  Why 10 Weeks is Achievable"),
      body("The 10-week delivery timeline is feasible — not because corners are cut, but because the proprietary enterprise framework eliminates 40–60% of boilerplate development that would otherwise be required in a greenfield build."),
      gap(80),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1600, 2000, 1800, 3960],
        rows: [
          new TableRow({ children: ["Phase", "Duration", "Sprint", "Key Deliverables"].map((h, ci) =>
            new TableCell({ width: { size: [1600,2000,1800,3960][ci], type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(h, { sz: 17, bold: true, color: WHITE })], { before: 0, after: 0 })] })
          )}),
          ...([
            ["Phase 1: Discovery & Config", "Wk 1–2",  "Sprint 1", "Stakeholder workshops, DB schema, CI/CD, Ionic scaffold, Figma sign-off (Gate G1)"],
            ["Phase 2: Core Customisation", "Wk 3–6",  "Sprints 2–3", "Auth, Member Directory, History, Prayer Requests, Video Library (Gate G2 at Wk 6)"],
            ["Phase 3: Feature Completion",  "Wk 7–8",  "Sprint 4",  "Twilio Chat/VoIP, FCM Push, Admin RBAC, Group features, performance audit"],
            ["Phase 4: QA, UAT & Launch",    "Wk 9–10", "Sprint 5",  "xUnit + Playwright + Appium, OWASP, UAT, App Store submission (Gate G3 at Wk 10)"],
            ["Hypercare (Free 30 days)",     "HC 1–2",  "–",         "Bug fixes, monitoring, admin training, source code handover, Phase 2 planning"],
          ]).map(([phase, dur, sprint, del], i) => new TableRow({
            children: [
              new TableCell({ width: { size: 1600, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i % 2 === 0 ? WHITE : BG_ALT, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(phase, { sz: 17, bold: true, color: NAVY })], { before: 0, after: 0 })] }),
              new TableCell({ width: { size: 2000, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i % 2 === 0 ? WHITE : BG_ALT, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(dur, { sz: 17, bold: true, color: GOLD })], { before: 0, after: 0 })] }),
              new TableCell({ width: { size: 1800, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i % 2 === 0 ? WHITE : BG_ALT, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(sprint, { sz: 17, color: MUTED })], { before: 0, after: 0 })] }),
              new TableCell({ width: { size: 3960, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i % 2 === 0 ? WHITE : BG_ALT, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(del, { sz: 16, color: MUTED })], { before: 0, after: 0 })] }),
            ]
          }))
        ]
      }),

      gap(120),
      h2("7.2  Framework Acceleration Factor"),
      body("The proprietary enterprise framework contributes pre-built modules that directly eliminate development work from the critical path:"),
      gap(60),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2800, 1600, 1600, 3360],
        rows: [
          new TableRow({ children: ["Module", "Greenfield (days)", "With Framework (days)", "Time Saved"].map((h, ci) =>
            new TableCell({ width: { size: [2800,1600,1600,3360][ci], type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(h, { sz: 17, bold: true, color: WHITE })], { before: 0, after: 0, align: ci > 0 ? AlignmentType.CENTER : AlignmentType.LEFT })] })
          )}),
          ...([
            ["Firebase Auth + JWT Middleware",     "5–8 days",  "0.5 days",  "Module pre-built; configure ANM client ID only"],
            ["Base .NET 8 API scaffold + DI setup","4–6 days",  "0 days",    "Framework includes full middleware, health checks, OpenAPI"],
            ["EF Core 8 base + migration pipeline","3–4 days",  "0.5 days",  "Migrations pattern established; add ANM schema entities only"],
            ["AWS S3 + CloudFront media pipeline", "6–8 days",  "1 day",     "Pre-built upload/signed URL pattern; configure ANM bucket"],
            ["SignalR WebSocket hub base",         "3–5 days",  "0.5 days",  "Hub pattern pre-built; add ANM-specific events"],
            ["CI/CD GitHub Actions + ECS pipeline","4–5 days",  "0.5 days",  "Reusable workflow; configure ECS service name only"],
            ["Role-based auth (RBAC) middleware",  "3–4 days",  "0 days",    "Already in framework as configurable policy"],
            ["Ionic base project + dark mode",     "2–3 days",  "0.5 days",  "Scaffold with bottom nav, routing, theme vars ready"],
          ]).map(([mod, gf, fw, saved], i) => new TableRow({
            children: [
              new TableCell({ width: { size: 2800, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i % 2 === 0 ? WHITE : BG_ALT, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(mod, { sz: 17, bold: true, color: NAVY })], { before: 0, after: 0 })] }),
              new TableCell({ width: { size: 1600, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i % 2 === 0 ? WHITE : BG_ALT, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [para([run(gf, { sz: 17, color: RED })], { before: 0, after: 0, align: AlignmentType.CENTER })] }),
              new TableCell({ width: { size: 1600, type: WidthType.DXA }, borders: cellBorders, shading: { fill: LIGHT_GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [para([run(fw, { sz: 17, bold: true, color: GREEN })], { before: 0, after: 0, align: AlignmentType.CENTER })] }),
              new TableCell({ width: { size: 3360, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i % 2 === 0 ? WHITE : BG_ALT, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(saved, { sz: 16, color: MUTED, italic: true })], { before: 0, after: 0 })] }),
            ]
          }))
        ]
      }),

      pageBreak(),

      // ── INFRASTRUCTURE & FINANCIAL ───────────────────
      h1("8. Infrastructure & Financial Feasibility"),

      h2("8.1  Implementation Cost Summary (INR)"),
      gap(60),
      infoBox([
        "Implementation: One-time fixed-price engagement | All amounts in INR",
        "Starter Package: ₹32,00,000  (10 weeks, core features — Auth, Directory, Prayer, Video)",
        "Standard Package: ₹38,00,000  (10 weeks, + Twilio Chat/VoIP, FCM, CloudFront, CI/CD, 30-day HC)",
        "Enterprise Package: ₹48,00,000  (10 weeks, + Group Chat, Admin Dashboard, Multi-language, 12-mo SLA)",
      ], LIGHT_GOLD, "D97706"),
      gap(80),

      h2("8.2  Ongoing Monthly Costs (Client-Borne)"),
      gap(60),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4000, 2200, 3160],
        rows: [
          new TableRow({ children: ["Service", "Monthly Cost (₹)", "Notes"].map((h, ci) =>
            new TableCell({ width: { size: [4000,2200,3160][ci], type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(h, { sz: 17, bold: true, color: WHITE })], { before: 0, after: 0 })] })
          )}),
          ...([
            ["AWS RDS PostgreSQL 16 (db.t4g.medium, Multi-AZ)", "₹18,500", "Managed DB with automated backups + failover"],
            ["AWS ECS Fargate (2 tasks, 1 vCPU / 2 GB each)",    "₹12,000", "Scales 1–10 tasks on demand"],
            ["AWS S3 + CloudFront CDN (250 GB + 1 TB egress)",    "₹6,000",  "Video library storage + global CDN"],
            ["AWS CloudWatch + Application Load Balancer",         "₹3,500",  "Monitoring, alerting, WAF rate limiting"],
            ["Twilio Voice + SMS + Conversations Chat",            "₹4,825",  "Usage-based; scales with call/message volume"],
            ["Firebase Auth + FCM",                                "Free",     "Up to 10,000 auth verifications/month free"],
            ["TOTAL MONTHLY INFRASTRUCTURE",                       "₹44,825", "Approx. at 500–1,000 MAU user base"],
          ]).map(([svc, cost, note], i) => new TableRow({
            children: [
              new TableCell({ width: { size: 4000, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i === 6 ? NAVY : (i % 2 === 0 ? WHITE : BG_ALT), type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(svc, { sz: 17, bold: i === 6, color: i === 6 ? WHITE : NAVY })], { before: 0, after: 0 })] }),
              new TableCell({ width: { size: 2200, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i === 6 ? NAVY : (cost === "Free" ? LIGHT_GREEN : (i % 2 === 0 ? WHITE : BG_ALT)), type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [para([run(cost, { sz: 17, bold: true, color: i === 6 ? GOLD : (cost === "Free" ? GREEN : NAVY) })], { before: 0, after: 0, align: AlignmentType.CENTER })] }),
              new TableCell({ width: { size: 3160, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i === 6 ? NAVY : (i % 2 === 0 ? WHITE : BG_ALT), type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(note, { sz: 16, color: i === 6 ? "BBBBBB" : MUTED, italic: true })], { before: 0, after: 0 })] }),
            ]
          }))
        ]
      }),

      gap(120),
      h2("8.3  AMC Options (Post-Warranty)"),
      body("Following the 30-day free Hypercare period, ANM should engage an Annual Maintenance Contract to ensure continued bug fixes, security patching, and SLA-backed support."),
      gap(60),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2400, 2200, 2200, 2560],
        rows: [
          new TableRow({ children: ["Tier", "Monthly (₹)", "Annual (₹)", "Key Inclusions"].map((h, ci) =>
            new TableCell({ width: { size: [2400,2200,2200,2560][ci], type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(h, { sz: 17, bold: true, color: WHITE })], { before: 0, after: 0 })] })
          )}),
          ...([
            ["Basic",     "₹15,000", "₹1,80,000", "Bug fixes, OS compatibility, monthly health check, 48h SLA"],
            ["Standard",  "₹25,000", "₹3,00,000", "Basic + 2 minor enhancements/quarter, 8-hour SLA, priority queue"],
            ["Premium",   "₹40,000", "₹4,80,000", "Standard + 20 dev hours/month, 2-hour SLA, dedicated support manager"],
          ]).map(([tier, mo, yr, inc], i) => new TableRow({
            children: [
              new TableCell({ width: { size: 2400, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i === 1 ? LIGHT_BLUE : (i % 2 === 0 ? WHITE : BG_ALT), type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(tier, { sz: 18, bold: true, color: NAVY })], { before: 0, after: 0 })] }),
              new TableCell({ width: { size: 2200, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i === 1 ? LIGHT_BLUE : (i % 2 === 0 ? WHITE : BG_ALT), type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [para([run(mo, { sz: 18, bold: true, color: i === 1 ? NAVY : MUTED })], { before: 0, after: 0, align: AlignmentType.CENTER })] }),
              new TableCell({ width: { size: 2200, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i === 1 ? LIGHT_BLUE : (i % 2 === 0 ? WHITE : BG_ALT), type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [para([run(yr, { sz: 18, bold: true, color: i === 1 ? NAVY : MUTED })], { before: 0, after: 0, align: AlignmentType.CENTER })] }),
              new TableCell({ width: { size: 2560, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i === 1 ? LIGHT_BLUE : (i % 2 === 0 ? WHITE : BG_ALT), type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(inc, { sz: 16, color: MUTED })], { before: 0, after: 0 })] }),
            ]
          }))
        ]
      }),

      pageBreak(),

      // ── CONCLUSION ───────────────────────────────────
      h1("9. Conclusion & Recommendation"),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [9360],
        rows: [new TableRow({ children: [new TableCell({
          shading: { fill: NAVY, type: ShadingType.CLEAR },
          borders: noBorders,
          margins: { top: 240, bottom: 240, left: 360, right: 360 },
          width: { size: 9360, type: WidthType.DXA },
          children: [
            para([run("OVERALL FEASIBILITY: APPROVED", { sz: 28, bold: true, color: GOLD })], { before: 0, after: 120, align: AlignmentType.CENTER }),
            para([run("The proposed technology stack is technically sound, commercially viable, team-ready, and timeline-achievable. We recommend proceeding with the Standard Package at ₹38L for the 10-week delivery.", { sz: 20, color: WHITE })], { before: 0, after: 0, align: AlignmentType.CENTER }),
          ]
        })]})],
      }),

      gap(120),

      h2("9.1  Summary Scorecard"),
      gap(60),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3200, 1600, 4560],
        rows: [
          new TableRow({ children: ["Feasibility Dimension", "Score", "Summary"].map((h, ci) =>
            new TableCell({ width: { size: [3200,1600,4560][ci], type: WidthType.DXA }, shading: { fill: NAVY, type: ShadingType.CLEAR }, borders: noBorders, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(h, { sz: 17, bold: true, color: WHITE })], { before: 0, after: 0 })] })
          )}),
          ...([
            ["Technical Stack Viability",     "★★★★★", "All technologies production-proven; no experimental dependencies"],
            ["Team Capability",               "★★★★☆", "All roles assigned; minor Appium onboarding in Week 1"],
            ["Timeline (10 Weeks)",           "★★★★☆", "Feasible with framework acceleration; buffer in Sprint 5"],
            ["Infrastructure Readiness",      "★★★★★", "AWS ECS Fargate + RDS ready to provision; no blockers"],
            ["Financial Viability",           "★★★★★", "Clear pricing; monthly costs transparent and controllable"],
            ["Risk Profile",                  "★★★★☆", "No showstopper risks; 3 medium risks with clear mitigations"],
            ["Scalability (Phase 2+)",         "★★★★★", "Stack scales to 50,000+ MAU without architecture change"],
            ["Security & Compliance",         "★★★★★", "OWASP, JWT, WAF, RDS encryption, SSM secrets — fully covered"],
          ]).map(([dim, score, summary], i) => new TableRow({
            children: [
              new TableCell({ width: { size: 3200, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i % 2 === 0 ? WHITE : BG_ALT, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(dim, { sz: 17, bold: true, color: NAVY })], { before: 0, after: 0 })] }),
              new TableCell({ width: { size: 1600, type: WidthType.DXA }, borders: cellBorders, shading: { fill: LIGHT_GOLD, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [para([run(score, { sz: 17, color: GOLD })], { before: 0, after: 0, align: AlignmentType.CENTER })] }),
              new TableCell({ width: { size: 4560, type: WidthType.DXA }, borders: cellBorders, shading: { fill: i % 2 === 0 ? WHITE : BG_ALT, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [para([run(summary, { sz: 16, color: MUTED, italic: true })], { before: 0, after: 0 })] }),
            ]
          }))
        ]
      }),

      gap(120),

      h2("9.2  Next Steps"),
      body("Upon acceptance of this feasibility study, the following actions initiate the delivery:"),
      gap(60),
      bullet("Sign the engagement agreement and release the 30% kickoff deposit"),
      bullet("Week 1, Day 1: Kickoff meeting with ANM leadership and development team"),
      bullet("Week 1: Initiate Twilio DLT registration for SMS (India TRAI compliance)"),
      bullet("Week 1: Firebase project creation, AWS account access, GitHub repo provisioning"),
      bullet("Week 2: Figma high-fidelity designs delivered for Gate G1 sign-off"),
      bullet("Week 2: PostgreSQL schema and API contract (OpenAPI spec) approved"),
      bullet("Ongoing: Weekly demo calls every Friday with ANM stakeholders"),

      gap(120),

      infoBox([
        "RECOMMENDATION: Proceed with Standard Package — ₹38,00,000",
        "Delivery: 10 weeks to App Store + Play Store live",
        "Post-launch: Standard AMC at ₹25,000/month for SLA-backed support",
        "Monthly infrastructure: ~₹44,825 (AWS + Twilio) — client-borne, transparent",
      ], LIGHT_GOLD, "D97706"),

      gap(60),
      divider(),
      gap(60),
      para([
        run("Prepared by: ", { bold: true, sz: 18, color: NAVY }),
        run("Solution Development Team", { sz: 18 }),
        run("   |   ", { sz: 18, color: MUTED }),
        run("Date: ", { bold: true, sz: 18, color: NAVY }),
        run("June 2025", { sz: 18 }),
        run("   |   ", { sz: 18, color: MUTED }),
        run("Version: ", { bold: true, sz: 18, color: NAVY }),
        run("v1.0 — Draft for Review", { sz: 18 }),
      ], { before: 80, after: 80 }),
      para([run("This document is confidential and prepared exclusively for ANM. Do not distribute without written permission from Solution Development Team.", { sz: 16, color: MUTED, italic: true })], { before: 40, after: 40 }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = "ANM_Technical_Feasibility_Study.docx";
  fs.writeFileSync(outPath, buffer);
  console.log(`\n✅  ${outPath} generated successfully!`);
  console.log("   Open in Microsoft Word or Google Docs.");
}).catch(err => {
  console.error("❌  Error:", err);
});
