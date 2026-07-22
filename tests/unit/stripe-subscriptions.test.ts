import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const stripeMocks = vi.hoisted(() => ({
  retrieveCheckoutSession: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        retrieve: stripeMocks.retrieveCheckoutSession,
      },
    },
  }),
}));

function makeSubscriptionItem({
  id,
  itemType,
  planId,
  quantity,
}: {
  id: string;
  itemType: "membership" | "seat";
  planId?: string;
  quantity: number;
}) {
  return {
    id,
    deleted: false,
    quantity,
    current_period_start: 10,
    current_period_end: 20,
    price: {
      currency: "cad",
      id: `price_${id}`,
      metadata: {
        item_type: itemType,
        ...(planId ? { plan_id: planId } : {}),
      },
      recurring: { interval: itemType === "membership" ? "month" : null },
      unit_amount: itemType === "membership" ? 80000 : 1500,
    },
  };
}

function makeSubscription({
  items = [
    makeSubscriptionItem({
      id: "si_membership",
      itemType: "membership",
      planId: "roots",
      quantity: 1,
    }),
  ],
  metadata = {},
  pauseCollection,
}: {
  items?: Array<Record<string, unknown>>;
  metadata?: Record<string, string>;
  pauseCollection: Stripe.Subscription["pause_collection"];
}) {
  return {
    id: "sub_123",
    customer: "cus_123",
    status: "active",
    metadata,
    pause_collection: pauseCollection,
    items: {
      data: items,
    },
    cancel_at_period_end: false,
    canceled_at: null,
  } as unknown as Stripe.Subscription;
}

function makeSupabaseMock(existingPauseStart: string | null) {
  const subscriptionUpdates: Array<Record<string, unknown>> = [];
  const subscriptionItemMutations: Array<Record<string, unknown>> = [];

  function builder(table: string) {
    let selection = "";
    let providerItemId = "";

    const query = {
      eq: (column: string, value: unknown) => {
        if (column === "provider_item_id" && typeof value === "string") {
          providerItemId = value;
        }
        return query;
      },
      insert: (values: Record<string, unknown>) => {
        if (table === "subscription_items") {
          subscriptionItemMutations.push(values);
        }
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

        if (table === "subscription_items" && providerItemId === "existing_item") {
          return { data: { id: "existing_item_id" }, error: null };
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
        if (table === "subscription_items") {
          subscriptionItemMutations.push(values);
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
    subscriptionItemMutations,
    subscriptionUpdates,
  };
}

function makePaidSeatSupabaseMock(existingItem = false) {
  const inserts: Array<Record<string, unknown>> = [];

  function builder(table: string) {
    let providerItemId = "";
    const query = {
      eq: (column: string, value: unknown) => {
        if (column === "provider_item_id" && typeof value === "string") {
          providerItemId = value;
        }
        return query;
      },
      insert: (values: Record<string, unknown>) => {
        inserts.push(values);
        return query;
      },
      upsert: (values: Record<string, unknown>) => {
        inserts.push(values);
        return query;
      },
      maybeSingle: async () => {
        if (table === "subscriptions") {
          return {
            data: {
              id: "local_sub_123",
              organization_id: "org_123",
              provider_customer_id: "cus_123",
              status: "active",
            },
            error: null,
          };
        }

        if (table === "subscription_items" && existingItem) {
          return { data: { id: "existing_item" }, error: null };
        }

        return { data: null, error: null };
      },
      select: () => query,
      then: (resolve: (value: { error: null }) => void) =>
        Promise.resolve({ error: null }).then(resolve),
    };

    return query;
  }

  return {
    client: { from: (table: string) => builder(table) },
    inserts,
  };
}

function makePaidSeatCheckoutSession(
  overrides: Partial<Stripe.Checkout.Session> = {},
) {
  return {
    id: "cs_seat_123",
    customer: "cus_123",
    mode: "payment",
    payment_status: "paid",
    metadata: {
      item_type: "seat_purchase",
      local_subscription_id: "local_sub_123",
      organization_id: "org_123",
      seat_quantity: "2",
    },
    line_items: {
      data: [
        {
          quantity: 2,
          price: {
            type: "one_time",
            unit_amount: 1000,
            currency: "cad",
          },
        },
      ],
    },
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

describe("Stripe subscription synchronization", () => {
  beforeEach(() => {
    stripeMocks.retrieveCheckoutSession.mockReset();
  });

  it("preserves an existing pause start when a paused subscription is re-synced", async () => {
    const { syncStripeSubscription } = await import("@/lib/stripe/subscriptions");
    const existingPauseStart = "2026-06-20T12:00:00.000Z";
    const { client, subscriptionUpdates } = makeSupabaseMock(existingPauseStart);

    await syncStripeSubscription(
      client as unknown as SupabaseClient,
      makeSubscription({
        pauseCollection: { behavior: "void", resumes_at: 1_782_000_000 },
      }),
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
      makeSubscription({ pauseCollection: null }),
    );

    expect(subscriptionUpdates[0]).toMatchObject({
      pause_starts_at: null,
      pause_ends_at: null,
      status: "active",
    });
  });

  it("uses the membership item for plan and billing fields when seats are first", async () => {
    const { syncStripeSubscription } = await import("@/lib/stripe/subscriptions");
    const { client, subscriptionUpdates } = makeSupabaseMock(null);

    await syncStripeSubscription(
      client as unknown as SupabaseClient,
      makeSubscription({
        items: [
          makeSubscriptionItem({
            id: "si_seat",
            itemType: "seat",
            quantity: 2,
          }),
          makeSubscriptionItem({
            id: "si_membership",
            itemType: "membership",
            planId: "canopy",
            quantity: 1,
          }),
        ],
        pauseCollection: null,
      }),
    );

    expect(subscriptionUpdates[0]).toMatchObject({
      billing_interval: "month",
      plan_id: "canopy",
      quantity: 1,
      metadata: expect.objectContaining({
        stripe_price_id: "price_si_membership",
      }),
    });
  });

  it("falls back to subscription metadata when upgraded price metadata is missing", async () => {
    const { syncStripeSubscription } = await import("@/lib/stripe/subscriptions");
    const { client, subscriptionUpdates } = makeSupabaseMock(null);

    await syncStripeSubscription(
      client as unknown as SupabaseClient,
      makeSubscription({
        metadata: { plan_id: "canopy" },
        items: [
          {
            ...makeSubscriptionItem({
              id: "si_membership",
              itemType: "membership",
              quantity: 1,
            }),
            price: {
              currency: "cad",
              id: "price_without_plan_metadata",
              metadata: { item_type: "membership" },
              recurring: { interval: "month" },
              unit_amount: 80000,
            },
          },
        ],
        pauseCollection: null,
      }),
    );

    expect(subscriptionUpdates[0]).toMatchObject({
      plan_id: "canopy",
      metadata: expect.objectContaining({
        stripe_price_id: "price_without_plan_metadata",
      }),
    });
  });

  it("keeps zero-quantity seat items DB-safe and inactive", async () => {
    const { syncStripeSubscription } = await import("@/lib/stripe/subscriptions");
    const { client, subscriptionItemMutations } = makeSupabaseMock(null);

    await syncStripeSubscription(
      client as unknown as SupabaseClient,
      makeSubscription({
        items: [
          makeSubscriptionItem({
            id: "si_membership",
            itemType: "membership",
            planId: "roots",
            quantity: 1,
          }),
          makeSubscriptionItem({
            id: "si_zero_seat",
            itemType: "seat",
            quantity: 0,
          }),
        ],
        pauseCollection: null,
      }),
    );

    expect(subscriptionItemMutations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          active: false,
          item_type: "seat",
          provider_item_id: "si_zero_seat",
          quantity: 1,
        }),
      ]),
    );
  });

  it("records a paid one-time seat entitlement after validating the Checkout price", async () => {
    const { syncPaidSeatCheckout } = await import("@/lib/stripe/subscriptions");
    const { client, inserts } = makePaidSeatSupabaseMock();
    const session = makePaidSeatCheckoutSession();
    stripeMocks.retrieveCheckoutSession.mockResolvedValue(session);

    await syncPaidSeatCheckout(client as unknown as SupabaseClient, session);

    expect(inserts).toEqual([
      {
        active: true,
        item_type: "seat",
        provider_item_id: "seat_purchase:cs_seat_123",
        quantity: 2,
        subscription_id: "local_sub_123",
        unit_amount_cents: 1000,
        currency: "CAD",
      },
    ]);
    expect(stripeMocks.retrieveCheckoutSession).toHaveBeenCalledWith(
      "cs_seat_123",
      { expand: ["line_items.data.price"] },
    );
  });

  it("does not grant seats for an unpaid Checkout session", async () => {
    const { syncPaidSeatCheckout } = await import("@/lib/stripe/subscriptions");
    const { client, inserts } = makePaidSeatSupabaseMock();
    const session = makePaidSeatCheckoutSession({ payment_status: "unpaid" });

    await syncPaidSeatCheckout(client as unknown as SupabaseClient, session);

    expect(inserts).toHaveLength(0);
    expect(stripeMocks.retrieveCheckoutSession).not.toHaveBeenCalled();
  });

  it("rejects a paid Checkout session whose price is not the approved one-time CAD price", async () => {
    const { syncPaidSeatCheckout } = await import("@/lib/stripe/subscriptions");
    const { client, inserts } = makePaidSeatSupabaseMock();
    const session = makePaidSeatCheckoutSession();
    stripeMocks.retrieveCheckoutSession.mockResolvedValue({
      ...session,
      line_items: {
        data: [
          {
            quantity: 2,
            price: { type: "recurring", unit_amount: 1000, currency: "cad" },
          },
        ],
      },
    });

    await expect(
      syncPaidSeatCheckout(client as unknown as SupabaseClient, session),
    ).rejects.toThrow("approved price");
    expect(inserts).toHaveLength(0);
  });

  it("is idempotent when Stripe retries the paid Checkout event", async () => {
    const { syncPaidSeatCheckout } = await import("@/lib/stripe/subscriptions");
    const { client, inserts } = makePaidSeatSupabaseMock(true);
    const session = makePaidSeatCheckoutSession();
    stripeMocks.retrieveCheckoutSession.mockResolvedValue(session);

    await syncPaidSeatCheckout(client as unknown as SupabaseClient, session);

    expect(inserts).toHaveLength(0);
  });
});
