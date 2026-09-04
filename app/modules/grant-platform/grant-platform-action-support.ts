import "server-only";

import { z } from "zod";

import type { requireMemberContext } from "@/lib/data/member-context";
import type { MembershipTier } from "@/lib/types";
import { normalizeGrantPlatformRoundStatus } from "@/lib/grants/workflow";
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
  fundingSources: string[];
  organizationType: string;
  revenueCents: number | null;
  revenueText: string;
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

  return {
    ok: true,
    fundingSources: input.fundingSources.filter((source) =>
      allowedFundingSources.has(source),
    ),
  } as const;
}

function getMoneyCents(formData: FormData, key: string) {
  const raw = Number(getText(formData, key));
  return Number.isFinite(raw) ? Math.round(raw * 100) : 0;
}

function parseGrantCreationForm(formData: FormData) {
  const deadline = getText(formData, "deadline");
  const name = getText(formData, "name");
  const requestedAmountCents = getMoneyCents(formData, "requestedAmount");

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
      public_notes: input.notes || (input.funderName ? `Funder: ${input.funderName}` : null),
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
    funding_request: input.notes || `Planning entry for ${input.name}`,
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

export function validatePlanIds(planIds: string[]) {
  return planIds as MembershipTier[];
}
