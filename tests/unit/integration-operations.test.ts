import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createClient = vi.fn();
const createAdminClient = vi.fn();
const revalidatePath = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
  createClient,
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

function authClient() {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user_super_admin" } },
        error: null,
      })),
    },
  };
}

function adminClientWithEvents(events: unknown[]) {
  const roleBuilder = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        in: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: { role: "super_admin" },
              error: null,
            })),
          })),
        })),
      })),
    })),
  };
  const eventsBuilder = {
    select: vi.fn(() => ({
      in: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(async () => ({
            data: events,
            error: null,
          })),
        })),
      })),
    })),
  };

  return {
    from: vi.fn((table: string) =>
      table === "platform_user_roles" ? roleBuilder : eventsBuilder,
    ),
    rpc: vi.fn(async () => ({ data: { id: "event_123" }, error: null })),
  };
}

describe("integration operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue(authClient());
  });

  it("loads recent provider events and redacts sensitive payload fields", async () => {
    const admin = adminClientWithEvents([
      {
        id: "event_123",
        provider: "attio",
        event_type: "attio.member.upsert",
        aggregate_type: "organization_member",
        aggregate_id: "org_123:user_123",
        status: "dead_letter",
        attempts: 5,
        available_at: "2026-07-07T10:00:00.000Z",
        created_at: "2026-07-07T09:00:00.000Z",
        updated_at: "2026-07-07T09:30:00.000Z",
        completed_at: null,
        provider_message_id: null,
        last_error: "Provider rejected the payload.",
        idempotency_key: "attio:member:org_123:user_123",
        payload: {
          email: "member@example.com",
          nested: {
            access_token: "should-not-render",
          },
          password: "also-secret",
        },
      },
    ]);
    createAdminClient.mockReturnValue(admin);
    const { getIntegrationOperations } = await import(
      "@/lib/data/integration-events"
    );

    const operations = await getIntegrationOperations();

    expect(operations.counts.dead_letter).toBe(1);
    expect(operations.replayableEvents).toHaveLength(1);
    expect(operations.events[0]?.payloadPreview).toEqual({
      email: "member@example.com",
      nested: {
        access_token: "[redacted]",
      },
      password: "[redacted]",
    });
  });

  it("replays failed events through the protected RPC", async () => {
    const admin = adminClientWithEvents([]);
    createAdminClient.mockReturnValue(admin);
    const { replayIntegrationEvent } = await import(
      "@/app/settings/integrations/actions"
    );
    const formData = new FormData();
    formData.set("eventId", "event_123");

    const state = await replayIntegrationEvent(undefined, formData);

    expect(admin.rpc).toHaveBeenCalledWith("replay_integration_event", {
      target_event_id: "event_123",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings/integrations");
    expect(state).toEqual({
      message: "Integration event queued for replay.",
      status: "success",
    });
  });
});
