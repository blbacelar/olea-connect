import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

function makeSubscription(
  pauseCollection: Stripe.Subscription["pause_collection"],
) {
  return {
    id: "sub_123",
    customer: "cus_123",
    status: "active",
    metadata: {},
    pause_collection: pauseCollection,
    items: {
      data: [
        {
          id: "si_membership",
          deleted: false,
          quantity: 1,
          current_period_start: 10,
          current_period_end: 20,
          price: {
            currency: "cad",
            id: "price_roots_monthly",
            metadata: { plan_id: "roots", item_type: "membership" },
            recurring: { interval: "month" },
            unit_amount: 9900,
          },
        },
      ],
    },
    cancel_at_period_end: false,
    canceled_at: null,
  } as unknown as Stripe.Subscription;
}

function makeSupabaseMock(existingPauseStart: string | null) {
  const subscriptionUpdates: Array<Record<string, unknown>> = [];

  function builder(table: string) {
    let selection = "";

    const query = {
      eq: () => query,
      insert: () => {
        return query;
      },
      maybeSingle: async () => {
        if (table === "subscriptions") {
          return {
            data: {
              id: "local_sub_123",
              metadata: {},
              pause_starts_at: existingPauseStart,
            },
            error: null,
          };
        }

        return { data: null, error: null };
      },
      not: () => query,
      select: (nextSelection = "") => {
        selection = nextSelection;
        return query;
      },
      single: async () => {
        if (table === "subscriptions" && selection === "id") {
          return { data: { id: "local_sub_123" }, error: null };
        }

        return { data: null, error: null };
      },
      then: (resolve: (value: { error: null }) => void) =>
        Promise.resolve({ error: null }).then(resolve),
      update: (values: Record<string, unknown>) => {
        if (table === "subscriptions") {
          subscriptionUpdates.push(values);
        }
        return query;
      },
    };

    return query;
  }

  return {
    client: {
      from: (table: string) => builder(table),
    },
    subscriptionUpdates,
  };
}

describe("Stripe subscription synchronization", () => {
  it("preserves an existing pause start when a paused subscription is re-synced", async () => {
    const { syncStripeSubscription } = await import("@/lib/stripe/subscriptions");
    const existingPauseStart = "2026-06-20T12:00:00.000Z";
    const { client, subscriptionUpdates } = makeSupabaseMock(existingPauseStart);

    await syncStripeSubscription(
      client as unknown as SupabaseClient,
      makeSubscription({ behavior: "void", resumes_at: 1_782_000_000 }),
    );

    expect(subscriptionUpdates[0]).toMatchObject({
      pause_starts_at: existingPauseStart,
      pause_ends_at: "2026-06-21T00:00:00.000Z",
      status: "paused",
    });
  });

  it("clears pause fields when Stripe resumes collection", async () => {
    const { syncStripeSubscription } = await import("@/lib/stripe/subscriptions");
    const { client, subscriptionUpdates } = makeSupabaseMock(
      "2026-06-20T12:00:00.000Z",
    );

    await syncStripeSubscription(
      client as unknown as SupabaseClient,
      makeSubscription(null),
    );

    expect(subscriptionUpdates[0]).toMatchObject({
      pause_starts_at: null,
      pause_ends_at: null,
      status: "active",
    });
  });
});
