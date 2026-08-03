import type { Metadata } from "next";

import { getPendingTeamInvitation } from "@/lib/team/invitations";
import { createClient } from "@/utils/supabase/server";

import { InvitationAcceptance } from "./invitation-acceptance";

export const metadata: Metadata = {
  title: "Accept team invitation | Olea Connects™",
  description: "Accept your Olea Connects™ team invitation.",
};

export default async function AcceptTeamInvitationPage({
  searchParams,
}: {
  searchParams?: { token?: string };
}) {
  const token = searchParams?.token ?? "";
  const [invitation, supabase] = await Promise.all([
    getPendingTeamInvitation(token),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <InvitationAcceptance
      token={token}
      invitationEmail={invitation?.email ?? null}
      signedInEmail={user?.email ?? null}
    />
  );
}
