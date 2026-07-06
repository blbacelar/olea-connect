import { expect, test as base } from "@playwright/test";

import { test as testWithData } from "../fixtures/test-data.fixture";
import { CommunityPage } from "../pages/community.page";
import { createAuthenticatedPage } from "../support/auth-session";

base.describe("@critical native community access boundaries", () => {
  base("redirects unauthenticated users to login before community access", async ({
    page,
  }) => {
    await page.goto("/community");

    await expect(page).toHaveURL("/login?next=%2Fcommunity");
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
  });
});

testWithData.describe("@critical native community member experience", () => {
  testWithData("opens the native community from dashboard navigation", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const { context, page } = await createAuthenticatedPage(
      browser,
      baseURL,
      member.email,
      member.password,
    );
    const community = new CommunityPage(page);

    try {
      await community.openFromDashboardNavigation();
      await community.expectNativeCommunityHome();
    } finally {
      await context.close();
    }
  });

  testWithData("shows tier-scoped spaces, seeded posts, and Zoom-linked events", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    await testData.createCommunityPost(member, {
      title: "Roots peer governance question",
      body: "How are other Roots members preparing board packages?",
      kind: "discussion",
      pinned: true,
      spaceSlug: "general",
    });
    await testData.createCommunityEvent(member, {
      title: "Roots live governance call",
      summary: "A Zoom-linked working session for Roots members.",
      spaceSlug: "webinars-events",
      zoomUrl: "https://zoom.us/j/123456789",
    });

    const { context, page } = await createAuthenticatedPage(
      browser,
      baseURL,
      member.email,
      member.password,
    );
    const community = new CommunityPage(page);

    try {
      await community.open();
      await community.expectNativeCommunityHome();
      await community.expectSpaceVisible("General");
      await community.expectSpaceVisible("Roots Members");
      await community.expectSpaceHidden("Seedling Members");
      await community.expectSpaceHidden("Canopy Members");
      await community.expectSpaceHidden("Harvest Members");
      await community.expectPost(
        "Roots peer governance question",
        "How are other Roots members preparing board packages?",
      );
      await community.expectZoomEvent(
        "Roots live governance call",
        "https://zoom.us/j/123456789",
      );
    } finally {
      await context.close();
    }
  });

  testWithData("shows manager affordances when a member has a community manager assignment", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const manager = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "canopy",
    });
    await testData.assignCommunityManager(manager);

    const { context, page } = await createAuthenticatedPage(
      browser,
      baseURL,
      manager.email,
      manager.password,
    );
    const community = new CommunityPage(page);

    try {
      await community.open();
      await community.expectCommunityManagerControls();
    } finally {
      await context.close();
    }
  });

  testWithData("allows members to publish respectful community posts", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const { context, page } = await createAuthenticatedPage(
      browser,
      baseURL,
      member.email,
      member.password,
    );
    const community = new CommunityPage(page);

    try {
      await community.open();
      await community.createPost({
        title: "Board package workflow ideas",
        body: "We are looking for kind, practical ways to prepare board packages faster.",
        kind: "discussion",
        spaceName: "General",
      });
      await community.expectPostPublished();
      await community.expectPost(
        "Board package workflow ideas",
        "We are looking for kind, practical ways to prepare board packages faster.",
      );
    } finally {
      await context.close();
    }
  });

  testWithData("blocks disrespectful community posts before they are published", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const { context, page } = await createAuthenticatedPage(
      browser,
      baseURL,
      member.email,
      member.password,
    );
    const community = new CommunityPage(page);

    try {
      await community.open();
      await community.createPost({
        title: "A post that should not publish",
        body: "This is stupid and does not belong in a respectful community.",
        kind: "discussion",
        spaceName: "General",
      });
      await community.expectModerationBlocked();
      await community.expectPostHidden("A post that should not publish");
    } finally {
      await context.close();
    }
  });

  testWithData("redirects canceled members to subscription recovery instead of community content", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      planId: "roots",
      subscriptionStatus: "canceled",
    });
    const { context, page } = await createAuthenticatedPage(
      browser,
      baseURL,
      member.email,
      member.password,
    );

    try {
      await page.goto("/community");
      await expect(page).toHaveURL("/subscription?billing=required");
      await expect(
        page.getByText(/membership needs attention|billing setup is incomplete/i),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
