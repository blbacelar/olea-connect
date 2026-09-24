import type { Locale } from "@/lib/i18n/locales";

export const pricingPolicies = {
  extraSeat: "$15 CAD one-time per seat",
  trial: "No free trial",
  foundingMember:
    "Founding members with a valid code receive 15% off Year 1, limited to the first 50 paid organizations.",
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
