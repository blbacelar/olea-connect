import { test, expect } from "../fixtures/test-data.fixture";
import { signInPage } from "../support/auth-session";

const rootsPages = [
  ["Board Calendar & Operational Workflow", "/modules/board-calendar"],
  ["Grant platform workspace", "/modules/grant-platform"],
  ["Community", "/community"],
  ["Webinars", "/webinars"],
  ["Board recruitment, made visible", "/modules/board-recruitment"],
  ["KPI Dashboard and Board Reporting", "/modules/kpi-dashboard"],
  ["Board Evaluation", "/modules/board-evaluation"],
  ["Accreditation Preparation Workspace", "/modules/accreditation"],
] as const;

test("Roots organization with five people can enter its included workspaces", async ({
  page,
  baseURL,
  testData,
}) => {
  test.setTimeout(120_000);
  if (!baseURL) throw new Error("Playwright baseURL is required.");
  const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "roots" });
  const members = [];
  for (let index = 0; index < 4; index += 1) {
    members.push(await testData.createOrganizationMember(owner));
  }

  await signInPage(page, baseURL, owner.email, owner.password);
  await page.goto("/team");
  const team = page.getByTestId("app-main");
  await expect(team).toContainText("5 of 10 total seats reserved");
  await expect(team).toContainText(owner.email);
  for (const member of members) await expect(team).toContainText(member.email);

  for (const [name, path] of rootsPages) {
    await page.goto(path);
    const main = page.getByTestId("app-main");
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(main).not.toContainText("Application error: a client-side exception has occurred");
  }

  for (const [path, message] of [
    ["/modules/ed-review", "ED Review requires an active Canopy membership"],
    ["/modules/strategic-planning", "Strategic Planning is included with Canopy"],
    ["/modules/board-training", "An active Canopy membership or Board Training add-on is required"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByTestId("app-main")).toContainText(message);
  }

  for (const member of members) {
    await signInPage(page, baseURL, member.email, member.password);
    await page.goto("/modules/board-calendar");
    await expect(page.getByRole("heading", { name: "Board Calendar & Operational Workflow" })).toBeVisible();
  }
});

test("Roots workspaces remain usable in French", async ({ page, baseURL, testData }) => {
  test.setTimeout(90_000);
  if (!baseURL) throw new Error("Playwright baseURL is required.");
  const owner = await testData.createOrganizationOwner({ activeSubscription: true, planId: "roots" });
  await signInPage(page, baseURL, owner.email, owner.password);
  await page.goto("/dashboard");
  await page.getByTestId("locale-selector").click();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/locale") && response.ok()),
    page.getByRole("option", { name: "Français" }).click(),
  ]);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr-CA");

  for (const [path, heading] of [
    ["/modules/board-calendar", "Calendrier du conseil et flux de travail opérationnel"],
    ["/modules/grant-platform", "Espace de plateforme de subventions"],
    ["/modules/kpi-dashboard", "Tableau de bord KPI et rapports au conseil"],
    ["/modules/board-evaluation", "Évaluation du conseil"],
    ["/modules/accreditation", "Espace de préparation à l'agrément"],
  ] as const) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr-CA");
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
});
