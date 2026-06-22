import "server-only";

import type { TeamData } from "@/lib/types";
import { getReservedSeatCount } from "@/lib/team/seats";
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
    { data: directory, error: directoryError },
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
    canManage
      ? supabase.rpc("get_team_directory", {
          target_organization_id: session.organization.id,
        })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (memberError) throw memberError;
  if (invitationError) throw invitationError;
  if (directoryError) throw directoryError;

  const members = (
    (directory ?? []) as Array<{
      user_id: string;
      email: string;
      full_name: string;
      role: "owner" | "admin" | "member";
      status: "invited" | "active" | "suspended";
      joined_at: string | null;
    }>
  ).map((member) => ({
    id: member.user_id,
    email: member.email,
    name: member.full_name,
    role: member.role,
    status: member.status,
    joinedAt: member.joined_at,
  }));
  const pendingInvitations = invitations ?? [];
  const normalizedActiveMemberCount = Math.max(activeMemberCount ?? 0, 1);
  const reservedSeatCount = getReservedSeatCount(
    normalizedActiveMemberCount,
    pendingInvitations.length,
  );

  return {
    currentMember: session.member,
    organization: {
      ...session.organization,
      seatsUsed: normalizedActiveMemberCount,
    },
    activeMemberCount: normalizedActiveMemberCount,
    reservedSeatCount,
    members,
    invitations: pendingInvitations.map((invitation) => ({
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
