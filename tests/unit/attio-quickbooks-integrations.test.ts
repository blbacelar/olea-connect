import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

function createEventUpdateBuilder() {
  return {
    update: vi.fn(() => ({
      eq: vi.fn(() => ({ error: null })),
    })),
  };
}

describe("Attio integration worker", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("ATTIO_API_TOKEN", "attio_test_token");
    vi.stubEnv("ATTIO_API_BASE_URL", "https://api.attio.test");
    vi.stubGlobal("fetch", vi.fn());
  });

  it("builds a person upsert payload from Olea membership data", async () => {
    const { buildAttioMemberPayload } = await import("@/lib/attio/sync");

    expect(
      buildAttioMemberPayload({
        email: "member@example.com",
        name: "Morgan Member",
        user_id: "user_123",
        organization_id: "org_123",
        organization_name: "Olea Test Org",
        organization_role: "owner",
        tier: "roots",
        subscription_status: "active",
        billing_interval: "month",
        provider_customer_id: "cus_123",
        provider_subscription_id: "sub_123",
        reason: "stripe_subscription_active",
      }),
    ).toEqual({
      data: {
        values: {
          name: [{ full_name: "Morgan Member" }],
          email_addresses: [{ email_address: "member@example.com" }],
          description: [
            {
              value:
                "Olea organization: Olea Test Org\nTier: roots\nRole: owner\nSubscription: active",
            },
          ],
        },
      },
    });
  });

  it("enqueues Attio syncs with an idempotency key", async () => {
    const { enqueueAttioMemberSync } = await import("@/lib/attio/sync");
    const upsert = vi.fn(() => ({ error: null }));
    const supabase = {
      from: vi.fn(() => ({ upsert })),
    };

    await enqueueAttioMemberSync(supabase as never, {
      email: "member@example.com",
      name: "Morgan Member",
      user_id: "user_123",
      organization_id: "org_123",
      organization_name: "Olea Test Org",
      organization_role: "admin",
      tier: "canopy",
      subscription_status: "active",
      billing_interval: "year",
      provider_customer_id: "cus_123",
      provider_subscription_id: "sub_123",
      reason: "stripe_subscription_active",
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregate_id: "org_123:user_123",
        aggregate_type: "organization_member",
        event_type: "attio.member.upsert",
        provider: "attio",
        idempotency_key: expect.stringMatching(
          /^attio:member:org_123:user_123:stripe_subscription_active:[a-f0-9]{64}$/,
        ),
      }),
      { ignoreDuplicates: true, onConflict: "idempotency_key" },
    );
  });

  it("processes a claimed Attio event and stores the provider record id", async () => {
    const { processAttioIntegrationEvent } = await import("@/lib/attio/sync");
    const eventUpdateBuilder = createEventUpdateBuilder();
    const integrationUpsert = vi.fn(() => ({ error: null }));
    const integrationSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: {
              settings: {
                member_record_ids: { user_existing: "attio_record_existing" },
              },
            },
            error: null,
          })),
        })),
      })),
    }));
    const supabase = {
      from: vi.fn((table: string) =>
        table === "organization_integrations"
          ? { select: integrationSelect, upsert: integrationUpsert }
          : eventUpdateBuilder,
      ),
    };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: { record_id: "attio_record_123" } } }),
    } as Response);

    await processAttioIntegrationEvent(supabase as never, {
      id: "event_123",
      event_type: "attio.member.upsert",
      attempts: 1,
      payload: {
        email: "member@example.com",
        name: "Morgan Member",
        user_id: "user_123",
        organization_id: "org_123",
        organization_name: "Olea Test Org",
        organization_role: "owner",
        tier: "roots",
        subscription_status: "active",
        billing_interval: "month",
        provider_customer_id: "cus_123",
        provider_subscription_id: "sub_123",
        reason: "stripe_subscription_active",
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.attio.test/v2/objects/people/records?matching_attribute=email_addresses",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Bearer attio_test_token",
        }),
      }),
    );
    expect(integrationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: "org_123",
        provider: "attio",
        external_id: "org_123",
        settings: expect.objectContaining({
          member_record_ids: {
            user_123: "attio_record_123",
            user_existing: "attio_record_existing",
          },
        }),
      }),
      { onConflict: "organization_id,provider" },
    );
  });
});

describe("QuickBooks integration worker", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("QUICKBOOKS_ACCESS_TOKEN", "qb_test_token");
    vi.stubEnv("QUICKBOOKS_REALM_ID", "realm_123");
    vi.stubEnv("QUICKBOOKS_API_BASE_URL", "https://quickbooks.test");
    vi.stubGlobal("fetch", vi.fn());
  });

  it("enqueues QuickBooks customer syncs with an idempotency key", async () => {
    const { enqueueQuickBooksCustomerSync } = await import(
      "@/lib/quickbooks/sync"
    );
    const upsert = vi.fn(() => ({ error: null }));
    const supabase = {
      from: vi.fn(() => ({ upsert })),
    };

    await enqueueQuickBooksCustomerSync(supabase as never, {
      organization_id: "org_123",
      organization_name: "Olea Test Org",
      legal_name: null,
      primary_email: "owner@example.com",
      country_code: "CA",
      province_or_region: "BC",
      tier: "roots",
      subscription_status: "active",
      billing_interval: "month",
      provider_customer_id: "cus_123",
      provider_subscription_id: "sub_123",
      reason: "stripe_subscription_active",
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregate_id: "org_123",
        aggregate_type: "organization",
        event_type: "quickbooks.customer.upsert",
        provider: "quickbooks",
        idempotency_key: expect.stringMatching(
          /^quickbooks:customer:org_123:stripe_subscription_active:[a-f0-9]{64}$/,
        ),
      }),
      { ignoreDuplicates: true, onConflict: "idempotency_key" },
    );
  });

  it("creates a QuickBooks customer when no provider id exists", async () => {
    const { processQuickBooksIntegrationEvent } = await import(
      "@/lib/quickbooks/sync"
    );
    const eventUpdateBuilder = createEventUpdateBuilder();
    const integrationUpsert = vi.fn(() => ({ error: null }));
    const selectBuilder = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
      })),
      upsert: integrationUpsert,
    };
    const supabase = {
      from: vi.fn((table: string) =>
        table === "organization_integrations"
          ? selectBuilder
          : eventUpdateBuilder,
      ),
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ QueryResponse: {} }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Customer: { Id: "qb_customer_123", DisplayName: "Olea Test Org" },
        }),
      } as Response);

    await processQuickBooksIntegrationEvent(supabase as never, {
      id: "event_123",
      event_type: "quickbooks.customer.upsert",
      attempts: 1,
      payload: {
        organization_id: "org_123",
        organization_name: "Olea Test Org",
        legal_name: null,
        primary_email: "owner@example.com",
        country_code: "CA",
        province_or_region: "BC",
        tier: "roots",
        subscription_status: "active",
        billing_interval: "month",
        provider_customer_id: "cus_123",
        provider_subscription_id: "sub_123",
        reason: "stripe_subscription_active",
      },
    });

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://quickbooks.test/v3/company/realm_123/customer",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer qb_test_token",
        }),
      }),
    );
    expect(integrationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: "org_123",
        provider: "quickbooks",
        external_id: "qb_customer_123",
      }),
      { onConflict: "organization_id,provider" },
    );
  });
});
