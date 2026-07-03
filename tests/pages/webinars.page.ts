import { expect, type Page } from "@playwright/test";

export class WebinarsPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto("/webinars");
  }

  eventCard(title: string) {
    return this.page.getByTestId("webinar-card").filter({ hasText: title });
  }

  async expectEventVisible(title: string) {
    await expect(this.page.getByRole("heading", { name: title })).toBeVisible();
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
