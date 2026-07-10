import { expect, type Page } from "@playwright/test";

export class AppShellPage {
  constructor(private readonly page: Page) {}

  async open(path: string) {
    await this.page.goto(path);
  }

  async openDashboard() {
    await this.page.goto("/dashboard");
  }

  async expectCompactHeader() {
    const compactLogo = this.page.getByRole("link", {
      name: "Olea Connects dashboard",
    });

    await expect(compactLogo).toBeVisible();
    await expect(this.page.getByLabel("Open navigation")).toBeVisible();

    const logoWidth = await compactLogo.evaluate(
      (element) => element.getBoundingClientRect().width,
    );
    const hasHorizontalOverflow = await this.page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );

    expect(logoWidth).toBeLessThan(60);
    expect(hasHorizontalOverflow).toBe(false);
  }

  async expectDashboardForOrganization(organizationName: string) {
    await this.openDashboard();
    await expect(
      this.page.getByRole("main").getByText(organizationName),
    ).toBeVisible({ timeout: 15_000 });
  }

  async expectDashboardTemplate(templateName: string) {
    await expect(
      this.page.getByRole("heading", { name: templateName }),
    ).toBeVisible();
  }

  async expectPageHeading(path: string, heading: string | RegExp) {
    await this.open(path);
    await expect(
      this.page.getByRole("heading", {
        exact: typeof heading === "string",
        level: 1,
        name: heading,
      }),
    ).toBeVisible();
  }

  async openMemberSection(path: string) {
    await this.page.goto(path.startsWith("/") ? path : `/${path}`);
  }

  async expectSectionHeading(name: string | RegExp) {
    await expect(
      this.page.getByRole("heading", {
        exact: typeof name === "string",
        name,
      }),
    ).toBeVisible();
  }

  async expectText(text: string | RegExp) {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  async expectNoServerError() {
    await expect(
      this.page.getByText(
        /An error occurred in the Server Components render|Application error|Internal Server Error/i,
      ),
    ).toHaveCount(0);
  }

  async openGlobalSearchWithShortcut() {
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await this.page.keyboard.press(`${modifier}+KeyK`);
    await expect(
      this.page.getByRole("dialog", { name: "Global search" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("combobox", { name: "Search command palette" }),
    ).toBeFocused();
  }

  async openGlobalSearchFromHeader() {
    await this.page
      .getByRole("button", { name: "Open global search" })
      .first()
      .click();
    await expect(
      this.page.getByRole("dialog", { name: "Global search" }),
    ).toBeVisible();
  }

  async searchGlobalCommand(query: string) {
    await this.page
      .getByRole("combobox", { name: "Search command palette" })
      .fill(query);
  }

  async expectGlobalSearchResult(name: string | RegExp) {
    await expect(
      this.page.getByRole("option", { name }),
    ).toBeVisible();
  }

  async openActiveGlobalSearchResult() {
    await this.page.keyboard.press("Enter");
  }

  async closeGlobalSearch() {
    await this.page.keyboard.press("Escape");
    await expect(
      this.page.getByRole("dialog", { name: "Global search" }),
    ).toHaveCount(0);
  }
}
