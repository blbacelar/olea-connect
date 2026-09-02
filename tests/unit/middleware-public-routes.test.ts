import { describe, expect, it } from "vitest";

import {
  applyLocaleHeaders,
  isPublicPath,
} from "@/utils/supabase/middleware";

describe("middleware public routes", () => {
  it("keeps the referral marketing page public", () => {
    expect(isPublicPath("/referrals")).toBe(true);
  });

  it("keeps referral-code redirects public without opening the dashboard", () => {
    expect(isPublicPath("/ref/ABC123")).toBe(true);
    expect(isPublicPath("/referrals/dashboard")).toBe(false);
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
