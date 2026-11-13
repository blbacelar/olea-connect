import type { Browser } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createAuthenticatedStorageState } from "../fixtures/authenticated.fixture";
import { expect, test } from "../fixtures/test-data.fixture";
import { inspectPdf } from "../support/pdf-inspector";

const visualPath = (name: string) => join(tmpdir(), `olea-roots-evaluation-${name}.png`);

async function authenticatedPage(browser: Browser, baseURL: string, account: { email: string; password: string }) {
  const context = await browser.newContext({
    baseURL,
    storageState: await createAuthenticatedStorageState(account.email, account.password, baseURL),
  });
  return { context, page: await context.newPage() };
}

test.describe("@critical Roots Board Evaluation", () => {
  test.beforeAll(() => {
    const dbHost = new URL(process.env.TEST_SUPABASE_URL ?? "http://invalid").hostname;
    const appHost = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3011").hostname;
    if (!["localhost", "127.0.0.1"].includes(dbHost) && !dbHost.startsWith("tweeaxnawemykedrxsar.")) {
      throw new Error("Board Evaluation smoke must use the development Supabase project.");
    }
    if (["oleaconnects.com", "www.oleaconnects.com"].includes(appHost)) {
      throw new Error("Board Evaluation smoke must not run on production.");
    }
  });

  test("Roots collects five anonymous surveys, then shows only closed aggregates", async ({ browser, baseURL, testData }, testInfo) => {
    test.setTimeout(240_000);
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "roots" });
    const ownerSession = await authenticatedPage(browser, baseURL, owner);
    try {
      const ownerPage = ownerSession.page;
      await ownerPage.goto("/modules/board-evaluation");
      await expect(ownerPage.getByRole("heading", { name: "Start an annual board evaluation" })).toBeVisible();
      await ownerPage.getByRole("button", { name: "Open evaluation" }).click();
      await expect(ownerPage.getByRole("heading", { name: `${new Date().getUTCFullYear()} annual survey` })).toBeVisible({ timeout: 30_000 });
      const surveyPath = await ownerPage.getByRole("link", { name: "Open annual survey" }).getAttribute("href");
      expect(surveyPath).toMatch(/^\/board-evaluation\/annual\//);
      await testInfo.attach("board-evaluation-open", { body: await ownerPage.screenshot({ path: visualPath("board-open"), fullPage: true }), contentType: "image/png" });

      for (let respondent = 0; respondent < 5; respondent += 1) {
        const anonymous = await browser.newContext({ baseURL });
        try {
          const survey = await anonymous.newPage();
          await survey.goto(surveyPath!);
          await expect(survey.getByRole("heading", { name: "Annual Board Self-Evaluation Survey" })).toBeVisible();
          const ratingGroups = survey.locator('[role="group"][aria-labelledby^="question-"]');
          const questionCount = Number(await survey.getByRole("progressbar").getAttribute("aria-valuemax"));
          expect(questionCount).toBeGreaterThanOrEqual(30);
          await expect(ratingGroups).toHaveCount(questionCount);
          for (let index = 0; index < questionCount; index += 1) {
            await ratingGroups.nth(index).getByRole("button", { name: "Rating 4" }).dispatchEvent("click");
          }
          await expect(survey.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(questionCount));
          await survey.getByRole("button", { name: "Submit anonymously" }).click();
          await expect(survey.getByRole("heading", { name: "Thank you — your response is in." })).toBeVisible();
        } finally {
          await anonymous.close();
        }
      }

      await ownerPage.reload();
      await expect(ownerPage.getByText("anonymous responses").locator("..").locator("strong")).toHaveText("5");
      await expect(ownerPage.getByRole("heading", { name: "Aggregate results" })).toHaveCount(0);
      await ownerPage.getByRole("button", { name: "Close survey and calculate results" }).click();
      await expect(ownerPage.getByRole("heading", { name: "Aggregate results" })).toBeVisible();
      await ownerPage.reload();
      await ownerPage.getByText("Question detail").click();
      await expect(ownerPage.getByText("4.00 / 5").first()).toBeVisible();
      await ownerPage.getByRole("tab", { name: "Summary & action plan" }).click();
      await ownerPage.getByRole("button", { name: "Save summary" }).click();
      const reportButton = ownerPage.getByRole("button", { name: "Download branded PDF" });
      await expect(reportButton).toBeEnabled();
      const reportDownload = ownerPage.waitForEvent("download");
      await reportButton.click();
      const report = await inspectPdf(await readFile(await (await reportDownload).path()));
      expect(report.text).toContain(owner.organizationName.slice(0, 16));
      expect(report.text).toContain("Board Self-Evaluation — Results & Action Plan");
      await testInfo.attach("board-evaluation-closed", { body: await ownerPage.screenshot({ path: visualPath("board-closed"), fullPage: true }), contentType: "image/png" });
      await ownerPage.setViewportSize({ width: 390, height: 844 });
      await expect(ownerPage.getByTestId("app-sidebar")).toBeHidden();
      await expect(ownerPage.getByTestId("app-main").locator("..")).toHaveCSS("margin-left", "0px");
      await testInfo.attach("board-evaluation-mobile", { body: await ownerPage.screenshot({ path: visualPath("board-mobile"), fullPage: true }), contentType: "image/png" });

      const { data: responses, error } = await testData.supabase
        .from("board_evaluation_anonymous_ratings")
        .select("id")
        .eq("organization_id", owner.organizationId);
      expect(error).toBeNull();
      expect(responses).toHaveLength(5);
    } finally {
      await ownerSession.context.close();
    }
  });

});
