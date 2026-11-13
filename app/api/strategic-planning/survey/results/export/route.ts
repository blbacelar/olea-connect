import { NextRequest, NextResponse } from "next/server";

import { createBrandingSnapshot } from "@/lib/data/brand-assets";
import { getGovernanceGrowthContext } from "@/lib/governance-growth/access";
import { logError } from "@/lib/observability/logger";
import { brandedPdfResponse } from "@/lib/reports/pdf-response";
import type { ReportSection } from "@/lib/reports/branded-html";
import { aggregateStakeholderResults } from "@/lib/strategic-planning/stakeholder-results";
import { parsePublishedStakeholderQuestions } from "@/lib/strategic-planning/stakeholder-survey";
import { buildExportFileName } from "@/lib/template-renderer/export-files";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const context = await getGovernanceGrowthContext("strategic_planning");
  if (!context.hasAccess || !context.canManage) return NextResponse.json({ error: "Access denied." }, { status: 403 });
  const id = request.nextUrl.searchParams.get("survey");
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Choose a valid survey." }, { status: 400 });
  }
  try {
    const { data: survey, error } = await context.admin.from("strategic_stakeholder_surveys")
      .select("title, audience, questions").eq("organization_id", context.session.organization.id)
      .eq("id", id).maybeSingle();
    if (error) throw error;
    if (!survey) return NextResponse.json({ error: "Survey not found." }, { status: 404 });
    const { data: responses, error: responseError } = await context.admin.from("strategic_stakeholder_responses")
      .select("answers").eq("survey_id", id);
    if (responseError) throw responseError;
    if ((responses?.length ?? 0) < 5) return NextResponse.json({ error: "At least five responses are required." }, { status: 409 });
    const questions = parsePublishedStakeholderQuestions(survey.questions, survey.audience);
    const results = aggregateStakeholderResults(questions, (responses ?? []).map((row) => row.answers));
    const sections: ReportSection[] = [
      { title: "Participation", blocks: [{ kind: "text", label: "Responses", value: String(responses!.length) },
        { kind: "text", value: "Results are grouped. Individual answers are not included." }] },
      ...results.map((result) => ({ title: result.text, blocks: result.answered < 5
        ? [{ kind: "text" as const, value: "Suppressed: fewer than five answers to this question." }]
        : [{ kind: "text" as const, label: "Answers", value: String(result.answered) },
          ...(result.average === null ? [] : [{ kind: "text" as const, label: "Average / 5", value: String(result.average) }]),
          ...(result.options.length ? [{ kind: "table" as const, headers: ["Answer", "Count"],
            rows: result.options.map((option) => [option.label, String(option.count)]) }] : [])] })),
    ];
    const brand = await createBrandingSnapshot(context.admin, context.session.organization.brand);
    return brandedPdfResponse({ brand, title: "Stakeholder survey results", subtitle: survey.title,
      sections, fileName: buildExportFileName({ organizationName: brand.organizationName,
        templateName: `${survey.title} results`, format: "pdf" }) });
  } catch (error) {
    logError("[strategic-planning] survey results export failed", error);
    return NextResponse.json({ error: "Could not generate this report right now." }, { status: 500 });
  }
}
