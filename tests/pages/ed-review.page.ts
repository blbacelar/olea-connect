import { expect, type Page } from "@playwright/test";

export class EdReviewPage {
  constructor(readonly page: Page) {}

  async open() {
    await this.page.goto("/modules/ed-review");
    await expect(
      this.page.getByRole("heading", { name: "ED/CEO annual review" }),
    ).toBeVisible();
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
    return linkInput.inputValue();
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
}
