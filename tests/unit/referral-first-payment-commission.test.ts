import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { invoiceList } = vi.hoisted(() => ({ invoiceList: vi.fn() }));
vi.mock("@/lib/stripe/server", () => ({
  getStripe: () => ({ invoices: { list: invoiceList } }),
}));

import {
  firstMembershipPaymentInvoice,
  firstPaymentCommissionCents,
  recordFirstPaymentReferralCommission,
} from "@/lib/referrals/first-payment-commission";

function invoice(
  id: string,
  amountPaid: number,
  created: number,
  options: Partial<Stripe.Invoice> = {},
): Stripe.Invoice {
  return {
    id,
    amount_paid: amountPaid,
    billing_reason: "subscription_create",
    created,
    currency: "cad",
    status: "paid",
    ...options,
  } as Stripe.Invoice;
}

function referralDatabase() {
  const payouts: Record<string, unknown>[] = [];
  const upsert = vi.fn(async (row: Record<string, unknown>) => {
    if (!payouts.some((payout) => payout.referral_id === row.referral_id && payout.milestone === row.milestone)) {
      payouts.push(row);
    }
    return { error: null };
  });
  const rows: Record<string, Record<string, unknown> | null> = {
    workspace_provisioning_requests: { id: "request-1" },
    referrals: { id: "referral-1", status: "subscription_started", referred_organization_id: "org-1" },
  };
  const supabase = {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const included: Record<string, unknown[]> = {};
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          filters[column] = value;
          return query;
        },
        in: (column: string, values: unknown[]) => {
          included[column] = values;
          return query;
        },
        limit: () => query,
        maybeSingle: async () => ({
          data: table === "referral_payouts"
            ? payouts.find((payout) =>
                Object.entries(filters).every(([column, value]) => payout[column] === value) &&
                Object.entries(included).every(([column, values]) => values.includes(payout[column])),
              ) ?? null
            : rows[table],
          error: null,
        }),
        upsert,
      };
      return query;
    },
  } as unknown as SupabaseClient;
  return {
    supabase,
    upsert,
    rows,
    seedPayout: (row: Record<string, unknown>) => { payouts.push(row); },
  };
}

describe("first-payment referral commission", () => {
  beforeEach(() => invoiceList.mockReset());

  it.each([
    ["quarterly", 80_000, 8_000],
    ["annual", 320_000, 32_000],
    ["discounted annual", 816_000, 50_000],
  ])("awards 10%% once for a %s invoice", async (_label, amountPaid, expected) => {
    const { supabase, upsert } = referralDatabase();
    invoiceList.mockReturnValue({
      autoPagingToArray: async () => [invoice("in_first123", amountPaid, 100)],
    });

    await recordFirstPaymentReferralCommission(supabase, "sub_123");
    await recordFirstPaymentReferralCommission(supabase, "sub_123");

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        milestone: "first_payment",
        source_invoice_id: "in_first123",
        purchase_amount_cents: amountPaid,
        amount_cents: expected,
        status: "pending",
      }),
      expect.objectContaining({ ignoreDuplicates: true }),
    );
  });

  it("does not create a payout for an unpaid signup or demo", async () => {
    const { supabase, upsert } = referralDatabase();
    invoiceList.mockReturnValue({ autoPagingToArray: async () => [] });
    await recordFirstPaymentReferralCommission(supabase, "sub_123");
    expect(upsert).not.toHaveBeenCalled();
  });

  it("does not award another referrer for the same organization", async () => {
    const { supabase, seedPayout, upsert } = referralDatabase();
    seedPayout({ referral_id: "other-referral", referred_organization_id: "org-1", milestone: "first_payment" });
    await recordFirstPaymentReferralCommission(supabase, "sub_123");
    expect(invoiceList).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("does not award a second commission after a paid legacy reward", async () => {
    const { supabase, seedPayout, upsert } = referralDatabase();
    seedPayout({ referral_id: "referral-1", milestone: "demo_attended", status: "paid" });
    await recordFirstPaymentReferralCommission(supabase, "sub_123");
    expect(invoiceList).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("ignores prorations and later renewals when finding the first payment", () => {
    const first = invoice("in_first123", 80_000, 100);
    expect(firstMembershipPaymentInvoice([
      invoice("in_renewal123", 80_000, 200, { billing_reason: "subscription_cycle" }),
      invoice("in_change123", 5_000, 150, { billing_reason: "subscription_update" }),
      first,
    ])?.id).toBe(first.id);
  });

  it("waits past a free trial invoice for the first positive payment", () => {
    expect(firstMembershipPaymentInvoice([
      invoice("in_trial123", 0, 100),
      invoice("in_firstpaid123", 80_000, 200, { billing_reason: "subscription_cycle" }),
    ])?.id).toBe("in_firstpaid123");
  });

  it("rejects nonpositive and noninteger amounts", () => {
    expect(() => firstPaymentCommissionCents(0)).toThrow();
    expect(() => firstPaymentCommissionCents(10.5)).toThrow();
  });
});
