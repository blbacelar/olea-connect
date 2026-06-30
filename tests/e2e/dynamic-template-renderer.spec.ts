import { expect, test } from "../fixtures/authenticated.fixture";
import {
  BoardCalendarPage,
  getFutureDateKey,
} from "../pages/board-calendar.page";
import { TemplateEditorPage } from "../pages/template-editor.page";

test.describe("@critical dynamic template renderer", () => {
  test("renders board self-evaluation from a database definition and blocks invalid completion", async ({
    page,
  }) => {
    const editor = new TemplateEditorPage(page);
    await editor.openBoardSelfEvaluation();
    await editor.expectTemplateHeading("Board Self-Evaluation");
    await editor.expectBoardSelfEvaluationFieldsVisible();
    await editor.markComplete();
    await editor.expectInvalidCompletionErrors();
  });

  test("creates a board calendar workbook and starts a separate blank workbook", async ({
    page,
  }) => {
    const boardCalendar = new BoardCalendarPage(page);
    const futureDate = getFutureDateKey(1);

    await boardCalendar.openNewWorkbook();

    await boardCalendar.nameWorkbook("2026 Board Calendar - Test workbook");
    await boardCalendar.saveNowAndWaitForPost();
    await boardCalendar.expectSessionPersisted();
    await boardCalendar.waitForSaved();
    await boardCalendar.expectWorkspaceViewOptionHidden("Colour key");
    await boardCalendar.expectDefaultCalendarColor("#1A6B6B");
    await boardCalendar.selectCalendarDate(futureDate);
    await boardCalendar.addMeeting({
      title: "Finance Committee",
      color: "#2563eb",
      time: "18:30",
      location: "Boardroom",
      virtualLink: "https://example.com/finance-committee",
      leadContact: "Treasurer",
      confirmed: "Yes",
      notes: "Review quarterly budget.",
    });

    await boardCalendar.expectSelectedDateText("Board Meeting - Finance Committee");
    await boardCalendar.expectSelectedDateText(futureDate);
    await boardCalendar.expectSelectedDateText("6:30 PM");
    await boardCalendar.expectSelectedDateText("Boardroom");
    await boardCalendar.saveNowAndWaitForPost();
    await boardCalendar.waitForSaved();

    await boardCalendar.startNewWorkbook();
    await boardCalendar.expectBlankEntryForm();
    await boardCalendar.expectNoEntryText("Board Meeting - Finance Committee");
    await boardCalendar.expectEmptySchedule();
  });

  test("@smoke edits repeatable agenda rows, exports files, and audits downloads", async ({
    authenticatedMember,
    page,
    testData,
  }) => {
    const editor = new TemplateEditorPage(page);
    await editor.fillBoardMeetingAgenda();
    await editor.expectAutosaved();
    await editor.generatePdfAndDocx();

    const countsAfterExport = await testData.getTemplateExportCounts(
      authenticatedMember.organizationId,
    );
    expect(countsAfterExport.exports).toBe(2);

    await editor.downloadFirstExport();
    await expect
      .poll(async () => {
        const counts = await testData.getTemplateExportCounts(
          authenticatedMember.organizationId,
        );
        return counts.downloads;
      })
      .toBe(1);

    await editor.reload();
    await editor.expectBoardMeetingAgendaPersisted();
    await editor.reorderAgendaRows();
    await editor.removeFirstAgendaRow();
  });
});
