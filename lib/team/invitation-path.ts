export function getInvitationAcceptPath(token: string) {
  return `/team/invitations/accept?token=${encodeURIComponent(token)}`;
}
