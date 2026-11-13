import type { BrandProfile } from "@/lib/types";
import type { Locale } from "@/lib/i18n/locales";

export type ReportBlock =
  | { kind: "text"; label?: string; value: string }
  | { kind: "table"; label?: string; headers: string[]; rows: string[][] };
export type ReportSection = { title: string; blocks: ReportBlock[] };

export function escapeReportHtml(value: unknown): string {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function color(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export function reportFooter(brand: BrandProfile) {
  return [brand.organizationName, brand.address, brand.phone, brand.contactEmail, brand.website]
    .filter(Boolean).join(" | ");
}

export function buildBrandedReportHtml(input: {
  brand: BrandProfile;
  title: string;
  subtitle?: string;
  sections: ReportSection[];
  confidential?: boolean;
  generatedAt?: Date;
  locale?: Locale;
}) {
  const { brand, title, subtitle, sections, confidential } = input;
  const locale = input.locale ?? "en-CA";
  const primary = color(brand.primaryColor, "#2f6b4f");
  const secondary = color(brand.secondaryColor, "#df7a54");
  const logo = brand.logoUrl && /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,[a-zA-Z0-9+/=]+$/.test(brand.logoUrl)
    ? `<img class="logo" src="${escapeReportHtml(brand.logoUrl)}" alt="${escapeReportHtml(brand.organizationName)} logo">`
    : `<div class="initials">${escapeReportHtml(brand.logoInitials)}</div>`;
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "America/Vancouver" })
    .format(input.generatedAt ?? new Date());
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${escapeReportHtml(title)}</title>
  <style>
    @page { size: Letter; margin: 0.72in 0.5in 0.78in; }
    * { box-sizing: border-box; }
    body { color:#172434; background:#fff; font:11px/1.48 Arial,sans-serif; margin:0; }
    .top { border-top:9px solid ${secondary}; padding-top:24px; display:flex; align-items:center; gap:22px; }
    .logo,.initials { width:94px; height:72px; object-fit:contain; border-radius:8px; }
    .initials { background:${primary}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:700; }
    .org { color:${primary}; font-size:13px; font-weight:700; margin:0 0 8px; }
    h1 { color:${primary}; font-size:28px; line-height:1.18; margin:0 0 8px; }
    .meta { color:#536273; margin:0; }
    .confidential { color:#8a2929; font-weight:700; margin-top:10px; }
    section { margin-top:25px; break-inside:avoid; }
    h2 { color:${primary}; font-size:16px; border-bottom:2px solid ${secondary}; padding-bottom:6px; margin:0 0 10px; }
    h3 { font-size:11px; margin:14px 0 5px; }
    p { white-space:pre-wrap; overflow-wrap:anywhere; margin:5px 0 10px; }
    table { border-collapse:collapse; width:100%; table-layout:fixed; margin:8px 0 16px; font-size:9px; }
    th,td { border:1px solid #d8dfe6; padding:6px; text-align:left; vertical-align:top; overflow-wrap:anywhere; white-space:pre-wrap; }
    th { color:#fff; background:${primary}; }
    tr { break-inside:avoid; }
    .empty { color:#64748b; font-style:italic; }
  </style></head><body>
    <header class="top">${logo}<div><p class="org">${escapeReportHtml(brand.organizationName)}</p>
      <h1>${escapeReportHtml(title)}</h1><p class="meta">${escapeReportHtml(subtitle ?? "")} · ${locale === "fr-CA" ? "Généré le" : "Generated"} ${escapeReportHtml(date)}</p>
      ${confidential ? `<p class="confidential">${locale === "fr-CA" ? "Confidentiel" : "Confidential"}</p>` : ""}</div></header>
    <main>${sections.map((section) => `<section><h2>${escapeReportHtml(section.title)}</h2>${section.blocks.length
      ? section.blocks.map((block) => block.kind === "text"
        ? `${block.label ? `<h3>${escapeReportHtml(block.label)}</h3>` : ""}<p>${escapeReportHtml(block.value)}</p>`
        : `${block.label ? `<h3>${escapeReportHtml(block.label)}</h3>` : ""}<table><thead><tr>${block.headers.map((h) => `<th>${escapeReportHtml(h)}</th>`).join("")}</tr></thead><tbody>${block.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeReportHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`).join("")
      : `<p class="empty">${locale === "fr-CA" ? "Aucun renseignement saisi pour l'instant." : "No information entered yet."}</p>`}</section>`).join("")}</main>
  </body></html>`;
}
