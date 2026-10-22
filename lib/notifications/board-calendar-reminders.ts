import { createHash } from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  addDays,
  buildCalendarEvents,
  parseDateKey,
  toDateKey,
  type CalendarViewEvent,
} from "@/lib/template-renderer/calendar-view";
import type { TemplateFormData } from "@/lib/template-renderer/types";
import { createAdminClient } from "@/utils/supabase/admin";

export const BOARD_CALENDAR_REMINDER_TYPE = "board_calendar_reminder";
export const BOARD_CALENDAR_REMINDER_LIMIT = 500;

type ReminderWindow = "today" | "tomorrow";

type BoardCalendarInstanceRow = {
  id: string;
  organization_id: string;
  title: string;
  form_data: TemplateFormData;
};

type OrganizationMemberRow = {
  organization_id: string;
  user_id: string;
};

type NotificationInsertRow = {
  action_url: string;
  body: string;
  expires_at: string;
  idempotency_key: string;
  metadata: Record<string, unknown>;
  organization_id: string;
  severity: "info";
  title: string;
  type: typeof BOARD_CALENDAR_REMINDER_TYPE;
  user_id: string;
};

export type BoardCalendarReminderSummary = {
  dryRun: boolean;
  matchedEvents: number;
  notifiedUsers: number;
  notificationsCreated: number;
  notificationsMatched: number;
  scannedInstances: number;
  targetDates: string[];
};

function getReminderDates(now: Date) {
  return [
    { dateKey: toDateKey(now), window: "today" as const },
    { dateKey: toDateKey(addDays(now, 1)), window: "tomorrow" as const },
  ];
}

function getEventDateWindow(
  event: CalendarViewEvent,
  reminderDates: Array<{ dateKey: string; window: ReminderWindow }>,
) {
  if (!event.dateKey) return null;
  return reminderDates.find((reminderDate) => reminderDate.dateKey === event.dateKey) ?? null;
}

function formatReminderTitle(event: CalendarViewEvent) {
  switch (event.source) {
    case "meeting":
      return "Board calendar meeting coming up";
    case "task":
      return "Board calendar task coming up";
    case "agm":
      return "AGM milestone coming up";
    case "annual":
    default:
      return "Board calendar item coming up";
  }
}

function formatReminderBody(event: CalendarViewEvent, window: ReminderWindow) {
  const dayLabel = window === "today" ? "today" : "tomorrow";
  const timeLabel = event.time ? ` at ${event.time}` : "";
  const relatedMeeting = event.relatedMeeting
    ? ` Related meeting: ${event.relatedMeeting}.`
    : "";

  return `${event.title} is scheduled for ${dayLabel}${timeLabel}.${relatedMeeting}`;
}

function getReminderExpiry(dateKey: string) {
  const date = parseDateKey(dateKey);
  return toDateKey(addDays(date ?? new Date(), 7)) + "T23:59:59.000Z";
}

function getEventFingerprint(event: CalendarViewEvent) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        dateKey: event.dateKey,
        location: event.location,
        relatedMeeting: event.relatedMeeting,
        source: event.source,
        time: event.time,
        title: event.title,
      }),
    )
    .digest("hex")
    .slice(0, 20);
}

function buildNotificationRows({
  instance,
  members,
  reminderDates,
}: {
  instance: BoardCalendarInstanceRow;
  members: OrganizationMemberRow[];
  reminderDates: Array<{ dateKey: string; window: ReminderWindow }>;
}) {
  const instanceMembers = members.filter(
    (member) => member.organization_id === instance.organization_id,
  );
  if (!instanceMembers.length) return [];

  return buildCalendarEvents(instance.form_data).flatMap((event) => {
    const reminderDate = getEventDateWindow(event, reminderDates);
    if (!reminderDate) return [];

    const eventFingerprint = getEventFingerprint(event);
    return instanceMembers.map<NotificationInsertRow>((member) => ({
      action_url: `/modules/board-calendar?session=${instance.id}`,
      body: formatReminderBody(event, reminderDate.window),
      expires_at: getReminderExpiry(reminderDate.dateKey),
      idempotency_key: [
        BOARD_CALENDAR_REMINDER_TYPE,
        instance.id,
        reminderDate.window,
        eventFingerprint,
      ].join(":"),
      metadata: {
        board_calendar_event_source: event.source,
        board_calendar_instance_id: instance.id,
        board_calendar_instance_title: instance.title,
        event_date: event.dateKey,
        event_time: event.time ?? null,
        event_title: event.title,
        reminder_window: reminderDate.window,
      },
      organization_id: instance.organization_id,
      severity: "info",
      title: formatReminderTitle(event),
      type: BOARD_CALENDAR_REMINDER_TYPE,
      user_id: member.user_id,
    }));
  });
}

export async function processBoardCalendarReminders({
  dryRun = false,
  now = new Date(),
  supabase = createAdminClient(),
}: {
  dryRun?: boolean;
  now?: Date;
  supabase?: SupabaseClient;
} = {}): Promise<BoardCalendarReminderSummary> {
  const reminderDates = getReminderDates(now);

  const { data: instances, error: instanceError } = await supabase
    .from("template_instances")
    .select("id, organization_id, title, form_data, resources!inner(slug)")
    .eq("resources.slug", "board-calendar-operational-workflow")
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(BOARD_CALENDAR_REMINDER_LIMIT);

  if (instanceError) throw instanceError;

  const calendarInstances =
    (instances as BoardCalendarInstanceRow[] | null) ?? [];
  const organizationIds = Array.from(
    new Set(calendarInstances.map((instance) => instance.organization_id)),
  );

  if (!calendarInstances.length || !organizationIds.length) {
    return {
      dryRun,
      matchedEvents: 0,
      notifiedUsers: 0,
      notificationsCreated: 0,
      notificationsMatched: 0,
      scannedInstances: calendarInstances.length,
      targetDates: reminderDates.map((date) => date.dateKey),
    };
  }

  const { data: members, error: memberError } = await supabase
    .from("organization_members")
    .select("organization_id, user_id")
    .in("organization_id", organizationIds)
    .eq("status", "active");

  if (memberError) throw memberError;

  const activeMembers = (members as OrganizationMemberRow[] | null) ?? [];
  const notificationRows = calendarInstances.flatMap((instance) =>
    buildNotificationRows({
      instance,
      members: activeMembers,
      reminderDates,
    }),
  );

  if (dryRun || !notificationRows.length) {
    return {
      dryRun,
      matchedEvents: new Set(
        notificationRows.map(
          (row) =>
            `${row.metadata.board_calendar_instance_id}:${row.metadata.event_title}:${row.metadata.event_date}`,
        ),
      ).size,
      notifiedUsers: new Set(notificationRows.map((row) => row.user_id)).size,
      notificationsCreated: 0,
      notificationsMatched: notificationRows.length,
      scannedInstances: calendarInstances.length,
      targetDates: reminderDates.map((date) => date.dateKey),
    };
  }

  const { data: insertedNotifications, error: insertError } = await supabase
    .from("notifications")
    .upsert(notificationRows, {
      ignoreDuplicates: true,
      onConflict: "user_id,idempotency_key",
    })
    .select("id");

  if (insertError) throw insertError;

  return {
    dryRun,
    matchedEvents: new Set(
      notificationRows.map(
        (row) =>
          `${row.metadata.board_calendar_instance_id}:${row.metadata.event_title}:${row.metadata.event_date}`,
      ),
    ).size,
    notifiedUsers: new Set(notificationRows.map((row) => row.user_id)).size,
    notificationsCreated: insertedNotifications?.length ?? 0,
    notificationsMatched: notificationRows.length,
    scannedInstances: calendarInstances.length,
    targetDates: reminderDates.map((date) => date.dateKey),
  };
}
