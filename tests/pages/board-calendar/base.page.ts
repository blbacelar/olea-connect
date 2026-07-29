import { expect, type Locator, type Page } from "@playwright/test";

import { boardCalendarModule } from "@/lib/modules";

export const boardCalendarTemplatePath =
  "/templates/board-calendar-operational-workflow";
export const boardCalendarModulePath = boardCalendarModule.path;

const tabAliases: Record<string, string> = {
  "AGM planning timeline": "Settings",
  "Calendar workspace": "Calendar",
  "Generated operational workflow": "Workflows",
  "Meeting schedule": "Meetings",
  Setup: "Settings",
  "Staff task list": "Workflows",
};

export class BoardCalendarBasePage {
  constructor(public readonly page: Page) {}

  async openNewWorkbook() {
    await this.page.goto(`${boardCalendarTemplatePath}?session=new`);
    await this.expectLoaded();
  }

  async openNewModuleCalendar() {
    await this.page.goto(`${boardCalendarModulePath}?session=new`);
    await this.expectLoaded();
  }

  async expectModuleChrome() {
    await expect(
      this.page.getByRole("heading", {
        name: "Board Calendar & Operational Workflow",
      }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("heading", { name: "Board Calendar", exact: true }),
    ).toHaveCount(0);
    await expect(this.page.getByText("Board portal").first()).toBeVisible();
    await expect(
      this.page.getByRole("link", { name: "Back to resources" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("heading", { name: "Header information" }),
    ).toHaveCount(0);
    await expect(this.page.getByLabel("Calendar workspace name")).toHaveCount(0);
    await expect(this.page.getByText("Saved calendars")).toHaveCount(0);
    await expect(
      this.page.getByRole("link", { name: /Start new calendar/ }),
    ).toHaveCount(0);
    await expect(this.page.getByText(/Schema v\d+/)).toHaveCount(0);
    await expect(this.page.getByText(/Brand snapshot:/)).toHaveCount(0);
    await expect(this.page.getByText(/required item/)).toHaveCount(0);
    await expect(this.page.getByRole("heading", { name: "Exports" })).toHaveCount(0);
    await expect(this.page.getByText(/^Saved$/)).toHaveCount(0);
    await expect(this.page.getByRole("button", { name: "Save now" })).toHaveCount(0);
    await expect(
      this.page.getByRole("button", { name: "Mark complete" }),
    ).toHaveCount(0);
    await expect(this.page.getByRole("tab", { name: "Dashboard" })).toBeVisible();
    await expect(this.page.getByRole("tab", { name: "Calendar" })).toBeVisible();
    await expect(this.page.getByRole("tab", { name: "Meetings" })).toBeVisible();
    await expect(this.page.getByRole("tab", { name: "Workflows" })).toBeVisible();
    await expect(this.page.getByRole("tab", { name: "Board Packages" })).toBeVisible();
    await expect(this.page.getByRole("tab", { name: "Directory" })).toBeVisible();
    await expect(this.page.getByRole("tab", { name: "Audit Log" })).toBeVisible();
    await expect(this.page.getByRole("tab", { name: "Integrations" })).toHaveCount(0);
    await expect(this.page.getByRole("tab", { name: "Settings" })).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Add meeting" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: /^(Export PDF|Print \/ save PDF)$/ }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", { name: "Add to calendar" }),
    ).toBeVisible();
  }

  async expectLoaded() {
    await expect(
      this.page.getByRole("heading", {
        name: "Board Calendar & Operational Workflow",
      }),
    ).toBeVisible();
  }

  async expectWorkspaceViewOptionHidden(option: string) {
    await expect(this.page.getByRole("tab", { name: option })).toHaveCount(0);
    await expect(this.page.getByRole("option", { name: option })).toHaveCount(0);
  }

  async chooseWorkspaceView(option: string) {
    const tabName = tabAliases[option] ?? option;
    const tab = this.page.getByRole("tab", { name: tabName });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await tab.scrollIntoViewIfNeeded();
      if ((await tab.getAttribute("aria-selected")) === "true") return;
      await tab.click();

      try {
        await expect(tab).toHaveAttribute("aria-selected", "true", {
          timeout: 2_000,
        });
        return;
      } catch (error) {
        if (attempt === 2) throw error;
      }
    }
  }

  async expectWorkspaceViewSelected(option: string) {
    const tabName = tabAliases[option] ?? option;

    await expect(this.page.getByRole("tab", { name: tabName })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  }

  async saveNowAndWaitForPost() {
    const saveButton = this.page.getByRole("button", { name: "Save now" });
    if (await saveButton.count()) {
      await Promise.all([
        this.waitForTemplatePost(),
        saveButton.click(),
      ]);
      return;
    }

    await this.waitForSaved();
  }

  async waitForSaved() {
    const hiddenSaveState = this.page.getByTestId("template-save-state");
    if (await hiddenSaveState.count()) {
      await expect(hiddenSaveState).toHaveText("saved", { timeout: 15_000 });
      return;
    }

    const savedLabel = this.page.getByText(/^Saved$/);
    if (await savedLabel.count()) {
      await expect(savedLabel).toBeVisible({ timeout: 10_000 });
    }
  }

  async expectSessionPersisted() {
    await this.waitForSaved();
    await expect(this.page).toHaveURL(/session=(?!new)[^&]+/, {
      timeout: 20_000,
    });
  }

  async startNewWorkbook() {
    await this.openNewModuleCalendar();
  }

  async reload() {
    await this.page.reload();
    await this.expectLoaded();
  }

  async expectTextVisible(text: string) {
    await expect(this.entryText(text)).toBeVisible();
  }

  async expectTextCount(text: string, count: number) {
    await expect(this.page.getByText(text)).toHaveCount(count);
  }

  entryText(text: string) {
    return this.page.getByText(text).first();
  }

  field(label: string) {
    return this.page.getByLabel(label, { exact: true });
  }

  async expectFieldValue(label: string, value: string) {
    await expect(this.field(label)).toHaveValue(value);
  }

  async expectFieldContainsText(label: string, text: string) {
    await expect(this.field(label)).toContainText(text);
  }

  async fillField(label: string, value: string) {
    await this.field(label).fill(value);
  }

  get pageUrl() {
    return this.page.url();
  }

  protected async chooseSelectOption(
    label: string,
    option: string,
    scope: Locator | Page = this.page,
  ) {
    await scope.getByLabel(label, { exact: true }).click();
    await this.page.getByRole("option", { name: option, exact: true }).click();
  }

  protected async waitForTemplatePost() {
    await this.page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        (response.url().includes(boardCalendarTemplatePath) ||
          response.url().includes(boardCalendarModulePath)),
      { timeout: 15_000 },
    );
  }
}

export function getFutureDateKey(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getRelativeDateKey(dateKey: string, daysFromDate: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + daysFromDate);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function oneOfTextPattern(values: string[]) {
  return new RegExp(values.map(escapeRegExp).join("|"));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
