import { expect, test as testWithData } from "../fixtures/test-data.fixture";
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

  testWithData("shows pending confirmation after a paid seat checkout", async ({
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
      await subscription.openSeatPaymentSubmitted(3);
      await subscription.expectPaidSeatPaymentSubmitted();
    } finally {
      await context.close();
    }
  });

  testWithData("handles missing Stripe customer", async ({
    browser,
    testData,
    baseURL,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
    });
    const { error } = await testData.supabase
      .from("subscriptions")
      .update({
        provider_customer_id: "cus_missing_e2e",
        provider_subscription_id: "sub_missing_e2e",
      })
      .eq("id", member.subscriptionId);
    if (error) throw error;

    const { context, page } = await createAuthenticatedPage(
      browser,
      baseURL,
      member.email,
      member.password,
    );

    try {
      await page.goto("/subscription");
      await expect(
        page.getByRole("heading", { name: "Subscription" }),
      ).toBeVisible();
      await expect(
        page.getByText("Billing connection needs attention"),
      ).toBeVisible();
      await expect(page.getByText("Billing unverified")).toBeVisible();
      await expect(
        page.getByText("Your membership is active and platform access is enabled."),
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});
