import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireMemberContext: vi.fn(),
  sendEmail: vi.fn(),
  writeAuditLog: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/data/member-context", () => ({ requireMemberContext: mocks.requireMemberContext }));
vi.mock("@/utils/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/utils/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/email/server", () => ({
  getAppUrl: () => "https://staging.oleaconnects.com",
  getEmailRecipient: (email: string) => email,
  getEmailSender: () => "Olea <notifications@olivesocialimpact.com>",
  getReplyTo: () => "hello@olivesocialimpact.com",
  getResend: () => ({ emails: { send: mocks.sendEmail } }),
}));
vi.mock("@/lib/observability/logger", () => ({ logError: vi.fn() }));
vi.mock("@/app/modules/board-calendar/board-calendar-action-support", () => ({
  assertTemplateInstanceAccess: vi.fn(),
  writeBoardPackageAuditLog: mocks.writeAuditLog,
}));

import { sendBoardPackage } from "@/app/modules/board-calendar/board-package-distribution-actions";

const templateInstanceId = "11111111-1111-4111-8111-111111111111";
const recipientId = "22222222-2222-4222-8222-222222222222";
const otherId = "33333333-3333-4333-8333-333333333333";

function clientWithDirectory(status: "active" | "suspended") {
  const query = {
    select() { return this; },
    eq() { return this; },
    async single() {
      return {
        data: {
          form_data: {
            meetings: [{ id: "meeting-1", title: "Budget Review", date: "2026-11-10" }],
            documents: [{ id: "document-1", name: "Agenda", meeting_id: "meeting-1" }],
          },
        },
        error: null,
      };
    },
  };
  return {
    from: () => query,
    rpc: async () => ({
      data: [{ user_id: recipientId, email: "chair@example.org", status }],
      error: null,
    }),
  };
}

describe("board package distribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireMemberContext.mockResolvedValue({
      member: { id: otherId, membershipRole: "admin", name: "Admin" },
      organization: { id: "org-1", name: "Example Org" },
    });
    mocks.createClient.mockResolvedValue(clientWithDirectory("active"));
    mocks.sendEmail.mockResolvedValue({ data: { id: "email-1" }, error: null });
    mocks.writeAuditLog.mockResolvedValue(undefined);
  });

  it("sends an authenticated meeting link and records the recipient", async () => {
    const result = await sendBoardPackage({
      templateInstanceId,
      meetingId: "meeting-1",
      recipientIds: [recipientId],
    });

    expect(result).toEqual({ ok: true, data: { sent: 1, failed: 0, failedRecipientIds: [] } });
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    const email = mocks.sendEmail.mock.calls[0][0];
    expect(email.to).toBe("chair@example.org");
    expect(email.text).toContain(`session=${templateInstanceId}`);
    expect(email.text).toContain("tab=packages");
    expect(email.text).toContain("meeting=meeting-1");
    expect(mocks.writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "package_sent",
      recipientUserId: recipientId,
      templateInstanceId,
    }));
  });

  it("does not let a regular member send a package", async () => {
    mocks.requireMemberContext.mockResolvedValue({
      member: { id: otherId, membershipRole: "member", name: "Member" },
      organization: { id: "org-1", name: "Example Org" },
    });

    const result = await sendBoardPackage({ templateInstanceId, meetingId: "meeting-1", recipientIds: [recipientId] });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("administrator") });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("rejects recipients who are not active workspace members", async () => {
    mocks.createClient.mockResolvedValue(clientWithDirectory("suspended"));

    const result = await sendBoardPackage({ templateInstanceId, meetingId: "meeting-1", recipientIds: [recipientId] });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("active member") });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("does not record a successful delivery when the email provider rejects it", async () => {
    mocks.sendEmail.mockResolvedValue({ data: null, error: { message: "Provider unavailable" } });

    const result = await sendBoardPackage({ templateInstanceId, meetingId: "meeting-1", recipientIds: [recipientId] });
    expect(result).toEqual({ ok: true, data: { sent: 0, failed: 1, failedRecipientIds: [recipientId] } });
    expect(mocks.writeAuditLog).not.toHaveBeenCalled();
  });
});
