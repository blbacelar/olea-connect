import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ retrieveSession: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/stripe/server", () => ({
  getStripe: () => ({ checkout: { sessions: { retrieve: mocks.retrieveSession } } }),
  isLegacyTestCheckoutSession: (id: string) => id.startsWith("cs_test_"),
}));

function pendingActivation(sessionId: string): SupabaseClient {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: "req_123", checkout_session_id: sessionId },
      error: null,
    }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);

  return {
    from: vi.fn().mockReturnValue(query),
    rpc: vi.fn().mockResolvedValue({
      data: { status: "pending_payment", request_id: "req_123" },
      error: null,
    }),
  } as unknown as SupabaseClient;
}

describe("legacy checkout activation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("leaves a test-mode session pending so live checkout can replace it", async () => {
    const { attemptUserWorkspaceProvisioning } = await import(
      "@/lib/stripe/registration"
    );

    const result = await attemptUserWorkspaceProvisioning(
      pendingActivation("cs_test_old"),
      "user_123",
    );

    expect(result?.status).toBe("pending_payment");
    expect(mocks.retrieveSession).not.toHaveBeenCalled();
  });

  it("does not hide a Stripe outage for a live checkout", async () => {
    mocks.retrieveSession.mockRejectedValue(new Error("Stripe unavailable"));
    const { attemptUserWorkspaceProvisioning } = await import(
      "@/lib/stripe/registration"
    );

    await expect(
      attemptUserWorkspaceProvisioning(
        pendingActivation("cs_live_current"),
        "user_123",
      ),
    ).rejects.toThrow("Stripe unavailable");
  });
});
