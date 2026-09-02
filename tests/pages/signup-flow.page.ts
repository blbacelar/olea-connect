import { expect, type Page } from "@playwright/test";

const legalDocuments = [
  "Terms of Service",
  "Privacy Policy",
  "Data Ownership Agreement",
  "Confidentiality Policy",
] as const;

export class SignupFlowPage {
  constructor(private readonly page: Page) {}

  async openAccount({
    tier = "roots",
    billing = "annual",
    referral,
  }: {
    tier?: string;
    billing?: string;
    referral?: string;
  } = {}) {
    const query = new URLSearchParams({ tier, billing });
    if (referral) query.set("ref", referral);

    await this.page.goto(`/signup/account?${query.toString()}`);
    await expect(
      this.page.getByRole("heading", { name: "Create your account" }),
    ).toBeVisible();
  }

  async fillRequiredAccountDetails() {
    await this.page
      .getByLabel("Organization name *")
      .fill("QA Signup Organization");
    await this.page.getByLabel("Your name *").fill("QA Signup Owner");
    await this.select("Organization type *", "Nonprofit");
    await this.select("Approximate board size *", "6-10 members");
    await this.select("Annual organizational budget *", "Under $250,000");
    await this.page
      .getByLabel("Email address *")
      .fill("qa-signup@oleaconnects.test");
    await this.page.getByLabel("Password *").fill("StrongPass123!");
  }

  async select(label: string, option: string) {
    await this.page.getByRole("combobox", { name: label }).click();
    await this.page.getByRole("option", { name: option, exact: true }).click();
  }

  get continueToPayment() {
    return this.page.getByRole("button", { name: "Continue to payment" });
  }

  async openPayment() {
    await expect(this.continueToPayment).toBeEnabled();
    await this.continueToPayment.click();
    await expect(
      this.page.getByRole("heading", { name: "Activate your membership" }),
    ).toBeVisible();
  }

  get secureCheckoutButton() {
    return this.page.getByRole("button", {
      name: "Continue to secure checkout",
    });
  }

  async acceptAllLegalDocuments() {
    for (const document of legalDocuments) {
      await this.page
        .getByText(`I agree to the ${document}`, { exact: false })
        .locator("..")
        .getByRole("checkbox")
        .check();
    }
  }

  async expectLegalDocumentsVisible() {
    for (const document of legalDocuments) {
      await expect(
        this.page.getByRole("link", { name: document, exact: true }),
      ).toBeVisible();
    }
  }
}
