import "server-only";

import { z } from "zod";

import type { requireMemberContext } from "@/lib/data/member-context";
import type { MembershipTier } from "@/lib/types";
import { normalizeGrantPlatformRoundStatus } from "@/lib/grants/workflow";
import {
  normalizeOptionalEmail,
  normalizeOptionalPhone,
  parseIsoDate,
} from "@/lib/input-validation";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

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
const allowedFunderContactMethods = new Set([
  "email",
  "phone",
  "meeting",
  "portal",
  "other",
]);

type MemberContext = Awaited<ReturnType<typeof requireMemberContext>>["member"];
type OrganizationContext = Awaited<
  ReturnType<typeof requireMemberContext>
>["organization"];
type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

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

const organizationGrantProfileSchema = z.object({
  boardChairEmail: z.string().trim().max(254),
  boardChairName: z.string().trim().max(180),
  boardChairPhone: z.string().trim().max(24),
  boardChairUserId: z.string().trim().uuid().nullable(),
  charityRegistrationNumber: z
    .string()
    .trim()
    .toUpperCase()
    .max(40)
    .refine(
      (value) => !value || /^[0-9]{9}[A-Z]{2}[0-9]{4}$/.test(value),
      "Enter a valid CRA charity number, for example 123456789RR0001.",
    ),
  societyNumber: z
    .string()
    .trim()
    .toUpperCase()
    .max(80)
    .refine(
      (value) => !value || /^[A-Z0-9][A-Z0-9 -]{1,79}$/.test(value),
      "Enter a valid society number using letters, numbers, spaces, or hyphens.",
    ),
});

const funderInteractionSchema = z.object({
  contactMethod: z
    .string()
    .trim()
    .refine((value) => allowedFunderContactMethods.has(value), {
      message: "Choose a supported contact method.",
    }),
  contactName: z.string().trim().min(1, "Enter the funder contact name.").max(180),
  followUpDate: z.string().trim(),
  interactionDate: z.string().trim().min(1, "Choose the interaction date."),
  nextAction: z.string().trim().max(500, "Next action must be 500 characters or fewer."),
  partnerId: z.string().trim().uuid("Choose a funder relationship."),
  summary: z.string().trim().min(1, "Enter the interaction notes.").max(2000),
});

export function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function getMutationFormData(
  firstArg: FormData | unknown,
  secondArg?: FormData,
) {
  return firstArg instanceof FormData ? firstArg : secondArg ?? new FormData();
}

export function getCurrencyTextCents(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

export function getFundingSources(formData: FormData) {
  return formData
    .getAll("fundingSources")
    .map((value) => String(value).trim())
    .filter(Boolean);
}

export function validateOrganizationSettingsInput(input: {
  boardChairEmail: string;
  boardChairName: string;
  boardChairPhone: string;
  boardChairUserId: string | null;
  charityRegistrationNumber: string;
  fundingSources: string[];
  organizationType: string;
  revenueCents: number | null;
  revenueText: string;
  societyNumber: string;
}) {
  if (!input.organizationType || !allowedOrganizationTypes.has(input.organizationType)) {
    return { ok: false, message: "Choose a supported organization type." } as const;
  }

  if (input.revenueText && input.revenueCents === null) {
    return {
      ok: false,
      message: "Current annual revenue must contain numbers only.",
    } as const;
  }

  const profile = organizationGrantProfileSchema.safeParse({
    boardChairEmail: input.boardChairEmail,
    boardChairName: input.boardChairName,
    boardChairPhone: input.boardChairPhone,
    boardChairUserId: input.boardChairUserId,
    charityRegistrationNumber: input.charityRegistrationNumber,
    societyNumber: input.societyNumber,
  });
  if (!profile.success) {
    return {
      ok: false,
      message: profile.error.issues[0]?.message ?? "Please check the grant profile fields.",
    } as const;
  }

  try {
    normalizeOptionalEmail(profile.data.boardChairEmail, "Board chair email");
    normalizeOptionalPhone(profile.data.boardChairPhone, "Board chair phone");
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Please check the board chair contact fields.",
    } as const;
  }

  return {
    ok: true,
    boardChairEmail: normalizeOptionalEmail(
      profile.data.boardChairEmail,
      "Board chair email",
    ),
    boardChairName: profile.data.boardChairName || null,
    boardChairPhone: normalizeOptionalPhone(
      profile.data.boardChairPhone,
      "Board chair phone",
    ),
    boardChairUserId: profile.data.boardChairUserId,
    charityRegistrationNumber: profile.data.charityRegistrationNumber || null,
    fundingSources: input.fundingSources.filter((source) =>
      allowedFundingSources.has(source),
    ),
    societyNumber: profile.data.societyNumber || null,
  } as const;
}

function formatGrantPublicNotes(funderName: string, notes: string) {
  const parts = [];
  if (funderName) parts.push(`Funder: ${funderName}`);
  if (notes) parts.push(`Notes: ${notes}`);
  return parts.length ? parts.join("\n") : null;
}

function getFallbackFundingRequest(name: string) {
  return `Planning entry for ${name}`;
}

function normalizeGrantNotes(input: ReturnType<typeof parseGrantCreationForm> & { ok: true }) {
  return input.notes || getFallbackFundingRequest(input.name);
}

function getRequestedAmountCents(formData: FormData) {
  const raw = Number(getText(formData, "requestedAmount"));
  return Number.isFinite(raw) ? Math.round(raw * 100) : 0;
}

function parseGrantCreationForm(formData: FormData) {
  const deadline = getText(formData, "deadline");
  const name = getText(formData, "name");
  const requestedAmountCents =
    getCurrencyTextCents(getText(formData, "requestedAmount")) ??
    getRequestedAmountCents(formData);

  if (!name || !deadline || requestedAmountCents <= 0) {
    return {
      ok: false,
      message: "Please provide a grant name, deadline, and a positive amount.",
    } as const;
  }

  return {
    ok: true,
    deadline,
    funderName: getText(formData, "funderName"),
    name,
    notes: getText(formData, "notes"),
    requestedAmountCents,
    status: getText(formData, "status") || "planning",
  } as const;
}

async function loadActiveGrantProgram() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grant_programs")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function insertGrantRound(
  admin: SupabaseAdminClient,
  input: ReturnType<typeof parseGrantCreationForm> & { ok: true },
  programId: string,
) {
  const { data, error } = await admin
    .from("grant_rounds")
    .insert({
      award_amount_cents: input.requestedAmountCents,
      available_awards: 1,
      budget_cents: input.requestedAmountCents,
      closes_at: new Date(`${input.deadline}T23:59:59`).toISOString(),
      name: input.name,
      opens_at: new Date().toISOString(),
      program_id: programId,
      public_notes: formatGrantPublicNotes(input.funderName, input.notes),
      status: normalizeGrantPlatformRoundStatus(input.status),
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

async function insertPlanningGrantApplication({
  admin,
  input,
  member,
  organization,
  roundId,
}: {
  admin: SupabaseAdminClient;
  input: ReturnType<typeof parseGrantCreationForm> & { ok: true };
  member: MemberContext;
  organization: OrganizationContext;
  roundId: string;
}) {
  const { error } = await admin.from("grant_applications").insert({
    applicant_user_id: member.id,
    annual_revenue_cents: null,
    cra_good_standing: true,
    eligibility_snapshot: {
      organization_name: organization.name,
      source: "module_create",
    },
    expected_outcome:
      input.notes || "Initial planning entry created from the grant platform workspace.",
    focus_area: "operational_capacity",
    funding_request: normalizeGrantNotes(input),
    organization_id: organization.id,
    registered_in_canada: true,
    requested_amount_cents: input.requestedAmountCents,
    round_id: roundId,
    status: "draft",
    submitted_at: null,
    withdrawn_at: null,
  });

  if (error) throw error;
}

export async function createGrantPlanningEntry({
  formData,
  member,
  organization,
}: {
  formData: FormData;
  member: MemberContext;
  organization: OrganizationContext;
}) {
  const parsed = parseGrantCreationForm(formData);
  if (!parsed.ok) return parsed;

  const program = await loadActiveGrantProgram();
  if (!program) {
    return {
      ok: false,
      message: "No active grant program is available to attach this grant to.",
    } as const;
  }

  const admin = createAdminClient();
  const round = await insertGrantRound(admin, parsed, program.id);
  if (!round) {
    return { ok: false, message: "The grant could not be created right now." } as const;
  }

  await insertPlanningGrantApplication({
    admin,
    input: parsed,
    member,
    organization,
    roundId: round.id,
  });

  return { ok: true, message: `Grant created successfully for ${parsed.name}.` } as const;
}

export function parsePartnerForm(formData: FormData) {
  const parsedPartner = partnerContactSchema.safeParse({
    contactName: getText(formData, "partnerContact"),
    email: getText(formData, "partnerEmail"),
    focusAreas: getText(formData, "partnerFocus"),
    name: getText(formData, "partnerName"),
    notes: getText(formData, "partnerNotes"),
    phone: getText(formData, "partnerPhone"),
  });

  if (!parsedPartner.success) {
    return {
      ok: false,
      message: parsedPartner.error.issues[0]?.message ?? "Please check the partner fields.",
    } as const;
  }

  const partnerType = getText(formData, "partnerType");
  const status = getText(formData, "partnerStatus");
  if (!allowedPartnerTypes.has(partnerType)) {
    return { ok: false, message: "Choose a supported partner type." } as const;
  }
  if (!allowedPartnerStatuses.has(status)) {
    return { ok: false, message: "Choose a supported partner status." } as const;
  }

  return {
    ok: true,
    addedNote: getText(formData, "partnerAddedNote") || null,
    lastCollaboration: getText(formData, "partnerLastCollaboration") || null,
    partner: parsedPartner.data,
    partnerId: getText(formData, "partnerId"),
    partnerType,
    status,
  } as const;
}

async function assertExistingPartner(
  admin: SupabaseAdminClient,
  partnerId: string,
  organizationId: string,
) {
  const { data, error } = await admin
    .from("grant_partners")
    .select("id, organization_id")
    .eq("id", partnerId)
    .eq("organization_id", organizationId)
    .single();

  if (error) throw error;
  return Boolean(data);
}

export async function upsertGrantPartner({
  formData,
  organization,
}: {
  formData: FormData;
  organization: OrganizationContext;
}) {
  const parsed = parsePartnerForm(formData);
  if (!parsed.ok) return parsed;

  const admin = createAdminClient();
  if (parsed.partnerId) {
    const exists = await assertExistingPartner(admin, parsed.partnerId, organization.id);
    if (!exists) return { ok: false, message: "Partner not found for this organization." } as const;
  }

  const payload = {
    added_note: parsed.addedNote,
    contact_name: parsed.partner.contactName,
    email: parsed.partner.email.toLowerCase(),
    focus_areas: parsed.partner.focusAreas,
    last_collaboration: parsed.lastCollaboration,
    name: parsed.partner.name,
    notes: parsed.partner.notes,
    organization_id: organization.id,
    partner_type: parsed.partnerType,
    phone: parsed.partner.phone,
    status: parsed.status,
  };
  const { error } = parsed.partnerId
    ? await admin.from("grant_partners").update(payload).eq("id", parsed.partnerId).eq("organization_id", organization.id)
    : await admin.from("grant_partners").insert(payload);

  if (error) throw error;
  return { ok: true, message: parsed.partnerId ? "Partner updated." : "Partner added." } as const;
}

function parseFunderInteractionForm(formData: FormData) {
  const rawInteractionId = getText(formData, "interactionId");
  const interactionId = rawInteractionId || null;
  const parsed = funderInteractionSchema.safeParse({
    contactMethod: getText(formData, "contactMethod"),
    contactName: getText(formData, "contactName"),
    followUpDate: getText(formData, "followUpDate"),
    interactionDate: getText(formData, "interactionDate"),
    nextAction: getText(formData, "nextAction"),
    partnerId: getText(formData, "partnerId"),
    summary: getText(formData, "summary"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Please check the funder interaction fields.",
    } as const;
  }

  try {
    parseIsoDate(parsed.data.interactionDate, "Interaction date");
    if (parsed.data.followUpDate) {
      parseIsoDate(parsed.data.followUpDate, "Follow-up date");
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Please check the interaction dates.",
    } as const;
  }

  if (interactionId) {
    const idResult = z.string().uuid().safeParse(interactionId);
    if (!idResult.success) {
      return { ok: false, message: "Choose a valid interaction to edit." } as const;
    }
  }

  return {
    ok: true,
    interactionId,
    values: {
      contact_method: parsed.data.contactMethod,
      contact_name: parsed.data.contactName,
      follow_up_date: parsed.data.followUpDate || null,
      interaction_date: parsed.data.interactionDate,
      next_action: parsed.data.nextAction,
      partner_id: parsed.data.partnerId,
      summary: parsed.data.summary,
    },
  } as const;
}

async function assertPartnerForOrganization(
  admin: SupabaseAdminClient,
  partnerId: string,
  organizationId: string,
) {
  const { data, error } = await admin
    .from("grant_partners")
    .select("id")
    .eq("id", partnerId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function assertInteractionForOrganization(
  admin: SupabaseAdminClient,
  interactionId: string,
  organizationId: string,
) {
  const { data, error } = await admin
    .from("grant_funder_interactions")
    .select("id")
    .eq("id", interactionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function upsertGrantFunderInteraction({
  formData,
  member,
  organization,
}: {
  formData: FormData;
  member: MemberContext;
  organization: OrganizationContext;
}) {
  const parsed = parseFunderInteractionForm(formData);
  if (!parsed.ok) return parsed;

  const admin = createAdminClient();
  const partnerExists = await assertPartnerForOrganization(
    admin,
    parsed.values.partner_id,
    organization.id,
  );
  if (!partnerExists) {
    return { ok: false, message: "Funder not found for this organization." } as const;
  }

  const payload = {
    ...parsed.values,
    organization_id: organization.id,
    updated_by: member.id,
  };

  if (parsed.interactionId) {
    const interactionExists = await assertInteractionForOrganization(
      admin,
      parsed.interactionId,
      organization.id,
    );
    if (!interactionExists) {
      return {
        ok: false,
        message: "Interaction not found for this organization.",
      } as const;
    }
  }

  const { error } = parsed.interactionId
    ? await admin
        .from("grant_funder_interactions")
        .update(payload)
        .eq("id", parsed.interactionId)
        .eq("organization_id", organization.id)
    : await admin.from("grant_funder_interactions").insert({
        ...payload,
        created_by: member.id,
      });

  if (error) throw error;
  return {
    ok: true,
    message: parsed.interactionId ? "Funder interaction updated." : "Funder interaction added.",
  } as const;
}

export async function deleteGrantFunderInteraction({
  formData,
  organization,
}: {
  formData: FormData;
  organization: OrganizationContext;
}) {
  const interactionId = getText(formData, "interactionId");
  const idResult = z.string().uuid().safeParse(interactionId);
  if (!idResult.success) {
    return { ok: false, message: "Choose a valid interaction to delete." } as const;
  }

  const admin = createAdminClient();
  const exists = await assertInteractionForOrganization(
    admin,
    interactionId,
    organization.id,
  );
  if (!exists) {
    return {
      ok: false,
      message: "Interaction not found for this organization.",
    } as const;
  }

  const { error } = await admin
    .from("grant_funder_interactions")
    .delete()
    .eq("id", interactionId)
    .eq("organization_id", organization.id);

  if (error) throw error;
  return { ok: true, message: "Funder interaction deleted." } as const;
}

export function validatePlanIds(planIds: string[]) {
  return planIds as MembershipTier[];
}
