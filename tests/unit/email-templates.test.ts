import { afterEach, describe, expect, it, vi } from "vitest";

import {
  hasClaimedEmailEvent,
  resolveEmailRecipient,
} from "@/lib/email/config";
import { teamInvitationEmail } from "@/lib/email/templates";

describe("transactional email templates", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("renders an accessible team invitation with text fallback", () => {
    const email = teamInvitationEmail({
      organizationName: "Olea Test Society",
      role: "admin",
      acceptUrl: "https://example.com/team/invitations/accept?token=secret",
      expiresAt: "2026-06-22T12:00:00.000Z",
    });

    expect(email.subject).toContain("Olea Test Society");
    expect(email.html).toContain('role="presentation"');
    expect(email.html).toContain("Accept invitation");
    expect(email.html).toContain("https://example.com/team/invitations/accept");
    expect(email.text).toContain("https://example.com/team/invitations/accept");
    expect(email.html).not.toContain("<script");
  });

  it("escapes organization and role values in HTML email content", () => {
    const email = teamInvitationEmail({
      organizationName: '<img src=x onerror="alert(1)">',
      role: "<script>alert(1)</script>",
      acceptUrl: "https://example.com/invite?next=one&role=admin",
      expiresAt: "2026-06-22T12:00:00.000Z",
    });

    expect(email.html).not.toContain("<script");
    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("next=one&amp;role=admin");
  });

  it("redirects non-production delivery to the safe test recipient", () => {
    expect(
      resolveEmailRecipient("member@example.com", "preview", "qa@example.com"),
    ).toBe("qa@example.com");
  });

  it("routes Vercel previews to the test recipient even with a shared production setting", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("EMAIL_ENVIRONMENT", "production");
    vi.stubEnv("EMAIL_TEST_RECIPIENT", "qa@example.com");
    expect(resolveEmailRecipient("member@example.com")).toBe("qa@example.com");
  });

  it("uses the intended recipient in Vercel production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("EMAIL_ENVIRONMENT", "development");
    vi.stubEnv("EMAIL_TEST_RECIPIENT", "qa@example.com");
    expect(resolveEmailRecipient("member@example.com")).toBe("member@example.com");
  });

  it("treats an empty composite queue result as no claimed event", () => {
    expect(hasClaimedEmailEvent(null)).toBe(false);
    expect(hasClaimedEmailEvent({ id: null })).toBe(false);
    expect(hasClaimedEmailEvent({ id: "event-id" })).toBe(true);
  });
});
