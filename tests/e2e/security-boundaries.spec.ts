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

  test("rejects unsigned Stripe webhook requests", async ({ request }) => {
    const response = await request.post("/api/stripe/webhook");

    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Missing Stripe signature.",
    });
  });

  test("rejects unsigned Resend webhook requests", async ({ request }) => {
    const response = await request.post("/api/email/webhook");

    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Missing Resend webhook signature.",
    });
  });

  test("protects the email outbox processor", async ({ request }) => {
    const response = await request.get("/api/email/process");

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized.",
    });
  });
});
