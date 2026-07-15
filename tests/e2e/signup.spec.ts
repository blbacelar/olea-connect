import { expect, test } from "@playwright/test";

import { createTestIdentity } from "../factories/identity";
import { SignupPage } from "../pages/signup.page";

test.describe("@smoke @critical membership signup", () => {
  test("keeps payment disabled until valid account details are complete", async ({
    page,
  }, testInfo) => {
    const signup = new SignupPage(page);
    const identity = createTestIdentity(testInfo);
    await signup.openAccount("seedling", "annual");

    await expect(signup.continueToPayment).toBeDisabled();

    await signup.completeAccountDetails({
      organization: identity.organizationName,
      fullName: identity.fullName,
      email: identity.email,
      password: identity.password,
    });

    await expect(signup.continueToPayment).toBeEnabled();
    await signup.continueToPaymentStep();
    await signup.expectPaymentStep({
      billingPeriod: "/year",
      planHeading: "🌱 Seedling",
      price: "$800",
    });
  });

  test("does not persist the password in browser storage", async ({ page }) => {
    const signup = new SignupPage(page);
    await signup.openAccount();

    await signup.enterOrganizationName("Persistent Org");
    await signup.enterPassword("NeverStoreThis123!");
    await signup.reloadAccountStep();

    await signup.expectOrganizationName("Persistent Org");
    await signup.expectPasswordCleared();
  });

  test("returns from account creation to landing-page plans", async ({
    page,
  }) => {
    const signup = new SignupPage(page);
    await signup.openAccount();

    await signup.goBackToPlans();
    await signup.expectLandingPlansVisible();
  });
});
