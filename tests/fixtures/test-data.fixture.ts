import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { test as base } from "@playwright/test";

import { createTestIdentity } from "../factories/identity";

type CleanupTask = {
  label: string;
  run: () => Promise<void>;
};

type CreatedOrganizationOwner = {
  marker: string;
  userId: string;
  organizationId: string;
  email: string;
  password: string;
};

function requireTestEnvironment() {
  if (process.env.PLAYWRIGHT_TEST_DATA_ENABLED !== "true") {
    throw new Error(
      "Test-data mutation is disabled. Set PLAYWRIGHT_TEST_DATA_ENABLED=true.",
    );
  }

  const environment = process.env.PLAYWRIGHT_TEST_ENV;
  if (!environment || !["local", "preview", "staging"].includes(environment)) {
    throw new Error(
      "PLAYWRIGHT_TEST_ENV must explicitly be local, preview, or staging.",
    );
  }

  const url = process.env.TEST_SUPABASE_URL;
  const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  const hostname = new URL(url).hostname;
  if (
    environment === "local" &&
    hostname !== "127.0.0.1" &&
    hostname !== "localhost"
  ) {
    throw new Error("Local test data may only target localhost Supabase.");
  }

  return { url, serviceRoleKey };
}

export class TestDataManager {
  private readonly cleanupTasks: CleanupTask[] = [];
  private purged = false;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly testInfo: Parameters<typeof createTestIdentity>[0],
  ) {}

  private registerCleanup(task: CleanupTask) {
    this.cleanupTasks.push(task);
  }

  async createOrganizationOwner(): Promise<CreatedOrganizationOwner> {
    const identity = createTestIdentity(this.testInfo);
    const { data: authData, error: authError } =
      await this.supabase.auth.admin.createUser({
        email: identity.email,
        password: identity.password,
        email_confirm: true,
        user_metadata: {
          full_name: identity.fullName,
          e2e_marker: identity.marker,
        },
      });

    if (authError) throw authError;
    const userId = authData.user.id;

    this.registerCleanup({
      label: `auth user ${userId}`,
      run: async () => {
        const { error } = await this.supabase.auth.admin.deleteUser(userId);
        if (error && error.status !== 404) throw error;

        const { data } = await this.supabase.auth.admin.getUserById(userId);
        if (data.user) throw new Error(`Auth user ${userId} still exists.`);
      },
    });

    const { data: organization, error: organizationError } = await this.supabase
      .from("organizations")
      .insert({
        name: identity.organizationName,
        slug: identity.marker,
        province_or_region: "AB",
        created_by: userId,
      })
      .select("id")
      .single();

    if (organizationError) throw organizationError;
    const organizationId = organization.id as string;

    this.registerCleanup({
      label: `organization ${organizationId}`,
      run: async () => {
        const { error } = await this.supabase
          .from("organizations")
          .delete()
          .eq("id", organizationId)
          .eq("created_by", userId);
        if (error) throw error;

        const { data, error: lookupError } = await this.supabase
          .from("organizations")
          .select("id")
          .eq("id", organizationId)
          .maybeSingle();
        if (lookupError) throw lookupError;
        if (data) throw new Error(`Organization ${organizationId} still exists.`);
      },
    });

    const { error: memberError } = await this.supabase
      .from("organization_members")
      .insert({
        organization_id: organizationId,
        user_id: userId,
        role: "owner",
        status: "active",
        joined_at: new Date().toISOString(),
      });
    if (memberError) throw memberError;

    const { error: brandError } = await this.supabase
      .from("organization_brand_profiles")
      .insert({
        organization_id: organizationId,
        display_name: identity.organizationName,
      });
    if (brandError) throw brandError;

    return {
      marker: identity.marker,
      userId,
      organizationId,
      email: identity.email,
      password: identity.password,
    };
  }

  async organizationExists(organizationId: string) {
    const { data, error } = await this.supabase
      .from("organizations")
      .select("id")
      .eq("id", organizationId)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  async authUserExists(userId: string) {
    const { data, error } = await this.supabase.auth.admin.getUserById(userId);
    if (error) {
      if (error.status === 404 || error.code === "user_not_found") return false;
      throw error;
    }
    return Boolean(data.user);
  }

  async purge() {
    if (this.purged) return;

    const errors: Error[] = [];
    for (const task of [...this.cleanupTasks].reverse()) {
      try {
        await task.run();
      } catch (error) {
        errors.push(
          new Error(
            `${task.label}: ${
              error instanceof Error ? error.message : "Unknown cleanup error"
            }`,
          ),
        );
      }
    }

    if (errors.length) {
      throw new AggregateError(errors, "Test data cleanup failed.");
    }

    this.purged = true;
  }
}

export const test = base.extend<{ testData: TestDataManager }>({
  testData: async ({}, use, testInfo) => {
    const { url, serviceRoleKey } = requireTestEnvironment();
    const supabase = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const manager = new TestDataManager(supabase, testInfo);

    try {
      await use(manager);
    } finally {
      await manager.purge();
    }
  },
});

export { expect } from "@playwright/test";
