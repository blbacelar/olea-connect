import type { Page } from "@playwright/test";

import { BoardCalendarBasePage } from "./base.page";
import { BoardCalendarCalendarPage } from "./calendar.page";
import { BoardCalendarDirectoryPage } from "./directory.page";
import { BoardCalendarMeetingsPage } from "./meetings.page";
import { BoardCalendarPackagesPage } from "./packages.page";
import { BoardCalendarSettingsPage } from "./settings.page";
import { BoardCalendarSetupPage } from "./setup.page";
import { BoardCalendarWorkflowsPage } from "./workflows.page";

export class BoardCalendarPage extends BoardCalendarBasePage {
  readonly calendar: BoardCalendarCalendarPage;
  readonly directory: BoardCalendarDirectoryPage;
  readonly meetings: BoardCalendarMeetingsPage;
  readonly packages: BoardCalendarPackagesPage;
  readonly settings: BoardCalendarSettingsPage;
  readonly setup: BoardCalendarSetupPage;
  readonly workflows: BoardCalendarWorkflowsPage;

  constructor(page: Page) {
    super(page);
    this.calendar = new BoardCalendarCalendarPage(page);
    this.directory = new BoardCalendarDirectoryPage(page);
    this.meetings = new BoardCalendarMeetingsPage(page);
    this.packages = new BoardCalendarPackagesPage(page);
    this.settings = new BoardCalendarSettingsPage(page);
    this.setup = new BoardCalendarSetupPage(page);
    this.workflows = new BoardCalendarWorkflowsPage(page);
  }
}

export * from "./base.page";
export * from "./types";
