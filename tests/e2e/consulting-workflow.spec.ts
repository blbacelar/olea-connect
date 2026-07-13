import { writeFileSync } from "node:fs";

import { expect, test } from "../fixtures/test-data.fixture";
import { ConsultingPage } from "../pages/consulting.page";
import { createAuthenticatedPage } from "../support/auth-session";

test.describe("@critical Harvest consulting workflow", () => {
  test("allows Harvest members to submit requests and consulting staff to find them", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "harvest",
    });
    const staff = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "harvest",
    });
    await testData.assignPlatformRole(staff.userId, "consulting_admin");
    const requestTitle = `Board package triage ${member.marker}`;
    const requestDescription =
      "Please review our board package and help us tighten the approval workflow.";

    const { context: memberContext, page: memberPage } =
      await createAuthenticatedPage(
        browser,
        baseURL,
        member.email,
        member.password,
      );

    try {
      const consulting = new ConsultingPage(memberPage);
      await consulting.open();
      await consulting.expectHarvestWorkspace(member.organizationName);
      await consulting.submitRequest({
        category: "Board package",
        description: requestDescription,
        title: requestTitle,
        urgency: "High",
      });
      await consulting.expectRequestCard(requestTitle);
      await consulting.expectRequestStatus(requestTitle, "submitted");
    } finally {
      await memberContext.close();
    }

    const createdRequest =
      await testData.getConsultingRequestByTitle(requestTitle);
    if (!createdRequest) {
      throw new Error(`Expected consulting request "${requestTitle}" to exist.`);
    }

    expect(createdRequest).toMatchObject({
      description: requestDescription,
      status: "submitted",
      title: requestTitle,
    });
    expect(
      (await testData.getConsultingRequestActivity(createdRequest.id)).map(
        (activity) => activity.event_type,
      ),
    ).toEqual(expect.arrayContaining(["request.created"]));

    const { context: staffContext, page: staffPage } =
      await createAuthenticatedPage(
        browser,
        baseURL,
        staff.email,
        staff.password,
      );

    try {
      const consulting = new ConsultingPage(staffPage);
      await consulting.open();
      await consulting.expectHarvestWorkspace(staff.organizationName);
      await consulting.openStaffWorkspace();
      await consulting.expectStaffRequest(requestTitle);
    } finally {
      await staffContext.close();
    }
  });

  test("keeps consulting requests behind Harvest entitlement", async ({
    baseURL,
    browser,
    testData,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const rootsMember = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const { context, page } = await createAuthenticatedPage(
      browser,
      baseURL,
      rootsMember.email,
      rootsMember.password,
    );

    try {
      const consulting = new ConsultingPage(page);
      await consulting.open();
      await consulting.expectHarvestUpgradeMessage();
    } finally {
      await context.close();
    }
  });

  test("rejects unsafe HTML consulting attachments before creating a request", async ({
    baseURL,
    browser,
    testData,
  }, testInfo) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");

    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "harvest",
    });
    const unsafeHtmlPath = testInfo.outputPath("unsafe-consulting-upload.html");
    const requestTitle = `Unsafe attachment ${member.marker}`;
    writeFileSync(
      unsafeHtmlPath,
      "<!doctype html><script>alert('unsafe')</script>",
      "utf8",
    );
    const { context, page } = await createAuthenticatedPage(
      browser,
      baseURL,
      member.email,
      member.password,
    );

    try {
      const consulting = new ConsultingPage(page);
      await consulting.open();
      await consulting.submitRequest({
        description:
          "This request tries to attach an HTML file and should be blocked.",
        filePath: unsafeHtmlPath,
        title: requestTitle,
      });
      await consulting.expectAttachmentRejected();
      expect(await testData.getConsultingRequestCountByTitle(requestTitle)).toBe(0);
    } finally {
      await context.close();
    }
  });
});
