import { expect } from "@playwright/test";

import { BoardCalendarBasePage, oneOfTextPattern } from "./base.page";

export class BoardCalendarWorkflowsPage extends BoardCalendarBasePage {
  get panel() {
    return this.page.getByTestId("board-calendar-staff-task-list-panel");
  }

  async expectGeneratedTask(taskName: string) {
    await this.chooseWorkspaceView("Staff task list");
    await expect(this.panel.getByText(taskName, { exact: true })).toBeVisible();
  }

  async expectAnyGeneratedTask(taskNames: string[]) {
    await this.chooseWorkspaceView("Staff task list");
    await expect(this.panel.getByText(oneOfTextPattern(taskNames)).first()).toBeVisible();
  }

  async updateTask(index: number, status: string, notes: string) {
    await this.panel.getByRole("button", { name: `Edit task ${index}` }).click();
    const dialog = this.page.getByRole("dialog", { name: "Edit workflow task" });
    await expect(dialog).toBeVisible();
    await this.chooseSelectOption(`Task ${index} status`, status, dialog);
    await dialog.getByLabel(`Task ${index} notes`).fill(notes);
    await dialog.getByRole("button", { name: "Save task" }).click();
    await expect(dialog).toHaveCount(0);
  }

  async expectTaskDetails(index: number, status: string, notes: string) {
    const row = this.panel.locator("tbody tr").nth(index - 1);
    await expect(row).toContainText(status);
    await expect(row).toContainText("Has notes");

    await row.getByRole("button", { name: `Edit task ${index}` }).click();
    const dialog = this.page.getByRole("dialog", { name: "Edit workflow task" });
    await expect(dialog.getByLabel(`Task ${index} notes`)).toHaveValue(notes);
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
  }

  async filterByStatus(status: string) {
    await this.chooseWorkspaceView("Staff task list");
    const filterButton = this.panel.getByRole("button", { name: /Filters/ });
    if ((await filterButton.getAttribute("aria-expanded")) !== "true") {
      await filterButton.click();
    }
    await this.chooseSelectOption("Filter workflow tasks by status", status, this.panel);
  }

  async clearFilters() {
    await this.panel.getByRole("button", { name: "Clear filters" }).click();
  }

  async expectTaskVisible(taskName: string) {
    await expect(this.panel.locator("tbody tr").filter({ hasText: taskName })).toBeVisible();
  }

  async expectTaskHidden(taskName: string) {
    await expect(this.panel.locator("tbody tr").filter({ hasText: taskName })).toHaveCount(
      0,
    );
  }
}
