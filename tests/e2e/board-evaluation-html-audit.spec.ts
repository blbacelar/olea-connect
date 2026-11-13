import { expect, test } from "../fixtures/authenticated.fixture";

test("@critical Board Evaluation source survey and summary survive a staging round trip", async ({ page }) => {
  test.setTimeout(120_000);
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

  await page.goto("/modules/board-evaluation");
  await page.getByRole("tab", { name: "Summary & action plan" }).click();
  await expect(page.getByRole("heading", { name: "Quantitative results" })).toBeVisible();
  await page.getByLabel("Question 1", { exact: true }).fill("What will improve next year?");
  await page.getByRole("button", { name: "Save summary" }).click();
  await expect(page.getByText("Summary and action plan saved.")).toBeVisible({ timeout: 30_000 });
  await page.reload();
  await page.getByRole("tab", { name: "Summary & action plan" }).click();
  await expect(page.getByLabel("Question 1", { exact: true })).toHaveValue("What will improve next year?");
});
