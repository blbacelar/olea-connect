import { expect, type Page } from "@playwright/test";

export class CommunityPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto("/community");
  }

  async openFromDashboardNavigation() {
    await this.page.goto("/dashboard");
    await this.page.getByRole("link", { name: "Community" }).click();
    await expect(this.page).toHaveURL("/community");
  }

  async expectNativeCommunityHome() {
    await expect(
      this.page.getByRole("heading", { level: 1, name: "Community" }),
    ).toBeVisible();
    await expect(this.page.getByText("Native Olea community")).toBeVisible();
    await expect(
      this.page.getByRole("heading", { name: "Olea Connects Community" }),
    ).toBeVisible();
  }

  async expectSpaceVisible(name: string) {
    await expect(this.page.getByText(`# ${name}`, { exact: true })).toBeVisible();
  }

  async expectSpaceHidden(name: string) {
    await expect(this.page.getByText(`# ${name}`, { exact: true })).toHaveCount(
      0,
    );
  }

  async expectPost(title: string, body: string) {
    await expect(this.page.getByRole("heading", { name: title })).toBeVisible();
    await expect(this.page.getByText(body)).toBeVisible();
  }

  async expectZoomEvent(title: string, zoomUrl: string) {
    const event = this.page.getByRole("article").filter({
      has: this.page.getByRole("heading", { name: title }),
    });
    await expect(event).toBeVisible();
    await expect(event.getByRole("link", { name: "Join on Zoom" })).toHaveAttribute(
      "href",
      zoomUrl,
    );
  }

  async expectCommunityManagerControls() {
    await expect(
      this.page.getByText("Community manager", { exact: true }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Create post" }),
    ).toBeDisabled();
  }
}
