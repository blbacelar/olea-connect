import { expect } from "@playwright/test";

import { BoardCalendarBasePage } from "./base.page";

export class BoardCalendarDirectoryPage extends BoardCalendarBasePage {
  get panel() {
    return this.page.getByTestId("board-calendar-directory-panel");
  }

  async expectCommittee(name: string, chair: string) {
    await this.chooseWorkspaceView("Directory");
    const row = this.panel.locator("tbody tr").filter({ hasText: name });
    await expect(row).toContainText(chair);
  }

  async addCommittee({
    chair,
    chairEmail,
    name,
    notes,
  }: {
    chair: string;
    chairEmail: string;
    name: string;
    notes?: string;
  }) {
    await this.chooseWorkspaceView("Directory");
    await this.panel.getByRole("button", { name: "Add committee" }).click();

    const dialog = this.page.getByRole("dialog", { name: "Add directory entry" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/Committee \d+ name/).fill(name);
    await dialog.getByLabel(/Committee \d+ chair/).click();
    await this.page
      .getByRole("option", { name: new RegExp(chairEmail, "i") })
      .click();
    if (notes) {
      await dialog.getByLabel(/Committee \d+ notes/).fill(notes);
    }
    await dialog.getByRole("button", { name: "Save directory entry" }).click();
    await expect(dialog).toHaveCount(0);
    await this.expectCommittee(name, chair);
  }

  async updateCommittee(
    index: number,
    {
      chair,
      chairEmail,
      name,
      notes,
    }: {
      chair: string;
      chairEmail: string;
      name: string;
      notes: string;
    },
  ) {
    await this.chooseWorkspaceView("Directory");
    await this.panel.getByRole("button", { name: `Edit committee ${index}` }).click();

    const dialog = this.page.getByRole("dialog", { name: "Edit directory entry" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(`Committee ${index} name`).fill(name);
    await dialog.getByLabel(`Committee ${index} chair`).click();
    await this.page
      .getByRole("option", { name: new RegExp(chairEmail, "i") })
      .click();
    await dialog.getByLabel(`Committee ${index} notes`).fill(notes);
    await dialog.getByRole("button", { name: "Save directory entry" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      this.panel.locator("tbody tr").nth(index - 1),
    ).toContainText(chair);
  }

  async expectCommitteeDetails(
    index: number,
    {
      chair,
      name,
      notes,
    }: {
      chair: string;
      name: string;
      notes: string;
    },
  ) {
    await this.chooseWorkspaceView("Directory");
    const row = this.panel.locator("tbody tr").nth(index - 1);
    await expect(row).toContainText(name);
    await expect(row).toContainText(chair);
    await expect(row).toContainText("Has notes");

    await row.getByRole("button", { name: `Edit committee ${index}` }).click();
    const dialog = this.page.getByRole("dialog", { name: "Edit directory entry" });
    await expect(dialog.getByLabel(`Committee ${index} notes`)).toHaveValue(notes);
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
  }

  async filterByNotes(option: "Has notes" | "No notes") {
    await this.chooseWorkspaceView("Directory");
    const filterButton = this.panel.getByRole("button", { name: /Filters/ });
    if ((await filterButton.getAttribute("aria-expanded")) !== "true") {
      await filterButton.click();
    }
    await this.chooseSelectOption("Filter directory by notes", option, this.panel);
  }

  async clearFilters() {
    await this.panel.getByRole("button", { name: "Clear filters" }).click();
  }

  async expectCommitteeHidden(name: string) {
    await expect(this.panel.locator("tbody tr").filter({ hasText: name })).toHaveCount(0);
  }
}
