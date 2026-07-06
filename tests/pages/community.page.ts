import { expect, type Page } from "@playwright/test";

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
      this.page.getByRole("heading", { name: "Olea Connects Community" }),
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

  private postArticle(title: string) {
    return this.page.getByRole("article", { name: `Post: ${title}` });
  }

  async expectPost(title: string, body: string) {
    const post = this.postArticle(title);
    await expect(post).toBeVisible();
    await expect(post.getByText(body)).toBeVisible();
  }

  async expectPostHidden(title: string) {
    await expect(this.page.getByRole("heading", { name: title })).toHaveCount(0);
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
    await post.getByLabel("Edit post title").fill(nextTitle);
    await post.getByLabel("Edit post body").fill(nextBody);
    await post.getByLabel("Edit resource link").fill(resourceUrl ?? "");
    await post.getByRole("button", { name: "Save changes" }).click();

    const updatedPost = this.postArticle(nextTitle);
    await expect(updatedPost).toBeVisible();
    await expect(updatedPost.getByText(nextBody)).toBeVisible();
    await expect(updatedPost.getByText("Edited", { exact: true })).toBeVisible();
  }

  async deletePost(title: string) {
    const post = this.postArticle(title);
    this.page.once("dialog", (dialog) => dialog.accept());
    await post.getByRole("button", { name: "Delete post" }).click();
    await this.expectPostHidden(title);
  }

  async createPost({
    body,
    kind = "discussion",
    resourceUrl,
    spaceName = "General",
    title,
  }: {
    body: string;
    kind?: "announcement" | "discussion" | "resource";
    resourceUrl?: string;
    spaceName?: string;
    title: string;
  }) {
    await this.page.getByRole("button", { name: "Create post" }).click();
    await this.page.getByLabel("Space").click();
    await this.page.getByRole("option", { name: spaceName }).click();
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

    const publishButton = this.page.getByRole("button", { name: "Publish post" });
    await expect(publishButton).toBeVisible();
    await expect(publishButton).toBeEnabled();
    await publishButton.click();
  }

  async expectPostPublished() {
    await expect(
      this.page.getByText("Your post is live in the community."),
    ).toBeVisible();
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

  async addComment(title: string, comment: string) {
    const post = this.postArticle(title);
    await post.getByPlaceholder("Add a respectful reply...").fill(comment);
    await post.getByRole("button", { name: "Reply" }).click();
    await expect(post.getByLabel("1 comments")).toBeVisible();
    await expect(post.getByText(comment)).toBeVisible();
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
    this.page.once("dialog", (dialog) => dialog.accept());
    await commentGroup.getByRole("button", { name: "Delete comment" }).click();
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
