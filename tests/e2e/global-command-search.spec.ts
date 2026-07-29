import { expect, test } from "../fixtures/authenticated.fixture";
import { AppShellPage } from "../pages/app-shell.page";

test.describe("@smoke global command search", () => {
  test("opens with keyboard shortcut and navigates to a matched command", async ({
    page,
  }) => {
    const app = new AppShellPage(page);

    await app.openDashboard();
    await app.openGlobalSearchWithShortcut();
    await app.searchGlobalCommand("brand");
    await app.expectGlobalSearchResult(/Brand Profile/);
    await app.openActiveGlobalSearchResult();

    await expect(page).toHaveURL(/\/settings\/brand$/);
    await app.expectSectionHeading("Brand profile");
    await app.expectNoServerError();
  });

  test("supports empty states and closes without navigation", async ({ page }) => {
    const app = new AppShellPage(page);

    await app.openDashboard();
    await app.openGlobalSearchFromHeader();
    await app.searchGlobalCommand("no matching command here");

    await expect(page.getByText("No matching results")).toBeVisible();
    await app.closeGlobalSearch();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
