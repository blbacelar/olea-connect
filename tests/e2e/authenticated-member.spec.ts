import { expect, test } from "../fixtures/authenticated.fixture";
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

  test("shows database-backed notification count and marks all read", async ({
    page,
    authenticatedMember,
    testData,
  }) => {
    const app = new AppShellPage(page);
    await testData.clearNotifications(authenticatedMember);
    const firstNotification = await testData.createNotification(
      authenticatedMember,
      {
        title: "Grant round opened",
        body: "The Q3 grant round is ready for applications.",
        actionUrl: "/grants",
        type: "grant_round_open",
      },
    );
    const secondNotification = await testData.createNotification(
      authenticatedMember,
      {
        title: "Team seat limit reached",
        body: "Your team has used every available seat.",
        actionUrl: "/team",
        severity: "warning",
        type: "seat_limit_reached",
      },
    );

    await app.openDashboard();
    await app.expectUnreadNotificationCount(2);
    await app.openNotifications();
    await app.expectNotificationVisible("Grant round opened");
    await app.expectNotificationVisible("Team seat limit reached");
    await app.markAllNotificationsRead();
    await app.expectUnreadNotificationCount(0);

    await page.reload();
    await app.expectUnreadNotificationCount(0);

    await expect
      .poll(async () => {
        const firstRow = await testData.getNotification(firstNotification.id);
        const secondRow = await testData.getNotification(secondNotification.id);
        return Boolean(firstRow?.read_at && secondRow?.read_at);
      })
      .toBe(true);
  });

  test("opens notification deep links and persists individual read state", async ({
    page,
    authenticatedMember,
    testData,
  }) => {
    const app = new AppShellPage(page);
    await testData.clearNotifications(authenticatedMember);
    const notification = await testData.createNotification(authenticatedMember, {
      title: "New webinar available",
      body: "A webinar was added to your plan.",
      actionUrl: "/webinars",
      type: "webinar_available",
    });

    await app.openDashboard();
    await app.expectUnreadNotificationCount(1);
    await app.openNotifications();
    await app.openNotification("New webinar available");

    await expect(page).toHaveURL(/\/webinars$/);
    await app.expectSectionHeading("Webinars");

    await expect
      .poll(async () => {
        const row = await testData.getNotification(notification.id);
        return Boolean(row?.read_at);
      })
      .toBe(true);
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
    await app.expectSectionHeading("Webinars");

    await app.openMemberSection("community");
    await app.expectSectionHeading("Community");
    await app.expectText("Native Olea community");
    await app.expectSectionHeading("# General");
  });
});
