"use server";

import { createHash, randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireMemberContext } from "@/lib/data/member-context";
import { createClient } from "@/utils/supabase/server";

export async function inviteTeamMember(email: string) {
  const { member, organization } = await requireMemberContext();
  if (!["owner", "admin"].includes(member.membershipRole)) {
    throw new Error("Only organization owners and admins can invite members.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  const supabase = await createClient();
  const tokenHash = createHash("sha256")
    .update(randomBytes(32))
    .digest("hex");
  const { error } = await supabase.from("organization_invitations").insert({
    organization_id: organization.id,
    email: normalizedEmail,
    role: "member",
    token_hash: tokenHash,
    invited_by: member.id,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) throw error;
  revalidatePath("/team");
}

export async function cancelTeamInvitation(invitationId: string) {
  const { member, organization } = await requireMemberContext();
  if (!["owner", "admin"].includes(member.membershipRole)) {
    throw new Error("Only organization owners and admins can cancel invites.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("organization_id", organization.id)
    .eq("status", "pending");

  if (error) throw error;
  revalidatePath("/team");
}
