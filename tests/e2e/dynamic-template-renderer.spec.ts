import { expect, test } from "../fixtures/authenticated.fixture";
import { BoardCalendarPage } from "../pages/board-calendar.page";
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

    await boardCalendar.openNewModuleCalendar();

    await boardCalendar.expectWorkspaceViewOptionHidden("Colour key");
    await boardCalendar.chooseWorkspaceView("Calendar workspace");
    await boardCalendar.calendar.expectEmptySchedule();

    await boardCalendar.startNewWorkbook();
    await boardCalendar.calendar.expectBlankEntryForm();
    await boardCalendar.calendar.expectEmptySchedule();
  });

  test("@smoke exports a real dynamic template and audits downloads", async ({
    authenticatedMember,
    page,
    testData,
  }) => {
    const editor = new TemplateEditorPage(page);
    await editor.completeBoardSelfEvaluation();
    await editor.expectAutosaved();
    await editor.generatePdf();

    const countsAfterExport = await testData.getTemplateExportCounts(
      authenticatedMember.organizationId,
    );
    expect(countsAfterExport.exports).toBe(1);

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
    await editor.expectBoardSelfEvaluationPersisted();
  });
});
