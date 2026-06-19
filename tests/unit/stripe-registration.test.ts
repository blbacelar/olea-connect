import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const stripeMocks = vi.hoisted(() => ({
  retrieveCheckoutSession: vi.fn(),
  retrieveSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  syncStripeSubscription: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        retrieve: stripeMocks.retrieveCheckoutSession,
      },
    },
    subscriptions: {
      retrieve: stripeMocks.retrieveSubscription,
      update: stripeMocks.updateSubscription,
    },
  }),
}));

vi.mock("@/lib/stripe/subscriptions", () => ({
  syncStripeSubscription: stripeMocks.syncStripeSubscription,
}));

function makeSubscription(
  metadata: Stripe.Metadata = {
    provisioning_request_id: "req_123",
    plan_id: "seedling",
  },
) {
  return {
    id: "sub_123",
    customer: "cus_123",
    status: "active",
    metadata,
    items: {
      data: [
        {
          quantity: 1,
          price: { recurring: { interval: "month" } },
          current_period_start: 1,
          current_period_end: 2,
        },
      ],
    },
    cancel_at_period_end: false,
    canceled_at: null,
  } as unknown as Stripe.Subscription;
}

function makeSupabaseMock(
  rpcResults: Array<Record<string, unknown>>,
  checkoutSessionId = "cs_123",
) {
  const updateCalls: Array<Record<string, unknown>> = [];
  let lastSelect = "";

  const builder = {
    select: vi.fn((selection: string) => {
      lastSelect = selection;
      return builder;
    }),
    eq: vi.fn(() => builder),
    update: vi.fn((values: Record<string, unknown>) => {
      updateCalls.push(values);
      return builder;
    }),
    maybeSingle: vi.fn(async () => ({
      data: { id: "req_123", checkout_session_id: checkoutSessionId },
      error: null,
    })),
    single: vi.fn(async () => {
      if (lastSelect.includes("checkout_session_id")) {
        return {
          data: { id: "req_123", checkout_session_id: checkoutSessionId },
          error: null,
        };
      }

      if (lastSelect.includes("provider_subscription_id")) {
        return {
          data: { provider_subscription_id: "sub_123" },
          error: null,
        };
      }

      return { data: { id: "req_123" }, error: null };
    }),
  };

  return {
    client: {
      from: vi.fn(() => builder),
      rpc: vi.fn(async () => ({
        data: rpcResults.shift(),
        error: null,
      })),
    },
    updateCalls,
  };
}

describe("Stripe registration recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stripeMocks.retrieveCheckoutSession.mockResolvedValue({
      id: "cs_123",
      metadata: {
        provisioning_request_id: "req_123",
        user_id: "user_123",
        plan_id: "seedling",
        billing_cycle: "monthly",
      },
      subscription: makeSubscription(),
    });
    stripeMocks.retrieveSubscription.mockResolvedValue(makeSubscription());
    stripeMocks.updateSubscription.mockResolvedValue(makeSubscription());
  });

  it("finalizes a checkout session into a completed workspace activation", async () => {
    const { recoverCheckoutSessionProvisioning } = await import(
      "@/lib/stripe/registration"
    );
    const { client, updateCalls } = makeSupabaseMock([
      {
        status: "completed",
        request_id: "req_123",
        organization_id: "org_123",
        subscription_id: "local_sub_123",
      },
    ]);

    const result = await recoverCheckoutSessionProvisioning(
      client as unknown as SupabaseClient,
      "cs_123",
    );

    expect(result.status).toBe("completed");
    expect(stripeMocks.retrieveCheckoutSession).toHaveBeenCalledWith("cs_123", {
      expand: ["subscription"],
    });
    expect(updateCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider_customer_id: "cus_123",
          provider_subscription_id: "sub_123",
          provider_status: "active",
          payment_confirmed_at: expect.any(String),
        }),
      ]),
    );
    expect(stripeMocks.syncStripeSubscription).toHaveBeenCalled();
  });

  it("recovers a pending user activation from the saved checkout session", async () => {
    const { attemptUserWorkspaceProvisioning } = await import(
      "@/lib/stripe/registration"
    );
    const { client } = makeSupabaseMock([
      { status: "pending_payment", request_id: "req_123" },
      {
        status: "completed",
        request_id: "req_123",
        organization_id: "org_123",
        subscription_id: "local_sub_123",
      },
    ]);

    const result = await attemptUserWorkspaceProvisioning(
      client as unknown as SupabaseClient,
      "user_123",
    );

    expect(result?.status).toBe("completed");
    expect(stripeMocks.retrieveCheckoutSession).toHaveBeenCalledWith("cs_123", {
      expand: ["subscription"],
    });
  });

  it("repairs missing subscription metadata from checkout session metadata", async () => {
    const { recoverCheckoutSessionProvisioning } = await import(
      "@/lib/stripe/registration"
    );
    const subscriptionWithoutMetadata = makeSubscription({});
    stripeMocks.retrieveCheckoutSession.mockResolvedValue({
      id: "cs_123",
      metadata: {
        provisioning_request_id: "req_123",
        user_id: "user_123",
        plan_id: "seedling",
        billing_cycle: "monthly",
      },
      subscription: subscriptionWithoutMetadata,
    });
    stripeMocks.updateSubscription.mockResolvedValue(
      makeSubscription({
        provisioning_request_id: "req_123",
        user_id: "user_123",
        plan_id: "seedling",
        billing_cycle: "monthly",
      }),
    );
    const { client } = makeSupabaseMock([
      {
        status: "completed",
        request_id: "req_123",
        organization_id: "org_123",
        subscription_id: "local_sub_123",
      },
    ]);

    await recoverCheckoutSessionProvisioning(
      client as unknown as SupabaseClient,
      "cs_123",
    );

    expect(stripeMocks.updateSubscription).toHaveBeenCalledWith("sub_123", {
      metadata: {
        provisioning_request_id: "req_123",
        user_id: "user_123",
        plan_id: "seedling",
        billing_cycle: "monthly",
      },
    });
  });
});
