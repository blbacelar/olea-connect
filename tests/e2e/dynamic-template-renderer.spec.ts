import { expect, test } from "../fixtures/authenticated.fixture";

test.describe("@critical dynamic template renderer", () => {
  test("renders board self-evaluation from a database definition and blocks invalid completion", async ({
    page,
  }) => {
    await page.goto("/templates/board-self-evaluation");

    await expect(
      page.getByRole("heading", { name: "Board Self-Evaluation" }),
    ).toBeVisible();
    await expect(page.getByLabel("Board year")).toBeVisible();
    await expect(page.getByLabel("Survey period")).toBeVisible();

    await page.getByRole("button", { name: "Mark complete" }).click();
    await expect(
      page.getByText("Please fix the highlighted fields before completing."),
    ).toBeVisible();
    await expect(page.getByText("Survey period is required.")).toBeVisible();
    await expect(
      page.getByText(
        "The board keeps decisions aligned to the mission. is required.",
      ),
    ).toBeVisible();
  });

  test("creates, edits, and deletes a board calendar entry from a new workbook", async ({
    page,
  }) => {
    const futureDate = getFutureDateKey(14);

    await page.goto("/templates/board-calendar-operational-workflow?session=new");

    await expect(
      page.getByRole("heading", { name: "Board Calendar & Operational Workflow" }),
    ).toBeVisible();
    await page
      .getByLabel("Workbook name")
      .fill("2026 Board Calendar - Test workbook");
    await page.getByLabel("Entry date").fill("2026-01-14");
    await page.getByLabel("Title").fill("Finance Committee");
    await expect(page.getByRole("button", { name: "Add to calendar" })).toBeDisabled();
    await expect(
      page.getByText("Choose today or a future date to add a new entry."),
    ).toBeVisible();
    await page.getByRole("button", { name: /^January 2026$/ }).click();
    await expect(page.getByRole("button", { name: /14 Past/ })).toBeDisabled();
    await page.getByLabel("Entry date").fill(futureDate);
    await page.getByLabel("Time").fill("18:30");
    await page.getByLabel("Location / platform").fill("Boardroom");
    await page
      .getByLabel("Virtual link")
      .fill("https://example.com/finance-committee");
    await page.getByLabel("Lead contact").fill("Treasurer");
    await page.getByLabel("Confirmed?").click();
    await page.getByRole("option", { name: "Yes" }).click();
    await page.getByLabel("Notes").fill("Review quarterly budget.");
    await page.getByRole("button", { name: "Add to calendar" }).click();

    await expect(page.getByText("Board Meeting - Finance Committee").first()).toBeVisible();
    await expect(page.getByText(futureDate).first()).toBeVisible();
    await expect(page.getByText("6:30 PM").first()).toBeVisible();
    await expect(page.getByText("Boardroom").first()).toBeVisible();
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await expect(page.getByText(/^Saved$/)).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(() => new URL(page.url()).searchParams.get("session"))
      .not.toBe("new");

    await page.getByRole("link", { name: "Start new" }).click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("session"))
      .toBe("new");
    await expect(page.getByLabel("Title")).toHaveValue("");
    await page
      .getByLabel("Workbook name")
      .fill("2027 Board Calendar - Test workbook");
    await page.getByLabel("Title").fill("Governance Committee");
    await page.getByLabel("Time").fill("17:00");
    await page.getByLabel("Location / platform").fill("Zoom");
    await page
      .getByLabel("Virtual link")
      .fill("https://example.com/governance-committee");
    await page.getByLabel("Lead contact").fill("Governance Chair");
    await page.getByRole("button", { name: "Add to calendar" }).click();
    await expect(page.getByText("Board Meeting - Governance Committee").first()).toBeVisible();
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await expect(page.getByText(/^Saved$/)).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(() => new URL(page.url()).searchParams.get("session"))
      .not.toBe("new");

    await page
      .getByRole("button", { name: /Edit Board Meeting - Governance Committee/ })
      .first()
      .click();
    await expect(page.getByRole("heading", { name: "Edit entry" })).toBeVisible();
    await expect(page.getByLabel("Title")).toHaveValue("Governance Committee");

    await page.getByRole("button", { name: "Edit entry" }).last().click();
    await expect(page.getByLabel("Virtual link")).toHaveValue(
      "https://example.com/governance-committee",
    );
    await expect(page.getByLabel("Lead contact")).toHaveValue("Governance Chair");
    await page.getByLabel("Title").fill("Governance and Nominating Committee");
    await page.getByLabel("Time").fill("19:00");
    await page.getByRole("button", { name: "Update entry" }).click();

    await expect(
      page.getByText("Board Meeting - Governance and Nominating Committee").first(),
    ).toBeVisible();
    await expect(page.getByText("7:00 PM").first()).toBeVisible();

    await page.getByRole("button", { name: "Edit entry" }).last().click();
    await page.getByRole("button", { name: "Delete entry" }).first().click();
    await expect(
      page.getByRole("dialog", { name: "Delete this calendar entry?" }),
    ).toBeVisible();
    await page
      .getByRole("dialog", { name: "Delete this calendar entry?" })
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await expect(
      page.getByText("Board Meeting - Governance and Nominating Committee").first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete entry" }).last().click();
    await page
      .getByRole("dialog", { name: "Delete this calendar entry?" })
      .getByRole("button", { name: "Delete entry" })
      .click();
    await expect(page.getByText("Nothing scheduled yet.")).toBeVisible();
  });

  test("@smoke edits repeatable agenda rows, exports files, and audits downloads", async ({
    authenticatedMember,
    page,
    testData,
  }) => {
    await page.goto("/templates/board-meeting-agenda");

    await expect(
      page.getByRole("heading", { name: "Board Meeting Agenda" }),
    ).toBeVisible();
    await page.getByLabel("Meeting title").fill("June board meeting");
    await page.getByRole("textbox", { name: "Meeting date *" }).fill("2026-06-30");

    await page.getByRole("button", { name: "Add row" }).first().click();
    await page.getByLabel("Topic").fill("Finance update");
    await page.getByLabel("Owner").fill("Treasurer");
    await page.getByLabel("Duration in minutes").fill("20");
    await page.getByLabel("Purpose").click();
    await page.getByRole("option", { name: "Decision" }).click();
    await page.getByLabel("Decision required").check();
    await page
      .getByLabel("Decision question")
      .fill("Should we approve the revised budget?");

    await page.getByRole("button", { name: "Add row" }).nth(1).click();
    await page.getByLabel("Document name").fill("Budget package");
    await page
      .getByLabel("Document URL")
      .fill("https://example.com/budget-package");

    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await expect(page.getByText(/^Saved$/)).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Generate PDF" }).click();
    await expect(page.getByText(/\.pdf$/)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Generate DOCX" }).click();
    await expect(page.getByText(/\.docx$/)).toBeVisible({ timeout: 15_000 });

    const countsAfterExport = await testData.getTemplateExportCounts(
      authenticatedMember.organizationId,
    );
    expect(countsAfterExport.exports).toBe(2);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download" }).first().click();
    await downloadPromise;
    await expect
      .poll(async () => {
        const counts = await testData.getTemplateExportCounts(
          authenticatedMember.organizationId,
        );
        return counts.downloads;
      })
      .toBe(1);

    await page.reload();

    await expect(page.getByLabel("Meeting title")).toHaveValue(
      "June board meeting",
    );
    await expect(page.getByLabel("Topic")).toHaveValue("Finance update");
    await expect(page.getByLabel("Document name")).toHaveValue("Budget package");

    await page.getByRole("button", { name: "Add row" }).first().click();
    await page.getByLabel("Topic").nth(1).fill("Executive session");
    await page.getByRole("button", { name: "Move Agenda item 2 up" }).click();
    await expect(page.getByLabel("Topic").first()).toHaveValue(
      "Executive session",
    );

    await page.getByRole("button", { name: "Remove Agenda item 1" }).click();
    await expect(page.getByLabel("Topic").first()).toHaveValue(
      "Finance update",
    );
  });
});

function getFutureDateKey(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
