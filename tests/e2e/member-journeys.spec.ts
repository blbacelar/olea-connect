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

    await page.goto("/onboarding/template-selection");
    await expect(page.getByText("Selected: 3 of 3")).toBeVisible();
    await expect(page.getByText("Available").first()).toBeVisible();
    await expect(page.getByText("Selected").first()).toBeVisible();
    await expect(page.getByText("Locked until").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Board Self-Evaluation/ }),
    ).toBeDisabled();
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
    const rootsStorage = await createAuthenticatedStorageState(
      rootsMember.email,
      rootsMember.password,
      baseURL,
    );
    await page.context().addCookies(rootsStorage.cookies);

    await page.goto("/onboarding/template-selection");

    await expect(page).toHaveURL("/dashboard");
  });

  test("completes a dynamic board self-evaluation template", async ({
    page,
  }) => {
    await page.goto("/templates/board-self-evaluation");

    await page.getByLabel("Board year").fill("2026");
    await page.getByLabel("Survey period").fill("June 2026");
    await page.getByLabel("The board keeps decisions aligned to the mission.").click();
    await page.getByRole("option", { name: "5 - Strong" }).click();
    await page
      .getByLabel("Directors understand their governance responsibilities.")
      .click();
    await page.getByRole("option", { name: "4" }).click();
    await page
      .getByLabel("Board meetings use time well and focus on the right topics.")
      .click();
    await page.getByRole("option", { name: "4" }).click();
    await page
      .getByLabel("What should the board improve over the next year?")
      .fill("We should improve meeting preparation and follow-up.");
    await page.getByRole("button", { name: "Mark complete" }).click();

    await expect(page.getByText(/^Saved$/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("100% complete")).toBeVisible();
  });

  test("invites and cancels a team member", async ({ page }) => {
    await page.goto("/team");

    await page.getByLabel("Team member email").fill("new.member@example.com");
    await page.getByRole("button", { name: "Send invite" }).click();

    await expect(page.getByText("new.member@example.com")).toBeVisible();
    const inviteRow = page.getByRole("group", {
      name: "Invitation for new.member@example.com",
    });
    await inviteRow.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("new.member@example.com")).toHaveCount(0);
  });
});
