import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

async function switchToFrench(page: Page) {
  await page.getByTestId("locale-selector").click();
  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/api/locale") && response.ok(),
    ),
    page.getByRole("option", { name: "Français" }).click(),
  ]);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr-CA");
}

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
    await expect(page.getByText("$162 CAD/hour")).toHaveCount(0);
    await expect(page.getByText("$100 CAD/hour")).toHaveCount(0);
    await expect(
      page.getByText(
        "Package prices are shown as all-in rates for planning. Contact us to confirm availability.",
      ),
    ).toHaveCount(2);
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

  test("does not show hourly rates in French optional support", async ({
    page,
  }) => {
    await page.goto("/");
    await switchToFrench(page);

    await expect(page.getByText("Coaching d'impact")).toBeVisible();
    await expect(page.getByText("1\u00A0944\u00A0$ CA")).toBeVisible();
    await expect(page.getByText("162 $ CA/heure")).toHaveCount(0);
    await expect(page.getByText("100 $ CA/heure")).toHaveCount(0);
    await expect(
      page.getByText(
        "Les prix des forfaits sont indiqués comme tarifs tout compris aux fins de planification. Contactez-nous pour confirmer la disponibilité.",
      ),
    ).toHaveCount(2);
  });
});
