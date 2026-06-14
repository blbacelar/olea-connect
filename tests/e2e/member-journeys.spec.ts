import {
  createAuthenticatedStorageState,
  expect,
  test,
} from "../fixtures/authenticated.fixture";

const registrationStorageKey = "olea-registration-demo";

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
    const seedlingStorage = await createAuthenticatedStorageState(
      seedlingMember.email,
      seedlingMember.password,
      baseURL,
    );
    await page.context().addCookies(seedlingStorage.cookies);

    await page.addInitScript(
      ({ key }) => {
        window.localStorage.setItem(
          key,
          JSON.stringify({
            tier: "seedling",
            billingCycle: "monthly",
            organizationName: "Olea QA Foundation",
            fullName: "QA Owner",
            email: "",
            password: "",
            province: "AB",
            emailVerified: true,
            brandComplete: false,
            selectedTemplateIds: [],
          }),
        );
      },
      { key: registrationStorageKey },
    );

    await page.goto("/onboarding/brand-setup");
    await page.getByLabel("Organization name").fill("Olea QA Foundation");
    await page.getByRole("button", { name: "Save brand and continue" }).click();

    await expect(
      page.getByRole("heading", { name: "Choose your 3 templates" }),
    ).toBeVisible();

    for (const template of [
      "Board Self-Evaluation",
      "Board Meeting Agenda",
      "Director Role Description",
    ]) {
      await page.getByRole("button", { name: new RegExp(template) }).click();
    }

    await page.getByRole("button", { name: "Confirm my 3 templates" }).click();
    await expect(page).toHaveURL("/dashboard");
  });

  test("completes a template and opens the branded PDF export", async ({
    page,
  }) => {
    await page.goto("/templates/board-self-evaluation");

    await page.getByLabel("Board year").fill("2026");
    await page.getByLabel("Survey period").fill("June 2026");
    await page.getByRole("button", { name: "Generate PDF" }).click();

    await expect(page.getByText("Your branded PDF is ready")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("link", { name: /Download PDF|Preparing/ }),
    ).toBeVisible();
  });

  test("invites and cancels a team member", async ({ page }) => {
    await page.goto("/team");

    await page.getByLabel("Team member email").fill("new.member@example.com");
    await page.getByRole("button", { name: "Send invite" }).click();

    await expect(page.getByText("new.member@example.com")).toBeVisible();
    const inviteRow = page
      .getByText("new.member@example.com")
      .locator("..")
      .locator("..");
    await inviteRow.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("new.member@example.com")).toHaveCount(0);
  });
});
