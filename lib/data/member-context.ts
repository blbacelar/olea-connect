import "server-only";

import { redirect } from "next/navigation";

import type {
  BrandProfile,
  Member,
  MembershipTier,
  Organization,
  OrganizationRole,
  Session,
} from "@/lib/types";
import { createClient } from "@/utils/supabase/server";
import { createLogoSignedUrl } from "./brand-assets";

const DEFAULT_PRIMARY_COLOR = "#446B52";
const DEFAULT_SECONDARY_COLOR = "#F4EFE4";

function initials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "OC"
  );
}

export async function getOptionalMemberContext(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user) return null;
  if (userError) throw userError;

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select(
      "organization_id, role, joined_at, organizations(id, name, profile_completed_at)",
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) return null;

  const organizationRow = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;
  if (!organizationRow) return null;

  const [
    { data: profile, error: profileError },
    { data: brand, error: brandError },
    { data: subscription, error: subscriptionError },
    { count: memberCount, error: memberCountError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("organization_brand_profiles")
      .select(
        "display_name, logo_path, primary_color, secondary_color, address, phone, contact_email, website, brand_completed_at",
      )
      .eq("organization_id", membership.organization_id)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select(
        "id, plan_id, status, current_period_end, membership_plans(included_seats), subscription_items(item_type, quantity, active)",
      )
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", membership.organization_id)
      .eq("status", "active"),
  ]);

  if (profileError) throw profileError;
  if (brandError) throw brandError;
  if (subscriptionError) throw subscriptionError;
  if (memberCountError) throw memberCountError;

  const plan = Array.isArray(subscription?.membership_plans)
    ? subscription.membership_plans[0]
    : subscription?.membership_plans;
  const purchasedSeats = (subscription?.subscription_items ?? []).reduce(
    (total, item) =>
      item.item_type === "seat" && item.active ? total + item.quantity : total,
    0,
  );
  const fullName =
    profile?.full_name?.trim() ||
    user.user_metadata.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Member";
  const displayName = brand?.display_name || organizationRow.name;
  const logoPath = brand?.logo_path ?? undefined;
  const brandProfile: BrandProfile = {
    organizationName: displayName,
    logoInitials: initials(displayName),
    logoPath,
    logoUrl: await createLogoSignedUrl(supabase, logoPath),
    primaryColor: brand?.primary_color ?? DEFAULT_PRIMARY_COLOR,
    secondaryColor: brand?.secondary_color ?? DEFAULT_SECONDARY_COLOR,
    address: brand?.address ?? undefined,
    phone: brand?.phone ?? undefined,
    contactEmail: brand?.contact_email ?? undefined,
    website: brand?.website ?? undefined,
  };
  const organization: Organization = {
    id: membership.organization_id,
    name: organizationRow.name,
    tier: (subscription?.plan_id ?? "seedling") as MembershipTier,
    seatsUsed: memberCount ?? 1,
    seatLimit: (plan?.included_seats ?? 1) + purchasedSeats,
    renewalDate: subscription?.current_period_end ?? "",
    brandComplete: Boolean(brand?.brand_completed_at),
    brand: brandProfile,
  };
  const member: Member = {
    id: user.id,
    organizationId: membership.organization_id,
    name: fullName,
    firstName: fullName.split(/\s+/)[0],
    role: membership.role === "owner" ? "Organization owner" : membership.role,
    membershipRole: membership.role as OrganizationRole,
    email: user.email ?? "",
  };

  return { member, organization };
}

export async function requireMemberContext() {
  const session = await getOptionalMemberContext();
  if (!session) redirect("/login");
  return session;
}
