import { expect } from "@playwright/test";

import { BoardCalendarBasePage } from "./base.page";

export class BoardCalendarSetupPage extends BoardCalendarBasePage {
  get panel() {
    return this.page.getByTestId("board-calendar-setup-panel");
  }

  async fillBasics({
    administratorEmail,
    boardChairEmail,
    executiveDirector,
    fiscalYear,
    organizationName,
  }: {
    administratorEmail: string;
    boardChairEmail?: string;
    executiveDirector: string;
    fiscalYear: string;
    organizationName: string;
  }) {
    await this.chooseWorkspaceView("Setup");
    await this.panel.getByLabel("Organization name").fill(organizationName);
    await this.panel.getByLabel("Fiscal year").fill(fiscalYear);
    await this.chooseWorkspaceMember("Administrator", administratorEmail);
    await this.panel.getByLabel("Executive Director").fill(executiveDirector);
    if (boardChairEmail) {
      await this.chooseWorkspaceMember("Board Chair", boardChairEmail);
    }

    await expect(this.panel.getByLabel("Organization name")).toHaveValue(
      organizationName,
    );
    await expect(this.panel.getByLabel("Fiscal year")).toHaveValue(fiscalYear);
    await expect(this.panel.getByLabel("Administrator")).toContainText(
      administratorEmail,
    );
    await expect(this.panel.getByLabel("Executive Director")).toHaveValue(
      executiveDirector,
    );
    if (boardChairEmail) {
      await expect(this.panel.getByLabel("Board Chair")).toContainText(
        boardChairEmail,
      );
    }
  }

  async addCommittee(name: string, chairEmail?: string) {
    const committeeLabels = this.panel.getByLabel(/Committee \d+ name/);
    const previousCommitteeCount = await committeeLabels.count();
    await this.panel.getByRole("button", { name: "Add committee" }).click();
    await expect(committeeLabels).toHaveCount(previousCommitteeCount + 1);

    const committeeCount = previousCommitteeCount + 1;
    await this.panel.getByLabel(`Committee ${committeeCount} name`).fill(name);
    if (chairEmail) {
      await this.chooseWorkspaceMember(
        `Committee ${committeeCount} chair`,
        chairEmail,
      );
    }
    await expect(this.panel.getByLabel(`Committee ${committeeCount} name`)).toHaveValue(
      name,
    );
    if (chairEmail) {
      await expect(
        this.panel.getByLabel(`Committee ${committeeCount} chair`),
      ).toContainText(chairEmail);
    }
  }

  async expectCommittee(name: string, chairEmail: string) {
    await this.chooseWorkspaceView("Setup");
    await expect(this.panel.getByLabel(/Committee \d+ name/).first()).toHaveValue(name);
    await expect(this.panel.getByLabel(/Committee \d+ chair/).first()).toContainText(
      chairEmail,
    );
  }

  async expectChairIsWorkspaceMemberOnly() {
    await this.chooseWorkspaceView("Setup");
    await expect(this.panel.getByLabel("Board Chair")).toBeVisible();
    await expect(
      this.panel.getByRole("textbox", { name: "Board Chair" }),
    ).toHaveCount(0);
  }

  async expectAdministratorIsWorkspaceMemberOnly() {
    await this.chooseWorkspaceView("Setup");
    await expect(this.panel.getByLabel("Administrator")).toBeVisible();
    await expect(
      this.panel.getByRole("textbox", { name: "Administrator" }),
    ).toHaveCount(0);
    await expect(this.panel.getByLabel("Administrator email")).toHaveCount(0);
  }

  private async chooseWorkspaceMember(label: string, email: string) {
    await this.panel.getByLabel(label).click();
    await this.page.getByRole("option", { name: new RegExp(email, "i") }).click();
  }

  async addTaskRule({
    appliesTo = "Any meeting",
    days = "14",
    label,
    responsible = "Administrator",
    timing = "Before",
  }: {
    appliesTo?: string;
    days?: string;
    label: string;
    responsible?: string;
    timing?: "After" | "Before";
  }) {
    const ruleLabels = this.panel.getByLabel(/Task rule \d+ label/);
    const previousRuleCount = await ruleLabels.count();
    await this.panel.getByRole("button", { name: "Add task rule" }).click();
    await expect(ruleLabels).toHaveCount(previousRuleCount + 1);

    const ruleCount = previousRuleCount + 1;
    await this.panel.getByLabel(`Task rule ${ruleCount} label`).fill(label);
    await this.panel.getByLabel(`Task rule ${ruleCount} days`).fill(days);
    await this.chooseSelectOption(`Task rule ${ruleCount} timing`, timing, this.panel);
    await this.chooseSelectOption(
      `Task rule ${ruleCount} applies to`,
      appliesTo,
      this.panel,
    );
    await this.chooseSelectOption(
      `Task rule ${ruleCount} responsible`,
      responsible,
      this.panel,
    );
  }
}
