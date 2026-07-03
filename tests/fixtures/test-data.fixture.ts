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

export type CreatedEvent = {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
};

type DefaultCommunity = {
  id: string;
};

type CommunitySpace = {
  id: string;
  community_id: string;
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

  async createWorkspaceProvisioningRequest(owner: CreatedOrganizationOwner) {
    const { data, error } = await this.supabase
      .from("workspace_provisioning_requests")
      .insert({
        user_id: owner.userId,
        email: owner.email,
        full_name: "QA Owner",
        organization_name: owner.organizationName,
        province_or_region: "AB",
        plan_id: "roots",
        billing_interval: "month",
        status: "processing",
        checkout_session_id: `cs_test_${owner.marker}`,
        provider_customer_id: `cus_${owner.marker}`,
        provider_subscription_id: `sub_${owner.marker}`,
        provider_status: "active",
        payment_confirmed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;
    const requestId = data.id as string;

    this.registerCleanup({
      label: `workspace provisioning request ${requestId}`,
      run: async () => {
        const { error: deleteError } = await this.supabase
          .from("workspace_provisioning_requests")
          .delete()
          .eq("id", requestId);
        if (deleteError) throw deleteError;
      },
    });

    return requestId;
  }

  private async getDefaultCommunity(): Promise<DefaultCommunity> {
    const { data, error } = await this.supabase
      .from("communities")
      .select("id")
      .eq("slug", "olea-connects")
      .single();

    if (error) throw error;
    return data as DefaultCommunity;
  }

  private async getCommunitySpace(slug: string): Promise<CommunitySpace> {
    const community = await this.getDefaultCommunity();
    const { data, error } = await this.supabase
      .from("community_spaces")
      .select("id, community_id")
      .eq("community_id", community.id)
      .eq("slug", slug)
      .single();

    if (error) throw error;
    return data as CommunitySpace;
  }

  async assignCommunityManager(
    owner: CreatedOrganizationOwner,
    options: {
      role?: "manager" | "moderator";
      spaceSlug?: string;
    } = {},
  ) {
    const community = await this.getDefaultCommunity();
    const space = options.spaceSlug
      ? await this.getCommunitySpace(options.spaceSlug)
      : null;
    const { data, error } = await this.supabase
      .from("community_managers")
      .insert({
        community_id: community.id,
        space_id: space?.id ?? null,
        user_id: owner.userId,
        role: options.role ?? "manager",
      })
      .select("id")
      .single();

    if (error) throw error;
    const managerId = data.id as string;

    this.registerCleanup({
      label: `community manager ${managerId}`,
      run: async () => {
        const { error: deleteError } = await this.supabase
          .from("community_managers")
          .delete()
          .eq("id", managerId);
        if (deleteError) throw deleteError;
      },
    });

    return managerId;
  }

  async createCommunityPost(
    owner: CreatedOrganizationOwner,
    options: {
      body: string;
      kind?: "discussion" | "announcement" | "resource";
      pinned?: boolean;
      resourceUrl?: string;
      spaceSlug?: string;
      title: string;
    },
  ) {
    const space = await this.getCommunitySpace(options.spaceSlug ?? "general");
    const { data, error } = await this.supabase
      .from("community_posts")
      .insert({
        community_id: space.community_id,
        space_id: space.id,
        author_user_id: owner.userId,
        kind: options.kind ?? "discussion",
        status: "published",
        title: options.title,
        body: options.body,
        resource_url: options.resourceUrl,
        pinned_at: options.pinned ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (error) throw error;
    const postId = data.id as string;

    this.registerCleanup({
      label: `community post ${postId}`,
      run: async () => {
        const { error: deleteError } = await this.supabase
          .from("community_posts")
          .delete()
          .eq("id", postId);
        if (deleteError) throw deleteError;
      },
    });

    return postId;
  }

  async createCommunityEvent(
    owner: CreatedOrganizationOwner,
    options: {
      endsAt?: string;
      spaceSlug?: string;
      startsAt?: string;
      summary: string;
      timezone?: string;
      title: string;
      zoomUrl?: string;
    },
  ) {
    const community = await this.getDefaultCommunity();
    const space = options.spaceSlug
      ? await this.getCommunitySpace(options.spaceSlug)
      : null;
    const startsAt =
      options.startsAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const endsAt =
      options.endsAt ??
      new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();

    const { data, error } = await this.supabase
      .from("community_events")
      .insert({
        community_id: community.id,
        space_id: space?.id ?? null,
        title: options.title,
        summary: options.summary,
        starts_at: startsAt,
        ends_at: endsAt,
        timezone: options.timezone ?? "America/Vancouver",
        zoom_url: options.zoomUrl,
        status: "scheduled",
        created_by: owner.userId,
      })
      .select("id")
      .single();

    if (error) throw error;
    const eventId = data.id as string;

    this.registerCleanup({
      label: `community event ${eventId}`,
      run: async () => {
        const { error: deleteError } = await this.supabase
          .from("community_events")
          .delete()
          .eq("id", eventId);
        if (deleteError) throw deleteError;
      },
    });

    return eventId;
  }

  async createEvent(
    options: {
      accessPlanIds?: Array<"seedling" | "roots" | "canopy" | "harvest">;
      capacity?: number | null;
      complimentaryTicketLimit?: number | null;
      endsAt?: string;
      included?: boolean;
      joinUrl?: string | null;
      recordingStoragePath?: string | null;
      recordingUrl?: string | null;
      startsAt?: string;
      status?:
        | "draft"
        | "scheduled"
        | "live"
        | "completed"
        | "canceled"
        | "rescheduled";
      ticketPriceCents?: number | null;
      title?: string;
      type?:
        | "webinar"
        | "speaker_session"
        | "funder_ama"
        | "networking"
        | "workshop"
        | "summit";
    } = {},
  ): Promise<CreatedEvent> {
    const identity = createTestIdentity(
      this.testInfo,
      ++this.identitySequence,
    );
    const startsAt =
      options.startsAt ?? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const endsAt =
      options.endsAt ??
      new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();
    const slug = `${identity.marker}-event`;
    const title = options.title ?? `QA Zoom Event ${identity.marker}`;

    const { data: event, error } = await this.supabase
      .from("events")
      .insert({
        type: options.type ?? "webinar",
        status: options.status ?? "scheduled",
        slug,
        title,
        summary: "QA-created Zoom event for isolated E2E coverage.",
        starts_at: startsAt,
        ends_at: endsAt,
        timezone: "America/Vancouver",
        capacity: options.capacity ?? 100,
        registration_opens_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        registration_closes_at: new Date(
          new Date(startsAt).getTime() - 15 * 60 * 1000,
        ).toISOString(),
        meeting_provider: "zoom",
        provider_event_id: `zoom-${identity.marker}`,
        join_url:
          options.joinUrl ??
          `https://zoom.us/j/${Date.now().toString().slice(-10)}`,
        recording_storage_path: options.recordingStoragePath,
        recording_url: options.recordingUrl,
      })
      .select("id")
      .single();

    if (error) throw error;
    const eventId = event.id as string;

    this.registerCleanup({
      label: `event ${eventId}`,
      run: async () => {
        const { error: deleteError } = await this.supabase
          .from("events")
          .delete()
          .eq("id", eventId);
        if (deleteError) throw deleteError;
      },
    });

    const accessPlanIds = options.accessPlanIds ?? ["roots", "canopy", "harvest"];
    if (accessPlanIds.length) {
      const { error: accessError } = await this.supabase
        .from("event_plan_access")
        .insert(
          accessPlanIds.map((planId) => ({
            event_id: eventId,
            plan_id: planId,
            included: options.included ?? true,
            complimentary_ticket_limit: options.complimentaryTicketLimit ?? null,
            ticket_price_cents: options.ticketPriceCents ?? null,
          })),
        );
      if (accessError) throw accessError;
    }

    return { id: eventId, slug, title, startsAt };
  }

  async getEventRegistration(eventId: string, userId: string) {
    const { data, error } = await this.supabase
      .from("event_registrations")
      .select(
        "id, status, provider_registration_id, provider_attendance_id, watch_duration_seconds",
      )
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async createEventRegistration(
    event: CreatedEvent,
    attendee: CreatedOrganizationOwner | CreatedOrganizationMember,
    options: {
      status?: "registered" | "waitlisted" | "attended" | "no_show";
    } = {},
  ) {
    const { data, error } = await this.supabase
      .from("event_registrations")
      .insert({
        event_id: event.id,
        organization_id: attendee.organizationId,
        user_id: attendee.userId,
        status: options.status ?? "registered",
        guest_name: "QA Event Attendee",
        guest_email: attendee.email,
        registration_source: "e2e",
      })
      .select("id")
      .single();

    if (error) throw error;
    const registrationId = data.id as string;

    this.registerCleanup({
      label: `event registration ${registrationId}`,
      run: async () => {
        const { error: deleteError } = await this.supabase
          .from("event_registrations")
          .delete()
          .eq("id", registrationId);
        if (deleteError) throw deleteError;
      },
    });

    return registrationId;
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
