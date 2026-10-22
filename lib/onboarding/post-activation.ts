import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const BRAND_SETUP_PATH = "/onboarding/brand-setup";
export const TEMPLATE_SELECTION_PATH = "/onboarding/template-selection";
export const DASHBOARD_PATH = "/dashboard";

interface ActiveSubscription {
  plan_id: string | null;
  membership_plans:
    | { template_selection_limit: number | null }
    | Array<{ template_selection_limit: number | null }>
    | null;
}

function firstPlan(subscription: ActiveSubscription | null) {
  const plan = subscription?.membership_plans;
  return Array.isArray(plan) ? plan[0] : plan;
}

export async function getPostActivationPath(
  supabase: SupabaseClient,
  organizationId?: string | null,
) {
  if (!organizationId) return BRAND_SETUP_PATH;

  const { data: brand, error: brandError } = await supabase
    .from("organization_brand_profiles")
    .select("brand_completed_at")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (brandError) throw brandError;
  if (!brand?.brand_completed_at) return BRAND_SETUP_PATH;

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("plan_id, membership_plans(template_selection_limit)")
    .eq("organization_id", organizationId)
    .in("status", ["trialing", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ActiveSubscription>();

  if (subscriptionError) throw subscriptionError;

  const templateSelectionLimit =
    firstPlan(subscription)?.template_selection_limit ?? 0;

  if (subscription?.plan_id !== "seedling" || templateSelectionLimit <= 0) {
    return DASHBOARD_PATH;
  }

  const [
    { count: publishedTemplateCount, error: publishedTemplateError },
    { count: selectedTemplateCount, error: selectedTemplateError },
  ] = await Promise.all([
    supabase
      .from("resources")
      .select("id", { count: "exact", head: true })
      .eq("type", "template")
      .eq("status", "published"),
    supabase
      .from("organization_resource_access")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("access_kind", "selection")
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`),
  ]);

  if (publishedTemplateError) throw publishedTemplateError;
  if (selectedTemplateError) throw selectedTemplateError;

  const requiredSelections = Math.min(
    templateSelectionLimit,
    publishedTemplateCount ?? 0,
  );

  if (requiredSelections > 0 && (selectedTemplateCount ?? 0) < requiredSelections) {
    return TEMPLATE_SELECTION_PATH;
  }

  return DASHBOARD_PATH;
}
