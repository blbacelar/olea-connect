import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/newsletter/route";

const originalFetch = globalThis.fetch;
let requestId = 0;

function request(body: unknown) {
  requestId += 1;
  return new NextRequest("http://localhost:3000/api/newsletter", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `192.0.2.${requestId}` },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("newsletter signup proxy", () => {
  it("rejects invalid email or missing consent without contacting the provider", async () => {
    const fetch = vi.fn();
    globalThis.fetch = fetch;
    expect((await POST(request({ email: "invalid", consent: true }))).status).toBe(400);
    expect((await POST(request({ email: "person@example.org", consent: false }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("ignores honeypot submissions", async () => {
    const fetch = vi.fn();
    globalThis.fetch = fetch;
    expect((await POST(request({ email: "person@example.org", consent: true, website: "spam" }))).status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("subscribes a normalized address to Olive's existing list", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetch;
    const response = await POST(request({ email: "Person@Example.org", consent: true }));
    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith("https://www.olivesocialimpact.com/api/newsletter", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "person@example.org", website: "" }),
    }));
  });

  it("reports an unavailable provider without claiming subscription", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    expect((await POST(request({ email: "person@example.org", consent: true }))).status).toBe(502);
  });
});
