import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { subscribeToMemberNotifications } from "@/lib/notifications/realtime-client";
import type { Locale } from "@/lib/i18n/locales";
import type { MemberNotification, NotificationSeverity } from "@/lib/types";

export type HeaderRouter = {
  push: (href: string) => void;
  refresh: () => void;
};

export type NotificationRealtimePayload =
  Parameters<typeof subscribeToMemberNotifications>[1] extends (
    payload: infer Payload,
  ) => void
    ? Payload
    : never;

type NotificationRealtimeRow = {
  action_url: string | null;
  body: string;
  created_at: string;
  expires_at: string | null;
  id: string;
  read_at: string | null;
  severity: NotificationSeverity;
  title: string;
  type: string;
  user_id: string;
};

export const notificationTone: Record<NotificationSeverity, string> = {
  critical: "bg-red-50 text-red-600",
  info: "bg-olea-light text-olea-green",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
};

export function handleRealtimePayload({
  items,
  payload,
  router,
  setError,
  syncState,
  unreadCount,
}: {
  items: MemberNotification[];
  payload: NotificationRealtimePayload;
  router: HeaderRouter;
  setError: (message: string) => void;
  syncState: (items: MemberNotification[], unreadCount: number) => void;
  unreadCount: number;
}) {
  if (payload.eventType === "DELETE") {
    handleDeletedNotification({ items, payload, router, syncState, unreadCount });
    return;
  }

  const notification = mapNotificationRow(payload.new);
  if (!notification) return;

  if (notification.readAt) {
    handleReadNotification({ items, notification, router, syncState, unreadCount });
    return;
  }

  handleUnreadNotification({
    items,
    notification,
    router,
    setError,
    syncState,
    unreadCount,
  });
}

export function getNotificationIcon(severity: NotificationSeverity) {
  if (severity === "critical" || severity === "warning") return AlertTriangle;
  if (severity === "success") return CheckCircle2;
  return Info;
}

export function getUnreadLabel(count: number) {
  if (count > 99) return "99+";
  return String(count);
}

export function formatNotificationTime(
  value: string,
  locale: Locale,
  justNow: string,
) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";

  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const ranges = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ] as const;

  for (const [unit, seconds] of ranges) {
    if (Math.abs(diffSeconds) >= seconds) {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }

  return justNow;
}

function handleDeletedNotification({
  items,
  payload,
  router,
  syncState,
  unreadCount,
}: {
  items: MemberNotification[];
  payload: NotificationRealtimePayload;
  router: HeaderRouter;
  syncState: (items: MemberNotification[], unreadCount: number) => void;
  unreadCount: number;
}) {
  const oldNotification = mapNotificationRow(payload.old);
  if (!oldNotification) return;

  const nextItems = items.filter((item) => item.id !== oldNotification.id);
  const nextCount = wasUnreadNotificationRow(payload.old)
    ? Math.max(0, unreadCount - 1)
    : unreadCount;
  syncState(nextItems, nextCount);
  router.refresh();
}

function handleReadNotification({
  items,
  notification,
  router,
  syncState,
  unreadCount,
}: {
  items: MemberNotification[];
  notification: MemberNotification;
  router: HeaderRouter;
  syncState: (items: MemberNotification[], unreadCount: number) => void;
  unreadCount: number;
}) {
  const existingNotification = items.find((item) => item.id === notification.id);
  const nextItems = items.filter((item) => item.id !== notification.id);
  const nextCount =
    existingNotification && !existingNotification.readAt
      ? Math.max(0, unreadCount - 1)
      : unreadCount;

  syncState(nextItems, nextCount);
  router.refresh();
}

function handleUnreadNotification({
  items,
  notification,
  router,
  setError,
  syncState,
  unreadCount,
}: {
  items: MemberNotification[];
  notification: MemberNotification;
  router: HeaderRouter;
  setError: (message: string) => void;
  syncState: (items: MemberNotification[], unreadCount: number) => void;
  unreadCount: number;
}) {
  const existingNotification = items.find((item) => item.id === notification.id);
  const nextItems = sortNotifications([
    notification,
    ...items.filter((item) => item.id !== notification.id),
  ]).slice(0, 8);
  const nextCount =
    !existingNotification || existingNotification.readAt
      ? unreadCount + 1
      : unreadCount;

  syncState(nextItems, nextCount);
  setError("");
  router.refresh();
}

function isNotificationSeverity(value: unknown): value is NotificationSeverity {
  return (
    value === "critical" ||
    value === "info" ||
    value === "success" ||
    value === "warning"
  );
}

function mapNotificationRow(row: unknown): MemberNotification | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;

  if (!isValidNotificationRecord(record)) return null;

  return {
    actionUrl: typeof record.action_url === "string" ? record.action_url : null,
    body: record.body,
    createdAt: record.created_at,
    expiresAt: typeof record.expires_at === "string" ? record.expires_at : null,
    id: record.id,
    readAt: typeof record.read_at === "string" ? record.read_at : null,
    severity: record.severity,
    title: record.title,
    type: record.type,
  };
}

function isValidNotificationRecord(
  record: Record<string, unknown>,
): record is Record<string, unknown> & NotificationRealtimeRow {
  return (
    typeof record.body === "string" &&
    typeof record.created_at === "string" &&
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.type === "string" &&
    isNotificationSeverity(record.severity)
  );
}

function wasUnreadNotificationRow(row: unknown) {
  if (!row || typeof row !== "object") return false;
  return (row as Partial<NotificationRealtimeRow>).read_at === null;
}

function sortNotifications(items: MemberNotification[]) {
  return [...items].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() -
      new Date(first.createdAt).getTime(),
  );
}
