import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  requireMemberContext: vi.fn(),
  from: vi.fn(),
  allowPublicSurveyRequest: vi.fn(() => true),
}));

vi.mock("@/lib/data/member-context", () => ({
  requireMemberContext: mocks.requireMemberContext,
}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: () => ({ from: mocks.from }),
  createPublicServerClient: vi.fn(),
}));
vi.mock("@/lib/ed-review/public-rate-limit", () => ({
  allowPublicSurveyRequest: mocks.allowPublicSurveyRequest,
}));

import {
  EdReviewMembershipRequiredError,
  appointEdReviewBoardChair,
  getEdReviewBoardChairRecoveryData,
  getPublicEdReviewCampaign,
  requireEdReviewAccess,
} from "@/lib/data/ed-review";

type Subscription = {
  plan_id: string;
  status: string;
  current_period_end: string | null;
  subscription_items: Array<{ item_type: string; active: boolean }>;
};

const organizationId = "00000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000002";
const cycleId = "00000000-0000-4000-8000-000000000003";
const token = "a".repeat(43);
const activeSubscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  plan_id: "seedling",
  status: "active",
  current_period_end: "2099-01-01T00:00:00Z",
  subscription_items: [],
  ...overrides,
});

let subscription: Subscription | null;

function queryFor(table: string) {
  const query = {
    select: () => query,
    eq: () => query,
    in: () => query,
    neq: () => query,
    order: () => query,
    limit: () => query,
    maybeSingle: async () => ({
      data: table === "subscriptions" ? subscription : table === "ed_review_cycles" ? {
        id: cycleId,
        organization_id: organizationId,
        title: "ED/CEO annual review",
        review_year: 2026,
        status: "open",
      } : table === "ed_review_campaigns" ? {
        id: "campaign-id",
        kind: "staff",
        title: "Staff feedback",
        status: "open",
        opens_at: "2020-01-01T00:00:00Z",
        closes_at: null,
        ed_review_cycles: {
          title: "ED/CEO annual review",
          status: "open",
          organization_id: organizationId,
        },
      } : null,
      error: null,
    }),
    then: (resolve: (value: unknown) => void) => resolve({
      data: table === "ed_review_reviewer_assignments" ? [{ id: "assignment-id", user_id: userId, role: "board_chair" }] : [],
      error: null,
    }),
  };
  return query;
}

describe("ED Review membership authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscription = activeSubscription();
    mocks.requireMemberContext.mockResolvedValue({
      organization: { id: organizationId },
      member: { id: userId, membershipRole: "owner" },
    });
    mocks.from.mockImplementation(queryFor);
    mocks.allowPublicSurveyRequest.mockReturnValue(true);
  });

  it.each(["seedling", "roots"])("denies %s before reading or creating a review cycle", async (planId) => {
    subscription = activeSubscription({ plan_id: planId });

    await expect(requireEdReviewAccess()).rejects.toBeInstanceOf(EdReviewMembershipRequiredError);
    expect(mocks.from).toHaveBeenCalledWith("subscriptions");
    expect(mocks.from).not.toHaveBeenCalledWith("ed_review_cycles");
  });

  it("allows Canopy and an active ED Review add-on", async () => {
    subscription = activeSubscription({ plan_id: "canopy" });
    await expect(requireEdReviewAccess()).resolves.toMatchObject({
      cycle: { id: cycleId },
    });

    subscription = activeSubscription({
      plan_id: "roots",
      subscription_items: [{ item_type: "ed_review", active: true }],
    });
    await expect(requireEdReviewAccess()).resolves.toMatchObject({
      cycle: { id: cycleId },
    });
  });

  it("denies expired memberships and inactive add-ons", async () => {
    subscription = activeSubscription({
      plan_id: "canopy",
      current_period_end: "2020-01-01T00:00:00Z",
    });
    await expect(requireEdReviewAccess()).rejects.toBeInstanceOf(EdReviewMembershipRequiredError);

    subscription = activeSubscription({
      plan_id: "roots",
      subscription_items: [{ item_type: "ed_review", active: false }],
    });
    await expect(requireEdReviewAccess()).rejects.toBeInstanceOf(EdReviewMembershipRequiredError);
  });

  it("blocks recovery reads and mutations without entitlement", async () => {
    subscription = activeSubscription({ plan_id: "roots" });
    await expect(getEdReviewBoardChairRecoveryData()).rejects.toBeInstanceOf(EdReviewMembershipRequiredError);
    await expect(appointEdReviewBoardChair({ cycleId, userId })).rejects.toBeInstanceOf(EdReviewMembershipRequiredError);
    expect(mocks.from).not.toHaveBeenCalledWith("ed_review_cycles");
  });

  it("keeps issued public survey links available only while the organization is entitled", async () => {
    subscription = activeSubscription({ plan_id: "roots" });
    await expect(getPublicEdReviewCampaign(token)).resolves.toBeNull();

    subscription = activeSubscription({ plan_id: "canopy" });
    await expect(getPublicEdReviewCampaign(token)).resolves.toMatchObject({ title: "Staff feedback" });

    subscription = activeSubscription({
      plan_id: "roots",
      subscription_items: [{ item_type: "ed_review", active: true }],
    });
    await expect(getPublicEdReviewCampaign(token)).resolves.toMatchObject({ title: "Staff feedback" });
  });
});
