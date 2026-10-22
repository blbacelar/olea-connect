import { expect, test } from "../fixtures/test-data.fixture";

test.describe("@critical login activation recovery", () => {
  test("established members can sign in during an activation retry outage", async ({
    page,
    testData,
  }) => {
    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
    });
    await page.route("**/api/v1/provisioning/retry", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Activation unavailable" }),
      }),
    );

    await page.goto("/login");
    await page.locator("#loginEmail").fill(member.email);
    await page.locator("#loginPassword").fill(member.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
  });

  test("signup sign-ins reach a retryable screen during an outage", async ({
    page,
    testData,
  }) => {
    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
    });
    await page.route("**/api/v1/provisioning/retry", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Activation unavailable" }),
      }),
    );

    await page.goto(
      "/login?next=%2Fsignup%2Fsuccess%3Factivation%3Dpending_payment",
    );
    await page.locator("#loginEmail").fill(member.email);
    await page.locator("#loginPassword").fill(member.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/signup\/success\?activation=failed/);
    await expect(page.getByRole("button", { name: /retry activation/i })).toBeVisible();
  });
});
