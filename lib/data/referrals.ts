import "server-only";

import { cache } from "react";

import {
  getOptionalMemberContext,
  requireMemberContext,
} from "@/lib/data/member-context";
import { createAdminClient } from "@/utils/supabase/admin";

import {
  mapPayout,
  mapReferral,
  mapReferrer,
  mapSettings,
  referralProgramSettingsDefaults,
  type ReferralAdminData,
  type ReferralDashboardData,
} from "./referral-records";

export {
  referralProgramSettingsDefaults,
  type ReferralAdminData,
  type ReferralDashboardData,
  type ReferralLink,
  type ReferralPayoutRecord,
  type ReferralProgramSettings,
  type ReferralRecord,
  type ReferrerRecord,
} from "./referral-records";

const settingsSelect =
  "program_enabled, demo_attended_payout_cents, retained_customer_payout_cents, retention_days, currency, contact_email, terms_url";
const referrerSelect =
  "id, user_id, full_name, email, organization_name, relationship_to_olea, payout_contact, status, status_reason, approved_at, created_at, referral_links(code, active, created_at)";
const referralSelect =
  "id, referral_code, referred_email, status, created_at, last_milestone_at, organizations(name)";
const adminReferralSelect = `${referralSelect}, referrers(full_name, email)`;
const payoutSelect =
  "id, referral_id, milestone, amount_cents, currency, status, due_at, paid_at, notes, evidence_url";

export const getReferralProgramSettings = cache(async () => {
  const { data, error } = await createAdminClient()
    .from("referral_program_settings")
    .select(settingsSelect)
    .eq("id", true)
    .single();

  if (error) throw error;
  return mapSettings(data);
});

export async function requireReferralAdmin() {
  const session = await requireMemberContext();
  if (!(session.platformRoles ?? []).includes("super_admin")) {
    throw new Error("Only platform administrators can manage referrals.");
  }
  return session;
}

export async function getReferralAdminData(): Promise<ReferralAdminData> {
  await requireReferralAdmin();
  const supabase = createAdminClient();
  const [settingsResult, referrersResult, referralsResult, payoutsResult] =
    await Promise.all([
      supabase
        .from("referral_program_settings")
        .select(settingsSelect)
        .eq("id", true)
        .single(),
      supabase
        .from("referrers")
        .select(referrerSelect)
        .neq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("referrals")
        .select(adminReferralSelect)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("referral_payouts")
        .select(payoutSelect)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  if (settingsResult.error) throw settingsResult.error;
  if (referrersResult.error) throw referrersResult.error;
  if (referralsResult.error) throw referralsResult.error;
  if (payoutsResult.error) throw payoutsResult.error;

  return {
    settings: mapSettings(settingsResult.data),
    referrers: (referrersResult.data ?? []).map(mapReferrer),
    referrals: (referralsResult.data ?? []).map(mapReferral),
    payouts: (payoutsResult.data ?? []).map(mapPayout),
  };
}

export async function getReferralDashboardData(): Promise<ReferralDashboardData> {
  const session = await getOptionalMemberContext();
  const settings = await getSettingsOrDefaults();

  if (!session?.member.email) return emptyReferralDashboard(settings);

  const supabase = createAdminClient();
  const referrerRow = await resolveDashboardReferrer({
    email: session.member.email,
    supabase,
    userId: session.member.id,
  });
  if (!referrerRow) return emptyReferralDashboard(settings);

  const referrer = mapReferrer(referrerRow);
  const referralsResult = await getReferralsForReferrer(supabase, referrer.id);
  const payoutsResult = await getPayoutsForReferrals(
    supabase,
    getReferralIds(referralsResult.data ?? []),
  );

  if (payoutsResult.error) throw payoutsResult.error;

  return {
    settings,
    referrer,
    referrals: (referralsResult.data ?? []).map(mapReferral),
    payouts: (payoutsResult.data ?? []).map(mapPayout),
  };
}

async function getSettingsOrDefaults() {
  return getReferralProgramSettings().catch(
    () => referralProgramSettingsDefaults,
  );
}

function emptyReferralDashboard(
  settings: ReferralDashboardData["settings"],
): ReferralDashboardData {
  return { settings, referrer: null, referrals: [], payouts: [] };
}

async function resolveDashboardReferrer({
  email,
  supabase,
  userId,
}: {
  email: string;
  supabase: ReturnType<typeof createAdminClient>;
  userId: string;
}) {
  const referrerByUserId = await getReferrerByUserId(supabase, userId);
  if (referrerByUserId) return referrerByUserId;

  const referrerByEmail = await getReferrerByEmail(supabase, email);
  if (referrerByEmail?.user_id && referrerByEmail.user_id !== userId) {
    return null;
  }
  if (!referrerByEmail || referrerByEmail.user_id) return referrerByEmail;

  return claimReferrerForUser(supabase, referrerByEmail.id, userId);
}

async function getReferrerByUserId(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("referrers")
    .select(referrerSelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getReferrerByEmail(
  supabase: ReturnType<typeof createAdminClient>,
  email: string,
) {
  const { data, error } = await supabase
    .from("referrers")
    .select(referrerSelect)
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function claimReferrerForUser(
  supabase: ReturnType<typeof createAdminClient>,
  referrerId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("referrers")
    .update({ user_id: userId })
    .eq("id", referrerId)
    .is("user_id", null)
    .select(referrerSelect)
    .single();

  if (error) throw error;
  return data;
}

async function getReferralsForReferrer(
  supabase: ReturnType<typeof createAdminClient>,
  referrerId: string,
) {
  const result = await supabase
    .from("referrals")
    .select(referralSelect)
    .eq("referrer_id", referrerId)
    .order("created_at", { ascending: false });

  if (result.error) throw result.error;
  return result;
}

function getReferralIds(referrals: Array<{ id: string }>) {
  return referrals.map((row) => row.id);
}

async function getPayoutsForReferrals(
  supabase: ReturnType<typeof createAdminClient>,
  referralIds: string[],
) {
  if (referralIds.length === 0) return { data: [], error: null };

  return supabase
    .from("referral_payouts")
    .select(payoutSelect)
    .in("referral_id", referralIds)
    .order("created_at", { ascending: false });
}
