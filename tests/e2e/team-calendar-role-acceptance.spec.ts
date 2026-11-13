import { expect, test } from "../fixtures/test-data.fixture";
import { TeamInvitationAcceptancePage } from "../pages/team-invitation-acceptance.page";
import { TeamPage } from "../pages/team.page";
import { createAuthenticatedPage } from "../support/auth-session";

test.describe("@critical Board Calendar invitation role", () => {
  test.setTimeout(90_000);

  test("accepts a Chair invitation as the fifth active Roots member", async ({
    baseURL, browser, testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "roots" });
    await testData.createOrganizationMember(owner);
    await testData.createOrganizationMember(owner);
    await testData.createOrganizationMember(owner);
    const invitee = testData.createUnregisteredTeamInvitee();
    const ownerSession = await createAuthenticatedPage(browser, baseURL, owner.email, owner.password);
    try {
      await new TeamPage(ownerSession.page).inviteMember(invitee.email, "chair");
    } finally {
      await ownerSession.context.close();
    }
    const invitation = await testData.getTeamInvitation(owner, invitee.email);
    expect(invitation.status).toBe("pending");
    const { error: createError } = await testData.supabase.auth.admin.createUser({
      email: invitee.email,
      password: invitee.password,
      email_confirm: true,
      user_metadata: { full_name: invitee.fullName, e2e_marker: invitee.marker },
    });
    if (createError) throw createError;
    const inviteeUserId = await testData.getInvitedAccountUserId(invitee.email);
    const inviteeSession = await createAuthenticatedPage(browser, baseURL, invitee.email, invitee.password);
    try {
      const acceptance = new TeamInvitationAcceptancePage(inviteeSession.page);
      await acceptance.open(invitation.rawToken);
      await acceptance.expectAcceptInvitation();
      await acceptance.acceptInvitation();
      await acceptance.expectAccepted();
    } finally {
      await inviteeSession.context.close();
    }
    await expect.poll(() => testData.getOrganizationMembership(owner.organizationId, inviteeUserId))
      .toMatchObject({ status: "active", role: "member", board_calendar_role: "chair" });
    const { count, error: seatsError } = await testData.supabase.from("organization_members")
      .select("user_id", { count: "exact", head: true })
      .eq("organization_id", owner.organizationId).eq("status", "active");
    if (seatsError) throw seatsError;
    expect(count).toBe(5);
  });
});
