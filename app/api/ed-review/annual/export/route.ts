import { NextRequest, NextResponse } from "next/server";

import { createBrandingSnapshot } from "@/lib/data/brand-assets";
import { AnnualDocumentAccessError, getAnnualDocumentData } from "@/lib/data/ed-annual-document";
import { getOptionalMemberContext } from "@/lib/data/member-context";
import { annualCompensationSchema, annualGeneralSchema } from "@/lib/ed-review/annual-document";
import { getRequestLocale } from "@/lib/i18n/server";
import { annualEdSections } from "@/lib/reports/module-sections";
import { brandedPdfResponse } from "@/lib/reports/pdf-response";
import { buildExportBaseName, buildExportFileName } from "@/lib/template-renderer/export-files";
import { logError } from "@/lib/observability/logger";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getOptionalMemberContext();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const format = request.nextUrl.searchParams.get("format") ?? "pdf";
  if (format !== "pdf" && format !== "json" && format !== "archive") {
    return NextResponse.json({ error: "Choose PDF, report JSON, or archive JSON." }, { status: 400 });
  }
  try {
    const data = await getAnnualDocumentData({
      previewRole: request.nextUrl.searchParams.get("preview") === "cfo" ? "cfo" : undefined,
    });
    const locale = await getRequestLocale();
    const brand = await createBrandingSnapshot(createAdminClient(), session.organization.brand);
    if (format === "archive") {
      if (data.role !== "full" || !data.view.cover || !data.view.selfNarrative ||
        !data.view.chairNarrative || !data.view.development || !data.view.signoff || !data.view.compensation) {
        return NextResponse.json({ error: "Full document access is required for an editable archive." }, { status: 403 });
      }
      const general = annualGeneralSchema.parse({ cover: data.view.cover,
        competencies: data.view.competencies, selfNarrative: data.view.selfNarrative,
        chairNarrative: data.view.chairNarrative, development: data.view.development,
        signoff: data.view.signoff });
      const compensation = annualCompensationSchema.parse(data.view.compensation);
      const archive = { _type: "ed-review", version: 1, savedAt: new Date().toISOString(),
        general, compensation };
      const archiveName = `${buildExportBaseName({ organizationName: brand.organizationName,
        templateName: `ED annual evaluation ${data.cycle.review_year}` })}.json`;
      return new Response(JSON.stringify(archive, null, 2), { headers: {
        "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="${archiveName}"`,
        "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff",
      } });
    }
    const sections = annualEdSections(data, locale);
    const fileName = buildExportFileName({ organizationName: brand.organizationName,
      templateName: `ED annual evaluation ${data.cycle.review_year}`, format: "pdf" });
    if (format === "json") return new Response(JSON.stringify({ report: "ed-annual-evaluation", version: 1,
      exported: new Date().toISOString(), organization: { name: brand.organizationName,
        primaryColor: brand.primaryColor, secondaryColor: brand.secondaryColor },
      cycle: { title: data.cycle.title, year: data.cycle.review_year },
      accessRole: data.role, sections }, null, 2), { headers: {
      "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="${fileName.replace(/\.pdf$/, ".json")}"`,
      "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff",
    } });
    return brandedPdfResponse({ brand, title: locale === "fr-CA"
      ? "Évaluation annuelle de la direction générale" : "ED / CEO Annual Evaluation",
      subtitle: `${data.cycle.title} · ${data.cycle.review_year}`,
      sections, confidential: true, fileName, locale });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error &&
      String(error.digest).startsWith("NEXT_REDIRECT;")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (error instanceof AnnualDocumentAccessError) return NextResponse.json({ error: "Access denied." }, { status: 403 });
    logError("[ed-review] annual export failed", error);
    return NextResponse.json({ error: "Could not generate this report right now." }, { status: 500 });
  }
}
