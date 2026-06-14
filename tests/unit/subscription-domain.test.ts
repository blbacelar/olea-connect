import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import {
  getPlanId,
  mapSubscriptionStatus,
  toIsoDate,
} from "@/lib/stripe/subscription-domain";

function subscription(
  status: Stripe.Subscription.Status,
  pauseCollection: Stripe.Subscription["pause_collection"] = null,
) {
  return {
    status,
    pause_collection: pauseCollection,
  } as Stripe.Subscription;
}

describe("Stripe subscription domain", () => {
  it("maps paused and terminal Stripe states to local access states", () => {
    expect(mapSubscriptionStatus(subscription("active"))).toBe("active");
    expect(mapSubscriptionStatus(subscription("incomplete_expired"))).toBe(
      "canceled",
    );
    expect(
      mapSubscriptionStatus(
        subscription("active", { behavior: "void", resumes_at: null }),
      ),
    ).toBe("paused");
  });

  it("resolves plan metadata using supported aliases", () => {
    const item = {
      price: { metadata: { olea_plan: "canopy" } },
    } as unknown as Stripe.SubscriptionItem;

    expect(getPlanId(item)).toBe("canopy");
    expect(getPlanId(undefined)).toBeNull();
  });

  it("converts Stripe timestamps to ISO dates", () => {
    expect(toIsoDate(0)).toBeNull();
    expect(toIsoDate(1)).toBe("1970-01-01T00:00:01.000Z");
  });
});
