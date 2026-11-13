"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import * as z from "zod";

import { requireGovernanceGrowthManager } from "@/lib/governance-growth/access";
import { allowPublicSurveyRequest } from "@/lib/ed-review/public-rate-limit";
import {
  parsePublishedStakeholderQuestions, parseStakeholderAnswers,
  questionsForAudience,
} from "@/lib/strategic-planning/stakeholder-survey";
import { aggregateStakeholderResults, mergeStakeholderSummary } from "@/lib/strategic-planning/stakeholder-results";
import { parseWorkbookValues } from "@/lib/strategic-planning/workbook";
import { stakeholderSurveyHasClosed } from "@/lib/strategic-planning/survey-deadline";
import { createAdminClient } from "@/utils/supabase/admin";

const managementPath = "/modules/strategic-planning/surveys";
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export type SurveyActionState = { status: "idle" | "success" | "error"; message: string;
  token?: string; links?: Array<{ audience: string; token: string }> };

function errorState(error: unknown): SurveyActionState {
  return { status: "error", message: error instanceof Error ? error.message : "Could not save this survey." };
}

export async function createStakeholderSurvey(_: SurveyActionState, form: FormData): Promise<SurveyActionState> {
  try {
    const context = await requireGovernanceGrowthManager("strategic_planning");
    const title = z.string().trim().min(3).max(160).parse(form.get("title"));
    const audienceSchema = z.enum(["board", "staff", "volunteers", "clients", "partners", "funders", "community"]);
    const audiences = [...new Set(form.getAll("audience").map((value) => audienceSchema.parse(value)))];
    const detailSchema = z.object({
      intro: z.string().trim().max(3000),
      returnInstructions: z.string().trim().max(500),
      contact: z.string().trim().max(500),
      deadline: z.union([z.literal(""), z.iso.date()]),
      closesAt: z.union([z.literal(""), z.iso.date()]),
      anonymous: z.boolean(),
    });
    const details = detailSchema.parse({ intro: form.get("intro") || "",
      returnInstructions: form.get("returnInstructions") || "", contact: form.get("contact") || "",
      deadline: form.get("deadline") || "", closesAt: form.get("closesAt") || "",
      anonymous: form.get("anonymous") !== "off" });
    const { data: workbook, error: workbookError } = await context.admin.from("strategic_workbooks")
      .select("state").eq("organization_id", context.session.organization.id).maybeSingle();
    if (workbookError) throw workbookError;
    const values = workbook?.state?.values ?? {};
    const organizationName = String(values["org.name"] || context.session.organization.name).slice(0, 160);
    const equityOn = values["set.equity"] !== "off";
    const selectedFor = (audience: string) => {
      const available = questionsForAudience(audience, equityOn, organizationName);
      const selectedIds = form.getAll(`questionId:${audience}`).map(String);
      const ids = form.has(`questionSelectionConfigured:${audience}`) ? [...new Set(selectedIds)] :
        available.filter((question) => question.defaultOn).map((question) => question.id);
      const selected = available.filter((question) => ids.includes(question.id)).map((question) => ({
        ...question, text: z.string().trim().min(5).max(500)
          .parse(form.get(`questionText:${question.id}`) || question.text),
      }));
      if (selected.length !== ids.length) throw new Error(`Invalid questions for ${audience}.`);
      return selected;
    };
    const customCount = z.coerce.number().int().min(3).max(15).parse(form.get("customCount") || 3);
    const custom = Array.from({ length: customCount }, (_, index) => {
      const text = String(form.get(`customText:${index}`) ?? "").trim();
      if (!text) return null;
      const type = z.enum(["open", "agree", "rating", "choice", "multi"])
        .parse(form.get(`customType:${index}`) || "open");
      const options = String(form.get(`customChoices:${index}`) ?? "")
        .split(",").map((option) => option.trim()).filter(Boolean);
      if (["choice", "multi"].includes(type) && options.length < 2) {
        throw new Error(`Custom question ${index + 1} needs at least two comma-separated choices.`);
      }
      const customAudience = z.enum(["all", ...audienceSchema.options]).parse(form.get(`customAudience:${index}`) || "all");
      return { id: `c${index}`, theme: "custom", type, text,
        options: ["choice", "multi"].includes(type) ? options : [], defaultOn: true,
        audience: customAudience };
    }).filter((question): question is NonNullable<typeof question> => question !== null);
    const versions = [...audiences, "everyone"].map((audience) => {
      const selected = selectedFor(audience);
      const customQuestions = custom.filter((question) => question.audience === "all" || question.audience === audience)
        .map(({ audience: _audience, ...question }) => question);
      const questions = parsePublishedStakeholderQuestions([...selected, ...customQuestions], audience);
      return { audience, questions, token: randomBytes(32).toString("hex") };
    });
    const { error } = await context.admin.from("strategic_stakeholder_surveys").insert(versions.map((version) => ({
      organization_id: context.session.organization.id, title, audience: version.audience,
      questions: version.questions, public_token: version.token, details,
      created_by: context.session.member.id,
    })));
    if (error) throw error;
    revalidatePath(managementPath);
    return { status: "success", message: "Survey versions published. Share the links below.",
      token: versions[0].token, links: versions.map((version) => ({ audience: version.audience, token: version.token })) };
  } catch (error) { return errorState(error); }
}

export async function closeStakeholderSurvey(_: SurveyActionState, form: FormData): Promise<SurveyActionState> {
  try {
    const context = await requireGovernanceGrowthManager("strategic_planning");
    const surveyId = z.string().uuid().parse(form.get("surveyId"));
    const { data, error } = await context.admin.from("strategic_stakeholder_surveys")
      .update({ status: "closed" }).eq("id", surveyId)
      .eq("organization_id", context.session.organization.id).eq("status", "open")
      .select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Open survey not found in your organization.");
    revalidatePath(managementPath);
    return { status: "success", message: "Survey closed." };
  } catch (error) { return errorState(error); }
}

export async function reopenStakeholderSurvey(_: SurveyActionState, form: FormData): Promise<SurveyActionState> {
  try {
    const context = await requireGovernanceGrowthManager("strategic_planning");
    const surveyId = z.string().uuid().parse(form.get("surveyId"));
    const { data, error } = await context.admin.from("strategic_stakeholder_surveys")
      .update({ status: "open" }).eq("id", surveyId)
      .eq("organization_id", context.session.organization.id).eq("status", "closed")
      .select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Closed survey not found in your organization.");
    revalidatePath(managementPath);
    return { status: "success", message: "Survey reopened." };
  } catch (error) { return errorState(error); }
}

export async function updateStakeholderSurvey(_: SurveyActionState, form: FormData): Promise<SurveyActionState> {
  try {
    const context = await requireGovernanceGrowthManager("strategic_planning");
    const surveyId = z.string().uuid().parse(form.get("surveyId"));
    const title = z.string().trim().min(3).max(160).parse(form.get("title"));
    const { data: survey, error: loadError } = await context.admin.from("strategic_stakeholder_surveys")
      .select("audience, questions, details").eq("id", surveyId)
      .eq("organization_id", context.session.organization.id).maybeSingle();
    if (loadError) throw loadError;
    if (!survey) throw new Error("Survey not found in your organization.");
    const details = { intro: z.string().trim().max(3000).parse(form.get("intro") || ""),
      returnInstructions: z.string().trim().max(500).parse(form.get("returnInstructions") || ""),
      contact: z.string().trim().max(500).parse(form.get("contact") || ""),
      deadline: z.union([z.literal(""), z.iso.date()]).parse(form.get("deadline") || ""),
      closesAt: z.union([z.literal(""), z.iso.date()]).parse(form.get("closesAt") || ""),
      anonymous: form.get("anonymous") !== "off" };
    const questions = parsePublishedStakeholderQuestions(survey.questions, survey.audience)
      .map((question) => ({ ...question, text: z.string().trim().min(5).max(500)
        .parse(form.get(`questionText:${question.id}`) || question.text) }));
    const { error } = await context.admin.from("strategic_stakeholder_surveys")
      .update({ title, details, questions }).eq("id", surveyId)
      .eq("organization_id", context.session.organization.id);
    if (error) throw error;
    revalidatePath(managementPath);
    return { status: "success", message: "Survey updated. Its existing link still works." };
  } catch (error) { return errorState(error); }
}

export async function addStakeholderResultsToWorkbook(_: SurveyActionState, form: FormData): Promise<SurveyActionState> {
  try {
    const context = await requireGovernanceGrowthManager("strategic_planning");
    const surveyId = z.string().uuid().parse(form.get("surveyId"));
    const { data: survey, error: surveyError } = await context.admin.from("strategic_stakeholder_surveys")
      .select("title, audience, questions").eq("id", surveyId)
      .eq("organization_id", context.session.organization.id).maybeSingle();
    if (surveyError) throw surveyError;
    if (!survey) throw new Error("Survey not found in your organization.");
    const { data: responses, error: responsesError } = await context.admin.from("strategic_stakeholder_responses")
      .select("answers").eq("survey_id", surveyId);
    if (responsesError) throw responsesError;
    if ((responses?.length || 0) < 5) throw new Error("At least five responses are needed before sharing results.");
    const questions = parsePublishedStakeholderQuestions(survey.questions, survey.audience);
    const results = aggregateStakeholderResults(questions, (responses || []).map((row) => row.answers));
    const lines = results.filter((result) => result.answered).map((result) => {
      const top = result.options.filter((option) => option.count > 0)
        .sort((a, b) => b.count - a.count).slice(0, 3).map((option) => `${option.label} (${option.count})`).join(", ");
      return `${result.text}: ${result.answered} answers${result.average === null ? "" : `, average ${result.average}/5`}${top ? `; top choices ${top}` : ""}`;
    });
    const { data: workbook, error: workbookError } = await context.admin.from("strategic_workbooks")
      .select("revision, state").eq("organization_id", context.session.organization.id).maybeSingle();
    if (workbookError) throw workbookError;
    if (!workbook) throw new Error("Save the workbook before adding survey results.");
    const values = parseWorkbookValues(workbook.state?.values ?? {});
    const summary = `From our stakeholder survey (${responses!.length} responses, ${survey.audience})\n${lines.join("\n")}`;
    const current = values["m2.heard"] || "";
    values["m2.heard"] = mergeStakeholderSummary(current, summary);
    const parsed = parseWorkbookValues(values);
    const { data: updated, error: saveError } = await context.admin.from("strategic_workbooks")
      .update({ revision: workbook.revision + 1, state: { ...workbook.state, values: parsed },
        updated_by: context.session.member.id, updated_at: new Date().toISOString() })
      .eq("organization_id", context.session.organization.id).eq("revision", workbook.revision)
      .select("revision").maybeSingle();
    if (saveError) throw saveError;
    if (!updated) throw new Error("Another editor changed the workbook. Reload and try again.");
    revalidatePath("/modules/strategic-planning/workbook");
    return { status: "success", message: "Aggregate results added to What we heard (2D)." };
  } catch (error) { return errorState(error); }
}

export async function submitStakeholderSurvey(_: SurveyActionState, form: FormData): Promise<SurveyActionState> {
  try {
    const token = tokenSchema.parse(form.get("token"));
    if (!allowPublicSurveyRequest({ campaignTokenHash: createHash("sha256").update(token).digest("hex"),
      operation: "submit" })) throw new Error("Too many submissions. Try again in a minute.");
    const admin = createAdminClient();
    const { data: survey, error: surveyError } = await admin.from("strategic_stakeholder_surveys")
      .select("id, status, questions, audience, details").eq("public_token", token).maybeSingle();
    if (surveyError) throw surveyError;
    if (!survey || survey.status !== "open") throw new Error("This survey is unavailable or closed.");
    if (stakeholderSurveyHasClosed(survey.details)) {
      throw new Error("This survey has closed for responses.");
    }
    const questions = parsePublishedStakeholderQuestions(survey.questions, survey.audience);
    const answers = parseStakeholderAnswers(Object.fromEntries(questions.flatMap((question) => {
      const values = form.getAll(`answer:${question.id}`).map(String).filter(Boolean);
      return values.length ? [[question.id, question.type === "multi" ? values : values[0]]] : [];
    })), questions);
    const { error } = await admin.from("strategic_stakeholder_responses")
      .insert({ survey_id: survey.id, answers });
    if (error) throw error;
    return { status: "success", message: survey.details?.anonymous === false ?
      "Your response was submitted." : "Your anonymous response was submitted." };
  } catch (error) { return errorState(error); }
}
