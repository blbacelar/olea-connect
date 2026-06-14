import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { MembershipTier, RegistrationState } from "@/lib/types";

type BillingCycle = RegistrationState["billingCycle"];

interface CheckoutRegistration {
  userId: string;
  email: string;
  fullName: string;
  organizationName: string;
  province: string;
  tier: MembershipTier;
  billingCycle: BillingCycle;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function prepareCheckoutRegistration(
  supabase: SupabaseClient,
  registration: CheckoutRegistration,
) {
  const { data: authUser, error: authError } =
    await supabase.auth.admin.getUserById(registration.userId);

  if (authError || !authUser.user) {
    throw new Error("The signup account could not be verified.");
  }

  if (
    authUser.user.email?.toLowerCase() !== registration.email.toLowerCase()
  ) {
    throw new Error("The checkout email does not match the signup account.");
  }

  const { data: existingMembership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", registration.userId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;

  let organizationId = existingMembership?.organization_id as
    | string
    | undefined;

  if (!organizationId) {
    const slugBase = slugify(registration.organizationName) || "organization";
    const slug = `${slugBase}-${registration.userId.slice(0, 8)}`;
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .insert({
        name: registration.organizationName.trim(),
        slug,
        province_or_region: registration.province,
        created_by: registration.userId,
      })
      .select("id")
      .single();

    if (organizationError) throw organizationError;
    organizationId = organization.id;

    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: organizationId,
        user_id: registration.userId,
        role: "owner",
        status: "active",
        joined_at: new Date().toISOString(),
      });

    if (memberError) throw memberError;

    const { error: brandError } = await supabase
      .from("organization_brand_profiles")
      .insert({
        organization_id: organizationId,
        display_name: registration.organizationName.trim(),
      });

    if (brandError) throw brandError;
  }

  if (!organizationId) {
    throw new Error("Unable to prepare the organization for checkout.");
  }

  const interval = registration.billingCycle === "annual" ? "year" : "month";
  const { data: existingSubscription, error: subscriptionLookupError } =
    await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("organization_id", organizationId)
      .eq("provider", "stripe")
      .in("status", ["incomplete", "trialing", "active", "past_due", "paused"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (subscriptionLookupError) throw subscriptionLookupError;

  if (existingSubscription?.status === "active") {
    throw new Error("This organization already has an active subscription.");
  }

  if (existingSubscription) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        plan_id: registration.tier,
        billing_interval: interval,
        metadata: {
          signup_user_id: registration.userId,
          billing_province: registration.province,
        },
      })
      .eq("id", existingSubscription.id);

    if (error) throw error;
    return {
      organizationId,
      subscriptionId: existingSubscription.id as string,
    };
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .insert({
      organization_id: organizationId,
      plan_id: registration.tier,
      provider: "stripe",
      billing_interval: interval,
      status: "incomplete",
      metadata: {
        signup_user_id: registration.userId,
        billing_province: registration.province,
      },
    })
    .select("id")
    .single();

  if (subscriptionError) throw subscriptionError;

  return {
    organizationId,
    subscriptionId: subscription.id as string,
  };
}
