export function getReservedSeatCount(
  activeMemberCount: number,
  pendingInvitationCount: number,
) {
  return Math.max(activeMemberCount, 1) + pendingInvitationCount;
}

export function getRemainingInviteSeatCount(
  seatLimit: number,
  reservedSeatCount: number,
) {
  return Math.max(seatLimit - reservedSeatCount, 0);
}
