import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import {
  enqueueAttioMemberSync,
  type AttioMemberSyncPayload,
} from "@/lib/attio/sync";
import {
  enqueueQuickBooksCustomerSync,
  type QuickBooksCustomerSyncPayload,
} from "@/lib/quickbooks/sync";
import type { MembershipTier, OrganizationRole } from "@/lib/types";

type BillingInterval = "month" | "year";

interface LocalSubscriptionRow {
  plan_id: MembershipTier;
  status: string;
  billing_interval: BillingInterval;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
}

interface OrganizationRow {
  id: string;
  name: string;
  legal_name: string | null;
  country_code: string | null;
  province_or_region: string | null;
}

interface OrganizationMemberRow {
  user_id: string;
  role: OrganizationRole;
  status: string;
}

async function getMemberProfile(
  supabase: SupabaseClient,
  userId: string,
) {
  const [
    { data: profile, error: profileError },
    {
      data: { user },
      error: userError,
    },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    supabase.auth.admin.getUserById(userId),
  ]);

  if (profileError) throw profileError;
  if (userError) throw userError;
  if (!user?.email) return null;

  return {
    email: user.email,
    name: profile?.full_name ?? user.email,
  };
}

function getSubscriptionReason(subscription: Stripe.Subscription) {
  return `stripe_subscription_${subscription.status}`;
}

function buildQuickBooksPayload({
  organization,
  subscription,
  primaryEmail,
  reason,
}: {
  organization: OrganizationRow;
  subscription: LocalSubscriptionRow;
  primaryEmail: string | null;
  reason: string;
}): QuickBooksCustomerSyncPayload {
  return {
    organization_id: organization.id,
    organization_name: organization.name,
    legal_name: organization.legal_name,
    primary_email: primaryEmail,
    country_code: organization.country_code,
    province_or_region: organization.province_or_region,
    tier: subscription.plan_id,
    subscription_status: subscription.status,
    billing_interval: subscription.billing_interval,
    provider_customer_id: subscription.provider_customer_id,
    provider_subscription_id: subscription.provider_subscription_id,
    reason,
  };
}

function buildAttioPayload({
  organization,
  subscription,
  member,
  profile,
  reason,
}: {
  organization: OrganizationRow;
  subscription: LocalSubscriptionRow;
  member: OrganizationMemberRow;
  profile: { email: string; name: string };
  reason: string;
}): AttioMemberSyncPayload {
  return {
    email: profile.email,
    name: profile.name,
    user_id: member.user_id,
    organization_id: organization.id,
    organization_name: organization.name,
    organization_role: member.role,
    tier: subscription.plan_id,
    subscription_status: subscription.status,
    billing_interval: subscription.billing_interval,
    provider_customer_id: subscription.provider_customer_id,
    provider_subscription_id: subscription.provider_subscription_id,
    reason,
  };
}

export async function enqueueSubscriptionIntegrationSyncs(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription | null,
) {
  if (!subscription?.metadata.organization_id) return;

  const organizationId = subscription.metadata.organization_id;
  const [
    { data: organization, error: organizationError },
    { data: localSubscription, error: localSubscriptionError },
    { data: members, error: membersError },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, legal_name, country_code, province_or_region")
      .eq("id", organizationId)
      .single(),
    supabase
      .from("subscriptions")
      .select(
        "plan_id, status, billing_interval, provider_customer_id, provider_subscription_id",
      )
      .eq("organization_id", organizationId)
      .eq("provider", "stripe")
      .eq("provider_subscription_id", subscription.id)
      .maybeSingle(),
    supabase
      .from("organization_members")
      .select("user_id, role, status")
      .eq("organization_id", organizationId)
      .eq("status", "active"),
  ]);

  if (organizationError) throw organizationError;
  if (localSubscriptionError) throw localSubscriptionError;
  if (membersError) throw membersError;
  if (!localSubscription) return;

  const reason = getSubscriptionReason(subscription);
  const memberProfiles = await Promise.all(
    ((members ?? []) as OrganizationMemberRow[]).map(async (member) => ({
      member,
      profile: await getMemberProfile(supabase, member.user_id),
    })),
  );
  const primaryEmail =
    memberProfiles.find(({ member, profile }) => member.role === "owner" && profile)
      ?.profile?.email ??
    memberProfiles.find(({ profile }) => profile)?.profile?.email ??
    null;

  await enqueueQuickBooksCustomerSync(
    supabase,
    buildQuickBooksPayload({
      organization: organization as OrganizationRow,
      subscription: localSubscription as LocalSubscriptionRow,
      primaryEmail,
      reason,
    }),
  );

  await Promise.all(
    memberProfiles.map(({ member, profile }) =>
      profile
        ? enqueueAttioMemberSync(
            supabase,
            buildAttioPayload({
              organization: organization as OrganizationRow,
              subscription: localSubscription as LocalSubscriptionRow,
              member,
              profile,
              reason,
            }),
          )
        : null,
    ),
  );
}
