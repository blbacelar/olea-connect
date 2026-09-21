import { describe, expect, it } from "vitest";

import { getSafeNextPath } from "@/lib/auth/safe-next-path";

describe("getSafeNextPath", () => {
  it("allows same-app absolute paths with query strings", () => {
    expect(
      getSafeNextPath("/team/invitations/accept?token=token_123"),
    ).toBe("/team/invitations/accept?token=token_123");
  });

  it.each([
    "https://evil.example/dashboard",
    "//evil.example/dashboard",
    "/\\evil.example/dashboard",
    "/\nevil.example/dashboard",
    "/\revil.example/dashboard",
    "/\tevil.example/dashboard",
  ])("falls back for unsafe next path %s", (unsafePath) => {
    expect(getSafeNextPath(unsafePath)).toBe("/dashboard");
  });

  it("uses the first value when a framework gives repeated next params", () => {
    expect(getSafeNextPath(["/dashboard", "//evil.example"])).toBe("/dashboard");
  });
});
