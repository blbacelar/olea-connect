import { expect, type Page } from "@playwright/test";

export class SubscriptionPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto("/subscription");
  }

  async openDashboard() {
    await this.page.goto("/dashboard");
  }

  async openSeatPaymentSubmitted(quantity: number) {
    await this.page.goto(
      `/subscription?seat=payment_submitted&quantity=${quantity}`,
    );
  }

  async expectActiveMembership(organizationName: string) {
    await expect(this.page).toHaveURL("/subscription");
    await expect(
      this.page.getByRole("heading", { name: "Subscription" }),
    ).toBeVisible();
    await expect(
      this.page.getByText(`Manage billing for ${organizationName}.`),
    ).toBeVisible();
    await expect(
      this.page.getByText("Your membership is active and platform access is enabled."),
    ).toBeVisible();
  }

  async expectPastDueRecovery() {
    await expect(this.page).toHaveURL("/subscription?billing=required");
    await expect(this.page.getByText("Your membership needs attention")).toBeVisible();
    await expect(this.page.getByText("Past due", { exact: true })).toBeVisible();
  }

  async expectActivationSyncingRecovery() {
    await expect(this.page).toHaveURL("/subscription?billing=required");
    await expect(
      this.page.getByText("Membership activation is still syncing"),
    ).toBeVisible();
    await expect(this.page.getByText("Do not start a new checkout.")).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Retry activation" }),
    ).toBeVisible();
    await expect(this.page.getByRole("link", { name: "Choose a plan" })).toHaveCount(
      0,
    );
  }

  async expectPaidSeatPaymentSubmitted() {
    await expect(
      this.page.getByRole("status").filter({
        hasText:
          "Payment submitted. Your seat access will appear after payment confirmation.",
      }),
    ).toBeVisible();
  }
}
