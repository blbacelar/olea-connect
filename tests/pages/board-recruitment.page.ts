import { expect, type Locator, type Page } from "@playwright/test";

export class BoardRecruitmentPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async open(tab?: string) {
    await this.page.goto(
      `/modules/board-recruitment${tab ? `?tab=${tab}` : ""}`,
    );
    await expect(
      this.page.getByRole("heading", {
        name: "Board recruitment, made visible",
      }),
    ).toBeVisible();
  }

  tab(name: string) {
    return this.page.getByRole("tab", { name });
  }

  async openTab(name: string) {
    await this.tab(name).click();
    await expect(this.tab(name)).toHaveAttribute("data-state", "active");
  }

  dialog() {
    return this.page.getByRole("dialog");
  }

  async addMember(name: string, email: string, skills: string[] = []) {
    await this.page.getByRole("button", { name: "Add member" }).click();
    const dialog = this.dialog();
    await dialog.getByLabel("Full name").fill(name);
    await dialog.getByLabel("Email").fill(email);
    for (const skill of skills) {
      await dialog.getByRole("checkbox", { name: skill, exact: true }).check();
    }
    await dialog.getByRole("button", { name: "Add member" }).click();
    await expect(this.memberRow(name)).toBeVisible();
  }

  async updateMemberSkills(name: string, remove: string, add: string) {
    await this.memberRow(name)
      .getByRole("button", { name: `Edit ${name}` })
      .click();
    const dialog = this.dialog();
    await dialog.getByRole("checkbox", { name: remove, exact: true }).uncheck();
    await dialog.getByRole("checkbox", { name: add, exact: true }).check();
    await dialog.getByRole("button", { name: "Save member" }).click();
    await expect(this.memberRow(name)).toBeVisible();
  }

  memberRow(name: string): Locator {
    return this.page.getByRole("row").filter({ hasText: name });
  }

  async expectMember(name: string) {
    await expect(this.memberRow(name)).toBeVisible();
  }

  async deleteMember(name: string) {
    await this.memberRow(name)
      .getByRole("button", { name: `Delete ${name}` })
      .click();
    await this.dialog().getByRole("button", { name: "Confirm" }).click();
    await expect(this.memberRow(name)).toHaveCount(0);
  }

  committeeCard(name: string): Locator {
    return this.page
      .locator('[data-testid^="committee-card-"]')
      .filter({ hasText: name });
  }

  async addCommittee(name: string) {
    await this.page.getByRole("button", { name: "Add committee" }).click();
    const dialog = this.dialog();
    await dialog.getByLabel("Committee name").fill(name);
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(this.committeeCard(name)).toBeVisible();
  }

  async assignCommitteeMember(committee: string, member: string) {
    await this.committeeCard(committee)
      .getByRole("button", { name: member, exact: true })
      .click();
    await expect(
      this.committeeCard(committee).getByRole("button", {
        name: member,
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
  }

  async setCommitteeChair(committee: string, member: string) {
    const card = this.committeeCard(committee);
    await card
      .getByRole("combobox", { name: `Chair for ${committee}` })
      .click();
    await this.page.getByRole("option", { name: member }).click();
    await card.getByRole("button", { name: "Save chair" }).click();
    await expect(card).toContainText(`Chair: ${member}`);
  }

  async renameCommittee(currentName: string, nextName: string) {
    const card = this.committeeCard(currentName);
    await card.getByRole("button", { name: `Edit ${currentName}` }).click();
    const dialog = this.dialog();
    await dialog.getByLabel("Committee name").fill(nextName);
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(this.committeeCard(nextName)).toBeVisible();
  }

  async deleteCommittee(name: string) {
    const card = this.committeeCard(name);
    await card.getByRole("button", { name: `Delete ${name}` }).click();
    await this.dialog().getByRole("button", { name: "Confirm" }).click();
    await expect(this.committeeCard(name)).toHaveCount(0);
  }

  skillCard(name: string): Locator {
    return this.page
      .locator('[data-testid^="skill-card-"]')
      .filter({ hasText: name });
  }

  async addCustomSkill(category: string, name: string) {
    await this.page
      .getByTestId(`skill-category-${category}`)
      .getByRole("button", { name: "Add skill" })
      .click();
    const dialog = this.dialog();
    await dialog.getByLabel("Skill name").fill(name);
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(this.skillCard(name)).toBeVisible();
  }

  async deleteCustomSkill(name: string) {
    await this.skillCard(name)
      .getByRole("button", { name: `Delete ${name}` })
      .click();
    await this.dialog().getByRole("button", { name: "Confirm" }).click();
    await expect(this.skillCard(name)).toHaveCount(0);
  }

  async expectAllTabsVisible() {
    for (const name of [
      "Overview",
      "Survey & Send",
      "Skills Matrix",
      "Board Terms",
      "Committees",
      "Board Report",
    ]) {
      await expect(this.tab(name)).toBeVisible();
    }
  }

  async downloadReport(view: "identified" | "anonymous" = "identified") {
    await this.openTab("Board Report");
    if (view === "anonymous") {
      await this.page.getByRole("button", { name: "Anonymous" }).click();
    }
    const downloadPromise = this.page.waitForEvent("download");
    await this.page.getByRole("button", { name: "Export PDF" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /Board-Recruitment-Report-\d{4}\.pdf$/,
    );
    return download;
  }
}
