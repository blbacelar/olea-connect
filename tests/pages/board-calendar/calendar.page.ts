import { expect, type Locator } from "@playwright/test";

import { BoardCalendarBasePage, oneOfTextPattern } from "./base.page";
import type {
  AgmMilestoneEntry,
  AnnualNoteEntry,
  BoardCalendarEntryType,
  MeetingEntry,
  OperationalTaskEntry,
} from "./types";

export class BoardCalendarCalendarPage extends BoardCalendarBasePage {
  get selectedDatePanel() {
    return this.page.getByTestId("board-calendar-selected-date-panel");
  }

  get entryForm() {
    return this.page.getByTestId("board-calendar-entry-form");
  }

  get monthGrid() {
    return this.page.getByTestId("board-calendar-month-grid");
  }

  async expectPastDatesDisabled() {
    await expect(this.monthGrid).toBeVisible();
    await expect(this.monthGrid.locator("button:disabled").first()).toBeVisible();
  }

  async expectMonthGridFitsViewport() {
    await this.chooseWorkspaceView("Calendar workspace");
    await expect(this.monthGrid).toBeVisible();
    const fitsViewport = await this.monthGrid.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= window.innerWidth;
    });

    expect(fitsViewport).toBe(true);
  }

  async expectPastDateDisabled(dayLabel: RegExp | string) {
    await expect(this.page.getByRole("button", { name: dayLabel })).toBeDisabled();
  }

  async selectDate(dateKey: string) {
    await this.chooseWorkspaceView("Calendar workspace");
    await this.goToMonthContaining(dateKey);
    await this.monthGrid
      .getByRole("button", { name: `Select ${dateKey}`, exact: true })
      .click();
    await expect(this.page.getByRole("heading", { name: dateKey })).toBeVisible();
  }

  async openEntryForm() {
    await this.chooseWorkspaceView("Calendar workspace");
    await this.page.getByRole("button", { name: "Add meeting" }).click();
    await expect(this.entryForm).toBeVisible();
    await expect(this.page.getByRole("dialog", { name: "Add Entry" })).toBeVisible();
  }

  async expectEntryModalTopVisible() {
    await this.ensureEntryFormOpen();
    await expect(this.page.getByRole("dialog", { name: "Add Entry" })).toBeInViewport();
    await expect(this.page.getByRole("heading", { name: "Add Entry" })).toBeInViewport();
    await expect(this.field("Entry date")).toBeInViewport();
  }

  async expectEntryTitleKeepsFocusWhileTyping(text: string) {
    await this.ensureEntryFormOpen();
    const titleField = this.field("Title");

    await expect(titleField).toBeFocused();
    await titleField.pressSequentially(text, { delay: 20 });
    await expect(titleField).toHaveValue(text);
    await expect(titleField).toBeFocused();
    await titleField.clear();
  }

  async setEntryType(option: BoardCalendarEntryType) {
    await this.ensureEntryFormOpen();
    await this.chooseSelectOption("Entry type", option, this.entryForm);
  }

  async fillMeeting(entry: MeetingEntry) {
    await this.ensureEntryFormOpen();
    await this.fillTitle(entry.title);
    if (entry.category) {
      await this.chooseSelectOption("Category", entry.category, this.entryForm);
    }
    if (entry.color) await this.setCalendarColor(entry.color);
    if (entry.time) await this.page.getByLabel("Time").fill(entry.time);
    if (entry.location) await this.page.getByLabel("Location / platform").fill(entry.location);
    if (entry.virtualLink) await this.page.getByLabel("Virtual link").fill(entry.virtualLink);
    if (entry.leadContact) await this.page.getByLabel("Lead contact").fill(entry.leadContact);
    if (entry.confirmed) {
      await this.chooseSelectOption("Confirmed?", entry.confirmed, this.entryForm);
    }
    if (entry.notes) await this.page.getByLabel("Notes").fill(entry.notes);
  }

  async addMeeting(entry: MeetingEntry) {
    await this.fillMeeting(entry);
    await this.addToCalendar();
  }

  async addAnnualNote(dateKey: string, entry: AnnualNoteEntry) {
    await this.selectDate(dateKey);
    await this.openEntryForm();
    await this.setEntryType("Annual calendar note");
    await this.fillTitle(entry.title);
    if (entry.category) {
      await this.chooseSelectOption("Category", entry.category, this.entryForm);
    }
    if (entry.color) await this.setCalendarColor(entry.color);
    if (entry.notes) await this.page.getByLabel("Notes").fill(entry.notes);
    await this.addToCalendar();
  }

  async addOperationalTask(dateKey: string, entry: OperationalTaskEntry) {
    await this.selectDate(dateKey);
    await this.openEntryForm();
    await this.setEntryType("Operational task");
    await this.fillTitle(entry.title);
    if (entry.status) {
      await this.chooseSelectOption("Workflow status", entry.status, this.entryForm);
    }
    if (entry.relatedMeeting) await this.page.getByLabel("Related meeting").fill(entry.relatedMeeting);
    if (entry.responsible) await this.page.getByLabel("Responsible").fill(entry.responsible);
    if (entry.done) await this.page.getByLabel("Done").check();
    if (entry.notes) await this.page.getByLabel("Notes").fill(entry.notes);
    await this.addToCalendar();
  }

  async addAgmMilestone(dateKey: string, entry: AgmMilestoneEntry) {
    await this.selectDate(dateKey);
    await this.openEntryForm();
    await this.setEntryType("AGM milestone");
    await this.fillTitle(entry.title);
    if (entry.track) await this.chooseSelectOption("Track", entry.track, this.entryForm);
    if (entry.status) {
      await this.chooseSelectOption("Workflow status", entry.status, this.entryForm);
    }
    if (entry.daysBeforeAgm) await this.page.getByLabel("Days before AGM").fill(entry.daysBeforeAgm);
    if (entry.responsible) await this.page.getByLabel("Responsible").fill(entry.responsible);
    if (entry.notes) await this.page.getByLabel("Notes").fill(entry.notes);
    await this.addToCalendar();
  }

  async fillTitle(title: string) {
    await this.ensureEntryFormOpen();
    await this.page.getByLabel("Title").fill(title);
  }

  async setCalendarColor(color: string) {
    await this.page.getByLabel("Calendar color", { exact: true }).fill(color);
    await expect
      .poll(async () =>
        (await this.page.getByLabel("Calendar color hex code").inputValue()).toLowerCase(),
      )
      .toBe(color.toLowerCase());
  }

  async expectDefaultCalendarColor(color: string) {
    await expect(this.entryForm.getByLabel("Calendar color", { exact: true })).toBeVisible();
    await expect(this.entryForm.getByLabel("Calendar color hex code")).toHaveValue(color);
  }

  async expectAddDisabled() {
    await expect(this.entryForm.getByRole("button", { name: "Add entry" })).toBeDisabled();
  }

  async expectAddEnabled() {
    await expect(this.entryForm.getByRole("button", { name: "Add entry" })).toBeEnabled();
  }

  async expectUpdateEnabled() {
    await expect(this.entryForm.getByRole("button", { name: "Update entry" })).toBeEnabled();
  }

  async addToCalendar() {
    await this.expectAddEnabled();
    await this.entryForm.getByRole("button", { name: "Add entry" }).click();
    await expect(this.entryForm).toHaveCount(0);
    await this.waitForSaved();
  }

  async expectBlankEntryForm() {
    await this.ensureEntryFormOpen();
    await expect(this.field("Title")).toHaveValue("");
    await expect(this.field("Category")).toContainText("Choose category");
    await expect(this.field("Confirmed?")).toContainText("Choose confirmation");
    await expect(this.entryForm.getByLabel("Calendar color", { exact: true })).toHaveCount(0);
  }

  async editEntry(entryAccessibleName: RegExp | string) {
    await this.page.getByRole("button", { name: entryAccessibleName }).first().click();
    await expect(this.page.getByRole("dialog", { name: "Edit entry" })).toBeVisible();
  }

  async updateEntry() {
    await Promise.all([
      this.waitForTemplatePost(),
      this.page.getByRole("button", { name: "Update entry" }).click(),
    ]);
    await expect(this.entryForm).toHaveCount(0);
    await this.waitForSaved();
  }

  async cancelEntryEdit() {
    await this.entryForm.getByRole("button", { name: "Cancel edit" }).click();
    await expect(this.entryForm).toHaveCount(0);
  }

  async openDeleteDialog() {
    await this.page.getByRole("button", { name: "Delete entry" }).last().click();
    await expect(this.deleteDialog).toBeVisible();
  }

  async cancelDelete() {
    await this.deleteDialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(this.deleteDialog).toHaveCount(0);
  }

  async confirmDelete() {
    await Promise.all([
      this.waitForTemplatePost(),
      this.deleteDialog.getByRole("button", { name: "Delete entry" }).click(),
    ]);
    await expect(this.deleteDialog).toHaveCount(0);
    await this.waitForSaved();
  }

  async expectNoEntryText(text: string) {
    await expect(this.page.getByText(text)).toHaveCount(0);
  }

  async expectEmptySchedule() {
    await expect(this.page.getByText("Nothing scheduled yet.")).toBeVisible();
  }

  selectedDateText(text: string) {
    return this.selectedDatePanel.getByText(text);
  }

  async expectSelectedDateText(text: string) {
    await this.chooseWorkspaceView("Calendar workspace");
    await expect(this.selectedDateText(text).first()).toBeVisible();
  }

  async expectAnySelectedDateText(texts: string[]) {
    await this.chooseWorkspaceView("Calendar workspace");
    await expect(this.selectedDatePanel.getByText(oneOfTextPattern(texts)).first()).toBeVisible();
  }

  async expectGeneratedTaskOnAnyDate(candidates: Array<{ dateKey: string; text: string }>) {
    for (const candidate of candidates) {
      await this.selectDate(candidate.dateKey);
      if ((await this.selectedDateText(candidate.text).count()) > 0) {
        await this.expectSelectedDateText(candidate.text);
        return;
      }
    }

    throw new Error(
      `Expected one generated task candidate: ${candidates
        .map((candidate) => `${candidate.text} on ${candidate.dateKey}`)
        .join(", ")}`,
    );
  }

  async expectSelectedDateTextCount(text: string, count: number) {
    await expect(this.selectedDateText(text)).toHaveCount(count);
  }

  async selectedDateContent() {
    return (await this.selectedDatePanel.textContent()) ?? "";
  }

  private get deleteDialog(): Locator {
    return this.page.getByRole("dialog", {
      name: "Delete this calendar entry?",
    });
  }

  private async ensureEntryFormOpen() {
    if (await this.entryForm.count()) return;

    await this.openEntryForm();
  }

  private async goToMonthContaining(dateKey: string) {
    const [year, month] = dateKey.split("-").map(Number);
    const targetDate = new Date(year, month - 1, 1);
    const formatter = new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    });
    const targetLabel = formatter.format(targetDate);

    for (let attempt = 0; attempt < 24; attempt += 1) {
      if (
        (await this.page.getByRole("button", { name: targetLabel, exact: true }).count()) >
        0
      ) {
        return;
      }

      const currentPeriod = await this.page
        .getByRole("button", { name: /^[A-Z][a-z]+ \d{4}$/ })
        .textContent();
      const currentDate = currentPeriod ? new Date(`${currentPeriod} 1`) : targetDate;
      const direction =
        currentDate.getTime() < targetDate.getTime()
          ? "Next calendar period"
          : "Previous calendar period";

      await this.page.getByRole("button", { name: direction }).click();
    }

    throw new Error(`Could not navigate calendar to ${targetLabel}`);
  }
}
