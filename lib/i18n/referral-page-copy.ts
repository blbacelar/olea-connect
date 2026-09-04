import type {
  ReferralPayoutMilestone,
  ReferralPayoutStatus,
  ReferralReferrerStatus,
  ReferralStatus,
} from "@/lib/referrals/domain";

import type { Locale } from "./locales";
import { referralPageCopyEn } from "./referral-page-copy.en";
import { referralPageCopyFr } from "./referral-page-copy.fr";

export type ReferralPageCopy = {
  heroEyebrow: string;
  heroTitle: (amount: string) => string;
  heroBody: string;
  signUp: string;
  dashboard: string;
  demoPayout: string;
  retainedPayout: string;
  howItWorks: string;
  steps: {
    title: string;
    body: string;
  }[];
  closingTitle: (amount: string) => string;
  closingBody: string;
  faqs: {
    q: string;
    a: string;
  }[];
  form: {
    eyebrow: string;
    title: string;
    description: string;
    fullName: string;
    email: string;
    organizationName: string;
    organizationPlaceholder: string;
    relationshipToOlea: string;
    relationshipPlaceholder: string;
    payoutContact: string;
    payoutPlaceholder: string;
    termsAccepted: string;
    pending: string;
    submit: string;
  };
  paused: {
    title: string;
    body: string;
  };
  action: {
    fieldErrors: Partial<Record<string, string>>;
    reviewFields: string;
    programPaused: string;
    duplicateReceived: string;
    initialError: string;
    submitted: string;
    termsRequired: string;
  };
  dashboardScreen: {
    back: string;
    title: string;
    description: string;
    emptyReferrals: string;
    emptyPayouts: string;
    table: {
      referral: string;
      organization: string;
      status: string;
      lastMilestone: string;
      milestone: string;
      amount: string;
      due: string;
      paid: string;
    };
    fallback: {
      notSet: string;
      leadCaptured: string;
      notAvailable: string;
    };
    applyTitle: string;
    applyBody: string;
    applyCta: string;
    pendingTitle: (status: string) => string;
    pendingBody: string;
    approvedLink: string;
    shareLink: string;
    shareLinkBody: string;
    openLink: string;
    metrics: {
      referrals: string;
      eligiblePayouts: string;
      paid: string;
    };
    copyLink: string;
    copied: string;
    statuses: {
      referrer: Record<ReferralReferrerStatus, string>;
      referral: Record<ReferralStatus, string>;
      payout: Record<ReferralPayoutStatus, string>;
      milestones: Record<ReferralPayoutMilestone, string>;
    };
  };
};

export const referralPageCopy: Record<Locale, ReferralPageCopy> = {
  "en-CA": referralPageCopyEn,
  "fr-CA": referralPageCopyFr,
};

export function getReferralPageCopy(locale: Locale) {
  return referralPageCopy[locale];
}
