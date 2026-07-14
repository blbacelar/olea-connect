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

function adminClientWithEvents({
  integrationEvents = [],
  webhookEvents = [],
}: {
  integrationEvents?: unknown[];
  webhookEvents?: unknown[];
}) {
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
  const createEventsBuilder = (rows: unknown[]) => ({
    select: vi.fn(() => ({
      in: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(async () => ({
              data: rows,
              error: null,
            })),
          })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(async () => ({
            data: rows,
            error: null,
          })),
        })),
      })),
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(async () => ({
            data: rows,
            error: null,
          })),
        })),
      })),
    })),
  });
  const integrationEventsBuilder = createEventsBuilder(integrationEvents);
  const webhookEventsBuilder = createEventsBuilder(webhookEvents);

  return {
    from: vi.fn((table: string) => {
      if (table === "platform_user_roles") return roleBuilder;
      if (table === "webhook_events") return webhookEventsBuilder;
      return integrationEventsBuilder;
    }),
    rpc: vi.fn(async () => ({ data: { id: "event_123" }, error: null })),
  };
}

describe("integration operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue(authClient());
  });

  it("loads recent provider events and redacts sensitive payload fields", async () => {
    const admin = adminClientWithEvents({
      integrationEvents: [
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
            documentContent: "private board package",
            email: "member@example.com",
            notes: "member-sensitive notes",
            nested: {
              access_token: "should-not-render",
            },
            password: "also-secret",
          },
        },
      ],
      webhookEvents: [
        {
          id: "webhook_123",
          provider: "stripe",
          provider_event_id: "evt_123",
          event_type: "invoice.paid",
          received_at: "2026-07-07T09:00:00.000Z",
          processed_at: "2026-07-07T09:01:00.000Z",
          processing_error: null,
          attempts: 1,
          payload: {
            id: "evt_123",
            data: {
              object: {
                customer_email: "member@example.com",
                client_secret: "should-not-render",
              },
            },
          },
        },
      ],
    });
    createAdminClient.mockReturnValue(admin);
    const { getIntegrationOperations } = await import(
      "@/lib/data/integration-events"
    );

    const operations = await getIntegrationOperations();

    expect(operations.counts.dead_letter).toBe(1);
    expect(operations.replayableEvents).toHaveLength(1);
    expect(operations.webhookEvents).toHaveLength(1);
    expect(operations.events[0]?.payloadPreview).toEqual({
      documentContent: "[redacted]",
      email: "member@example.com",
      notes: "[redacted]",
      nested: {
        access_token: "[redacted]",
      },
      password: "[redacted]",
    });
    expect(operations.webhookEvents[0]?.payloadPreview).toEqual({
      id: "evt_123",
      data: {
        object: {
          customer_email: "member@example.com",
          client_secret: "[redacted]",
        },
      },
    });
  });

  it("filters integration and webhook events by search text", async () => {
    const admin = adminClientWithEvents({
      integrationEvents: [
        {
          id: "event_keep",
          provider: "quickbooks",
          event_type: "quickbooks.customer.upsert",
          aggregate_type: "organization",
          aggregate_id: "organization_keep",
          status: "failed",
          attempts: 2,
          available_at: "2026-07-07T10:00:00.000Z",
          created_at: "2026-07-07T09:00:00.000Z",
          updated_at: "2026-07-07T09:30:00.000Z",
          completed_at: null,
          provider_message_id: null,
          last_error: "Company name rejected",
          idempotency_key: "quickbooks:organization_keep",
          payload: {},
        },
        {
          id: "event_skip",
          provider: "attio",
          event_type: "attio.member.upsert",
          aggregate_type: "member",
          aggregate_id: "member_skip",
          status: "completed",
          attempts: 1,
          available_at: "2026-07-07T10:00:00.000Z",
          created_at: "2026-07-07T09:00:00.000Z",
          updated_at: "2026-07-07T09:30:00.000Z",
          completed_at: "2026-07-07T09:40:00.000Z",
          provider_message_id: "attio_record",
          last_error: null,
          idempotency_key: "attio:member_skip",
          payload: {},
        },
      ],
      webhookEvents: [
        {
          id: "webhook_keep",
          provider: "stripe",
          provider_event_id: "evt_company_name_rejected",
          event_type: "checkout.session.completed",
          received_at: "2026-07-07T09:00:00.000Z",
          processed_at: null,
          processing_error: "Company name rejected",
          attempts: 1,
          payload: {},
        },
      ],
    });
    createAdminClient.mockReturnValue(admin);
    const { getIntegrationOperations } = await import(
      "@/lib/data/integration-events"
    );

    const operations = await getIntegrationOperations({
      query: "company name",
    });

    expect(operations.events.map((event) => event.id)).toEqual(["event_keep"]);
    expect(operations.webhookEvents.map((event) => event.id)).toEqual([
      "webhook_keep",
    ]);
  });

  it("replays failed events through the protected RPC", async () => {
    const admin = adminClientWithEvents({});
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
