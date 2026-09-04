import type { BillingStatus } from "@/lib/billing/server";
import type { MembershipTier } from "@/lib/types";
import {
  PAID_SEAT_QUANTITY_MAX,
  PAID_SEAT_QUANTITY_MIN,
} from "@/lib/billing/seat-pricing";

export const statusLabels: Record<BillingStatus, string> = {
  incomplete: "Checkout incomplete",
  trialing: "Trialing",
  active: "Active",
  past_due: "Past due",
  paused: "Paused",
  canceled: "Canceled",
  unpaid: "Unpaid",
};

const membershipTierIds = new Set<MembershipTier>([
  "seedling",
  "roots",
  "canopy",
  "harvest",
]);

export function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatBillingInterval(interval: "month" | "year") {
  return interval === "year" ? "year" : "quarter";
}

export function isMembershipTier(value: string): value is MembershipTier {
  return membershipTierIds.has(value as MembershipTier);
}

export function getPlanUpgradedMessage(tierValue?: string) {
  if (!tierValue || !isMembershipTier(tierValue)) {
    return "Plan upgraded. The billing update is confirmed and access is ready.";
  }

  return `Plan upgraded to ${tierValue}. The billing update is confirmed and access is ready.`;
}

export function getSeatAddedMessage(quantityValue?: string) {
  const quantity = Number(quantityValue);
  const normalizedQuantity =
    Number.isInteger(quantity) &&
    quantity >= PAID_SEAT_QUANTITY_MIN &&
    quantity <= PAID_SEAT_QUANTITY_MAX
      ? quantity
      : PAID_SEAT_QUANTITY_MIN;

  return `${normalizedQuantity} paid seat${
    normalizedQuantity === 1 ? "" : "s"
  } added. The one-time payment is confirmed, and ${
    normalizedQuantity === 1 ? "the new seat is" : "the new seats are"
  } available for invitations.`;
}

export function getSeatPaymentMessage(seatState?: string) {
  if (seatState === "payment_canceled") {
    return "Seat payment was canceled. No seat was added.";
  }

  if (seatState === "payment_submitted") {
    return "Payment submitted. Your seat access will appear after payment confirmation.";
  }

  return "";
}
