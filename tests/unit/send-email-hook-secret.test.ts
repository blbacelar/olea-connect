import { describe, expect, it } from "vitest";

import { normalizeHookSecret } from "@/supabase/functions/send-email/secret";

describe("send email hook secret normalization", () => {
  it("accepts the full Supabase hook secret format", () => {
    expect(normalizeHookSecret("v1,whsec_base64-secret")).toBe(
      "base64-secret",
    );
  });

  it("accepts a hook secret without the version prefix", () => {
    expect(normalizeHookSecret("whsec_base64-secret")).toBe("base64-secret");
  });

  it("trims whitespace copied from dashboards or shells", () => {
    expect(normalizeHookSecret("  v1,whsec_base64-secret\n")).toBe(
      "base64-secret",
    );
  });
});
