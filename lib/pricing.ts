import type { Locale } from "@/lib/i18n/locales";

export type AddOnPackage = {
  name: string;
  hours: string;
  quarterlyPrice: number;
  annualPrice: number;
};

export type AddOn = {
  name: string;
  description: string;
  rateLabel: string;
  packages: AddOnPackage[];
};

export const pricingAddOns: AddOn[] = [
  {
    name: "Impact Coaching",
    description:
      "Hands-on support for KPI metrics, funder reporting, and impact strategy.",
    rateLabel: "$162 CAD/hour",
    packages: [
      {
        name: "Light",
        hours: "4 hours/month",
        quarterlyPrice: 1944,
        annualPrice: 7776,
      },
      {
        name: "Medium",
        hours: "8 hours/month",
        quarterlyPrice: 3888,
        annualPrice: 15552,
      },
      {
        name: "Deep",
        hours: "12 hours/month",
        quarterlyPrice: 5832,
        annualPrice: 23328,
      },
    ],
  },
  {
    name: "Admin Support",
    description:
      "Practical help with board operations, meeting preparation, grants, and governance administration.",
    rateLabel: "$100 CAD/hour",
    packages: [
      {
        name: "Light",
        hours: "4 hours/month",
        quarterlyPrice: 1200,
        annualPrice: 4800,
      },
      {
        name: "Medium",
        hours: "8 hours/month",
        quarterlyPrice: 2400,
        annualPrice: 9600,
      },
      {
        name: "Deep",
        hours: "12 hours/month",
        quarterlyPrice: 3600,
        annualPrice: 14400,
      },
    ],
  },
];

export const retreatFacilitation = [
  { name: "Half-day", detail: "4 hours", price: 1400 },
  { name: "Full day", detail: "8 hours", price: 2300 },
] as const;

export const referralRewards = [
  {
    referrals: "1 referral",
    grant: "$250 Olea Gives grant",
    coaching: "2 free coaching hours",
  },
  {
    referrals: "2 referrals",
    grant: "$500 Olea Gives grant",
    coaching: "4 free coaching hours",
  },
  {
    referrals: "3+ referrals",
    grant: "Olea Champion recognition",
    coaching: "Quarterly newsletter feature",
  },
] as const;

export const pricingPolicies = {
  extraSeat: "$15 CAD one-time per seat",
  trial: "No free trial",
  foundingMember: "The first 50 paid organizations receive 15% off Year 1 only.",
  taxes: "Prices are shown before tax; GST/PST is calculated at checkout by province.",
  cancellation: "30 days' notice before renewal; membership fees are non-refundable.",
} as const;

export function formatCad(value: number, locale: Locale = "en-CA") {
  const fractionDigits = Number.isInteger(value) ? 0 : 2;
  const formatted = new Intl.NumberFormat(locale, {
    currency: "CAD",
    currencyDisplay: "symbol",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
    style: "currency",
  }).format(value);

  if (locale === "fr-CA") {
    return `${formatted} CA`;
  }

  return `${formatted} CAD`;
}
