import type { EdReviewCampaignStatus } from "@/lib/ed-review/domain";
import type {
  ConsultingActivityLookup,
  ConsultingRequestLookup,
  ConsultingTimeEntryLookup,
  CreatedNotification,
  CreatedOrganizationMember,
  CreatedOrganizationOwner,
  EdReviewCycleState,
  EdReviewReviewerAssignmentState,
  TestDataManager,
} from "../test-data.fixture";

export async function getConsultingRequestByTitle(this: TestDataManager, title: string) {
  const { data, error } = await this.supabase
    .from("consulting_requests")
    .select(
      "id, assigned_to, description, internal_notes, member_notes, status, title",
    )
    .eq("title", title)
    .maybeSingle();

  if (error) throw error;
  return data as ConsultingRequestLookup | null;
}

export async function getConsultingRequestCountByTitle(this: TestDataManager, title: string) {
  const { count, error } = await this.supabase
    .from("consulting_requests")
    .select("id", { count: "exact", head: true })
    .eq("title", title);

  if (error) throw error;
  return count ?? 0;
}

export async function getConsultingRequestActivity(this: TestDataManager, requestId: string) {
  const { data, error } = await this.supabase
    .from("consulting_request_activity")
    .select("event_type, message, new_status, old_status")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ConsultingActivityLookup[];
}

export async function getConsultingTimeEntries(this: TestDataManager, requestId: string) {
  const { data, error } = await this.supabase
    .from("consulting_time_entries")
    .select("description, is_in_kind, minutes, work_date")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ConsultingTimeEntryLookup[];
}

export async function clearNotifications(this: TestDataManager,
  owner: CreatedOrganizationOwner | CreatedOrganizationMember,
) {
  const { error } = await this.supabase
    .from("notifications")
    .delete()
    .eq("user_id", owner.userId);

  if (error) throw error;
}

export async function createNotification(this: TestDataManager,
  owner: CreatedOrganizationOwner | CreatedOrganizationMember,
  options: {
    actionUrl?: string;
    body?: string;
    idempotencyKey?: string;
    severity?: "info" | "success" | "warning" | "critical";
    title: string;
    type?: string;
  },
): Promise<CreatedNotification> {
  const { data, error } = await this.supabase
    .from("notifications")
    .insert({
      user_id: owner.userId,
      organization_id: owner.organizationId,
      severity: options.severity ?? "info",
      type: options.type ?? "template_available",
      title: options.title,
      body: options.body ?? "A QA-created notification is ready.",
      action_url: options.actionUrl ?? "/dashboard",
      idempotency_key:
        options.idempotencyKey ??
        `${owner.marker}:notification:${++this.identitySequence}`,
    })
    .select("id")
    .single();

  if (error) throw error;
  const notificationId = data.id as string;

  this.registerCleanup({
    label: `notification ${notificationId}`,
    run: async () => {
      const { error: deleteError } = await this.supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);
      if (deleteError) throw deleteError;
    },
  });

  return {
    id: notificationId,
    userId: owner.userId,
    title: options.title,
  };
}

export async function getNotification(this: TestDataManager, notificationId: string) {
  const { data, error } = await this.supabase
    .from("notifications")
    .select("id, read_at, user_id")
    .eq("id", notificationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getEdReviewCycleState(this: TestDataManager,
  organizationId: string,
): Promise<EdReviewCycleState | null> {
  const { data: cycle, error: cycleError } = await this.supabase
    .from("ed_review_cycles")
    .select("id, status")
    .eq("organization_id", organizationId)
    .neq("status", "archived")
    .order("review_year", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (cycleError) throw cycleError;
  if (!cycle) return null;

  const { data: campaigns, error: campaignError } = await this.supabase
    .from("ed_review_campaigns")
    .select("title, status")
    .eq("cycle_id", cycle.id)
    .order("created_at");
  if (campaignError) throw campaignError;

  return {
    status: cycle.status as EdReviewCampaignStatus,
    campaigns: (campaigns ?? []).map((campaign) => ({
      status: campaign.status as EdReviewCampaignStatus,
      title: campaign.title,
    })),
  };
}

export async function getEdReviewReviewerAssignments(this: TestDataManager,
  organizationId: string,
  userId: string,
): Promise<EdReviewReviewerAssignmentState[]> {
  const { data: cycle, error: cycleError } = await this.supabase
    .from("ed_review_cycles")
    .select("id")
    .eq("organization_id", organizationId)
    .neq("status", "archived")
    .order("review_year", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (cycleError) throw cycleError;
  if (!cycle) return [];

  const { data, error } = await this.supabase
    .from("ed_review_reviewer_assignments")
    .select("id, role")
    .eq("cycle_id", cycle.id)
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw error;

  return (data ?? []) as EdReviewReviewerAssignmentState[];
}

export async function removeEdReviewReviewerAssignment(this: TestDataManager,
  organizationId: string,
  userId: string,
) {
  const { data: cycle, error: cycleError } = await this.supabase
    .from("ed_review_cycles")
    .select("id")
    .eq("organization_id", organizationId)
    .neq("status", "archived")
    .order("review_year", { ascending: false })
    .limit(1)
    .single();
  if (cycleError) throw cycleError;

  const { error } = await this.supabase
    .from("ed_review_reviewer_assignments")
    .delete()
    .eq("cycle_id", cycle.id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function revokeEdReviewBoardChair(this: TestDataManager,
  organizationId: string,
  userId: string,
) {
  const { data: cycle, error: cycleError } = await this.supabase
    .from("ed_review_cycles")
    .select("id")
    .eq("organization_id", organizationId)
    .neq("status", "archived")
    .order("review_year", { ascending: false })
    .limit(1)
    .single();
  if (cycleError) throw cycleError;

  const { error } = await this.supabase
    .from("ed_review_reviewer_assignments")
    .delete()
    .eq("cycle_id", cycle.id)
    .eq("user_id", userId)
    .eq("role", "board_chair");
  if (error) throw error;
}
