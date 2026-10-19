import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mocks = vi.hoisted(() => ({
  requireMemberContext: vi.fn(),
  insertApplication: vi.fn(),
  subscription: {
    status: "active",
    provider: "manual",
    current_period_end: "2020-01-01T00:00:00Z",
    metadata: { funding_source: "sponsorship" },
  },
}));

vi.mock("@/lib/data/member-context", () => ({
  requireMemberContext: mocks.requireMemberContext,
}));

function queryFor(table: string) {
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    limit: () => query,
    insert: (values: unknown) => {
      mocks.insertApplication(values);
      return query;
    },
    maybeSingle: async () => ({
      data: table === "subscriptions" ? mocks.subscription : null,
      error: null,
    }),
    single: async () => ({
      data: table === "grant_rounds" ? {
        id: "round-id",
        status: "open",
        opens_at: "2020-01-01T00:00:00Z",
        closes_at: "2099-01-01T00:00:00Z",
        award_amount_cents: 100_000,
        budget_cents: 1_000_000,
      } : table === "organizations" ? {
        country_code: "CA",
        registration_number: "123456789",
        charity_number: null,
        annual_revenue_cents: 25_000_000,
        cra_good_standing: true,
      } : { id: "application-id" },
      error: null,
    }),
  };
  return query;
}

vi.mock("@/utils/supabase/server", () => ({
  createClient: async () => ({ from: queryFor }),
}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { saveGrantApplicationFromForm } from "@/app/grants/grant-application-action";

function grantForm() {
  const form = new FormData();
  form.set("intent", "draft");
  form.set("roundId", "round-id");
  form.set("annualRevenue", "250000");
  form.set("craGoodStanding", "true");
  form.set("registeredInCanada", "true");
  form.set("focusArea", "governance_strengthening");
  form.set("requestedAmount", "500");
  form.set("fundingRequest", "Board governance support");
  form.set("expectedOutcome", "The board will review its governance practices.");
  return form;
}

describe("grant application funded membership access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireMemberContext.mockResolvedValue({
      member: { id: "member-id" },
      organization: { id: "organization-id" },
    });
    mocks.subscription = {
      status: "active",
      provider: "manual",
      current_period_end: "2020-01-01T00:00:00Z",
      metadata: { funding_source: "sponsorship" },
    };
  });

  it("denies a funded membership past its end before writing an application", async () => {
    await expect(saveGrantApplicationFromForm(grantForm())).rejects.toThrow(
      "An active Olea membership is required to apply.",
    );
    expect(mocks.insertApplication).not.toHaveBeenCalled();
  });

  it("allows an active funded year and preserves Stripe access semantics", async () => {
    mocks.subscription.current_period_end = "2099-01-01T00:00:00Z";
    await expect(saveGrantApplicationFromForm(grantForm())).resolves.toBeUndefined();
    expect(mocks.insertApplication).toHaveBeenCalledTimes(1);

    mocks.subscription.provider = "stripe";
    mocks.subscription.current_period_end = "2020-01-01T00:00:00Z";
    await expect(saveGrantApplicationFromForm(grantForm())).resolves.toBeUndefined();
    expect(mocks.insertApplication).toHaveBeenCalledTimes(2);
  });
});
