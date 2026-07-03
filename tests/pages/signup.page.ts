import { expect, type Page } from "@playwright/test";

export class SignupPage {
  constructor(private readonly page: Page) {}

  async openAccount(tier = "roots", billing = "monthly") {
    await this.page.goto(`/signup/account?tier=${tier}&billing=${billing}`);
    await expect(
      this.page.getByRole("heading", { name: "Create your account" }),
    ).toBeVisible();
  }

  async completeAccountDetails({
    organization,
    fullName,
    email,
    password,
  }: {
    organization: string;
    fullName: string;
    email: string;
    password: string;
  }) {
    await this.page.getByLabel("Organization name *").fill(organization);
    await this.page.getByLabel("Your name *").fill(fullName);
    await this.page.getByLabel("Email address *").fill(email);
    await this.page.getByLabel("Password *").fill(password);
    await this.page
      .getByLabel("I agree to the Terms of Service and Privacy Policy.")
      .check();
  }

  async enterOrganizationName(organization: string) {
    await this.page.getByLabel("Organization name *").fill(organization);
  }

  async enterPassword(password: string) {
    await this.page.getByLabel("Password *").fill(password);
  }

  async expectOrganizationName(organization: string) {
    await expect(this.page.getByLabel("Organization name *")).toHaveValue(
      organization,
    );
  }

  async expectPasswordCleared() {
    await expect(this.page.getByLabel("Password *")).toHaveValue("");
  }

  async reloadAccountStep() {
    await this.page.reload();
    await expect(
      this.page.getByRole("heading", { name: "Create your account" }),
    ).toBeVisible();
  }

  async continueToPaymentStep() {
    await this.continueToPayment.click();
  }

  async expectPaymentStep({
    planHeading,
    price,
  }: {
    planHeading: string;
    price: string;
  }) {
    await expect(this.page).toHaveURL("/signup/payment");
    await expect(
      this.page.getByRole("heading", { name: "Activate your membership" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("heading", { name: planHeading }),
    ).toBeVisible();
    await expect(this.page.getByText(price)).toBeVisible();
  }

  async goBackToPlans() {
    await this.page.getByRole("button", { name: "← Back to plan" }).click();
  }

  async expectLandingPlansVisible() {
    await expect(this.page).toHaveURL("/#plans");
    await expect(
      this.page.getByRole("heading", {
        name: "Choose the support that fits today.",
      }),
    ).toBeVisible();
  }

  get continueToPayment() {
    return this.page.getByRole("button", { name: "Continue to payment →" });
  }
}
