import type { Page } from "@playwright/test";

import {
  createAuthenticatedStorageState,
  expect,
  test,
} from "../fixtures/authenticated.fixture";

const svgLogo = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#2f6b4f"/></svg>',
);
const replacementSvgLogo = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="32" fill="#d97757"/></svg>',
);

async function signInPage(
  page: Page,
  baseURL: string,
  email: string,
  password: string,
) {
  const storage = await createAuthenticatedStorageState(email, password, baseURL);
  await page.context().addCookies(storage.cookies);
}

test.describe("@member brand profile", () => {
  test("persists uploaded logo and completed brand settings across sessions", async ({
    baseURL,
    browser,
    page,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
    });
    await signInPage(page, baseURL, owner.email, owner.password);

    await page.goto("/dashboard");
    await expect(
      page.getByText("Your brand profile is incomplete."),
    ).toBeVisible();

    await page.goto("/settings/brand");
    await page.getByLabel("Organization name").fill("Evergreen Community Trust");
    await page.getByLabel("Upload organization logo").setInputFiles({
      name: "evergreen-logo.svg",
      mimeType: "image/svg+xml",
      buffer: svgLogo,
    });
    await expect(page.getByText("Logo uploaded")).toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByRole("button", { name: "Changes saved" }),
    ).toBeVisible();

    const savedBrand = await testData.getBrandProfile(owner.organizationId);
    expect(savedBrand.display_name).toBe("Evergreen Community Trust");
    expect(savedBrand.logo_path).toMatch(
      new RegExp(`^${owner.organizationId}/.+\\.svg$`),
    );
    expect(savedBrand.brand_completed_at).toBeTruthy();

    await page.goto("/dashboard");
    await expect(
      page.getByText("Your brand profile is incomplete."),
    ).toHaveCount(0);

    const secondStorage = await createAuthenticatedStorageState(
      owner.email,
      owner.password,
      baseURL,
    );
    const secondContext = await browser.newContext({
      storageState: secondStorage,
    });
    const secondPage = await secondContext.newPage();
    try {
      await secondPage.goto("/settings/brand");
      await expect(
        secondPage.getByLabel("Organization name"),
      ).toBeVisible();
      await expect(secondPage.getByLabel("Organization name")).toHaveValue(
        "Evergreen Community Trust",
      );
      await expect(secondPage.getByText("Logo uploaded")).toBeVisible();
    } finally {
      await secondContext.close();
    }

    await page.goto("/settings/brand");
    await page.getByLabel("Upload organization logo").setInputFiles({
      name: "replacement-logo.svg",
      mimeType: "image/svg+xml",
      buffer: replacementSvgLogo,
    });
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByRole("button", { name: "Changes saved" }),
    ).toBeVisible();

    const replacedBrand = await testData.getBrandProfile(owner.organizationId);
    expect(replacedBrand.logo_path).toMatch(
      new RegExp(`^${owner.organizationId}/.+\\.svg$`),
    );
    expect(replacedBrand.logo_path).not.toBe(savedBrand.logo_path);

    await page.getByRole("button", { name: "Remove logo" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByRole("button", { name: "Changes saved" }),
    ).toBeVisible();

    const removedBrand = await testData.getBrandProfile(owner.organizationId);
    expect(removedBrand.logo_path).toBeNull();
  });

  test("shows clear validation errors for unsupported or oversized logos", async ({
    baseURL,
    page,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
    });
    await signInPage(page, baseURL, owner.email, owner.password);

    await page.goto("/settings/brand");
    await page.getByLabel("Upload organization logo").setInputFiles({
      name: "not-a-logo.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not a logo"),
    });
    await expect(
      page.getByRole("alert").filter({
        hasText: "Choose a PNG, JPG, or SVG file.",
      }),
    ).toBeVisible();

    await page.getByLabel("Upload organization logo").setInputFiles({
      name: "too-large.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
    });
    await expect(
      page.getByRole("alert").filter({
        hasText: "Logo must be smaller than 2 MB.",
      }),
    ).toBeVisible();
  });

  test("prevents non-admin members from modifying brand settings", async ({
    baseURL,
    page,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
    });
    const member = await testData.createOrganizationMember(owner);
    await signInPage(page, baseURL, member.email, member.password);

    await page.goto("/settings/brand");
    await expect(
      page.getByText("Only organization owners and administrators can modify brand settings."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save changes" }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Upload organization logo")).toHaveCount(0);
  });
});
