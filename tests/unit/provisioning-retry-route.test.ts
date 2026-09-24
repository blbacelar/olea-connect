import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  attachCheckoutSession: vi.fn(),
  attemptUserWorkspaceProvisioning: vi.fn(),
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
  createSession: vi.fn(),
  getPostActivationPath: vi.fn(),
  getSiteUrl: vi.fn(),
  getStripePriceId: vi.fn(),
  recoverCheckoutSessionProvisioning: vi.fn(),
  reserveFoundingMember: vi.fn(),
  assertFoundingCouponConfiguration: vi.fn(),
  retrieveSession: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/stripe/registration", () => ({
  attachCheckoutSession: routeMocks.attachCheckoutSession,
  attemptUserWorkspaceProvisioning: routeMocks.attemptUserWorkspaceProvisioning,
  recoverCheckoutSessionProvisioning:
    routeMocks.recoverCheckoutSessionProvisioning,
  reserveFoundingMember: routeMocks.reserveFoundingMember,
}));
vi.mock("@/lib/stripe/founding-member", () => ({
  assertFoundingCouponConfiguration:
    routeMocks.assertFoundingCouponConfiguration,
}));
vi.mock("@/lib/stripe/server", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        create: routeMocks.createSession,
        retrieve: routeMocks.retrieveSession,
      },
    },
  }),
  getStripePriceId: routeMocks.getStripePriceId,
  isLegacyTestCheckoutSession: (id: string) => id.startsWith("cs_test_"),
}));
vi.mock("@/lib/site-metadata", () => ({ getSiteUrl: routeMocks.getSiteUrl }));
vi.mock("@/lib/onboarding/post-activation", () => ({
  getPostActivationPath: routeMocks.getPostActivationPath,
}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: routeMocks.createAdminClient,
}));
vi.mock("@/utils/supabase/server", () => ({
  createClient: routeMocks.createClient,
}));

type PendingRequestFixture = {
  id: string;
  user_id: string;
  email: string;
  plan_id: string;
  billing_interval: string;
  province_or_region: string | null;
  organization_kind: string | null;
  annual_budget_range: string | null;
  board_size_range: string | null;
  referral_code: string | null;
  founding_member_eligible: boolean | null;
  founding_discount_identifier: string | null;
  founding_member_year: number | null;
  founding_offer_requested: boolean;
  checkout_session_id: string | null;
};

const pendingRequest: PendingRequestFixture = {
  id: "10000000-0000-4000-8000-000000000001",
  user_id: "10000000-0000-4000-8000-000000000002",
  email: "owner@example.test",
  plan_id: "roots",
  billing_interval: "year",
  province_or_region: "BC",
  organization_kind: "nonprofit",
  annual_budget_range: "500k-1m",
  board_size_range: "6-10",
  referral_code: null,
  founding_member_eligible: false,
  founding_discount_identifier: null,
  founding_member_year: null,
  founding_offer_requested: false,
  checkout_session_id: null,
};

function provisioningRequestQuery(data: PendingRequestFixture = pendingRequest) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  return query;
}

describe("provisioning retry route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const query = provisioningRequestQuery();
    routeMocks.createAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue(query),
    });
    routeMocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: pendingRequest.user_id } },
        }),
      },
    });
    routeMocks.attemptUserWorkspaceProvisioning.mockResolvedValue({
      request_id: pendingRequest.id,
      status: "pending_payment",
    });
    routeMocks.getSiteUrl.mockReturnValue("https://staging.oleaconnects.com");
    routeMocks.getStripePriceId.mockReturnValue("price_roots_annual");
    routeMocks.createSession.mockResolvedValue({
      id: "cs_new",
      status: "open",
      url: "https://checkout.stripe.com/c/pay/cs_new",
    });
    routeMocks.attachCheckoutSession.mockResolvedValue(undefined);
    routeMocks.assertFoundingCouponConfiguration.mockResolvedValue(
      "olea_founding_15_year_1",
    );
    routeMocks.reserveFoundingMember.mockResolvedValue({
      foundingDiscountIdentifier: "olea_founding_15_year_1",
      foundingMemberEligible: true,
      referralCode: null,
      requestId: pendingRequest.id,
    });
    routeMocks.getPostActivationPath.mockResolvedValue("/dashboard");
  });

  it("uses a stable idempotency key when creating the first checkout", async () => {
    const { POST } = await import("@/app/api/provisioning/retry/route");

    const response = await POST(
      new Request("https://attacker.invalid/api/provisioning/retry", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url:
          "https://staging.oleaconnects.com/signup/success?session_id={CHECKOUT_SESSION_ID}",
        allow_promotion_codes: true,
      }),
      {
        idempotencyKey: `signup-checkout:${pendingRequest.id}:initial`,
      },
    );
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        checkoutUrl: "https://checkout.stripe.com/c/pay/cs_new",
        status: "pending_payment",
      }),
    );
  });

  it("recovers a completed checkout instead of creating another session", async () => {
    const requestWithSession = {
      ...pendingRequest,
      checkout_session_id: "cs_complete",
    };
    const query = provisioningRequestQuery(requestWithSession);
    routeMocks.createAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue(query),
    });
    routeMocks.retrieveSession.mockResolvedValue({ status: "complete" });
    routeMocks.recoverCheckoutSessionProvisioning.mockResolvedValue({
      organization_id: "10000000-0000-4000-8000-000000000003",
      request_id: pendingRequest.id,
      status: "completed",
      subscription_id: "10000000-0000-4000-8000-000000000004",
    });
    const { POST } = await import("@/app/api/provisioning/retry/route");

    const response = await POST(
      new Request("https://staging.oleaconnects.com/api/provisioning/retry", {
        method: "POST",
      }),
    );

    expect(routeMocks.createSession).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ nextPath: "/dashboard", status: "completed" }),
    );
  });

  it("reserves and applies a founding discount only when verified checkout starts", async () => {
    const foundingRequest = {
      ...pendingRequest,
      founding_offer_requested: true,
    };
    const query = provisioningRequestQuery(foundingRequest);
    routeMocks.createAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue(query),
    });
    const { POST } = await import("@/app/api/provisioning/retry/route");

    const response = await POST(
      new Request("https://staging.oleaconnects.com/api/provisioning/retry", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.reserveFoundingMember).toHaveBeenCalledWith(
      expect.anything(),
      foundingRequest.id,
      "olea_founding_15_year_1",
      null,
    );
    expect(routeMocks.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        discounts: [{ coupon: "olea_founding_15_year_1" }],
        expires_at: expect.any(Number),
      }),
      expect.anything(),
    );
    expect(routeMocks.createSession.mock.calls[0][0]).not.toHaveProperty(
      "allow_promotion_codes",
    );
  });

  it("does not create a replacement when Stripe retrieval fails", async () => {
    const query = provisioningRequestQuery({
      ...pendingRequest,
      checkout_session_id: "cs_existing",
    });
    routeMocks.createAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue(query),
    });
    routeMocks.retrieveSession.mockRejectedValue(new Error("temporary outage"));
    const { POST } = await import("@/app/api/provisioning/retry/route");

    const response = await POST(
      new Request("https://staging.oleaconnects.com/api/provisioning/retry", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(500);
    expect(routeMocks.createSession).not.toHaveBeenCalled();
  });

  it("replaces a test-mode checkout after switching Stripe modes", async () => {
    const query = provisioningRequestQuery({
      ...pendingRequest,
      checkout_session_id: "cs_test_old",
    });
    routeMocks.createAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue(query),
    });
    const { POST } = await import("@/app/api/provisioning/retry/route");

    const response = await POST(
      new Request("https://oleaconnects.com/api/provisioning/retry", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.createSession).toHaveBeenCalledWith(
      expect.anything(),
      { idempotencyKey: `signup-checkout:${pendingRequest.id}:cs_test_old` },
    );
    expect(routeMocks.attachCheckoutSession).toHaveBeenCalledWith(
      expect.anything(),
      pendingRequest.id,
      "cs_new",
    );
    expect(routeMocks.retrieveSession).not.toHaveBeenCalled();
  });
});
