import { describe, expect, it } from "vitest";

import {
  applyLocaleHeaders,
  isPublicPath,
} from "@/utils/supabase/middleware";

describe("middleware public routes", () => {
  it("keeps the referral marketing page public", () => {
    expect(isPublicPath("/referrals")).toBe(true);
    expect(isPublicPath("/demos")).toBe(true);
    expect(isPublicPath("/learning")).toBe(true);
  });

  it("keeps referral-code redirects public without opening the dashboard", () => {
    expect(isPublicPath("/ref/ABC123")).toBe(true);
    expect(isPublicPath("/verify/training/OLEA-2026-ABCDEF123456")).toBe(true);
    expect(isPublicPath("/referrals/dashboard")).toBe(false);
  });

  it("opens the accessibility statement without opening member routes", () => {
    expect(isPublicPath("/accessibility")).toBe(true);
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/subscription")).toBe(false);
  });

  it("allows anonymous ED and strategic survey links without opening module workspaces", () => {
    expect(isPublicPath("/modules/ed-review/survey/opaque-token")).toBe(true);
    expect(isPublicPath("/modules/strategic-planning/survey/opaque-token")).toBe(true);
    expect(isPublicPath("/modules/ed-review/annual")).toBe(false);
  });
});

describe("middleware locale headers", () => {
  it("marks responses as varying by locale inputs", () => {
    const headers = new Headers({ Vary: "RSC" });

    applyLocaleHeaders(headers, "fr-CA");

    expect(headers.get("Content-Language")).toBe("fr-CA");
    expect(headers.get("Vary")).toBe(
      "RSC, Cookie, Accept-Language, x-vercel-ip-country, x-vercel-ip-country-region",
    );
  });
});
