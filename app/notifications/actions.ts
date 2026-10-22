"use server";

import { revalidatePath } from "next/cache";

import { requireMemberContext } from "@/lib/data/member-context";
import type { MemberNotification } from "@/lib/types";
import { createAdminClient } from "@/utils/supabase/admin";

export async function getUnreadNotifications(): Promise<{
  items: MemberNotification[];
  unreadCount: number;
}> {
  const { member } = await requireMemberContext();
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, count, error } = await supabase
    .from("notifications")
    .select(
      "id, type, severity, title, body, action_url, read_at, expires_at, created_at",
      { count: "exact" },
    )
    .eq("user_id", member.id)
    .is("read_at", null)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) throw error;

  return {
    items: (data ?? []).map((notification) => ({
      id: notification.id,
      type: notification.type,
      severity: notification.severity,
      title: notification.title,
      body: notification.body,
      actionUrl: notification.action_url,
      readAt: notification.read_at,
      expiresAt: notification.expires_at,
      createdAt: notification.created_at,
    })),
    unreadCount: count ?? 0,
  };
}

export async function markNotificationRead(notificationId: string) {
  const { member } = await requireMemberContext();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", member.id)
    .is("read_at", null)
    .select("id");

  if (error) throw error;
  revalidatePath("/", "layout");

  return (data?.length ?? 0) > 0;
}

export async function markAllNotificationsRead() {
  const { member } = await requireMemberContext();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", member.id)
    .is("read_at", null)
    .select("id");

  if (error) throw error;
  revalidatePath("/", "layout");

  return data?.length ?? 0;
}
