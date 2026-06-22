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

  testWithData("shows activation recovery instead of checkout when billing is syncing", async ({
    browser,
    testData,
    baseURL,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner();
    await testData.createWorkspaceProvisioningRequest(member);
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
        page.getByText("Membership activation is still syncing"),
      ).toBeVisible();
      await expect(page.getByText("Do not start a new checkout.")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Retry activation" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Choose a plan" }),
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  testWithData("shows paid seat confirmation after Stripe confirms an add-on", async ({
    browser,
    testData,
    baseURL,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
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
      await page.goto(`${baseURL}/subscription?seat=added&quantity=3`);
      await expect(
        page.getByRole("status").filter({
          hasText: "3 paid seats added. Stripe has confirmed the update",
        }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
