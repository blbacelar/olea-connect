"use server";

import { revalidatePath } from "next/cache";

import { requireMemberContext } from "@/lib/data/member-context";
import { createClient } from "@/utils/supabase/server";

export async function markNotificationRead(notificationId: string) {
  await requireMemberContext();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notification_read", {
    target_notification_id: notificationId,
  });

  if (error) throw error;
  revalidatePath("/");
}

export async function markAllNotificationsRead() {
  await requireMemberContext();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_all_notifications_read");

  if (error) throw error;
  revalidatePath("/");
}
