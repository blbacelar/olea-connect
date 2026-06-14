import {
  expect,
  test as testWithData,
} from "../fixtures/test-data.fixture";
import { createAuthenticatedStorageState } from "../fixtures/authenticated.fixture";

testWithData.describe("@critical billing access states", () => {
  testWithData("shows recovery guidance for a past-due membership", async ({
    browser,
    testData,
    baseURL,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      subscriptionStatus: "past_due",
    });
    const context = await browser.newContext({
      storageState: await createAuthenticatedStorageState(
        member.email,
        member.password,
        baseURL,
      ),
    });
    const page = await context.newPage();

    try {
      await page.goto(`${baseURL}/dashboard`);
      await expect(page).toHaveURL("/subscription?billing=required");
      await expect(
        page.getByText("Your membership needs attention"),
      ).toBeVisible();
      await expect(page.getByText("Past due", { exact: true })).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
