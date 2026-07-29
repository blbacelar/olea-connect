import { afterEach, describe, expect, it, vi } from "vitest";

describe("request correlation", () => {
  it("keeps safe incoming request IDs and rejects malformed values", async () => {
    const { getOrCreateRequestId, normalizeRequestId } = await import(
      "@/lib/observability/request-id"
    );
    const headers = new Headers({ "x-request-id": "req_safe-123" });

    expect(getOrCreateRequestId(headers)).toBe("req_safe-123");
    expect(normalizeRequestId("bad value with spaces")).toBeNull();
  });
});

describe("structured logger", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

  afterEach(() => {
    consoleError.mockClear();
    consoleLog.mockClear();
  });

  it("redacts secrets and content from structured logs", async () => {
    const { logCritical } = await import("@/lib/observability/logger");

    logCritical("Sensitive operation failed", new Error("boom"), {
      apiKey: "sk_live_secret",
      documentContent: "private board document",
      eventId: "event_123",
      nested: {
        refresh_token: "refresh_secret",
      },
    });

    const payload = JSON.parse(String(consoleError.mock.calls[0]?.[0]));
    expect(payload).toMatchObject({
      alert: true,
      eventId: "event_123",
      level: "critical",
      message: "Sensitive operation failed",
    });
    expect(payload.apiKey).toBe("[redacted]");
    expect(payload.documentContent).toBe("[redacted]");
    expect(payload.nested.refresh_token).toBe("[redacted]");
    expect(payload.error.message).toBe("boom");
  });
});
