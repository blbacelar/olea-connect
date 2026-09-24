import { describe, expect, it } from "vitest";

import { sanitizeAnalyticsEvent } from "@/lib/analytics";

describe("Vercel Analytics URL protection", () => {
  it("retains ordinary page views without query parameters or fragments", () => {
    expect(sanitizeAnalyticsEvent({
      type: "pageview",
      url: "https://oleaconnects.com/pricing?plan=roots#plans",
    })).toEqual({ type: "pageview", url: "https://oleaconnects.com/pricing" });
  });

  it.each([
    "https://oleaconnects.com/team/invitations/accept?token=secret",
    "https://oleaconnects.com/modules/ed-review/survey/secret",
    "https://oleaconnects.com/modules/board-recruitment/survey/secret",
    "https://oleaconnects.com/ref/OLEA-SECRET",
    "https://oleaconnects.com/%72ef/OLEA-SECRET",
    "https://oleaconnects.com/%2572ef/OLEA-SECRET",
    "https://oleaconnects.com/%252572ef/OLEA-SECRET",
    "https://oleaconnects.com/%25252572ef/OLEA-SECRET",
  ])("drops tokenized paths: %s", (url) => {
    expect(sanitizeAnalyticsEvent({ type: "pageview", url })).toBeNull();
  });

  it("drops malformed URLs instead of sending unvalidated data", () => {
    expect(sanitizeAnalyticsEvent({ type: "pageview", url: "not a URL" })).toBeNull();
    expect(sanitizeAnalyticsEvent({ type: "pageview", url: "javascript:alert(1)" })).toBeNull();
    expect(sanitizeAnalyticsEvent({ type: "pageview", url: "https://oleaconnects.com/%ZZ" })).toBeNull();
  });
});
