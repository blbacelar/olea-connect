import {
  createAuthenticatedStorageState,
  expect,
  test,
} from "../fixtures/authenticated.fixture";
import { BoardRecruitmentPage } from "../pages/board-recruitment.page";
import { inspectPdf } from "../support/pdf-inspector";

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

  test("blocks regular organization members from the administrative toolkit", async ({
    browser,
    baseURL,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
    });
    const member = await testData.createOrganizationMember(owner);
    const context = await browser.newContext({
      baseURL,
      storageState: await createAuthenticatedStorageState(
        member.email,
        member.password,
        baseURL,
      ),
    });

    try {
      const page = await context.newPage();
      await page.goto("/modules/board-recruitment");
      await expect(
        page.getByRole("heading", { name: "We could not load this workspace" }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
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

  test("assigns skills to members and updates single-holder risk after deactivation", async ({
    page,
  }) => {
    const recruitment = new BoardRecruitmentPage(page);
    const marker = `Skills QA ${Date.now()}`;
    const firstSkill = `Assigned skill ${Date.now()}`;
    const secondSkill = `Replacement skill ${Date.now()}`;

    let firstSkillCreated = false;
    let secondSkillCreated = false;
    let memberCreated = false;

    try {
      await recruitment.open("matrix");
      await recruitment.addCustomSkill("Professional Expertise", firstSkill);
      firstSkillCreated = true;
      await recruitment.addCustomSkill("Professional Expertise", secondSkill);
      secondSkillCreated = true;

      await recruitment.open("terms");
      await recruitment.addMember(marker, `skills-${Date.now()}@example.test`, [
        firstSkill,
      ]);
      memberCreated = true;

      await recruitment.openTab("Skills Matrix");
      const firstSkillCard = recruitment.skillCard(firstSkill);
      await expect(firstSkillCard).toContainText(marker);
      await expect(firstSkillCard.getByTestId(/skill-risk-/)).toContainText(
        "Single-holder risk",
      );

      await recruitment.openTab("Survey & Send");
      await expect(
        page.getByRole("row").filter({ hasText: marker }),
      ).toContainText("Not started");

      await recruitment.openTab("Board Terms");
      await recruitment.updateMemberSkills(marker, firstSkill, secondSkill);

      await recruitment.openTab("Skills Matrix");
      await expect(recruitment.skillCard(firstSkill)).not.toContainText(marker);
      const secondSkillCard = recruitment.skillCard(secondSkill);
      await expect(secondSkillCard).toContainText(marker);
      await expect(secondSkillCard.getByTestId(/skill-risk-/)).toContainText(
        "Single-holder risk",
      );

      await recruitment.openTab("Board Terms");
      await recruitment
        .memberRow(marker)
        .getByRole("button", { name: `Deactivate ${marker}` })
        .click();
      await expect(recruitment.memberRow(marker)).toContainText("Inactive");

      await recruitment.openTab("Skills Matrix");
      await expect(secondSkillCard).not.toContainText(marker);
      await expect(secondSkillCard).toContainText(
        "No one currently on the board",
      );
      await expect(secondSkillCard.getByTestId(/skill-risk-/)).toHaveCount(0);
    } finally {
      if (memberCreated) {
        await recruitment.openTab("Board Terms");
        await recruitment.deleteMember(marker);
      }
      if (firstSkillCreated || secondSkillCreated) {
        await recruitment.openTab("Skills Matrix");
        if (firstSkillCreated) await recruitment.deleteCustomSkill(firstSkill);
        if (secondSkillCreated)
          await recruitment.deleteCustomSkill(secondSkill);
      }
    }
  });

  test("exports a branded cover page followed by the recruitment report pages", async ({
    page,
  }, testInfo) => {
    const recruitment = new BoardRecruitmentPage(page);
    await recruitment.open("report");
    const download = await recruitment.downloadReport("anonymous");
    const path = testInfo.outputPath("board-recruitment-report.pdf");
    await download.saveAs(path);
    const inspection = await inspectPdf(
      await (await import("node:fs/promises")).readFile(path),
    );
    expect(inspection.pageCount).toBeGreaterThanOrEqual(2);
    expect(inspection.text).toContain("Board Recruitment Toolkit");
    expect(inspection.text).toContain("Skills coverage");
    expect(inspection.text).toContain("Anonymous view");
    expect(inspection.text).not.toContain("Board recruitment, made visible");
    expect(inspection.metadata.title).toContain("Board Recruitment Report");
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
