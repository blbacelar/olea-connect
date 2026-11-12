import path from "node:path";

import { expect, test } from "../fixtures/authenticated.fixture";
import {
  BoardCalendarPage,
  getFutureDateKey,
  getRelativeDateKey,
} from "../pages/board-calendar.page";

test.use({
  viewport: { width: 1600, height: 900 },
  video: { mode: "on", size: { width: 1600, height: 900 } },
});

test.skip(process.env.RECORD_BOARD_CALENDAR_DEMO !== "1", "Opt-in demo recording");

test("records a Board Calendar workflow with disposable organization data", async ({
  page,
  authenticatedMember,
}) => {
  test.setTimeout(300_000);
  const boardCalendar = new BoardCalendarPage(page);
  const meetingDate = getFutureDateKey(21);
  const taskDate = getRelativeDateKey(meetingDate, -7);
  const meetingTitle = "Board Strategy Meeting";
  const taskTitle = "Prepare board briefing";
  const startedAt = Date.now();
  const scene = (name: string) =>
    console.log(`DEMO_SCENE ${name} ${((Date.now() - startedAt) / 1000).toFixed(2)}`);
  const pause = (ms: number) => page.waitForTimeout(ms);

  await boardCalendar.openNewModuleCalendar();
  await boardCalendar.expectModuleChrome();
  scene("dashboard");
  await pause(4200);

  await boardCalendar.setup.fillBasics({
    organizationName: "Harbour Neighbours Society",
    fiscalYear: String(new Date().getFullYear()),
    administratorEmail: authenticatedMember.email,
    executiveDirector: "Taylor Morgan",
    boardChairEmail: authenticatedMember.email,
  });
  scene("settings");
  await pause(2600);
  await boardCalendar.setup.addTaskRule({
    label: taskTitle,
    days: "7",
    timing: "Before",
    appliesTo: "Board Meeting",
  });
  scene("task-rule");
  await pause(3400);

  await boardCalendar.calendar.selectDate(meetingDate);
  await boardCalendar.calendar.openEntryForm();
  await boardCalendar.calendar.fillMeeting({
    title: meetingTitle,
    category: "Board Meeting",
    time: "13:00",
    location: "Community Hub",
    notes: "Governance priorities, budget, and next steps.",
  });
  scene("meeting-form");
  await pause(2800);
  await boardCalendar.calendar.addToCalendar();
  await boardCalendar.calendar.expectSelectedDateText(meetingTitle);
  await boardCalendar.calendar.selectedDatePanel.scrollIntoViewIfNeeded();
  await expect(boardCalendar.calendar.selectedDateText(meetingTitle).first()).toBeInViewport();
  scene("meeting-saved");
  await pause(4300);

  await boardCalendar.calendar.selectDate(taskDate);
  await boardCalendar.calendar.expectSelectedDateText(taskTitle);
  await boardCalendar.calendar.selectedDatePanel.scrollIntoViewIfNeeded();
  await expect(boardCalendar.calendar.selectedDateText(taskTitle).first()).toBeInViewport();
  scene("generated-task-calendar");
  await pause(4100);

  await boardCalendar.workflows.expectGeneratedTask(taskTitle);
  scene("workflow-list");
  await pause(4700);

  await boardCalendar.meetings.expectMeetingVisible(meetingTitle);
  scene("meeting-schedule");
  await pause(2900);
  await page.getByRole("button", { name: `Open documents for ${meetingTitle}` }).click();
  const documents = page.getByRole("dialog", { name: `Meeting documents: ${meetingTitle}` });
  await expect(documents).toBeVisible();
  await documents.getByLabel("Consent agenda", { exact: true }).fill(
    "Approve prior minutes and review the annual budget.",
  );
  scene("agenda-draft");
  await pause(3200);
  await documents.getByRole("button", { name: "Approve for package" }).click();
  await boardCalendar.waitForSaved();
  await expect(documents.getByText("Approved", { exact: true })).toBeVisible();
  scene("agenda-approved");
  await pause(2700);
  await documents.getByRole("button", { name: "Close" }).first().click();

  await boardCalendar.chooseWorkspaceView("Board Packages");
  await expect(page.getByTestId("board-calendar-packages-panel")).toContainText(meetingTitle);
  scene("board-package");
  await pause(4500);
  await boardCalendar.chooseWorkspaceView("Audit Log");
  await expect(page.getByTestId("board-calendar-audit-log-panel")).toBeVisible();
  scene("audit-log");
  await pause(3300);
  await boardCalendar.chooseWorkspaceView("Dashboard");
  scene("return-dashboard");
  await pause(3300);

  const video = page.video();
  if (!video) throw new Error("Playwright video recording is disabled.");
  await page.close();
  await video.saveAs(path.resolve("demo-videos/board-calendar-demo-raw.webm"));
});
