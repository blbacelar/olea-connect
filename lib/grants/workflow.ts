export type GrantPlatformApplicationActionState = {
  canEdit: boolean;
  canReview: boolean;
  canWithdraw: boolean;
};

export function getGrantPlatformApplicationActionState(
  status?: string | null,
): GrantPlatformApplicationActionState {
  switch (status) {
    case "draft":
      return { canEdit: true, canReview: false, canWithdraw: true };
    case "submitted":
    case "in_review":
    case "shortlisted":
      return { canEdit: false, canReview: true, canWithdraw: true };
    case "approved":
    case "declined":
    case "withdrawn":
    default:
      return { canEdit: false, canReview: false, canWithdraw: false };
  }
}
