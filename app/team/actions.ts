"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireMemberContext } from "@/lib/data/member-context";
import type { OrganizationRole } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

function assertManager(role: OrganizationRole) {
  if (!["owner", "admin"].includes(role)) {
    throw new Error("Only organization owners and admins can manage the team.");
  }
}

export async function inviteTeamMember(
  email: string,
  role: Exclude<OrganizationRole, "owner"> = "member",
) {
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

  if (error) throw new Error(error.message);
  revalidatePath("/team");
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
