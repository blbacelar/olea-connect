import { beforeEach, describe, expect, it, vi } from "vitest";

const memberContext = vi.hoisted(() => ({
  requireMemberContext: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/data/member-context", () => ({
  requireMemberContext: memberContext.requireMemberContext,
  getOptionalMemberContext: vi.fn(),
}));

describe("referral administration access", () => {
  beforeEach(() => memberContext.requireMemberContext.mockReset());

  it("rejects a workspace member without a platform administrator role", async () => {
    const { requireReferralAdmin, ReferralAdminAccessError } = await import("@/lib/data/referrals");
    memberContext.requireMemberContext.mockResolvedValue({ platformRoles: [] });

    await expect(requireReferralAdmin()).rejects.toBeInstanceOf(ReferralAdminAccessError);
  });
});
