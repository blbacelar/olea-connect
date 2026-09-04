"use client";

import { Bell } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/notifications/actions";
import { Button } from "@/components/ui/button";
import {
  type HeaderRouter,
  formatNotificationTime,
  getNotificationIcon,
  getUnreadLabel,
  handleRealtimePayload,
  notificationTone,
} from "@/components/header-notification-helpers";
import { subscribeToMemberNotifications } from "@/lib/notifications/realtime-client";
import type { Locale } from "@/lib/i18n/locales";
import type { MemberNotification } from "@/lib/types";

type NotificationCopy = {
  allCaughtUp: string;
  justNow: string;
  markAllNotificationError: string;
  markAllRead: string;
  marking: string;
  noUnreadNotifications: string;
  notificationError: string;
  notifications: string;
  notificationsWithCount: (count: number) => string;
};

export function HeaderNotifications({
  closeRequest,
  copy,
  initialItems,
  initialUnreadCount,
  locale,
  memberId,
  onUserMenuClose,
  router,
}: {
  closeRequest: number;
  copy: NotificationCopy;
  initialItems: MemberNotification[];
  initialUnreadCount: number;
  locale: Locale;
  memberId: string | undefined;
  onUserMenuClose: () => void;
  router: HeaderRouter;
}) {
  const notifications = useHeaderNotifications({
    closeRequest,
    copy,
    initialItems,
    initialUnreadCount,
    locale,
    memberId,
    router,
  });

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        className="relative rounded-lg"
        aria-label={
          notifications.hasUnread
            ? copy.notificationsWithCount(notifications.unreadCount)
            : copy.notifications
        }
        onClick={() => {
          notifications.toggleOpen();
          onUserMenuClose();
        }}
      >
        <Bell className="size-[18px]" />
        {notifications.hasUnread ? (
          <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-olea-orange px-1 text-center text-[10px] font-bold leading-[14px] text-white">
            {getUnreadLabel(notifications.unreadCount)}
          </span>
        ) : null}
      </Button>
      {notifications.open ? (
        <NotificationPopover copy={copy} locale={locale} notifications={notifications} />
      ) : null}
    </div>
  );
}

function useHeaderNotifications({
  closeRequest,
  copy,
  initialItems,
  initialUnreadCount,
  locale,
  memberId,
  router,
}: {
  closeRequest: number;
  copy: NotificationCopy;
  initialItems: MemberNotification[];
  initialUnreadCount: number;
  locale: Locale;
  memberId: string | undefined;
  router: HeaderRouter;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [items, setItems] = useState<MemberNotification[]>(() => initialItems);
  const [unreadCount, setUnreadCount] = useState(() => initialUnreadCount);
  const itemsRef = useRef(items);
  const unreadCountRef = useRef(unreadCount);
  const visibleItems = useMemo(
    () => items.filter((notification) => !notification.readAt),
    [items],
  );

  function syncState(nextItems: MemberNotification[], nextUnreadCount: number) {
    itemsRef.current = nextItems;
    unreadCountRef.current = nextUnreadCount;
    setItems(nextItems);
    setUnreadCount(nextUnreadCount);
  }

  useEffect(() => {
    syncState(initialItems, initialUnreadCount);
  }, [initialItems, initialUnreadCount]);

  useEffect(() => {
    setOpen(false);
  }, [closeRequest]);

  useEffect(() => {
    if (!memberId) return;
    return subscribeToMemberNotifications(memberId, (payload) => {
      handleRealtimePayload({
        payload,
        router,
        setError,
        syncState,
        unreadCount: unreadCountRef.current,
        items: itemsRef.current,
      });
    });
  }, [memberId, router]);

  function openNotification(notification: MemberNotification) {
    const destination = notification.actionUrl ?? "/dashboard";
    setError("");
    setOpen(false);
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== notification.id),
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    void markNotificationRead(notification.id).catch(() => {
      setItems((currentItems) => [notification, ...currentItems]);
      setUnreadCount((count) => count + 1);
      setError(copy.notificationError);
    });

    router.push(destination);
  }

  function markAllRead() {
    if (!visibleItems.length) return;

    setError("");
    setItems([]);
    setUnreadCount(0);
    setIsPending(true);
    void markAllNotificationsRead()
      .then(() => router.refresh())
      .catch(() => {
        setItems(visibleItems);
        setUnreadCount(unreadCount);
        setError(copy.markAllNotificationError);
      })
      .finally(() => setIsPending(false));
  }

  return {
    error,
    hasUnread: unreadCount > 0,
    isPending,
    locale,
    markAllRead,
    open,
    openNotification,
    toggleOpen: () => setOpen((currentOpen) => !currentOpen),
    unreadCount,
    visibleItems,
  };
}

function NotificationPopover({
  copy,
  locale,
  notifications,
}: {
  copy: NotificationCopy;
  locale: Locale;
  notifications: ReturnType<typeof useHeaderNotifications>;
}) {
  return (
    <div className="absolute right-0 top-12 w-[calc(100vw-2rem)] max-w-[340px] overflow-hidden rounded-xl border bg-white shadow-elevated">
      <div className="flex items-center justify-between border-b px-4 py-3.5">
        <span className="font-semibold">{copy.notifications}</span>
        <button
          className="text-xs font-semibold text-olea-green disabled:cursor-not-allowed disabled:text-slate-300"
          disabled={!notifications.hasUnread || notifications.isPending}
          onClick={notifications.markAllRead}
        >
          {notifications.isPending ? copy.marking : copy.markAllRead}
        </button>
      </div>
      <NotificationError message={notifications.error} />
      {notifications.visibleItems.length > 0 ? (
        notifications.visibleItems.map((notification) => (
          <NotificationButton
            key={notification.id}
            copy={copy}
            locale={locale}
            notification={notification}
            onOpen={notifications.openNotification}
          />
        ))
      ) : (
        <NotificationEmptyState copy={copy} />
      )}
    </div>
  );
}

function NotificationButton({
  copy,
  locale,
  notification,
  onOpen,
}: {
  copy: NotificationCopy;
  locale: Locale;
  notification: MemberNotification;
  onOpen: (notification: MemberNotification) => void;
}) {
  const Icon = getNotificationIcon(notification.severity);

  return (
    <button
      type="button"
      className="flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50"
      onClick={() => onOpen(notification)}
    >
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-lg ${
          notificationTone[notification.severity]
        }`}
      >
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-[13px] font-semibold">{notification.title}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          {notification.body}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          {formatNotificationTime(notification.createdAt, locale, copy.justNow)}
        </p>
      </div>
    </button>
  );
}

function NotificationError({ message }: { message: string }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="border-b bg-red-50 px-4 py-2 text-xs font-medium text-red-700"
    >
      {message}
    </p>
  );
}

function NotificationEmptyState({ copy }: { copy: NotificationCopy }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-sm font-semibold text-slate-700">
        {copy.noUnreadNotifications}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{copy.allCaughtUp}</p>
    </div>
  );
}
