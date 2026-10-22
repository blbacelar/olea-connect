import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildEmail: vi.fn(),
  createAdminClient: vi.fn(),
  send: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/email/event-builder", () => ({ buildEmail: mocks.buildEmail }));
vi.mock("@/lib/email/config", () => ({ hasClaimedEmailEvent: () => true }));
vi.mock("@/lib/email/server", () => ({
  getEmailRecipient: (email: string) => email,
  getEmailSender: () => "Olea <hello@example.test>",
  getReplyTo: () => "hello@example.test",
  getResend: () => ({ emails: { send: mocks.send } }),
}));
vi.mock("@/lib/observability/logger", () => ({
  getRequestContext: () => ({}),
  logCritical: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

describe("email worker stale invitation", () => {
  const previousCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterEach(() => {
    if (previousCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousCronSecret;
  });

  it("completes a skipped event without sending an email", async () => {
    const event = {
      id: "10000000-0000-4000-8000-000000000001",
      event_type: "organization.invitation.created",
      attempts: 1,
      payload: {},
    };
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mocks.createAdminClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: event, error: null }),
      from: vi.fn().mockReturnValue({ update }),
    });
    mocks.buildEmail.mockResolvedValue({
      skipped: true,
      reason: "Invitation is no longer pending.",
    });

    const { GET } = await import("@/app/api/email/process/route");
    const response = await GET(new Request("https://staging.oleaconnects.com/api/email/process", {
      headers: { authorization: "Bearer test-cron-secret" },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ processed: false, eventId: event.id });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      status: "completed",
      processing_started_at: null,
      last_error: null,
    }));
    expect(eq).toHaveBeenCalledWith("id", event.id);
  });

  it("still sends and records a live invitation", async () => {
    const event = {
      id: "10000000-0000-4000-8000-000000000002",
      event_type: "organization.invitation.created",
      attempts: 1,
      payload: {},
    };
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    mocks.createAdminClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: event, error: null }),
      from: vi.fn().mockReturnValue({ update }),
    });
    mocks.buildEmail.mockResolvedValue({
      recipientEmail: "invitee@example.test",
      email: { subject: "Invitation", html: "<p>Join us</p>", text: "Join us" },
    });
    mocks.send.mockResolvedValue({ data: { id: "email-123" }, error: null });

    const { GET } = await import("@/app/api/email/process/route");
    const response = await GET(new Request("https://staging.oleaconnects.com/api/email/process", {
      headers: { authorization: "Bearer test-cron-secret" },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ processed: true, eventId: event.id });
    expect(mocks.send).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      status: "completed",
      provider_message_id: "email-123",
    }));
  });
});
