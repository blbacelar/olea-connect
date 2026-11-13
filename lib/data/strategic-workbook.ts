import "server-only";

import { getGovernanceGrowthContext } from "@/lib/governance-growth/access";
import { parseWorkbookActions } from "@/lib/strategic-planning/action-tracker";
import { parseWorkbookValues, workbookDefaultValues } from "@/lib/strategic-planning/workbook";
import { parsePublishedStakeholderQuestions, type StakeholderQuestion } from "@/lib/strategic-planning/stakeholder-survey";

export async function getStrategicWorkbookData() {
  const context = await getGovernanceGrowthContext("strategic_planning");
  if (!context.hasAccess || !context.canManage) {
    return { hasAccess: context.hasAccess, canManage: context.canManage,
      revision: 0, values: workbookDefaultValues(), actions: [], surveyQuestions: [] as StakeholderQuestion[],
      onlineResponseCounts: {} as Record<string, number> };
  }
  const [{ data, error }, { data: surveys, error: surveyError }] = await Promise.all([
    context.admin.from("strategic_workbooks").select("revision, state")
      .eq("organization_id", context.session.organization.id).maybeSingle(),
    context.admin.from("strategic_stakeholder_surveys").select("id, audience, questions, created_at")
      .eq("organization_id", context.session.organization.id).order("created_at", { ascending: false }),
  ]);
  if (error) throw error;
  if (surveyError) throw surveyError;
  const questions = new Map<string, StakeholderQuestion>();
  const latest = new Map<string, string>();
  for (const survey of surveys || []) {
    if (!latest.has(survey.audience)) latest.set(survey.audience, survey.id);
    for (const question of parsePublishedStakeholderQuestions(survey.questions, survey.audience)) {
      if (!questions.has(question.id)) questions.set(question.id, question);
    }
  }
  const counts = await Promise.all([...latest].map(async ([audience, surveyId]) => {
    const { count, error: countError } = await context.admin.from("strategic_stakeholder_responses")
      .select("id", { count: "exact", head: true }).eq("survey_id", surveyId);
    if (countError) throw countError;
    return [audience, count || 0] as const;
  }));
  return {
    hasAccess: true,
    canManage: true,
    revision: data?.revision ?? 0,
    values: data ? parseWorkbookValues(data.state?.values ?? {}) : workbookDefaultValues(),
    actions: data ? parseWorkbookActions(data.state?.actions ?? []) : [],
    surveyQuestions: [...questions.values()],
    onlineResponseCounts: Object.fromEntries(counts),
  };
}
