import {
  test,
  expect,
  createAuthenticatedStorageState,
} from "../fixtures/authenticated.fixture";
import { EdReviewPage } from "../pages/ed-review.page";

test.describe("@critical anonymous ED/CEO review surveys", () => {
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
        survey.getByText("Anonymous feedback", { exact: true }),
      ).toBeVisible();
      await survey
        .getByRole("radiogroup")
        .first()
        .getByLabel("5")
        .check({ force: true });
      await survey
        .getByRole("button", { name: "Submit anonymous feedback" })
        .click();
      await survey.getByRole("button", { name: "Submit response" }).click();
      await expect(
        survey.getByRole("heading", { name: "Thank you for your feedback" }),
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
      await memberPage.getByRole("tab", { name: "Campaigns" }).click();
      await expect(
        memberPage.getByRole("button", { name: "Create campaign" }),
      ).toHaveCount(0);
    } finally {
      await ownerContext.close();
      await memberContext.close();
    }
  });

  test("lets the Board Chair update and revoke a reviewer assignment", async ({
    browser,
    baseURL,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
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
      await ownerReview.updateReviewerRole(member.fullName, "Board Chair");
      await expect(
        ownerPage.getByText("reviewer access updated", { exact: true }),
      ).toBeVisible();

      const memberPage = await memberContext.newPage();
      await memberPage.goto("/modules/ed-review");
      await expect(
        memberPage.getByRole("heading", { name: "ED/CEO annual review" }),
      ).toBeVisible();
      await memberPage.getByRole("tab", { name: "Campaigns" }).click();
      await expect(
        memberPage.getByRole("button", { name: "Create campaign" }),
      ).toBeVisible();

      await ownerReview.removeReviewerAccess(member.fullName);
      await expect(
        ownerPage.getByText("reviewer access revoked", { exact: true }),
      ).toBeVisible();

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

  test("lets a workspace owner recover a missing Board Chair assignment without exposing the review", async ({
    browser,
    baseURL,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
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
