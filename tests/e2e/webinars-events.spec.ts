import { expect, test as base } from "@playwright/test";

import { test as testWithData } from "../fixtures/test-data.fixture";
import { WebinarsPage } from "../pages/webinars.page";
import { signInPage } from "../support/auth-session";

base.describe("@critical webinar recording access boundaries", () => {
  base("blocks unauthenticated recording access", async ({ page }) => {
    const response = await page.goto(
      "/api/v1/events/00000000-0000-4000-8000-000000000000/recording",
    );

    expect(response?.status()).toBe(401);
  });
});

testWithData.describe("@critical webinar and event access", () => {
  testWithData("registers a member once and reveals the Zoom join action", async ({
    baseURL,
    page,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const event = await testData.createEvent({
      accessPlanIds: ["roots"],
      title: "Zoom Governance Roundtable",
    });
    await signInPage(page, baseURL, member.email, member.password);
    const webinars = new WebinarsPage(page);

    await webinars.open();
    await webinars.expectEventVisible(event.title);
    await webinars.registerForEvent(event.title);
    await webinars.expectRegistered(event.title);

    const registration = await testData.getEventRegistration(
      event.id,
      member.userId,
    );
    expect(registration).toMatchObject({
      status: "registered",
    });
    expect(registration?.provider_registration_id).toMatch(/^zoom-manual:/);

    await page.reload();
    await webinars.expectRegistered(event.title);
  });

  testWithData("shows upgrade messaging instead of registration for excluded plans", async ({
    baseURL,
    page,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "seedling",
    });
    const event = await testData.createEvent({
      accessPlanIds: ["roots", "canopy", "harvest"],
      title: "Roots Only Zoom Workshop",
      type: "workshop",
    });
    await signInPage(page, baseURL, member.email, member.password);
    const webinars = new WebinarsPage(page);

    await webinars.open();
    await webinars.expectEventVisible(event.title);
    await webinars.expectUpgradeRequired(event.title);
  });

  testWithData("does not register paid-ticket events before checkout exists", async ({
    baseURL,
    page,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const event = await testData.createEvent({
      accessPlanIds: ["roots"],
      included: false,
      ticketPriceCents: 2500,
      title: "Paid Funder AMA",
      type: "funder_ama",
    });
    await signInPage(page, baseURL, member.email, member.password);
    const webinars = new WebinarsPage(page);

    await webinars.open();
    await webinars.expectEventVisible(event.title);
    await webinars.expectPaidTicketComingSoon(event.title);
    expect(
      await testData.getEventRegistration(event.id, member.userId),
    ).toBeNull();
  });

  testWithData("enforces complimentary ticket limits per organization", async ({
    baseURL,
    page,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const member = await testData.createOrganizationMember(owner);
    const event = await testData.createEvent({
      accessPlanIds: ["roots"],
      complimentaryTicketLimit: 1,
      included: false,
      title: "Limited Complimentary Workshop",
      type: "workshop",
    });
    await testData.createEventRegistration(event, member);

    await signInPage(page, baseURL, owner.email, owner.password);
    const webinars = new WebinarsPage(page);

    await webinars.open();
    await expect(
      webinars.eventCard(event.title).getByRole("button", {
        name: "Complimentary limit reached",
      }),
    ).toBeDisabled();
    await expect(
      webinars.eventCard(event.title).getByText(
        "0 of 1 complimentary ticket remaining",
      ),
    ).toBeVisible();
    expect(await testData.getEventRegistration(event.id, owner.userId)).toBeNull();
  });

  testWithData("routes recording access through the Olea entitlement endpoint", async ({
    baseURL,
    page,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "canopy",
    });
    const event = await testData.createEvent({
      accessPlanIds: ["canopy", "harvest"],
      recordingUrl: "https://example.com/zoom-recording",
      status: "completed",
      title: "Recorded Summit Session",
      type: "summit",
    });
    await signInPage(page, baseURL, member.email, member.password);
    const webinars = new WebinarsPage(page);

    await webinars.open();
    await webinars.expectEventVisible(event.title);
    await webinars.expectRecordingLink(event.title, event.id);
  });
});
