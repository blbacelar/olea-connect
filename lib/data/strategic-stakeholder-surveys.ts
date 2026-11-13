import "server-only";

import { createHash } from "node:crypto";

import { allowPublicSurveyRequest } from "@/lib/ed-review/public-rate-limit";
import { getGovernanceGrowthContext } from "@/lib/governance-growth/access";
import { parsePublishedStakeholderQuestions } from "@/lib/strategic-planning/stakeholder-survey";
import { aggregateStakeholderResults } from "@/lib/strategic-planning/stakeholder-results";
import { stakeholderSurveyHasClosed } from "@/lib/strategic-planning/survey-deadline";
import { createAdminClient } from "@/utils/supabase/admin";

export async function getPublicStakeholderSurvey(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  if (!allowPublicSurveyRequest({ campaignTokenHash: createHash("sha256").update(token).digest("hex"),
    operation: "load" })) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.from("strategic_stakeholder_surveys")
    .select("title, audience, questions, status, details, organization_id").eq("public_token", token).maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "open") return null;
  const details = data.details && typeof data.details === "object" ? data.details : {};
  if (stakeholderSurveyHasClosed(details)) return null;
  const [{ data: organization }, { data: workbook }] = await Promise.all([
    admin.from("organizations").select("name").eq("id", data.organization_id).maybeSingle(),
    admin.from("strategic_workbooks").select("state").eq("organization_id", data.organization_id).maybeSingle(),
  ]);
  return { title: data.title, audience: data.audience, details,
    organizationName: String(workbook?.state?.values?.["org.name"] || organization?.name || "your organization"),
    horizon: Number(workbook?.state?.values?.["set.horizon"]) === 5 ? 5 : 3,
    questions: parsePublishedStakeholderQuestions(data.questions, data.audience) };
}

export async function getStakeholderSurveyManagementData() {
  const context = await getGovernanceGrowthContext("strategic_planning");
  if (!context.hasAccess || !context.canManage) return {
    hasAccess: context.hasAccess, canManage: context.canManage, surveys: [],
    organizationName: "", equityOn: true,
  };
  const [{ data: surveys, error }, { data: workbook, error: workbookError }] = await Promise.all([
    context.admin.from("strategic_stakeholder_surveys")
      .select("id, title, audience, status, public_token, questions, details, created_at")
      .eq("organization_id", context.session.organization.id)
      .order("created_at", { ascending: false }),
    context.admin.from("strategic_workbooks").select("state")
      .eq("organization_id", context.session.organization.id).maybeSingle(),
  ]);
  if (error) throw error;
  if (workbookError) throw workbookError;
  const rows = await Promise.all((surveys ?? []).map(async (survey) => {
    const { data: responses, error: responseError } = await context.admin.from("strategic_stakeholder_responses")
      .select("answers").eq("survey_id", survey.id);
    if (responseError) throw responseError;
    const questions = parsePublishedStakeholderQuestions(survey.questions, survey.audience);
    return { ...survey, questions, responseCount: responses?.length ?? 0,
      results: aggregateStakeholderResults(questions, (responses ?? []).map((row) => row.answers)) };
  }));
  const values = workbook?.state?.values ?? {};
  return { hasAccess: true, canManage: true, surveys: rows,
    organizationName: String(values["org.name"] || context.session.organization.name),
    equityOn: values["set.equity"] !== "off" };
}
