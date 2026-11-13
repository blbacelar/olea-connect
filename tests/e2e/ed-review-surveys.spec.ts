import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

import {
  test as authenticatedTest,
  expect,
  createAuthenticatedStorageState,
} from "../fixtures/authenticated.fixture";
import { EdReviewPage } from "../pages/ed-review.page";

const test = authenticatedTest.extend({
  authenticatedMember: async ({ testData }, use) => {
    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "canopy",
    });
    await use(member);
  },
});

test.describe("@critical anonymous ED/CEO review surveys", () => {
  test.setTimeout(120_000);
  test("creates the partner survey from the overview and accepts anonymous feedback", async ({
    page, browser, baseURL,
  }, testInfo) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const reviewer = new EdReviewPage(page);
    await reviewer.open();
    await reviewer.openCycle();
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByRole("heading", { name: "Staff feedback survey" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Partner and stakeholder survey" })).toBeVisible();
    await page.getByRole("button", { name: "Create partner survey" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Campaign title").fill(`Partner feedback ${Date.now()}`);
    await expect(dialog.getByRole("combobox")).toContainText("Partner and stakeholder survey");
    await dialog.getByRole("button", { name: "Create campaign" }).click();
    const linkInput = page.getByLabel("New anonymous survey link");
    await expect(linkInput).toBeVisible();

    const publicContext = await browser.newContext({ baseURL });
    try {
      const survey = await publicContext.newPage();
      const surveyUrl = new URL(await linkInput.inputValue());
      await survey.goto(`${new URL(page.url()).origin}${surveyUrl.pathname}${surveyUrl.search}`);
      await expect(survey.getByRole("heading", { name: "Relationship Quality & Trust" })).toBeVisible();
      const direct = createClient(
        process.env.TEST_SUPABASE_URL!,
        process.env.TEST_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { persistSession: false } },
      );
      const { error: directSubmitError } = await direct.rpc("submit_ed_review_response", {
        p_token_hash: "0".repeat(64),
        p_idempotency_hash: "1".repeat(64),
        p_answers: { ratings: { A1: 4 }, comments: {}, overall: {} },
      });
      expect(directSubmitError?.code).toBe("42501");
      await expect(survey.getByRole("radiogroup")).toHaveCount(15);
      await expect(survey.getByText("1 · Poor").first()).toBeVisible();
      await survey.screenshot({ path: testInfo.outputPath("partner-desktop.png") });
      await survey.setViewportSize({ width: 390, height: 844 });
      await survey.screenshot({ path: testInfo.outputPath("partner-mobile.png") });
      expect(await survey.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      await survey.setViewportSize({ width: 1280, height: 720 });
      await survey.getByRole("button", { name: "Submit survey" }).first().click();
      await expect(survey.locator('p[role="alert"]')).toContainText("Please answer at least one rating");
      await survey.getByLabel("Your sector / type (optional)").fill("Funder");
      await survey.getByLabel("Length of engagement (optional)").fill("1–2 years");
      await survey.getByLabel("Nature of engagement (optional)").fill("Partner");
      await survey.getByLabel("Review period").fill("2026–2027");
      await survey.getByLabel("Please return by").fill("2026-12-01");
      await survey.getByRole("radiogroup").first().getByLabel("4").check({ force: true });
      await expect(survey.getByText("4.0", { exact: true }).first()).toBeVisible();
      await expect(survey.getByText(/saved on this device/i).first()).toBeVisible();
      await survey.reload();
      await expect(survey.getByLabel("Your sector / type (optional)")).toHaveValue("Funder");
      await expect(survey.getByRole("radiogroup").first().getByLabel("4")).toBeChecked();
      await survey.getByTestId("locale-selector").click();
      await survey.getByRole("option", { name: "Français" }).click();
      await expect(survey.getByRole("heading", { name: "Qualité des relations et confiance" })).toBeVisible();
      await expect(survey.getByRole("radiogroup").first().getByLabel(/4/)).toBeChecked();
      await survey.getByTestId("locale-selector").click();
      await survey.getByRole("option", { name: "English" }).click();
      const downloadPromise = survey.waitForEvent("download");
      await survey.getByRole("button", { name: "Download" }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe("Partner-Feedback-Response.json");
      const downloaded = JSON.parse(await readFile((await download.path())!, "utf8")) as { store: Record<string, string> };
      expect(downloaded.store["rate.A0"]).toBe("4");
      expect(downloaded.store["about.role"]).toBe("Funder");
      expect(downloaded.store["about.length"]).toBe("1–2 years");
      expect(downloaded.store["about.nature"]).toBe("Partner");
      expect(downloaded.store["meta.period"]).toBe("2026–2027");
      expect(downloaded.store["meta.deadline"]).toBe("2026-12-01");
      await survey.evaluate(() => { window.print = () => { document.body.dataset.printRequested = "yes"; }; });
      await survey.getByRole("button", { name: "Print / PDF" }).click();
      await expect(survey.locator("body")).toHaveAttribute("data-print-requested", "yes");
      const admin = createClient(
        process.env.TEST_SUPABASE_URL!,
        process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
      );
      const tokenHash = createHash("sha256")
        .update(surveyUrl.pathname.split("/").at(-1)!)
        .digest("hex");
      try {
        const closed = await admin.from("ed_review_campaigns")
          .update({ status: "closed" })
          .eq("token_hash", tokenHash);
        expect(closed.error).toBeNull();
        await survey.getByRole("button", { name: "Submit survey" }).last().click();
        await expect(survey.locator('p[role="alert"]')).toContainText("no longer accepting responses");
        await expect(survey.getByRole("radiogroup").first().getByLabel("4")).toBeChecked();
      } finally {
        const reopened = await admin.from("ed_review_campaigns")
          .update({ status: "open" })
          .eq("token_hash", tokenHash);
        expect(reopened.error).toBeNull();
      }
      await survey.getByRole("button", { name: "Submit survey" }).last().click();
      await expect(survey.getByRole("heading", { name: "Thank you" })).toBeVisible();
      await expect(survey.getByText(/^Submitted /)).toBeVisible();
      await survey.getByRole("button", { name: "Start a new response" }).click();
      await expect(survey.getByRole("radiogroup").first().getByLabel("4")).not.toBeChecked();
    } finally {
      await publicContext.close();
    }
    await page.reload();
    await reviewer.openCampaigns();
    await expect(page.getByText("Partner feedback", { exact: true })).toBeVisible();
  });

  test("creates an open shared-link campaign and submits anonymous staff feedback", async ({
    page,
    browser,
    baseURL,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const reviewer = new EdReviewPage(page);
    await reviewer.open();
    await reviewer.openCycle();
    const surveyUrl = await reviewer.createStaffCampaign(
      `Staff feedback ${Date.now()}`,
    );

    const publicContext = await browser.newContext({ baseURL });
    try {
      const survey = await publicContext.newPage();
      await survey.goto(surveyUrl);
      await expect(
        survey.getByRole("heading", { name: "Vision & Strategic Leadership" }),
      ).toBeVisible();
      await expect(survey.getByRole("radiogroup")).toHaveCount(18);
      await survey
        .getByRole("radiogroup")
        .first()
        .getByLabel("5")
        .check({ force: true });
      await survey.getByRole("button", { name: "Submit survey" }).last().click();
      await expect(
        survey.getByRole("heading", { name: "Thank you" }),
      ).toBeVisible();
    } finally {
      await publicContext.close();
    }

    await page.reload();
    await reviewer.openCampaigns();
    await expect(
      page.getByRole("cell", { name: "1", exact: true }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Board Chair Summary" }).click();
    await expect(
      page.getByText(/2 more anonymous responses required/i),
    ).toBeVisible();
  });

  test("does not grant a normal member access until the Board Chair explicitly assigns it", async ({
    browser,
    baseURL,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "canopy",
    });
    const member = await testData.createOrganizationMember(owner);
    const ownerContext = await browser.newContext({
      baseURL,
      storageState: await createAuthenticatedStorageState(
        owner.email,
        owner.password,
        baseURL,
      ),
    });
    const memberContext = await browser.newContext({
      baseURL,
      storageState: await createAuthenticatedStorageState(
        member.email,
        member.password,
        baseURL,
      ),
    });

    try {
      const ownerPage = await ownerContext.newPage();
      const ownerReview = new EdReviewPage(ownerPage);
      await ownerReview.open();

      const memberPage = await memberContext.newPage();
      await memberPage.goto("/modules/ed-review");
      await expect(
        memberPage.getByRole("heading", { name: "This review is restricted" }),
      ).toBeVisible();

      await ownerReview.assignHrReviewer(member.fullName);
      await memberPage.reload();
      await expect(
        memberPage.getByRole("heading", { name: "ED/CEO annual review" }),
      ).toBeVisible();
      await expect(memberPage.getByTestId("app-sidebar").getByRole("link", { name: "ED Review" })).toBeVisible();
      await memberPage.getByRole("tab", { name: "Campaigns" }).click();
      await expect(
        memberPage.getByRole("button", { name: "Create campaign" }),
      ).toHaveCount(0);
    } finally {
      await ownerContext.close();
      await memberContext.close();
    }
  });

  test("runs the confidential reviewer create, read, update, and delete lifecycle without duplicate roles", async ({
    browser,
    baseURL,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "canopy",
    });
    const member = await testData.createOrganizationMember(owner);
    const ownerContext = await browser.newContext({
      baseURL,
      storageState: await createAuthenticatedStorageState(
        owner.email,
        owner.password,
        baseURL,
      ),
    });
    const memberContext = await browser.newContext({
      baseURL,
      storageState: await createAuthenticatedStorageState(
        member.email,
        member.password,
        baseURL,
      ),
    });

    try {
      const ownerPage = await ownerContext.newPage();
      const ownerReview = new EdReviewPage(ownerPage);
      await ownerReview.open();
      await ownerReview.assignHrReviewer(member.fullName);
      await ownerReview.expectReviewerUnavailableForAssignment();
      await ownerReview.expectReviewerRole(member.fullName, "hr reviewer");
      await expect
        .poll(() =>
          testData.getEdReviewReviewerAssignments(
            owner.organizationId,
            member.userId,
          ),
        )
        .toEqual([{ id: expect.any(String), role: "hr_reviewer" }]);

      await ownerReview.updateReviewerRole(member.fullName, "Board Chair");
      await ownerReview.expectReviewerRole(member.fullName, "board chair");
      await expect
        .poll(() =>
          testData.getEdReviewReviewerAssignments(
            owner.organizationId,
            member.userId,
          ),
        )
        .toEqual([{ id: expect.any(String), role: "board_chair" }]);

      const memberPage = await memberContext.newPage();
      await memberPage.goto("/modules/ed-review");
      await expect(
        memberPage.getByRole("heading", { name: "ED/CEO annual review" }),
      ).toBeVisible();
      await memberPage.getByRole("tab", { name: "Campaigns" }).click();
      await expect(
        memberPage.getByRole("button", { name: "Create campaign" }),
      ).toBeVisible();

      await ownerReview.updateReviewerRole(member.fullName, "HR reviewer");
      await ownerReview.expectReviewerRole(member.fullName, "hr reviewer");
      await ownerReview.removeReviewerAccess(member.fullName);
      await expect(
        ownerPage.getByText("reviewer access revoked", { exact: true }),
      ).toBeVisible();
      await expect
        .poll(() =>
          testData.getEdReviewReviewerAssignments(
            owner.organizationId,
            member.userId,
          ),
        )
        .toEqual([]);

      await memberPage.reload();
      await expect(
        memberPage.getByRole("heading", { name: "This review is restricted" }),
      ).toBeVisible();
    } finally {
      await ownerContext.close();
      await memberContext.close();
    }
  });

  test("protects the final Board Chair assignment from edit or removal", async ({
    browser,
    baseURL,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "canopy",
    });
    const ownerContext = await browser.newContext({
      baseURL,
      storageState: await createAuthenticatedStorageState(
        owner.email,
        owner.password,
        baseURL,
      ),
    });

    try {
      const ownerPage = await ownerContext.newPage();
      const ownerReview = new EdReviewPage(ownerPage);
      await ownerReview.open();
      await ownerReview.expectSoleBoardChairAccessToBeProtected(owner.fullName);
    } finally {
      await ownerContext.close();
    }
  });

  test("shows a safe message when a stale reviewer change would remove the final Board Chair", async ({
    page,
  }) => {
    const reviewer = new EdReviewPage(page);
    await reviewer.open();
    await page.goto("/modules/ed-review?tab=access&access=final-chair");
    await expect(page.locator("p[role='alert']")).toContainText(
      "This change was not saved because the review must retain at least one Board Chair.",
    );
  });

  test("handles a stale reviewer card after another session removes its access", async ({
    browser,
    baseURL,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "canopy",
    });
    const member = await testData.createOrganizationMember(owner);
    const ownerContext = await browser.newContext({
      baseURL,
      storageState: await createAuthenticatedStorageState(
        owner.email,
        owner.password,
        baseURL,
      ),
    });

    try {
      const ownerPage = await ownerContext.newPage();
      const ownerReview = new EdReviewPage(ownerPage);
      await ownerReview.open();
      await ownerReview.assignHrReviewer(member.fullName);

      await testData.removeEdReviewReviewerAssignment(
        owner.organizationId,
        member.userId,
      );
      await ownerReview.removeReviewerAccess(member.fullName);
      await ownerReview.expectStaleAssignmentMessage();
    } finally {
      await ownerContext.close();
    }
  });

  test("lets a workspace owner recover a missing Board Chair assignment without exposing the review", async ({
    browser,
    baseURL,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "canopy",
    });
    const member = await testData.createOrganizationMember(owner);
    const ownerContext = await browser.newContext({
      baseURL,
      storageState: await createAuthenticatedStorageState(
        owner.email,
        owner.password,
        baseURL,
      ),
    });
    const memberContext = await browser.newContext({
      baseURL,
      storageState: await createAuthenticatedStorageState(
        member.email,
        member.password,
        baseURL,
      ),
    });

    try {
      const ownerPage = await ownerContext.newPage();
      const ownerReview = new EdReviewPage(ownerPage);
      await ownerReview.open();
      await testData.revokeEdReviewBoardChair(
        owner.organizationId,
        owner.userId,
      );

      await ownerPage.reload();
      await ownerReview.appointBoardChairFromRecovery(member.fullName);

      const memberPage = await memberContext.newPage();
      await memberPage.goto("/modules/ed-review");
      await expect(
        memberPage.getByRole("heading", { name: "ED/CEO annual review" }),
      ).toBeVisible();
      await memberPage.getByRole("tab", { name: "Campaigns" }).click();
      await expect(
        memberPage.getByRole("button", { name: "Create campaign" }),
      ).toBeVisible();
    } finally {
      await ownerContext.close();
      await memberContext.close();
    }
  });

  test("makes a public survey unavailable immediately when the Board Chair closes the review", async ({
    page,
    browser,
    baseURL,
    authenticatedMember,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const reviewer = new EdReviewPage(page);
    await reviewer.open();
    await reviewer.openCycle();
    const campaignTitle = `Closing path ${Date.now()}`;
    const surveyUrl = await reviewer.createStaffCampaign(campaignTitle);

    await reviewer.closeCycle();

    await expect
      .poll(
        () => testData.getEdReviewCycleState(authenticatedMember.organizationId),
        { message: "Closing a review must close its campaigns in persistence." },
      )
      .toMatchObject({
        status: "closed",
        campaigns: [{ status: "closed", title: campaignTitle }],
      });

    const publicContext = await browser.newContext({ baseURL });
    try {
      const survey = await publicContext.newPage();
      await survey.goto(surveyUrl);
      await expect(
        survey.getByRole("heading", { name: "Survey link unavailable" }),
      ).toBeVisible();
      await expect(
        survey.getByText(/closed, expired, or no longer active/i),
      ).toBeVisible();
    } finally {
      await publicContext.close();
    }
  });
});
