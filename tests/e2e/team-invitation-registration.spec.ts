import { expect, test } from "../fixtures/test-data.fixture";
import { TeamInvitationAcceptancePage } from "../pages/team-invitation-acceptance.page";
import { TeamPage } from "../pages/team.page";
import { createAuthenticatedPage } from "../support/auth-session";

test.describe("@critical @team invitation registration", () => {
  test("invites a new member who creates an account and joins from the exact invite link", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const invitee = testData.createUnregisteredTeamInvitee();
    const ownerSession = await createAuthenticatedPage(
      browser,
      baseURL,
      owner.email,
      owner.password,
    );

    const team = new TeamPage(ownerSession.page);
    await team.inviteMember(invitee.email);

    await expect
      .poll(() => testData.getTeamInvitation(owner, invitee.email))
      .toMatchObject({ status: "pending" });
    const invitation = await testData.getTeamInvitation(owner, invitee.email);

    const registrationContext = await browser.newContext();
    const registrationPage = await registrationContext.newPage();
    const acceptance = new TeamInvitationAcceptancePage(registrationPage);

    try {
      await acceptance.open(invitation.rawToken);
      await acceptance.expectNewAccountForm(invitee.email);
      await acceptance.createAccount(invitee.fullName, invitee.password);
      await acceptance.expectConfirmationRequired();
      const inviteeUserId = await testData.getInvitedAccountUserId(
        invitee.email,
      );

      let confirmationUrl: string | null = null;
      await expect
        .poll(async () => {
          try {
            confirmationUrl = await testData.getAuthEmailConfirmationLink(invitee.email);
            return true;
          } catch {
            return false;
          }
      }, { timeout: 15_000 })
        .toBe(true);
      if (!confirmationUrl) throw new Error("Confirmation email link was not captured.");
      await registrationPage.goto(confirmationUrl);
      await acceptance.expectAcceptInvitation();
      await acceptance.acceptInvitation();
      await acceptance.expectAccepted();

      await expect
        .poll(() => testData.getOrganizationMembership(owner.organizationId, inviteeUserId))
        .toMatchObject({ role: "member", status: "active" });
      await expect
        .poll(() => testData.getTeamInvitation(owner, invitee.email))
        .toMatchObject({ status: "accepted", acceptedBy: inviteeUserId });
    } finally {
      await registrationContext.close();
    }

    const replayContext = await browser.newContext();
    const replayPage = await replayContext.newPage();
    try {
      const replay = new TeamInvitationAcceptancePage(replayPage);
      await replay.open(invitation.rawToken);
      await replay.expectUnavailable();
    } finally {
      await replayContext.close();
    }
  });

  test("does not expose an account form for an invalid invitation token", async ({ page }) => {
    const acceptance = new TeamInvitationAcceptancePage(page);
    await acceptance.open("not-a-valid-team-invitation-token");
    await acceptance.expectUnavailable();
    await expect(page.getByTestId("create-invited-account")).toHaveCount(0);
  });

  test("requires a valid name and password before creating an invited account", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const invitee = testData.createUnregisteredTeamInvitee();
    const ownerSession = await createAuthenticatedPage(
      browser,
      baseURL,
      owner.email,
      owner.password,
    );
    await new TeamPage(ownerSession.page).inviteMember(invitee.email);
    const invitation = await testData.getTeamInvitation(owner, invitee.email);

    const inviteeContext = await browser.newContext();
    const inviteePage = await inviteeContext.newPage();
    try {
      const acceptance = new TeamInvitationAcceptancePage(inviteePage);
      await acceptance.open(invitation.rawToken);
      await acceptance.expectCreateAccountDisabled();

      await inviteePage.getByLabel("Full name").fill("A");
      await inviteePage
        .getByLabel("Create a password")
        .fill("password1");
      await acceptance.expectCreateAccountDisabled();
    } finally {
      await inviteeContext.close();
    }
  });

  test("does not let a different signed-in account accept an invitation", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const otherAccount = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const invitee = testData.createUnregisteredTeamInvitee();
    const ownerSession = await createAuthenticatedPage(
      browser,
      baseURL,
      owner.email,
      owner.password,
    );

    await new TeamPage(ownerSession.page).inviteMember(invitee.email);

    await expect
      .poll(() => testData.getTeamInvitation(owner, invitee.email))
      .toMatchObject({ status: "pending" });
    const invitation = await testData.getTeamInvitation(owner, invitee.email);
    const otherSession = await createAuthenticatedPage(
      browser,
      baseURL,
      otherAccount.email,
      otherAccount.password,
    );

    const acceptance = new TeamInvitationAcceptancePage(otherSession.page);
    await acceptance.open(invitation.rawToken);
    await acceptance.expectWrongAccount(invitee.email);

    await expect
      .poll(() => testData.getTeamInvitation(owner, invitee.email))
      .toMatchObject({ status: "pending", acceptedBy: null });
  });
});
