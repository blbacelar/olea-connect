import { expect, type APIRequestContext, type Page } from "@playwright/test";

export class CommunityPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto("/community");
  }

  async openFromDashboardNavigation() {
    await this.page.goto("/dashboard");
    await this.page.getByRole("link", { name: "Community" }).click();
    await expect(this.page).toHaveURL("/community");
  }

  async expectNativeCommunityHome() {
    await expect(
      this.page.getByRole("heading", { level: 1, name: "Community" }),
    ).toBeVisible();
    await expect(this.page.getByText("Native Olea community")).toBeVisible();
    await expect(
      this.page.getByRole("heading", { name: "Olea Connects™ Community" }),
    ).toBeVisible();
  }

  async expectSpaceVisible(name: string) {
    await expect(
      this.page.getByRole("button", { name: new RegExp(`# ${name}`) }),
    ).toBeVisible();
  }

  async expectSpaceHidden(name: string) {
    await expect(
      this.page.getByRole("button", { name: new RegExp(`# ${name}`) }),
    ).toHaveCount(0);
  }

  async selectSpace(name: string) {
    await this.page.getByRole("button", { name: new RegExp(`# ${name}`) }).click();
    await expect(this.page.getByRole("heading", { name: `# ${name}` })).toBeVisible();
  }

  async selectMobileSpace(name: string) {
    await this.page.getByRole("combobox", { name: "Choose community space" }).click();
    await this.page.getByRole("option", { name: `# ${name}` }).click();
    await expect(this.page.getByRole("heading", { name: `# ${name}` })).toBeVisible();
  }

  async expectMobileSpaceSelector() {
    await expect(
      this.page.getByRole("combobox", { name: "Choose community space" }),
    ).toBeVisible();
    await expect(
      this.page.getByRole("button", {
        name: /# General Introductions, questions/i,
      }),
    ).toHaveCount(0);
  }

  private postArticle(title: string) {
    return this.page.getByRole("article", { name: `Post: ${title}` });
  }

  async expectPost(title: string, body: string) {
    const post = this.postArticle(title);
    await expect(post).toBeVisible();
    await expect(post.getByText(body)).toBeVisible();
  }

  async expectPostAppearsByRealtime(title: string, body: string) {
    const post = this.postArticle(title);
    await expect(post).toBeVisible({ timeout: 10000 });
    await expect(post.getByText(body)).toBeVisible();
  }

  async expectPostUpdatedByRealtime(title: string, body: string) {
    const post = this.postArticle(title);
    await expect(post).toBeVisible({ timeout: 10000 });
    await expect(post.getByText(body)).toBeVisible();
    await expect(post.getByText("Edited", { exact: true })).toBeVisible();
  }

  async expectPostAuthor(
    title: string,
    authorName: string,
    organizationName: string,
  ) {
    await expect(
      this.postArticle(title).getByLabel(
        `Post author ${authorName} · ${organizationName}`,
      ),
    ).toBeVisible();
  }

  async expectPostHidden(title: string) {
    await expect(this.page.getByRole("heading", { name: title })).toHaveCount(0);
  }

  async expectPostRemovedByRealtime(title: string) {
    await expect(this.page.getByRole("heading", { name: title })).toHaveCount(
      0,
      { timeout: 10000 },
    );
  }

  async expectLiveUpdatesConnected() {
    await expect(
      this.page.getByText("Community live updates connected"),
    ).toBeAttached({ timeout: 10000 });
  }

  async editPost({
    currentTitle,
    nextBody,
    nextTitle,
    resourceUrl,
  }: {
    currentTitle: string;
    nextBody: string;
    nextTitle: string;
    resourceUrl?: string;
  }) {
    const post = this.postArticle(currentTitle);
    await post.getByRole("button", { name: "Edit post" }).click();
    const titleField = post.getByLabel("Edit post title");
    await expect(titleField).toBeVisible();
    await titleField.fill(nextTitle);
    await post.getByLabel("Edit post body").fill(nextBody);
    await post.getByLabel("Edit resource link").fill(resourceUrl ?? "");
    const saveButton = post.getByRole("button", { name: "Save changes" });
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();
    await saveButton.scrollIntoViewIfNeeded();
    await saveButton.click({ force: true });

    const updatedPost = this.postArticle(nextTitle);
    await expect(updatedPost).toBeVisible();
    await expect(updatedPost.getByText(nextBody)).toBeVisible();
    await expect(updatedPost.getByText("Edited", { exact: true })).toBeVisible();
  }

  async deletePost(title: string) {
    const post = this.postArticle(title);
    await post.getByRole("button", { name: "Delete post" }).click();
    await expect(
      this.page.getByRole("dialog", { name: "Delete post?" }),
    ).toBeVisible();
    await this.page.getByRole("button", { name: "Yes, delete post" }).click();
    await this.expectPostHidden(title);
  }

  async createPost({
    body,
    kind = "discussion",
    mentionedMemberName,
    mentionedOrganizationName,
    mentionedUserId,
    resourceUrl,
    title,
  }: {
    body: string;
    kind?: "announcement" | "discussion" | "resource";
    mentionedMemberName?: string;
    mentionedOrganizationName?: string;
    mentionedUserId?: string;
    resourceUrl?: string;
    title: string;
  }) {
    await this.page.getByRole("button", { name: "Create post" }).click();
    await this.page.getByLabel("Post type").click();
    await this.page
      .getByRole("option", {
        name:
          kind === "announcement"
            ? "Announcement"
            : kind === "resource"
              ? "Resource"
              : "Discussion",
      })
      .click();
    await this.page.getByLabel("Title").fill(title);
    await this.page.getByLabel("Post", { exact: true }).fill(body);

    if (resourceUrl) {
      await this.page.getByLabel("Resource link optional").fill(resourceUrl);
    }

    if (mentionedMemberName) {
      await this.page.getByLabel("Mention members").fill(mentionedMemberName);
      await this.page
        .getByRole("button", {
          name: mentionedOrganizationName
            ? `Mention ${mentionedMemberName} from ${mentionedOrganizationName}`
            : new RegExp(`Mention ${mentionedMemberName}`),
        })
        .click();
      await expect(this.page.getByText(mentionedMemberName)).toBeVisible();
      await expect(this.page.locator('input[name="mentionedUserIds"]')).toHaveCount(
        1,
      );
      if (mentionedUserId) {
        await expect(
          this.page.locator('form input[name="mentionedUserIds"]'),
        ).toHaveValue(mentionedUserId);
        await expect
          .poll(async () =>
            this.page
              .locator('form:has(input[name="spaceId"])')
              .first()
              .evaluate((form) =>
                new FormData(form as HTMLFormElement)
                  .getAll("mentionedUserIds")
                  .map(String),
              ),
          )
          .toEqual([mentionedUserId]);
      }
    }

    const publishButton = this.page.getByRole("button", { name: "Publish post" });
    await expect(publishButton).toBeVisible();
    await expect(publishButton).toBeEnabled();
    await publishButton.click();
    await expect(
      this.page.getByText(
        "Your post is live. Safety checks continue in the background.",
      ),
    ).toBeVisible();
  }

  async processModerationQueue(request: APIRequestContext, eventId?: string) {
    const secret = process.env.CRON_SECRET;
    if (!secret) throw new Error("CRON_SECRET is required for moderation tests.");

    const path = eventId
      ? `/api/v1/community/moderation/process?eventId=${encodeURIComponent(eventId)}`
      : "/api/v1/community/moderation/process";
    const response = await request.get(path, {
      headers: {
        authorization: `Bearer ${secret}`,
      },
    });

    expect(response.status()).toBe(200);
    await this.page.reload();
  }

  async likePost(title: string) {
    const post = this.postArticle(title);
    await expect(post.getByLabel("0 likes")).toBeVisible();
    await post.getByRole("button", { name: "Like post" }).click();
    await expect(post.getByRole("button", { name: "Unlike post" })).toBeVisible();
    await expect(post.getByLabel("1 likes")).toBeVisible();
  }

  async unlikePost(title: string) {
    const post = this.postArticle(title);
    await post.getByRole("button", { name: "Unlike post" }).click();
    await expect(post.getByRole("button", { name: "Like post" })).toBeVisible();
    await expect(post.getByLabel("0 likes")).toBeVisible();
  }

  async expectPostLikes(title: string, count: number) {
    await expect(
      this.postArticle(title).getByLabel(`${count} likes`),
    ).toBeVisible({ timeout: 10000 });
  }

  async addComment(
    title: string,
    comment: string,
    options: {
      mentionedMemberName?: string;
      mentionedOrganizationName?: string;
      mentionedUserId?: string;
    } = {},
  ) {
    const post = this.postArticle(title);
    await post.getByPlaceholder("Add a reply...").fill(comment);

    if (options.mentionedMemberName) {
      await post.getByLabel("Mention members").fill(options.mentionedMemberName);
      const mentionButton = post.getByRole("button", {
        name: options.mentionedOrganizationName
          ? `Mention ${options.mentionedMemberName} from ${options.mentionedOrganizationName}`
          : new RegExp(`Mention ${options.mentionedMemberName}`),
      });
      await expect(mentionButton).toBeVisible();
      await expect(mentionButton).toBeEnabled();
      await mentionButton.scrollIntoViewIfNeeded();
      await mentionButton.click({ force: true });
      await expect(post.getByText(options.mentionedMemberName)).toBeVisible();
      if (options.mentionedUserId) {
        await expect(post.locator('input[name="mentionedUserIds"]')).toHaveValue(
          options.mentionedUserId,
        );
      }
    }

    const replyButton = post.getByRole("button", { name: "Reply" });
    await expect(replyButton).toBeVisible();
    await expect(replyButton).toBeEnabled();
    await replyButton.scrollIntoViewIfNeeded();
    await replyButton.click({ force: true });
    await expect(post.getByText(comment)).toBeVisible();
    await expect(post.getByLabel("1 comments")).toBeVisible();
  }

  async expectCommentAppearsByRealtime(title: string, comment: string) {
    const post = this.postArticle(title);
    await expect(
      post.getByRole("group", { name: `Comment: ${comment}` }),
    ).toBeVisible({ timeout: 10000 });
  }

  async expectCommentUpdatedByRealtime(title: string, comment: string) {
    const post = this.postArticle(title);
    const commentGroup = post.getByRole("group", {
      name: `Comment: ${comment}`,
    });
    await expect(commentGroup).toBeVisible({ timeout: 10000 });
    await expect(
      commentGroup.getByText("Edited", { exact: true }),
    ).toBeVisible();
  }

  async expectCommentRemovedByRealtime(title: string, comment: string) {
    const post = this.postArticle(title);
    await expect(
      post.getByRole("group", { name: `Comment: ${comment}` }),
    ).toHaveCount(0, { timeout: 10000 });
  }

  async likeComment(title: string, comment: string) {
    const commentGroup = this.postArticle(title).getByRole("group", {
      name: `Comment: ${comment}`,
    });
    await expect(commentGroup.getByLabel("0 comment likes")).toBeVisible();
    await commentGroup.getByRole("button", { name: "Like comment" }).click();
    await expect(
      commentGroup.getByRole("button", { name: "Unlike comment" }),
    ).toBeVisible();
    await expect(commentGroup.getByLabel("1 comment likes")).toBeVisible();
  }

  async unlikeComment(title: string, comment: string) {
    const commentGroup = this.postArticle(title).getByRole("group", {
      name: `Comment: ${comment}`,
    });
    await commentGroup.getByRole("button", { name: "Unlike comment" }).click();
    await expect(
      commentGroup.getByRole("button", { name: "Like comment" }),
    ).toBeVisible();
    await expect(commentGroup.getByLabel("0 comment likes")).toBeVisible();
  }

  async expectCommentLikes(title: string, comment: string, count: number) {
    const commentGroup = this.postArticle(title).getByRole("group", {
      name: `Comment: ${comment}`,
    });
    await expect(
      commentGroup.getByLabel(`${count} comment likes`),
    ).toBeVisible({ timeout: 10000 });
  }

  async expectCommentAuthor(
    title: string,
    comment: string,
    authorName: string,
    organizationName: string,
  ) {
    const post = this.postArticle(title);
    const commentGroup = post.getByRole("group", {
      name: `Comment: ${comment}`,
    });
    await expect(
      commentGroup.getByLabel(
        `Comment author ${authorName} · ${organizationName}`,
      ),
    ).toBeVisible();
  }

  async expectCommentReadonly(title: string, comment: string) {
    const post = this.postArticle(title);
    const commentGroup = post.getByRole("group", {
      name: `Comment: ${comment}`,
    });
    await expect(
      commentGroup.getByRole("button", { name: "Edit comment" }),
    ).toHaveCount(0);
    await expect(
      commentGroup.getByRole("button", { name: "Delete comment" }),
    ).toHaveCount(0);
  }

  async editComment(title: string, currentComment: string, nextComment: string) {
    const post = this.postArticle(title);
    const commentGroup = post.getByRole("group", {
      name: `Comment: ${currentComment}`,
    });
    await commentGroup
      .getByRole("button", { name: "Edit comment" })
      .click();
    await commentGroup.getByLabel("Edit comment").fill(nextComment);
    await commentGroup.getByRole("button", { name: "Save comment" }).click();
    const updatedComment = post.getByRole("group", {
      name: `Comment: ${nextComment}`,
    });
    await expect(updatedComment.getByText(nextComment)).toBeVisible();
    await expect(
      updatedComment.getByText("Edited", { exact: true }),
    ).toBeVisible();
  }

  async deleteComment(title: string, comment: string) {
    const post = this.postArticle(title);
    const commentGroup = post.getByRole("group", {
      name: `Comment: ${comment}`,
    });
    await commentGroup.getByRole("button", { name: "Delete comment" }).click();
    await expect(
      this.page.getByRole("dialog", { name: "Delete comment?" }),
    ).toBeVisible();
    await this.page
      .getByRole("button", { name: "Yes, delete comment" })
      .click();
    await expect(post.getByText(comment)).toHaveCount(0);
    await expect(post.getByLabel("0 comments")).toBeVisible();
  }

  async expectModerationBlocked() {
    await expect(
      this.page.getByRole("alert").filter({
        hasText: /community guidelines|respectful tone|friendly/i,
      }),
    ).toBeVisible();
  }

  async expectSuspiciousLinkBlocked() {
    await expect(
      this.page.getByRole("alert").filter({
        hasText: /downloadable program|suspicious|shortened links/i,
      }),
    ).toBeVisible();
  }

  async expectZoomEvent(title: string, zoomUrl: string) {
    const event = this.page.getByRole("article").filter({
      has: this.page.getByRole("heading", { name: title }),
    });
    await expect(event).toBeVisible();
    await expect(event.getByRole("link", { name: "Join on Zoom" })).toHaveAttribute(
      "href",
      zoomUrl,
    );
  }

  async expectCommunityManagerControls() {
    await expect(
      this.page.getByText("Community manager", { exact: true }),
    ).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Create post" })).toBeEnabled();
  }
}
