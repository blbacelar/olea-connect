import { expect, type Page } from "@playwright/test";

export class TemplatesPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto("/templates");
  }

  async expectTemplateVisible(templateName: string) {
    await expect(
      this.page.getByRole("heading", { name: templateName }),
    ).toBeVisible();
  }

  async upgradeFirstLockedCanopyTemplate() {
    const lockedTemplate = this.page
      .locator("article")
      .filter({ hasText: "canopy & above" })
      .first();

    await lockedTemplate.getByRole("link", { name: "Upgrade" }).click();
    await expect(this.page).toHaveURL(
      /\/subscription\?upgrade=canopy&resource=conflict-of-interest-policy/,
    );
  }
}
