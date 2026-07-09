import { expect } from "@playwright/test";

import { BoardCalendarBasePage } from "./base.page";

export class BoardCalendarMeetingsPage extends BoardCalendarBasePage {
  async expectMeetingVisible(meetingTitle: string) {
    await this.chooseWorkspaceView("Meeting schedule");
    await expect(
      this.page.getByRole("heading", { name: "Meetings", exact: true }),
    ).toBeVisible();
    await expect(this.page.getByText(meetingTitle).first()).toBeVisible();
  }

  async expectText(text: string) {
    await this.chooseWorkspaceView("Meeting schedule");
    await expect(this.page.getByText(text).first()).toBeVisible();
  }

  async expectDoesNotShow(text: string) {
    await this.chooseWorkspaceView("Meeting schedule");
    await expect(this.page.getByText(text)).toHaveCount(0);
  }
}
