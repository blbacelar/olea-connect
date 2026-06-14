import { expect, test } from "../fixtures/authenticated.fixture";

test.describe("@critical @member authenticated access", () => {
  test("opens protected pages with an API-created session", async ({
    page,
    authenticatedMember,
  }) => {
    await page.goto("/subscription");

    await expect(page).toHaveURL("/subscription");
    await expect(
      page.getByRole("heading", { name: "Subscription" }),
    ).toBeVisible();
    await expect(
      page.getByText(`Manage billing for ${authenticatedMember.organizationName}.`),
    ).toBeVisible();
    await expect(
      page.getByText("Your membership is active and platform access is enabled."),
    ).toBeVisible();
  });
});
