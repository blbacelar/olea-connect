"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  approveEdReviewCompilation,
  assignEdReviewReviewer,
  createEdReviewCampaign,
  getPublicEdReviewCampaign,
  requireEdReviewBoardChairAccess,
  getResponsesForCompilation,
  submitEdReviewResponse,
  updateEdReviewCompilation,
} from "@/lib/data/ed-review";
import {
  campaignKinds,
  compilationSummarySchema,
  validateAnonymousSurveySubmission,
} from "@/lib/ed-review/domain";
import {
  buildDeterministicReviewMetrics,
  compileEdReviewWithAi,
} from "@/lib/ed-review/compilation";

const reviewPath = "/modules/ed-review";
const newCampaignLinkCookie = "ed_review_new_campaign_link";
const isoDateTimeSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/,
    "Use a valid date, time, and timezone.",
  );

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidateReview() {
  revalidatePath(reviewPath);
}

const campaignSchema = z
  .object({
    cycleId: z.string().uuid(),
    kind: z.enum(campaignKinds),
    title: z.string().trim().min(3).max(160),
    opensAt: isoDateTimeSchema,
    closesAt: z.union([isoDateTimeSchema, z.literal("")]),
    recipientEmails: z.array(z.string().email()).max(200),
  })
  .superRefine((value, context) => {
    if (value.closesAt && new Date(value.closesAt) <= new Date(value.opensAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["closesAt"],
        message: "The closing date must be after the opening date.",
      });
    }
  });

const reviewerAssignmentSchema = z.object({
  cycleId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["board_chair", "hr_reviewer", "privileged_auditor"]),
});

export async function createCampaignAction(formData: FormData) {
  const input = campaignSchema.parse({
    cycleId: formValue(formData, "cycleId"),
    kind: formValue(formData, "kind"),
    title: formValue(formData, "title"),
    opensAt: formValue(formData, "opensAt"),
    closesAt: formValue(formData, "closesAt"),
    recipientEmails: formValue(formData, "recipientEmails")
      .split(/[\n,;]/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  });
  const { publicUrl } = await createEdReviewCampaign({
    cycleId: input.cycleId,
    kind: input.kind,
    title: input.title,
    opensAt: new Date(input.opensAt).toISOString(),
    closesAt: input.closesAt ? new Date(input.closesAt).toISOString() : null,
    recipientEmails: input.recipientEmails,
  });
  // The raw token is never persisted. Give the authorized reviewer a brief,
  // server-only handoff window to copy the generic link after creation.
  cookies().set(newCampaignLinkCookie, publicUrl, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 5 * 60,
    path: reviewPath,
  });
  revalidateReview();
  redirect(`${reviewPath}?tab=campaigns&created=1`);
}

export async function dismissNewCampaignLinkAction() {
  cookies().delete(newCampaignLinkCookie);
  revalidateReview();
}

export async function setCycleStatusAction(formData: FormData) {
  const input = z
    .object({
      cycleId: z.string().uuid(),
      status: z.enum(["draft", "open", "closed", "archived"]),
    })
    .parse({
      cycleId: formValue(formData, "cycleId"),
      status: formValue(formData, "status"),
    });
  const { session, supabase, cycle } = await requireEdReviewBoardChairAccess();
  if (cycle.id !== input.cycleId)
    throw new Error("That review cycle is unavailable.");

  const now = new Date().toISOString();
  const patch = {
    status: input.status,
    opened_at: input.status === "open" ? now : null,
    closed_at: input.status === "closed" ? now : null,
    archived_at: input.status === "archived" ? now : null,
  };
  const { error } = await supabase
    .from("ed_review_cycles")
    .update(patch)
    .eq("id", cycle.id);
  if (error) throw error;
  if (
    input.status === "open" ||
    input.status === "closed" ||
    input.status === "archived"
  ) {
    const { error: campaignError } = await supabase
      .from("ed_review_campaigns")
      .update({ status: input.status })
      .eq("cycle_id", cycle.id)
      .neq("status", "archived");
    if (campaignError) throw campaignError;
  }
  const { error: auditError } = await supabase
    .from("ed_review_audit_events")
    .insert({
      cycle_id: cycle.id,
      actor_user_id: session.member.id,
      event_type: `cycle_${input.status}`,
    });
  if (auditError) throw auditError;
  revalidateReview();
  redirect(`${reviewPath}?tab=campaigns`);
}

export async function assignReviewerAction(formData: FormData) {
  const input = reviewerAssignmentSchema.parse({
    cycleId: formValue(formData, "cycleId"),
    userId: formValue(formData, "userId"),
    role: formValue(formData, "role"),
  });
  await assignEdReviewReviewer(input);
  revalidateReview();
  redirect(`${reviewPath}?tab=access`);
}

export async function approveCompilationAction(formData: FormData) {
  const compilationId = z
    .string()
    .uuid()
    .parse(formValue(formData, "compilationId"));
  await approveEdReviewCompilation(compilationId);
  revalidateReview();
  redirect(`${reviewPath}?tab=summary`);
}

function parseFindings(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, ...detail] = line.split("|");
      return { title: title.trim(), detail: detail.join("|").trim() };
    });
}

export async function updateCompilationAction(formData: FormData) {
  const compilationId = z
    .string()
    .uuid()
    .parse(formValue(formData, "compilationId"));
  const summary = compilationSummarySchema.parse({
    executive_summary: formValue(formData, "executiveSummary"),
    strengths: parseFindings(formValue(formData, "strengths")),
    growth_opportunities: parseFindings(
      formValue(formData, "growthOpportunities"),
    ),
    cross_cutting_themes: parseFindings(
      formValue(formData, "crossCuttingThemes"),
    ),
    recommended_discussion_questions: formValue(formData, "discussionQuestions")
      .split("\n")
      .map((question) => question.trim())
      .filter(Boolean),
  });
  await updateEdReviewCompilation({ compilationId, summary });
  revalidateReview();
  redirect(`${reviewPath}?tab=summary`);
}

export async function compileEdReviewAction(formData: FormData) {
  const cycleId = z.string().uuid().parse(formValue(formData, "cycleId"));
  const boardChair = await requireEdReviewBoardChairAccess();
  if (boardChair.cycle.id !== cycleId) {
    throw new Error("That review cycle is unavailable.");
  }
  const { cycle, responseGroups } = await getResponsesForCompilation(cycleId);
  const totalResponseCount = [...responseGroups.values()].reduce(
    (count, responses) => count + responses.length,
    0,
  );
  if (totalResponseCount < cycle.minimum_response_count) {
    throw new Error(
      "More anonymous responses are required before a summary can be compiled.",
    );
  }
  const metrics = buildDeterministicReviewMetrics({
    staffResponses: responseGroups.get("staff") ?? [],
    partnerResponses: responseGroups.get("partner") ?? [],
  });
  const generatedSummary = await compileEdReviewWithAi(metrics);
  const { session, supabase } = boardChair;
  const { data: latest, error: versionError } = await supabase
    .from("ed_review_compilations")
    .select("version")
    .eq("cycle_id", cycle.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (versionError) throw versionError;
  const { error } = await supabase.from("ed_review_compilations").insert({
    cycle_id: cycle.id,
    version: (latest?.version ?? 0) + 1,
    response_count: totalResponseCount,
    generated_by: session.member.id,
    summary: { metrics, generated_summary: generatedSummary },
  });
  if (error) throw error;
  await supabase.from("ed_review_audit_events").insert({
    cycle_id: cycle.id,
    actor_user_id: session.member.id,
    event_type: "summary_compiled",
    details: { response_count: totalResponseCount },
  });
  revalidateReview();
  redirect(`${reviewPath}?tab=summary`);
}

function extractSurveySubmission(
  formData: FormData,
  kind: "staff" | "partner",
) {
  const ratings: Record<string, number> = {};
  const comments: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("rating_")) {
      const questionId = key.replace("rating_", "");
      const rating = Number(value);
      if (Number.isFinite(rating)) ratings[questionId] = rating;
    }
    if (key.startsWith("comment_")) {
      const questionId = key.replace("comment_", "");
      const comment = String(value).trim();
      if (comment) comments[questionId] = comment;
    }
  }
  return validateAnonymousSurveySubmission({
    kind,
    idempotencyKey: formValue(formData, "idempotencyKey"),
    ratings,
    comments,
    overall: {
      greatest_strength: formValue(formData, "greatestStrength"),
      important_change: formValue(formData, "importantChange"),
      additional_comments: formValue(formData, "additionalComments"),
    },
    context:
      kind === "partner" && formValue(formData, "relationshipType")
        ? { relationship_type: formValue(formData, "relationshipType") }
        : undefined,
  });
}

export async function submitAnonymousSurveyAction(formData: FormData) {
  const token = formValue(formData, "token");
  const campaign = await getPublicEdReviewCampaign(token);
  if (!campaign) redirect("/modules/ed-review/survey/unavailable");

  const answers = extractSurveySubmission(formData, campaign.kind);
  await submitEdReviewResponse({ token, answers });

  redirect(`/modules/ed-review/survey/${token}?submitted=1`);
}
