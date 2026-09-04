import { revalidatePath } from "next/cache";

import { requireMemberContext } from "@/lib/data/member-context";
import {
  grantFocusAreas,
  type GrantApplicationInput,
  validateGrantApplication,
} from "@/lib/grants/domain";
import {
  buildGrantAttachmentStoragePath,
  getGrantAttachmentBucket,
  validateGrantAttachmentFile,
} from "@/lib/grants/storage";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

import { getBoolean, getMoneyCents, getText } from "./grant-action-utils";

type SaveGrantApplicationMode = "draft" | "submit";

export async function saveGrantApplicationFromForm(formData: FormData) {
  const mode = getSaveMode(formData);
  const roundId = getText(formData, "roundId");
  const { member, organization } = await requireMemberContext();
  const input = parseApplicationInput(formData);
  const context = await loadSubmissionContext(roundId, organization.id);

  validateSubmission(input, context, mode);

  const supabase = await createClient();
  const existingApplication = await findExistingApplication(
    supabase,
    context.round.id,
    organization.id,
  );
  assertApplicationCanBeSaved(existingApplication);

  const applicationId = await upsertGrantApplication({
    context,
    existingApplicationId: existingApplication?.id,
    input,
    memberId: member.id,
    mode,
    organizationId: organization.id,
    supabase,
  });

  await uploadGrantAttachments(formData, {
    applicationId,
    organizationId: organization.id,
    uploadedBy: member.id,
  });
  revalidatePath("/grants");
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function loadSubmissionContext(roundId: string, organizationId: string) {
  const supabase = await createClient();
  const [roundResult, organizationResult, subscriptionResult] = await Promise.all([
    supabase
      .from("grant_rounds")
      .select("id, status, opens_at, closes_at, award_amount_cents, budget_cents")
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

  if (roundResult.error) throw roundResult.error;
  if (organizationResult.error) throw organizationResult.error;
  if (subscriptionResult.error) throw subscriptionResult.error;

  return {
    organization: organizationResult.data,
    round: roundResult.data,
    subscriptionStatus: subscriptionResult.data?.status ?? null,
  };
}

type SubmissionContext = Awaited<ReturnType<typeof loadSubmissionContext>>;

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

function validateSubmission(
  input: GrantApplicationInput,
  context: SubmissionContext,
  mode: SaveGrantApplicationMode,
) {
  const validationErrors = validateGrantApplication(
    input,
    {
      applicationClosesAt: context.round.closes_at,
      applicationOpensAt: context.round.opens_at,
      organizationCountryCode: context.organization.country_code,
      organizationCraGoodStanding: context.organization.cra_good_standing,
      organizationRegistrationNumber:
        context.organization.registration_number ?? context.organization.charity_number,
      roundAwardAmountCents: context.round.award_amount_cents,
      roundBudgetCents: context.round.budget_cents,
      roundStatus: context.round.status,
      subscriptionStatus: context.subscriptionStatus,
    },
    mode,
  );

  if (validationErrors.length > 0) throw new Error(validationErrors.join(" "));
  assertGrantFocusArea(input.focusArea);
}

async function findExistingApplication(
  supabase: SupabaseServerClient,
  roundId: string,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("grant_applications")
    .select("id, status")
    .eq("round_id", roundId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function assertApplicationCanBeSaved(
  application: { status: string } | null,
) {
  if (application && application.status !== "draft") {
    throw new Error("This organization already has an application for this round.");
  }
}

type UpsertGrantApplicationInput = {
  context: SubmissionContext;
  existingApplicationId: string | undefined;
  input: GrantApplicationInput;
  memberId: string;
  mode: SaveGrantApplicationMode;
  organizationId: string;
  supabase: SupabaseServerClient;
};

async function upsertGrantApplication({
  context,
  existingApplicationId,
  input,
  memberId,
  mode,
  organizationId,
  supabase,
}: UpsertGrantApplicationInput) {
  const query = existingApplicationId
    ? supabase
        .from("grant_applications")
        .update(buildApplicationValues({ context, input, memberId, mode, organizationId }))
        .eq("id", existingApplicationId)
        .eq("status", "draft")
    : supabase
        .from("grant_applications")
        .insert(buildApplicationValues({ context, input, memberId, mode, organizationId }));

  const { data, error } = await query.select("id").single();
  if (error) throw error;
  if (!data) throw new Error("This application could not be saved.");
  return data.id;
}

function buildApplicationValues({
  context,
  input,
  memberId,
  mode,
  organizationId,
}: Omit<UpsertGrantApplicationInput, "existingApplicationId" | "supabase">) {
  return {
    applicant_user_id: memberId,
    annual_revenue_cents: input.annualRevenueCents,
    cra_good_standing: input.craGoodStanding,
    eligibility_snapshot: {
      organization_country_code: context.organization.country_code,
      organization_registration_number:
        context.organization.registration_number ?? context.organization.charity_number,
      subscription_status: context.subscriptionStatus,
    },
    expected_outcome: input.expectedOutcome,
    focus_area: input.focusArea,
    funding_request: input.fundingRequest,
    organization_id: organizationId,
    registered_in_canada: input.registeredInCanada,
    requested_amount_cents: input.requestedAmountCents,
    round_id: context.round.id,
    status: mode === "submit" ? "submitted" : "draft",
    submitted_at: mode === "submit" ? new Date().toISOString() : null,
    withdrawn_at: null,
  };
}

async function uploadGrantAttachments(
  formData: FormData,
  input: { applicationId: string; organizationId: string; uploadedBy: string },
) {
  const attachments = getGrantAttachments(formData);
  if (!attachments.length) return;

  const admin = createAdminClient();
  for (const attachment of attachments) {
    await uploadGrantAttachment(admin, attachment, input);
  }
}

async function uploadGrantAttachment(
  admin: ReturnType<typeof createAdminClient>,
  attachment: File,
  input: { applicationId: string; organizationId: string; uploadedBy: string },
) {
  validateGrantAttachmentFile(attachment);
  const filePath = buildGrantAttachmentStoragePath(
    input.organizationId,
    input.applicationId,
    attachment.name,
  );
  const { error: uploadError } = await admin.storage
    .from(getGrantAttachmentBucket())
    .upload(filePath, attachment, {
      contentType: attachment.type || undefined,
      upsert: false,
    });

  if (uploadError) throw uploadError;
  await insertGrantAttachmentMetadata(admin, attachment, filePath, input);
}

async function insertGrantAttachmentMetadata(
  admin: ReturnType<typeof createAdminClient>,
  attachment: File,
  filePath: string,
  input: { applicationId: string; organizationId: string; uploadedBy: string },
) {
  const { error } = await admin.from("grant_application_attachments").insert({
    application_id: input.applicationId,
    content_type: attachment.type || null,
    file_name: attachment.name,
    file_path: filePath,
    organization_id: input.organizationId,
    size_bytes: attachment.size,
    uploaded_by: input.uploadedBy,
  });

  if (error) throw error;
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

function getSaveMode(formData: FormData): SaveGrantApplicationMode {
  return getText(formData, "intent") === "submit" ? "submit" : "draft";
}

function assertGrantFocusArea(
  value: string,
): asserts value is (typeof grantFocusAreas)[number] {
  if (!(grantFocusAreas as readonly string[]).includes(value)) {
    throw new Error("Choose a supported focus area.");
  }
}
