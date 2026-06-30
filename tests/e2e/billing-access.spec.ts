import { test as testWithData } from "../fixtures/test-data.fixture";
import { SubscriptionPage } from "../pages/subscription.page";
import { createAuthenticatedPage } from "../support/auth-session";

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
    const { context, page } = await createAuthenticatedPage(
      browser,
      baseURL,
      member.email,
      member.password,
    );
    const subscription = new SubscriptionPage(page);

    try {
      await subscription.openDashboard();
      await subscription.expectPastDueRecovery();
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
    const { context, page } = await createAuthenticatedPage(
      browser,
      baseURL,
      member.email,
      member.password,
    );
    const subscription = new SubscriptionPage(page);

    try {
      await subscription.openDashboard();
      await subscription.expectActivationSyncingRecovery();
    } finally {
      await context.close();
    }
  });

  testWithData("shows paid seat confirmation after billing confirms an add-on", async ({
    browser,
    testData,
    baseURL,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
    });
    const { context, page } = await createAuthenticatedPage(
      browser,
      baseURL,
      member.email,
      member.password,
    );
    const subscription = new SubscriptionPage(page);

    try {
      await subscription.openSeatConfirmation(3);
      await subscription.expectPaidSeatConfirmation(3);
    } finally {
      await context.close();
    }
  });
});
