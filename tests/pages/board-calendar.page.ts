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
  daysBeforeAgm?: string;
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

  get setupPanel() {
    return this.page.getByTestId("board-calendar-setup-panel");
  }

  get staffTaskListPanel() {
    return this.page.getByTestId("board-calendar-staff-task-list-panel");
  }

  get agmTimelinePanel() {
    return this.page.getByTestId("board-calendar-agm-timeline-panel");
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

  async chooseWorkspaceView(option: string) {
    await this.chooseSelectOption("Choose calendar workspace view", option);
  }

  async fillSetupBasics({
    administrator,
    administratorEmail,
    boardChair,
    executiveDirector,
    fiscalYear,
    organizationName,
  }: {
    administrator: string;
    administratorEmail: string;
    boardChair: string;
    executiveDirector: string;
    fiscalYear: string;
    organizationName: string;
  }) {
    await this.chooseWorkspaceView("Setup");
    await this.setupPanel.getByLabel("Organization name").fill(organizationName);
    await this.setupPanel.getByLabel("Fiscal year").fill(fiscalYear);
    await this.setupPanel
      .getByLabel("Administrator", { exact: true })
      .fill(administrator);
    await this.setupPanel.getByLabel("Administrator email").fill(administratorEmail);
    await this.setupPanel.getByLabel("Executive Director").fill(executiveDirector);
    await this.setupPanel.getByLabel("Board Chair").fill(boardChair);
  }

  async addCommittee(name: string, chair: string) {
    await this.setupPanel.getByRole("button", { name: "Add committee" }).click();
    const committeeCount = await this.setupPanel
      .getByLabel(/Committee \d+ name/)
      .count();
    await this.setupPanel.getByLabel(`Committee ${committeeCount} name`).fill(name);
    await this.setupPanel
      .getByLabel(`Committee ${committeeCount} chair`)
      .fill(chair);
  }

  async addTaskRule({
    appliesTo = "Any meeting",
    days = "14",
    label,
    responsible = "Administrator",
    timing = "Before",
  }: {
    appliesTo?: string;
    days?: string;
    label: string;
    responsible?: string;
    timing?: "After" | "Before";
  }) {
    await this.setupPanel.getByRole("button", { name: "Add task rule" }).click();
    const ruleCount = await this.setupPanel
      .getByLabel(/Task rule \d+ label/)
      .count();
    await this.setupPanel.getByLabel(`Task rule ${ruleCount} label`).fill(label);
    await this.setupPanel.getByLabel(`Task rule ${ruleCount} days`).fill(days);
    await this.chooseSelectOption(
      `Task rule ${ruleCount} timing`,
      timing,
      this.setupPanel,
    );
    await this.chooseSelectOption(
      `Task rule ${ruleCount} applies to`,
      appliesTo,
      this.setupPanel,
    );
    await this.chooseSelectOption(
      `Task rule ${ruleCount} responsible`,
      responsible,
      this.setupPanel,
    );
  }

  async expectGeneratedStaffTask(taskName: string) {
    await this.chooseWorkspaceView("Staff task list");
    await expect(
      this.staffTaskListPanel.getByText(taskName, { exact: true }),
    ).toBeVisible();
  }

  async updateGeneratedStaffTask(index: number, status: string, notes: string) {
    await this.chooseSelectOption(`Task ${index} status`, status, this.staffTaskListPanel);
    await this.staffTaskListPanel.getByLabel(`Task ${index} notes`).fill(notes);
  }

  async expectGeneratedStaffTaskDetails(
    index: number,
    status: string,
    notes: string,
  ) {
    await expect(
      this.staffTaskListPanel.getByLabel(`Task ${index} status`),
    ).toContainText(status);
    await expect(
      this.staffTaskListPanel.getByLabel(`Task ${index} notes`),
    ).toHaveValue(notes);
  }

  async addAgmTimelineMilestone({
    agmDate,
    daysBefore,
    task,
  }: {
    agmDate: string;
    daysBefore: string;
    task: string;
  }) {
    await this.chooseWorkspaceView("AGM planning timeline");
    await this.agmTimelinePanel.getByLabel("Confirmed AGM date").fill(agmDate);
    await this.agmTimelinePanel
      .getByRole("button", { name: "Add milestone" })
      .click();
    const milestoneCount = await this.agmTimelinePanel
      .getByLabel(/AGM milestone \d+ task/)
      .count();
    await this.agmTimelinePanel
      .getByLabel(`AGM milestone ${milestoneCount} task`)
      .fill(task);
    await this.agmTimelinePanel
      .getByLabel(`AGM milestone ${milestoneCount} days before AGM`)
      .fill(daysBefore);
  }

  async expectAgmMilestoneTargetDate(index: number, targetDate: string) {
    await expect(
      this.agmTimelinePanel.getByLabel(`AGM milestone ${index} target date`),
    ).toHaveValue(targetDate);
  }

  async expectPastDatesDisabled() {
    await expect(this.monthGrid.locator("button:disabled").first()).toBeVisible();
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
    await this.goToMonthContaining(dateKey);
    await this.monthGrid
      .getByRole("button", { name: `Select ${dateKey}`, exact: true })
      .click();
    await expect(this.page.getByRole("heading", { name: dateKey })).toBeVisible();
    await expect(this.page.getByLabel("Entry date")).toHaveValue(dateKey);
  }

  async setEntryType(option: BoardCalendarEntryType) {
    await this.chooseSelectOption("Entry type", option, this.entryForm);
  }

  async fillMeeting(entry: MeetingEntry) {
    await this.fillTitle(entry.title);
    if (entry.category) {
      await this.chooseSelectOption("Category", entry.category, this.entryForm);
    }
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
      await this.chooseSelectOption("Confirmed?", entry.confirmed, this.entryForm);
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
    if (entry.category) {
      await this.chooseSelectOption("Category", entry.category, this.entryForm);
    }
    if (entry.color) await this.setCalendarColor(entry.color);
    if (entry.notes) await this.page.getByLabel("Notes").fill(entry.notes);
    await this.addToCalendar();
  }

  async addOperationalTask(dateKey: string, entry: OperationalTaskEntry) {
    await this.setEntryType("Operational task");
    await this.selectCalendarDate(dateKey);
    await this.fillTitle(entry.title);
    if (entry.status) {
      await this.chooseSelectOption("Workflow status", entry.status, this.entryForm);
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
    if (entry.track) await this.chooseSelectOption("Track", entry.track, this.entryForm);
    if (entry.status) {
      await this.chooseSelectOption("Workflow status", entry.status, this.entryForm);
    }
    if (entry.daysBeforeAgm) {
      await this.page.getByLabel("Days before AGM").fill(entry.daysBeforeAgm);
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

  async expectDefaultCalendarColor(color: string) {
    await expect(
      this.entryForm.getByLabel("Calendar color", { exact: true }),
    ).toBeVisible();
    await expect(
      this.entryForm.getByLabel("Calendar color hex code"),
    ).toHaveValue(color);
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

  async expectBlankEntryForm() {
    await expect(this.field("Title")).toHaveValue("");
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

  async expectNoEntryText(text: string) {
    await expect(this.page.getByText(text)).toHaveCount(0);
  }

  async expectEmptySchedule() {
    await expect(this.page.getByText("Nothing scheduled yet.")).toBeVisible();
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

  private get deleteDialog(): Locator {
    return this.page.getByRole("dialog", {
      name: "Delete this calendar entry?",
    });
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
        (await this.page
          .getByRole("button", { name: targetLabel, exact: true })
          .count()) > 0
      ) {
        return;
      }

      const currentPeriod = await this.page
        .getByRole("button", { name: /^[A-Z][a-z]+ \d{4}$/ })
        .textContent();
      const currentDate = currentPeriod
        ? new Date(`${currentPeriod} 1`)
        : targetDate;
      const direction =
        currentDate.getTime() < targetDate.getTime()
          ? "Next calendar period"
          : "Previous calendar period";

      await this.page.getByRole("button", { name: direction }).click();
    }

    throw new Error(`Could not navigate calendar to ${targetLabel}`);
  }

  private async chooseSelectOption(
    label: string,
    option: string,
    scope: Locator | Page = this.page,
  ) {
    await scope.getByLabel(label, { exact: true }).click();
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

export function getRelativeDateKey(dateKey: string, daysFromDate: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + daysFromDate);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}
