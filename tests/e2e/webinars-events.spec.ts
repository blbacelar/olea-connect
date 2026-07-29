import { expect, test as base } from "../fixtures/browser.fixture";

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
  testWithData("shows webinar details from the listing", async ({
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
      title: "Clickable Webinar Detail Session",
    });
    await signInPage(page, baseURL, member.email, member.password);
    const webinars = new WebinarsPage(page);

    await webinars.open();
    await webinars.openEventDetails(event.title);
    await webinars.expectEventDetails(event.title);
    await expect(page.getByText("QA-created Zoom event")).toBeVisible();
    await expect(page.getByRole("button", { name: "Register →" })).toBeVisible();
  });

  testWithData("shows webinar management actions only to event admins", async ({
    baseURL,
    page,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    await signInPage(page, baseURL, member.email, member.password);
    const webinars = new WebinarsPage(page);

    await webinars.open();
    await webinars.expectCreateButtonHidden();
    await webinars.expectManageButtonHidden();
    await page.goto("/webinars/new");
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await page.goto("/webinars/manage");
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  });

  testWithData("allows platform event admins to create a Zoom webinar", async ({
    baseURL,
    page,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const admin = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    await testData.assignPlatformRole(admin.userId, "community_admin");
    await signInPage(page, baseURL, admin.email, admin.password);
    const webinars = new WebinarsPage(page);
    const title = `Admin Created Webinar ${admin.marker}`;

    await webinars.open();
    await webinars.expectCreateButtonVisible();
    await webinars.expectManageButtonVisible();
    await webinars.openCreateForm();
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Summary").fill("A Zoom session created from the app UI.");
    await page
      .getByLabel("Description")
      .fill("Members can open details, register, and join when eligible.");
    await page.getByLabel("Zoom URL").fill("https://zoom.us/j/1234567890");
    await page.getByLabel("Zoom event ID").fill(`zoom-${admin.marker}`);
    await page.getByRole("button", { name: "Create webinar" }).click();

    await webinars.expectEventDetails(title);
    await expect(page.getByRole("button", { name: "Register →" })).toBeVisible();

    const event = await testData.getEventByTitle(title);
    expect(event).toMatchObject({
      join_url: "https://zoom.us/j/1234567890",
      title,
    });
    testData.trackEventCleanup(event!.id);
    expect(
      (await testData.getEventPlanAccess(event!.id)).map((access) => access.plan_id),
    ).toEqual(["canopy", "harvest", "roots"]);
  });

  testWithData("shows validation errors without creating partial webinars", async ({
    baseURL,
    page,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const admin = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    await testData.assignPlatformRole(admin.userId, "community_admin");
    await signInPage(page, baseURL, admin.email, admin.password);
    const webinars = new WebinarsPage(page);
    const title = `Invalid Webinar ${admin.marker}`;

    await webinars.open();
    await webinars.openCreateForm();
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Summary").fill("A Zoom session missing plan access.");
    await page.getByLabel("Zoom URL").fill("https://zoom.us/j/1234567890");
    for (const label of ["Seedling", "Roots", "Canopy", "Harvest"]) {
      const checkbox = page.getByLabel(label);
      if (await checkbox.isChecked()) await checkbox.uncheck();
    }
    await page.getByRole("button", { name: "Create webinar" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "Choose at least one membership plan." }),
    ).toBeVisible();
    expect(await testData.getEventByTitle(title)).toBeNull();
  });

  testWithData("shows old webinar archive controls only to event admins", async ({
    baseURL,
    page,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const startsAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString();
    const event = await testData.createEvent({
      accessPlanIds: ["roots"],
      endsAt,
      recordingUrl: "https://example.com/member-visible-recording",
      startsAt,
      status: "completed",
      title: "Member Hidden Archive Candidate",
    });
    await signInPage(page, baseURL, member.email, member.password);
    const webinars = new WebinarsPage(page);

    await webinars.open();
    await webinars.expectEventVisible(event.title);
    await webinars.expectManageButtonHidden();
    await page.goto("/webinars/manage");
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  });

  testWithData("allows event admins to archive old webinars", async ({
    baseURL,
    page,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const admin = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    await testData.assignPlatformRole(admin.userId, "community_admin");
    const startsAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString();
    const event = await testData.createEvent({
      accessPlanIds: ["roots"],
      endsAt,
      startsAt,
      status: "completed",
      title: "Admin Archive Candidate",
    });
    await signInPage(page, baseURL, admin.email, admin.password);
    const webinars = new WebinarsPage(page);

    await webinars.open();
    await webinars.expectManageButtonVisible();
    await webinars.openManagePage();
    await expect(webinars.manageRow(event.title)).toBeVisible();
    await webinars.archiveEventFromManage(event.title);

    await expect(webinars.manageRow(event.title).getByText("archived")).toBeVisible();
    await expect(webinars.manageRow(event.title).getByText("Hidden from members")).toBeVisible();
    await webinars.open();
    await expect(webinars.eventCard(event.title)).toHaveCount(0);
    expect(await testData.getEventByTitle(event.title)).toMatchObject({
      status: "archived",
    });
  });

  testWithData("allows event admins to archive upcoming and canceled webinars", async ({
    baseURL,
    page,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const admin = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    await testData.assignPlatformRole(admin.userId, "community_admin");
    const scheduledStartsAt = new Date(
      Date.now() + 9 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const scheduledEndsAt = new Date(
      Date.now() + 9 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
    ).toISOString();
    const canceledStartsAt = new Date(
      Date.now() + 12 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const canceledEndsAt = new Date(
      Date.now() + 12 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
    ).toISOString();
    const scheduled = await testData.createEvent({
      accessPlanIds: ["roots"],
      endsAt: scheduledEndsAt,
      startsAt: scheduledStartsAt,
      status: "scheduled",
      title: "Future Scheduled Webinar",
    });
    const canceled = await testData.createEvent({
      accessPlanIds: ["roots"],
      endsAt: canceledEndsAt,
      startsAt: canceledStartsAt,
      status: "canceled",
      title: "Canceled Future Webinar",
    });
    await signInPage(page, baseURL, admin.email, admin.password);
    const webinars = new WebinarsPage(page);

    await webinars.open();
    await webinars.openManagePage();

    await expect(webinars.manageRow(scheduled.title)).toBeVisible();
    await webinars.archiveEventFromManage(scheduled.title);
    await expect(
      webinars.manageRow(scheduled.title).getByText("archived"),
    ).toBeVisible();
    await expect(webinars.manageRow(canceled.title)).toBeVisible();
    await webinars.archiveEventFromManage(canceled.title);

    await expect(
      webinars.manageRow(canceled.title).getByText("archived"),
    ).toBeVisible();
    expect(await testData.getEventByTitle(scheduled.title)).toMatchObject({
      status: "archived",
    });
    expect(await testData.getEventByTitle(canceled.title)).toMatchObject({
      status: "archived",
    });
  });

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
    expect(
      await testData.getEventRegistrationCount(event.id, member.userId),
    ).toBe(1);
  });

  testWithData("allows registration for rescheduled Zoom events", async ({
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
      status: "rescheduled",
      title: "Rescheduled Zoom Governance Clinic",
    });
    await signInPage(page, baseURL, member.email, member.password);
    const webinars = new WebinarsPage(page);

    await webinars.open();
    await webinars.expectEventVisible(event.title);
    await webinars.registerForEvent(event.title);
    await webinars.expectRegistered(event.title);

    expect(
      await testData.getEventRegistrationCount(event.id, member.userId),
    ).toBe(1);
  });

  testWithData("keeps registered in-progress rescheduled events visible", async ({
    baseURL,
    page,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const startsAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const event = await testData.createEvent({
      accessPlanIds: ["roots"],
      endsAt,
      startsAt,
      status: "rescheduled",
      title: "Active Rescheduled Zoom Roundtable",
    });
    await testData.createEventRegistration(event, member);
    await signInPage(page, baseURL, member.email, member.password);
    const webinars = new WebinarsPage(page);

    await webinars.open();
    await webinars.expectEventVisible(event.title);
    await webinars.expectRegistered(event.title);
  });

  testWithData("does not offer registration for already-started unregistered events", async ({
    baseURL,
    page,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const startsAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const event = await testData.createEvent({
      accessPlanIds: ["roots"],
      endsAt,
      startsAt,
      status: "live",
      title: "Already Started Unregistered Webinar",
    });
    await signInPage(page, baseURL, member.email, member.password);
    const webinars = new WebinarsPage(page);

    await webinars.open();
    await expect(webinars.eventCard(event.title)).toHaveCount(0);
    expect(await testData.getEventRegistration(event.id, member.userId)).toBeNull();
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

  testWithData("blocks recording access for members outside the event entitlement", async ({
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
      accessPlanIds: ["canopy", "harvest"],
      recordingUrl: "https://example.com/private-zoom-recording",
      status: "completed",
      title: "Canopy Recording Only",
      type: "webinar",
    });

    await signInPage(page, baseURL, member.email, member.password);
    const response = await page.goto(`/api/v1/events/${event.id}/recording`);

    expect(response?.status()).toBe(403);
  });

  testWithData("enqueues email events when registered webinars are rescheduled or canceled", async ({
    testData,
  }) => {
    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const event = await testData.createEvent({
      accessPlanIds: ["roots"],
      title: "Notification Coverage Webinar",
    });
    await testData.createEventRegistration(event, member);

    const rescheduledStart = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const rescheduledEnd = new Date(
      new Date(rescheduledStart).getTime() + 60 * 60 * 1000,
    ).toISOString();
    await testData.updateEvent(event.id, {
      endsAt: rescheduledEnd,
      startsAt: rescheduledStart,
      status: "rescheduled",
    });
    await testData.updateEvent(event.id, { status: "canceled" });

    const integrationEvents =
      await testData.getEventEmailIntegrationEvents(event.id);

    expect(
      integrationEvents.map((integrationEvent) => integrationEvent.event_type),
    ).toEqual(expect.arrayContaining(["event.rescheduled", "event.canceled"]));
    expect(integrationEvents).toContainEqual(
      expect.objectContaining({
        aggregate_id: event.id,
        aggregate_type: "event",
        provider: "email",
      }),
    );
  });
});
