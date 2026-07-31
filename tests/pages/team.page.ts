import { expect, type Page } from "@playwright/test";

export class TeamPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto("/team");
  }

  async expectMemberEmail(email: string) {
    await expect(this.page.getByText(email)).toBeVisible();
  }

  async expectDirectoryMembers(...emails: string[]) {
    for (const email of emails) {
      await this.expectMemberEmail(email);
    }
  }

  async expectMemberManagementControlsHidden() {
    await expect(this.page.getByTestId("send-invite")).toHaveCount(0);
    await expect(this.page.getByRole("link", { name: "Manage seats" })).toHaveCount(0);
    await expect(this.page.getByRole("button", { name: /^Remove / })).toHaveCount(0);
  }

  async inviteMember(email: string) {
    await this.open();
    await this.page.getByLabel("Team member email").fill(email);
    const sendInvite = this.page.getByTestId("send-invite");
    await expect(sendInvite).toBeVisible({ timeout: 15_000 });
    await expect(sendInvite).toBeEnabled({ timeout: 15_000 });
    await sendInvite.click();
    await expect(this.page.getByText(email)).toBeVisible();
  }

  async expectExistingAccountInviteAlert(email: string) {
    await this.open();
    await this.page.getByLabel("Team member email").fill(email);
    const sendInvite = this.page.getByTestId("send-invite");
    await expect(sendInvite).toBeVisible({ timeout: 15_000 });
    await expect(sendInvite).toBeEnabled({ timeout: 15_000 });
    await sendInvite.click();

    const alert = this.page
      .getByRole("alert")
      .filter({ hasText: "Invite not sent" });
    await expect(alert).toContainText("Invite not sent");
    await expect(alert).toContainText("already registered with Olea Connects");
    await expect(
      this.page.getByRole("group", { name: `Invitation for ${email}` }),
    ).toHaveCount(0);
  }

  async cancelInvitation(email: string) {
    const inviteRow = this.page.getByRole("group", {
      name: `Invitation for ${email}`,
    });
    await inviteRow.getByRole("button", { name: "Cancel" }).click();
    await expect(this.page.getByText(email)).toHaveCount(0);
  }
}
