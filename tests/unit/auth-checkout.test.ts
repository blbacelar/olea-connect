import { afterEach, describe, expect, it, vi } from "vitest";

import { startStripeCheckout } from "@/lib/auth";
import type { RegistrationState } from "@/lib/types";

const registration = {
  email: "owner@example.test",
  password: "SecurePassword123!",
  fullName: "Organization Owner",
  organizationName: "Community Organization",
  province: "BC",
  organizationKind: "nonprofit",
  annualBudgetRange: "500k-1m",
  boardSizeRange: "6-10",
  phone: "",
  acquisitionSource: "",
  referralCode: "",
  consents: {
    terms: true,
    privacy: true,
    dataOwnership: true,
    confidentiality: true,
  },
  tier: "roots",
  billingCycle: "annual",
} as RegistrationState;

describe("startStripeCheckout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("includes the safe correlation reference in checkout failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "Unable to start secure checkout.",
            correlationId: "checkout-reference-123",
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 500,
          },
        ),
      ),
    );

    await expect(startStripeCheckout(registration)).rejects.toThrow(
      "Unable to start secure checkout. Reference: checkout-reference-123",
    );
  });

  it("preserves checkout errors that do not have a correlation reference", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Review the form and try again." }), {
          headers: { "Content-Type": "application/json" },
          status: 400,
        }),
      ),
    );

    await expect(startStripeCheckout(registration)).rejects.toThrow(
      "Review the form and try again.",
    );
  });
});
