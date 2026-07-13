import type { Metadata } from "next";

import { InvitationAcceptance } from "./invitation-acceptance";

export const metadata: Metadata = {
  title: "Accept team invitation | Olea Connects",
  description: "Accept your Olea Connects team invitation.",
};

export default function AcceptTeamInvitationPage({
  searchParams,
}: {
  searchParams?: { token?: string };
}) {
  return <InvitationAcceptance token={searchParams?.token ?? ""} />;
}
