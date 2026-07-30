import { expect, type Page } from "@playwright/test";

export class TeamInvitationAcceptancePage {
  constructor(private readonly page: Page) {}

  async open(token: string) {
    await this.page.goto(`/team/invitations/accept?token=${encodeURIComponent(token)}`);
  }

  async expectNewAccountForm(email: string) {
    await expect(
      this.page.getByRole("heading", { name: "Join the organization" }),
    ).toBeVisible();
    const invitedEmail = this.page.getByLabel("Invited email");
    await expect(invitedEmail).toHaveValue(email);
    await expect(invitedEmail).toHaveAttribute("readonly", "");
  }

  async createAccount(fullName: string, password: string) {
    await this.page.getByLabel("Full name").fill(fullName);
    await this.page.getByLabel("Create a password").fill(password);
    const createAccount = this.page.getByTestId("create-invited-account");
    await expect(createAccount).toBeEnabled();
    await createAccount.click();
  }

  async expectCreateAccountDisabled() {
    await expect(
      this.page.getByTestId("create-invited-account"),
    ).toBeDisabled();
  }

  async expectConfirmationRequired() {
    const confirmation = this.page.getByText(
      "Check your email to confirm your account.",
    );

    await expect(confirmation).toBeVisible({ timeout: 15_000 });
  }

  async expectWrongAccount(email: string) {
    await expect(
      this.page.getByTestId("invitation-wrong-account"),
    ).toContainText(email);
    await expect(
      this.page.getByTestId("accept-team-invitation"),
    ).toHaveCount(0);
  }

  async acceptInvitation() {
    const accept = this.page.getByTestId("accept-team-invitation");
    await expect(accept).toBeVisible();
    await expect(accept).toBeEnabled();
    await accept.click();
  }

  async expectAcceptInvitation() {
    const accept = this.page.getByTestId("accept-team-invitation");
    await expect(accept).toBeVisible({ timeout: 15_000 });
    await expect(accept).toBeEnabled();
  }

  async expectAccepted() {
    await expect(
      this.page.getByRole("heading", { name: "Invitation accepted" }),
    ).toBeVisible();
  }

  async expectUnavailable() {
    await expect(
      this.page.getByRole("heading", { name: "Invitation unavailable" }),
    ).toBeVisible();
  }
}
