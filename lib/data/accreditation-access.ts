import type { MembershipTier } from "@/lib/types";

type AccreditationAccessCheckInput = {
  directAccess: Array<{ ends_at?: string | null }>;
  organizationTier: MembershipTier;
  planAccess: Array<{ plan_id: string }>;
};

export function hasAccreditationWorkspaceAccess({
  directAccess,
  organizationTier,
  planAccess,
}: AccreditationAccessCheckInput): boolean {
  const normalizedDirectAccess = directAccess ?? [];
  const normalizedPlanAccess = planAccess ?? [];

  if (
    normalizedDirectAccess.some(
      (access) => !access.ends_at || access.ends_at > new Date().toISOString(),
    )
  ) {
    return true;
  }

  if (normalizedPlanAccess.length === 0) {
    return true;
  }

  return normalizedPlanAccess.some((access) => access.plan_id === organizationTier);
}
