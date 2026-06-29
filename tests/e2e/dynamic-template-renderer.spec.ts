import { expect, test } from "../fixtures/authenticated.fixture";
import {
  BoardCalendarPage,
  getFutureDateKey,
} from "../pages/board-calendar.page";

test.describe("@critical dynamic template renderer", () => {
  test("renders board self-evaluation from a database definition and blocks invalid completion", async ({
    page,
  }) => {
    await page.goto("/templates/board-self-evaluation");

    await expect(
      page.getByRole("heading", { name: "Board Self-Evaluation" }),
    ).toBeVisible();
    await expect(page.getByLabel("Board year")).toBeVisible();
    await expect(page.getByLabel("Survey period")).toBeVisible();

    await page.getByRole("button", { name: "Mark complete" }).click();
    await expect(
      page.getByText("Please fix the highlighted fields before completing."),
    ).toBeVisible();
    await expect(page.getByText("Survey period is required.")).toBeVisible();
    await expect(
      page.getByText(
        "The board keeps decisions aligned to the mission. is required.",
      ),
    ).toBeVisible();
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
    await expect(page.getByLabel("Calendar color", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Calendar color hex code")).toHaveValue("#1A6B6B");
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
    await expect(page.getByLabel("Title")).toHaveValue("");
    await expect(
      page.getByText("Board Meeting - Finance Committee"),
    ).toHaveCount(0);
    await expect(page.getByText("Nothing scheduled yet.")).toBeVisible();
  });

  test("@smoke edits repeatable agenda rows, exports files, and audits downloads", async ({
    authenticatedMember,
    page,
    testData,
  }) => {
    await page.goto("/templates/board-meeting-agenda");

    await expect(
      page.getByRole("heading", { name: "Board Meeting Agenda" }),
    ).toBeVisible();
    await page.getByLabel("Meeting title").fill("June board meeting");
    await page.getByRole("textbox", { name: "Meeting date *" }).fill("2026-06-30");

    await page.getByRole("button", { name: "Add row" }).first().click();
    await page.getByLabel("Topic").fill("Finance update");
    await page.getByLabel("Owner").fill("Treasurer");
    await page.getByLabel("Duration in minutes").fill("20");
    await page.getByLabel("Purpose").click();
    await page.getByRole("option", { name: "Decision" }).click();
    await page.getByLabel("Decision required").check();
    await page
      .getByLabel("Decision question")
      .fill("Should we approve the revised budget?");

    await page.getByRole("button", { name: "Add row" }).nth(1).click();
    await page.getByLabel("Document name").fill("Budget package");
    await page
      .getByLabel("Document URL")
      .fill("https://example.com/budget-package");

    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await expect(page.getByText(/^Saved$/)).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Generate PDF" }).click();
    await expect(page.getByText(/\.pdf$/)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Generate DOCX" }).click();
    await expect(page.getByText(/\.docx$/)).toBeVisible({ timeout: 15_000 });

    const countsAfterExport = await testData.getTemplateExportCounts(
      authenticatedMember.organizationId,
    );
    expect(countsAfterExport.exports).toBe(2);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download" }).first().click();
    await downloadPromise;
    await expect
      .poll(async () => {
        const counts = await testData.getTemplateExportCounts(
          authenticatedMember.organizationId,
        );
        return counts.downloads;
      })
      .toBe(1);

    await page.reload();

    await expect(page.getByLabel("Meeting title")).toHaveValue(
      "June board meeting",
    );
    await expect(page.getByLabel("Topic")).toHaveValue("Finance update");
    await expect(page.getByLabel("Document name")).toHaveValue("Budget package");

    await page.getByRole("button", { name: "Add row" }).first().click();
    await page.getByLabel("Topic").nth(1).fill("Executive session");
    await page.getByRole("button", { name: "Move Agenda item 2 up" }).click();
    await expect(page.getByLabel("Topic").first()).toHaveValue(
      "Executive session",
    );

    await page.getByRole("button", { name: "Remove Agenda item 1" }).click();
    await expect(page.getByLabel("Topic").first()).toHaveValue(
      "Finance update",
    );
  });
});
