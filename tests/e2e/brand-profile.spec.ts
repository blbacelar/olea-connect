import { expect, test } from "../fixtures/authenticated.fixture";
import { BrandProfilePage } from "../pages/brand-profile.page";
import { createAuthenticatedPage, signInPage } from "../support/auth-session";

const svgLogo = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#2f6b4f"/></svg>',
);
const replacementSvgLogo = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="32" fill="#d97757"/></svg>',
);

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
    const displayName = `${owner.organizationName} Brand Profile`;
    await signInPage(page, baseURL, owner.email, owner.password);
    const brandProfile = new BrandProfilePage(page);

    await brandProfile.openDashboard();
    await brandProfile.expectIncompletePromptVisible();

    await brandProfile.openSettings();
    await brandProfile.setOrganizationName(displayName);
    await brandProfile.uploadLogo({
      name: "evergreen-logo.svg",
      mimeType: "image/svg+xml",
      buffer: svgLogo,
    });
    await brandProfile.expectLogoUploaded();
    await brandProfile.save();

    const savedBrand = await testData.getBrandProfile(owner.organizationId);
    expect(savedBrand.display_name).toBe(displayName);
    expect(savedBrand.logo_path).toMatch(
      new RegExp(`^${owner.organizationId}/.+\\.svg$`),
    );
    expect(savedBrand.brand_completed_at).toBeTruthy();

    await brandProfile.openDashboard();
    await brandProfile.expectIncompletePromptHidden();

    const { context: secondContext, page: secondPage } =
      await createAuthenticatedPage(
        browser,
        baseURL,
        owner.email,
        owner.password,
      );
    const secondBrandProfile = new BrandProfilePage(secondPage);
    try {
      await secondBrandProfile.openSettings();
      await secondBrandProfile.expectOrganizationName(displayName);
      await secondBrandProfile.expectLogoUploaded();
    } finally {
      await secondContext.close();
    }

    await brandProfile.openSettings();
    await brandProfile.uploadLogo({
      name: "replacement-logo.svg",
      mimeType: "image/svg+xml",
      buffer: replacementSvgLogo,
    });
    await brandProfile.save();

    const replacedBrand = await testData.getBrandProfile(owner.organizationId);
    expect(replacedBrand.logo_path).toMatch(
      new RegExp(`^${owner.organizationId}/.+\\.svg$`),
    );
    expect(replacedBrand.logo_path).not.toBe(savedBrand.logo_path);

    await brandProfile.removeLogo();
    await brandProfile.save();

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
    const brandProfile = new BrandProfilePage(page);

    await brandProfile.openSettings();
    await brandProfile.dropLogo({
      name: "not-a-logo.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not a logo"),
    });
    await brandProfile.expectLogoValidation("Choose a PNG, JPG, or SVG file.");

    await brandProfile.uploadLogo({
      name: "too-large.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
    });
    await brandProfile.expectLogoValidation("Logo must be smaller than 2 MB.");
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
    const brandProfile = new BrandProfilePage(page);

    await brandProfile.openSettings();
    await brandProfile.expectReadOnlyForNonAdmin();
  });
});
