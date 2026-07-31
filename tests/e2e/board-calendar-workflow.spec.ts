import { expect, test } from "../fixtures/authenticated.fixture";
import {
  BoardCalendarPage,
  getFutureDateKey,
  getRelativeDateKey,
} from "../pages/board-calendar.page";

test.describe("@critical Board Calendar & Operational Workflow", () => {
  test.setTimeout(90_000);

  test("is reachable from desktop and mobile app navigation", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("link", { name: "Board Calendar" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Board Calendar" }).click();
    await expect(page).toHaveURL(/\/modules\/board-calendar/);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("link", { name: "Board Calendar" }),
    ).toBeVisible();
  });

  test("opens as a first-class module and keeps saved sessions on the module route", async ({
    page,
    authenticatedMember,
  }) => {
    const boardCalendar = new BoardCalendarPage(page);

    await boardCalendar.openNewModuleCalendar();
    await boardCalendar.expectModuleChrome();
    await boardCalendar.setup.fillBasics({
      organizationName: `E2E Board Calendar Module ${Date.now()}`,
      fiscalYear: "2026",
      administratorEmail: authenticatedMember.email,
      executiveDirector: "Executive Tester",
      boardChairEmail: authenticatedMember.email,
    });
    await boardCalendar.setup.expectChairIsWorkspaceMemberOnly();
    await boardCalendar.setup.expectAdministratorIsWorkspaceMemberOnly();
    await boardCalendar.expectSessionPersisted();
    await expect(page).toHaveURL(/\/modules\/board-calendar\?session=/);
  });

  test("renders a usable compact month calendar on mobile", async ({ page }) => {
    const boardCalendar = new BoardCalendarPage(page);
    const eventDate = getFutureDateKey(1);

    await page.setViewportSize({ width: 390, height: 844 });
    await boardCalendar.openNewModuleCalendar();

    await boardCalendar.calendar.expectMonthGridFitsViewport();
    await boardCalendar.calendar.selectDate(eventDate);
    await boardCalendar.calendar.expectSelectedDateText(eventDate);
  });

  test("covers calendar CRUD, duplicate scheduling, validation, and persistence", async ({
    page,
    authenticatedMember,
  }) => {
    const boardCalendar = new BoardCalendarPage(page);
    const eventDate = getFutureDateKey(14);
    const generatedTaskBeforeDate = getRelativeDateKey(eventDate, -10);
    const legacyGeneratedTaskBeforeDate = getRelativeDateKey(eventDate, -14);
    const generatedTaskAfterDate = getRelativeDateKey(eventDate, 1);
    const annualNoteDate = getFutureDateKey(16);
    const taskDate = getFutureDateKey(17);
    const agmDate = getFutureDateKey(18);
    const expectedAgmMilestoneDate = getRelativeDateKey(agmDate, -30);

    await test.step("open a new isolated board calendar workbook", async () => {
      await boardCalendar.openNewModuleCalendar();
    });

    await test.step("configure setup, committees, and generated task rules", async () => {
      await boardCalendar.setup.fillBasics({
        organizationName: "E2E Governance Lab",
        fiscalYear: "2026",
        administratorEmail: authenticatedMember.email,
        executiveDirector: "Executive Tester",
        boardChairEmail: authenticatedMember.email,
      });
      await boardCalendar.setup.addCommittee(
        "Finance Committee",
        authenticatedMember.email,
      );
      await boardCalendar.setup.addCommittee(
        "Governance Committee",
        authenticatedMember.email,
      );
      await boardCalendar.setup.expectCommittee(
        "Finance Committee",
        authenticatedMember.email,
      );
      await boardCalendar.setup.addTaskRule({
        label: "Prepare board briefing",
        days: "10",
        timing: "Before",
        appliesTo: "Board Meeting",
        responsible: "Administrator",
      });
      await boardCalendar.setup.addTaskRule({
        label: "Send action summary",
        days: "1",
        timing: "After",
        appliesTo: "Board Meeting",
        responsible: "Board Chair",
      });
      await boardCalendar.setup.expectCommittee(
        "Finance Committee",
        authenticatedMember.email,
      );
    });

    await test.step("manage committee directory from a table and edit modal", async () => {
      await boardCalendar.directory.expectCommittee(
        "Finance Committee",
        authenticatedMember.fullName,
      );
      await boardCalendar.directory.expectCommittee(
        "Governance Committee",
        authenticatedMember.fullName,
      );
      await boardCalendar.directory.updateCommittee(1, {
        name: "Finance / Audit Committee",
        chair: authenticatedMember.fullName,
        chairEmail: authenticatedMember.email,
        notes: "Reviews financial reporting and budget readiness.",
      });
      await boardCalendar.directory.expectCommitteeDetails(1, {
        name: "Finance / Audit Committee",
        chair: authenticatedMember.fullName,
        notes: "Reviews financial reporting and budget readiness.",
      });
      await boardCalendar.directory.filterByNotes("Has notes");
      await boardCalendar.directory.expectCommittee(
        "Finance / Audit Committee",
        authenticatedMember.fullName,
      );
      await boardCalendar.directory.expectCommitteeHidden("Governance Committee");
      await boardCalendar.directory.clearFilters();
      await boardCalendar.directory.filterByNotes("No notes");
      await boardCalendar.directory.expectCommittee(
        "Governance Committee",
        authenticatedMember.fullName,
      );
      await boardCalendar.directory.expectCommitteeHidden(
        "Finance / Audit Committee",
      );
      await boardCalendar.directory.clearFilters();
      await boardCalendar.saveNowAndWaitForPost();
      await boardCalendar.expectSessionPersisted();
      await boardCalendar.waitForSaved();
      await boardCalendar.expectWorkspaceViewSelected("Directory");
    });

    await test.step("block invalid new entries for past dates and empty titles", async () => {
      await boardCalendar.chooseWorkspaceView("Calendar workspace");
      await boardCalendar.calendar.expectPastDatesDisabled();
      await boardCalendar.calendar.selectDate(eventDate);
      await boardCalendar.calendar.expectBlankEntryForm();
      await boardCalendar.calendar.expectEntryModalTopVisible();
      await boardCalendar.calendar.expectEntryTitleKeepsFocusWhileTyping(
        "Focus stays while typing",
      );
      await boardCalendar.calendar.fillTitle("");
      await boardCalendar.calendar.expectAddDisabled();
    });

    await test.step("create a meeting with every meeting field and inline color", async () => {
      await boardCalendar.calendar.addMeeting({
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

      await boardCalendar.calendar.expectSelectedDateText(
        "Board Budget Review",
      );
      await boardCalendar.calendar.expectSelectedDateText("1:30 PM");
      await boardCalendar.calendar.expectSelectedDateText("Boardroom A");
      await boardCalendar.calendar.expectSelectedDateText("Review budget package.");
      await boardCalendar.meetings.expectMeetingVisible(
        "Board Budget Review",
      );
      await boardCalendar.meetings.expectText("Treasurer");
      await boardCalendar.meetings.expectDoesNotShow("Send action summary");
      await boardCalendar.calendar.expectGeneratedTaskOnAnyDate([
        { dateKey: generatedTaskBeforeDate, text: "Prepare board briefing" },
        { dateKey: legacyGeneratedTaskBeforeDate, text: "Draft agenda to Chair" },
      ]);
      await boardCalendar.calendar.expectGeneratedTaskOnAnyDate([
        { dateKey: generatedTaskAfterDate, text: "Send action summary" },
        { dateKey: generatedTaskAfterDate, text: "Action items sent" },
      ]);
      await boardCalendar.calendar.expectSelectedDateText(
        "For: Board Budget Review",
      );
      await boardCalendar.saveNowAndWaitForPost();
      await boardCalendar.waitForSaved();
    });

    await test.step("manage board package documents with custom dialogs and audit logs", async () => {
      await boardCalendar.packages.addDocument({
        meetingTitle: "Board Budget Review",
        name: "Board Budget Review agenda",
        category: "Agenda",
        sizeLabel: "v1",
        url: "https://example.com/board-budget-agenda",
      });
      await boardCalendar.packages.expectDocument(
        "Board Budget Review",
        "Board Budget Review agenda",
      );
      await boardCalendar.packages.expectDocumentCount(
        "Board Budget Review",
        "1 document",
      );
      await boardCalendar.packages.expectConfidentialDownloadPrompt(
        "Board Budget Review agenda",
      );
      await boardCalendar.packages.downloadPackage("Board Budget Review");
      await boardCalendar.packages.expectAuditLog("Package Downloaded");
      await boardCalendar.packages.expectAuditLog("Board Budget Review");

      await boardCalendar.packages.deleteDocument("Board Budget Review agenda");
      await boardCalendar.packages.expectDocumentHidden(
        "Board Budget Review agenda",
      );
      await boardCalendar.packages.expectAuditLog("Document Deleted");
    });

    await test.step("generate and update staff tasks from setup rules and meeting dates", async () => {
      await boardCalendar.workflows.expectAnyGeneratedTask([
        "Prepare board briefing",
        "Draft agenda to Chair",
      ]);
      await boardCalendar.calendar.selectDate(generatedTaskBeforeDate);
      await boardCalendar.calendar.editEntry(/Edit Prepare board briefing/);
      await boardCalendar.calendar.expectUpdateEnabled();
      await boardCalendar.calendar.cancelEntryEdit();
      await boardCalendar.workflows.updateTask(
        1,
        "In Progress",
        "Briefing packet drafted.",
      );
      await boardCalendar.workflows.expectTaskDetails(
        1,
        "In Progress",
        "Briefing packet drafted.",
      );
      await boardCalendar.workflows.filterByStatus("In Progress");
      await boardCalendar.workflows.expectTaskVisible("Prepare board briefing");
      await boardCalendar.workflows.expectTaskHidden("Send action summary");
      await boardCalendar.workflows.clearFilters();
      await boardCalendar.saveNowAndWaitForPost();
      await boardCalendar.waitForSaved();
    });

    await test.step("calculate AGM planning target dates from days before AGM", async () => {
      await boardCalendar.settings.addAgmTimelineMilestone({
        agmDate,
        daysBefore: "30",
        notes: "Confirm statutory notice period before sending.",
        task: "Send formal AGM notice",
      });
      await boardCalendar.settings.expectAgmMilestoneTargetDate(
        1,
        expectedAgmMilestoneDate,
      );
      await boardCalendar.settings.expectAgmMilestoneHasNotes(1);
      await boardCalendar.saveNowAndWaitForPost();
      await boardCalendar.waitForSaved();
    });

    await test.step("allow a second meeting at the same date and time", async () => {
      await boardCalendar.chooseWorkspaceView("Calendar workspace");
      await boardCalendar.calendar.selectDate(eventDate);
      await boardCalendar.calendar.fillMeeting({
        title: "Parallel Finance Committee",
        category: "Committee Meeting",
        time: "13:30",
        location: "Zoom",
        leadContact: "Finance Chair",
        confirmed: "TBC",
        notes: "Same slot as board review.",
      });

      await boardCalendar.calendar.expectFieldValue(
        "Title",
        "Parallel Finance Committee",
      );
      await boardCalendar.calendar.expectFieldContainsText(
        "Category",
        "Committee Meeting",
      );
      await boardCalendar.calendar.expectFieldValue("Time", "13:30");
      await boardCalendar.calendar.addToCalendar();

      await boardCalendar.calendar.expectSelectedDateText(
        "Board Budget Review",
      );
      await boardCalendar.calendar.expectSelectedDateText(
        "Parallel Finance Committee",
      );
      await boardCalendar.calendar.expectSelectedDateTextCount("1:30 PM", 2);
    });

    await test.step("create annual note, operational task, and AGM milestone", async () => {
      await boardCalendar.calendar.addAnnualNote(annualNoteDate, {
        title: "Grant filing deadline",
        category: "Key Deadline",
        color: "#c0392b",
        notes: "Annual calendar note details.",
      });
      await boardCalendar.expectTextVisible("Grant filing deadline");

      await boardCalendar.calendar.addOperationalTask(taskDate, {
        title: "Send board package",
        status: "In Progress",
        relatedMeeting: "Board Budget Review",
        responsible: "Administrator",
        done: true,
        notes: "Prepare final board package.",
      });
      await boardCalendar.expectTextVisible("Send board package");

      await boardCalendar.calendar.addAgmMilestone(agmDate, {
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
      await boardCalendar.calendar.selectDate(eventDate);
      await boardCalendar.calendar.editEntry(/Edit Board Budget Review/);
      await boardCalendar.calendar.expectFieldValue("Time", "13:30");
      await boardCalendar.calendar.expectFieldValue(
        "Virtual link",
        "https://example.com/board-budget-review",
      );

      await boardCalendar.calendar.fillTitle("Board Budget Review Updated");
      await boardCalendar.calendar.fillField("Time", "09:00");
      await boardCalendar.calendar.fillField("Location / platform", "Hybrid");
      await boardCalendar.calendar.updateEntry();

      await boardCalendar.calendar.expectSelectedDateText(
        "Board Budget Review Updated",
      );
      await boardCalendar.calendar.expectSelectedDateText("9:00 AM");
      await boardCalendar.calendar.expectSelectedDateText("Hybrid");
    });

    await test.step("order same-day meetings by time, keeping duplicate time entries", async () => {
      await boardCalendar.calendar.expectSelectedDateText(
        "Board Budget Review Updated",
      );
      await boardCalendar.calendar.expectSelectedDateText(
        "Parallel Finance Committee",
      );

      const selectedDateContent = await boardCalendar.calendar.selectedDateContent();
      const updatedIndex = selectedDateContent.indexOf(
        "Board Budget Review Updated",
      );
      const duplicateIndex = selectedDateContent.indexOf(
        "Parallel Finance Committee",
      );

      expect(updatedIndex).toBeGreaterThanOrEqual(0);
      expect(duplicateIndex).toBeGreaterThan(updatedIndex);
    });

    await test.step("cancel and confirm delete through the custom dialog", async () => {
      await boardCalendar.calendar.selectDate(eventDate);
      await boardCalendar.calendar.editEntry(
        /Edit Parallel Finance Committee/,
      );
      await boardCalendar.calendar.openDeleteDialog();
      await boardCalendar.calendar.cancelDelete();
      await boardCalendar.calendar.expectSelectedDateText(
        "Parallel Finance Committee",
      );

      await boardCalendar.calendar.openDeleteDialog();
      await boardCalendar.calendar.confirmDelete();
      await boardCalendar.calendar.expectSelectedDateTextCount(
        "Parallel Finance Committee",
        0,
      );
    });

    await test.step("persist created and edited data after reload", async () => {
      await boardCalendar.reload();
      await boardCalendar.chooseWorkspaceView("Calendar workspace");
      await boardCalendar.calendar.selectDate(eventDate);
      await boardCalendar.expectTextVisible("Board Budget Review Updated");

      await boardCalendar.calendar.selectDate(annualNoteDate);
      await boardCalendar.expectTextVisible("Grant filing deadline");

      await boardCalendar.calendar.selectDate(taskDate);
      await boardCalendar.expectTextVisible("Send board package");

      await boardCalendar.calendar.selectDate(agmDate);
      await boardCalendar.expectTextVisible("Confirm AGM venue");
      await boardCalendar.expectTextCount(
        "Parallel Finance Committee",
        0,
      );
    });
  });
});
