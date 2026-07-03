import { test } from "../fixtures/authenticated.fixture";
import { AppShellPage } from "../pages/app-shell.page";
import { TemplatesPage } from "../pages/templates.page";

test.describe("@smoke @critical platform UI coverage gate", () => {
  test("reaches the primary authenticated platform screens without forcing a new checkout", async ({
    authenticatedMember,
    page,
  }) => {
    const app = new AppShellPage(page);
    const templates = new TemplatesPage(page);

    await app.expectDashboardForOrganization(
      authenticatedMember.organizationName,
    );
    await app.expectDashboardTemplate("Board Self-Evaluation");
    await app.expectNoServerError();

    await templates.open();
    await templates.expectTemplateVisible("Board Self-Evaluation");
    await app.expectNoServerError();

    await app.expectPageHeading("/settings/brand", "Brand profile");
    await app.expectText("Organization name");
    await app.expectNoServerError();

    await app.expectPageHeading("/team", "Team");
    await app.expectText(authenticatedMember.email);
    await app.expectNoServerError();

    await app.expectPageHeading("/subscription", "Subscription");
    await app.expectText("Your membership is active");
    await app.expectNoServerError();

    await app.expectPageHeading("/grants", /Olea Gives|Grants/i);
    await app.expectNoServerError();

    await app.expectPageHeading("/webinars", "Webinars");
    await app.expectText(/Upcoming|No upcoming webinars/);
    await app.expectNoServerError();

    await app.expectPageHeading("/community", "Community");
    await app.expectText(/Native Olea community|Community is coming soon/);
    await app.expectNoServerError();

    await app.expectPageHeading("/help", "Help");
    await app.expectText("Guides, answers, and a real person");
    await app.expectNoServerError();

    await app.expectPageHeading("/whats-new", "What's new");
    await app.expectText("Product updates, new resources");
    await app.expectNoServerError();
  });
});
