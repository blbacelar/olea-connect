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
}
