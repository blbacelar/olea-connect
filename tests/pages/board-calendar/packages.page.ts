import { expect } from "@playwright/test";

import { BoardCalendarBasePage } from "./base.page";

export class BoardCalendarPackagesPage extends BoardCalendarBasePage {
  get panel() {
    return this.page.getByTestId("board-calendar-packages-panel");
  }

  get auditLogPanel() {
    return this.page.getByTestId("board-calendar-audit-log-panel");
  }

  async addDocument({
    category = "Agenda",
    confidential = true,
    meetingTitle,
    name,
    sizeLabel,
    url,
  }: {
    category?: string;
    confidential?: boolean;
    meetingTitle: string;
    name: string;
    sizeLabel?: string;
    url: string;
  }) {
    await this.chooseWorkspaceView("Board Packages");
    const packageCard = this.packageCard(meetingTitle);
    await packageCard.getByRole("button", { name: "Add file" }).click();

    const dialog = this.page.getByRole("dialog", {
      name: `Add file to ${meetingTitle}`,
    });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Document name").fill(name);
    await this.chooseSelectOption("Document category", category, dialog);
    if (sizeLabel) {
      await dialog.getByLabel("Size or version label").fill(sizeLabel);
    }
    await dialog.getByLabel("Secure document link").fill(url);

    const confidentialCheckbox = dialog.getByLabel(
      "Require confidentiality acknowledgement before opening",
    );
    if (confidential) {
      await confidentialCheckbox.check();
    } else {
      await confidentialCheckbox.uncheck();
    }

    await dialog.getByRole("button", { name: "Add file" }).click();
    await expect(dialog).toHaveCount(0);
    await this.waitForSaved();
  }

  async expectDocument(meetingTitle: string, documentName: string) {
    await this.chooseWorkspaceView("Board Packages");
    await expect(this.packageCard(meetingTitle)).toContainText(documentName);
  }

  async expectDocumentCount(meetingTitle: string, countText: string) {
    await this.chooseWorkspaceView("Board Packages");
    await expect(this.packageCard(meetingTitle)).toContainText(countText);
  }

  async expectConfidentialDownloadPrompt(documentName: string) {
    await this.chooseWorkspaceView("Board Packages");
    await this.panel.getByRole("button", { name: `Open ${documentName}` }).click();
    const dialog = this.page.getByRole("dialog", {
      name: "Open confidential document?",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(documentName);
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
  }

  async downloadPackage(meetingTitle: string) {
    await this.chooseWorkspaceView("Board Packages");
    await this.packageCard(meetingTitle)
      .getByRole("button", { name: "Download package" })
      .click();
    const dialog = this.page.getByRole("dialog", {
      name: "Download board package?",
    });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Download package" }).click();
    await expect(dialog).toHaveCount(0);
    await this.waitForSaved();
  }

  async deleteDocument(documentName: string) {
    await this.chooseWorkspaceView("Board Packages");
    await this.panel.getByRole("button", { name: `Delete ${documentName}` }).click();
    const dialog = this.page.getByRole("dialog", {
      name: "Delete this board document?",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(documentName);
    await dialog.getByRole("button", { name: "Delete document" }).click();
    await expect(dialog).toHaveCount(0);
    await this.waitForSaved();
  }

  async expectDocumentHidden(documentName: string) {
    await this.chooseWorkspaceView("Board Packages");
    await expect(this.panel.getByText(documentName)).toHaveCount(0);
  }

  async expectAuditLog(text: string) {
    await this.chooseWorkspaceView("Audit Log");
    await expect(this.auditLogPanel.getByText(text).first()).toBeVisible();
  }

  private packageCard(meetingTitle: string) {
    return this.panel.locator("section").filter({
      has: this.page.getByRole("heading", { name: meetingTitle, exact: true }),
    });
  }
}
