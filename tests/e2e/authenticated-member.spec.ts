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

  test("loads organization-scoped member platform data", async ({
    page,
    authenticatedMember,
  }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByText(authenticatedMember.organizationName).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Board Self-Evaluation" }),
    ).toBeVisible();

    await page.goto("/templates");
    await expect(
      page.getByRole("heading", { name: "Board Self-Evaluation" }),
    ).toBeVisible();

    await page.goto("/team");
    await expect(page.getByText(authenticatedMember.email)).toBeVisible();

    await page.goto("/grants");
    await expect(
      page.getByRole("heading", { name: "Q3 2026 Community Grant" }),
    ).toBeVisible();

    await page.goto("/webinars");
    await expect(
      page.getByRole("heading", {
        name: "Governance Best Practices for Small Nonprofits",
      }),
    ).toBeVisible();
  });
});
