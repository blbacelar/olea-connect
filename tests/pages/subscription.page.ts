import { expect, type Page } from "@playwright/test";

export class SubscriptionPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto("/subscription");
  }

  async openDashboard() {
    await this.page.goto("/dashboard");
  }

  async openSeatConfirmation(quantity: number) {
    await this.page.goto(`/subscription?seat=added&quantity=${quantity}`);
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

  async expectPaidSeatConfirmation(quantity: number) {
    await expect(
      this.page.getByRole("status").filter({
        hasText: `${quantity} paid seats added. The billing update is confirmed`,
      }),
    ).toBeVisible();
  }
}
