const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));

export function buildTestimonyPrintHtml(testimonies, language = "both") {
  const section = (label, lang, text, fallback) => `<section lang="${lang}"><h3>${label}</h3><p>${escapeHtml(text || fallback)}</p></section>`;
  const cards = testimonies.map((t) => `<article>
    <h2>${escapeHtml(t.title || "Answered Prayer")}</h2>
    <div class="details">${escapeHtml([t.createdBy, t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ""].filter(Boolean).join(" · "))}</div>
    ${language !== "hi" ? section("English", "en", t.english, "No English testimony available yet.") : ""}
    ${language !== "en" ? section("Hindi", "hi", t.hindi, "Hindi testimony is not available yet.") : ""}
  </article>`).join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
    <title>Selected Testimonies - Mahima Ministry</title>
    <style>
      @page { size: A4; margin: 16mm; }
      * { box-sizing: border-box; }
      body { margin: 0 auto; padding: 24px; max-width: 900px; color: #172033; font-family: "Segoe UI", "Nirmala UI", Arial, sans-serif; }
      h1 { font-size: 24px; } h2 { font-size: 20px; margin-bottom: 6px; }
      h3 { font-size: 12px; text-transform: uppercase; color: #047857; }
      h2, h3, .details { break-after: avoid; }
      .details, .summary { color: #596579; font-size: 12px; }
      article { border-top: 1px solid #cbd5e1; margin-top: 24px; padding-top: 12px; }
      p { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 12pt; line-height: 1.7; orphans: 3; widows: 3; }
      nav { display: flex; gap: 12px; margin-bottom: 24px; }
      button { padding: 10px 16px; cursor: pointer; }
      @media print { body { padding: 0; max-width: none; } nav { display: none; } article + article { break-before: page; } }
    </style></head><body>
    <nav><button onclick="window.print()">Print / Save PDF</button><button onclick="window.close()">Close</button></nav>
    <h1>Mahima Ministry — Testimonies</h1>
    <div class="summary">${testimonies.length} selected ${testimonies.length === 1 ? "testimony" : "testimonies"}</div>
    ${cards}
  </body></html>`;
}
