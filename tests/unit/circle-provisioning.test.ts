import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("Circle provisioning payloads", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.CIRCLE_MEMBER_TAG_ROOTS_ID = "101";
    process.env.CIRCLE_SPACE_GROUP_ROOTS_IDS = "201, 202";
  });

  it("maps Olea member and tier data into Circle event payloads", async () => {
    const { buildCircleProvisioningPayload } = await import(
      "@/lib/circle/provisioning"
    );

    expect(
      buildCircleProvisioningPayload({
        action: "provision",
        member: {
          id: "user_123",
          organizationId: "org_123",
          name: "Morgan Member",
          firstName: "Morgan",
          role: "owner",
          membershipRole: "owner",
          email: "member@example.com",
        },
        organization: {
          id: "org_123",
          name: "Olea Test Org",
          tier: "roots",
          seatsUsed: 1,
          seatLimit: 3,
          renewalDate: "",
          brandComplete: true,
          brand: {
            organizationName: "Olea Test Org",
            logoInitials: "OT",
            primaryColor: "#4A7C59",
            secondaryColor: "#2D5C3E",
          },
        },
        reason: "community_sso_access",
      }),
    ).toMatchObject({
      action: "provision",
      email: "member@example.com",
      external_id: "user_123",
      organization_id: "org_123",
      organization_role: "owner",
      tier: "roots",
      member_tag: "roots",
      member_tag_ids: [101],
      space_group_ids: [201, 202],
    });
  });

  it("enqueues Circle syncs as observable integration events", async () => {
    const { enqueueCircleMemberSync } = await import("@/lib/circle/provisioning");
    const upsert = vi.fn(() => ({ error: null }));
    const supabase = {
      from: vi.fn(() => ({ upsert })),
    };

    await enqueueCircleMemberSync(supabase as never, {
      action: "deprovision",
      email: "member@example.com",
      name: "Morgan Member",
      external_id: "user_123",
      organization_id: "org_123",
      organization_name: "Olea Test Org",
      organization_role: "member",
      tier: "roots",
      member_tag: "roots",
      member_tag_ids: [101],
      space_group_ids: [201],
      reason: "team_member_suspended",
    });

    expect(supabase.from).toHaveBeenCalledWith("integration_events");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregate_id: "org_123:user_123",
        aggregate_type: "community_membership",
        event_type: "circle.member.deprovision",
        provider: "circle",
        payload: expect.objectContaining({
          reason: "team_member_suspended",
        }),
        idempotency_key: expect.stringMatching(
          /^circle:deprovision:org_123:user_123:team_member_suspended:[a-f0-9]{64}$/,
        ),
      }),
      { ignoreDuplicates: true, onConflict: "idempotency_key" },
    );
  });
});
