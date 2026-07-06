import { expect, test } from "@playwright/test";

test.describe("@smoke @critical security boundaries", () => {
  test("redirects anonymous members to login and preserves the destination", async ({
    page,
  }) => {
    await page.goto("/subscription");

    await expect(page).toHaveURL("/login?next=%2Fsubscription");
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
  });

  test("globally protects member-only pages", async ({ page }) => {
    const protectedPaths = [
      "/dashboard",
      "/templates",
      "/templates/board-meeting-agenda",
      "/team",
      "/settings/brand",
      "/grants",
      "/webinars",
      "/community",
      "/help",
      "/whats-new",
    ];

    for (const protectedPath of protectedPaths) {
      await page.goto(protectedPath);

      await expect(page).toHaveURL(
        `/login?next=${encodeURIComponent(protectedPath)}`,
      );
      await expect(
        page.getByRole("heading", { name: "Welcome back" }),
      ).toBeVisible();
    }
  });

  test("rejects unsigned Stripe webhook requests on v1 and legacy routes", async ({
    request,
  }) => {
    const v1Response = await request.post("/api/v1/stripe/webhook");
    const legacyResponse = await request.post("/api/stripe/webhook");

    expect(v1Response.status()).toBe(400);
    await expect(v1Response.json()).resolves.toEqual({
      error: "Missing Stripe signature.",
    });
    expect(legacyResponse.status()).toBe(400);
    await expect(legacyResponse.json()).resolves.toEqual({
      error: "Missing Stripe signature.",
    });
  });

  test("rejects unsigned Resend webhook requests on v1 and legacy routes", async ({
    request,
  }) => {
    const v1Response = await request.post("/api/v1/email/webhook");
    const legacyResponse = await request.post("/api/email/webhook");

    expect(v1Response.status()).toBe(400);
    await expect(v1Response.json()).resolves.toEqual({
      error: "Missing Resend webhook signature.",
    });
    expect(legacyResponse.status()).toBe(400);
    await expect(legacyResponse.json()).resolves.toEqual({
      error: "Missing Resend webhook signature.",
    });
  });

  test("protects v1 cron processors without CRON_SECRET", async ({ request }) => {
    const protectedRoutes = [
      "/api/v1/email/process",
      "/api/v1/circle/process",
      "/api/v1/attio/process",
      "/api/v1/quickbooks/process",
      "/api/v1/community/moderation/process",
      "/api/v1/provisioning/reconcile",
    ];

    for (const route of protectedRoutes) {
      const response = await request.get(route);

      expect(response.status()).toBe(401);
      await expect(response.json()).resolves.toEqual({
        error: "Unauthorized.",
      });
    }
  });

  test("keeps legacy email outbox processor protected", async ({ request }) => {
    const response = await request.get("/api/email/process");

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
  });

  test("protects member-only v1 mutation APIs without a session", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/provisioning/retry");

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Sign in to retry membership activation.",
    });
  });
});
