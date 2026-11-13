import { NextRequest, NextResponse } from "next/server";

import { createBrandingSnapshot } from "@/lib/data/brand-assets";
import { getOptionalMemberContext } from "@/lib/data/member-context";
import { getRequestLocale } from "@/lib/i18n/server";
import { translateFrenchUiText } from "@/lib/i18n/french-runtime-translations";
import { getStrategicBoardData } from "@/lib/data/strategic-board";
import { getStrategicWorkbookData } from "@/lib/data/strategic-workbook";
import { brandedHtmlResponse, brandedPdfResponse } from "@/lib/reports/pdf-response";
import { strategicBoardSections, strategicPlanSections } from "@/lib/reports/module-sections";
import { buildStrategicPlan } from "@/lib/strategic-planning/workbook-plan";
import { buildExportFileName } from "@/lib/template-renderer/export-files";
import { logError } from "@/lib/observability/logger";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getOptionalMemberContext();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const kind = request.nextUrl.searchParams.get("kind");
  const format = request.nextUrl.searchParams.get("format") ?? "pdf";
  if (kind !== "plan" && kind !== "board" && kind !== "summary") {
    return NextResponse.json({ error: "Choose plan, summary, or board report." }, { status: 400 });
  }
  if (format !== "pdf" && format !== "html") {
    return NextResponse.json({ error: "Choose PDF or HTML." }, { status: 400 });
  }
  try {
    const locale = await getRequestLocale();
    if (kind === "plan" || kind === "summary") {
      const data = await getStrategicWorkbookData();
      if (!data.hasAccess || !data.canManage) return NextResponse.json({ error: "Access denied." }, { status: 403 });
      if (!data.revision) return NextResponse.json({ error: "Save the workbook before exporting the plan." }, { status: 409 });
      const plan = buildStrategicPlan(data.values, data.actions);
      const brand = await createBrandingSnapshot(createAdminClient(), session.organization.brand);
      const t = (value: string) => locale === "fr-CA" ? translateFrenchUiText(value) : value;
      const summary = { title: t("At a glance"), blocks: [
        { kind: "text" as const, label: t("Our mission"), value: plan.mission || t("Add in Module 3B") },
        { kind: "text" as const, label: t("Our vision"), value: plan.vision || t("Add in Module 3B") },
        { kind: "table" as const, label: t("Our strategic goals"),
          headers: [t("Goal"), t("Outcome"), t("Key priorities")],
          rows: plan.goals.map((goal) => [goal.title, goal.outcome, goal.priorities.join("; ")]) },
        { kind: "text" as const, label: t("Our values"), value: plan.values.join("; ") },
      ] };
      const planSections = strategicPlanSections(plan.sections).map((section) => ({
        ...section, title: t(section.title), blocks: section.blocks.map((block) => block.kind === "text" ?
          { ...block, label: block.label ? t(block.label) : undefined } :
          { ...block, label: block.label ? t(block.label) : undefined, headers: block.headers.map(t) }),
      }));
      const sections = kind === "summary" ? [summary] : [summary, ...planSections];
      const input = { brand, locale, title: t(kind === "summary" ? "Strategic plan at a glance" : "Strategic plan"),
        subtitle: locale === "fr-CA" ? `Plan de ${plan.horizon} ans${plan.period ? ` · ${plan.period}` : ""}${plan.approvedOn ? ` · Approuvé par le conseil le ${plan.approvedOn}` : ""}` :
          `${plan.horizon}-year plan${plan.period ? ` · ${plan.period}` : ""}${plan.approvedOn ? ` · Board approved ${plan.approvedOn}` : ""}`,
        sections,
        fileName: buildExportFileName({ organizationName: brand.organizationName,
          templateName: kind === "summary" ? "Strategic plan summary" : "Strategic plan", format: "pdf" }) };
      return format === "pdf" ? brandedPdfResponse(input) : brandedHtmlResponse({ ...input,
        fileName: input.fileName.replace(/\.pdf$/, ".html") });
    }
    const id = request.nextUrl.searchParams.get("snapshot");
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: "Choose a valid shared report." }, { status: 400 });
    }
    const data = await getStrategicBoardData();
    if (!data.hasAccess) return NextResponse.json({ error: "Access denied." }, { status: 403 });
    const snapshot = data.snapshots.find((item) => item.id === id);
    if (!snapshot) return NextResponse.json({ error: "Shared report not found." }, { status: 404 });
    const brand = await createBrandingSnapshot(createAdminClient(), session.organization.brand);
    const input = { brand, locale, title: locale === "fr-CA" ? "Rapport sur l'avancement du plan stratégique" : "Strategic plan progress report",
      subtitle: `${snapshot.title} · ${snapshot.summary.period || ""}`,
      sections: strategicBoardSections(snapshot.summary, locale),
      fileName: buildExportFileName({ organizationName: brand.organizationName, templateName: "Strategic progress", format: "pdf" }) };
    return format === "pdf" ? brandedPdfResponse(input) : brandedHtmlResponse({ ...input,
      fileName: input.fileName.replace(/\.pdf$/, ".html") });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error &&
      String(error.digest).startsWith("NEXT_REDIRECT;")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    logError("[strategic-planning] export failed", error);
    return NextResponse.json({ error: "Could not generate this report right now." }, { status: 500 });
  }
}
