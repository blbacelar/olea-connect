import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isSuperseded: vi.fn(),
  syncSubscription: vi.fn(),
  recordSubscription: vi.fn(),
  enqueueIntegrationSyncs: vi.fn(),
  enqueueCircleMemberSync: vi.fn(),
  logInfo: vi.fn(),
  webhookUpdates: [] as Array<Record<string, unknown>>,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: async () => ({ data: true, error: null }),
    from: () => {
      const query = {
        update: (values: Record<string, unknown>) => {
          mocks.webhookUpdates.push(values);
          return query;
        },
        eq: () => query,
        then: (resolve: (value: { error: null }) => void) => Promise.resolve({ error: null }).then(resolve),
      };
      return query;
    },
  }),
}));
vi.mock("@/lib/stripe/server", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/stripe/subscriptions", () => ({
  isSupersededStripeSubscription: mocks.isSuperseded,
  syncStripeSubscription: mocks.syncSubscription,
  syncPaidSeatCheckout: vi.fn(),
}));
vi.mock("@/lib/stripe/registration", () => ({
  recordStripeSubscription: mocks.recordSubscription,
  attemptWorkspaceProvisioning: vi.fn(),
}));
vi.mock("@/lib/circle/provisioning", () => ({
  buildCircleProvisioningPayload: vi.fn(),
  enqueueCircleMemberSync: mocks.enqueueCircleMemberSync,
}));
vi.mock("@/lib/integrations/subscription-sync", () => ({
  enqueueSubscriptionIntegrationSyncs: mocks.enqueueIntegrationSyncs,
}));
vi.mock("@/lib/referrals/first-payment-commission", () => ({
  recordFirstPaymentReferralCommission: vi.fn(),
}));
vi.mock("@/lib/observability/logger", () => ({
  logInfo: mocks.logInfo,
  logCritical: vi.fn(),
}));

describe("superseded Stripe webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.webhookUpdates.length = 0;
  });

  it("marks a delayed event processed without restoring the old plan or sending integration work", async () => {
    const { processStripeWebhookEvent } = await import("@/app/api/stripe/webhook/webhook-processing");
    mocks.isSuperseded.mockResolvedValue(true);
    const event = {
      id: "evt_old_harvest",
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_old_harvest", metadata: { organization_id: "org_123" } } },
    } as unknown as Stripe.Event;

    await expect(processStripeWebhookEvent(event, {} as Parameters<typeof processStripeWebhookEvent>[1]))
      .resolves.toEqual({ duplicate: false });

    expect(mocks.isSuperseded).toHaveBeenCalledOnce();
    expect(mocks.recordSubscription).not.toHaveBeenCalled();
    expect(mocks.syncSubscription).not.toHaveBeenCalled();
    expect(mocks.enqueueIntegrationSyncs).not.toHaveBeenCalled();
    expect(mocks.enqueueCircleMemberSync).not.toHaveBeenCalled();
    expect(mocks.webhookUpdates).toEqual([
      expect.objectContaining({ processed_at: expect.any(String), processing_error: null }),
    ]);
  });
});
