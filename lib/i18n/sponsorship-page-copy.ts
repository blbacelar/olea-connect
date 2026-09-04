import type { SponsorshipTierIcon } from "@/lib/sponsorship-content";

import type { Locale } from "./locales";
import { sponsorshipPageCopyEn } from "./sponsorship-page-copy.en";
import { sponsorshipPageCopyFr } from "./sponsorship-page-copy.fr";

export type LocalizedSponsorshipTier = {
  name: string;
  icon: SponsorshipTierIcon;
  subtitle: string;
  description: string;
  features: string[];
  featured?: boolean;
  availability?: string;
};

export type SponsorshipPageCopy = {
  heroEyebrow: string;
  heroTitle: string;
  heroBody: string;
  quote: string;
  tiersEyebrow: string;
  tiersTitle: string;
  benefitsTitle: string;
  impactEyebrow: string;
  impactTitle: string;
  impactBody: string;
  ctaTitle: string;
  ctaBody: string;
  exploreTier: string;
  exploreTierAria: string;
  scheduleConversation: string;
  scheduleConversationAria: string;
  calendlyFallback: string;
  questionsPrefix: string;
  premiumTier: string;
  contactForPricing: string;
  featuredCta: string;
  defaultCta: string;
  tierAria: (tierName: string) => string;
  tiers: LocalizedSponsorshipTier[];
  benefits: {
    title: string;
    description: string;
  }[];
  impactFeatures: {
    title: string;
    description: string;
  }[];
};

export const sponsorshipPageCopy: Record<Locale, SponsorshipPageCopy> = {
  "en-CA": sponsorshipPageCopyEn,
  "fr-CA": sponsorshipPageCopyFr,
};

export function getSponsorshipPageCopy(locale: Locale) {
  return sponsorshipPageCopy[locale];
}
