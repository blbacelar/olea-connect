"use server";

import { revalidatePath } from "next/cache";

import {
  saveGrantApplication,
  withdrawGrantApplication,
} from "@/app/grants/actions";
import { grantApplicationStatuses } from "@/lib/grants/domain";
import { getGrantPlatformActionAccess, getGrantPlatformUiAccess } from "@/lib/grants/permissions";
import { buildGrantPlatformApplicationStatusUpdate } from "@/lib/grants/workflow";
import { requireMemberContext } from "@/lib/data/member-context";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  createGrantPlanningEntry,
  deleteGrantFunderInteraction,
  getCurrencyTextCents,
  getFundingSources,
  getMutationFormData,
  getText,
  upsertGrantFunderInteraction,
  upsertGrantPartner,
  validateOrganizationSettingsInput,
} from "./grant-platform-action-support";

type GrantPlatformMutationState = {
  message: string;
  success: boolean;
};

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

  if (!canCreateRounds) {
    return { message: "You do not have permission to create a grant round from this workspace.", success: false };
  }

  const result = await createGrantPlanningEntry({ formData, member, organization });
  if (!result.ok) return { message: result.message, success: false };

  revalidatePath("/modules/grant-platform");
  revalidatePath("/grants");

  return { message: result.message, success: true };
}

export async function saveGrantPlatformOrganizationSettings(
  firstArg: FormData | GrantPlatformMutationState,
  secondArg?: FormData,
) {
  const { member, organization } = await requireMemberContext();
  const { canEditOrgProfile } = getGrantPlatformUiAccess(member.role);
  const formData = getMutationFormData(firstArg, secondArg);
  const organizationType = getText(formData, "organizationType");
  const revenueText = getText(formData, "currentAnnualRevenue");
  const revenueCents = revenueText ? getCurrencyTextCents(revenueText) : null;
  const fundingSources = getFundingSources(formData);
  const boardChairUserId = getText(formData, "boardChairUserId") || null;

  if (!canEditOrgProfile) {
    return { message: "Only admins can edit organization settings.", success: false };
  }

  const validation = validateOrganizationSettingsInput({
    boardChairEmail: getText(formData, "boardChairEmail"),
    boardChairName: getText(formData, "boardChairName"),
    boardChairPhone: getText(formData, "boardChairPhone"),
    boardChairUserId,
    charityRegistrationNumber: getText(formData, "charityRegistrationNumber"),
    fundingSources,
    organizationType,
    revenueCents,
    revenueText,
    societyNumber: getText(formData, "societyNumber"),
  });
  if (!validation.ok) return { message: validation.message, success: false };

  const admin = createAdminClient();
  if (boardChairUserId) {
    const { data: boardChairMember, error: boardChairLookupError } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organization.id)
      .eq("user_id", boardChairUserId)
      .eq("status", "active")
      .maybeSingle();

    if (boardChairLookupError) throw boardChairLookupError;
    if (!boardChairMember) {
      return {
        message: "Choose a board chair who belongs to this workspace.",
        success: false,
      };
    }
  }

  const { error } = await admin.from("grant_organization_settings").upsert({
    board_chair_email: validation.boardChairEmail,
    board_chair_name: validation.boardChairName,
    board_chair_phone: validation.boardChairPhone,
    board_chair_user_id: validation.boardChairUserId,
    charity_registration_number: validation.charityRegistrationNumber,
    current_annual_revenue_cents: revenueCents,
    funding_sources: validation.fundingSources,
    organization_id: organization.id,
    organization_type: organizationType,
    society_number: validation.societyNumber,
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
  const formData = getMutationFormData(firstArg, secondArg);

  if (!canEditOrgProfile) {
    return { message: "Only admins can edit partner records.", success: false };
  }

  const result = await upsertGrantPartner({ formData, organization });
  if (!result.ok) return { message: result.message, success: false };

  revalidatePath("/modules/grant-platform");

  return { message: result.message, success: true };
}

export async function deleteGrantPlatformPartner(
  firstArg: FormData | GrantPlatformMutationState,
  secondArg?: FormData,
) {
  const { member, organization } = await requireMemberContext();
  const { canEditOrgProfile } = getGrantPlatformUiAccess(member.role);
  const formData = getMutationFormData(firstArg, secondArg);
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

export async function saveGrantPlatformFunderInteraction(
  firstArg: FormData | GrantPlatformMutationState,
  secondArg?: FormData,
) {
  const { member, organization } = await requireMemberContext();
  const { canEditOrgProfile } = getGrantPlatformUiAccess(member.role);
  const formData = getMutationFormData(firstArg, secondArg);

  if (!canEditOrgProfile) {
    return { message: "Only admins can edit funder notes.", success: false };
  }

  const result = await upsertGrantFunderInteraction({
    formData,
    member,
    organization,
  });
  if (!result.ok) return { message: result.message, success: false };

  revalidatePath("/modules/grant-platform");

  return { message: result.message, success: true };
}

export async function deleteGrantPlatformFunderInteraction(
  firstArg: FormData | GrantPlatformMutationState,
  secondArg?: FormData,
) {
  const { member, organization } = await requireMemberContext();
  const { canEditOrgProfile } = getGrantPlatformUiAccess(member.role);
  const formData = getMutationFormData(firstArg, secondArg);

  if (!canEditOrgProfile) {
    return { message: "Only admins can delete funder notes.", success: false };
  }

  const result = await deleteGrantFunderInteraction({ formData, organization });
  if (!result.ok) return { message: result.message, success: false };

  revalidatePath("/modules/grant-platform");

  return { message: result.message, success: true };
}
