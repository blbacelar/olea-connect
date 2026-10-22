import { expect } from "@playwright/test";

import { BoardCalendarBasePage } from "./base.page";

export class BoardCalendarSettingsPage extends BoardCalendarBasePage {
  get agmTimelinePanel() {
    return this.page.getByTestId("board-calendar-agm-timeline-panel");
  }

  async addAgmTimelineMilestone({
    agmDate,
    daysBefore,
    notes,
    task,
  }: {
    agmDate: string;
    daysBefore: string;
    notes?: string;
    task: string;
  }) {
    await this.chooseWorkspaceView("AGM planning timeline");
    await this.agmTimelinePanel.getByLabel("Confirmed AGM date").fill(agmDate);
    const previousMilestoneCount = await this.agmTimelinePanel.locator("tbody tr").count();
    await this.agmTimelinePanel.getByRole("button", { name: "Add milestone" }).click();

    const milestoneIndex = previousMilestoneCount + 1;
    const dialog = this.page.getByRole("dialog", { name: "Edit AGM milestone" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(`AGM milestone ${milestoneIndex} task`).fill(task);
    await dialog
      .getByLabel(`AGM milestone ${milestoneIndex} days before AGM`)
      .fill(daysBefore);
    if (notes) {
      await dialog.getByLabel(`AGM milestone ${milestoneIndex} notes`).fill(notes);
    }
    await dialog.getByRole("button", { name: "Save milestone" }).click();
    await expect(dialog).toHaveCount(0);
  }

  async expectAgmMilestoneTargetDate(index: number, targetDate: string) {
    const row = this.agmTimelinePanel.locator("tbody tr").nth(index - 1);
    await expect(row).toContainText(targetDate);
  }

  async expectAgmMilestoneHasNotes(index: number) {
    const row = this.agmTimelinePanel.locator("tbody tr").nth(index - 1);
    await expect(row).toContainText("Has notes");
  }
}
