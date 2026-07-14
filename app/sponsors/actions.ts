"use server";

import { revalidatePath } from "next/cache";

import { FORM_SELECT_EMPTY_VALUE } from "@/lib/forms/constants";
import {
  normalizeOptionalHttpUrl,
  normalizeSponsorSlug,
  parseCurrencyToCents,
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
const contributionStatuses = ["pledged", "invoiced", "received", "allocated"] as const;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function selectText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value === FORM_SELECT_EMPTY_VALUE ? "" : value;
}

function nullableText(formData: FormData, key: string) {
  return text(formData, key) || null;
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function assertChoice<T extends readonly string[]>(
  choices: T,
  value: string,
  message: string,
): asserts value is T[number] {
  if (!choices.includes(value)) throw new Error(message);
}

function normalizedEmail(value: string | null) {
  return value ? value.toLowerCase() : null;
}

async function requireSponsorManager() {
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
    throw new Error("Only finance or platform administrators can manage sponsors.");
  }

  return { admin, userId: user.id };
}

async function writeSponsorAudit({
  action,
  changes,
  entityId,
  entityType,
  metadata = {},
  userId,
}: {
  action: string;
  changes: Record<string, unknown> | null;
  entityId: string | null;
  entityType: string;
  metadata?: Record<string, unknown>;
  userId: string;
}) {
  const { error } = await createAdminClient().from("audit_logs").insert({
    action,
    actor_user_id: userId,
    changes,
    entity_id: entityId,
    entity_type: entityType,
    metadata,
    organization_id: null,
  });

  if (error) throw error;
}

export async function saveSponsorProfile(formData: FormData) {
  const { admin, userId } = await requireSponsorManager();
  const sponsorId = selectText(formData, "sponsorId");
  const name = text(formData, "name");
  const status = text(formData, "status") || "prospect";
  const slug = normalizeSponsorSlug(text(formData, "slug") || name);

  assertChoice(sponsorStatuses, status, "Choose a supported sponsor status.");
  if (!name) throw new Error("Sponsor name is required.");
  if (!slug) throw new Error("Sponsor slug is required.");

  const values = {
    category: nullableText(formData, "category"),
    directory_description: nullableText(formData, "directoryDescription"),
    directory_email: normalizedEmail(nullableText(formData, "directoryEmail")),
    directory_phone: nullableText(formData, "directoryPhone"),
    directory_visible: checked(formData, "directoryVisible"),
    name,
    short_description: nullableText(formData, "shortDescription"),
    slug,
    status,
    values_reviewed_at: checked(formData, "valuesReviewed")
      ? new Date().toISOString()
      : null,
    website_url: normalizeOptionalHttpUrl(nullableText(formData, "websiteUrl")),
  };

  const query = sponsorId
    ? admin.from("sponsors").update(values).eq("id", sponsorId)
    : admin.from("sponsors").insert(values);

  const { data: sponsor, error } = await query.select("id").single();
  if (error) throw error;

  const contactName = text(formData, "primaryContactName");
  const contactEmail = normalizedEmail(nullableText(formData, "primaryContactEmail"));
  const contactId = text(formData, "primaryContactId");

  if (contactName || contactEmail) {
    const contactValues = {
      email: contactEmail,
      full_name: contactName || "Sponsor contact",
      is_primary: true,
      phone: nullableText(formData, "primaryContactPhone"),
      sponsor_id: sponsor.id,
      title: nullableText(formData, "primaryContactTitle"),
    };
    const contactQuery = contactId
      ? admin.from("sponsor_contacts").update(contactValues).eq("id", contactId)
      : admin.from("sponsor_contacts").insert(contactValues);
    const { error: contactError } = await contactQuery;

    if (contactError) throw contactError;
  }

  await writeSponsorAudit({
    action: sponsorId ? "sponsor.updated" : "sponsor.created",
    changes: values,
    entityId: sponsor.id,
    entityType: "sponsor",
    userId,
  });
  revalidatePath("/sponsors");
}

export async function saveSponsorshipTerm(formData: FormData) {
  const { admin, userId } = await requireSponsorManager();
  const sponsorshipId = text(formData, "sponsorshipId");
  const sponsorId = text(formData, "sponsorId");
  const status = text(formData, "status") || "draft";

  assertChoice(sponsorshipStatuses, status, "Choose a supported sponsorship status.");
  if (!sponsorId) throw new Error("Choose a sponsor.");

  const values = {
    category_exclusivity: nullableText(formData, "categoryExclusivity"),
    committed_contribution_cents: parseCurrencyToCents(
      text(formData, "committedContribution"),
    ),
    contract_amount_cents: parseCurrencyToCents(text(formData, "contractAmount")),
    currency: "CAD",
    ends_on: text(formData, "endsOn"),
    financial_notes: nullableText(formData, "financialNotes"),
    package_id: text(formData, "packageId"),
    private_terms: nullableText(formData, "privateTerms"),
    recognition_preferences: {
      public_name: nullableText(formData, "recognitionPublicName"),
      recognition_notes: nullableText(formData, "recognitionNotes"),
    },
    sponsor_id: sponsorId,
    starts_on: text(formData, "startsOn"),
    status,
  };

  if (!values.package_id) throw new Error("Choose a sponsorship package.");
  if (!values.starts_on || !values.ends_on) {
    throw new Error("Start and end dates are required.");
  }
  if (values.contract_amount_cents <= 0) {
    throw new Error("Contract amount must be greater than zero.");
  }

  const query = sponsorshipId
    ? admin.from("sponsorships").update(values).eq("id", sponsorshipId)
    : admin.from("sponsorships").insert({ ...values, created_by: userId });

  const { data: sponsorship, error } = await query.select("id").single();
  if (error) throw error;

  await writeSponsorAudit({
    action: sponsorshipId ? "sponsorship.updated" : "sponsorship.created",
    changes: values,
    entityId: sponsorship.id,
    entityType: "sponsorship",
    metadata: { sponsor_id: sponsorId },
    userId,
  });
  revalidatePath("/sponsors");
}

export async function saveSponsorContribution(formData: FormData) {
  const { admin, userId } = await requireSponsorManager();
  const contributionId = text(formData, "contributionId");
  const sponsorshipId = text(formData, "sponsorshipId");
  const status = text(formData, "status") || "pledged";

  assertChoice(contributionStatuses, status, "Choose a supported contribution status.");
  if (!sponsorshipId) throw new Error("Choose a sponsorship term.");

  const values = {
    allocated_on: status === "allocated" ? text(formData, "allocatedOn") || null : null,
    amount_cents: parseCurrencyToCents(text(formData, "amount")),
    currency: "CAD",
    notes: nullableText(formData, "notes"),
    pledged_on: text(formData, "pledgedOn") || new Date().toISOString().slice(0, 10),
    quickbooks_transaction_id: nullableText(formData, "quickbooksTransactionId"),
    received_on: text(formData, "receivedOn") || null,
    sponsorship_id: sponsorshipId,
    status,
  };

  if (values.amount_cents <= 0) {
    throw new Error("Contribution amount must be greater than zero.");
  }

  const query = contributionId
    ? admin.from("sponsor_contributions").update(values).eq("id", contributionId)
    : admin.from("sponsor_contributions").insert(values);
  const { data: contribution, error } = await query.select("id").single();

  if (error) throw error;

  const grantProgramId = selectText(formData, "grantProgramId");
  const grantRoundId = selectText(formData, "grantRoundId");
  const allocationAmountCents = parseCurrencyToCents(text(formData, "allocationAmount"));

  if (grantRoundId && !grantProgramId) {
    throw new Error("Choose a grant program before choosing a grant round.");
  }

  if (grantProgramId && allocationAmountCents > 0) {
    if (grantRoundId) {
      const { data: round, error: roundError } = await admin
        .from("grant_rounds")
        .select("program_id")
        .eq("id", grantRoundId)
        .single();

      if (roundError) throw roundError;
      if (round.program_id !== grantProgramId) {
        throw new Error("Grant round must belong to the selected grant program.");
      }
    }

    const { error: allocationError } = await admin
      .from("grant_program_contributions")
      .upsert(
        {
          amount_cents: allocationAmountCents,
          contribution_id: contribution.id,
          grant_round_id: grantRoundId || null,
          grant_program_id: grantProgramId,
        },
        { onConflict: "grant_program_id,contribution_id" },
      );

    if (allocationError) throw allocationError;
  }

  await writeSponsorAudit({
    action: contributionId
      ? "sponsor_contribution.updated"
      : "sponsor_contribution.created",
    changes: {
      ...values,
      allocation_amount_cents: allocationAmountCents,
      grant_program_id: grantProgramId || null,
      grant_round_id: grantRoundId || null,
    },
    entityId: contribution.id,
    entityType: "sponsor_contribution",
    metadata: { sponsorship_id: sponsorshipId },
    userId,
  });
  revalidatePath("/sponsors");
}
