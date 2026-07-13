"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import {
  buildCircleProvisioningPayload,
  enqueueCircleMemberSync,
} from "@/lib/circle/provisioning";
import { requireMemberContext } from "@/lib/data/member-context";
import type { OrganizationRole } from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

type InviteTeamMemberResult =
  | { ok: true }
  | { ok: false; message: string };

const expectedInviteFailures = [
  "Only organization owners and admins can invite members.",
  "Enter a valid email address.",
  "This person already belongs to the organization.",
  "This email already has an Olea Connects account. Invite a new email address, or ask support to move the existing account.",
  "A pending invitation already exists for this email.",
  "Your plan has no available team seats.",
] as const;

function getSafeInviteFailureMessage(message: string) {
  return (
    expectedInviteFailures.find((expectedMessage) =>
      message.includes(expectedMessage),
    ) ?? "Unable to send this invitation. Please try again."
  );
}

function assertManager(role: OrganizationRole) {
  if (!["owner", "admin"].includes(role)) {
    throw new Error("Only organization owners and admins can manage the team.");
  }
}

export async function inviteTeamMember(
  email: string,
  role: Exclude<OrganizationRole, "owner"> = "member",
): Promise<InviteTeamMemberResult> {
  try {
    const { member, organization } = await requireMemberContext();
    assertManager(member.membershipRole);

    const supabase = await createClient();
    const { error } = await supabase.rpc("create_team_invitation", {
      target_organization_id: organization.id,
      target_email: email.trim().toLowerCase(),
      target_role: role,
      raw_token: randomBytes(32).toString("base64url"),
      target_expires_at: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    });

    if (error) {
      return {
        ok: false,
        message: getSafeInviteFailureMessage(error.message),
      };
    }

    revalidatePath("/team");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: getSafeInviteFailureMessage(
        error instanceof Error ? error.message : "",
      ),
    };
  }
}

export async function cancelTeamInvitation(invitationId: string) {
  const { member } = await requireMemberContext();
  assertManager(member.membershipRole);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("revoke_team_invitation", {
    target_invitation_id: invitationId,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("This invitation is no longer pending.");
  revalidatePath("/team");
}

export async function updateTeamMember(
  userId: string,
  values: {
    role?: OrganizationRole;
    status?: "active" | "suspended";
    remove?: boolean;
  },
) {
  const { member, organization } = await requireMemberContext();
  assertManager(member.membershipRole);

  const supabase = await createClient();
  const { error } = await supabase.rpc("manage_team_member", {
    target_organization_id: organization.id,
    target_user_id: userId,
    target_role: values.role ?? null,
    target_status: values.status ?? null,
    remove_member: values.remove ?? false,
  });

  if (error) throw new Error(error.message);

  const adminSupabase = createAdminClient();
  const [
    { data: profile, error: profileError },
    {
      data: { user: targetUser },
      error: userError,
    },
  ] = await Promise.all([
    adminSupabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle(),
    adminSupabase.auth.admin.getUserById(userId),
  ]);
  if (profileError) throw new Error(profileError.message);
  if (userError) throw new Error(userError.message);
  if (!targetUser?.email) throw new Error("Team member email was not found.");

  const { data: targetMembership, error: membershipError } = values.remove
    ? { data: null, error: null }
    : await adminSupabase
        .from("organization_members")
        .select("role, status")
        .eq("organization_id", organization.id)
        .eq("user_id", userId)
        .maybeSingle();
  if (membershipError) throw new Error(membershipError.message);

  const action =
    values.remove || targetMembership?.status === "suspended"
      ? "deprovision"
      : "provision";
  const membershipRole =
    targetMembership?.role ?? values.role ?? "member";

  await enqueueCircleMemberSync(
    adminSupabase,
    buildCircleProvisioningPayload({
      action,
      member: {
        id: userId,
        organizationId: organization.id,
        name: profile?.full_name ?? "Member",
        firstName: profile?.full_name?.split(/\s+/)[0] ?? "Member",
        role: membershipRole,
        membershipRole: membershipRole as OrganizationRole,
        email: targetUser.email,
      },
      organization,
      reason: values.remove
        ? "team_member_removed"
        : values.status === "suspended"
          ? "team_member_suspended"
          : "team_member_updated",
    }),
  );

  revalidatePath("/team");
}

export async function acceptTeamInvitation(token: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_team_invitation", {
    raw_token: token,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/team");
}
