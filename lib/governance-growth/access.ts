import "server-only";

import { requireMemberContext } from "@/lib/data/member-context";
import { createAdminClient } from "@/utils/supabase/admin";
import { hasGovernanceFeature, type GovernanceFeature } from "./entitlements";

export type { GovernanceFeature } from "./entitlements";

export async function getGovernanceGrowthContext(feature: GovernanceFeature) {
  const session = await requireMemberContext();
  const admin = createAdminClient();
  const { data: subscription, error } = await admin.from("subscriptions")
    .select("plan_id, status, current_period_end, subscription_items(item_type, active)")
    .eq("organization_id", session.organization.id)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  return {
    admin,
    session,
    hasAccess: hasGovernanceFeature(feature, subscription),
    canManage: ["owner", "admin"].includes(session.member.membershipRole),
  };
}

export async function requireGovernanceGrowthManager(feature: GovernanceFeature) {
  const context = await getGovernanceGrowthContext(feature);
  if (!context.hasAccess) throw new Error("This module is not included in your active membership.");
  if (!context.canManage) throw new Error("Only organization owners and administrators can change this module.");
  return context;
}
