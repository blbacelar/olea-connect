import "server-only";

import { createHash } from "node:crypto";

import * as z from "zod";

import { createAdminClient } from "@/utils/supabase/admin";

const invitationTokenSchema = z.string().trim().min(32).max(512);

type PendingInvitation = {
  email: string;
};

/**
 * A token is the capability to view its own pending invitation, never to alter
 * its email or membership role. The database RPC remains the authorization
 * boundary for accepting it.
 */
export async function getPendingTeamInvitation(
  token: string,
): Promise<PendingInvitation | null> {
  const parsedToken = invitationTokenSchema.safeParse(token);
  if (!parsedToken.success) return null;

  const tokenHash = createHash("sha256")
    .update(parsedToken.data)
    .digest("hex");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_invitations")
    .select("email, status, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    console.error("Unable to look up team invitation", {
      code: error.code,
      message: error.message,
    });
    return null;
  }
  if (!data || data.status !== "pending") return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;

  return { email: data.email };
}
