import { expect } from "@playwright/test";

import { BoardCalendarBasePage } from "./base.page";

export class BoardCalendarSetupPage extends BoardCalendarBasePage {
  get panel() {
    return this.page.getByTestId("board-calendar-setup-panel");
  }

  async fillBasics({
    administrator,
    administratorEmail,
    boardChair,
    executiveDirector,
    fiscalYear,
    organizationName,
  }: {
    administrator: string;
    administratorEmail: string;
    boardChair: string;
    executiveDirector: string;
    fiscalYear: string;
    organizationName: string;
  }) {
    await this.chooseWorkspaceView("Setup");
    await this.panel.getByLabel("Organization name").fill(organizationName);
    await this.panel.getByLabel("Fiscal year").fill(fiscalYear);
    await this.panel.getByLabel("Administrator", { exact: true }).fill(administrator);
    await this.panel.getByLabel("Administrator email").fill(administratorEmail);
    await this.panel.getByLabel("Executive Director").fill(executiveDirector);
    await this.panel.getByLabel("Board Chair").fill(boardChair);
  }

  async addCommittee(name: string, chair: string) {
    const committeeLabels = this.panel.getByLabel(/Committee \d+ name/);
    const previousCommitteeCount = await committeeLabels.count();
    await this.panel.getByRole("button", { name: "Add committee" }).click();
    await expect(committeeLabels).toHaveCount(previousCommitteeCount + 1);

    const committeeCount = previousCommitteeCount + 1;
    await this.panel.getByLabel(`Committee ${committeeCount} name`).fill(name);
    await this.panel.getByLabel(`Committee ${committeeCount} chair`).fill(chair);
    await expect(this.panel.getByLabel(`Committee ${committeeCount} name`)).toHaveValue(
      name,
    );
    await expect(this.panel.getByLabel(`Committee ${committeeCount} chair`)).toHaveValue(
      chair,
    );
  }

  async expectCommittee(name: string, chair: string) {
    await this.chooseWorkspaceView("Setup");
    await expect(this.panel.getByLabel(/Committee \d+ name/).first()).toHaveValue(name);
    await expect(this.panel.getByLabel(/Committee \d+ chair/).first()).toHaveValue(
      chair,
    );
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
