import { NextRequest, NextResponse } from "next/server";

import { createBrandingSnapshot } from "@/lib/data/brand-assets";
import { getGovernanceGrowthContext } from "@/lib/governance-growth/access";
import { getRequestLocale } from "@/lib/i18n/server";
import { logError } from "@/lib/observability/logger";
import { reportFooter } from "@/lib/reports/branded-html";
import { getSiteUrl } from "@/lib/site-metadata";
import { parsePublishedStakeholderQuestions } from "@/lib/strategic-planning/stakeholder-survey";
import { buildStakeholderSurveyDocument } from "@/lib/strategic-planning/survey-document";
import { buildExportBaseName } from "@/lib/template-renderer/export-files";
import { renderHtmlToPdfBuffer } from "@/lib/template-renderer/html-pdf-export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const context = await getGovernanceGrowthContext("strategic_planning");
  if (!context.hasAccess || !context.canManage) return NextResponse.json({ error: "Access denied." }, { status: 403 });
  const id = request.nextUrl.searchParams.get("survey");
  const format = request.nextUrl.searchParams.get("format") ?? "pdf";
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Choose a valid survey." }, { status: 400 });
  }
  if (format !== "pdf" && format !== "html" && format !== "doc") {
    return NextResponse.json({ error: "Choose PDF, HTML, or Word." }, { status: 400 });
  }
  try {
    const locale = await getRequestLocale();
    const [{ data: survey, error }, { data: workbook, error: workbookError }] = await Promise.all([
      context.admin.from("strategic_stakeholder_surveys")
        .select("title, audience, questions, public_token, details")
        .eq("organization_id", context.session.organization.id).eq("id", id).maybeSingle(),
      context.admin.from("strategic_workbooks").select("state")
        .eq("organization_id", context.session.organization.id).maybeSingle(),
    ]);
    if (error) throw error;
    if (workbookError) throw workbookError;
    if (!survey) return NextResponse.json({ error: "Survey not found." }, { status: 404 });
    const questions = parsePublishedStakeholderQuestions(survey.questions, survey.audience);
    const brand = await createBrandingSnapshot(context.admin, context.session.organization.brand);
    const horizonValue = Number(workbook?.state?.values?.["set.horizon"]);
    const horizon = horizonValue === 5 ? 5 : 3;
    const html = buildStakeholderSurveyDocument({ brand, title: survey.title, audience: survey.audience,
      questions, onlineUrl: `${getSiteUrl()}/modules/strategic-planning/survey/${survey.public_token}`,
      horizon, details: survey.details, locale, word: format === "doc" });
    const base = buildExportBaseName({ organizationName: brand.organizationName, templateName: survey.title });
    const extension = format === "doc" ? "doc" : format === "html" ? "html" : "pdf";
    const headers = { "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="${base}.${extension}"`,
      "X-Content-Type-Options": "nosniff" };
    if (format === "pdf") {
      const pdf = await renderHtmlToPdfBuffer(html, { footerText: reportFooter(brand) });
      return new Response(new Uint8Array(pdf), { headers: { ...headers, "Content-Type": "application/pdf" } });
    }
    return new Response(html, { headers: { ...headers,
      "Content-Type": format === "doc" ? "application/msword; charset=utf-8" : "text/html; charset=utf-8" } });
  } catch (error) {
    logError("[strategic-planning] survey export failed", error);
    return NextResponse.json({ error: "Could not generate this survey right now." }, { status: 500 });
  }
}
