import { InvitationAcceptance } from "./invitation-acceptance";

export default function AcceptTeamInvitationPage({
  searchParams,
}: {
  searchParams?: { token?: string };
}) {
  return <InvitationAcceptance token={searchParams?.token ?? ""} />;
}
