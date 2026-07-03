import { expect, type Page } from "@playwright/test";

export class TeamPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto("/team");
  }

  async expectMemberEmail(email: string) {
    await expect(this.page.getByText(email)).toBeVisible();
  }

  async inviteMember(email: string) {
    await this.open();
    await this.page.getByLabel("Team member email").fill(email);
    const sendInvite = this.page.getByRole("button", { name: "Send invite" });
    await expect(sendInvite).toBeVisible({ timeout: 15_000 });
    await expect(sendInvite).toBeEnabled({ timeout: 15_000 });
    await sendInvite.click();
    await expect(this.page.getByText(email)).toBeVisible();
  }

  async cancelInvitation(email: string) {
    const inviteRow = this.page.getByRole("group", {
      name: `Invitation for ${email}`,
    });
    await inviteRow.getByRole("button", { name: "Cancel" }).click();
    await expect(this.page.getByText(email)).toHaveCount(0);
  }
}
