import { beforeEach, describe, expect, it, vi } from "vitest";

const createPublicServerClient = vi.fn();
const select = vi.fn();

vi.mock("@/utils/supabase/admin", () => ({
  createPublicServerClient,
}));

describe("health route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://staging.oleaconnects.com");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable");
    vi.stubEnv("CRON_SECRET", "cron-secret");
    createPublicServerClient.mockReturnValue({
      from: vi.fn(() => ({
        select,
      })),
    });
  });

  it("returns ok when the public database check succeeds", async () => {
    select.mockResolvedValue({ error: null });
    const { GET } = await import("@/app/api/v1/health/route");

    const response = await GET(
      new Request("https://staging.oleaconnects.com/api/v1/health", {
        headers: { "x-request-id": "req_health_123" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("req_health_123");
    expect(body).toMatchObject({
      checks: {
        appUrl: "configured",
        cronSecret: "configured",
        database: "ok",
        supabasePublishableKey: "configured",
        supabaseUrl: "configured",
      },
      requestId: "req_health_123",
      status: "ok",
    });
  });

  it("returns degraded without leaking database errors", async () => {
    select.mockResolvedValue({ error: new Error("relation missing") });
    const { GET } = await import("@/app/api/v1/health/route");

    const response = await GET(
      new Request("https://staging.oleaconnects.com/api/v1/health"),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.checks.database).toBe("error");
    expect(JSON.stringify(body)).not.toContain("relation missing");
  });
});
