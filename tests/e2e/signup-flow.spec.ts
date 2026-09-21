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

  test("normalizes a founding-member code and defers discount confirmation to checkout", async ({
    page,
  }) => {
    const signup = new SignupFlowPage(page);

    await signup.openAccount();
    await signup.fillRequiredAccountDetails();
    const code = await signup.enterFoundingMemberCode("founding-test-code");

    await expect(code).toHaveValue("FOUNDING-TEST-CODE");
    await signup.openPayment();
    await expect(page.getByText("$3,200 CAD", { exact: false })).toBeVisible();
    await expect(
      page.getByText(/We will validate it securely and apply 15% off Year 1/),
    ).toBeVisible();
  });

  test("blocks progression when the founding-member code is not valid", async ({
    page,
  }) => {
    const signup = new SignupFlowPage(page);

    await signup.openAccount();
    await signup.fillRequiredAccountDetails();
    await signup.enterFoundingMemberCode("NOT A CODE!");

    await expect(
      page.getByText("Use 4-32 letters, numbers, or hyphens."),
    ).toBeVisible();
    await expect(signup.continueToPayment).toBeDisabled();
  });
});
