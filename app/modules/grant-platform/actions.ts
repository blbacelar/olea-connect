"use server";

import { revalidatePath } from "next/cache";

import {
  saveGrantApplication,
  withdrawGrantApplication,
} from "@/app/grants/actions";
import { grantApplicationStatuses } from "@/lib/grants/domain";
import { getGrantPlatformActionAccess } from "@/lib/grants/permissions";
import { buildGrantPlatformApplicationStatusUpdate, normalizeGrantPlatformRoundStatus } from "@/lib/grants/workflow";
import { requireMemberContext } from "@/lib/data/member-context";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getMoneyCents(formData: FormData, key: string) {
  const raw = Number(getText(formData, key));
  return Number.isFinite(raw) ? Math.round(raw * 100) : 0;
}

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
  const { member } = await requireMemberContext();
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
  const { error } = await admin
    .from("grant_applications")
    .update(updates)
    .eq("id", applicationId)
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
