import { test } from "../fixtures/authenticated.fixture";
import { OnboardingPage } from "../pages/onboarding.page";
import { TeamPage } from "../pages/team.page";
import { TemplateEditorPage } from "../pages/template-editor.page";
import { signInPage } from "../support/auth-session";

test.describe("@critical @member core member journeys", () => {
  test("completes brand onboarding and Seedling template selection", async ({
    baseURL,
    page,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const seedlingMember = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "seedling",
    });
    await signInPage(page, baseURL, seedlingMember.email, seedlingMember.password);
    const onboarding = new OnboardingPage(page);
    await onboarding.seedRegistrationState({
      organizationName: "Olea QA Foundation",
      tier: "seedling",
    });

    await onboarding.completeBrandSetup("Olea QA Foundation");
    await onboarding.expectTemplateSelection();
    await onboarding.selectSeedlingTemplates([
      "Board Self-Evaluation",
      "Board Calendar & Operational Workflow",
    ]);
    await onboarding.confirmSeedlingTemplates();
    await onboarding.openTemplateSelection();
    await onboarding.expectSelectionLocked("Board Self-Evaluation");
  });

  test("bypasses template selection for Roots members", async ({
    baseURL,
    page,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const rootsMember = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    await signInPage(page, baseURL, rootsMember.email, rootsMember.password);
    const onboarding = new OnboardingPage(page);
    await onboarding.expectRootsBypassesSelection();
  });

  test("completes a dynamic board self-evaluation template", async ({ page }) => {
    const editor = new TemplateEditorPage(page);
    await editor.completeBoardSelfEvaluation();
    await editor.expectCompleted();
  });

  test("invites and cancels a team member", async ({ page }) => {
    const team = new TeamPage(page);
    await team.open();
    await team.inviteMember("new.member@example.com");
    await team.cancelInvitation("new.member@example.com");
  });
});
