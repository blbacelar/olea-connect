import { expect, type Page } from "@playwright/test";

export class TemplateEditorPage {
  constructor(private readonly page: Page) {}

  async openBoardSelfEvaluation() {
    await this.page.goto("/templates/board-self-evaluation");
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

  async expectAutosaved() {
    await expect(this.page.getByText(/^Saved$/)).toBeVisible({ timeout: 10_000 });
  }

  async generatePdf() {
    const generateButton = this.page.getByRole("button", { name: "Generate PDF" });
    await expect(generateButton).toBeEnabled({ timeout: 20_000 });
    await generateButton.click();

    const downloadButton = this.page.getByRole("button", { name: "Download" }).first();
    await expect(downloadButton).toBeVisible({ timeout: 90_000 });
    await expect(this.page.locator("p").filter({ hasText: /\.pdf$/ }).first()).toBeVisible({
      timeout: 10_000,
    });
  }

  async downloadFirstExport() {
    const downloadPromise = this.page.waitForEvent("download");
    await this.page.getByRole("button", { name: "Download" }).first().click();
    await downloadPromise;
  }

  async reload() {
    await this.page.reload();
  }

  async expectBoardSelfEvaluationPersisted() {
    await expect(this.page.getByLabel("Board year")).toHaveValue("2026");
    await expect(this.page.getByLabel("Survey period")).toHaveValue("June 2026");
    await expect(
      this.page.getByLabel("What should the board improve over the next year?"),
    ).toHaveValue("We should improve meeting preparation and follow-up.");
  }

  private async answerSelectQuestion(label: string, option: string) {
    await this.chooseSelectOption(label, option);
  }

  private async chooseSelectOption(label: string, option: string) {
    await this.page.getByLabel(label).click();
    await this.page.getByRole("option", { name: option, exact: true }).click();
  }
}
