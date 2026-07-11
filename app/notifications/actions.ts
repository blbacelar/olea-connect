"use server";

import { revalidatePath } from "next/cache";

import { requireMemberContext } from "@/lib/data/member-context";
import { createAdminClient } from "@/utils/supabase/admin";

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
