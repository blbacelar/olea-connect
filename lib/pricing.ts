import type { Locale } from "@/lib/i18n/locales";

export const fixedPriceOffers = {
  kpiDashboard: { amount: 1195, cadence: "annual" },
  boardTraining: { amount: 1495, cadence: "annual" },
  accreditationPrep: { amount: 99, cadence: "annual" },
  acceleratorIndividual: { amount: 500, cadence: "one-time" },
  acceleratorTeam: { amount: 1200, cadence: "one-time" },
  sponsorSeedlingBoard: { amount: 1000, cadence: "one-time" },
  sponsorRootsBoard: { amount: 3000, cadence: "one-time" },
  sponsorAcceleratorTeam: { amount: 1200, cadence: "one-time" },
} as const;

export function foundingYearPrice(annualPrice: number) {
  return Math.round(annualPrice * 100 * 0.85) / 100;
}

export const pricingPolicies = {
  extraSeat: "$15 CAD one-time per seat",
  trial: "No free trial",
  foundingMember:
    "Founding members with a valid code receive 15% off their first two annual payments, limited to the first 50 paid organizations.",
  taxes: "Your total is shown at secure checkout before payment. Taxes are not currently collected.",
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
