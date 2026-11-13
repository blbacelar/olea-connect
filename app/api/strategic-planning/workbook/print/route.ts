import { NextRequest, NextResponse } from "next/server";

import { createBrandingSnapshot } from "@/lib/data/brand-assets";
import { getOptionalMemberContext } from "@/lib/data/member-context";
import { getStrategicWorkbookData } from "@/lib/data/strategic-workbook";
import { translateFrenchUiText } from "@/lib/i18n/french-runtime-translations";
import { getRequestLocale } from "@/lib/i18n/server";
import { logError } from "@/lib/observability/logger";
import { brandedHtmlResponse, brandedPdfResponse } from "@/lib/reports/pdf-response";
import { strategicPlanSections } from "@/lib/reports/module-sections";
import { workbookModules } from "@/lib/strategic-planning/workbook";
import { buildStrategicPlan } from "@/lib/strategic-planning/workbook-plan";
import { strategicWorkbookPrintSections } from "@/lib/strategic-planning/workbook-print";
import { buildExportFileName } from "@/lib/template-renderer/export-files";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getOptionalMemberContext();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const scope = request.nextUrl.searchParams.get("scope") || "current";
  const moduleId = request.nextUrl.searchParams.get("module") || "m0";
  const format = request.nextUrl.searchParams.get("format") || "pdf";
  if (!["current", "all"].includes(scope) || !["pdf", "html"].includes(format) ||
    !workbookModules.some((module) => module.id === moduleId)) {
    return NextResponse.json({ error: "Choose a valid workbook print option." }, { status: 400 });
  }
  try {
    const locale = await getRequestLocale();
    const data = await getStrategicWorkbookData();
    if (!data.hasAccess || !data.canManage) return NextResponse.json({ error: "Access denied." }, { status: 403 });
    if (!data.revision) return NextResponse.json({ error: "Save the workbook before printing." }, { status: 409 });
    const brand = await createBrandingSnapshot(createAdminClient(), session.organization.brand);
    let sections = strategicWorkbookPrintSections({ values: data.values, actions: data.actions,
      moduleId: scope === "current" ? moduleId : undefined, locale });
    if (scope === "all") sections.unshift(...strategicPlanSections(buildStrategicPlan(data.values, data.actions).sections));
    if (locale === "fr-CA") sections = sections.map((section) => ({ ...section,
      title: section.title.split(" — ").map(translateFrenchUiText).join(" — "),
      blocks: section.blocks.map((block) => block.kind === "text" ? { ...block,
        label: block.label ? translateFrenchUiText(block.label) : undefined } : { ...block,
          label: block.label ? translateFrenchUiText(block.label) : undefined,
          headers: block.headers.map(translateFrenchUiText) }),
    }));
    const englishTitle = scope === "all" ? "Strategic planning workbook" :
      workbookModules.find((module) => module.id === moduleId)?.title || "Strategic planning workbook";
    const title = locale === "fr-CA" ? translateFrenchUiText(englishTitle) : englishTitle;
    const input = { brand, title, locale, subtitle: scope === "all" ?
      locale === "fr-CA" ? "Cahier complet" : "Complete workbook" :
      locale === "fr-CA" ? "Module actuel" : "Current module",
      sections, fileName: buildExportFileName({ organizationName: brand.organizationName,
        templateName: title, format: "pdf" }) };
    return format === "pdf" ? brandedPdfResponse(input) : brandedHtmlResponse({ ...input,
      fileName: input.fileName.replace(/\.pdf$/, ".html") });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error &&
      String(error.digest).startsWith("NEXT_REDIRECT;")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    logError("[strategic-planning] workbook print failed", error);
    return NextResponse.json({ error: "Could not generate the workbook right now." }, { status: 500 });
  }
}
