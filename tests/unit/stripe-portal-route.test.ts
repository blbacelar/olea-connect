import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  billingSummary: vi.fn(),
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
  createPortalSession: vi.fn(),
  getBillingPortalConfigurationId: vi.fn(),
  getStripePriceId: vi.fn(
    (tier: string, cycle: string) => `price_${tier}_${cycle}`,
  ),
  getStripeSeatPriceIdForInterval: vi.fn(() => "price_seat"),
  stripeSubscriptionRetrieve: vi.fn(),
  stripeSubscriptionUpdate: vi.fn(),
  syncStripeSubscription: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/billing/server", () => ({
  getBillingSummary: routeMocks.billingSummary,
}));

vi.mock("@/lib/stripe/server", () => ({
  getBillingPortalConfigurationId: routeMocks.getBillingPortalConfigurationId,
  getStripePriceId: routeMocks.getStripePriceId,
  getStripeSeatPriceIdForInterval: routeMocks.getStripeSeatPriceIdForInterval,
  getStripe: () => ({
    billingPortal: {
      sessions: {
        create: routeMocks.createPortalSession,
      },
    },
    subscriptions: {
      retrieve: routeMocks.stripeSubscriptionRetrieve,
      update: routeMocks.stripeSubscriptionUpdate,
    },
  }),
}));

vi.mock("@/lib/stripe/subscriptions", () => ({
  syncStripeSubscription: routeMocks.syncStripeSubscription,
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: routeMocks.createAdminClient,
}));

function makeBillingSummary(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    billingInterval: "month",
    cancelAtPeriodEnd: false,
    canceledAt: null,
    currentPeriodEnd: "2026-07-21T00:00:00.000Z",
    currentPeriodStart: "2026-06-21T00:00:00.000Z",
    customerId: "cus_123",
    localSubscriptionId: "local_sub_123",
    organizationId: "org_123",
    organizationName: "Olea",
    paymentMethod: null,
    planId: "roots",
    planName: "Roots",
    role: "admin",
    status: "active",
    subscriptionId: "sub_123",
    ...overrides,
  };
}

function makeSubscription(
  overrides: Partial<Stripe.Subscription> = {},
) {
  return {
    id: "sub_123",
    customer: "cus_123",
    status: "active",
    metadata: { local_subscription_id: "local_sub_123" },
    pause_collection: null,
    items: { data: [] },
    cancel_at_period_end: false,
    canceled_at: null,
    ...overrides,
  } as unknown as Stripe.Subscription;
}

function makeRequest(body: Record<string, unknown>, origin = "https://app.test") {
  return new Request(`${origin}/api/stripe/portal`, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
    },
    method: "POST",
  });
}

describe("Stripe billing portal route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.billingSummary.mockResolvedValue(makeBillingSummary());
    routeMocks.createPortalSession.mockResolvedValue({
      url: "https://billing.stripe.test/session",
    });
    routeMocks.getBillingPortalConfigurationId.mockResolvedValue("bpc_123");
    routeMocks.getStripePriceId.mockImplementation(
      (tier: string, cycle: string) => `price_${tier}_${cycle}`,
    );
    routeMocks.getStripeSeatPriceIdForInterval.mockReturnValue("price_seat");
    routeMocks.stripeSubscriptionRetrieve.mockResolvedValue(
      makeSubscription({
        items: {
          data: [
            {
              id: "si_seat",
              price: { id: "price_seat" },
              quantity: 1,
            },
          ],
        } as unknown as Stripe.ApiList<Stripe.SubscriptionItem>,
      }),
    );
    routeMocks.stripeSubscriptionUpdate.mockResolvedValue(makeSubscription());
    routeMocks.syncStripeSubscription.mockResolvedValue("local_sub_123");
  });

  it("rejects cross-origin billing requests", async () => {
    const { POST } = await import("@/app/api/stripe/portal/route");
    const response = await POST(
      new Request("https://app.test/api/stripe/portal", {
        body: JSON.stringify({ action: "pause", pauseDays: 30 }),
        headers: {
          "Content-Type": "application/json",
          Origin: "https://evil.test",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
    expect(routeMocks.billingSummary).not.toHaveBeenCalled();
  });

  it("rejects non-admin billing actions", async () => {
    const { POST } = await import("@/app/api/stripe/portal/route");
    routeMocks.billingSummary.mockResolvedValue(
      makeBillingSummary({ role: "member" }),
    );

    const response = await POST(makeRequest({ action: "pause", pauseDays: 30 }));

    expect(response.status).toBe(403);
    expect(routeMocks.stripeSubscriptionUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid pause lengths", async () => {
    const { POST } = await import("@/app/api/stripe/portal/route");

    const response = await POST(makeRequest({ action: "pause", pauseDays: 61 }));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain("between 1 and 60 days");
    expect(routeMocks.stripeSubscriptionUpdate).not.toHaveBeenCalled();
  });

  it("guards pause and resume by subscription state", async () => {
    const { POST } = await import("@/app/api/stripe/portal/route");
    routeMocks.billingSummary.mockResolvedValue(
      makeBillingSummary({ status: "canceled" }),
    );

    const pauseResponse = await POST(
      makeRequest({ action: "pause", pauseDays: 30 }),
    );

    routeMocks.billingSummary.mockResolvedValue(
      makeBillingSummary({ status: "active" }),
    );
    const resumeResponse = await POST(makeRequest({ action: "resume" }));

    expect(pauseResponse.status).toBe(409);
    expect(resumeResponse.status).toBe(409);
    expect(routeMocks.stripeSubscriptionUpdate).not.toHaveBeenCalled();
  });

  it("opens the general portal for plan and seat updates", async () => {
    const { POST } = await import("@/app/api/stripe/portal/route");

    const response = await POST(makeRequest({ action: "subscription_update" }));

    expect(response.status).toBe(200);
    expect(routeMocks.createPortalSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_123",
        flow_data: undefined,
      }),
    );
  });

  it("still returns success when Stripe pause succeeds but local sync is delayed", async () => {
    const { POST } = await import("@/app/api/stripe/portal/route");
    routeMocks.stripeSubscriptionUpdate.mockResolvedValue(
      makeSubscription({
        pause_collection: { behavior: "void", resumes_at: 1_782_000_000 },
      }),
    );
    routeMocks.syncStripeSubscription.mockRejectedValue(new Error("sync failed"));

    const response = await POST(makeRequest({ action: "pause", pauseDays: 30 }));

    expect(response.status).toBe(200);
    expect(routeMocks.stripeSubscriptionUpdate).toHaveBeenCalledWith("sub_123", {
      pause_collection: expect.objectContaining({
        behavior: "void",
        resumes_at: expect.any(Number),
      }),
    });
    expect(routeMocks.syncStripeSubscription).toHaveBeenCalled();
  });

  it("adds one paid seat through the Stripe seat add-on price", async () => {
    const { POST } = await import("@/app/api/stripe/portal/route");

    const response = await POST(
      makeRequest({
        action: "add_seat",
        idempotencyKey: "seat_1234567890abcdef",
      }),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.getStripeSeatPriceIdForInterval).toHaveBeenCalledWith(
      "month",
    );
    expect(routeMocks.stripeSubscriptionRetrieve).toHaveBeenCalledWith(
      "sub_123",
      { expand: ["items.data.price"] },
    );
    expect(routeMocks.stripeSubscriptionUpdate).toHaveBeenCalledWith(
      "sub_123",
      {
        items: [{ id: "si_seat", quantity: 2 }],
        proration_behavior: "always_invoice",
      },
      { idempotencyKey: "seat_1234567890abcdef" },
    );
    expect(routeMocks.syncStripeSubscription).toHaveBeenCalled();
  });

  it("upgrades the membership item to a higher quarterly plan", async () => {
    const { POST } = await import("@/app/api/stripe/portal/route");
    routeMocks.stripeSubscriptionRetrieve.mockResolvedValue(
      makeSubscription({
        metadata: { local_subscription_id: "local_sub_123", plan_id: "roots" },
        items: {
          data: [
            {
              id: "si_membership",
              price: {
                id: "price_roots_quarterly",
                metadata: { item_type: "membership", plan_id: "roots" },
              },
              quantity: 1,
            },
            {
              id: "si_seat",
              price: { id: "price_seat", metadata: { item_type: "seat" } },
              quantity: 3,
            },
          ],
        } as unknown as Stripe.ApiList<Stripe.SubscriptionItem>,
      }),
    );

    const response = await POST(
      makeRequest({
        action: "change_plan",
        idempotencyKey: "plan_upgrade123456",
        targetPlanId: "canopy",
      }),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.getStripePriceId).toHaveBeenCalledWith(
      "canopy",
      "quarterly",
    );
    expect(routeMocks.stripeSubscriptionUpdate).toHaveBeenCalledWith(
      "sub_123",
      {
        items: [
          {
            id: "si_membership",
            price: "price_canopy_quarterly",
            quantity: 1,
          },
        ],
        metadata: {
          local_subscription_id: "local_sub_123",
          plan_id: "canopy",
        },
        proration_behavior: "always_invoice",
      },
      { idempotencyKey: "plan_upgrade123456" },
    );
    expect(routeMocks.syncStripeSubscription).toHaveBeenCalled();
  });

  it("uses the annual Stripe price when upgrading an annual membership", async () => {
    const { POST } = await import("@/app/api/stripe/portal/route");
    routeMocks.billingSummary.mockResolvedValue(
      makeBillingSummary({ billingInterval: "year", planId: "seedling" }),
    );
    routeMocks.stripeSubscriptionRetrieve.mockResolvedValue(
      makeSubscription({
        items: {
          data: [
            {
              id: "si_membership",
              price: {
                id: "price_seedling_annual",
                metadata: { plan_id: "seedling" },
              },
              quantity: 1,
            },
          ],
        } as unknown as Stripe.ApiList<Stripe.SubscriptionItem>,
      }),
    );

    const response = await POST(
      makeRequest({
        action: "change_plan",
        idempotencyKey: "plan_annual123456",
        targetPlanId: "roots",
      }),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.getStripePriceId).toHaveBeenCalledWith("roots", "annual");
    expect(routeMocks.stripeSubscriptionUpdate).toHaveBeenCalledWith(
      "sub_123",
      expect.objectContaining({
        items: [
          {
            id: "si_membership",
            price: "price_roots_annual",
            quantity: 1,
          },
        ],
      }),
      { idempotencyKey: "plan_annual123456" },
    );
  });

  it("rejects same-plan or downgrade plan changes", async () => {
    const { POST } = await import("@/app/api/stripe/portal/route");

    const samePlanResponse = await POST(
      makeRequest({
        action: "change_plan",
        idempotencyKey: "plan_same1234567",
        targetPlanId: "roots",
      }),
    );
    const downgradeResponse = await POST(
      makeRequest({
        action: "change_plan",
        idempotencyKey: "plan_down1234567",
        targetPlanId: "seedling",
      }),
    );

    expect(samePlanResponse.status).toBe(409);
    expect(downgradeResponse.status).toBe(409);
    expect(routeMocks.stripeSubscriptionUpdate).not.toHaveBeenCalled();
  });

  it("rejects plan upgrades when cancellation is already scheduled", async () => {
    const { POST } = await import("@/app/api/stripe/portal/route");
    routeMocks.billingSummary.mockResolvedValue(
      makeBillingSummary({ cancelAtPeriodEnd: true }),
    );

    const response = await POST(
      makeRequest({
        action: "change_plan",
        idempotencyKey: "plan_cancel123456",
        targetPlanId: "canopy",
      }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(409);
    expect(body.error).toContain("scheduled cancellation");
    expect(routeMocks.stripeSubscriptionUpdate).not.toHaveBeenCalled();
  });

  it("returns pending sync when a plan upgrade succeeds in Stripe but local sync fails", async () => {
    const { POST } = await import("@/app/api/stripe/portal/route");
    routeMocks.syncStripeSubscription.mockRejectedValue(new Error("sync failed"));

    const response = await POST(
      makeRequest({
        action: "change_plan",
        idempotencyKey: "plan_pending123456",
        targetPlanId: "canopy",
      }),
    );
    const body = (await response.json()) as {
      message: string;
      pendingSync: boolean;
    };

    expect(response.status).toBe(202);
    expect(body.pendingSync).toBe(true);
    expect(body.message).toContain("plan upgrade");
  });

  it("uses the annual seat price for annual memberships", async () => {
    const { POST } = await import("@/app/api/stripe/portal/route");
    routeMocks.billingSummary.mockResolvedValue(
      makeBillingSummary({ billingInterval: "year" }),
    );
    routeMocks.getStripeSeatPriceIdForInterval.mockReturnValue(
      "price_seat_yearly",
    );
    routeMocks.stripeSubscriptionRetrieve.mockResolvedValue(
      makeSubscription({
        items: {
          data: [],
        } as unknown as Stripe.ApiList<Stripe.SubscriptionItem>,
      }),
    );

    const response = await POST(
      makeRequest({
        action: "add_seat",
        idempotencyKey: "seat_annual123456789",
        seatQuantity: 1,
      }),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.getStripeSeatPriceIdForInterval).toHaveBeenCalledWith(
      "year",
    );
    expect(routeMocks.stripeSubscriptionUpdate).toHaveBeenCalledWith(
      "sub_123",
      {
        items: [{ price: "price_seat_yearly", quantity: 1 }],
        proration_behavior: "always_invoice",
      },
      { idempotencyKey: "seat_annual123456789" },
    );
  });

  it("adds multiple paid seats through the Stripe seat add-on price", async () => {
    const { POST } = await import("@/app/api/stripe/portal/route");

    const response = await POST(
      makeRequest({
        action: "add_seat",
        idempotencyKey: "seat_multi123456789",
        seatQuantity: 3,
      }),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.stripeSubscriptionUpdate).toHaveBeenCalledWith(
      "sub_123",
      {
        items: [{ id: "si_seat", quantity: 4 }],
        proration_behavior: "always_invoice",
      },
      { idempotencyKey: "seat_multi123456789" },
    );
  });

  it("rejects paid seat requests without an idempotency key", async () => {
    const { POST } = await import("@/app/api/stripe/portal/route");

    const response = await POST(
      makeRequest({ action: "add_seat", seatQuantity: 1 }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain("idempotency key is required");
    expect(routeMocks.stripeSubscriptionUpdate).not.toHaveBeenCalled();
  });

  it("rejects paid seat quantities outside the supported range", async () => {
    const { POST } = await import("@/app/api/stripe/portal/route");

    const response = await POST(
      makeRequest({
        action: "add_seat",
        idempotencyKey: "seat_invalid123456",
        seatQuantity: 4,
      }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toContain("between 1 and 3");
    expect(routeMocks.stripeSubscriptionUpdate).not.toHaveBeenCalled();
  });

  it("creates the seat add-on item when none exists yet", async () => {
    const { POST } = await import("@/app/api/stripe/portal/route");
    routeMocks.stripeSubscriptionRetrieve.mockResolvedValue(
      makeSubscription({
        items: {
          data: [],
        } as unknown as Stripe.ApiList<Stripe.SubscriptionItem>,
      }),
    );

    const response = await POST(
      makeRequest({
        action: "add_seat",
        idempotencyKey: "seat_create123456",
        seatQuantity: 2,
      }),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.stripeSubscriptionUpdate).toHaveBeenCalledWith(
      "sub_123",
      {
        items: [{ price: "price_seat", quantity: 2 }],
        proration_behavior: "always_invoice",
      },
      { idempotencyKey: "seat_create123456" },
    );
  });

  it("returns pending sync when a seat update succeeds in Stripe but local sync fails", async () => {
    const { POST } = await import("@/app/api/stripe/portal/route");
    routeMocks.syncStripeSubscription.mockRejectedValue(new Error("sync failed"));

    const response = await POST(
      makeRequest({
        action: "add_seat",
        idempotencyKey: "seat_pending123456",
        seatQuantity: 1,
      }),
    );
    const body = (await response.json()) as {
      message: string;
      pendingSync: boolean;
    };

    expect(response.status).toBe(202);
    expect(body.pendingSync).toBe(true);
    expect(body.message).toContain("local access is still syncing");
  });
});
