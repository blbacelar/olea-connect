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

  async openTemplate(templateName: string) {
    const template = this.page.locator("article", {
      has: this.page.getByRole("heading", { name: templateName }),
    });
    await template.getByRole("link", { name: "Open" }).click();
  }

  async expectNoDashboardReturnLink() {
    await expect(
      this.page.getByRole("link", { name: /Back to (resources|templates)/i }),
    ).toHaveCount(0);
  }
}
