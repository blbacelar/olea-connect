import "server-only";

import { FORM_SELECT_EMPTY_VALUE } from "@/lib/forms/constants";
import { parseFormBoolean, parseIsoDate } from "@/lib/input-validation";
import {
  normalizeOptionalEmail,
  normalizeOptionalPhone,
  normalizeSponsorSlug,
  validateCurrencyToCents,
  validateOptionalCurrencyToCents,
  validateOptionalHttpUrl,
} from "@/lib/sponsors/domain";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const sponsorManagerRoles = ["super_admin", "finance_admin"] as const;
const sponsorStatuses = ["prospect", "active", "paused", "former", "declined"] as const;
const sponsorshipStatuses = [
  "draft",
  "proposed",
  "active",
  "completed",
  "canceled",
] as const;
const contributionStatuses = [
  "pledged",
  "invoiced",
  "received",
  "allocated",
] as const;

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

export function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function selectText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value === FORM_SELECT_EMPTY_VALUE ? "" : value;
}

function nullableText(formData: FormData, key: string) {
  return text(formData, key) || null;
}

function checked(formData: FormData, key: string) {
  return parseFormBoolean(formData.get(key), key);
}

function assertChoice<T extends readonly string[]>(
  choices: T,
  value: string,
  message: string,
): asserts value is T[number] {
  if (!choices.includes(value)) throw new Error(message);
}

export function getActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

export async function requireSponsorManager() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in before managing sponsors.");

  const admin = createAdminClient();
  const { data: role, error } = await admin
    .from("platform_user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", [...sponsorManagerRoles])
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!role) {
    throw new Error(
      "Only finance or platform administrators can manage sponsors.",
    );
  }

  const { data: membership, error: membershipError } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership?.organization_id) {
    throw new Error("We could not find an active workspace for this account.");
  }

  return { admin, organizationId: membership.organization_id, userId: user.id };
}

export async function writeSponsorAudit({
  action,
  changes,
  entityId,
  entityType,
  metadata = {},
  organizationId,
  userId,
}: {
  action: string;
  changes: Record<string, unknown> | null;
  entityId: string | null;
  entityType: string;
  metadata?: Record<string, unknown>;
  organizationId: string;
  userId: string;
}) {
  const { error } = await createAdminClient().from("audit_logs").insert({
    action,
    actor_user_id: userId,
    changes,
    entity_id: entityId,
    entity_type: entityType,
    metadata,
    organization_id: organizationId,
  });

  if (error) throw error;
}

export function buildSponsorProfileValues(formData: FormData) {
  const name = text(formData, "name");
  const status = text(formData, "status") || "prospect";
  const slug = normalizeSponsorSlug(text(formData, "slug") || name);

  assertChoice(sponsorStatuses, status, "Choose a supported sponsor status.");
  if (!name) throw new Error("Sponsor name is required.");
  if (!slug) throw new Error("Sponsor slug is required.");

  return {
    category: nullableText(formData, "category"),
    directory_description: nullableText(formData, "directoryDescription"),
    directory_email: normalizeOptionalEmail(
      nullableText(formData, "directoryEmail"),
      "Directory email",
    ),
    directory_phone: normalizeOptionalPhone(
      nullableText(formData, "directoryPhone"),
      "Directory phone",
    ),
    directory_visible: checked(formData, "directoryVisible"),
    name,
    short_description: nullableText(formData, "shortDescription"),
    slug,
    status,
    values_reviewed_at: checked(formData, "valuesReviewed")
      ? new Date().toISOString()
      : null,
    website_url: validateOptionalHttpUrl(
      nullableText(formData, "websiteUrl"),
      "Website",
    ),
  };
}

export async function upsertSponsorPrimaryContact(
  admin: SupabaseAdminClient,
  formData: FormData,
  sponsorId: string,
) {
  const contactName = text(formData, "primaryContactName");
  const contactEmail = normalizeOptionalEmail(
    nullableText(formData, "primaryContactEmail"),
    "Primary contact email",
  );
  const contactPhone = normalizeOptionalPhone(
    nullableText(formData, "primaryContactPhone"),
    "Primary contact phone",
  );

  if (!contactName && !contactEmail && !contactPhone) {
    return;
  }

  const primaryContactId =
    text(formData, "primaryContactId") ||
    (await loadExistingPrimaryContactId(admin, sponsorId));
  const contactValues = {
    email: contactEmail,
    full_name: contactName || "Sponsor contact",
    is_primary: true,
    phone: contactPhone,
    sponsor_id: sponsorId,
    title: nullableText(formData, "primaryContactTitle"),
  };
  const contactQuery = primaryContactId
    ? admin.from("sponsor_contacts").update(contactValues).eq("id", primaryContactId)
    : admin.from("sponsor_contacts").insert(contactValues);
  const { error } = await contactQuery;

  if (error) throw error;
}

async function loadExistingPrimaryContactId(
  admin: SupabaseAdminClient,
  sponsorId: string,
) {
  const { data, error } = await admin
    .from("sponsor_contacts")
    .select("id")
    .eq("sponsor_id", sponsorId)
    .eq("is_primary", true)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

export function buildSponsorshipTermValues(formData: FormData) {
  const sponsorId = text(formData, "sponsorId");
  const status = text(formData, "status") || "draft";
  const startsOn = text(formData, "startsOn");
  const endsOn = text(formData, "endsOn");

  assertChoice(sponsorshipStatuses, status, "Choose a supported sponsorship status.");
  if (!sponsorId) throw new Error("Choose a sponsor.");
  if (!startsOn || !endsOn) throw new Error("Start and end dates are required.");
  if (parseIsoDate(endsOn, "End date") < parseIsoDate(startsOn, "Start date")) {
    throw new Error("End date must be on or after the start date.");
  }

  return {
    category_exclusivity: nullableText(formData, "categoryExclusivity"),
    committed_contribution_cents: validateOptionalCurrencyToCents(
      text(formData, "committedContribution"),
      "Olea Gives commitment",
    ),
    contract_amount_cents: validateCurrencyToCents(
      text(formData, "contractAmount"),
      "Contract amount",
    ),
    currency: "CAD",
    ends_on: endsOn,
    financial_notes: nullableText(formData, "financialNotes"),
    package_id: text(formData, "packageId"),
    private_terms: nullableText(formData, "privateTerms"),
    recognition_preferences: {
      public_name: nullableText(formData, "recognitionPublicName"),
      recognition_notes: nullableText(formData, "recognitionNotes"),
    },
    sponsor_id: sponsorId,
    starts_on: startsOn,
    status,
  };
}

export function buildSponsorContributionValues(formData: FormData) {
  const sponsorshipId = text(formData, "sponsorshipId");
  const status = text(formData, "status") || "pledged";

  assertChoice(contributionStatuses, status, "Choose a supported contribution status.");
  if (!sponsorshipId) throw new Error("Choose a sponsorship term.");

  return {
    allocated_on:
      status === "allocated" ? text(formData, "allocatedOn") || null : null,
    amount_cents: validateCurrencyToCents(text(formData, "amount"), "Amount"),
    currency: "CAD",
    notes: nullableText(formData, "notes"),
    pledged_on:
      text(formData, "pledgedOn") || new Date().toISOString().slice(0, 10),
    quickbooks_transaction_id: nullableText(formData, "quickbooksTransactionId"),
    received_on: text(formData, "receivedOn") || null,
    sponsorship_id: sponsorshipId,
    status,
  };
}

export async function upsertGrantProgramContribution({
  admin,
  allocationAmountCents,
  contributionId,
  grantProgramId,
  grantRoundId,
}: {
  admin: SupabaseAdminClient;
  allocationAmountCents: number;
  contributionId: string;
  grantProgramId: string;
  grantRoundId: string;
}) {
  if (grantRoundId && !grantProgramId) {
    throw new Error("Choose a grant program before choosing a grant round.");
  }

  if (!grantProgramId || allocationAmountCents <= 0) {
    return;
  }

  await assertGrantRoundBelongsToProgram(admin, grantProgramId, grantRoundId);
  const { error } = await admin.from("grant_program_contributions").upsert(
    {
      amount_cents: allocationAmountCents,
      contribution_id: contributionId,
      grant_round_id: grantRoundId || null,
      grant_program_id: grantProgramId,
    },
    { onConflict: "grant_program_id,contribution_id" },
  );

  if (error) throw error;
}

async function assertGrantRoundBelongsToProgram(
  admin: SupabaseAdminClient,
  grantProgramId: string,
  grantRoundId: string,
) {
  if (!grantRoundId) {
    return;
  }

  const { data: round, error } = await admin
    .from("grant_rounds")
    .select("program_id")
    .eq("id", grantRoundId)
    .single();

  if (error) throw error;
  if (round.program_id !== grantProgramId) {
    throw new Error("Grant round must belong to the selected grant program.");
  }
}
