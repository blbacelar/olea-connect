import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  processCommunityModerationEvent: vi.fn(),
  failIntegrationEvent: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock("@/lib/community/moderation-worker", () => ({
  processCommunityModerationEvent: mocks.processCommunityModerationEvent,
}));
vi.mock("@/lib/integrations/outbox", () => ({
  isCronAuthorized: (request: Request) =>
    request.headers.get("authorization") === "Bearer test-cron-secret",
  failIntegrationEvent: mocks.failIntegrationEvent,
}));

describe("community moderation worker empty queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns zero processed when the RPC returns an all-null composite", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: null,
        event_type: null,
        payload: null,
        attempts: null,
      },
      error: null,
    });
    mocks.createAdminClient.mockReturnValue({ rpc });

    const { GET } = await import("@/app/api/v1/community/moderation/process/route");
    const response = await GET(new Request(
      "https://staging.oleaconnects.com/api/v1/community/moderation/process",
      { headers: { authorization: "Bearer test-cron-secret" } },
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ processed: 0, eventIds: [] });
    expect(rpc).toHaveBeenCalledOnce();
    expect(mocks.processCommunityModerationEvent).not.toHaveBeenCalled();
    expect(mocks.failIntegrationEvent).not.toHaveBeenCalled();
  });
});
