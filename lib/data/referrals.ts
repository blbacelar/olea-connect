import "server-only";

import { cache } from "react";

import {
  getOptionalMemberContext,
  requireMemberContext,
} from "@/lib/data/member-context";
import type {
  ReferralPayoutMilestone,
  ReferralPayoutStatus,
  ReferralReferrerStatus,
  ReferralStatus,
} from "@/lib/referrals/domain";
import { createAdminClient } from "@/utils/supabase/admin";

export type ReferralProgramSettings = {
  programEnabled: boolean;
  demoAttendedPayoutCents: number;
  retainedCustomerPayoutCents: number;
  retentionDays: number;
  currency: string;
  contactEmail: string;
  termsUrl: string | null;
};

export type ReferralLink = {
  code: string;
  active: boolean;
  createdAt: string;
};

export type ReferrerRecord = {
  id: string;
  userId: string | null;
  fullName: string;
  email: string;
  organizationName: string | null;
  relationshipToOlea: string;
  payoutContact: string;
  status: ReferralReferrerStatus;
  statusReason: string | null;
  approvedAt: string | null;
  createdAt: string;
  links: ReferralLink[];
};

export type ReferralRecord = {
  id: string;
  referralCode: string;
  referredEmail: string | null;
  status: ReferralStatus;
  createdAt: string;
  lastMilestoneAt: string;
  referredOrganizationName: string | null;
  referrerName?: string;
  referrerEmail?: string;
};

export type ReferralPayoutRecord = {
  id: string;
  referralId: string;
  milestone: ReferralPayoutMilestone;
  amountCents: number;
  currency: string;
  status: ReferralPayoutStatus;
  dueAt: string | null;
  paidAt: string | null;
  notes: string | null;
  evidenceUrl: string | null;
};

export type ReferralAdminData = {
  settings: ReferralProgramSettings;
  referrers: ReferrerRecord[];
  referrals: ReferralRecord[];
  payouts: ReferralPayoutRecord[];
};

export type ReferralDashboardData = {
  settings: ReferralProgramSettings;
  referrer: ReferrerRecord | null;
  referrals: ReferralRecord[];
  payouts: ReferralPayoutRecord[];
};

export const referralProgramSettingsDefaults: ReferralProgramSettings = {
  programEnabled: true,
  demoAttendedPayoutCents: 10000,
  retainedCustomerPayoutCents: 40000,
  retentionDays: 90,
  currency: "CAD",
  contactEmail: "hello@olivesocialimpact.com",
  termsUrl: null,
};

function mapSettings(row: {
  program_enabled: boolean;
  demo_attended_payout_cents: number;
  retained_customer_payout_cents: number;
  retention_days: number;
  currency: string;
  contact_email: string;
  terms_url: string | null;
}): ReferralProgramSettings {
  return {
    programEnabled: row.program_enabled,
    demoAttendedPayoutCents: row.demo_attended_payout_cents,
    retainedCustomerPayoutCents: row.retained_customer_payout_cents,
    retentionDays: row.retention_days,
    currency: row.currency,
    contactEmail: row.contact_email,
    termsUrl: row.terms_url,
  };
}

function mapReferrer(row: {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  organization_name: string | null;
  relationship_to_olea: string;
  payout_contact: string;
  status: ReferralReferrerStatus;
  status_reason: string | null;
  approved_at: string | null;
  created_at: string;
  referral_links?: Array<{
    code: string;
    active: boolean;
    created_at: string;
  }>;
}): ReferrerRecord {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    organizationName: row.organization_name,
    relationshipToOlea: row.relationship_to_olea,
    payoutContact: row.payout_contact,
    status: row.status,
    statusReason: row.status_reason,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    links: (row.referral_links ?? []).map((link) => ({
      code: link.code,
      active: link.active,
      createdAt: link.created_at,
    })),
  };
}

function mapReferral(row: {
  id: string;
  referral_code: string;
  referred_email: string | null;
  status: ReferralStatus;
  created_at: string;
  last_milestone_at: string;
  organizations?: { name: string } | { name: string }[] | null;
  referrers?:
    | { full_name: string; email: string }
    | { full_name: string; email: string }[]
    | null;
}): ReferralRecord {
  const organization = Array.isArray(row.organizations)
    ? row.organizations[0]
    : row.organizations;
  const referrer = Array.isArray(row.referrers)
    ? row.referrers[0]
    : row.referrers;

  return {
    id: row.id,
    referralCode: row.referral_code,
    referredEmail: row.referred_email,
    status: row.status,
    createdAt: row.created_at,
    lastMilestoneAt: row.last_milestone_at,
    referredOrganizationName: organization?.name ?? null,
    referrerName: referrer?.full_name,
    referrerEmail: referrer?.email,
  };
}

function mapPayout(row: {
  id: string;
  referral_id: string;
  milestone: ReferralPayoutMilestone;
  amount_cents: number;
  currency: string;
  status: ReferralPayoutStatus;
  due_at: string | null;
  paid_at: string | null;
  notes: string | null;
  evidence_url: string | null;
}): ReferralPayoutRecord {
  return {
    id: row.id,
    referralId: row.referral_id,
    milestone: row.milestone,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    dueAt: row.due_at,
    paidAt: row.paid_at,
    notes: row.notes,
    evidenceUrl: row.evidence_url,
  };
}

export const getReferralProgramSettings = cache(async () => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("referral_program_settings")
    .select(
      "program_enabled, demo_attended_payout_cents, retained_customer_payout_cents, retention_days, currency, contact_email, terms_url",
    )
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
        .select(
          "program_enabled, demo_attended_payout_cents, retained_customer_payout_cents, retention_days, currency, contact_email, terms_url",
        )
        .eq("id", true)
        .single(),
      supabase
        .from("referrers")
        .select(
          "id, user_id, full_name, email, organization_name, relationship_to_olea, payout_contact, status, status_reason, approved_at, created_at, referral_links(code, active, created_at)",
        )
        .neq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("referrals")
        .select(
          "id, referral_code, referred_email, status, created_at, last_milestone_at, organizations(name), referrers(full_name, email)",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("referral_payouts")
        .select(
          "id, referral_id, milestone, amount_cents, currency, status, due_at, paid_at, notes, evidence_url",
        )
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
  const supabase = createAdminClient();
  const settings = await getReferralProgramSettings().catch(
    () => referralProgramSettingsDefaults,
  );

  if (!session?.member.email) {
    return { settings, referrer: null, referrals: [], payouts: [] };
  }

  const { data: referrerByUserId, error: referrerByUserIdError } =
    await supabase
      .from("referrers")
      .select(
        "id, user_id, full_name, email, organization_name, relationship_to_olea, payout_contact, status, status_reason, approved_at, created_at, referral_links(code, active, created_at)",
      )
      .eq("user_id", session.member.id)
      .maybeSingle();

  if (referrerByUserIdError) throw referrerByUserIdError;

  let referrerRow = referrerByUserId;
  if (!referrerRow) {
    const { data: referrerByEmail, error: referrerByEmailError } =
      await supabase
        .from("referrers")
        .select(
          "id, user_id, full_name, email, organization_name, relationship_to_olea, payout_contact, status, status_reason, approved_at, created_at, referral_links(code, active, created_at)",
        )
        .eq("email", session.member.email.toLowerCase())
        .maybeSingle();

    if (referrerByEmailError) throw referrerByEmailError;
    if (
      referrerByEmail?.user_id &&
      referrerByEmail.user_id !== session.member.id
    ) {
      return { settings, referrer: null, referrals: [], payouts: [] };
    }

    if (referrerByEmail && !referrerByEmail.user_id) {
      const { data: claimedReferrer, error: claimError } = await supabase
        .from("referrers")
        .update({ user_id: session.member.id })
        .eq("id", referrerByEmail.id)
        .is("user_id", null)
        .select(
          "id, user_id, full_name, email, organization_name, relationship_to_olea, payout_contact, status, status_reason, approved_at, created_at, referral_links(code, active, created_at)",
        )
        .single();
      if (claimError) throw claimError;
      referrerRow = claimedReferrer;
    } else {
      referrerRow = referrerByEmail;
    }
  }

  if (!referrerRow) {
    return { settings, referrer: null, referrals: [], payouts: [] };
  }

  const referrer = mapReferrer(referrerRow);
  const referralsResult = await supabase
    .from("referrals")
    .select(
      "id, referral_code, referred_email, status, created_at, last_milestone_at, organizations(name)",
    )
    .eq("referrer_id", referrer.id)
    .order("created_at", { ascending: false });
  if (referralsResult.error) throw referralsResult.error;

  const referralIds = (referralsResult.data ?? []).map((row) => row.id);
  const payoutsResult =
    referralIds.length > 0
      ? await supabase
          .from("referral_payouts")
          .select(
            "id, referral_id, milestone, amount_cents, currency, status, due_at, paid_at, notes, evidence_url",
          )
          .in("referral_id", referralIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

  if (payoutsResult.error) throw payoutsResult.error;

  return {
    settings,
    referrer,
    referrals: (referralsResult.data ?? []).map(mapReferral),
    payouts: (payoutsResult.data ?? []).map(mapPayout),
  };
}
