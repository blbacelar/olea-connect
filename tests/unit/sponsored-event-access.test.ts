import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  subscription: {
    status: "active",
    plan_id: "roots",
    provider: "manual",
    current_period_end: "2020-01-01T00:00:00Z",
    metadata: { funding_source: "sponsorship" },
  },
  adminFrom: vi.fn(),
  createCircleSsoToken: vi.fn(() => "signed-token"),
}));

const eventId = "00000000-0000-4000-8000-000000000101";
const organizationId = "00000000-0000-4000-8000-000000000102";
const userId = "00000000-0000-4000-8000-000000000103";

function userQuery(table: string) {
  const query = {
    select: () => query,
    eq: () => query,
    in: () => query,
    order: () => query,
    limit: () => query,
    maybeSingle: async () => ({
      data: table === "subscriptions" ? mocks.subscription
        : table === "event_registrations" ? { id: "registration", organization_id: organizationId, status: "registered" }
          : table === "organization_members" ? { organization_id: organizationId }
            : null,
      error: null,
    }),
    then: (resolve: (result: unknown) => void) => resolve({
      data: table === "organization_members" ? [{ organization_id: organizationId }] : [],
      error: null,
    }),
  };
  return query;
}

vi.mock("@/utils/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) },
    from: userQuery,
  }),
}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: () => ({ from: mocks.adminFrom }),
}));
vi.mock("@/lib/data/member-context", () => ({
  requireMemberContext: async () => ({
    member: { id: userId, email: "member@example.com", name: "Member", membershipRole: "owner" },
    organization: { id: organizationId, name: "Funded nonprofit", tier: "roots" },
  }),
}));
vi.mock("@/lib/circle/config", () => ({
  getCircleConfig: () => ({ ssoSecret: "test-secret", communityUrl: "https://circle.example" }),
}));
vi.mock("@/lib/circle/sso", () => ({
  createCircleSsoToken: mocks.createCircleSsoToken,
  buildCircleSsoUrl: () => "https://circle.example/sso?token=signed-token",
}));

describe("event URLs after a funded membership ends", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subscription = {
      status: "active",
      plan_id: "roots",
      provider: "manual",
      current_period_end: "2020-01-01T00:00:00Z",
      metadata: { funding_source: "sponsorship" },
    };
  });

  it("does not disclose a live event join URL before the expiration cron runs", async () => {
    const { GET } = await import("@/app/api/v1/events/[eventId]/join/route");
    const response = await GET(new Request(`https://example.com/api/v1/events/${eventId}/join`), {
      params: Promise.resolve({ eventId }),
    });

    expect(response.status).toBe(403);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it("does not create a recording redirect or signed URL", async () => {
    const { GET } = await import("@/app/api/v1/events/[eventId]/recording/route");
    const response = await GET(new Request(`https://example.com/api/v1/events/${eventId}/recording`), {
      params: Promise.resolve({ eventId }),
    });

    expect(response.status).toBe(403);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it("does not issue a Circle SSO token for an expired funded membership", async () => {
    const { GET } = await import("@/app/api/circle-sso/route");
    const response = await GET();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/subscription");
    expect(mocks.createCircleSsoToken).not.toHaveBeenCalled();
  });

  it.each([
    ["funded", "manual", "2099-01-01T00:00:00Z"],
    ["Stripe", "stripe", "2020-01-01T00:00:00Z"],
  ])("keeps Circle SSO available for %s active access", async (_label, provider, end) => {
    mocks.subscription.provider = provider;
    mocks.subscription.current_period_end = end;
    const { GET } = await import("@/app/api/circle-sso/route");
    const response = await GET();

    expect(response.headers.get("location")).toBe("https://circle.example/sso?token=signed-token");
    expect(mocks.createCircleSsoToken).toHaveBeenCalledTimes(1);
  });
});
