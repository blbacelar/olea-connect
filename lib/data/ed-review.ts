import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import { requireMemberContext } from "@/lib/data/member-context";
import {
  getEmailRecipient,
  getEmailSender,
  getReplyTo,
  getResend,
} from "@/lib/email/server";
import { edReviewSurveyInvitationEmail } from "@/lib/email/templates";
import { getSiteUrl } from "@/lib/site-metadata";
import type {
  CompilationSummary,
  EdReviewCampaignKind,
  EdReviewCampaignStatus,
  EdReviewReviewerRole,
  SurveyResponseForAggregation,
} from "@/lib/ed-review/domain";
import { allowPublicSurveyRequest } from "@/lib/ed-review/public-rate-limit";
import {
  createAdminClient,
  createPublicServerClient,
} from "@/utils/supabase/admin";

export type EdReviewCampaign = {
  id: string;
  kind: EdReviewCampaignKind;
  title: string;
  status: EdReviewCampaignStatus;
  opensAt: string;
  closesAt: string | null;
  responseCount: number;
};

export type EdReviewCampaignDelivery = {
  queued: number;
  sent: number;
  failed: number;
};

export type EdReviewData = {
  cycle: {
    id: string;
    title: string;
    reviewYear: number;
    status: EdReviewCampaignStatus;
    minimumResponseCount: number;
  };
  isBoardChair: boolean;
  campaigns: EdReviewCampaign[];
  reviewers: Array<{
    id: string;
    userId: string;
    role: EdReviewReviewerRole;
    name: string;
  }>;
  availableReviewers: Array<{
    userId: string;
    name: string;
  }>;
  compilations: Array<{
    id: string;
    version: number;
    responseCount: number;
    summary: unknown;
    approvedAt: string | null;
    createdAt: string;
  }>;
  auditEvents: Array<{
    id: number;
    eventType: string;
    createdAt: string;
  }>;
};

export type EdReviewBoardChairRecoveryData = {
  cycle: {
    id: string;
    title: string;
    reviewYear: number;
  };
  availableReviewers: Array<{
    userId: string;
    name: string;
  }>;
};

export class EdReviewReviewerAssignmentRequiredError extends Error {
  constructor() {
    super(
      "You need an explicit Board Chair or HR reviewer assignment to access this review.",
    );
    this.name = "EdReviewReviewerAssignmentRequiredError";
  }
}

type CycleRow = {
  id: string;
  title: string;
  review_year: number;
  status: EdReviewCampaignStatus;
  minimum_response_count: number;
  organization_id: string;
};

type ReviewerAssignmentRow = {
  id: string;
  user_id: string;
  role: EdReviewReviewerRole;
};

function isWorkspaceAdmin(role: string) {
  return role === "owner" || role === "admin";
}

function createSharedToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashValue(token) };
}

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function getCurrentCycle(organizationId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ed_review_cycles")
    .select(
      "id, title, review_year, status, minimum_response_count, organization_id",
    )
    .eq("organization_id", organizationId)
    .neq("status", "archived")
    .order("review_year", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as CycleRow | null;
}

async function ensureReviewerAccess() {
  const session = await requireMemberContext();
  const supabase = createAdminClient();
  let cycle = await getCurrentCycle(session.organization.id);

  if (!cycle) {
    if (!isWorkspaceAdmin(session.member.membershipRole)) {
      throw new Error(
        "Only organization owners and administrators can start an ED review.",
      );
    }
    const minimumResponseCount = Number(
      process.env.SURVEY_MINIMUM_RESPONSE_COUNT ?? 3,
    );
    const { data, error } = await supabase
      .from("ed_review_cycles")
      .insert({
        organization_id: session.organization.id,
        title: "ED/CEO annual review",
        review_year: new Date().getFullYear(),
        minimum_response_count: Number.isInteger(minimumResponseCount)
          ? Math.min(Math.max(minimumResponseCount, 3), 1000)
          : 3,
        created_by: session.member.id,
      })
      .select(
        "id, title, review_year, status, minimum_response_count, organization_id",
      )
      .single();
    if (error) throw error;
    cycle = data as CycleRow;
    const { error: assignmentError } = await supabase
      .from("ed_review_reviewer_assignments")
      .insert({
        cycle_id: cycle.id,
        user_id: session.member.id,
        role: "board_chair",
        granted_by: session.member.id,
      });
    if (assignmentError) throw assignmentError;
    await supabase.from("ed_review_audit_events").insert({
      cycle_id: cycle.id,
      actor_user_id: session.member.id,
      event_type: "cycle_created",
    });
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("ed_review_reviewer_assignments")
    .select("id, user_id, role")
    .eq("cycle_id", cycle.id)
    .eq("user_id", session.member.id);
  if (assignmentError) throw assignmentError;
  if (!(assignments ?? []).length) {
    throw new EdReviewReviewerAssignmentRequiredError();
  }

  return {
    session,
    supabase,
    cycle,
    assignments: assignments as ReviewerAssignmentRow[],
  };
}

async function requireBoardChairAccess() {
  const context = await ensureReviewerAccess();
  if (
    !context.assignments.some((assignment) => assignment.role === "board_chair")
  ) {
    throw new Error(
      "Only an explicitly assigned Board Chair can manage review access.",
    );
  }
  return context;
}

async function getActiveWorkspaceReviewers(
  supabase: ReturnType<typeof createAdminClient>,
  organizationId: string,
) {
  const { data: members, error: membersError } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("status", "active");
  if (membersError) throw membersError;

  const userIds = (members ?? []).map((member) => member.user_id);
  if (!userIds.length) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);
  if (profilesError) throw profilesError;

  const names = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      profile.full_name || "Workspace member",
    ]),
  );

  return userIds.map((userId) => ({
    userId,
    name: names.get(userId) ?? "Workspace member",
  }));
}

export async function requireEdReviewAccess() {
  return ensureReviewerAccess();
}

export async function requireEdReviewBoardChairAccess() {
  return requireBoardChairAccess();
}

export async function getEdReviewData(): Promise<EdReviewData> {
  const { supabase, cycle, assignments } = await ensureReviewerAccess();
  const [campaignsResult, reviewersResult, compilationsResult, auditResult] =
    await Promise.all([
      supabase
        .from("ed_review_campaigns")
        .select("id, kind, title, status, opens_at, closes_at")
        .eq("cycle_id", cycle.id)
        .order("created_at"),
      supabase
        .from("ed_review_reviewer_assignments")
        .select("id, user_id, role")
        .eq("cycle_id", cycle.id),
      supabase
        .from("ed_review_compilations")
        .select("id, version, response_count, summary, approved_at, created_at")
        .eq("cycle_id", cycle.id)
        .order("version", { ascending: false }),
      supabase
        .from("ed_review_audit_events")
        .select("id, event_type, created_at")
        .eq("cycle_id", cycle.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
  for (const result of [
    campaignsResult,
    reviewersResult,
    compilationsResult,
    auditResult,
  ]) {
    if (result.error) throw result.error;
  }

  const campaignIds = (campaignsResult.data ?? []).map(
    (campaign) => campaign.id,
  );
  const responseCounts = new Map<string, number>();
  if (campaignIds.length) {
    const { data: responseRows, error } = await supabase
      .from("ed_review_responses")
      .select("campaign_id")
      .in("campaign_id", campaignIds);
    if (error) throw error;
    for (const row of responseRows ?? []) {
      responseCounts.set(
        row.campaign_id,
        (responseCounts.get(row.campaign_id) ?? 0) + 1,
      );
    }
  }

  const reviewerUserIds = (reviewersResult.data ?? []).map(
    (reviewer) => reviewer.user_id,
  );
  const names = new Map<string, string>();
  if (reviewerUserIds.length) {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", reviewerUserIds);
    if (error) throw error;
    for (const profile of profiles ?? [])
      names.set(profile.id, profile.full_name || "Assigned reviewer");
  }

  const availableReviewers = await getActiveWorkspaceReviewers(
    supabase,
    cycle.organization_id,
  );
  for (const reviewer of availableReviewers) {
    if (!names.has(reviewer.userId)) names.set(reviewer.userId, reviewer.name);
  }

  return {
    cycle: {
      id: cycle.id,
      title: cycle.title,
      reviewYear: cycle.review_year,
      status: cycle.status,
      minimumResponseCount: cycle.minimum_response_count,
    },
    isBoardChair: assignments.some(
      (assignment) => assignment.role === "board_chair",
    ),
    campaigns: (campaignsResult.data ?? []).map((campaign) => ({
      id: campaign.id,
      kind: campaign.kind as EdReviewCampaignKind,
      title: campaign.title,
      status: campaign.status as EdReviewCampaignStatus,
      opensAt: campaign.opens_at,
      closesAt: campaign.closes_at,
      responseCount: responseCounts.get(campaign.id) ?? 0,
    })),
    reviewers: (reviewersResult.data ?? []).map((reviewer) => ({
      id: reviewer.id,
      userId: reviewer.user_id,
      role: reviewer.role as EdReviewReviewerRole,
      name: names.get(reviewer.user_id) ?? "Assigned reviewer",
    })),
    availableReviewers,
    compilations: (compilationsResult.data ?? []).map((compilation) => ({
      id: compilation.id,
      version: compilation.version,
      responseCount: compilation.response_count,
      summary: compilation.summary,
      approvedAt: compilation.approved_at,
      createdAt: compilation.created_at,
    })),
    auditEvents: (auditResult.data ?? []).map((event) => ({
      id: event.id,
      eventType: event.event_type,
      createdAt: event.created_at,
    })),
  };
}

export async function getEdReviewBoardChairRecoveryData(): Promise<EdReviewBoardChairRecoveryData | null> {
  const session = await requireMemberContext();
  if (!isWorkspaceAdmin(session.member.membershipRole)) return null;

  const cycle = await getCurrentCycle(session.organization.id);
  if (!cycle) return null;

  const supabase = createAdminClient();
  const availableReviewers = await getActiveWorkspaceReviewers(
    supabase,
    cycle.organization_id,
  );

  return {
    cycle: {
      id: cycle.id,
      title: cycle.title,
      reviewYear: cycle.review_year,
    },
    availableReviewers,
  };
}

export async function assignEdReviewReviewer(input: {
  cycleId: string;
  userId: string;
  role: Extract<EdReviewReviewerRole, "board_chair" | "hr_reviewer">;
}) {
  const { cycle, session, supabase } = await requireBoardChairAccess();
  if (cycle.id !== input.cycleId)
    throw new Error("That review cycle is unavailable.");

  const { error } = await supabase.rpc(
    "assign_ed_review_reviewer_assignment",
    {
      p_actor_user_id: session.member.id,
      p_cycle_id: cycle.id,
      p_role: input.role,
      p_user_id: input.userId,
    },
  );
  if (error) throw error;
}

const reviewerAccessMutationResultSchema = z.object({
  reviewer_user_id: z.string().uuid(),
  previous_role: z
    .enum(["board_chair", "hr_reviewer", "privileged_auditor"])
    .optional(),
  role: z.enum(["board_chair", "hr_reviewer", "privileged_auditor"]),
});

type ReviewerAccessMutationResult = z.infer<
  typeof reviewerAccessMutationResultSchema
>;

function parseReviewerAccessMutationResult(
  value: unknown,
): ReviewerAccessMutationResult {
  return reviewerAccessMutationResultSchema.parse(value);
}

export async function updateEdReviewReviewerAssignment(input: {
  cycleId: string;
  assignmentId: string;
  role: Extract<EdReviewReviewerRole, "board_chair" | "hr_reviewer">;
}) {
  const { cycle, session, supabase } = await requireBoardChairAccess();
  if (cycle.id !== input.cycleId) {
    throw new Error("That review cycle is unavailable.");
  }

  const { data, error } = await supabase.rpc(
    "update_ed_review_reviewer_assignment",
    {
      p_cycle_id: cycle.id,
      p_assignment_id: input.assignmentId,
      p_next_role: input.role,
      p_actor_user_id: session.member.id,
    },
  );
  if (error) throw error;

  const mutation = parseReviewerAccessMutationResult(data);

  return mutation;
}

export async function revokeEdReviewReviewerAssignment(input: {
  cycleId: string;
  assignmentId: string;
}) {
  const { cycle, session, supabase } = await requireBoardChairAccess();
  if (cycle.id !== input.cycleId) {
    throw new Error("That review cycle is unavailable.");
  }

  const { data, error } = await supabase.rpc(
    "revoke_ed_review_reviewer_assignment",
    {
      p_cycle_id: cycle.id,
      p_assignment_id: input.assignmentId,
      p_actor_user_id: session.member.id,
    },
  );
  if (error) throw error;

  const mutation = parseReviewerAccessMutationResult(data);

  return mutation;
}

export async function appointEdReviewBoardChair(input: {
  cycleId: string;
  userId: string;
}) {
  const session = await requireMemberContext();
  if (!isWorkspaceAdmin(session.member.membershipRole)) {
    throw new Error("Only organization owners and administrators can recover Board Chair access.");
  }

  const cycle = await getCurrentCycle(session.organization.id);
  if (!cycle || cycle.id !== input.cycleId) {
    throw new Error("That review cycle is unavailable.");
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc(
    "appoint_ed_review_board_chair_recovery",
    {
      p_actor_user_id: session.member.id,
      p_cycle_id: cycle.id,
      p_user_id: input.userId,
    },
  );
  if (error) throw error;
}

export async function approveEdReviewCompilation(compilationId: string) {
  const { cycle, session, supabase } = await requireBoardChairAccess();
  const { data: approvedCompilation, error } = await supabase
    .from("ed_review_compilations")
    .update({
      approved_at: new Date().toISOString(),
      approved_by: session.member.id,
    })
    .eq("id", compilationId)
    .eq("cycle_id", cycle.id)
    .is("approved_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!approvedCompilation) {
    throw new Error("This summary is already approved or unavailable.");
  }
  const { error: auditError } = await supabase
    .from("ed_review_audit_events")
    .insert({
      cycle_id: cycle.id,
      actor_user_id: session.member.id,
      event_type: "summary_approved",
      details: { compilation_id: compilationId },
    });
  if (auditError) throw auditError;
}

export async function updateEdReviewCompilation(input: {
  compilationId: string;
  summary: CompilationSummary;
}) {
  const { cycle, session, supabase } = await requireBoardChairAccess();
  const { data: compilation, error: readError } = await supabase
    .from("ed_review_compilations")
    .select("summary, approved_at")
    .eq("id", input.compilationId)
    .eq("cycle_id", cycle.id)
    .single();
  if (readError) throw readError;
  if (compilation.approved_at) {
    throw new Error(
      "Approved summaries are immutable. Compile a new version to make revisions.",
    );
  }
  const current = compilation.summary as Record<string, unknown>;
  const { data: updatedCompilation, error } = await supabase
    .from("ed_review_compilations")
    .update({ summary: { ...current, generated_summary: input.summary } })
    .eq("id", input.compilationId)
    .eq("cycle_id", cycle.id)
    .is("approved_at", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!updatedCompilation) {
    throw new Error(
      "This summary was approved before the revision could be saved. Compile a new version to make revisions.",
    );
  }
  const { error: auditError } = await supabase
    .from("ed_review_audit_events")
    .insert({
      cycle_id: cycle.id,
      actor_user_id: session.member.id,
      event_type: "summary_edited",
      details: { compilation_id: input.compilationId },
    });
  if (auditError) throw auditError;
}

export async function createEdReviewCampaign(input: {
  cycleId: string;
  kind: EdReviewCampaignKind;
  title: string;
  opensAt: string;
  closesAt?: string | null;
  recipientEmails?: string[];
}) {
  const { session, supabase, cycle } = await requireBoardChairAccess();
  if (cycle.id !== input.cycleId)
    throw new Error("That review cycle is unavailable.");
  if (input.recipientEmails?.length && cycle.status !== "open") {
    throw new Error(
      "Open the review before sending a campaign to its distribution list.",
    );
  }
  const { token, tokenHash } = createSharedToken();
  const { data, error } = await supabase
    .from("ed_review_campaigns")
    .insert({
      cycle_id: cycle.id,
      kind: input.kind,
      title: input.title,
      token_hash: tokenHash,
      status: cycle.status === "open" ? "open" : "draft",
      opens_at: input.opensAt,
      closes_at: input.closesAt ?? null,
      created_by: session.member.id,
    })
    .select("id")
    .single();
  if (error) throw error;

  const publicUrl = `${getSiteUrl()}/modules/ed-review/survey/${token}`;
  const recipientEmails = [...new Set(input.recipientEmails ?? [])];
  let delivery: EdReviewCampaignDelivery | undefined;

  if (recipientEmails.length) {
    delivery = await deliverCampaignLinks({
      campaignId: data.id,
      campaignTitle: input.title,
      closesAt: input.closesAt ?? null,
      organizationName: session.organization.name,
      publicUrl,
      recipientEmails,
      createdBy: session.member.id,
      supabase,
    });
  }

  await supabase.from("ed_review_audit_events").insert({
    cycle_id: cycle.id,
    actor_user_id: session.member.id,
    event_type: "campaign_created",
    details: {
      campaign_id: data.id,
      kind: input.kind,
      delivery: delivery ?? { queued: 0, sent: 0, failed: 0 },
    },
  });
  return { publicUrl, delivery };
}

async function deliverCampaignLinks({
  campaignId,
  campaignTitle,
  closesAt,
  organizationName,
  publicUrl,
  recipientEmails,
  createdBy,
  supabase,
}: {
  campaignId: string;
  campaignTitle: string;
  closesAt: string | null;
  organizationName: string;
  publicUrl: string;
  recipientEmails: string[];
  createdBy: string;
  supabase: ReturnType<typeof createAdminClient>;
}): Promise<EdReviewCampaignDelivery> {
  const { data: distributions, error: distributionError } = await supabase
    .from("ed_review_survey_distributions")
    .insert(
      recipientEmails.map((recipientEmail) => ({
        campaign_id: campaignId,
        recipient_email: recipientEmail,
        created_by: createdBy,
      })),
    )
    .select("id, recipient_email");
  if (distributionError) throw distributionError;

  const email = edReviewSurveyInvitationEmail({
    organizationName,
    campaignTitle,
    surveyUrl: publicUrl,
    closesAt,
  });
  const settled = await Promise.all(
    (distributions ?? []).map(async (distribution) => {
      try {
        const recipient = getEmailRecipient(distribution.recipient_email);
        const { data, error } = await getResend().emails.send({
          from: getEmailSender(),
          replyTo: getReplyTo(),
          to: recipient,
          subject: email.subject,
          html: email.html,
          text:
            recipient === distribution.recipient_email
              ? email.text
              : `[Non-production email for ${distribution.recipient_email}]\n\n${email.text}`,
          tags: [
            { name: "event_type", value: "ed_review_survey" },
            {
              name: "environment",
              value: process.env.VERCEL_ENV ?? "development",
            },
          ],
        });
        if (error || !data?.id)
          throw new Error(error?.message ?? "No email ID returned.");
        const { error: updateError } = await supabase
          .from("ed_review_survey_distributions")
          .update({
            status: "sent",
            provider_message_id: data.id,
            sent_at: new Date().toISOString(),
          })
          .eq("id", distribution.id);
        if (updateError) throw updateError;
        return "sent" as const;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message.slice(0, 600)
            : "Email delivery failed.";
        await supabase
          .from("ed_review_survey_distributions")
          .update({
            status: "failed",
            failed_at: new Date().toISOString(),
            failure_reason: message,
          })
          .eq("id", distribution.id);
        return "failed" as const;
      }
    }),
  );

  return {
    queued: 0,
    sent: settled.filter((result) => result === "sent").length,
    failed: settled.filter((result) => result === "failed").length,
  };
}

export async function getPublicEdReviewCampaign(token: string) {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return null;
  if (
    !allowPublicSurveyRequest({
      campaignTokenHash: hashValue(token),
      operation: "load",
    })
  ) {
    return null;
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ed_review_campaigns")
    .select(
      "id, kind, title, status, opens_at, closes_at, ed_review_cycles!inner(title, status)",
    )
    .eq("token_hash", hashValue(token))
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const review = Array.isArray(data.ed_review_cycles)
    ? data.ed_review_cycles[0]
    : data.ed_review_cycles;
  const now = Date.now();
  if (
    !review ||
    review.status !== "open" ||
    data.status !== "open" ||
    new Date(data.opens_at).getTime() > now ||
    (data.closes_at && new Date(data.closes_at).getTime() <= now)
  ) {
    return null;
  }
  return {
    kind: data.kind as EdReviewCampaignKind,
    title: data.title,
    reviewTitle: review.title,
  };
}

export async function submitEdReviewResponse(input: {
  token: string;
  answers: SurveyResponseForAggregation["answers"];
}) {
  const tokenHash = hashValue(input.token);
  if (
    !allowPublicSurveyRequest({
      campaignTokenHash: tokenHash,
      operation: "submit",
    })
  ) {
    throw new Error(
      "Too many survey submissions. Please wait a minute and try again.",
    );
  }
  const campaign = await getPublicEdReviewCampaign(input.token);
  if (!campaign) {
    throw new Error("This survey link is unavailable.");
  }
  const supabase = createPublicServerClient();
  const { error } = await supabase.rpc("submit_ed_review_response", {
    p_token_hash: tokenHash,
    p_idempotency_hash: createHash("sha256")
      .update(input.answers.idempotencyKey)
      .digest("hex"),
    p_answers: {
      ratings: input.answers.ratings,
      comments: input.answers.comments,
      overall: input.answers.overall,
      ...(input.answers.context ? { context: input.answers.context } : {}),
    },
  });
  if (error) {
    throw new Error("We could not submit the survey. Please try again.");
  }
}

export async function getResponsesForCompilation(cycleId: string) {
  const { cycle, supabase } = await ensureReviewerAccess();
  if (cycle.id !== cycleId)
    throw new Error("That review cycle is unavailable.");
  const { data: campaigns, error: campaignsError } = await supabase
    .from("ed_review_campaigns")
    .select("id, kind")
    .eq("cycle_id", cycle.id)
    .neq("status", "archived");
  if (campaignsError) throw campaignsError;
  const campaignIds = (campaigns ?? []).map((campaign) => campaign.id);
  if (!campaignIds.length)
    return {
      cycle,
      campaigns: [],
      responseGroups: new Map<
        EdReviewCampaignKind,
        SurveyResponseForAggregation[]
      >(),
    };
  const { data: responses, error: responsesError } = await supabase
    .from("ed_review_responses")
    .select("campaign_id, answers")
    .in("campaign_id", campaignIds);
  if (responsesError) throw responsesError;
  const kindByCampaignId = new Map(
    (campaigns ?? []).map((campaign) => [
      campaign.id,
      campaign.kind as EdReviewCampaignKind,
    ]),
  );
  const responseGroups = new Map<
    EdReviewCampaignKind,
    SurveyResponseForAggregation[]
  >([
    ["staff", []],
    ["partner", []],
  ]);
  for (const response of responses ?? []) {
    const kind = kindByCampaignId.get(response.campaign_id);
    if (!kind) continue;
    responseGroups.get(kind)?.push({
      answers: response.answers as SurveyResponseForAggregation["answers"],
    });
  }
  return { cycle, campaigns: campaigns ?? [], responseGroups };
}
