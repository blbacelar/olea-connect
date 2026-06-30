import { expect, test } from "../fixtures/authenticated.fixture";
import {
  BoardCalendarPage,
  getFutureDateKey,
  getRelativeDateKey,
} from "../pages/board-calendar.page";

test.describe("@critical Board Calendar & Operational Workflow", () => {
  test.setTimeout(60_000);

  test("renders a usable compact month calendar on mobile", async ({ page }) => {
    const boardCalendar = new BoardCalendarPage(page);
    const eventDate = getFutureDateKey(1);

    await page.setViewportSize({ width: 390, height: 844 });
    await boardCalendar.openNewWorkbook();

    await boardCalendar.expectMonthGridFitsViewport();
    await boardCalendar.selectCalendarDate(eventDate);
    await boardCalendar.expectSelectedDateText(eventDate);
  });

  test("covers calendar CRUD, duplicate scheduling, validation, and persistence", async ({
    page,
  }) => {
    const boardCalendar = new BoardCalendarPage(page);
    const eventDate = getFutureDateKey(1);
    const annualNoteDate = getFutureDateKey(2);
    const taskDate = getFutureDateKey(3);
    const agmDate = getFutureDateKey(4);
    const expectedAgmMilestoneDate = getRelativeDateKey(agmDate, -30);

    await test.step("open a new isolated board calendar workbook", async () => {
      await boardCalendar.openNewWorkbook();
      await boardCalendar.nameWorkbook(`E2E Board Calendar ${Date.now()}`);
      await boardCalendar.saveNowAndWaitForPost();
      await boardCalendar.expectSessionPersisted();
      await boardCalendar.waitForSaved();
    });

    await test.step("configure setup, committees, and generated task rules", async () => {
      await boardCalendar.fillSetupBasics({
        organizationName: "E2E Governance Lab",
        fiscalYear: "2026",
        administrator: "Bruno QA",
        administratorEmail: "bruno.qa@example.com",
        executiveDirector: "Executive Tester",
        boardChair: "Chair Tester",
      });
      await boardCalendar.addCommittee("Finance Committee", "Treasurer");
      await boardCalendar.addTaskRule({
        label: "Prepare board briefing",
        days: "10",
        timing: "Before",
        appliesTo: "Board Meeting",
        responsible: "Administrator",
      });
      await boardCalendar.saveNowAndWaitForPost();
      await boardCalendar.waitForSaved();
    });

    await test.step("block invalid new entries for past dates and empty titles", async () => {
      await boardCalendar.chooseWorkspaceView("Calendar workspace");
      await boardCalendar.expectPastDatesDisabled();
      await boardCalendar.selectCalendarDate(eventDate);
      await boardCalendar.fillTitle("");
      await boardCalendar.expectAddDisabled();
    });

    await test.step("create a meeting with every meeting field and inline color", async () => {
      await boardCalendar.addMeeting({
        title: "Board Budget Review",
        category: "Board Meeting",
        color: "#2563eb",
        time: "13:30",
        location: "Boardroom A",
        virtualLink: "https://example.com/board-budget-review",
        leadContact: "Treasurer",
        confirmed: "Yes",
        notes: "Review budget package.",
      });

      await boardCalendar.expectSelectedDateText(
        "Board Meeting - Board Budget Review",
      );
      await boardCalendar.expectSelectedDateText("1:30 PM");
      await boardCalendar.expectSelectedDateText("Boardroom A");
      await boardCalendar.expectSelectedDateText("Review budget package.");
      await boardCalendar.saveNowAndWaitForPost();
      await boardCalendar.waitForSaved();
    });

    await test.step("generate and update staff tasks from setup rules and meeting dates", async () => {
      await boardCalendar.expectGeneratedStaffTask("Prepare board briefing");
      await boardCalendar.updateGeneratedStaffTask(
        1,
        "In Progress",
        "Briefing packet drafted.",
      );
      await boardCalendar.expectGeneratedStaffTaskDetails(
        1,
        "In Progress",
        "Briefing packet drafted.",
      );
      await boardCalendar.saveNowAndWaitForPost();
      await boardCalendar.waitForSaved();
    });

    await test.step("calculate AGM planning target dates from days before AGM", async () => {
      await boardCalendar.addAgmTimelineMilestone({
        agmDate,
        daysBefore: "30",
        task: "Send formal AGM notice",
      });
      await boardCalendar.expectAgmMilestoneTargetDate(
        1,
        expectedAgmMilestoneDate,
      );
      await boardCalendar.saveNowAndWaitForPost();
      await boardCalendar.waitForSaved();
    });

    await test.step("allow a second meeting at the same date and time", async () => {
      await boardCalendar.chooseWorkspaceView("Calendar workspace");
      await boardCalendar.selectCalendarDate(eventDate);
      await boardCalendar.fillMeeting({
        title: "Parallel Finance Committee",
        category: "Committee Meeting",
        time: "13:30",
        location: "Zoom",
        leadContact: "Finance Chair",
        confirmed: "TBC",
        notes: "Same slot as board review.",
      });

      await boardCalendar.expectFieldValue("Title", "Parallel Finance Committee");
      await boardCalendar.expectFieldContainsText("Category", "Committee Meeting");
      await boardCalendar.expectFieldValue("Time", "13:30");
      await boardCalendar.addToCalendar();

      await boardCalendar.expectSelectedDateText(
        "Board Meeting - Board Budget Review",
      );
      await boardCalendar.expectSelectedDateText(
        "Committee Meeting - Parallel Finance Committee",
      );
      await boardCalendar.expectSelectedDateTextCount("1:30 PM", 2);
    });

    await test.step("create annual note, operational task, and AGM milestone", async () => {
      await boardCalendar.addAnnualNote(annualNoteDate, {
        title: "Grant filing deadline",
        category: "Key Deadline",
        color: "#c0392b",
        notes: "Annual calendar note details.",
      });
      await boardCalendar.expectTextVisible("Grant filing deadline");

      await boardCalendar.addOperationalTask(taskDate, {
        title: "Send board package",
        status: "In Progress",
        relatedMeeting: "Board Budget Review",
        responsible: "Administrator",
        done: true,
        notes: "Prepare final board package.",
      });
      await boardCalendar.expectTextVisible("Send board package");

      await boardCalendar.addAgmMilestone(agmDate, {
        title: "Confirm AGM venue",
        track: "Governance",
        status: "Not Started",
        daysBeforeAgm: "84",
        responsible: "Board Chair",
        notes: "Book venue if in person.",
      });
      await boardCalendar.expectTextVisible("Confirm AGM venue");
      await boardCalendar.saveNowAndWaitForPost();
      await boardCalendar.waitForSaved();
    });

    await test.step("edit an existing event without losing time or details", async () => {
      await boardCalendar.selectCalendarDate(eventDate);
      await boardCalendar.editEntry(/Edit Board Meeting - Board Budget Review/);
      await boardCalendar.expectFieldValue("Time", "13:30");
      await boardCalendar.expectFieldValue(
        "Virtual link",
        "https://example.com/board-budget-review",
      );

      await boardCalendar.fillTitle("Board Budget Review Updated");
      await boardCalendar.fillField("Time", "09:00");
      await boardCalendar.fillField("Location / platform", "Hybrid");
      await boardCalendar.updateEntry();

      await boardCalendar.expectSelectedDateText(
        "Board Meeting - Board Budget Review Updated",
      );
      await boardCalendar.expectSelectedDateText("9:00 AM");
      await boardCalendar.expectSelectedDateText("Hybrid");
    });

    await test.step("order same-day meetings by time, keeping duplicate time entries", async () => {
      await boardCalendar.expectSelectedDateText(
        "Board Meeting - Board Budget Review Updated",
      );
      await boardCalendar.expectSelectedDateText(
        "Committee Meeting - Parallel Finance Committee",
      );

      const selectedDateContent = await boardCalendar.selectedDateContent();
      const updatedIndex = selectedDateContent.indexOf(
        "Board Meeting - Board Budget Review Updated",
      );
      const duplicateIndex = selectedDateContent.indexOf(
        "Committee Meeting - Parallel Finance Committee",
      );

      expect(updatedIndex).toBeGreaterThanOrEqual(0);
      expect(duplicateIndex).toBeGreaterThan(updatedIndex);
    });

    await test.step("cancel and confirm delete through the custom dialog", async () => {
      await boardCalendar.selectCalendarDate(eventDate);
      await boardCalendar.editEntry(
        /Edit Committee Meeting - Parallel Finance Committee/,
      );
      await boardCalendar.openDeleteDialog();
      await boardCalendar.cancelDelete();
      await boardCalendar.expectSelectedDateText(
        "Committee Meeting - Parallel Finance Committee",
      );

      await boardCalendar.openDeleteDialog();
      await boardCalendar.confirmDelete();
      await boardCalendar.expectSelectedDateTextCount(
        "Committee Meeting - Parallel Finance Committee",
        0,
      );
    });

    await test.step("persist created and edited data after reload", async () => {
      await boardCalendar.reload();
      await boardCalendar.chooseWorkspaceView("Calendar workspace");
      await boardCalendar.selectCalendarDate(eventDate);
      await boardCalendar.expectTextVisible("Board Budget Review Updated");

      await boardCalendar.selectCalendarDate(annualNoteDate);
      await boardCalendar.expectTextVisible("Grant filing deadline");

      await boardCalendar.selectCalendarDate(taskDate);
      await boardCalendar.expectTextVisible("Send board package");

      await boardCalendar.selectCalendarDate(agmDate);
      await boardCalendar.expectTextVisible("Confirm AGM venue");
      await boardCalendar.expectTextCount(
        "Committee Meeting - Parallel Finance Committee",
        0,
      );
    });
  });
});
