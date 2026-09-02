import { expect, test } from "../fixtures/browser.fixture";

import { createTestIdentity } from "../factories/identity";
import { SignupPage } from "../pages/signup.page";

test.describe("@smoke @critical membership signup", () => {
  test("redirects direct payment access back to account details", async ({
    page,
  }) => {
    await page.goto("/signup/payment");

    await expect(page).toHaveURL(/\/signup\/account/);
    await expect(
      page.getByRole("heading", { name: "Create your account" }),
    ).toBeVisible();
  });

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
      planHeading: "Seedling",
      price: "$800",
    });
  });

  test("accepts a valid email copied with surrounding spaces", async ({
    page,
  }, testInfo) => {
    const signup = new SignupPage(page);
    const identity = createTestIdentity(testInfo);
    await signup.openAccount("seedling", "annual");

    await signup.completeAccountDetails({
      organization: identity.organizationName,
      fullName: identity.fullName,
      email: ` ${identity.email} `,
      password: identity.password,
    });

    await expect(signup.continueToPayment).toBeEnabled();
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

  test("filters letters from the phone field as the user types", async ({
    page,
  }) => {
    const signup = new SignupPage(page);
    await signup.openAccount();

    await signup.enterPhone("+1 (604) 555-0123abc");

    await signup.expectPhone("+1 (604) 555-0123");
  });

  test("formats a complete phone number when focus leaves the field", async ({
    page,
  }) => {
    const signup = new SignupPage(page);
    await signup.openAccount();

    await signup.enterPhone("6045550100");
    await page.getByLabel("Phone number").blur();

    await signup.expectPhone("(604) 555-0100");
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
