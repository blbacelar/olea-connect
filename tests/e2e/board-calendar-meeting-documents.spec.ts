import { expect, test } from "../fixtures/authenticated.fixture";
import { BoardCalendarPage, getFutureDateKey } from "../pages/board-calendar.page";

test.describe("@critical Board Calendar meeting documents", () => {
  test.setTimeout(120_000);

  test("creates, persists, approves, exports, and packages an agenda and minutes", async ({ page, authenticatedMember }) => {
    const boardCalendar = new BoardCalendarPage(page);
    await boardCalendar.openNewModuleCalendar();
    await boardCalendar.calendar.selectDate(getFutureDateKey(14));
    await boardCalendar.calendar.addMeeting({ title: "Governance Review", category: "Board Meeting", time: "13:00" });
    await boardCalendar.waitForSaved();
    await boardCalendar.chooseWorkspaceView("Meetings");
    await page.getByRole("button", { name: "Open documents for Governance Review" }).click();
    const dialog = page.getByRole("dialog", { name: "Meeting documents: Governance Review" });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Approve for package" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Add consent or regular agenda items");
    await dialog.getByLabel("Consent agenda", { exact: true }).fill("Approve prior minutes and receive the finance report.");
    await dialog.getByRole("button", { name: "Save draft" }).click();
    await boardCalendar.waitForSaved();
    await dialog.getByRole("button", { name: "Close" }).first().click();
    await page.reload();
    await boardCalendar.chooseWorkspaceView("Meetings");
    await page.getByRole("button", { name: "Open documents for Governance Review" }).click();
    await expect(dialog.getByLabel("Consent agenda", { exact: true })).toHaveValue("Approve prior minutes and receive the finance report.");
    await dialog.getByRole("button", { name: "Approve for package" }).click();
    await boardCalendar.waitForSaved();
    await expect(dialog.getByText("Approved", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Export PDF" })).toBeEnabled();
    const [agendaDownload] = await Promise.all([
      page.waitForEvent("download"),
      dialog.getByRole("button", { name: "Export PDF" }).click(),
    ]);
    expect(agendaDownload.suggestedFilename()).toBe("consent-agenda.pdf");

    await dialog.getByRole("tab", { name: "Board minutes" }).click();
    await dialog.getByLabel("Discussion summary").fill("The board discussed the annual budget and reporting timetable.");
    await dialog.getByRole("button", { name: "Add motion" }).click();
    await dialog.getByLabel("Motion 1", { exact: true }).fill("Approve the annual budget");
    await dialog.getByLabel("For", { exact: true }).fill("4");
    await dialog.getByLabel("Against", { exact: true }).fill("1");
    await dialog.getByRole("button", { name: "Add action" }).click();
    await dialog.getByLabel("Action 1", { exact: true }).fill("Share approved budget with finance");
    await dialog.getByRole("button", { name: "Approve for package" }).click();
    await boardCalendar.waitForSaved();
    await dialog.getByRole("button", { name: "Close" }).first().click();

    await boardCalendar.chooseWorkspaceView("Board Packages");
    const packageCard = page.getByRole("heading", { name: "Governance Review", exact: true }).locator("xpath=ancestor::section[1]");
    await expect(packageCard).toContainText("2 documents");
    await packageCard.getByRole("button", { name: "View files" }).click();
    await expect(packageCard).toContainText("Consent agenda");
    await expect(packageCard).toContainText("Board minutes");
    await boardCalendar.chooseWorkspaceView("Audit Log");
    await expect(page.getByTestId("board-calendar-audit-log-panel")).toContainText(authenticatedMember.fullName);
    await expect(page.getByTestId("board-calendar-audit-log-panel")).toContainText("Package Opened");
  });
});
