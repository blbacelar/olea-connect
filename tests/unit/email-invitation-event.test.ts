import { describe, expect, it, vi } from "vitest";

import { buildEmail } from "@/lib/email/event-builder";
import type { createAdminClient } from "@/utils/supabase/admin";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/email/server", () => ({
  getAppUrl: () => "https://staging.oleaconnects.com",
}));

const event = {
  event_type: "organization.invitation.created",
  payload: {
    invitation_id: "10000000-0000-4000-8000-000000000001",
    email: "invitee@example.test",
    role: "member",
    expires_at: "2026-10-30T00:00:00.000Z",
    accept_path: "/team/invitations/accept?token=test-token",
  },
};

function adminWithInvitation(
  data: {
    status: string;
    expires_at: string;
    organizations: { name: string } | null;
  } | null,
  error: { message: string } | null = null,
) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
  const client = {
    from: vi.fn().mockReturnValue(query),
  } as unknown as ReturnType<typeof createAdminClient>;
  return { client, query };
}

describe("queued team invitation email", () => {
  it.each([
    ["deleted", null],
    ["revoked", { status: "revoked", expires_at: "2099-01-01T00:00:00Z", organizations: { name: "Olive" } }],
    ["accepted", { status: "accepted", expires_at: "2099-01-01T00:00:00Z", organizations: { name: "Olive" } }],
    ["expired", { status: "pending", expires_at: "2020-01-01T00:00:00Z", organizations: { name: "Olive" } }],
  ])("skips a %s invitation", async (_reason, invitation) => {
    const { client, query } = adminWithInvitation(invitation);

    await expect(buildEmail(client, event)).resolves.toMatchObject({
      skipped: true,
    });
    expect(query.eq).toHaveBeenCalledWith("id", event.payload.invitation_id);
  });

  it("builds email for a live pending invitation", async () => {
    const { client } = adminWithInvitation({
      status: "pending",
      expires_at: "2099-01-01T00:00:00Z",
      organizations: { name: "Olive" },
    });

    await expect(buildEmail(client, event)).resolves.toMatchObject({
      recipientEmail: "invitee@example.test",
      email: { subject: expect.any(String) },
    });
  });

  it("propagates a database failure for retry", async () => {
    const { client } = adminWithInvitation(null, { message: "database unavailable" });
    await expect(buildEmail(client, event)).rejects.toMatchObject({
      message: "database unavailable",
    });
  });
});
