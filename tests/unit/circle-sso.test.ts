import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("Circle SSO tokens", () => {
  it("creates a short-lived token that preserves Olea identity claims", async () => {
    const { createCircleSsoToken, verifyCircleSsoToken } = await import(
      "@/lib/circle/sso"
    );

    const token = createCircleSsoToken(
      {
        email: "member@example.com",
        name: "Morgan Member",
        externalId: "user_123",
        organizationId: "org_123",
        organizationName: "Olea Test Org",
        organizationRole: "owner",
        tier: "roots",
      },
      "test-secret",
      { now: new Date("2026-06-21T12:00:00.000Z") },
    );

    const payload = verifyCircleSsoToken(token, "test-secret", {
      expectedExternalId: "user_123",
      now: new Date("2026-06-21T12:01:00.000Z"),
    });

    expect(payload).toMatchObject({
      email: "member@example.com",
      external_id: "user_123",
      organization_id: "org_123",
      member_tag: "roots",
    });
  });

  it("rejects tampered, expired, and cross-user tokens", async () => {
    const { createCircleSsoToken, verifyCircleSsoToken } = await import(
      "@/lib/circle/sso"
    );
    const token = createCircleSsoToken(
      {
        email: "member@example.com",
        name: "Morgan Member",
        externalId: "user_123",
        organizationId: "org_123",
        organizationName: "Olea Test Org",
        organizationRole: "member",
        tier: "canopy",
      },
      "test-secret",
      { now: new Date("2026-06-21T12:00:00.000Z"), ttlSeconds: 60 },
    );
    const [payload, signature] = token.split(".");

    expect(() =>
      verifyCircleSsoToken(`${payload}a.${signature}`, "test-secret", {
        now: new Date("2026-06-21T12:00:30.000Z"),
      }),
    ).toThrow("signature");

    expect(() =>
      verifyCircleSsoToken(token, "test-secret", {
        now: new Date("2026-06-21T12:02:00.000Z"),
      }),
    ).toThrow("expired");

    expect(() =>
      verifyCircleSsoToken(token, "test-secret", {
        expectedExternalId: "other_user",
        now: new Date("2026-06-21T12:00:30.000Z"),
      }),
    ).toThrow("subject mismatch");
  });
});
