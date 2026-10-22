import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isLegacyTestCheckoutSession } from "@/lib/stripe/server";

describe("Stripe checkout mode recovery", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("skips only test sessions when the current key is live", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_example");

    expect(isLegacyTestCheckoutSession("cs_test_old")).toBe(true);
    expect(isLegacyTestCheckoutSession("cs_live_current")).toBe(false);
  });

  it("does not skip test sessions when the current key is test", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");

    expect(isLegacyTestCheckoutSession("cs_test_old")).toBe(false);
  });
});
