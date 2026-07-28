import { expect, test } from "../fixtures/authenticated.fixture";
import { BoardRecruitmentPage } from "../pages/board-recruitment.page";

test.describe("@critical Board Recruitment Toolkit", () => {
  test("opens the tenant-scoped toolkit and exposes all modules", async ({
    page,
  }) => {
    const recruitment = new BoardRecruitmentPage(page);

    await recruitment.open();
    await recruitment.expectAllTabsVisible();
    await recruitment.openTab("Skills Matrix");
    await expect(
      page.getByRole("heading", { name: "Skills Matrix" }),
    ).toBeVisible();
    await recruitment.openTab("Board Report");
    await expect(
      page.getByRole("heading", { name: "Printable recruitment report" }),
    ).toBeVisible();
  });

  test("supports isolated roster and committee CRUD", async ({ page }) => {
    const recruitment = new BoardRecruitmentPage(page);
    const marker = `Recruitment QA ${Date.now()}`;
    const committee = `${marker} Committee`;
    const renamedCommittee = `${marker} Renamed Committee`;
    await recruitment.open("terms");

    await recruitment.addMember(
      marker,
      `recruitment-${Date.now()}@example.test`,
    );
    await recruitment.expectMember(marker);

    const row = recruitment.memberRow(marker);
    await row.getByRole("button", { name: `Edit ${marker}` }).click();
    await recruitment
      .dialog()
      .getByLabel("Role title")
      .fill("Governance Chair");
    await recruitment
      .dialog()
      .getByRole("button", { name: "Save member" })
      .click();
    await expect(recruitment.memberRow(marker)).toContainText(
      "Governance Chair",
    );

    await recruitment.openTab("Committees");
    await recruitment.addCommittee(committee);
    await recruitment.assignCommitteeMember(committee, marker);
    await recruitment.setCommitteeChair(committee, marker);
    await recruitment.renameCommittee(committee, renamedCommittee);

    await recruitment.openTab("terms");
    await row.getByRole("button", { name: `Deactivate ${marker}` }).click();
    await expect(recruitment.memberRow(marker)).toContainText("Inactive");
    await recruitment.deleteMember(marker);

    await recruitment.openTab("Committees");
    await recruitment.deleteCommittee(renamedCommittee);
  });

  test("supports custom skill CRUD and identified or anonymous reporting", async ({
    page,
  }) => {
    const recruitment = new BoardRecruitmentPage(page);
    const skill = `Recruitment skill ${Date.now()}`;
    await recruitment.open("matrix");
    await recruitment.addCustomSkill("Professional Expertise", skill);
    await expect(recruitment.skillCard(skill)).toContainText(skill);
    await recruitment.deleteCustomSkill(skill);

    await recruitment.openTab("Board Report");
    await expect(
      page.getByRole("heading", { name: "Printable recruitment report" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Anonymous" }).click();
    await expect(page.getByText(/Anonymous view/)).toBeVisible();
  });

  test("keeps survey preview limited to active directors and tracks invitation lifecycle", async ({
    page,
  }) => {
    const recruitment = new BoardRecruitmentPage(page);
    const marker = `Survey Director ${Date.now()}`;
    await recruitment.open("terms");
    await recruitment.addMember(marker, `survey-${Date.now()}@example.test`);
    await recruitment.openTab("Survey & Send");
    await expect(
      page.getByRole("heading", { name: "Survey & Send" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send to all not-yet-invited" }),
    ).toBeVisible();
    const surveyRow = page.getByRole("row").filter({ hasText: marker });
    await surveyRow.getByRole("button", { name: "Send" }).click();
    await expect(surveyRow).toContainText("Invited");
    await expect(page.getByRole("cell", { name: marker })).toBeVisible();
    await expect(page.getByText("Preview member")).toBeVisible();

    await page.getByRole("button", { name: "Submit response" }).click();
    await expect(surveyRow).toContainText("Responded");
  });
});
