import { expect, test } from "../fixtures/authenticated.fixture";

test("@critical Board Evaluation source survey and summary survive a staging round trip", async ({ page, baseURL }) => {
  test.setTimeout(180_000);
  await page.goto("/modules/board-evaluation");
  await expect(page.getByRole("heading", { name: "Start an annual board evaluation" })).toBeVisible();
  await page.getByRole("button", { name: "Open evaluation" }).click();
  await expect(page.getByRole("link", { name: "Open annual survey" })).toBeVisible({ timeout: 30_000 });

  const surveyLink = await page.getByRole("link", { name: "Open annual survey" }).getAttribute("href");
  expect(surveyLink).toMatch(/^\/board-evaluation\/annual\//);
  await page.goto(surveyLink!);
  await expect(page.getByRole("heading", { name: "Annual Board Self-Evaluation Survey" })).toBeVisible();
  await expect(page.getByRole("group")).toHaveCount(44);
  await expect(page.getByRole("textbox")).toHaveCount(4);

  await page.getByRole("group").first().getByRole("button", { name: "Rating 5" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  await page.reload();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  await page.getByRole("button", { name: "Submit anonymously" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("Some ratings are blank");
  await page.getByRole("button", { name: "Submit anonymously" }).click();
  await expect(page.getByRole("button", { name: "Start a new response" })).toBeVisible({ timeout: 30_000 });
  for (let response = 0; response < 4; response += 1) {
    await page.getByRole("button", { name: "Start a new response" }).click();
    await page.getByRole("group").first().getByRole("button", { name: "Rating 5" }).click();
    await page.getByRole("button", { name: "Submit anonymously" }).click();
    await page.getByRole("button", { name: "Submit anonymously" }).click();
    await expect(page.getByRole("button", { name: "Start a new response" })).toBeVisible({ timeout: 30_000 });
  }

  await page.goto("/modules/board-evaluation");
  await expect(page.getByText("anonymous responses", { exact: true }).first().locator("..")).toContainText("5");
  await page.getByRole("button", { name: "Close survey and calculate results" }).click();
  await expect(page.getByText("Closed", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Summary & action plan" }).click();
  await expect(page.getByRole("heading", { name: "Quantitative results" })).toBeVisible();
  for (const prefix of ["score-count", "score-current", "score-positive", "score-change"]) {
    await expect(page.locator(`[id^="${prefix}-"]`)).toHaveCount(11);
  }
  await expect(page.locator('[id^="theme-"]')).toHaveCount(8);
  await expect(page.locator('[id^="frequency-"]')).toHaveCount(8);
  for (const prefix of ["priority-section", "priority-average", "priority-issue", "priority-actions", "priority-other", "priority-due", "priority-checkin", "priority-measure"]) {
    await expect(page.locator(`[id^="${prefix}-"]`)).toHaveCount(3);
  }
  await expect(page.getByRole("group", { name: "Responsible" })).toHaveCount(3);
  await expect(page.getByRole("group", { name: "Responsible" }).first().getByRole("checkbox")).toHaveCount(4);
  await page.locator("#summary-prepared-by").fill("QA Board Chair");
  await page.locator("#summary-opened-on").fill("2026-10-01");
  await page.locator("#summary-closed-on").fill("2026-10-20");
  await expect(page.locator("#score-count-1")).toHaveValue("5");
  await expect(page.locator("#score-current-1")).toHaveValue("5.00");
  await expect(page.locator("#score-current-1")).toHaveAttribute("readonly", "");
  await expect(page.locator("#score-positive-1")).toHaveValue("100%");
  await page.locator("#score-change-1").fill("0.30");
  await page.locator("#theme-0-0").fill("Clearer agendas");
  await page.locator("#frequency-0-0").fill("4 of 6");
  await page.locator("#theme-0-1").fill("Earlier board packages");
  await page.locator("#frequency-0-1").fill("2 of 6");
  await page.locator("#priority-section-0").fill("Governance");
  await page.locator("#priority-average-0").fill("3.25");
  await page.locator("#priority-issue-0").fill("Late packages");
  await page.locator("#priority-actions-0").fill("Send five days early");
  await page.getByRole("group", { name: "Responsible" }).first().getByLabel("Board Chair").check();
  await page.locator("#priority-other-0").fill("Operations lead");
  await page.locator("#priority-due-0").fill("2027-01-15");
  await page.locator("#priority-checkin-0").fill("2027-07-15");
  await page.locator("#priority-measure-0").fill("On-time board packages");
  await page.getByLabel("Question 1", { exact: true }).fill("What will improve next year?");
  await page.getByRole("button", { name: "Save summary" }).click();
  await expect(page.getByText("Summary and action plan saved.")).toBeVisible({ timeout: 30_000 });
  await page.reload();
  await page.getByRole("tab", { name: "Summary & action plan" }).click();
  await expect(page.locator("#summary-prepared-by")).toHaveValue("QA Board Chair");
  await expect(page.locator("#score-change-1")).toHaveValue("0.30");
  await expect(page.locator("#theme-0-1")).toHaveValue("Earlier board packages");
  await expect(page.locator("#frequency-0-1")).toHaveValue("2 of 6");
  await expect(page.locator("#priority-issue-0")).toHaveValue("Late packages");
  await expect(page.locator("#priority-other-0")).toHaveValue("Operations lead");
  await expect(page.getByLabel("Question 1", { exact: true })).toHaveValue("What will improve next year?");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download branded PDF" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^board-evaluation-\d{4}\.pdf$/);

  if (!baseURL) throw new Error("Playwright baseURL is required.");
  await page.context().addCookies([{ name: "olea_locale", value: "fr-CA", url: baseURL }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByRole("tab", { name: "Résumé et plan d’action" }).click();
  await expect(page.getByLabel("Préparé par")).toHaveValue("QA Board Chair");
  await expect(page.locator("#theme-0-1")).toHaveValue("Earlier board packages");
  await expect(page.locator("#priority-average-0")).toBeVisible();
});
