import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createBrowserClient = vi.hoisted(() => vi.fn().mockReturnValue({}));

vi.mock("@supabase/ssr", () => ({ createBrowserClient }));

import { createIsolatedClient } from "@/utils/supabase/client";

describe("isolated community realtime client", () => {
  beforeEach(() => {
    createBrowserClient.mockClear();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([
    { cookie: "olea-auth-remember=1", expectedMarker: "olea-auth-remember=1" },
    { cookie: "", expectedMarker: "olea-auth-remember=" },
  ])("preserves the active remember-me policy with cookie $cookie", ({ cookie, expectedMarker }) => {
    const writtenCookies: string[] = [];
    vi.stubGlobal("document", {
      get cookie() { return cookie; },
      set cookie(value: string) { writtenCookies.push(value); },
    });

    createIsolatedClient();

    const options = createBrowserClient.mock.calls[0][2];
    expect(options.isSingleton).toBe(false);
    options.cookies.setAll([{ name: "sb-test", value: "token", options: { path: "/" } }]);
    expect(writtenCookies[1]).toContain(expectedMarker);
    expect(writtenCookies[0]).toContain("sb-test=token");
    expect(writtenCookies[0].includes("Max-Age=2592000")).toBe(Boolean(cookie));
  });
});
