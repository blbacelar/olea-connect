import type { BrandProfile } from "@/lib/types";
import type { Locale } from "@/lib/i18n/locales";

import { buildBrandedReportHtml, reportFooter, type ReportSection } from "./branded-html";

export async function brandedPdfResponse(input: {
  brand: BrandProfile;
  title: string;
  subtitle?: string;
  sections: ReportSection[];
  fileName: string;
  confidential?: boolean;
  locale?: Locale;
}) {
  const { renderHtmlToPdfBuffer } = await import("@/lib/template-renderer/html-pdf-export");
  const html = buildBrandedReportHtml(input);
  const pdf = await renderHtmlToPdfBuffer(html, { footerText: reportFooter(input.brand) });
  return new Response(new Uint8Array(pdf), { headers: {
    "Cache-Control": "private, no-store",
    "Content-Disposition": `attachment; filename="${input.fileName}"`,
    "Content-Type": "application/pdf",
    "X-Content-Type-Options": "nosniff",
  } });
}

export function brandedHtmlResponse(input: {
  brand: BrandProfile;
  title: string;
  subtitle?: string;
  sections: ReportSection[];
  fileName: string;
  confidential?: boolean;
  locale?: Locale;
}) {
  const html = buildBrandedReportHtml(input);
  return new Response(html, { headers: {
    "Cache-Control": "private, no-store",
    "Content-Disposition": `attachment; filename="${input.fileName}"`,
    "Content-Type": "text/html; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  } });
}
