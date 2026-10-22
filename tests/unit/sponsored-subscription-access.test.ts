import { describe, expect, it } from "vitest";

import { hasCurrentSubscriptionAccess, type SubscriptionAccess } from "@/lib/billing/subscription-access";

const now = new Date("2026-10-19T12:00:00Z");
const subscription = (overrides: Partial<SubscriptionAccess> = {}): SubscriptionAccess => ({
  status: "active",
  provider: "manual",
  current_period_end: "2026-10-20T12:00:00Z",
  metadata: { funding_source: "sponsorship" },
  ...overrides,
});

describe("sponsor-funded subscription access", () => {
  it("allows the funded year before its exact expiry and denies it at expiry", () => {
    expect(hasCurrentSubscriptionAccess(subscription(), now)).toBe(true);
    expect(hasCurrentSubscriptionAccess(subscription({
      current_period_end: now.toISOString(),
    }), now)).toBe(false);
    expect(hasCurrentSubscriptionAccess(subscription({
      current_period_end: "2026-10-18T12:00:00Z",
    }), now)).toBe(false);
  });

  it("fails closed for a funded year without a valid period end", () => {
    expect(hasCurrentSubscriptionAccess(subscription({ current_period_end: null }), now)).toBe(false);
    expect(hasCurrentSubscriptionAccess(subscription({ current_period_end: "invalid" }), now)).toBe(false);
  });

  it("preserves Stripe status semantics and other manual memberships", () => {
    expect(hasCurrentSubscriptionAccess(subscription({
      provider: "stripe",
      current_period_end: "2026-10-18T12:00:00Z",
      metadata: {},
    }), now)).toBe(true);
    expect(hasCurrentSubscriptionAccess(subscription({
      provider: "stripe", status: "trialing", current_period_end: null,
    }), now)).toBe(true);
    expect(hasCurrentSubscriptionAccess(subscription({
      provider: "manual", metadata: {}, current_period_end: null,
    }), now)).toBe(true);
  });

  it("denies canceled, incomplete, and missing subscriptions", () => {
    expect(hasCurrentSubscriptionAccess(subscription({ status: "canceled" }), now)).toBe(false);
    expect(hasCurrentSubscriptionAccess(subscription({ status: "incomplete" }), now)).toBe(false);
    expect(hasCurrentSubscriptionAccess(null, now)).toBe(false);
  });
});
