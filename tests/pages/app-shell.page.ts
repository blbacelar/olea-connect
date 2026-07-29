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
    const compactLogo = this.page
      .locator("header")
      .getByRole("link", {
        name: "Olea Connects Governance branded dashboard",
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

  async collapseSidebar() {
    await this.page
      .getByRole("button", { name: "Collapse sidebar" })
      .click();
    await this.expectSidebarCollapsed();
  }

  async expandSidebar() {
    await this.page
      .getByRole("button", { name: "Expand sidebar" })
      .click();
    await this.expectSidebarExpanded();
  }

  async expectSidebarCollapsed() {
    await expect(this.page.getByTestId("app-sidebar")).toHaveAttribute(
      "data-state",
      "collapsed",
    );
    await expect(
      this.page.getByRole("button", { name: "Expand sidebar" }),
    ).toBeVisible();
  }

  async expectSidebarExpanded() {
    await expect(this.page.getByTestId("app-sidebar")).toHaveAttribute(
      "data-state",
      "expanded",
    );
    await expect(
      this.page.getByRole("button", { name: "Collapse sidebar" }),
    ).toBeVisible();
  }

  async expectUnreadNotificationCount(count: number) {
    const label =
      count > 0 ? `Notifications (${count} unread)` : "Notifications";

    await expect(
      this.page.getByRole("button", { name: label }),
    ).toBeVisible();
  }

  async expectUnreadNotificationCountAtLeast(count: number) {
    await expect
      .poll(async () => {
        const ariaLabel = await this.page
          .getByRole("button", { name: /Notifications/ })
          .getAttribute("aria-label");
        const match = ariaLabel?.match(/Notifications \((\d+) unread\)/);

        if (match) return Number.parseInt(match[1], 10);
        return ariaLabel === "Notifications" ? 0 : -1;
      })
      .toBeGreaterThanOrEqual(count);
  }

  async openNotifications() {
    await this.page.getByRole("button", { name: /Notifications/ }).click();
    await expect(
      this.page.getByText("Notifications").first(),
    ).toBeVisible();
  }

  async expectNotificationVisible(title: string | RegExp) {
    await expect(
      this.page.getByRole("button", { name: title }),
    ).toBeVisible();
  }

  async openNotification(title: string | RegExp) {
    await this.page.getByRole("button", { name: title }).click();
  }

  async markAllNotificationsRead() {
    await this.page.getByRole("button", { name: "Mark all read" }).click();
  }

  async expectNoUnreadNotifications() {
    await expect(
      this.page.getByRole("button", { name: "Notifications" }),
    ).toBeVisible();
    await this.openNotifications();
    await expect(this.page.getByText("No unread notifications")).toBeVisible();
  }

  async expectDashboardForOrganization(organizationName: string) {
    await this.openDashboard();
    await expect(
      this.page.getByTestId("workspace-organization-name"),
    ).toBeVisible({ timeout: 15_000 });
    await expect(this.page.getByTestId("workspace-organization-name")).toHaveText(
      organizationName,
    );
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
        /An error occurred in the Server Components render|Application error|Internal Server Error|We could not load this workspace/i,
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
