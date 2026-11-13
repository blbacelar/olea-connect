import { createClient } from "@supabase/supabase-js";

import { createAuthenticatedStorageState, expect, test } from "../fixtures/authenticated.fixture";
import { inspectPdf } from "../support/pdf-inspector";

test.describe("@critical strategic stakeholder survey", () => {
  test.setTimeout(90_000);

  test("publishes, answers anonymously, enforces private data, and closes a survey", async ({
    browser, baseURL, testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const member = await testData.createOrganizationMember(owner);
    const other = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const context = await browser.newContext({ baseURL,
      storageState: await createAuthenticatedStorageState(owner.email, owner.password, baseURL) });
    const page = await context.newPage();
    const title = `Planning survey ${Date.now()}`;
    try {
      await page.goto("/modules/strategic-planning/surveys");
      await expect(page.getByRole("heading", { name: "Stakeholder surveys" })).toBeVisible();
      await page.getByRole("textbox", { name: "Survey title" }).fill(title);
      await page.getByRole("button", { name: "Publish survey versions" }).click();
      await expect(page.getByText("Survey versions published. Share the links below.")).toBeVisible();
      const href = await page.getByRole("textbox", { name: "Anonymous survey link" }).first().inputValue();
      const token = href.split("/").at(-1)!;
      const { data: survey, error: lookupError } = await testData.supabase
        .from("strategic_stakeholder_surveys").select("id, organization_id, questions")
        .eq("public_token", token).single();
      expect(lookupError).toBeNull();
      expect(survey!.organization_id).toBe(owner.organizationId);
      expect(survey!.questions.length).toBeGreaterThan(3);
      const { data: versions, error: versionsError } = await testData.supabase
        .from("strategic_stakeholder_surveys").select("id, audience")
        .eq("organization_id", owner.organizationId).eq("title", title);
      expect(versionsError).toBeNull();
      expect(versions?.map((version) => version.audience).sort()).toEqual(
        ["board", "staff", "volunteers", "clients", "partners", "everyone"].sort());
      testData.registerCleanup({ label: `strategic stakeholder survey versions ${title}`,
        run: async () => { const { error } = await testData.supabase.from("strategic_stakeholder_surveys")
          .delete().eq("organization_id", owner.organizationId).eq("title", title); if (error) throw error; } });
      await expect(page.getByRole("link", { name: "Download Word" }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: "Download printable HTML" }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: "Print or save PDF" }).first()).toBeVisible();
      const exportBase = `/api/strategic-planning/survey/export?survey=${survey!.id}`;
      const resultsUrl = `/api/strategic-planning/survey/results/export?survey=${survey!.id}`;
      expect((await context.request.get(resultsUrl)).status()).toBe(409);
      const pdf = await context.request.get(`${exportBase}&format=pdf`);
      expect(pdf.status()).toBe(200);
      expect((await inspectPdf(Buffer.from(await pdf.body()))).text).toContain(title);
      const word = await context.request.get(`${exportBase}&format=doc`);
      expect(word.status()).toBe(200);
      expect(word.headers()["content-type"]).toContain("application/msword");
      expect(await word.text()).toContain("Strongly agree");
      const printable = await context.request.get(`${exportBase}&format=html`);
      expect(printable.status()).toBe(200);
      expect(await printable.text()).toContain("Prefer to answer online?");
      expect((await context.request.get(`${exportBase}&format=invalid`)).status()).toBe(400);
      const memberContext = await browser.newContext({ baseURL,
        storageState: await createAuthenticatedStorageState(member.email, member.password, baseURL) });
      const otherContext = await browser.newContext({ baseURL,
        storageState: await createAuthenticatedStorageState(other.email, other.password, baseURL) });
      try {
        expect((await memberContext.request.get(`${exportBase}&format=pdf`)).status()).toBe(403);
        expect((await otherContext.request.get(`${exportBase}&format=pdf`)).status()).toBe(404);
        expect((await memberContext.request.get(resultsUrl)).status()).toBe(403);
        expect((await otherContext.request.get(resultsUrl)).status()).toBe(404);
      } finally { await memberContext.close(); await otherContext.close(); }
      const anonymous = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
      try {
        const responsePage = await anonymous.newPage();
        await responsePage.goto(href);
        await expect(responsePage.getByTestId("app-main")).toHaveCount(0);
        await expect(responsePage.getByRole("heading", { name: title })).toBeVisible();
        await responsePage.getByRole("combobox", { name: /I understand what/ }).click();
        await responsePage.getByRole("option", { name: "5" }).click();
        await responsePage.getByRole("button", { name: "Submit anonymously" }).click();
        await expect(responsePage.getByRole("heading", { name: "Thank you for your feedback" })).toBeVisible();
        await responsePage.goto("/modules/strategic-planning/survey/invalid");
        await expect(responsePage.getByRole("heading", { name: "Survey unavailable" })).toBeVisible();
      } finally { await anonymous.close(); }
      const { data: responses, error: responseError } = await testData.supabase
        .from("strategic_stakeholder_responses").select("answers").eq("survey_id", survey!.id);
      expect(responseError).toBeNull();
      expect(responses).toHaveLength(1);
      expect(responses![0].answers.understand).toBe("5");
      expect(JSON.stringify(responses)).not.toContain(owner.userId);
      const publicClient = createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_PUBLISHABLE_KEY!);
      const { data: directRows } = await publicClient.from("strategic_stakeholder_responses")
        .select("answers").eq("survey_id", survey!.id);
      expect(directRows ?? []).toHaveLength(0);
      await page.reload();
      await expect(page.getByText("1 responses received")).toBeVisible();
      await expect(page.getByText("Question results appear after five responses.").first()).toBeVisible();
      const { error: seedError } = await testData.supabase.from("strategic_stakeholder_responses")
        .insert([1, 2, 3, 4].map((score) => ({ survey_id: survey!.id,
          answers: { understand: String(score) } })));
      expect(seedError).toBeNull();
      await page.reload();
      await expect(page.getByText("5 responses received")).toBeVisible();
      await expect(page.getByText("5 answers · Average 3 / 5")).toBeVisible();
      await expect(page.getByRole("link", { name: "Download branded results PDF" })).toBeVisible();
      const resultsPdf = await context.request.get(resultsUrl);
      expect(resultsPdf.status()).toBe(200);
      const reportText = (await inspectPdf(Buffer.from(await resultsPdf.body()))).text;
      expect(reportText).toContain("Stakeholder survey results");
      expect(reportText).toContain("Average / 5");
      expect(reportText).not.toContain(owner.userId);
      await page.getByRole("button", { name: "Close survey" }).first().click();
      await expect(page.getByText("closed", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Reopen survey" }).first()).toBeVisible();
      const closedContext = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
      try {
        const closedPage = await closedContext.newPage();
        await closedPage.goto(href);
        await expect(closedPage.getByRole("heading", { name: "Survey unavailable" })).toBeVisible();
      } finally { await closedContext.close(); }
    } finally { await context.close(); }
  });
});
