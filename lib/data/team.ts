import "server-only";

import type { TeamData } from "@/lib/types";
import { createClient } from "@/utils/supabase/server";

import { requireMemberContext } from "./member-context";

export async function getTeamData(): Promise<TeamData> {
  const session = await requireMemberContext();
  const supabase = await createClient();
  const canManage = ["owner", "admin"].includes(
    session.member.membershipRole,
  );
  const [
    { count: activeMemberCount, error: memberError },
    { data: invitations, error: invitationError },
  ] = await Promise.all([
    supabase
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", session.organization.id)
      .eq("status", "active"),
    canManage
      ? supabase
          .from("organization_invitations")
          .select("id, email, role, status, created_at, expires_at")
          .eq("organization_id", session.organization.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (memberError) throw memberError;
  if (invitationError) throw invitationError;

  return {
    currentMember: session.member,
    organization: {
      ...session.organization,
      seatsUsed: activeMemberCount ?? session.organization.seatsUsed,
    },
    activeMemberCount: activeMemberCount ?? 0,
    invitations: (invitations ?? []).map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      createdAt: invitation.created_at,
      expiresAt: invitation.expires_at,
    })),
    canManage,
  };
}
