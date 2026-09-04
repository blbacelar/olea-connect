import type {
  ReferralPayoutMilestone,
  ReferralPayoutStatus,
  ReferralReferrerStatus,
  ReferralStatus,
} from "@/lib/referrals/domain";

export type ReferralProgramSettings = {
  contactEmail: string;
  currency: string;
  demoAttendedPayoutCents: number;
  programEnabled: boolean;
  retainedCustomerPayoutCents: number;
  retentionDays: number;
  termsUrl: string | null;
};

export type ReferralLink = {
  active: boolean;
  code: string;
  createdAt: string;
};

export type ReferrerRecord = {
  approvedAt: string | null;
  createdAt: string;
  email: string;
  fullName: string;
  id: string;
  links: ReferralLink[];
  organizationName: string | null;
  payoutContact: string;
  relationshipToOlea: string;
  status: ReferralReferrerStatus;
  statusReason: string | null;
  userId: string | null;
};

export type ReferralRecord = {
  createdAt: string;
  id: string;
  lastMilestoneAt: string;
  referralCode: string;
  referredEmail: string | null;
  referredOrganizationName: string | null;
  referrerEmail?: string;
  referrerName?: string;
  status: ReferralStatus;
};

export type ReferralPayoutRecord = {
  amountCents: number;
  currency: string;
  dueAt: string | null;
  evidenceUrl: string | null;
  id: string;
  milestone: ReferralPayoutMilestone;
  notes: string | null;
  paidAt: string | null;
  referralId: string;
  status: ReferralPayoutStatus;
};

export type ReferralAdminData = {
  payouts: ReferralPayoutRecord[];
  referrals: ReferralRecord[];
  referrers: ReferrerRecord[];
  settings: ReferralProgramSettings;
};

export type ReferralDashboardData = {
  payouts: ReferralPayoutRecord[];
  referrals: ReferralRecord[];
  referrer: ReferrerRecord | null;
  settings: ReferralProgramSettings;
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

export function mapSettings(row: {
  contact_email: string;
  currency: string;
  demo_attended_payout_cents: number;
  program_enabled: boolean;
  retained_customer_payout_cents: number;
  retention_days: number;
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

export function mapReferrer(row: {
  approved_at: string | null;
  created_at: string;
  email: string;
  full_name: string;
  id: string;
  organization_name: string | null;
  payout_contact: string;
  referral_links?: Array<{
    active: boolean;
    code: string;
    created_at: string;
  }>;
  relationship_to_olea: string;
  status: ReferralReferrerStatus;
  status_reason: string | null;
  user_id: string | null;
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

export function mapReferral(row: {
  created_at: string;
  id: string;
  last_milestone_at: string;
  organizations?: { name: string } | { name: string }[] | null;
  referral_code: string;
  referred_email: string | null;
  referrers?:
    | { email: string; full_name: string }
    | { email: string; full_name: string }[]
    | null;
  status: ReferralStatus;
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

export function mapPayout(row: {
  amount_cents: number;
  currency: string;
  due_at: string | null;
  evidence_url: string | null;
  id: string;
  milestone: ReferralPayoutMilestone;
  notes: string | null;
  paid_at: string | null;
  referral_id: string;
  status: ReferralPayoutStatus;
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
