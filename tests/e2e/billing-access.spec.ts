import { expect, test as testWithData } from "../fixtures/test-data.fixture";
import { createClient } from "@supabase/supabase-js";
import { SubscriptionPage } from "../pages/subscription.page";
import { createAuthenticatedPage } from "../support/auth-session";
import { getTestSupabaseEnvironment } from "../support/test-environment";

testWithData.describe("@critical billing access states", () => {
  testWithData("keeps retired plans out of the public catalogue", async () => {
    const { publishableKey, url } = getTestSupabaseEnvironment({
      requirePublishableKey: true,
    });
    const anonymous = createClient(url, publishableKey!);
    const { data, error } = await anonymous
      .from("membership_plans")
      .select("id")
      .order("sort_order");

    expect(error).toBeNull();
    expect(data?.map((plan) => plan.id)).toEqual([
      "seedling",
      "roots",
      "canopy",
    ]);
  });

  testWithData("does not offer a retired upgrade to Canopy members", async ({
    browser,
    testData,
    baseURL,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "canopy",
    });
    const { context, page } = await createAuthenticatedPage(
      browser,
      baseURL,
      member.email,
      member.password,
    );

    try {
      await page.goto("/subscription");
      await expect(page.getByRole("heading", { name: "Subscription" })).toBeVisible();
      await expect(page.getByTestId("app-main").getByText("Canopy", { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Upgrade your plan" })).toHaveCount(0);
      await expect(page.getByText("Harvest", { exact: true })).toHaveCount(0);
      await page.screenshot({ path: "test-results/retired-tier-canopy-subscription.png" });
    } finally {
      await context.close();
    }
  });

  testWithData("preserves billing details for an existing Harvest subscription", async ({
    browser,
    testData,
    baseURL,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "harvest",
    });
    const { context, page } = await createAuthenticatedPage(
      browser,
      baseURL,
      member.email,
      member.password,
    );

    try {
      await page.goto("/subscription");
      await expect(page.getByRole("heading", { name: "Subscription" })).toBeVisible();
      await expect(page.getByTestId("app-main").getByText("Harvest", { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Upgrade your plan" })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  testWithData("shows complimentary developer Canopy access without billing controls", async ({
    browser,
    testData,
    baseURL,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "canopy",
    });
    const { error } = await testData.supabase
      .from("subscriptions")
      .update({
        billing_interval: "year",
        current_period_end: null,
        metadata: { funding_source: "developer", e2e_marker: member.marker },
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
      const main = page.getByTestId("app-main");
      await expect(main.getByText("Developer access is active. No payment is due for this membership.")).toBeVisible();
      await expect(main.getByText("Canopy", { exact: true })).toBeVisible();
      await expect(main.getByText("No scheduled end").first()).toBeVisible();
      await expect(main.getByRole("button", { name: "Open portal" })).toHaveCount(0);
      await expect(main.getByRole("heading", { name: "Upgrade your plan" })).toHaveCount(0);
      await page.screenshot({ path: "test-results/developer-canopy-subscription.png" });

      await page.goto("/modules/board-training");
      await expect(page.getByTestId("app-main").getByRole("heading", { name: "Board Training" })).toBeVisible();
      await expect(page.getByTestId("app-main").getByText("An active Canopy membership or Board Training add-on is required")).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

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
        page.getByTestId("app-main").getByText("Billing connection needs attention"),
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
