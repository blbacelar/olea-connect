import type { Locale } from "@/lib/i18n/locales";

export const fixedPriceOffers = {
  ceoReview: { amount: 895, cadence: "annual" },
  boardEvaluation: { amount: 795, cadence: "annual" },
  boardRecruitment: { amount: 595, cadence: "annual" },
  kpiDashboard: { amount: 995, cadence: "annual" },
  boardTraining: { amount: 1495, cadence: "annual" },
  smallBoardTraining: { amount: 795, cadence: "annual" },
  strategicPlanning: { amount: 1195, cadence: "annual" },
  accreditationPrep: { amount: 99, cadence: "annual" },
  acceleratorIndividual: { amount: 500, cadence: "one-time" },
  acceleratorTeam: { amount: 1200, cadence: "one-time" },
  sponsorSeedlingBoard: { amount: 1000, cadence: "one-time" },
  sponsorRootsBoard: { amount: 3000, cadence: "one-time" },
  sponsorAcceleratorTeam: { amount: 1200, cadence: "one-time" },
} as const;

export const pricingPolicies = {
  extraSeat: "$15 CAD one-time per seat",
  trial: "No free trial",
  foundingMember:
    "Founding members with a valid code pay fixed founding rates for two years, limited to the first 50 paid organizations.",
  taxes: "Your total is shown at secure checkout before payment. Taxes are not currently collected.",
  cancellation: "Cancel before renewal; membership fees are non-refundable.",
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
