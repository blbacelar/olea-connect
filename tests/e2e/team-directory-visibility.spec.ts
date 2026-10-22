import { createClient } from "@supabase/supabase-js";

import { expect, test } from "../fixtures/authenticated.fixture";
import { TeamPage } from "../pages/team.page";
import { signInPage } from "../support/auth-session";
import { getTestSupabaseEnvironment } from "../support/test-environment";

test.describe("@member team directory visibility", () => {
  test("shows teammates to a member without exposing team management", async ({
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

    const team = new TeamPage(page);
    await team.open();
    await team.expectDirectoryMembers(owner.email, member.email);
    await team.expectMemberManagementControlsHidden();
  });

  test("does not expose another organization's directory", async ({
    testData,
  }) => {
    const owner = await testData.createOrganizationOwner({
      activeSubscription: true,
    });
    const member = await testData.createOrganizationMember(owner);
    const otherOwner = await testData.createOrganizationOwner({
      activeSubscription: true,
    });
    const { publishableKey, url } = getTestSupabaseEnvironment({
      requirePublishableKey: true,
    });
    const supabase = createClient(url, publishableKey!);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: member.email,
      password: member.password,
    });
    expect(signInError).toBeNull();

    const { data, error } = await supabase.rpc("get_team_directory", {
      target_organization_id: otherOwner.organizationId,
    });

    expect(data).toBeNull();
    expect(error?.message).toContain(
      "Only active organization members can view the team directory.",
    );
  });
});
