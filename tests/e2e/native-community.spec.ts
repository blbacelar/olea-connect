import { expect, test as base } from "@playwright/test";

import { test as testWithData } from "../fixtures/test-data.fixture";
import { AppShellPage } from "../pages/app-shell.page";
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
  testWithData.describe.configure({ mode: "serial" });

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

  testWithData("uses a compact space selector on mobile", async ({
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
      await page.setViewportSize({ height: 844, width: 390 });
      await community.open();
      await community.expectMobileSpaceSelector();
      await community.selectMobileSpace("Governance");
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
    const postTitle = `Board package workflow ideas ${member.marker}`;

    try {
      await community.open();
      await community.selectSpace("Governance");
      await community.createPost({
        title: postTitle,
        body: "We are looking for kind, practical ways to prepare board packages faster.",
        kind: "discussion",
      });
      await community.expectPost(
        postTitle,
        "We are looking for kind, practical ways to prepare board packages faster.",
      );
      await community.likePost(postTitle);
      await community.unlikePost(postTitle);
      await community.likePost(postTitle);
      await community.addComment(
        postTitle,
        "We use a shared checklist before every board meeting.",
      );
      await community.likeComment(
        postTitle,
        "We use a shared checklist before every board meeting.",
      );
      await community.unlikePost(postTitle);
      await community.expectCommentLikes(
        postTitle,
        "We use a shared checklist before every board meeting.",
        1,
      );
    } finally {
      await context.close();
    }
  });

  testWithData("notifies mentioned members when a post is published", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const teammate = await testData.createOrganizationMember(owner);
    const postTitle = `Mention notification post ${owner.marker}`;
    const postBody =
      "This post should notify the mentioned teammate without blocking publishing.";

    const ownerSession = await createAuthenticatedPage(
      browser,
      baseURL,
      owner.email,
      owner.password,
    );
    const teammateSession = await createAuthenticatedPage(
      browser,
      baseURL,
      teammate.email,
      teammate.password,
    );
    const ownerCommunity = new CommunityPage(ownerSession.page);
    const teammateShell = new AppShellPage(teammateSession.page);

    try {
      await ownerCommunity.open();
      await ownerCommunity.selectSpace("Governance");
      await ownerCommunity.createPost({
        title: postTitle,
        body: postBody,
        kind: "discussion",
        mentionedMemberName: teammate.fullName,
      });
      await ownerCommunity.expectPost(postTitle, postBody);

      await teammateShell.openDashboard();
      await teammateShell.expectUnreadNotificationCountAtLeast(1);
      await teammateShell.openNotifications();
      await teammateShell.expectNotificationVisible("You were mentioned");
      await teammateShell.openNotification("You were mentioned");
      await expect(teammateSession.page).toHaveURL(/\/community\?post=/);
    } finally {
      await ownerSession.context.close();
      await teammateSession.context.close();
    }
  });

  testWithData("notifies mentioned members when a comment is published", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const teammate = await testData.createOrganizationMember(owner);
    const postTitle = `Comment mention post ${owner.marker}`;
    const commentBody =
      "This reply should notify the mentioned teammate from the comment form.";
    await testData.createCommunityPost(owner, {
      title: postTitle,
      body: "This post should support mention notifications from replies.",
      kind: "discussion",
      spaceSlug: "general",
    });

    const ownerSession = await createAuthenticatedPage(
      browser,
      baseURL,
      owner.email,
      owner.password,
    );
    const teammateSession = await createAuthenticatedPage(
      browser,
      baseURL,
      teammate.email,
      teammate.password,
    );
    const ownerCommunity = new CommunityPage(ownerSession.page);
    const teammateShell = new AppShellPage(teammateSession.page);

    try {
      await ownerCommunity.open();
      await ownerCommunity.addComment(postTitle, commentBody, {
        mentionedMemberName: teammate.fullName,
      });

      await teammateShell.openDashboard();
      await teammateShell.expectUnreadNotificationCountAtLeast(1);
      await teammateShell.openNotifications();
      await teammateShell.expectNotificationVisible("You were mentioned");
      await teammateShell.openNotification("You were mentioned");
      await expect(teammateSession.page).toHaveURL(/\/community\?post=/);
    } finally {
      await ownerSession.context.close();
      await teammateSession.context.close();
    }
  });

  testWithData("allows authors to edit and delete community posts", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const postTitle = `Editable community post ${member.marker}`;
    const updatedPostTitle = `Updated editable community post ${member.marker}`;
    await testData.createCommunityPost(member, {
      title: postTitle,
      body: "This post should support author edits and deletion.",
      kind: "discussion",
      spaceSlug: "general",
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
      await community.editPost({
        currentTitle: postTitle,
        nextTitle: updatedPostTitle,
        nextBody:
          "This post now shows the edited state before the author deletes it.",
      });
      await community.deletePost(updatedPostTitle);
    } finally {
      await context.close();
    }
  });

  testWithData("shows newly created posts in another member session without a manual refresh", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const teammate = await testData.createOrganizationMember(owner);
    const postTitle = `Realtime created post ${owner.marker}`;
    const postBody =
      "This new post should appear for another signed-in member without reloading.";

    const ownerSession = await createAuthenticatedPage(
      browser,
      baseURL,
      owner.email,
      owner.password,
    );
    const teammateSession = await createAuthenticatedPage(
      browser,
      baseURL,
      teammate.email,
      teammate.password,
    );
    const ownerCommunity = new CommunityPage(ownerSession.page);
    const teammateCommunity = new CommunityPage(teammateSession.page);

    try {
      await teammateCommunity.open();
      await teammateCommunity.expectLiveUpdatesConnected();
      await ownerCommunity.open();
      await ownerCommunity.expectLiveUpdatesConnected();
      await ownerCommunity.createPost({
        title: postTitle,
        body: postBody,
        kind: "discussion",
      });
      await teammateCommunity.expectPostAppearsByRealtime(postTitle, postBody);
    } finally {
      await ownerSession.context.close();
      await teammateSession.context.close();
    }
  });

  testWithData("updates edited posts in another member session without a manual refresh", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const teammate = await testData.createOrganizationMember(owner);
    const postTitle = `Realtime edited post ${owner.marker}`;
    const updatedPostTitle = `Realtime edited post updated ${owner.marker}`;
    const updatedPostBody =
      "This edited post should update for another signed-in member without reloading.";
    await testData.createCommunityPost(owner, {
      title: postTitle,
      body: "This post should update for another signed-in member without reloading.",
      kind: "discussion",
      spaceSlug: "general",
    });

    const ownerSession = await createAuthenticatedPage(
      browser,
      baseURL,
      owner.email,
      owner.password,
    );
    const teammateSession = await createAuthenticatedPage(
      browser,
      baseURL,
      teammate.email,
      teammate.password,
    );
    const ownerCommunity = new CommunityPage(ownerSession.page);
    const teammateCommunity = new CommunityPage(teammateSession.page);

    try {
      await teammateCommunity.open();
      await teammateCommunity.expectLiveUpdatesConnected();
      await teammateCommunity.expectPost(
        postTitle,
        "This post should update for another signed-in member without reloading.",
      );
      await ownerCommunity.open();
      await ownerCommunity.expectLiveUpdatesConnected();
      await ownerCommunity.editPost({
        currentTitle: postTitle,
        nextTitle: updatedPostTitle,
        nextBody: updatedPostBody,
      });
      await teammateCommunity.expectPostUpdatedByRealtime(
        updatedPostTitle,
        updatedPostBody,
      );
    } finally {
      await ownerSession.context.close();
      await teammateSession.context.close();
    }
  });

  testWithData("removes deleted posts from another member session without a manual refresh", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const teammate = await testData.createOrganizationMember(owner);
    const postTitle = `Realtime deleted post ${owner.marker}`;
    await testData.createCommunityPost(owner, {
      title: postTitle,
      body: "This post should disappear for another signed-in member without reloading.",
      kind: "discussion",
      spaceSlug: "general",
    });

    const ownerSession = await createAuthenticatedPage(
      browser,
      baseURL,
      owner.email,
      owner.password,
    );
    const teammateSession = await createAuthenticatedPage(
      browser,
      baseURL,
      teammate.email,
      teammate.password,
    );
    const ownerCommunity = new CommunityPage(ownerSession.page);
    const teammateCommunity = new CommunityPage(teammateSession.page);

    try {
      await teammateCommunity.open();
      await teammateCommunity.expectLiveUpdatesConnected();
      await teammateCommunity.expectPost(
        postTitle,
        "This post should disappear for another signed-in member without reloading.",
      );
      await ownerCommunity.open();
      await ownerCommunity.expectLiveUpdatesConnected();
      await ownerCommunity.deletePost(postTitle);
      await teammateCommunity.expectPostRemovedByRealtime(postTitle);
    } finally {
      await ownerSession.context.close();
      await teammateSession.context.close();
    }
  });

  testWithData("syncs post likes and unlikes in another member session without a manual refresh", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const teammate = await testData.createOrganizationMember(owner);
    const postTitle = `Realtime post like toggle ${owner.marker}`;
    const postBody =
      "This post should sync like and unlike counts across open sessions.";
    await testData.createCommunityPost(owner, {
      title: postTitle,
      body: postBody,
      kind: "discussion",
      spaceSlug: "general",
    });

    const ownerSession = await createAuthenticatedPage(
      browser,
      baseURL,
      owner.email,
      owner.password,
    );
    const teammateSession = await createAuthenticatedPage(
      browser,
      baseURL,
      teammate.email,
      teammate.password,
    );
    const ownerCommunity = new CommunityPage(ownerSession.page);
    const teammateCommunity = new CommunityPage(teammateSession.page);

    try {
      await teammateCommunity.open();
      await teammateCommunity.expectLiveUpdatesConnected();
      await teammateCommunity.expectPost(postTitle, postBody);
      await teammateCommunity.expectPostLikes(postTitle, 0);
      await ownerCommunity.open();
      await ownerCommunity.expectLiveUpdatesConnected();
      await ownerCommunity.likePost(postTitle);
      await teammateCommunity.expectPostLikes(postTitle, 1);
      await ownerCommunity.unlikePost(postTitle);
      await teammateCommunity.expectPostLikes(postTitle, 0);
      await ownerCommunity.likePost(postTitle);
      await teammateCommunity.expectPostLikes(postTitle, 1);
      await ownerCommunity.unlikePost(postTitle);
      await teammateCommunity.expectPostLikes(postTitle, 0);
    } finally {
      await ownerSession.context.close();
      await teammateSession.context.close();
    }
  });

  testWithData("syncs comment create edit and delete operations without a manual refresh", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const teammate = await testData.createOrganizationMember(owner);
    const postTitle = `Realtime comment CRUD post ${owner.marker}`;
    const firstComment =
      "This comment should appear for another member without reloading.";
    const updatedComment =
      "This edited comment should update for another member without reloading.";
    await testData.createCommunityPost(owner, {
      title: postTitle,
      body: "This post should support realtime comment CRUD operations.",
      kind: "discussion",
      spaceSlug: "general",
    });

    const ownerSession = await createAuthenticatedPage(
      browser,
      baseURL,
      owner.email,
      owner.password,
    );
    const teammateSession = await createAuthenticatedPage(
      browser,
      baseURL,
      teammate.email,
      teammate.password,
    );
    const ownerCommunity = new CommunityPage(ownerSession.page);
    const teammateCommunity = new CommunityPage(teammateSession.page);

    try {
      await teammateCommunity.open();
      await teammateCommunity.expectLiveUpdatesConnected();
      await teammateCommunity.expectPost(
        postTitle,
        "This post should support realtime comment CRUD operations.",
      );
      await ownerCommunity.open();
      await ownerCommunity.expectLiveUpdatesConnected();
      await ownerCommunity.addComment(postTitle, firstComment);
      await teammateCommunity.expectCommentAppearsByRealtime(
        postTitle,
        firstComment,
      );
      await ownerCommunity.editComment(postTitle, firstComment, updatedComment);
      await teammateCommunity.expectCommentUpdatedByRealtime(
        postTitle,
        updatedComment,
      );
      await ownerCommunity.deleteComment(postTitle, updatedComment);
      await teammateCommunity.expectCommentRemovedByRealtime(
        postTitle,
        updatedComment,
      );
    } finally {
      await ownerSession.context.close();
      await teammateSession.context.close();
    }
  });

  testWithData("updates comment likes in another member session without a manual refresh", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const teammate = await testData.createOrganizationMember(owner);
    const postTitle = `Realtime comment like post ${owner.marker}`;
    const commentBody =
      "This comment should show liked state across open member sessions.";
    const postId = await testData.createCommunityPost(owner, {
      title: postTitle,
      body: "This post should support realtime comment reaction updates.",
      kind: "discussion",
      spaceSlug: "general",
    });
    await testData.createCommunityComment(owner, {
      postId,
      body: commentBody,
    });

    const ownerSession = await createAuthenticatedPage(
      browser,
      baseURL,
      owner.email,
      owner.password,
    );
    const teammateSession = await createAuthenticatedPage(
      browser,
      baseURL,
      teammate.email,
      teammate.password,
    );
    const ownerCommunity = new CommunityPage(ownerSession.page);
    const teammateCommunity = new CommunityPage(teammateSession.page);

    try {
      await teammateCommunity.open();
      await teammateCommunity.expectLiveUpdatesConnected();
      await teammateCommunity.expectPost(
        postTitle,
        "This post should support realtime comment reaction updates.",
      );
      await teammateCommunity.expectCommentLikes(postTitle, commentBody, 0);
      await ownerCommunity.open();
      await ownerCommunity.expectLiveUpdatesConnected();
      await ownerCommunity.likeComment(postTitle, commentBody);
      await teammateCommunity.expectCommentLikes(postTitle, commentBody, 1);
    } finally {
      await ownerSession.context.close();
      await teammateSession.context.close();
    }
  });

  testWithData("allows authors to edit and delete their comments", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const postTitle = `Commentable community post ${member.marker}`;
    await testData.createCommunityPost(member, {
      title: postTitle,
      body: "This post should support comment editing and deletion.",
      kind: "discussion",
      spaceSlug: "general",
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
      await community.addComment(
        postTitle,
        "We use a shared checklist before every board meeting.",
      );
      await community.editComment(
        postTitle,
        "We use a shared checklist before every board meeting.",
        "We use a shared checklist and assign one owner before every board meeting.",
      );
      await community.deleteComment(
        postTitle,
        "We use a shared checklist and assign one owner before every board meeting.",
      );
    } finally {
      await context.close();
    }
  });

  testWithData("shows real post and comment author names without granting cross-user edit controls", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const teammate = await testData.createOrganizationMember(owner);
    const postTitle = `Attribution check ${owner.marker}`;
    const teammateComment =
      "This reply should show the teammate name and stay read-only for the owner.";
    const postId = await testData.createCommunityPost(owner, {
      title: postTitle,
      body: "This post verifies community attribution for real users.",
      kind: "discussion",
      spaceSlug: "general",
    });
    await testData.createCommunityComment(teammate, {
      postId,
      body: teammateComment,
    });

    const { context, page } = await createAuthenticatedPage(
      browser,
      baseURL,
      owner.email,
      owner.password,
    );
    const community = new CommunityPage(page);

    try {
      await community.open();
      await community.expectPost(
        postTitle,
        "This post verifies community attribution for real users.",
      );
      await community.expectPostAuthor(
        postTitle,
        owner.fullName,
        owner.organizationName,
      );
      await community.expectCommentAuthor(
        postTitle,
        teammateComment,
        teammate.fullName,
        owner.organizationName,
      );
      await community.expectCommentReadonly(postTitle, teammateComment);
    } finally {
      await context.close();
    }
  });

  testWithData("hides suspicious resource links after background moderation", async ({
    baseURL,
    browser,
    request,
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
        title: "Suspicious download",
        body: "Please review this resource before opening it.",
        kind: "resource",
        resourceUrl: "https://example.org/downloads/tool.exe",
      });
      await community.expectPost(
        "Suspicious download",
        "Please review this resource before opening it.",
      );
      await community.processModerationUntilPostHidden(
        request,
        "Suspicious download",
      );
    } finally {
      await context.close();
    }
  });

  testWithData("hides disrespectful community posts after background moderation", async ({
    baseURL,
    browser,
    request,
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
      });
      await community.expectPost(
        "A post that should not publish",
        "This is stupid and does not belong in a respectful community.",
      );
      await community.processModerationUntilPostHidden(
        request,
        "A post that should not publish",
      );
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
