import { expect, type Page } from "@playwright/test";

export class PasswordRecoveryPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto("/reset-password");
  }

  async requestReset(email: string) {
    await this.page.getByLabel("Email address").fill(email);
    const sendResetLink = this.page.getByTestId("send-reset-link");
    await expect(sendResetLink).toBeVisible({ timeout: 15_000 });
    await expect(sendResetLink).toBeEnabled({ timeout: 15_000 });
    await sendResetLink.click();
  }

  async expectResetEmailSent(email: string) {
    await expect(
      this.page.getByRole("heading", { name: "Check your email" }),
    ).toBeVisible();
    await expect(this.page.getByText(email)).toBeVisible();
  }
}
