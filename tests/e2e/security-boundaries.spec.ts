import { createClient } from "@supabase/supabase-js";
import { expect, test } from "../fixtures/browser.fixture";

import { test as testWithData } from "../fixtures/test-data.fixture";
import { getTestSupabaseEnvironment } from "../support/test-environment";

async function createSignedInSupabaseClient({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const { publishableKey, url } = getTestSupabaseEnvironment({
    requirePublishableKey: true,
  });
  const supabase = createClient(url, publishableKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return supabase;
}

async function expectNoRows<T>(
  query: PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
) {
  const { data, error } = await query;

  expect(error).toBeNull();
  expect(data).toEqual([]);
}

async function expectMutationRejected<T>(
  query: PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
) {
  const { data, error } = await query;

  expect(data ?? []).toEqual([]);
  expect(error).not.toBeNull();
}

test.describe("@smoke @critical security boundaries", () => {
  test("redirects anonymous members to login and preserves the destination", async ({
    page,
  }) => {
    await page.goto("/subscription");

    await expect(page).toHaveURL("/login?next=%2Fsubscription");
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
  });

  test("globally protects member-only pages", async ({ page }) => {
    const protectedPaths = [
      "/dashboard",
      "/templates",
      "/templates/board-self-evaluation",
      "/templates/board-calendar-operational-workflow",
      "/team",
      "/settings/brand",
      "/grants",
      "/webinars",
      "/community",
      "/help",
      "/whats-new",
    ];

    for (const protectedPath of protectedPaths) {
      await page.goto(protectedPath);

      await expect(page).toHaveURL(
        `/login?next=${encodeURIComponent(protectedPath)}`,
      );
      await expect(
        page.getByRole("heading", { name: "Welcome back" }),
      ).toBeVisible();
    }
  });

  test("rejects unsigned Stripe webhook requests on v1 and legacy routes", async ({
    request,
  }) => {
    const v1Response = await request.post("/api/v1/stripe/webhook");
    const legacyResponse = await request.post("/api/stripe/webhook");

    expect(v1Response.status()).toBe(400);
    await expect(v1Response.json()).resolves.toEqual({
      error: "Missing Stripe signature.",
    });
    expect(legacyResponse.status()).toBe(400);
    await expect(legacyResponse.json()).resolves.toEqual({
      error: "Missing Stripe signature.",
    });
  });

  test("rejects unsigned Resend webhook requests on v1 and legacy routes", async ({
    request,
  }) => {
    const v1Response = await request.post("/api/v1/email/webhook");
    const legacyResponse = await request.post("/api/email/webhook");

    expect(v1Response.status()).toBe(400);
    await expect(v1Response.json()).resolves.toEqual({
      error: "Missing Resend webhook signature.",
    });
    expect(legacyResponse.status()).toBe(400);
    await expect(legacyResponse.json()).resolves.toEqual({
      error: "Missing Resend webhook signature.",
    });
  });

  test("protects v1 cron processors without CRON_SECRET", async ({ request }) => {
    const protectedRoutes = [
      "/api/v1/email/process",
      "/api/v1/circle/process",
      "/api/v1/attio/process",
      "/api/v1/quickbooks/process",
      "/api/v1/community/moderation/process",
      "/api/v1/provisioning/reconcile",
    ];

    for (const route of protectedRoutes) {
      const response = await request.get(route);

      expect(response.status()).toBe(401);
      await expect(response.json()).resolves.toEqual({
        error: "Unauthorized.",
      });
    }
  });

  test("keeps legacy email outbox processor protected", async ({ request }) => {
    const response = await request.get("/api/email/process");

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
  });

  test("protects member-only v1 mutation APIs without a session", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/provisioning/retry");

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Sign in to retry membership activation.",
    });
  });
});

testWithData.describe("@critical authenticated tenant isolation", () => {
  testWithData.describe.configure({ mode: "serial" });

  testWithData("prevents an authenticated member from reading another organization's private records", async ({
    testData,
  }) => {
    const attacker = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const victim = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "canopy",
    });
    const victimTemplate = await testData.createTemplateInstance(victim);
    const victimExport = await testData.createTemplateExport(
      victim,
      victimTemplate,
    );
    const victimDownload = await testData.createTemplateExportDownload(
      victim,
      victimExport,
    );
    const attackerClient = await createSignedInSupabaseClient({
      email: attacker.email,
      password: attacker.password,
    });

    await expectNoRows(
      attackerClient
        .from("organizations")
        .select("id")
        .eq("id", victim.organizationId),
    );
    await expectNoRows(
      attackerClient
        .from("organization_brand_profiles")
        .select("organization_id, display_name")
        .eq("organization_id", victim.organizationId),
    );
    await expectNoRows(
      attackerClient
        .from("organization_members")
        .select("organization_id, user_id, role")
        .eq("organization_id", victim.organizationId),
    );
    await expectNoRows(
      attackerClient
        .from("subscriptions")
        .select("id, organization_id, plan_id, status")
        .eq("organization_id", victim.organizationId),
    );
    await expectNoRows(
      attackerClient
        .from("template_instances")
        .select("id, organization_id, title")
        .eq("id", victimTemplate.id),
    );
    await expectNoRows(
      attackerClient
        .from("template_exports")
        .select("id, organization_id, file_name")
        .eq("id", victimExport.id),
    );
    await expectNoRows(
      attackerClient
        .from("template_export_downloads")
        .select("id, organization_id, export_id")
        .eq("id", victimDownload.id),
    );

    const { data: ownOrganization, error: ownOrganizationError } =
      await attackerClient
        .from("organizations")
        .select("id")
        .eq("id", attacker.organizationId)
        .single();
    expect(ownOrganizationError).toBeNull();
    expect(ownOrganization?.id).toBe(attacker.organizationId);

    await attackerClient.auth.signOut();
  });

  testWithData("blocks cross-tenant updates and mass-assignment-style organization swaps", async ({
    testData,
  }) => {
    const attacker = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const victim = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "canopy",
    });
    const victimTemplate = await testData.createTemplateInstance(victim);
    const victimExport = await testData.createTemplateExport(
      victim,
      victimTemplate,
    );
    const attackerClient = await createSignedInSupabaseClient({
      email: attacker.email,
      password: attacker.password,
    });

    await expectNoRows(
      attackerClient
        .from("organization_brand_profiles")
        .update({ display_name: "Compromised Victim Brand" })
        .eq("organization_id", victim.organizationId)
        .select("organization_id"),
    );
    await expectNoRows(
      attackerClient
        .from("template_instances")
        .update({ title: "Compromised Victim Template" })
        .eq("id", victimTemplate.id)
        .select("id"),
    );
    await expectMutationRejected(
      attackerClient
        .from("template_instances")
        .insert({
          organization_id: victim.organizationId,
          resource_id: victimTemplate.resourceId,
          created_by: attacker.userId,
          title: "Mass-assigned victim template",
          status: "draft",
          form_data: {},
          branding_snapshot: {},
          definition_version: 1,
          schema_snapshot: {},
          completion_percent: 0,
        })
        .select("id"),
    );
    await expectMutationRejected(
      attackerClient
        .from("template_exports")
        .insert({
          template_instance_id: victimTemplate.id,
          organization_id: victim.organizationId,
          resource_id: victimTemplate.resourceId,
          created_by: attacker.userId,
          format: "pdf",
          file_name: "mass-assigned-export.pdf",
          storage_path: `${victim.organizationId}/${victimTemplate.id}/attack.pdf`,
          definition_version: 1,
          schema_snapshot: {},
          form_data_snapshot: {},
          branding_snapshot: {},
          checksum_sha256:
            "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        })
        .select("id"),
    );
    await expectMutationRejected(
      attackerClient
        .from("template_export_downloads")
        .insert({
          export_id: victimExport.id,
          organization_id: victim.organizationId,
          downloaded_by: attacker.userId,
          metadata: { attack: true },
        })
        .select("id"),
    );

    const victimBrand = await testData.getBrandProfile(victim.organizationId);
    expect(victimBrand.display_name).toBe(victim.organizationName);
    await expectNoRows(
      attackerClient
        .from("template_instances")
        .select("id")
        .eq("title", "Mass-assigned victim template"),
    );

    await attackerClient.auth.signOut();
  });

  testWithData("prevents non-authors from mutating another member's community content", async ({
    testData,
  }) => {
    const author = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const attacker = await testData.createOrganizationOwner({
      activeSubscription: true,
      planId: "roots",
    });
    const authorPostId = await testData.createCommunityPost(author, {
      title: `Security post ${author.marker}`,
      body: "This community post should not be editable by another member.",
      kind: "discussion",
      spaceSlug: "general",
    });
    const authorCommentId = await testData.createCommunityComment(author, {
      postId: authorPostId,
      body: "This comment should not be editable by another member.",
    });
    const attackerClient = await createSignedInSupabaseClient({
      email: attacker.email,
      password: attacker.password,
    });

    await expectNoRows(
      attackerClient
        .from("community_posts")
        .update({ title: "Compromised community post" })
        .eq("id", authorPostId)
        .select("id"),
    );
    await expectNoRows(
      attackerClient
        .from("community_posts")
        .update({
          hidden_at: new Date().toISOString(),
          hidden_by: attacker.userId,
          status: "archived",
        })
        .eq("id", authorPostId)
        .select("id"),
    );
    await expectNoRows(
      attackerClient
        .from("community_comments")
        .update({ body: "Compromised community comment" })
        .eq("id", authorCommentId)
        .select("id"),
    );
    await expectNoRows(
      attackerClient
        .from("community_comments")
        .delete()
        .eq("id", authorCommentId)
        .select("id"),
    );

    const { data: postRows, error: postError } = await attackerClient
      .from("community_posts")
      .select("title, status")
      .eq("id", authorPostId);
    expect(postError).toBeNull();
    expect(postRows).toEqual([
      {
        status: "published",
        title: `Security post ${author.marker}`,
      },
    ]);

    await attackerClient.auth.signOut();
  });
});
