"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  saveGrantApplication,
  withdrawGrantApplication,
} from "@/app/grants/actions";
import { grantApplicationStatuses } from "@/lib/grants/domain";
import { getGrantPlatformActionAccess, getGrantPlatformUiAccess } from "@/lib/grants/permissions";
import { buildGrantPlatformApplicationStatusUpdate, normalizeGrantPlatformRoundStatus } from "@/lib/grants/workflow";
import { requireMemberContext } from "@/lib/data/member-context";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

type GrantPlatformMutationState = {
  message: string;
  success: boolean;
};

const allowedOrganizationTypes = new Set([
  "Grassroots (under $250K/yr)",
  "Growing ($250K-$1M)",
  "Established ($1M+)",
]);

const allowedFundingSources = new Set([
  "Foundation Grants",
  "Individual Donors",
  "Government Funding",
  "Corporate Sponsorships",
  "Earned Revenue",
  "Fundraising Events",
]);

const allowedPartnerTypes = new Set([
  "Community Organization",
  "Academic Institution",
  "Government Agency",
  "Individual / Board Advisor",
  "For-Profit Partner",
]);

const allowedPartnerStatuses = new Set([
  "Active Collaborator",
  "Good for Evaluation",
  "Strategic Partner",
  "Potential Collaborator",
]);

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getMoneyCents(formData: FormData, key: string) {
  const raw = Number(getText(formData, key));
  return Number.isFinite(raw) ? Math.round(raw * 100) : 0;
}

function getCurrencyTextCents(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

function getFundingSources(formData: FormData) {
  return formData
    .getAll("fundingSources")
    .map((value) => String(value).trim())
    .filter(Boolean);
}

const partnerContactSchema = z.object({
  contactName: z.string().trim().min(1, "Enter a primary contact name.").max(180),
  email: z.string().trim().email("Enter a valid email address.").max(180),
  focusAreas: z.string().trim().min(1, "Enter at least one focus area.").max(500),
  name: z.string().trim().min(1, "Enter a partner name.").max(180),
  notes: z.string().trim().max(2000),
  phone: z
    .string()
    .trim()
    .refine((value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    }, "Enter a valid phone number."),
});

export async function saveGrantPlatformApplication(formData: FormData) {
  await saveGrantApplication(formData);
  revalidatePath("/modules/grant-platform");
  revalidatePath("/grants");
}

export async function withdrawGrantPlatformApplication(formData: FormData) {
  await withdrawGrantApplication(formData);
  revalidatePath("/modules/grant-platform");
  revalidatePath("/grants");
}

export async function updateGrantPlatformApplicationStatus(formData: FormData) {
  const { member, organization } = await requireMemberContext();
  const { canManageWorkflow } = getGrantPlatformActionAccess(member.role);
  const applicationId = getText(formData, "applicationId");
  const status = getText(formData, "status");
  const note = getText(formData, "collaborationNote");
  const { status: normalizedStatus, updates } = buildGrantPlatformApplicationStatusUpdate(status, note);

  if (!canManageWorkflow) {
    return { message: "You do not have permission to update the workflow for this workspace.", success: false };
  }

  if (!applicationId || !grantApplicationStatuses.includes(normalizedStatus as (typeof grantApplicationStatuses)[number])) {
    return { message: "Choose a supported workflow status.", success: false };
  }

  const admin = createAdminClient();
  const { data: application, error: applicationLookupError } = await admin
    .from("grant_applications")
    .select("id, organization_id")
    .eq("id", applicationId)
    .eq("organization_id", organization.id)
    .single();

  if (applicationLookupError) throw applicationLookupError;
  if (!application) {
    return { message: "Application not found for this organization.", success: false };
  }

  const { error } = await admin
    .from("grant_applications")
    .update(updates)
    .eq("id", applicationId)
    .eq("organization_id", application.organization_id)
    .select("id")
    .single();

  if (error) throw error;

  revalidatePath("/modules/grant-platform");
  revalidatePath("/grants");

  return { message: "Workflow status updated.", success: true };
}

export async function createGrantPlatformGrant(formData: FormData) {
  const { member, organization } = await requireMemberContext();
  const { canCreateRounds } = getGrantPlatformActionAccess(member.role);
  const name = getText(formData, "name");
  const funderName = getText(formData, "funderName");
  const requestedAmountCents = getMoneyCents(formData, "requestedAmount");
  const deadline = getText(formData, "deadline");
  const status = getText(formData, "status") || "planning";
  const notes = getText(formData, "notes");

  if (!canCreateRounds) {
    return { message: "You do not have permission to create a grant round from this workspace.", success: false };
  }

  if (!name || !deadline || requestedAmountCents <= 0) {
    return { message: "Please provide a grant name, deadline, and a positive amount.", success: false };
  }

  const supabase = await createClient();
  const { data: program, error: programError } = await supabase
    .from("grant_programs")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (programError) throw programError;
  if (!program) {
    return { message: "No active grant program is available to attach this grant to.", success: false };
  }

  const normalizedRoundStatus = normalizeGrantPlatformRoundStatus(status);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("grant_rounds")
    .insert({
      award_amount_cents: requestedAmountCents,
      available_awards: 1,
      budget_cents: requestedAmountCents,
      closes_at: new Date(`${deadline}T23:59:59`).toISOString(),
      name,
      opens_at: new Date().toISOString(),
      program_id: program.id,
      public_notes: notes || (funderName ? `Funder: ${funderName}` : null),
      status: normalizedRoundStatus,
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data) {
    return { message: "The grant could not be created right now.", success: false };
  }

  const { error: applicationError } = await admin.from("grant_applications").insert({
    applicant_user_id: member.id,
    annual_revenue_cents: null,
    cra_good_standing: true,
    eligibility_snapshot: {
      organization_name: organization.name,
      source: "module_create",
    },
    expected_outcome: notes || "Initial planning entry created from the grant platform workspace.",
    focus_area: "operational_capacity",
    funding_request: notes || `Planning entry for ${name}`,
    organization_id: organization.id,
    registered_in_canada: true,
    requested_amount_cents: requestedAmountCents,
    round_id: data.id,
    status: "draft",
    submitted_at: null,
    withdrawn_at: null,
  });

  if (applicationError) throw applicationError;

  revalidatePath("/modules/grant-platform");
  revalidatePath("/grants");

  return { message: `Grant created successfully for ${name}.`, success: true };
}

export async function saveGrantPlatformOrganizationSettings(
  firstArg: FormData | GrantPlatformMutationState,
  secondArg?: FormData,
) {
  const { member, organization } = await requireMemberContext();
  const { canEditOrgProfile } = getGrantPlatformUiAccess(member.role);
  const formData = firstArg instanceof FormData ? firstArg : secondArg ?? new FormData();
  const organizationType = getText(formData, "organizationType");
  const revenueText = getText(formData, "currentAnnualRevenue");
  const revenueCents = revenueText ? getCurrencyTextCents(revenueText) : null;
  const fundingSources = getFundingSources(formData);

  if (!canEditOrgProfile) {
    return { message: "Only admins can edit organization settings.", success: false };
  }

  if (!organizationType || !allowedOrganizationTypes.has(organizationType)) {
    return { message: "Choose a supported organization type.", success: false };
  }

  if (revenueText && revenueCents === null) {
    return { message: "Current annual revenue must contain numbers only.", success: false };
  }

  const normalizedFundingSources = fundingSources.filter((source) => allowedFundingSources.has(source));

  const admin = createAdminClient();
  const { error } = await admin.from("grant_organization_settings").upsert({
    current_annual_revenue_cents: revenueCents,
    funding_sources: normalizedFundingSources,
    organization_id: organization.id,
    organization_type: organizationType,
    updated_by: member.id,
  });

  if (error) throw error;

  revalidatePath("/modules/grant-platform");

  return { message: "Organization settings saved.", success: true };
}

export async function saveGrantPlatformPartner(
  firstArg: FormData | GrantPlatformMutationState,
  secondArg?: FormData,
) {
  const { member, organization } = await requireMemberContext();
  const { canEditOrgProfile } = getGrantPlatformUiAccess(member.role);
  const formData = firstArg instanceof FormData ? firstArg : secondArg ?? new FormData();
  const partnerId = getText(formData, "partnerId");
  const name = getText(formData, "partnerName");
  const partnerType = getText(formData, "partnerType");
  const contactName = getText(formData, "partnerContact");
  const email = getText(formData, "partnerEmail");
  const phone = getText(formData, "partnerPhone");
  const focusAreas = getText(formData, "partnerFocus");
  const status = getText(formData, "partnerStatus");
  const notes = getText(formData, "partnerNotes");
  const lastCollaboration = getText(formData, "partnerLastCollaboration") || null;
  const addedNote = getText(formData, "partnerAddedNote") || null;

  if (!canEditOrgProfile) {
    return { message: "Only admins can edit partner records.", success: false };
  }

  const parsedPartner = partnerContactSchema.safeParse({
    contactName,
    email,
    focusAreas,
    name,
    notes,
    phone,
  });

  if (!parsedPartner.success) {
    return { message: parsedPartner.error.issues[0]?.message ?? "Please check the partner fields.", success: false };
  }

  if (!allowedPartnerTypes.has(partnerType)) {
    return { message: "Choose a supported partner type.", success: false };
  }

  if (!allowedPartnerStatuses.has(status)) {
    return { message: "Choose a supported partner status.", success: false };
  }

  const admin = createAdminClient();
  if (partnerId) {
    const { data: existingPartner, error: partnerLookupError } = await admin
      .from("grant_partners")
      .select("id, organization_id")
      .eq("id", partnerId)
      .eq("organization_id", organization.id)
      .single();

    if (partnerLookupError) throw partnerLookupError;
    if (!existingPartner) {
      return { message: "Partner not found for this organization.", success: false };
    }
  }

  const payload = {
    added_note: addedNote,
    contact_name: parsedPartner.data.contactName,
    email: parsedPartner.data.email.toLowerCase(),
    focus_areas: parsedPartner.data.focusAreas,
    last_collaboration: lastCollaboration,
    name: parsedPartner.data.name,
    notes: parsedPartner.data.notes,
    organization_id: organization.id,
    partner_type: partnerType,
    phone: parsedPartner.data.phone,
    status,
  };

  const { error } = partnerId
    ? await admin.from("grant_partners").update(payload).eq("id", partnerId).eq("organization_id", organization.id)
    : await admin.from("grant_partners").insert(payload);

  if (error) throw error;

  revalidatePath("/modules/grant-platform");

  return { message: partnerId ? "Partner updated." : "Partner added.", success: true };
}

export async function deleteGrantPlatformPartner(
  firstArg: FormData | GrantPlatformMutationState,
  secondArg?: FormData,
) {
  const { member, organization } = await requireMemberContext();
  const { canEditOrgProfile } = getGrantPlatformUiAccess(member.role);
  const formData = firstArg instanceof FormData ? firstArg : secondArg ?? new FormData();
  const partnerId = getText(formData, "partnerId");

  if (!canEditOrgProfile) {
    return { message: "Only admins can delete partner records.", success: false };
  }

  if (!partnerId) {
    return { message: "Choose a partner to delete.", success: false };
  }

  const admin = createAdminClient();
  const { data: existingPartner, error: partnerLookupError } = await admin
    .from("grant_partners")
    .select("id, organization_id")
    .eq("id", partnerId)
    .eq("organization_id", organization.id)
    .single();

  if (partnerLookupError) throw partnerLookupError;
  if (!existingPartner) {
    return { message: "Partner not found for this organization.", success: false };
  }

  const { error } = await admin
    .from("grant_partners")
    .delete()
    .eq("id", partnerId)
    .eq("organization_id", organization.id);

  if (error) throw error;

  revalidatePath("/modules/grant-platform");

  return { message: "Partner deleted.", success: true };
}
