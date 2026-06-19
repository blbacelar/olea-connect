import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { test as base } from "@playwright/test";

import { createTestIdentity } from "../factories/identity";
import { getTestSupabaseEnvironment } from "../support/test-environment";

type CleanupTask = {
  label: string;
  run: () => Promise<void>;
};

export type CreatedOrganizationOwner = {
  marker: string;
  userId: string;
  organizationId: string;
  organizationName: string;
  subscriptionId: string | null;
  email: string;
  password: string;
};

export type CreatedOrganizationMember = {
  marker: string;
  userId: string;
  organizationId: string;
  email: string;
  password: string;
};

export class TestDataManager {
  private readonly cleanupTasks: CleanupTask[] = [];
  private identitySequence = 0;
  private purged = false;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly testInfo: Parameters<typeof createTestIdentity>[0],
  ) {}

  private registerCleanup(task: CleanupTask) {
    this.cleanupTasks.push(task);
  }

  async createOrganizationOwner(
    options: {
      activeSubscription?: boolean;
      planId?: "seedling" | "roots" | "canopy" | "harvest";
      subscriptionStatus?:
        | "incomplete"
        | "trialing"
        | "active"
        | "past_due"
        | "paused"
        | "canceled"
        | "unpaid";
    } = {},
  ): Promise<CreatedOrganizationOwner> {
    const identity = createTestIdentity(
      this.testInfo,
      ++this.identitySequence,
    );
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

    this.registerCleanup({
      label: `organization logo storage ${organizationId}`,
      run: async () => {
        const { data, error } = await this.supabase.storage
          .from("organization-logos")
          .list(organizationId);
        if (error) throw error;
        const paths = (data ?? []).map((file) => `${organizationId}/${file.name}`);
        if (!paths.length) return;

        const { error: removeError } = await this.supabase.storage
          .from("organization-logos")
          .remove(paths);
        if (removeError) throw removeError;
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

    this.registerCleanup({
      label: `organization member ${organizationId}/${userId}`,
      run: async () => {
        const { error } = await this.supabase
          .from("organization_members")
          .delete()
          .eq("organization_id", organizationId)
          .eq("user_id", userId);
        if (error) throw error;
      },
    });

    const { error: brandError } = await this.supabase
      .from("organization_brand_profiles")
      .insert({
        organization_id: organizationId,
        display_name: identity.organizationName,
      });
    if (brandError) throw brandError;

    this.registerCleanup({
      label: `brand profile ${organizationId}`,
      run: async () => {
        const { error } = await this.supabase
          .from("organization_brand_profiles")
          .delete()
          .eq("organization_id", organizationId);
        if (error) throw error;
      },
    });

    let subscriptionId: string | null = null;
    if (options.activeSubscription || options.subscriptionStatus) {
      const { data: subscription, error: subscriptionError } =
        await this.supabase
          .from("subscriptions")
          .insert({
            organization_id: organizationId,
            plan_id: options.planId ?? "roots",
            provider: "manual",
            billing_interval: "month",
            status: options.subscriptionStatus ?? "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            metadata: { e2e_marker: identity.marker },
          })
          .select("id")
          .single();
      if (subscriptionError) throw subscriptionError;
      subscriptionId = subscription.id as string;

      this.registerCleanup({
        label: `subscription ${subscriptionId}`,
        run: async () => {
          const { error } = await this.supabase
            .from("subscriptions")
            .delete()
            .eq("id", subscriptionId);
          if (error) throw error;
        },
      });
    }

    return {
      marker: identity.marker,
      userId,
      organizationId,
      organizationName: identity.organizationName,
      subscriptionId,
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

  async getBrandProfile(organizationId: string) {
    const { data, error } = await this.supabase
      .from("organization_brand_profiles")
      .select("display_name, logo_path, primary_color, secondary_color, brand_completed_at")
      .eq("organization_id", organizationId)
      .single();
    if (error) throw error;
    return data;
  }

  async createOrganizationMember(
    owner: CreatedOrganizationOwner,
    options: {
      role?: "admin" | "member";
    } = {},
  ): Promise<CreatedOrganizationMember> {
    const identity = createTestIdentity(
      this.testInfo,
      ++this.identitySequence,
    );
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
      },
    });

    const { error: memberError } = await this.supabase
      .from("organization_members")
      .insert({
        organization_id: owner.organizationId,
        user_id: userId,
        role: options.role ?? "member",
        status: "active",
        joined_at: new Date().toISOString(),
      });
    if (memberError) throw memberError;

    this.registerCleanup({
      label: `organization member ${owner.organizationId}/${userId}`,
      run: async () => {
        const { error } = await this.supabase
          .from("organization_members")
          .delete()
          .eq("organization_id", owner.organizationId)
          .eq("user_id", userId);
        if (error) throw error;
      },
    });

    return {
      marker: identity.marker,
      userId,
      organizationId: owner.organizationId,
      email: identity.email,
      password: identity.password,
    };
  }

  async authUserExists(userId: string) {
    const { data, error } = await this.supabase.auth.admin.getUserById(userId);
    if (error) {
      if (error.status === 404 || error.code === "user_not_found") return false;
      throw error;
    }
    return Boolean(data.user);
  }

  async getTemplateExportCounts(organizationId: string) {
    const { count: exportsCount, error: exportsError } = await this.supabase
      .from("template_exports")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId);
    if (exportsError) throw exportsError;

    const { count: downloadsCount, error: downloadsError } = await this.supabase
      .from("template_export_downloads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId);
    if (downloadsError) throw downloadsError;

    return {
      exports: exportsCount ?? 0,
      downloads: downloadsCount ?? 0,
    };
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
      throw new Error(
        `Test data cleanup failed:\n${errors
          .map((error) => `- ${error.message}`)
          .join("\n")}`,
      );
    }

    this.purged = true;
  }
}

export const test = base.extend<{ testData: TestDataManager }>({
  testData: async ({}, use, testInfo) => {
    const { url, serviceRoleKey } = getTestSupabaseEnvironment();
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
