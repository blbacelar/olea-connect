import { expect, test } from "../fixtures/authenticated.fixture";
import {
  BoardCalendarPage,
  getFutureDateKey,
} from "../pages/board-calendar.page";

test.describe("@critical Board Calendar & Operational Workflow", () => {
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

    await test.step("open a new isolated board calendar workbook", async () => {
      await boardCalendar.openNewWorkbook();
      await boardCalendar.nameWorkbook(`E2E Board Calendar ${Date.now()}`);
      await boardCalendar.saveNowAndWaitForPost();
      await boardCalendar.expectSessionPersisted();
      await boardCalendar.waitForSaved();
    });

    await test.step("block invalid new entries for past dates and empty titles", async () => {
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

    await test.step("allow a second meeting at the same date and time", async () => {
      await boardCalendar.fillMeeting({
        title: "Parallel Finance Committee",
        category: "Committee Meeting",
        time: "13:30",
        location: "Zoom",
        leadContact: "Finance Chair",
        confirmed: "TBC",
        notes: "Same slot as board review.",
      });

      await expect(boardCalendar.field("Title")).toHaveValue(
        "Parallel Finance Committee",
      );
      await expect(boardCalendar.field("Category")).toContainText(
        "Committee Meeting",
      );
      await expect(boardCalendar.field("Time")).toHaveValue("13:30");
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
        weeksBeforeAgm: "12",
        responsible: "Board Chair",
        notes: "Book venue if in person.",
      });
      await boardCalendar.expectTextVisible("Confirm AGM venue");
    });

    await test.step("edit an existing event without losing time or details", async () => {
      await boardCalendar.selectCalendarDate(eventDate);
      await boardCalendar.editEntry(/Edit Board Meeting - Board Budget Review/);
      await expect(boardCalendar.field("Time")).toHaveValue("13:30");
      await expect(boardCalendar.field("Virtual link")).toHaveValue(
        "https://example.com/board-budget-review",
      );

      await boardCalendar.fillTitle("Board Budget Review Updated");
      await boardCalendar.field("Time").fill("09:00");
      await boardCalendar.field("Location / platform").fill("Hybrid");
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
      await boardCalendar.expectTextVisible("Board Budget Review Updated");
      await boardCalendar.expectTextVisible("Grant filing deadline");
      await boardCalendar.expectTextVisible("Send board package");
      await boardCalendar.expectTextVisible("Confirm AGM venue");
      await boardCalendar.expectTextCount(
        "Committee Meeting - Parallel Finance Committee",
        0,
      );
    });
  });
});
