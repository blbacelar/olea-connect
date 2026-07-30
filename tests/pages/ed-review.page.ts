import { expect, type Page } from "@playwright/test";

export class EdReviewPage {
  constructor(readonly page: Page) {}

  async open() {
    await this.page.goto("/modules/ed-review");
    await expect(
      this.page.getByRole("heading", { name: "ED/CEO annual review" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("link", { name: "Back to resources" }),
    ).toHaveCount(0);
  }

  async openCampaigns() {
    await this.page.getByRole("tab", { name: "Campaigns" }).click();
    await expect(
      this.page.getByRole("heading", { name: "Feedback campaigns" }),
    ).toBeVisible();
  }

  async openCycle() {
    await this.openCampaigns();
    await this.page.getByRole("button", { name: "Open review" }).click();
    await expect(
      this.page.getByRole("button", { name: "Close review" }),
    ).toBeVisible();
  }

  async closeCycle() {
    await this.openCampaigns();
    await this.page.getByRole("button", { name: "Close review" }).click();
    await expect(
      this.page.getByRole("button", { name: "Close review" }),
    ).not.toBeVisible();
  }

  async createStaffCampaign(title: string) {
    await this.page.getByRole("button", { name: "Create campaign" }).click();
    const dialog = this.page.getByRole("dialog");
    await dialog.getByLabel("Campaign title").fill(title);
    await dialog.getByRole("button", { name: "Create campaign" }).click();
    const linkInput = this.page.getByLabel("New anonymous survey link");
    await expect(linkInput).toBeVisible();
    await expect(dialog).not.toBeVisible();
    const surveyUrl = await linkInput.inputValue();
    expect(new URL(surveyUrl).origin).toBe(new URL(this.page.url()).origin);
    return surveyUrl;
  }

  async assignHrReviewer(name: string) {
    await this.page.getByRole("tab", { name: "Access & audit" }).click();
    await this.page.getByRole("button", { name: "Assign reviewer" }).click();
    const dialog = this.page.getByRole("dialog");
    await dialog.getByLabel("Workspace member").click();
    await this.page.getByRole("option", { name, exact: true }).click();
    await dialog.getByLabel("Confidential reviewer role").click();
    await this.page.getByRole("option", { name: "HR reviewer" }).click();
    await dialog.getByRole("button", { name: "Assign reviewer" }).click();
    await expect(
      this.page
        .getByTestId("ed-review-reviewer-list")
        .getByText(name, { exact: true }),
    ).toBeVisible();
  }

  async updateReviewerRole(
    name: string,
    role: "Board Chair" | "HR reviewer",
  ) {
    await this.page.getByRole("tab", { name: "Access & audit" }).click();
    await this.page
      .getByRole("button", { name: `Edit access for ${name}` })
      .click();
    const dialog = this.page.getByRole("dialog");
    await dialog.getByLabel("Updated confidential reviewer role").click();
    await this.page.getByRole("option", { name: role, exact: true }).click();
    await dialog.getByRole("button", { name: "Save access" }).click();
    await expect(
      this.page.getByText("reviewer access updated", { exact: true }),
    ).toBeVisible();
  }

  async removeReviewerAccess(name: string) {
    await this.page.getByRole("tab", { name: "Access & audit" }).click();
    await this.page
      .getByRole("button", { name: `Remove access for ${name}` })
      .click();
    const dialog = this.page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Remove confidential access?" }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Remove access" }).click();
    await expect(
      this.page
        .getByTestId("ed-review-reviewer-list")
        .getByText(name, { exact: true }),
    ).toHaveCount(0);
  }

  async expectSoleBoardChairAccessToBeProtected(name: string) {
    await this.page.getByRole("tab", { name: "Access & audit" }).click();
    await expect(
      this.page.getByRole("button", { name: `Edit access for ${name}` }),
    ).toBeDisabled();
    await expect(
      this.page.getByRole("button", { name: `Remove access for ${name}` }),
    ).toBeDisabled();
    await expect(
      this.page.getByText(
        "This review needs at least one Board Chair. Assign another Board Chair before changing or removing the current access.",
      ),
    ).toBeVisible();
  }

  async appointBoardChairFromRecovery(name: string) {
    await expect(
      this.page.getByRole("heading", { name: "Appoint a Board Chair" }),
    ).toBeVisible();
    await this.page.getByLabel("Active workspace member").click();
    await this.page.getByRole("option", { name, exact: true }).click();
    await this.page
      .getByRole("button", { name: "Appoint Board Chair" })
      .click();
    await expect(
      this.page.getByText("Board Chair access was assigned."),
    ).toBeVisible();
  }
}
