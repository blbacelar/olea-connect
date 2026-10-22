import { revalidatePath } from "next/cache";

import {
  getText,
  parseScore,
  requireGrantsAdmin,
} from "./grant-action-utils";

type GrantDecision = "in_review" | "shortlisted" | "approved" | "declined";

const grantDecisions = [
  "in_review",
  "shortlisted",
  "approved",
  "declined",
] as const;

export async function reviewGrantApplicationFromForm(formData: FormData) {
  const applicationId = getText(formData, "applicationId");
  const decision = parseGrantDecision(formData);
  const score = parseScore(formData);
  const { admin, userId } = await requireGrantsAdmin();
  const application = await loadReviewableApplication(admin, applicationId);

  assertApplicationCanBeReviewed(application.status);
  assertDeclineAllowed(decision, getApplicationAward(application.grant_awards));
  await updateGrantApplicationStatus(admin, applicationId, decision);
  await upsertGrantApplicationReview(admin, {
    applicationId,
    formData,
    score,
    userId,
  });
  revalidatePath("/grants");
}

function parseGrantDecision(formData: FormData): GrantDecision {
  const decision = getText(formData, "decision");
  if (!grantDecisions.includes(decision as GrantDecision)) {
    throw new Error("Choose a supported decision.");
  }
  return decision as GrantDecision;
}

type GrantsAdminClient = Awaited<ReturnType<typeof requireGrantsAdmin>>["admin"];

async function loadReviewableApplication(
  admin: GrantsAdminClient,
  applicationId: string,
) {
  const { data, error } = await admin
    .from("grant_applications")
    .select("id, status, grant_awards(id, status)")
    .eq("id", applicationId)
    .single();

  if (error) throw error;
  return data;
}

type GrantAwardLookup =
  | { id: string; status: string }
  | Array<{ id: string; status: string }>
  | null;

function getApplicationAward(grantAwards: GrantAwardLookup) {
  return Array.isArray(grantAwards) ? grantAwards[0] : grantAwards;
}

function assertApplicationCanBeReviewed(status: string) {
  if (!["submitted", "in_review", "shortlisted"].includes(status)) {
    throw new Error("This application can no longer be reviewed.");
  }
}

function assertDeclineAllowed(
  decision: GrantDecision,
  award: { status: string } | null | undefined,
) {
  if (decision === "declined" && award && award.status !== "canceled") {
    throw new Error("Cancel the award before declining this application.");
  }
}

function updateGrantApplicationStatus(
  admin: GrantsAdminClient,
  applicationId: string,
  decision: GrantDecision,
) {
  return admin
    .from("grant_applications")
    .update({ status: decision })
    .eq("id", applicationId)
    .in("status", ["submitted", "in_review", "shortlisted"])
    .select("id")
    .single()
    .then(({ error }) => {
      if (error) throw error;
    });
}

function upsertGrantApplicationReview(
  admin: GrantsAdminClient,
  input: {
    applicationId: string;
    formData: FormData;
    score: number;
    userId: string;
  },
) {
  return admin
    .from("grant_application_reviews")
    .upsert(
      {
        application_id: input.applicationId,
        internal_notes: getText(input.formData, "internalNotes") || null,
        recommendation: getText(input.formData, "recommendation") || null,
        reviewed_at: new Date().toISOString(),
        reviewer_user_id: input.userId,
        score: input.score,
      },
      { onConflict: "application_id,reviewer_user_id" },
    )
    .then(({ error }) => {
      if (error) throw error;
    });
}
