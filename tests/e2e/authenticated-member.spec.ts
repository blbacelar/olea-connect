import { test } from "../fixtures/authenticated.fixture";
import { AppShellPage } from "../pages/app-shell.page";
import { SubscriptionPage } from "../pages/subscription.page";
import { TeamPage } from "../pages/team.page";
import { TemplatesPage } from "../pages/templates.page";

test.describe("@critical @member authenticated access", () => {
  test("keeps the app header brand compact on small screens", async ({
    page,
  }) => {
    const app = new AppShellPage(page);

    await page.setViewportSize({ width: 640, height: 844 });
    await app.openDashboard();
    await app.expectCompactHeader();
  });

  test("opens protected pages with an API-created session", async ({
    page,
    authenticatedMember,
  }) => {
    const subscription = new SubscriptionPage(page);

    await subscription.open();
    await subscription.expectActiveMembership(
      authenticatedMember.organizationName,
    );
  });

  test("loads organization-scoped member platform data", async ({
    page,
    authenticatedMember,
  }) => {
    const app = new AppShellPage(page);
    const templates = new TemplatesPage(page);
    const team = new TeamPage(page);

    await app.openDashboard();
    await app.expectDashboardForOrganization(
      authenticatedMember.organizationName,
    );
    await app.expectDashboardTemplate("Board Self-Evaluation");

    await templates.open();
    await templates.expectTemplateVisible("Board Self-Evaluation");

    await team.open();
    await team.expectMemberEmail(authenticatedMember.email);

    await app.openMemberSection("grants");
    await app.expectSectionHeading("Q3 2026 Community Grant");

    await app.openMemberSection("webinars");
    await app.expectSectionHeading(
      "Governance Best Practices for Small Nonprofits",
    );

    await app.openMemberSection("community");
    await app.expectSectionHeading("Community");
    await app.expectText("Native Olea community");
    await app.expectText("# General");
  });
});
