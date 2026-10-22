import "server-only";

import type {
  ConsultingActivityEntry,
  ConsultingHourSummary,
  ConsultingRequest,
  ConsultingRequestStatus,
  ConsultingRequestType,
  ConsultingRequestUrgency,
  ConsultingTimeEntry,
} from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

import { requireMemberContext } from "./member-context";

const consultingStaffRoles = ["super_admin", "consulting_admin", "consultant"];
const activeSubscriptionStatuses = new Set(["active", "trialing"]);
const memberRequestSelect =
  "id, requested_by, assigned_to, type, urgency, status, title, description, due_at, scheduled_at, completed_at, member_notes, created_at, updated_at, consulting_engagements!inner(organization_id, organizations(name)), consulting_request_attachments(id, file_name, file_path, content_type, size_bytes, created_at), consulting_time_entries(id, user_id, work_date, minutes, is_in_kind, description, created_at), consulting_request_activity(id, actor_user_id, event_type, old_status, new_status, message, created_at)";
const staffRequestSelect =
  "id, requested_by, assigned_to, type, urgency, status, title, description, due_at, scheduled_at, completed_at, internal_notes, member_notes, created_at, updated_at, consulting_engagements!inner(organization_id, organizations(name)), consulting_request_attachments(id, file_name, file_path, content_type, size_bytes, created_at), consulting_time_entries(id, user_id, work_date, minutes, is_in_kind, description, created_at), consulting_request_activity(id, actor_user_id, event_type, old_status, new_status, message, created_at)";

type RawTimeEntry = {
  id: string;
  user_id: string;
  work_date: string;
  minutes: number;
  is_in_kind: boolean;
  description: string;
  created_at: string;
};

type RawActivityEntry = {
  id: number;
  actor_user_id: string | null;
  event_type: string;
  old_status: ConsultingRequestStatus | null;
  new_status: ConsultingRequestStatus | null;
  message: string | null;
  created_at: string;
};

type RawAttachment = {
  id: string;
  file_name: string;
  file_path: string;
  content_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

type RawRequest = {
  id: string;
  requested_by: string;
  assigned_to: string | null;
  type: ConsultingRequestType;
  urgency: ConsultingRequestUrgency;
  status: ConsultingRequestStatus;
  title: string;
  description: string;
  due_at: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  internal_notes?: string | null;
  member_notes: string | null;
  created_at: string;
  updated_at: string;
  consulting_engagements:
    | {
        organization_id: string;
        organizations: { name: string | null } | Array<{ name: string | null }> | null;
      }
    | Array<{
        organization_id: string;
        organizations: { name: string | null } | Array<{ name: string | null }> | null;
      }>
    | null;
  consulting_request_attachments: RawAttachment[] | null;
  consulting_time_entries: RawTimeEntry[] | null;
  consulting_request_activity: RawActivityEntry[] | null;
};

type RawSubscriptionItem = {
  active: boolean | null;
  item_type: string;
  quantity: number;
};

type RawTimeSummaryEntry = {
  is_in_kind: boolean;
  minutes: number;
};

function singleRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function profileName(
  profilesById: Map<string, string>,
  userId: string | null | undefined,
  fallback: string,
) {
  if (!userId) return null;
  return profilesById.get(userId) ?? fallback;
}

function mapTimeEntry(row: RawTimeEntry): ConsultingTimeEntry {
  return {
    id: row.id,
    userId: row.user_id,
    workDate: row.work_date,
    minutes: row.minutes,
    isInKind: row.is_in_kind,
    description: row.description,
    createdAt: row.created_at,
  };
}

function mapActivity(row: RawActivityEntry): ConsultingActivityEntry {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    eventType: row.event_type,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    message: row.message,
    createdAt: row.created_at,
  };
}

function mapRequest(
  row: RawRequest,
  profilesById: Map<string, string>,
  includeInternalNotes: boolean,
): ConsultingRequest {
  const engagement = singleRelation(row.consulting_engagements);
  const organization = singleRelation(engagement?.organizations);

  return {
    id: row.id,
    organizationId: engagement?.organization_id ?? "",
    organizationName: organization?.name ?? "Member organization",
    requestedBy: row.requested_by,
    requestedByName: profileName(profilesById, row.requested_by, "Member") ?? "Member",
    assignedTo: row.assigned_to,
    assignedToName: profileName(profilesById, row.assigned_to, "Consultant"),
    type: row.type,
    urgency: row.urgency,
    status: row.status,
    title: row.title,
    description: row.description,
    dueAt: row.due_at,
    scheduledAt: row.scheduled_at,
    completedAt: row.completed_at,
    memberNotes: row.member_notes,
    internalNotes: includeInternalNotes ? row.internal_notes ?? null : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attachments: (row.consulting_request_attachments ?? []).map((attachment) => ({
      contentType: attachment.content_type,
      createdAt: attachment.created_at,
      downloadUrl: null,
      fileName: attachment.file_name,
      filePath: attachment.file_path,
      id: attachment.id,
      sizeBytes: attachment.size_bytes,
    })),
    timeEntries: (row.consulting_time_entries ?? []).map(mapTimeEntry),
    activity: (row.consulting_request_activity ?? []).map(mapActivity),
  };
}

async function getProfilesById(userIds: string[]) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueUserIds.length) return new Map<string, string>();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", uniqueUserIds);

  if (error) throw error;

  return new Map(
    (data ?? []).map((profile) => [
      profile.id,
      profile.full_name?.trim() || "Member",
    ]),
  );
}

async function isConsultingStaff(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", consultingStaffRoles);

  if (error) throw error;
  return (data ?? []).length > 0;
}

async function getConsultingStaffUsers() {
  const admin = createAdminClient();
  const { data: roles, error } = await admin
    .from("platform_user_roles")
    .select("user_id")
    .in("role", consultingStaffRoles);

  if (error) throw error;

  const userIds = Array.from(new Set((roles ?? []).map((role) => role.user_id)));
  const profilesById = await getProfilesById(userIds);

  return userIds.map((userId) => ({
    id: userId,
    name: profilesById.get(userId) ?? "Consulting staff",
  }));
}

async function addAttachmentDownloadUrls(requests: ConsultingRequest[]) {
  const admin = createAdminClient();

  return Promise.all(
    requests.map(async (request) => {
      const attachments = await Promise.all(
        request.attachments.map(async (attachment) => {
          const { data, error } = await admin.storage
            .from("consulting-attachments")
            .createSignedUrl(attachment.filePath, 60 * 60);

          return {
            ...attachment,
            downloadUrl: error ? null : data.signedUrl,
          };
        }),
      );

      return { ...request, attachments };
    }),
  );
}

async function getConsultingRequests({
  includeInternalNotes,
  organizationId,
}: {
  includeInternalNotes: boolean;
  organizationId?: string;
}) {
  const admin = createAdminClient();
  let query = admin
    .from("consulting_requests")
    .select(includeInternalNotes ? staffRequestSelect : memberRequestSelect)
    .order("updated_at", { ascending: false });

  if (organizationId) {
    query = query.eq("consulting_engagements.organization_id", organizationId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const requests = (data ?? []) as unknown as RawRequest[];
  const userIds = requests.flatMap((request) => [
    request.requested_by,
    request.assigned_to,
    ...(request.consulting_time_entries ?? []).map((entry) => entry.user_id),
    ...(request.consulting_request_activity ?? []).map(
      (activity) => activity.actor_user_id,
    ),
  ]);
  const profilesById = await getProfilesById(userIds.filter(Boolean) as string[]);

  return addAttachmentDownloadUrls(
    requests.map((request) =>
      mapRequest(request, profilesById, includeInternalNotes),
    ),
  );
}

function emptyHourSummary(): ConsultingHourSummary {
  return {
    includedMinutes: 0,
    inKindMinutes: 0,
    purchasedMinutes: 0,
    usedIncludedMinutes: 0,
    usedInKindMinutes: 0,
    periodStart: null,
    periodEnd: null,
  };
}

async function getHourSummary(organizationId: string): Promise<ConsultingHourSummary> {
  const admin = createAdminClient();
  const { data: subscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .select(
      "id, plan_id, status, current_period_start, current_period_end, subscription_items(item_type, quantity, active)",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionError) throw subscriptionError;
  if (
    !subscription ||
    subscription.plan_id !== "harvest" ||
    !activeSubscriptionStatuses.has(subscription.status)
  ) {
    return emptyHourSummary();
  }

  const { data: engagement, error: engagementError } = await admin
    .from("consulting_engagements")
    .select(
      "id, monthly_included_minutes, monthly_in_kind_minutes, starts_on, ends_on, consulting_time_entries(minutes, is_in_kind)",
    )
    .eq("subscription_id", subscription.id)
    .maybeSingle();

  if (engagementError) throw engagementError;

  const purchasedMinutes = (
    (subscription.subscription_items ?? []) as RawSubscriptionItem[]
  ).reduce(
    (total, item) =>
      item.item_type === "consulting_hour" && item.active
        ? total + item.quantity * 60
        : total,
    0,
  );
  const timeEntries = (engagement?.consulting_time_entries ??
    []) as RawTimeSummaryEntry[];

  return {
    includedMinutes: engagement?.monthly_included_minutes ?? 300,
    inKindMinutes: engagement?.monthly_in_kind_minutes ?? 120,
    purchasedMinutes,
    usedIncludedMinutes: timeEntries
      .filter((entry) => !entry.is_in_kind)
      .reduce((total, entry) => total + entry.minutes, 0),
    usedInKindMinutes: timeEntries
      .filter((entry) => entry.is_in_kind)
      .reduce((total, entry) => total + entry.minutes, 0),
    periodStart:
      engagement?.starts_on ?? subscription.current_period_start?.slice(0, 10) ?? null,
    periodEnd:
      engagement?.ends_on ?? subscription.current_period_end?.slice(0, 10) ?? null,
  };
}

export async function getConsultingData() {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();
  const [
    { data: subscription, error: subscriptionError },
    canManageConsulting,
    memberRequests,
    hourSummary,
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("plan_id, status")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    isConsultingStaff(member.id),
    getConsultingRequests({
      includeInternalNotes: false,
      organizationId: organization.id,
    }),
    getHourSummary(organization.id),
  ]);

  if (subscriptionError) throw subscriptionError;

  const isHarvestEntitled =
    subscription?.plan_id === "harvest" &&
    activeSubscriptionStatuses.has(subscription.status);
  const staffRequests = canManageConsulting
    ? await getConsultingRequests({ includeInternalNotes: true })
    : [];
  const staffUsers = canManageConsulting ? await getConsultingStaffUsers() : [];

  return {
    canManageConsulting,
    hourSummary,
    isHarvestEntitled,
    member,
    memberRequests,
    organization,
    staffRequests,
    staffUsers,
  };
}
