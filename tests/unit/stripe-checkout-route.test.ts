import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createPublicServerClient: vi.fn(),
  deleteUser: vi.fn(),
  prepareCheckoutRegistration: vi.fn(),
  signUp: vi.fn(),
  storeSignupConsents: vi.fn(),
  validateFoundingMemberCode: vi.fn(),
  validateSignupReferralCode: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/stripe/registration", () => ({
  prepareCheckoutRegistration: routeMocks.prepareCheckoutRegistration,
  storeSignupConsents: routeMocks.storeSignupConsents,
  validateFoundingMemberCode: routeMocks.validateFoundingMemberCode,
  validateSignupReferralCode: routeMocks.validateSignupReferralCode,
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
  foundingMemberCode: "",
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

function getLastErrorLog(consoleError: ReturnType<typeof vi.spyOn>) {
  const [serializedLog] = consoleError.mock.calls.at(-1) ?? [];
  expect(typeof serializedLog).toBe("string");
  return JSON.parse(String(serializedLog)) as Record<string, unknown>;
}

function mockNewSignupUser(userId = "user_new") {
  routeMocks.signUp.mockImplementation(async (input) => ({
    data: {
      user: {
        id: userId,
        identities: [{ id: "identity_123" }],
        user_metadata: {
          signup_attempt_id: input.options.data.signup_attempt_id,
        },
      },
    },
    error: null,
  }));
}

describe("Stripe signup checkout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.createAdminClient.mockReturnValue({
      auth: { admin: { deleteUser: routeMocks.deleteUser } },
    });
    routeMocks.createPublicServerClient.mockReturnValue({
      auth: {
        signUp: routeMocks.signUp,
      },
    });
    routeMocks.prepareCheckoutRegistration.mockResolvedValue({
      requestId: "request_123",
      referralCode: null,
      foundingMemberEligible: false,
      foundingDiscountIdentifier: null,
    });
    routeMocks.storeSignupConsents.mockResolvedValue(undefined);
    routeMocks.validateFoundingMemberCode.mockReturnValue(null);
    routeMocks.validateSignupReferralCode.mockResolvedValue(null);
    routeMocks.deleteUser.mockResolvedValue({ error: null });
  });

  it("records activation and returns verification guidance for a newly created signup user", async () => {
    mockNewSignupUser();
    const { POST } = await import("@/app/api/stripe/checkout/route");

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      nextPath: "/signup/success?activation=pending_verification",
      status: "verification_required",
    });
    expect(routeMocks.prepareCheckoutRegistration).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        email: checkoutPayload.email,
        userId: "user_new",
      }),
    );
    expect(routeMocks.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: checkoutPayload.email,
        password: checkoutPayload.password,
      }),
    );
  });

  it("does not test passwords before recording signup activation", async () => {
    mockNewSignupUser();
    const { POST } = await import("@/app/api/stripe/checkout/route");

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(routeMocks.createAdminClient).toHaveBeenCalledTimes(1);
    expect(routeMocks.createAdminClient.mock.invocationCallOrder[0]).toBeLessThan(
      routeMocks.prepareCheckoutRegistration.mock.invocationCallOrder[0],
    );
  });

  it("returns the same public response when signup reports a duplicate identity", async () => {
    routeMocks.signUp.mockResolvedValue({
      data: { user: { id: "duplicate", identities: [] } },
      error: null,
    });
    const { POST } = await import("@/app/api/stripe/checkout/route");

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      nextPath: "/signup/success?activation=pending_verification",
      status: "verification_required",
    });
    expect(routeMocks.prepareCheckoutRegistration).not.toHaveBeenCalled();
    expect(routeMocks.storeSignupConsents).not.toHaveBeenCalled();
  });

  it("validates referral codes before signup so account state cannot change the response", async () => {
    const { SignupValidationError } = await import("@/lib/signup-flow");
    routeMocks.validateSignupReferralCode.mockRejectedValue(
      new SignupValidationError("That referral code is invalid or expired."),
    );
    const { POST } = await import("@/app/api/stripe/checkout/route");

    const response = await POST(makeRequest({ referralCode: "OLEA-ABC123" }));

    expect(response.status).toBe(400);
    expect(routeMocks.signUp).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      code: "signup_validation",
      error: "That referral code is invalid or expired.",
    });
  });

  it("rejects an invalid founding-member code before creating an account", async () => {
    const { FoundingMemberCodeError } = await import(
      "@/lib/stripe/checkout-errors"
    );
    routeMocks.validateFoundingMemberCode.mockImplementation(() => {
      throw new FoundingMemberCodeError();
    });
    const { POST } = await import("@/app/api/stripe/checkout/route");

    const response = await POST(
      makeRequest({ foundingMemberCode: "NOT-A-FOUNDING-CODE" }),
    );

    expect(response.status).toBe(400);
    expect(routeMocks.signUp).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      code: "founding_code_invalid",
      error: "That founding-member code is invalid or expired.",
    });
  });

  it("validates an entered founding-member code before signup", async () => {
    mockNewSignupUser();
    routeMocks.validateFoundingMemberCode.mockReturnValue(
      "olea_founding_15_year_1",
    );
    const { POST } = await import("@/app/api/stripe/checkout/route");

    const response = await POST(
      makeRequest({ foundingMemberCode: "FOUNDING-TEST-CODE" }),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.validateFoundingMemberCode).toHaveBeenCalledWith(
      "FOUNDING-TEST-CODE",
    );
    expect(routeMocks.signUp).toHaveBeenCalledTimes(1);
  });

  it("removes a newly created auth user when activation persistence fails", async () => {
    mockNewSignupUser();
    routeMocks.storeSignupConsents.mockRejectedValue(new Error("write failed"));
    const { POST } = await import("@/app/api/stripe/checkout/route");

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
    expect(routeMocks.deleteUser).toHaveBeenCalledWith("user_new");
  });

  it("returns the existing validation response for a completed workspace", async () => {
    mockNewSignupUser("user_existing");
    const { SignupValidationError } = await import("@/lib/signup-flow");
    routeMocks.prepareCheckoutRegistration.mockRejectedValue(
      new SignupValidationError(
        "This account already has an active workspace.",
      ),
    );
    const { POST } = await import("@/app/api/stripe/checkout/route");

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "signup_validation",
      error: "This account already has an active workspace.",
    });
    expect(routeMocks.storeSignupConsents).not.toHaveBeenCalled();
  });

  it("never mutates or deletes a user that was not created by this request", async () => {
    routeMocks.signUp.mockResolvedValue({
      data: {
        user: {
          id: "user_existing",
          identities: [{ id: "identity_123" }],
          user_metadata: { signup_attempt_id: "another-request" },
        },
      },
      error: null,
    });
    const { POST } = await import("@/app/api/stripe/checkout/route");

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(routeMocks.prepareCheckoutRegistration).not.toHaveBeenCalled();
    expect(routeMocks.storeSignupConsents).not.toHaveBeenCalled();
    expect(routeMocks.deleteUser).not.toHaveBeenCalled();
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
      stage: "create_signup_user",
      fail: () =>
        routeMocks.signUp.mockRejectedValue(
          new Error("Auth signup provider internals"),
        ),
    },
    {
      stage: "initialize_registration_admin",
      fail: () =>
        routeMocks.createAdminClient.mockImplementationOnce(() => {
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
  ])(
    "logs a sanitized $stage failure and masks it from the client",
    async ({ stage, fail }) => {
      mockNewSignupUser();
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
        code: "checkout_unavailable",
        error: "Unable to start secure checkout.",
        correlationId: expect.any(String),
      });
      expect(getLastErrorLog(consoleError)).toEqual(
        expect.objectContaining({
          message: "Unable to create Stripe Checkout session",
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
    },
  );
});
