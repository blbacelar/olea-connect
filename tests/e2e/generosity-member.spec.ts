import { expect, test } from "../fixtures/authenticated.fixture";

test.describe("@critical Circle of Generosity member experience", () => {
  test("shows unrestricted donations without offering Olea grant applications", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByText("Circle of Generosity").first()).toBeVisible();
    await expect(page.getByText("15%", { exact: true })).toBeVisible();
    await expect(page.getByText("of profits flow back to nonprofits")).toBeVisible();
    await expect(page.getByTestId("app-sidebar").getByRole("link", { name: "Grants" }))
      .toHaveCount(0);
    await expect(page.getByTestId("app-sidebar").getByRole("link", { name: "Templates" }))
      .toHaveCount(0);
    await expect(page.getByTestId("app-sidebar").getByRole("link", { name: "Consulting" }))
      .toHaveCount(0);
    await expect(page.getByTestId("app-sidebar").getByRole("link", { name: "Grant Platform" }))
      .toBeVisible();

    await page.goto("/grants");
    await expect(page.getByRole("heading", { name: "Olea's Circle of Generosity" }))
      .toBeVisible();
    await expect(page.getByText(/15% of its profits to nonprofits as unrestricted donations/))
      .toBeVisible();
    await expect(page.getByRole("button", { name: /apply/i })).toHaveCount(0);

    await page.goto("/sponsors");
    await expect(page.getByRole("heading", { name: "Sponsors & Olea's Circle of Generosity" }))
      .toBeVisible();
    await expect(page.getByText("Reconciliation rule")).toHaveCount(0);
    await expect(page.getByText("Private finance boundary")).toHaveCount(0);
  });
});
