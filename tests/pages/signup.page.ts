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

  get continueToPayment() {
    return this.page.getByRole("button", { name: "Continue to payment →" });
  }
}
