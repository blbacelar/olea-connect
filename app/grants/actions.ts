"use server";

import { revalidatePath } from "next/cache";

import { requireMemberContext } from "@/lib/data/member-context";
import {
  grantAwardStatuses,
  grantFocusAreas,
  type GrantApplicationInput,
  validateGrantApplication,
} from "@/lib/grants/domain";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { parseFormBoolean, parseStrictDecimal, parseStrictInteger } from "@/lib/input-validation";
import {
  buildGrantAttachmentStoragePath,
  getGrantAttachmentBucket,
  validateGrantAttachmentFile,
} from "@/lib/grants/storage";

type GrantDecision = "in_review" | "shortlisted" | "approved" | "declined";

const adminRoles = ["super_admin", "grants_admin"] as const;

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getBoolean(formData: FormData, key: string) {
  return parseFormBoolean(formData.get(key), key);
}

function getMoneyCents(formData: FormData, key: string) {
  const amount = parseStrictDecimal(getText(formData, key), key, 0);
  return Math.round(amount * 100);
}

function getGrantAttachments(formData: FormData) {
  return formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function getNullableMoneyCents(formData: FormData, key: string) {
  const value = getText(formData, key);
  return value ? getMoneyCents(formData, key) : null;
}

function assertEnum<T extends readonly string[]>(
  values: T,
  value: string,
  message: string,
): asserts value is T[number] {
  if (!values.includes(value)) throw new Error(message);
}

async function requireGrantsAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in before managing grants.");

  const admin = createAdminClient();
  const { data: role, error } = await admin
    .from("platform_user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", [...adminRoles])
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!role) throw new Error("Only grants administrators can manage decisions.");

  return { admin, userId: user.id };
}

async function loadSubmissionContext(roundId: string, organizationId: string) {
  const supabase = await createClient();
  const [
    { data: round, error: roundError },
    { data: organization, error: organizationError },
    { data: subscription, error: subscriptionError },
  ] = await Promise.all([
    supabase
      .from("grant_rounds")
      .select(
        "id, status, opens_at, closes_at, award_amount_cents, budget_cents",
      )
      .eq("id", roundId)
      .single(),
    supabase
      .from("organizations")
      .select(
        "country_code, registration_number, charity_number, annual_revenue_cents, cra_good_standing",
      )
      .eq("id", organizationId)
      .single(),
    supabase
      .from("subscriptions")
      .select("status")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (roundError) throw roundError;
  if (organizationError) throw organizationError;
  if (subscriptionError) throw subscriptionError;

  return {
    round,
    organization,
    subscriptionStatus: subscription?.status ?? null,
  };
}

function parseApplicationInput(formData: FormData): GrantApplicationInput {
  return {
    annualRevenueCents: getNullableMoneyCents(formData, "annualRevenue"),
    craGoodStanding: getBoolean(formData, "craGoodStanding"),
    expectedOutcome: getText(formData, "expectedOutcome"),
    focusArea: getText(formData, "focusArea"),
    fundingRequest: getText(formData, "fundingRequest"),
    registeredInCanada: getBoolean(formData, "registeredInCanada"),
    requestedAmountCents: getMoneyCents(formData, "requestedAmount"),
  };
}

export async function saveGrantApplication(formData: FormData) {
  const mode = getText(formData, "intent") === "submit" ? "submit" : "draft";
  const roundId = getText(formData, "roundId");
  const { member, organization } = await requireMemberContext();
  const input = parseApplicationInput(formData);
  const { round, organization: organizationRecord, subscriptionStatus } =
    await loadSubmissionContext(roundId, organization.id);
  const validationErrors = validateGrantApplication(
    input,
    {
      applicationClosesAt: round.closes_at,
      applicationOpensAt: round.opens_at,
      organizationCountryCode: organizationRecord.country_code,
      organizationCraGoodStanding: organizationRecord.cra_good_standing,
      organizationRegistrationNumber:
        organizationRecord.registration_number ??
        organizationRecord.charity_number,
      roundAwardAmountCents: round.award_amount_cents,
      roundBudgetCents: round.budget_cents,
      roundStatus: round.status,
      subscriptionStatus,
    },
    mode,
  );

  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join(" "));
  }

  assertEnum(grantFocusAreas, input.focusArea, "Choose a supported focus area.");

  const supabase = await createClient();
  const { data: existingApplication, error: existingError } = await supabase
    .from("grant_applications")
    .select("id, status")
    .eq("round_id", round.id)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (
    existingApplication &&
    existingApplication.status !== "draft"
  ) {
    throw new Error("This organization already has an application for this round.");
  }

  const values = {
    applicant_user_id: member.id,
    annual_revenue_cents: input.annualRevenueCents,
    cra_good_standing: input.craGoodStanding,
    eligibility_snapshot: {
      organization_country_code: organizationRecord.country_code,
      organization_registration_number:
        organizationRecord.registration_number ??
        organizationRecord.charity_number,
      subscription_status: subscriptionStatus,
    },
    expected_outcome: input.expectedOutcome,
    focus_area: input.focusArea,
    funding_request: input.fundingRequest,
    organization_id: organization.id,
    registered_in_canada: input.registeredInCanada,
    requested_amount_cents: input.requestedAmountCents,
    round_id: round.id,
    status: mode === "submit" ? "submitted" : "draft",
    submitted_at: mode === "submit" ? new Date().toISOString() : null,
    withdrawn_at: null,
  };

  const query = existingApplication
    ? supabase
        .from("grant_applications")
        .update(values)
        .eq("id", existingApplication.id)
        .eq("status", "draft")
    : supabase.from("grant_applications").insert(values);

  const { data, error } = await query.select("id").single();
  if (error) throw error;
  if (!data) throw new Error("This application could not be saved.");

  const attachments = getGrantAttachments(formData);
  if (attachments.length > 0) {
    const admin = createAdminClient();
    for (const attachment of attachments) {
      validateGrantAttachmentFile(attachment);
      const filePath = buildGrantAttachmentStoragePath(organization.id, data.id, attachment.name);
      const { error: uploadError } = await admin.storage
        .from(getGrantAttachmentBucket())
        .upload(filePath, attachment, {
          contentType: attachment.type || undefined,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: metadataError } = await admin.from("grant_application_attachments").insert({
        application_id: data.id,
        content_type: attachment.type || null,
        file_name: attachment.name,
        file_path: filePath,
        organization_id: organization.id,
        size_bytes: attachment.size,
        uploaded_by: member.id,
      });

      if (metadataError) throw metadataError;
    }
  }

  revalidatePath("/grants");
}

export async function withdrawGrantApplication(formData: FormData) {
  const applicationId = getText(formData, "applicationId");
  const { organization } = await requireMemberContext();
  const admin = createAdminClient();
  const { data: application, error: applicationError } = await admin
    .from("grant_applications")
    .select("id, organization_id, status")
    .eq("id", applicationId)
    .single();

  if (applicationError) throw applicationError;
  if (application.organization_id !== organization.id) {
    throw new Error("This application belongs to another organization.");
  }
  if (!["draft", "submitted", "in_review", "shortlisted"].includes(application.status)) {
    throw new Error("This application can no longer be withdrawn.");
  }

  const { error } = await admin
    .from("grant_applications")
    .update({
      status: "withdrawn",
      withdrawn_at: new Date().toISOString(),
    })
    .eq("id", application.id)
    .eq("organization_id", organization.id)
    .in("status", ["draft", "submitted", "in_review", "shortlisted"])
    .select("id")
    .single();

  if (error) throw error;
  revalidatePath("/grants");
}

export async function reviewGrantApplication(formData: FormData) {
  const applicationId = getText(formData, "applicationId");
  const decision = getText(formData, "decision") as GrantDecision;
  const score = parseStrictInteger(getText(formData, "score"), "Score", 1);
  const { admin, userId } = await requireGrantsAdmin();

  if (!["in_review", "shortlisted", "approved", "declined"].includes(decision)) {
    throw new Error("Choose a supported decision.");
  }
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new Error("Score must be between 1 and 5.");
  }

  const { data: application, error: applicationLookupError } = await admin
    .from("grant_applications")
    .select("id, status, grant_awards(id, status)")
    .eq("id", applicationId)
    .single();

  if (applicationLookupError) throw applicationLookupError;
  const award = Array.isArray(application.grant_awards)
    ? application.grant_awards[0]
    : application.grant_awards;
  if (!["submitted", "in_review", "shortlisted"].includes(application.status)) {
    throw new Error("This application can no longer be reviewed.");
  }
  if (decision === "declined" && award && award.status !== "canceled") {
    throw new Error("Cancel the award before declining this application.");
  }

  const { error: applicationError } = await admin
    .from("grant_applications")
    .update({ status: decision })
    .eq("id", applicationId)
    .in("status", ["submitted", "in_review", "shortlisted"])
    .select("id")
    .single();

  if (applicationError) throw applicationError;

  const { error: reviewError } = await admin
    .from("grant_application_reviews")
    .upsert(
      {
        application_id: applicationId,
        internal_notes: getText(formData, "internalNotes") || null,
        recommendation: getText(formData, "recommendation") || null,
        reviewed_at: new Date().toISOString(),
        reviewer_user_id: userId,
        score,
      },
      { onConflict: "application_id,reviewer_user_id" },
    );

  if (reviewError) throw reviewError;
  revalidatePath("/grants");
}

export async function awardGrantApplication(formData: FormData) {
  const applicationId = getText(formData, "applicationId");
  const amountCents = getMoneyCents(formData, "awardAmount");
  await requireGrantsAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_grant_award", {
    target_amount_cents: amountCents,
    target_application_id: applicationId,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/grants");
}

export async function updateGrantAward(formData: FormData) {
  const awardId = getText(formData, "awardId");
  const status = getText(formData, "awardStatus");
  const paymentReference = getText(formData, "paymentReference");
  const { admin } = await requireGrantsAdmin();

  assertEnum(grantAwardStatuses, status, "Choose a supported award status.");

  const values: {
    paid_on: string | null;
    status: string;
    payment_reference?: string | null;
  } = {
    paid_on: status === "paid" ? new Date().toISOString().slice(0, 10) : null,
    status,
  };

  if (paymentReference) {
    values.payment_reference = paymentReference;
  }

  const { error } = await admin
    .from("grant_awards")
    .update(values)
    .eq("id", awardId);

  if (error) throw error;
  revalidatePath("/grants");
}

export async function saveImpactStory(formData: FormData) {
  const applicationId = getText(formData, "applicationId");
  const impactStory = getText(formData, "impactStory");
  const { organization } = await requireMemberContext();
  const admin = createAdminClient();
  const { data: application, error: applicationError } = await admin
    .from("grant_applications")
    .select("id, organization_id, grant_awards(id, status)")
    .eq("id", applicationId)
    .single();

  if (applicationError) throw applicationError;
  if (application.organization_id !== organization.id) {
    throw new Error("This application belongs to another organization.");
  }

  const award = Array.isArray(application.grant_awards)
    ? application.grant_awards[0]
    : application.grant_awards;

  if (!award || award.status === "canceled") {
    throw new Error("No active award exists for this application.");
  }

  const { error } = await admin
    .from("grant_awards")
    .update({
      impact_story: impactStory || null,
      impact_story_consent: getBoolean(formData, "impactStoryConsent"),
      outcome_received_at: impactStory ? new Date().toISOString() : null,
    })
    .eq("id", award.id);

  if (error) throw error;
  revalidatePath("/grants");
}
