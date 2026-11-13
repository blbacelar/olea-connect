import { expect, test } from "../fixtures/test-data.fixture";
import { TeamInvitationAcceptancePage } from "../pages/team-invitation-acceptance.page";
import { TeamPage } from "../pages/team.page";
import { createAuthenticatedPage } from "../support/auth-session";

const logo = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#17365D"/><circle cx="48" cy="48" r="27" fill="#D46A38"/></svg>');
const primary = "#17365d";
const secondary = "#d46a38";

test("@critical a new Canopy organization onboards five additional users and keeps its own brand", async ({
  baseURL, browser, testData,
}, testInfo) => {
  test.setTimeout(600_000);
  if (!baseURL) throw new Error("Playwright baseURL is required.");
  const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "canopy" });
  const session = await createAuthenticatedPage(browser, baseURL, owner.email, owner.password);
  const page = session.page;
  page.setDefaultTimeout(30_000);
  try {
    await page.goto("/onboarding/brand-setup");
    await expect(page.getByRole("heading", { name: "Set up your brand" })).toBeVisible();
    await page.getByLabel("Organization name").fill("Blue Cedar Governance QA");
    await page.getByLabel("Upload organization logo").setInputFiles({
      name: "blue-cedar.svg", mimeType: "image/svg+xml", buffer: logo,
    });
    await expect(page.getByText("Logo uploaded")).toBeVisible();
    await page.locator("#primary + input").fill(primary);
    await page.locator("#secondary + input").fill(secondary);
    await page.getByLabel("Footer address").fill("77 Cedar Lane, Vancouver, BC");
    await page.getByLabel("Footer phone").fill("+1 604 555 0147");
    await page.getByLabel("Footer email").fill("qa@bluecedar.org");
    await page.getByLabel("Footer website").fill("https://bluecedar.org");
    await page.getByRole("button", { name: /Save brand and continue/ }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const { data: brand, error: brandError } = await testData.supabase
      .from("organization_brand_profiles")
      .select("display_name, logo_path, primary_color, secondary_color, address, phone, contact_email, website")
      .eq("organization_id", owner.organizationId).single();
    if (brandError) throw brandError;
    expect(brand).toMatchObject({
      display_name: "Blue Cedar Governance QA", primary_color: primary,
      secondary_color: secondary, address: "77 Cedar Lane, Vancouver, BC",
      phone: "+1 (604) 555-0147", contact_email: "qa@bluecedar.org",
      website: "https://bluecedar.org/",
    });
    expect(brand.logo_path).toMatch(new RegExp(`^${owner.organizationId}/.+\\.svg$`));
    await page.screenshot({ path: testInfo.outputPath("blue-cedar-dashboard.png") });

    const team = new TeamPage(page);
    const roles = ["chair", "executive", "member", "member", "member"] as const;
    for (const [index, role] of roles.entries()) {
      const invitee = testData.createUnregisteredTeamInvitee();
      await team.inviteMember(invitee.email, role);
      const invitation = await testData.getTeamInvitation(owner, invitee.email);
      expect(invitation.status).toBe("pending");
      const { error: createError } = await testData.supabase.auth.admin.createUser({
        email: invitee.email, password: invitee.password, email_confirm: true,
        user_metadata: { full_name: invitee.fullName, e2e_marker: invitee.marker },
      });
      if (createError) throw createError;
      const inviteeUserId = await testData.getInvitedAccountUserId(invitee.email);
      const invitedSession = await createAuthenticatedPage(browser, baseURL, invitee.email, invitee.password);
      try {
        const acceptance = new TeamInvitationAcceptancePage(invitedSession.page);
        await acceptance.open(invitation.rawToken);
        await acceptance.expectAcceptInvitation();
        await acceptance.acceptInvitation();
        await acceptance.expectAccepted();
        await invitedSession.page.goto("/modules/board-training");
        await expect(invitedSession.page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      } finally {
        await invitedSession.context.close();
      }
      await expect.poll(() => testData.getOrganizationMembership(owner.organizationId, inviteeUserId))
        .toMatchObject({ status: "active", board_calendar_role: role });
      await team.open();
      await expect(page.getByText(`${index + 2} of 15`)).toBeVisible();
    }

    const { count, error: seatError } = await testData.supabase.from("organization_members")
      .select("user_id", { count: "exact", head: true })
      .eq("organization_id", owner.organizationId).eq("status", "active");
    if (seatError) throw seatError;
    expect(count).toBe(6);
    for (const path of [
      "/modules/board-calendar", "/modules/board-evaluation", "/modules/board-recruitment",
      "/modules/board-training", "/modules/ed-review", "/modules/strategic-planning",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      await expect(page.locator("body")).not.toContainText("Application error: a client-side exception");
    }
    await page.goto("/settings/brand");
    await expect(page.getByLabel("Primary color hex value")).toHaveValue(primary);
    await expect(page.getByLabel("Secondary color hex value")).toHaveValue(secondary);
    await expect(page.getByLabel("Organization name")).toHaveValue("Blue Cedar Governance QA");
  } finally {
    await session.context.close();
  }
});
