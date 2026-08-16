import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  attachCheckoutSession: vi.fn(),
  createAdminClient: vi.fn(),
  createCheckoutSession: vi.fn(),
  createPublicServerClient: vi.fn(),
  getStripe: vi.fn(),
  getStripePriceId: vi.fn(() => "price_roots_annual"),
  listUsers: vi.fn(),
  prepareCheckoutRegistration: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  storeSignupConsents: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/stripe/registration", () => ({
  attachCheckoutSession: routeMocks.attachCheckoutSession,
  prepareCheckoutRegistration: routeMocks.prepareCheckoutRegistration,
  storeSignupConsents: routeMocks.storeSignupConsents,
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: routeMocks.getStripe,
  getStripePriceId: routeMocks.getStripePriceId,
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: routeMocks.createAdminClient,
  createPublicServerClient: routeMocks.createPublicServerClient,
}));

const checkoutPayload = {
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
};

function makeRequest(overrides: Record<string, unknown> = {}) {
  return new Request("https://app.test/api/stripe/checkout", {
    body: JSON.stringify({ ...checkoutPayload, ...overrides }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

function existingUser(id = "user_existing") {
  routeMocks.listUsers.mockResolvedValue({
    data: { users: [{ id, email: checkoutPayload.email }] },
    error: null,
  });
}

function noExistingUser() {
  routeMocks.listUsers.mockResolvedValue({
    data: { users: [] },
    error: null,
  });
}

describe("Stripe signup checkout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.createAdminClient.mockReturnValue({
      auth: { admin: { listUsers: routeMocks.listUsers } },
    });
    routeMocks.createPublicServerClient.mockReturnValue({
      auth: {
        signInWithPassword: routeMocks.signInWithPassword,
        signUp: routeMocks.signUp,
      },
    });
    routeMocks.getStripe.mockReturnValue({
      checkout: {
        sessions: {
          create: routeMocks.createCheckoutSession,
        },
      },
    });
    routeMocks.getStripePriceId.mockReturnValue("price_roots_annual");
    routeMocks.prepareCheckoutRegistration.mockResolvedValue({
      requestId: "request_123",
      referralCode: null,
      foundingMemberEligible: false,
      foundingDiscountIdentifier: null,
    });
    routeMocks.storeSignupConsents.mockResolvedValue(undefined);
    routeMocks.attachCheckoutSession.mockResolvedValue(undefined);
    routeMocks.createCheckoutSession.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.test/session",
    });
  });

  it("continues checkout for an existing user with matching credentials", async () => {
    existingUser();
    routeMocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: "user_existing" } },
      error: null,
    });
    const { POST } = await import("@/app/api/stripe/checkout/route");

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "https://checkout.stripe.test/session",
    });
    expect(routeMocks.prepareCheckoutRegistration).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        email: checkoutPayload.email,
        userId: "user_existing",
      }),
    );
    expect(routeMocks.signUp).not.toHaveBeenCalled();
  });

  it("continues checkout when valid credentials belong to an unconfirmed user", async () => {
    existingUser("user_unconfirmed");
    routeMocks.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { code: "email_not_confirmed" },
    });
    const { POST } = await import("@/app/api/stripe/checkout/route");

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(routeMocks.prepareCheckoutRegistration).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: "user_unconfirmed" }),
    );
  });

  it("returns a safe actionable conflict for mismatched existing-account credentials", async () => {
    existingUser();
    routeMocks.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { code: "invalid_credentials", message: "Provider details" },
    });
    const { POST } = await import("@/app/api/stripe/checkout/route");

    const response = await POST(makeRequest());
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error:
        "Unable to continue with these account details. Sign in or reset your password, then try again.",
    });
    expect(body.error).not.toContain("Provider details");
    expect(routeMocks.prepareCheckoutRegistration).not.toHaveBeenCalled();
    expect(routeMocks.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("masks unexpected existing-user authentication failures", async () => {
    existingUser();
    routeMocks.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: {
        code: "unexpected_failure",
        message: "Authentication provider internals",
      },
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { POST } = await import("@/app/api/stripe/checkout/route");

    const response = await POST(makeRequest());
    const body = (await response.json()) as {
      correlationId: string;
      error: string;
    };

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "Unable to start secure checkout.",
      correlationId: expect.any(String),
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Unable to create Stripe Checkout session",
      expect.objectContaining({
        correlationId: body.correlationId,
        stage: "sign_in_signup_user",
        errorCode: "unexpected_failure",
      }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "Authentication provider internals",
    );
    expect(routeMocks.prepareCheckoutRegistration).not.toHaveBeenCalled();
    expect(routeMocks.createCheckoutSession).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("returns the same safe conflict when signup reports a duplicate identity", async () => {
    noExistingUser();
    routeMocks.signUp.mockResolvedValue({
      data: { user: { id: "duplicate", identities: [] } },
      error: null,
    });
    const { POST } = await import("@/app/api/stripe/checkout/route");

    const response = await POST(makeRequest());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error:
        "Unable to continue with these account details. Sign in or reset your password, then try again.",
    });
    expect(routeMocks.prepareCheckoutRegistration).not.toHaveBeenCalled();
  });

  it("returns the existing validation response for a completed workspace", async () => {
    existingUser();
    routeMocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: "user_existing" } },
      error: null,
    });
    const { SignupValidationError } = await import("@/lib/signup-flow");
    routeMocks.prepareCheckoutRegistration.mockRejectedValue(
      new SignupValidationError("This account already has an active workspace."),
    );
    const { POST } = await import("@/app/api/stripe/checkout/route");

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "This account already has an active workspace.",
    });
    expect(routeMocks.createCheckoutSession).not.toHaveBeenCalled();
  });

  it.each([
    {
      stage: "initialize_signup_client",
      fail: () =>
        routeMocks.createPublicServerClient.mockImplementation(() => {
          throw new Error("Public client provider internals");
        }),
    },
    {
      stage: "initialize_auth_admin",
      fail: () =>
        routeMocks.createAdminClient.mockImplementation(() => {
          throw new Error("Admin client provider internals");
        }),
    },
    {
      stage: "lookup_signup_user",
      fail: () =>
        routeMocks.listUsers.mockRejectedValue(
          new Error("Auth lookup provider internals"),
        ),
    },
    {
      stage: "create_signup_user",
      fail: () =>
        routeMocks.signUp.mockRejectedValue(
          new Error("Auth signup provider internals"),
        ),
    },
    {
      stage: "initialize_registration_admin",
      fail: () =>
        routeMocks.createAdminClient
          .mockReturnValueOnce({
            auth: { admin: { listUsers: routeMocks.listUsers } },
          })
          .mockImplementationOnce(() => {
            throw new Error("Registration admin provider internals");
          }),
    },
    {
      stage: "prepare_registration",
      fail: () =>
        routeMocks.prepareCheckoutRegistration.mockRejectedValue(
          Object.assign(new Error("Database provider internals"), {
            code: "PGRST204",
          }),
        ),
    },
    {
      stage: "store_consents",
      fail: () =>
        routeMocks.storeSignupConsents.mockRejectedValue(
          new Error("Consent provider internals"),
        ),
    },
    {
      stage: "resolve_price",
      fail: () =>
        routeMocks.getStripePriceId.mockImplementation(() => {
          throw new Error("Stripe price provider internals");
        }),
    },
    {
      stage: "create_checkout_session",
      fail: () =>
        routeMocks.createCheckoutSession.mockRejectedValue(
          Object.assign(new Error("Stripe provider internals"), {
            code: "resource_missing",
            type: "StripeInvalidRequestError",
          }),
        ),
    },
    {
      stage: "attach_checkout_session",
      fail: () =>
        routeMocks.attachCheckoutSession.mockRejectedValue(
          new Error("Session attachment provider internals"),
        ),
    },
  ])("logs a sanitized $stage failure and masks it from the client", async ({
    stage,
    fail,
  }) => {
    noExistingUser();
    routeMocks.signUp.mockResolvedValue({
      data: { user: { id: "user_new", identities: [{ id: "identity_123" }] } },
      error: null,
    });
    fail();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { POST } = await import("@/app/api/stripe/checkout/route");

    const response = await POST(makeRequest());
    const body = (await response.json()) as {
      correlationId: string;
      error: string;
    };

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "Unable to start secure checkout.",
      correlationId: expect.any(String),
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Unable to create Stripe Checkout session",
      expect.objectContaining({
        correlationId: body.correlationId,
        stage,
        tier: "roots",
        billingCycle: "annual",
        errorName: "Error",
      }),
    );

    const serializedLog = JSON.stringify(consoleError.mock.calls);
    expect(serializedLog).not.toContain(checkoutPayload.email);
    expect(serializedLog).not.toContain(checkoutPayload.password);
    expect(serializedLog).not.toContain("provider internals");
    expect(serializedLog).not.toContain("price_roots_annual");
    consoleError.mockRestore();
  });
});
