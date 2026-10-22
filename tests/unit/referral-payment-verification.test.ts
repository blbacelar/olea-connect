import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import { hasVerifiedUnrefundedPayment } from "@/lib/referrals/payment-verification";

function paymentStripe(options: {
  refunded?: number;
  disputed?: boolean;
  paymentType?: "payment_intent" | "payment_record";
}) {
  const paymentType = options.paymentType ?? "payment_intent";
  const stripe = {
    invoicePayments: {
      list: vi.fn(() => ({
        autoPagingToArray: async () => [{
          payment: paymentType === "payment_intent"
            ? { payment_intent: "pi_first", type: paymentType }
            : { payment_record: "pr_first", type: paymentType },
        }],
      })),
    },
    paymentIntents: {
      retrieve: vi.fn(async () => ({ latest_charge: "ch_first" })),
    },
    charges: {
      retrieve: vi.fn(async () => ({
        amount_refunded: options.refunded ?? 0,
        disputed: options.disputed ?? false,
      })),
    },
  } as unknown as Stripe;
  return stripe;
}

describe("referral payout payment verification", () => {
  it("accepts a paid charge with no refund or dispute", async () => {
    expect(await hasVerifiedUnrefundedPayment(paymentStripe({}), "in_first"))
      .toBe(true);
  });

  it.each([
    { refunded: 1 },
    { disputed: true },
    { paymentType: "payment_record" as const },
  ])("holds refunds, disputes, and unsupported payment methods", async (options) => {
    expect(await hasVerifiedUnrefundedPayment(paymentStripe(options), "in_first"))
      .toBe(false);
  });
});
