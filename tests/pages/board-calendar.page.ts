import { expect, type Locator, type Page } from "@playwright/test";

export const boardCalendarTemplatePath =
  "/templates/board-calendar-operational-workflow";

export type BoardCalendarEntryType =
  | "Annual calendar note"
  | "Operational task"
  | "AGM milestone"
  | "Board meeting or event";

export type MeetingEntry = {
  title: string;
  category?: string;
  color?: string;
  time?: string;
  location?: string;
  virtualLink?: string;
  leadContact?: string;
  confirmed?: "Yes" | "No" | "TBC";
  notes?: string;
};

export type AnnualNoteEntry = {
  title: string;
  category?: string;
  color?: string;
  notes?: string;
};

export type OperationalTaskEntry = {
  title: string;
  status?: string;
  relatedMeeting?: string;
  responsible?: string;
  done?: boolean;
  notes?: string;
};

export type AgmMilestoneEntry = {
  title: string;
  track?: string;
  status?: string;
  weeksBeforeAgm?: string;
  responsible?: string;
  notes?: string;
};

export class BoardCalendarPage {
  constructor(private readonly page: Page) {}

  get selectedDatePanel() {
    return this.page.getByTestId("board-calendar-selected-date-panel");
  }

  get entryForm() {
    return this.page.getByTestId("board-calendar-entry-form");
  }

  get monthGrid() {
    return this.page.getByTestId("board-calendar-month-grid");
  }

  async openNewWorkbook() {
    await this.page.goto(`${boardCalendarTemplatePath}?session=new`);
    await this.expectLoaded();
  }

  async expectLoaded() {
    await expect(
      this.page.getByRole("heading", {
        name: "Board Calendar & Operational Workflow",
      }),
    ).toBeVisible();
  }

  async nameWorkbook(name: string) {
    await this.page.getByLabel("Workbook name").fill(name);
  }

  async expectWorkspaceViewOptionHidden(option: string) {
    await this.page.getByLabel("Choose calendar workspace view").click();
    await expect(this.page.getByRole("option", { name: option })).toHaveCount(
      0,
    );
    await this.page.keyboard.press("Escape");
  }

  async expectPastDatesDisabled() {
    await expect(
      this.page.getByRole("button", { name: /Past/ }).first(),
    ).toBeDisabled();
  }

  async expectMonthGridFitsViewport() {
    await expect(this.monthGrid).toBeVisible();
    const fitsViewport = await this.monthGrid.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= window.innerWidth;
    });

    expect(fitsViewport).toBe(true);
  }

  async expectPastDateDisabled(dayLabel: RegExp | string) {
    await expect(
      this.page.getByRole("button", { name: dayLabel }),
    ).toBeDisabled();
  }

  async selectCalendarDate(dateKey: string) {
    const day = Number(dateKey.slice(-2));

    await this.page
      .getByRole("button", { name: String(day), exact: true })
      .click();
    await expect(this.page.getByRole("heading", { name: dateKey })).toBeVisible();
    await expect(this.page.getByLabel("Entry date")).toHaveValue(dateKey);
  }

  async setEntryType(option: BoardCalendarEntryType) {
    await this.chooseSelectOption("Entry type", option);
  }

  async fillMeeting(entry: MeetingEntry) {
    await this.fillTitle(entry.title);
    if (entry.category) await this.chooseSelectOption("Category", entry.category);
    if (entry.color) await this.setCalendarColor(entry.color);
    if (entry.time) await this.page.getByLabel("Time").fill(entry.time);
    if (entry.location) {
      await this.page.getByLabel("Location / platform").fill(entry.location);
    }
    if (entry.virtualLink) {
      await this.page.getByLabel("Virtual link").fill(entry.virtualLink);
    }
    if (entry.leadContact) {
      await this.page.getByLabel("Lead contact").fill(entry.leadContact);
    }
    if (entry.confirmed) {
      await this.chooseSelectOption("Confirmed?", entry.confirmed);
    }
    if (entry.notes) await this.page.getByLabel("Notes").fill(entry.notes);
  }

  async addMeeting(entry: MeetingEntry) {
    await this.fillMeeting(entry);
    await this.addToCalendar();
  }

  async addAnnualNote(dateKey: string, entry: AnnualNoteEntry) {
    await this.setEntryType("Annual calendar note");
    await this.selectCalendarDate(dateKey);
    await this.fillTitle(entry.title);
    if (entry.category) await this.chooseSelectOption("Category", entry.category);
    if (entry.color) await this.setCalendarColor(entry.color);
    if (entry.notes) await this.page.getByLabel("Notes").fill(entry.notes);
    await this.addToCalendar();
  }

  async addOperationalTask(dateKey: string, entry: OperationalTaskEntry) {
    await this.setEntryType("Operational task");
    await this.selectCalendarDate(dateKey);
    await this.fillTitle(entry.title);
    if (entry.status) {
      await this.chooseSelectOption("Workflow status", entry.status);
    }
    if (entry.relatedMeeting) {
      await this.page.getByLabel("Related meeting").fill(entry.relatedMeeting);
    }
    if (entry.responsible) {
      await this.page.getByLabel("Responsible").fill(entry.responsible);
    }
    if (entry.done) await this.page.getByLabel("Done").check();
    if (entry.notes) await this.page.getByLabel("Notes").fill(entry.notes);
    await this.addToCalendar();
  }

  async addAgmMilestone(dateKey: string, entry: AgmMilestoneEntry) {
    await this.setEntryType("AGM milestone");
    await this.selectCalendarDate(dateKey);
    await this.fillTitle(entry.title);
    if (entry.track) await this.chooseSelectOption("Track", entry.track);
    if (entry.status) {
      await this.chooseSelectOption("Workflow status", entry.status);
    }
    if (entry.weeksBeforeAgm) {
      await this.page.getByLabel("Weeks before AGM").fill(entry.weeksBeforeAgm);
    }
    if (entry.responsible) {
      await this.page.getByLabel("Responsible").fill(entry.responsible);
    }
    if (entry.notes) await this.page.getByLabel("Notes").fill(entry.notes);
    await this.addToCalendar();
  }

  async fillTitle(title: string) {
    await this.page.getByLabel("Title").fill(title);
  }

  async setCalendarColor(color: string) {
    await this.page.getByLabel("Calendar color", { exact: true }).fill(color);
    await expect(this.page.getByLabel("Calendar color hex code")).toHaveValue(
      color,
    );
  }

  async expectAddDisabled() {
    await expect(
      this.page.getByRole("button", { name: "Add to calendar" }),
    ).toBeDisabled();
  }

  async expectAddEnabled() {
    await expect(
      this.page.getByRole("button", { name: "Add to calendar" }),
    ).toBeEnabled();
  }

  async addToCalendar() {
    await this.expectAddEnabled();
    await this.page.getByRole("button", { name: "Add to calendar" }).click();
    await expect(this.field("Title")).toHaveValue("");
    await this.waitForSaved();
  }

  async editEntry(entryAccessibleName: RegExp | string) {
    await this.page
      .getByRole("button", { name: entryAccessibleName })
      .first()
      .click();
    await expect(this.page.getByRole("heading", { name: "Edit entry" })).toBeVisible();
  }

  async updateEntry() {
    await this.page.getByRole("button", { name: "Update entry" }).click();
    await expect(this.page.getByRole("heading", { name: "Add Entry" })).toBeVisible();
    await this.waitForSaved();
  }

  async openDeleteDialog() {
    await this.page.getByRole("button", { name: "Delete entry" }).last().click();
    await expect(this.deleteDialog).toBeVisible();
  }

  async cancelDelete() {
    await this.deleteDialog
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await expect(this.deleteDialog).toHaveCount(0);
  }

  async confirmDelete() {
    await this.deleteDialog
      .getByRole("button", { name: "Delete entry" })
      .click();
    await expect(this.deleteDialog).toHaveCount(0);
    await this.waitForSaved();
  }

  async saveNowAndWaitForPost() {
    await Promise.all([
      this.page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes(boardCalendarTemplatePath),
        { timeout: 15_000 },
      ),
      this.page.getByRole("button", { name: "Save now" }).click(),
    ]);
  }

  async waitForSaved() {
    await expect(this.page.getByText(/^Saved$/)).toBeVisible({
      timeout: 10_000,
    });
  }

  async expectSessionPersisted() {
    await expect(this.page).toHaveURL(/session=(?!new)[^&]+/);
  }

  async startNewWorkbook() {
    await this.page.getByRole("link", { name: "Start new" }).click();
    await expect
      .poll(() => new URL(this.page.url()).searchParams.get("session"))
      .toBe("new");
  }

  async reload() {
    await this.page.reload();
    await this.expectLoaded();
  }

  entryText(text: string) {
    return this.page.getByText(text).first();
  }

  selectedDateText(text: string) {
    return this.selectedDatePanel.getByText(text);
  }

  async expectSelectedDateText(text: string) {
    await expect(this.selectedDateText(text).first()).toBeVisible();
  }

  async expectSelectedDateTextCount(text: string, count: number) {
    await expect(this.selectedDateText(text)).toHaveCount(count);
  }

  async expectTextVisible(text: string) {
    await expect(this.entryText(text)).toBeVisible();
  }

  async expectTextCount(text: string, count: number) {
    await expect(this.page.getByText(text)).toHaveCount(count);
  }

  async selectedDateContent() {
    return (await this.selectedDatePanel.textContent()) ?? "";
  }

  field(label: string) {
    return this.page.getByLabel(label, { exact: true });
  }

  get pageUrl() {
    return this.page.url();
  }

  private get deleteDialog(): Locator {
    return this.page.getByRole("dialog", {
      name: "Delete this calendar entry?",
    });
  }

  private async chooseSelectOption(label: string, option: string) {
    await this.page.getByLabel(label, { exact: true }).click();
    await this.page.getByRole("option", { name: option, exact: true }).click();
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
