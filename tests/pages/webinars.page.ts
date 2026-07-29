import { expect, type Page } from "@playwright/test";

export class WebinarsPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto("/webinars");
  }

  async openCreateForm() {
    await this.page.getByRole("link", { name: "Create webinar" }).click();
  }

  async openManagePage() {
    await this.page.getByRole("link", { name: "Manage webinars" }).click();
  }

  eventCard(title: string) {
    return this.page.getByTestId("webinar-card").filter({ hasText: title });
  }

  manageRow(title: string) {
    return this.page.getByTestId("webinar-manage-row").filter({ hasText: title });
  }

  async openEventDetails(title: string) {
    await this.eventCard(title).getByRole("link", { name: "View details" }).click();
  }

  async expectCreateButtonVisible() {
    await expect(
      this.page.getByRole("link", { name: "Create webinar" }),
    ).toBeVisible();
  }

  async expectCreateButtonHidden() {
    await expect(
      this.page.getByRole("link", { name: "Create webinar" }),
    ).toHaveCount(0);
  }

  async expectManageButtonVisible() {
    await expect(
      this.page.getByRole("link", { name: "Manage webinars" }),
    ).toBeVisible();
  }

  async expectManageButtonHidden() {
    await expect(
      this.page.getByRole("link", { name: "Manage webinars" }),
    ).toHaveCount(0);
  }

  async archiveEventFromManage(title: string) {
    await this.manageRow(title).getByRole("button", { name: "Archive" }).click();
    await expect(
      this.page.getByRole("dialog", { name: "Archive this webinar?" }),
    ).toBeVisible();
    await this.page
      .getByRole("dialog", { name: "Archive this webinar?" })
      .getByRole("button", { name: "Archive webinar" })
      .click();
    await expect(
      this.page.getByRole("dialog", { name: "Archive this webinar?" }),
    ).toHaveCount(0);
  }

  async expectEventVisible(title: string) {
    await expect(this.page.getByRole("heading", { name: title })).toBeVisible();
  }

  async expectEventDetails(title: string) {
    await expect(
      this.page.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
  }

  async registerForEvent(title: string) {
    await this.eventCard(title).getByRole("button", { name: "Register →" }).click();
  }

  async expectRegistered(title: string) {
    const card = this.eventCard(title);
    await expect(card.getByRole("link", { name: "Join Zoom" })).toBeVisible();
    await expect(card.getByRole("button", { name: "Cancel" })).toBeVisible();
  }

  async expectUpgradeRequired(title: string) {
    await expect(this.eventCard(title).getByText("Upgrade required")).toBeVisible();
  }

  async expectPaidTicketComingSoon(title: string) {
    await expect(
      this.eventCard(title).getByRole("button", { name: "Paid ticket coming soon" }),
    ).toBeDisabled();
  }

  async expectRecordingLink(title: string, eventId: string) {
    await expect(this.eventCard(title).getByRole("link", { name: "Watch" })).toHaveAttribute(
      "href",
      `/api/v1/events/${eventId}/recording`,
    );
  }
}
