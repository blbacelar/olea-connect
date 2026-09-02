import { expect, test } from "../fixtures/browser.fixture";

import { SignupFlowPage } from "../pages/signup-flow.page";

test.describe("@signup @critical approved signup flow", () => {
  test("preserves the first referral and gates checkout on all legal consents", async ({
    page,
  }) => {
    const signup = new SignupFlowPage(page);

    await signup.openAccount({ referral: "OLEA-ABC123" });
    await expect(page.getByLabel("Referral code")).toHaveValue("OLEA-ABC123");

    await signup.fillRequiredAccountDetails();
    await page.goto("/signup/account?tier=roots&billing=annual");
    await expect(page.getByLabel("Referral code")).toHaveValue("OLEA-ABC123");
    await expect(page.getByLabel("Password *")).toHaveValue("");
    await page.getByLabel("Password *").fill("StrongPass123!");
    await signup.openPayment();

    await signup.expectLegalDocumentsVisible();
    await expect(signup.secureCheckoutButton).toBeDisabled();

    await signup.acceptAllLegalDocuments();
    await expect(signup.secureCheckoutButton).toBeEnabled();
    await expect(page.getByText("QA Signup Organization", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Roots", exact: true }),
    ).toBeVisible();
  });

  test("does not enable account progression when required organization fields are missing", async ({
    page,
  }) => {
    const signup = new SignupFlowPage(page);

    await signup.openAccount();
    await expect(signup.continueToPayment).toBeDisabled();

    await page.getByLabel("Organization name *").fill("Incomplete Organization");
    await page.getByLabel("Your name *").fill("Incomplete Owner");
    await page.getByLabel("Email address *").fill("incomplete@oleaconnects.test");
    await page.getByLabel("Password *").fill("StrongPass123!");

    await expect(signup.continueToPayment).toBeDisabled();
  });
});
