import type { Page } from "@playwright/test";
import { createHash, randomBytes } from "node:crypto";

import course from "@/content/training/essentials.en.course.json";
import quiz from "@/content/training/essentials.en.quiz.json";
import frenchCourse from "@/content/training/essentials.fr.course.json";
import frenchQuiz from "@/content/training/essentials.fr.quiz.json";
import refresher from "@/content/training/refresher.fr.course.json";
import refresherQuiz from "@/content/training/refresher.fr.quiz.json";
import { createAuthenticatedStorageState } from "../fixtures/authenticated.fixture";
import { expect, test } from "../fixtures/test-data.fixture";

async function answerQuiz(page: Page, wrongCount = 0, questions = quiz.questions, submitLabel = "Submit answers") {
  for (const [index, question] of questions.entries()) {
    const choice = index < wrongCount
      ? question.options.find((option) => option.id !== question.answer)!
      : question.options.find((option) => option.id === question.answer)!;
    await page.getByRole("heading", { name: question.prompt }).locator("..").getByRole("button", { name: choice.text }).click();
  }
  await page.getByRole("button", { name: submitLabel }).click();
}

async function rateTopics(page: Page, rating: number, topics = course.reflection.topics) {
  for (const topic of topics) {
    await page.getByText(topic.label, { exact: true }).locator("..").getByRole("button").nth(rating - 1).click();
  }
}

test.describe("@critical Canopy board training", () => {
  test("switches the training home to French and opens the French course", async ({ browser, baseURL, testData }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const context = await browser.newContext({ baseURL, storageState: await createAuthenticatedStorageState(owner.email, owner.password, baseURL) });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/modules/board-training");
      await page.getByTestId("board-training-home").getByTestId("locale-selector").click();
      await page.getByRole("option", { name: "Français" }).click();
      await expect(page.locator("html")).toHaveAttribute("lang", "fr-CA");
      await expect(page.getByRole("heading", { name: "Formation du conseil" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Mes formations" })).toBeVisible();
      await page.screenshot({ path: "test-results/board-training-french-home.png" });
      await page.setViewportSize({ width: 390, height: 844 });
      await expect.poll(async () => page.getByTestId("app-main").evaluate((element) => Math.round(element.getBoundingClientRect().left))).toBe(0);
      await expect(page.getByTestId("board-training-home").getByTestId("locale-selector")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      await page.screenshot({ path: "test-results/board-training-french-home-mobile.png" });
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.getByRole("button", { name: "Commencer" }).first().click();
      await expect(page.getByRole("heading", { name: frenchCourse.welcome.heading })).toBeVisible();
      await expect(page.getByTestId("board-training-player").getByRole("combobox", { name: "Langue de la formation" })).toContainText("Français");
      await page.getByRole("button", { name: "Passer l’évaluation d’abord" }).click();
      await expect(page.getByRole("heading", { name: frenchCourse.reflection.before.heading })).toBeVisible();
      await rateTopics(page, 3, frenchCourse.reflection.topics);
      await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
      await answerQuiz(page, 0, frenchQuiz.questions, "Soumettre les réponses");
      await expect(page.getByText("Réussi", { exact: true })).toBeVisible();
      await page.getByRole("link", { name: "Toutes les formations" }).click();
      await expect(page.getByRole("link", { name: "Continuer" }).first()).toBeVisible();
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });

  test("completes lessons, retakes a failed assessment, signs, certifies, and verifies", async ({ browser, baseURL, testData }) => {
    test.setTimeout(180_000);
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const context = await browser.newContext({ baseURL, storageState: await createAuthenticatedStorageState(owner.email, owner.password, baseURL) });
    try {
      const page = await context.newPage();
      await page.goto("/modules/board-training");
      await expect(page.getByTestId("board-training-home")).toBeVisible();
      await page.getByRole("button", { name: "Start course" }).first().click();
      await expect(page.getByTestId("board-training-player")).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: "Begin Lesson 1" }).click();
      await rateTopics(page, 2);
      await page.getByRole("button", { name: "Save and continue" }).click();
      for (const [index, lesson] of course.lessons.entries()) {
        await expect(page.getByRole("heading", { name: lesson.title })).toBeVisible({ timeout: 20_000 });
        const scenario = lesson.blocks.find((block) => block.type === "scenario");
        if (scenario?.type === "scenario" && scenario.choices) {
          await page.getByRole("button", { name: scenario.choices[0].text }).click();
          await expect(page.getByRole("status").filter({ hasText: scenario.choices[0].outcome })).toBeVisible();
        }
        if (index === 1) {
          await page.getByRole("button", { name: "Back", exact: true }).last().click();
          await expect(page.getByRole("heading", { name: course.lessons[0].title })).toBeVisible();
          await page.getByRole("button", { name: "Complete and continue" }).click();
        }
        await page.getByRole("button", { name: "Complete and continue" }).click();
        if (index === 0) {
          await page.getByRole("link", { name: "All courses" }).click();
          await expect(page.getByRole("link", { name: "Continue course" }).first()).toBeVisible();
          await page.getByRole("link", { name: "Continue course" }).first().click();
        }
      }
      await expect(page.getByRole("heading", { name: course.orgLesson.title })).toBeVisible();
      await page.getByRole("button", { name: course.orgLesson.coi.noneLabel }).click();
      await page.getByRole("button", { name: "Sign and continue" }).click();
      await answerQuiz(page, 4);
      await expect(page.getByText("11 / 15")).toBeVisible();
      await expect(page.getByText("Not quite yet")).toBeVisible();
      await page.getByRole("button", { name: "Retake assessment" }).click();
      await answerQuiz(page);
      await expect(page.getByText("15 / 15", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Continue", exact: true }).last().click();
      await rateTopics(page, 4);
      await page.getByText(course.actionPlan.suggestions[0], { exact: true }).click();
      await page.getByRole("button", { name: "Save and continue" }).click();
      for (const statement of course.attestation.statements) await page.getByText(statement, { exact: true }).click();
      await page.getByRole("button", { name: "Complete course" }).click();
      await expect(page.getByText(/OLEA-\d{4}-[A-F0-9]{12}/)).toBeVisible({ timeout: 30_000 });
      const certificate = await testData.supabase.from("board_training_certificates")
        .select("id, certificate_number, score, total_questions").eq("organization_id", owner.organizationId).single();
      expect(certificate.error).toBeNull();
      expect(certificate.data).toMatchObject({ score: 15, total_questions: 15 });
      const pdf = await page.request.get(`/api/board-training/certificates/${certificate.data!.id}/pdf`);
      expect(pdf.status()).toBe(200);
      expect(pdf.headers()["content-type"]).toContain("application/pdf");
      const otherOwner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
      const otherContext = await browser.newContext({ baseURL, storageState: await createAuthenticatedStorageState(otherOwner.email, otherOwner.password, baseURL) });
      try {
        const privatePdf = await otherContext.request.get(`/api/board-training/certificates/${certificate.data!.id}/pdf`);
        expect(privatePdf.status()).toBe(404);
      } finally { await otherContext.close(); }
      const anonymous = await browser.newContext({ baseURL });
      try {
        const verify = await anonymous.newPage();
        await verify.goto(`/verify/training/${certificate.data!.certificate_number}`);
        await expect(verify.getByText("Valid certificate")).toBeVisible();
      } finally { await anonymous.close(); }
      await page.reload();
      await expect(page.getByText(owner.fullName, { exact: true }).last()).toBeVisible();
    } finally { await context.close(); }
  });

  test("limits management and reports to the right roles and plan", async ({ browser, baseURL, testData }) => {
    test.setTimeout(120_000);
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const member = await testData.createOrganizationMember(owner);
    const roots = await testData.createOrganizationOwner({ activeSubscription: true, planId: "roots" });
    const ownerContext = await browser.newContext({ baseURL, storageState: await createAuthenticatedStorageState(owner.email, owner.password, baseURL) });
    const memberContext = await browser.newContext({ baseURL, storageState: await createAuthenticatedStorageState(member.email, member.password, baseURL) });
    const rootsContext = await browser.newContext({ baseURL, storageState: await createAuthenticatedStorageState(roots.email, roots.password, baseURL) });
    try {
      const ownerPage = await ownerContext.newPage();
      await ownerPage.goto("/modules/board-training/report");
      await expect(ownerPage.getByText(/after three directors complete/i)).toBeVisible();
      const memberPage = await memberContext.newPage();
      await memberPage.goto("/modules/board-training");
      await expect(memberPage.getByTestId("board-training-home")).toBeVisible();
      await expect(memberPage.getByRole("tab", { name: "Manage training" })).toHaveCount(0);
      await memberPage.goto("/modules/board-training/report");
      await expect(memberPage.getByText("This page could not be found.")).toBeVisible();
      await memberPage.goto("/modules/board-training/chair-guide");
      await expect(memberPage.getByText("This page could not be found.")).toBeVisible();
      const rootsPage = await rootsContext.newPage();
      const clientErrors: string[] = [];
      rootsPage.on("console", (message) => {
        if (message.type() === "error" && message.text().includes("React error #310")) clientErrors.push(message.text());
      });
      await rootsPage.goto("/dashboard");
      await rootsPage.getByRole("link", { name: "Board Training" }).click();
      await expect(rootsPage.getByTestId("board-training-locked")).toBeVisible();
      await expect(rootsPage.getByRole("link", { name: "View Canopy plan" })).toBeVisible();
      await expect(rootsPage.getByTestId("board-training-home")).toHaveCount(0);
      for (const path of ["essentials", "chair-guide", "certificates", "report"]) {
        await rootsPage.goto(`/modules/board-training/${path}`);
        await expect(rootsPage.getByTestId("board-training-locked")).toBeVisible();
      }
      expect(clientErrors).toEqual([]);
    } finally {
      await ownerContext.close(); await memberContext.close(); await rootsContext.close();
    }
  });

  test("supports one test-out and a French annual refresher", async ({ browser, baseURL, testData }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const context = await browser.newContext({ baseURL, storageState: await createAuthenticatedStorageState(owner.email, owner.password, baseURL) });
    try {
      const page = await context.newPage();
      await page.goto("/modules/board-training");
      await expect(page.getByText("Complete Governance Essentials first")).toBeVisible();
      await page.getByRole("button", { name: "Start course" }).first().click();
      await page.getByRole("button", { name: "Take the assessment first" }).click();
      await expect(page.getByRole("heading", { name: course.reflection.before.heading })).toBeVisible();
      await rateTopics(page, 3);
      await page.getByRole("button", { name: "Save and continue" }).click();
      await expect(page.getByRole("heading", { name: "Assessment", exact: true })).toBeVisible({ timeout: 20_000 });
      await answerQuiz(page);
      await expect(page.getByText("You passed")).toBeVisible();
      await page.getByRole("button", { name: "Continue", exact: true }).last().click();
      await page.getByRole("button", { name: course.orgLesson.coi.noneLabel }).click();
      await page.getByRole("button", { name: "Sign and continue" }).click();
      await rateTopics(page, 4);
      await page.getByText(course.actionPlan.suggestions[0], { exact: true }).click();
      await page.getByRole("button", { name: "Save and continue" }).click();
      for (const statement of course.attestation.statements) await page.getByText(statement, { exact: true }).click();
      await page.getByRole("button", { name: "Complete course" }).click();
      await expect(page.getByText(/OLEA-\d{4}-[A-F0-9]{12}/)).toBeVisible({ timeout: 30_000 });
      const { data: essentialsEnrollment, error: essentialsError } = await testData.supabase
        .from("board_training_enrollments").select("completed_lessons, test_out_used")
        .eq("organization_id", owner.organizationId).eq("course_id", "essentials").single();
      expect(essentialsError).toBeNull();
      expect(essentialsEnrollment).toMatchObject({ completed_lessons: [], test_out_used: true });

      await context.addCookies([{ name: "olea_locale", value: "fr-CA", url: baseURL }]);
      await page.goto("/modules/board-training");
      await page.getByRole("button", { name: "Commencer" }).click();
      await expect(page.getByRole("heading", { name: refresher.welcome.heading })).toBeVisible();
      await page.getByRole("button", { name: "Commencer la leçon 1" }).click();
      for (const lesson of refresher.lessons) {
        await expect(page.getByRole("heading", { name: lesson.title })).toBeVisible();
        await page.getByRole("button", { name: "Terminer et continuer" }).click();
      }
      await page.getByRole("button", { name: refresher.orgLesson.coi.noneLabel }).click();
      await page.getByRole("button", { name: "Signer et continuer" }).click();
      await answerQuiz(page, 0, refresherQuiz.questions, "Soumettre les réponses");
      await expect(page.getByText("Réussi", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Continuer", exact: true }).last().click();
      await page.getByRole("button", { name: "Fait", exact: true }).click();
      await page.getByText(refresher.actionPlan.suggestions[0], { exact: true }).click();
      await page.getByRole("button", { name: "Enregistrer et continuer" }).click();
      for (const statement of refresher.attestation.statements) await page.getByText(statement, { exact: true }).click();
      await page.getByRole("button", { name: "Terminer la formation" }).click();
      await expect(page.getByText(/OLEA-\d{4}-[A-F0-9]{12}/)).toBeVisible({ timeout: 30_000 });
      const { count, error } = await testData.supabase.from("board_training_certificates")
        .select("id", { head: true, count: "exact" }).eq("organization_id", owner.organizationId);
      expect(error).toBeNull();
      expect(count).toBe(2);
    } finally { await context.close(); }
  });

  test("opens French invitations for the invited member and keeps documents private", async ({ browser, baseURL, testData }) => {
    test.setTimeout(120_000);
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const member = await testData.createOrganizationMember(owner);
    const token = randomBytes(32).toString("base64url");
    const { error: inviteError } = await testData.supabase.from("board_training_invitations").insert({
      organization_id: owner.organizationId, email: member.email, course_id: "essentials", locale: "fr",
      token_hash: createHash("sha256").update(token).digest("hex"),
      expires_at: new Date(Date.now() + 86_400_000).toISOString(), invited_by: owner.userId,
    });
    expect(inviteError).toBeNull();
    const ownerContext = await browser.newContext({ baseURL, storageState: await createAuthenticatedStorageState(owner.email, owner.password, baseURL) });
    const memberContext = await browser.newContext({ baseURL, storageState: await createAuthenticatedStorageState(member.email, member.password, baseURL) });
    try {
      const ownerPage = await ownerContext.newPage();
      await ownerPage.goto(`/modules/board-training/invite/${token}?lang=fr`);
      await expect(ownerPage.getByText(/Cette invitation n’est plus disponible/)).toBeVisible();
      await ownerPage.goto("/modules/board-training");
      await ownerPage.getByRole("tab", { name: "Manage training" }).click();
      await ownerPage.getByLabel("Document title").fill("Board bylaws");
      await ownerPage.getByLabel("PDF file").setInputFiles({
        name: "bylaws.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF"),
      });
      await ownerPage.getByRole("button", { name: "Upload document" }).click();
      await expect(ownerPage.getByText("Board bylaws", { exact: true })).toBeVisible({ timeout: 30_000 });

      const memberPage = await memberContext.newPage();
      await memberPage.goto(`/modules/board-training/invite/${token}?lang=fr`);
      await expect(memberPage.getByRole("button", { name: "Accepter l’invitation" })).toBeVisible();
      await memberPage.getByRole("button", { name: "Accepter l’invitation" }).click();
      await expect(memberPage.getByTestId("board-training-player")).toBeVisible({ timeout: 30_000 });
      await expect(memberPage.getByRole("heading", { name: /Bienvenue/ })).toBeVisible();
      const { data: enrollment, error: enrollmentError } = await testData.supabase.from("board_training_enrollments")
        .select("id, locale").eq("organization_id", owner.organizationId).eq("user_id", member.userId).single();
      expect(enrollmentError).toBeNull();
      expect(enrollment?.locale).toBe("fr");
      const { error: progressError } = await testData.supabase.from("board_training_enrollments").update({
        before_completed_at: new Date().toISOString(), passed_at: new Date().toISOString(), score: 15, total_questions: 15,
      }).eq("id", enrollment!.id);
      expect(progressError).toBeNull();
      await memberPage.reload();
      const documentLink = memberPage.getByRole("link", { name: "Ouvrir le PDF" });
      await expect(documentLink).toBeVisible();
      const documentUrl = await documentLink.getAttribute("href");
      expect(documentUrl).toBeTruthy();
      const privateFile = await memberPage.request.get(documentUrl!);
      expect(privateFile.status()).toBe(200);
      await memberPage.goto(`/modules/board-training/invite/${token}?lang=fr`);
      await expect(memberPage.getByText(/Cette invitation n’est plus disponible/)).toBeVisible();
    } finally {
      await ownerContext.close(); await memberContext.close();
    }
  });

  test("preserves a former director’s certificate and clears the Chair role", async ({ browser, baseURL, testData }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const firstOrg = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const secondOrg = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const director = await testData.createOrganizationMember(firstOrg);
    const { error: secondMembershipError } = await testData.supabase.from("organization_members").insert({
      organization_id: secondOrg.organizationId, user_id: director.userId, role: "member", status: "active",
    });
    expect(secondMembershipError).toBeNull();
    const { error: settingsError } = await testData.supabase.from("board_training_settings").insert({
      organization_id: firstOrg.organizationId, chair_user_id: director.userId,
    });
    expect(settingsError).toBeNull();
    const { data: enrollment, error: enrollmentError } = await testData.supabase.from("board_training_enrollments")
      .insert({ organization_id: firstOrg.organizationId, user_id: director.userId, course_id: "essentials", locale: "en", passed_at: new Date().toISOString(), score: 15, total_questions: 15 })
      .select("id").single();
    expect(enrollmentError).toBeNull();
    const number = `OLEA-2026-${randomBytes(6).toString("hex").toUpperCase()}`;
    const { data: certificate, error: certificateError } = await testData.supabase.from("board_training_certificates")
      .insert({ enrollment_id: enrollment!.id, organization_id: firstOrg.organizationId, user_id: director.userId,
        course_id: "essentials", locale: "en", certificate_number: number, display_name: director.fullName,
        score: 15, total_questions: 15, issued_at: new Date().toISOString(), expires_at: new Date(Date.now() + 365 * 86_400_000).toISOString() })
      .select("id").single();
    expect(certificateError).toBeNull();
    const { error: removalError } = await testData.supabase.from("organization_members").delete()
      .eq("organization_id", firstOrg.organizationId).eq("user_id", director.userId);
    expect(removalError).toBeNull();
    const { data: retained } = await testData.supabase.from("board_training_certificates")
      .select("id").eq("id", certificate!.id).single();
    expect(retained?.id).toBe(certificate!.id);
    const { data: settings } = await testData.supabase.from("board_training_settings")
      .select("chair_user_id").eq("organization_id", firstOrg.organizationId).single();
    expect(settings?.chair_user_id).toBeNull();
    const directorContext = await browser.newContext({ baseURL, storageState: await createAuthenticatedStorageState(director.email, director.password, baseURL) });
    try {
      const page = await directorContext.newPage();
      await page.goto("/modules/board-training/certificates");
      await expect(page.getByText(number)).toBeVisible();
      const pdf = await page.request.get(`/api/board-training/certificates/${certificate!.id}/pdf`);
      expect(pdf.status()).toBe(200);
    } finally { await directorContext.close(); }
  });

  test("shows only three-person report aggregates including annual follow-up", async ({ browser, baseURL, testData }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
    const members = [owner, await testData.createOrganizationMember(owner), await testData.createOrganizationMember(owner)];
    const sharedAction = course.actionPlan.suggestions[0];
    for (const [index, member] of members.entries()) {
      const { data: essentials, error: essentialsError } = await testData.supabase.from("board_training_enrollments")
        .insert({ organization_id: owner.organizationId, user_id: member.userId, course_id: "essentials", locale: "en",
          confidence_before: { l1: 2 }, confidence_after: { l1: 4 }, action_plan: index === 0 ? [sharedAction, "Private board matter"] : [sharedAction],
          passed_at: new Date().toISOString(), score: 15, total_questions: 15 })
        .select("id").single();
      expect(essentialsError).toBeNull();
      const { error: attemptError } = await testData.supabase.from("board_training_attempts")
        .insert({ enrollment_id: essentials!.id, score: 15, total_questions: 15, passed: true, topic_scores: { l1: { correct: 2, total: 2 } } });
      expect(attemptError).toBeNull();
      const { error: essentialsCertError } = await testData.supabase.from("board_training_certificates")
        .insert({ enrollment_id: essentials!.id, organization_id: owner.organizationId, user_id: member.userId,
          course_id: "essentials", locale: "en", certificate_number: `OLEA-2026-${randomBytes(6).toString("hex").toUpperCase()}`,
          display_name: member.fullName, score: 15, total_questions: 15, expires_at: new Date(Date.now() + 365 * 86_400_000).toISOString() });
      expect(essentialsCertError).toBeNull();
      const { data: renewal, error: renewalError } = await testData.supabase.from("board_training_enrollments")
        .insert({ organization_id: owner.organizationId, user_id: member.userId, course_id: "refresher", locale: "en",
          action_plan: ["Review board practice"], follow_up: { "0": "done" }, passed_at: new Date().toISOString(), score: 6, total_questions: 6 })
        .select("id").single();
      expect(renewalError).toBeNull();
      const { error: renewalCertError } = await testData.supabase.from("board_training_certificates")
        .insert({ enrollment_id: renewal!.id, organization_id: owner.organizationId, user_id: member.userId,
          course_id: "refresher", locale: "en", certificate_number: `OLEA-2026-${randomBytes(6).toString("hex").toUpperCase()}`,
          display_name: member.fullName, score: 6, total_questions: 6, expires_at: new Date(Date.now() + 365 * 86_400_000).toISOString() });
      expect(renewalCertError).toBeNull();
    }
    const context = await browser.newContext({ baseURL, storageState: await createAuthenticatedStorageState(owner.email, owner.password, baseURL) });
    try {
      const page = await context.newPage();
      await page.goto("/modules/board-training/report");
      await expect(page.getByText("Based on 3 directors")).toBeVisible();
      await expect(page.getByText("Done: 3")).toBeVisible();
      await expect(page.getByText(sharedAction, { exact: false })).toBeVisible();
      await expect(page.getByText("Private board matter")).toHaveCount(0);
      await expect(page.getByRole("link", { name: /Suggested discussion/ }).first()).toHaveAttribute("href", /session=s\d/);
      await context.addCookies([{ name: "olea_locale", value: "fr-CA", url: baseURL }]);
      await page.reload();
      await expect(page.getByText("Selon 3 membres")).toBeVisible();
      await expect(page.getByText(frenchCourse.reflection.topics[0].label, { exact: true }).first()).toBeVisible();
      await expect(page.getByText(frenchCourse.actionPlan.suggestions[0], { exact: false })).toBeVisible();
      await expect(page.getByText("Private board matter")).toHaveCount(0);
    } finally { await context.close(); }
  });
});
