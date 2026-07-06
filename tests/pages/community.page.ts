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

  async expectPostHidden(title: string) {
    await expect(this.page.getByRole("heading", { name: title })).toHaveCount(0);
  }

  async createPost({
    body,
    kind = "discussion",
    resourceUrl,
    spaceName = "General",
    title,
  }: {
    body: string;
    kind?: "announcement" | "discussion" | "resource";
    resourceUrl?: string;
    spaceName?: string;
    title: string;
  }) {
    await this.page.getByRole("button", { name: "Create post" }).click();
    await this.page.getByLabel("Space").click();
    await this.page.getByRole("option", { name: spaceName }).click();
    await this.page.getByLabel("Post type").click();
    await this.page
      .getByRole("option", {
        name:
          kind === "announcement"
            ? "Announcement"
            : kind === "resource"
              ? "Resource"
              : "Discussion",
      })
      .click();
    await this.page.getByLabel("Title").fill(title);
    await this.page.getByLabel("Post", { exact: true }).fill(body);

    if (resourceUrl) {
      await this.page.getByLabel("Resource link optional").fill(resourceUrl);
    }

    const publishButton = this.page.getByRole("button", { name: "Publish post" });
    await expect(publishButton).toBeVisible();
    await expect(publishButton).toBeEnabled();
    await publishButton.click();
  }

  async expectPostPublished() {
    await expect(
      this.page.getByText("Your post is live in the community."),
    ).toBeVisible();
  }

  async expectModerationBlocked() {
    await expect(
      this.page.getByRole("alert").filter({
        hasText: /community guidelines|respectful tone|friendly/i,
      }),
    ).toBeVisible();
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
    await expect(this.page.getByRole("button", { name: "Create post" })).toBeEnabled();
  }
}
