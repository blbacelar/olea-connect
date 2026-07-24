import { expect, test } from "@playwright/test";

test.describe("public pricing package", () => {
  test("shows the approved membership and support catalog", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Choose the support that fits today." }),
    ).toBeVisible();
    await expect(page.getByText("$800 CAD").first()).toBeVisible();
    await expect(
      page.getByText("5 seats included", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("$15 CAD one-time per seat", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Optional support")).toBeVisible();
    await expect(page.getByText("Impact Coaching")).toBeVisible();
    await expect(page.getByText("$7,776 CAD")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Board Retreat Facilitation" }),
    ).toBeVisible();
    await expect(page.getByText("Circle of generosity")).toBeVisible();
    await expect(page.getByText("$250 Olea Gives grant")).toBeVisible();
    await expect(page.getByText("No free trial")).toBeVisible();
    await expect(
      page.getByText(
        "30 days' notice before renewal; membership fees are non-refundable.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Choose Seedling" }),
    ).toHaveAttribute("href", "/signup/account?tier=seedling&billing=annual");
  });

  test("switches membership pricing and signup links to quarterly billing", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Quarterly" }).click();

    await expect(page.getByText("$200 CAD").first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Choose Seedling" }),
    ).toHaveAttribute("href", "/signup/account?tier=seedling&billing=quarterly");
  });
});
