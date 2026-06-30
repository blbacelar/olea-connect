import { expect, type Page } from "@playwright/test";

export class TemplateEditorPage {
  constructor(private readonly page: Page) {}

  async openBoardSelfEvaluation() {
    await this.page.goto("/templates/board-self-evaluation");
  }

  async openBoardMeetingAgenda() {
    await this.page.goto("/templates/board-meeting-agenda");
  }

  async expectTemplateHeading(name: string) {
    await expect(this.page.getByRole("heading", { name })).toBeVisible();
  }

  async expectBoardSelfEvaluationFieldsVisible() {
    await expect(this.page.getByLabel("Board year")).toBeVisible();
    await expect(this.page.getByLabel("Survey period")).toBeVisible();
  }

  async markComplete() {
    await this.page.getByRole("button", { name: "Mark complete" }).click();
  }

  async expectInvalidCompletionErrors() {
    await expect(
      this.page.getByText("Please fix the highlighted fields before completing."),
    ).toBeVisible();
    await expect(this.page.getByText("Survey period is required.")).toBeVisible();
    await expect(
      this.page.getByText(
        "The board keeps decisions aligned to the mission. is required.",
      ),
    ).toBeVisible();
  }

  async completeBoardSelfEvaluation() {
    await this.openBoardSelfEvaluation();

    await this.page.getByLabel("Board year").fill("2026");
    await this.page.getByLabel("Survey period").fill("June 2026");
    await this.answerSelectQuestion(
      "The board keeps decisions aligned to the mission.",
      "5 - Strong",
    );
    await this.answerSelectQuestion(
      "Directors understand their governance responsibilities.",
      "4",
    );
    await this.answerSelectQuestion(
      "Board meetings use time well and focus on the right topics.",
      "4",
    );
    await this.page
      .getByLabel("What should the board improve over the next year?")
      .fill("We should improve meeting preparation and follow-up.");
    await this.markComplete();
  }

  async expectCompleted() {
    await expect(this.page.getByText(/^Saved$/)).toBeVisible({ timeout: 10_000 });
    await expect(this.page.getByText("100% complete")).toBeVisible();
  }

  async fillBoardMeetingAgenda() {
    await this.openBoardMeetingAgenda();
    await this.expectTemplateHeading("Board Meeting Agenda");

    await this.page.getByLabel("Meeting title").fill("June board meeting");
    await this.page
      .getByRole("textbox", { name: "Meeting date *" })
      .fill("2026-06-30");

    await this.addAgendaItem({
      decisionQuestion: "Should we approve the revised budget?",
      durationMinutes: "20",
      owner: "Treasurer",
      purpose: "Decision",
      requiresDecision: true,
      topic: "Finance update",
    });
    await this.addSupportingDocument({
      name: "Budget package",
      url: "https://example.com/budget-package",
    });
  }

  async expectAutosaved() {
    await expect(this.page.getByText(/^Saved$/)).toBeVisible({ timeout: 10_000 });
  }

  async generatePdfAndDocx() {
    await this.page.getByRole("button", { name: "Generate PDF" }).click();
    await expect(this.page.getByText(/\.pdf$/)).toBeVisible({ timeout: 15_000 });
    await this.page.getByRole("button", { name: "Generate DOCX" }).click();
    await expect(this.page.getByText(/\.docx$/)).toBeVisible({ timeout: 15_000 });
  }

  async downloadFirstExport() {
    const downloadPromise = this.page.waitForEvent("download");
    await this.page.getByRole("button", { name: "Download" }).first().click();
    await downloadPromise;
  }

  async reload() {
    await this.page.reload();
  }

  async expectBoardMeetingAgendaPersisted() {
    await expect(this.page.getByLabel("Meeting title")).toHaveValue(
      "June board meeting",
    );
    await expect(this.page.getByLabel("Topic")).toHaveValue("Finance update");
    await expect(this.page.getByLabel("Document name")).toHaveValue("Budget package");
  }

  async reorderAgendaRows() {
    await this.page.getByRole("button", { name: "Add row" }).first().click();
    await this.page.getByLabel("Topic").nth(1).fill("Executive session");
    await this.page.getByRole("button", { name: "Move Agenda item 2 up" }).click();
    await expect(this.page.getByLabel("Topic").first()).toHaveValue(
      "Executive session",
    );
  }

  async removeFirstAgendaRow() {
    await this.page.getByRole("button", { name: "Remove Agenda item 1" }).click();
    await expect(this.page.getByLabel("Topic").first()).toHaveValue(
      "Finance update",
    );
  }

  private async addAgendaItem({
    decisionQuestion,
    durationMinutes,
    owner,
    purpose,
    requiresDecision,
    topic,
  }: {
    decisionQuestion: string;
    durationMinutes: string;
    owner: string;
    purpose: string;
    requiresDecision: boolean;
    topic: string;
  }) {
    await this.page.getByRole("button", { name: "Add row" }).first().click();
    await this.page.getByLabel("Topic").fill(topic);
    await this.page.getByLabel("Owner").fill(owner);
    await this.page.getByLabel("Duration in minutes").fill(durationMinutes);
    await this.chooseSelectOption("Purpose", purpose);
    if (requiresDecision) {
      await this.page.getByLabel("Decision required").check();
    }
    await this.page.getByLabel("Decision question").fill(decisionQuestion);
  }

  private async addSupportingDocument({
    name,
    url,
  }: {
    name: string;
    url: string;
  }) {
    await this.page.getByRole("button", { name: "Add row" }).nth(1).click();
    await this.page.getByLabel("Document name").fill(name);
    await this.page.getByLabel("Document URL").fill(url);
  }

  private async answerSelectQuestion(label: string, option: string) {
    await this.chooseSelectOption(label, option);
  }

  private async chooseSelectOption(label: string, option: string) {
    await this.page.getByLabel(label).click();
    await this.page.getByRole("option", { name: option, exact: true }).click();
  }
}
