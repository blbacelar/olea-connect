import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { validateSignupReferralCode } from "@/lib/stripe/registration";

function referralDatabase({
  partner,
  trackingActive,
}: {
  partner?: { email: string; status: string };
  trackingActive?: boolean;
}) {
  const queriedTables: string[] = [];
  const supabase = {
    from(table: string) {
      queriedTables.push(table);
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({
          data: table === "referral_links"
            ? partner ? { id: "link-1", referrers: partner } : null
            : trackingActive ? { code: "OLEA-JESSICA" } : null,
          error: null,
        }),
      };
      return query;
    },
  } as unknown as SupabaseClient;
  return { supabase, queriedTables };
}

describe("tracking-only referral codes", () => {
  it("accepts Jessica's active code without looking up a commission referrer", async () => {
    const { supabase, queriedTables } = referralDatabase({ trackingActive: true });
    await expect(
      validateSignupReferralCode(supabase, "buyer@example.com", "OLEA-JESSICA"),
    ).resolves.toBeUndefined();
    expect(queriedTables).toEqual(["referral_links", "referral_tracking_codes"]);
  });

  it("rejects an inactive tracking code", async () => {
    const { supabase } = referralDatabase({ trackingActive: false });
    await expect(
      validateSignupReferralCode(supabase, "buyer@example.com", "OLEA-JESSICA"),
    ).rejects.toThrow("invalid or expired");
  });

  it("still rejects self referrals for commission-bearing codes", async () => {
    const { supabase, queriedTables } = referralDatabase({
      partner: { email: "buyer@example.com", status: "approved" },
    });
    await expect(
      validateSignupReferralCode(supabase, "buyer@example.com", "OLEA-PARTNER1"),
    ).rejects.toThrow("own referral link");
    expect(queriedTables).toEqual(["referral_links"]);
  });

  it("does not turn a suspended referrer link into a tracking code", async () => {
    const { supabase, queriedTables } = referralDatabase({
      partner: { email: "partner@example.com", status: "suspended" },
      trackingActive: true,
    });
    await expect(
      validateSignupReferralCode(supabase, "buyer@example.com", "OLEA-PARTNER1"),
    ).rejects.toThrow("invalid or expired");
    expect(queriedTables).toEqual(["referral_links"]);
  });
});
