import { describe, expect, it } from "vitest";

import { parseImplicitAuthCallback } from "@/lib/auth/implicit-callback";

describe("implicit Supabase email callbacks", () => {
  it("takes signup sessions to activation after confirmation", () => {
    expect(
      parseImplicitAuthCallback("", "#access_token=access&refresh_token=refresh&type=signup"),
    ).toEqual({
      accessToken: "access",
      refreshToken: "refresh",
      next: "/signup/success?activation=pending_payment",
    });
  });

  it("preserves a safe password reset destination", () => {
    expect(
      parseImplicitAuthCallback(
        "?next=%2Fupdate-password",
        "#access_token=access&refresh_token=refresh&type=recovery",
      )?.next,
    ).toBe("/update-password");
  });

  it("rejects external destinations and incomplete sessions", () => {
    expect(
      parseImplicitAuthCallback(
        "?next=https%3A%2F%2Fevil.example",
        "#access_token=access&refresh_token=refresh&type=signup",
      )?.next,
    ).toBe("/signup/success?activation=pending_payment");
    expect(parseImplicitAuthCallback("", "#access_token=access")).toBeNull();
  });
});
