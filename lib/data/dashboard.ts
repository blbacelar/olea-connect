import "server-only";

import { createClient } from "@/utils/supabase/server";

import { requireMemberContext } from "./member-context";

export async function getDashboardSummary() {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();
  const [
    { count: completedTemplates, error: templateError },
    { data: notifications, count: unreadNotifications, error: notificationError },
    { data: grantRound, error: grantError },
  ] = await Promise.all([
    supabase
      .from("template_instances")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .eq("status", "completed"),
    supabase
      .from("notifications")
      .select("id, title, body, action_url, created_at", { count: "exact" })
      .eq("user_id", member.id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("grant_rounds")
      .select("name, status, closes_at")
      .in("status", ["upcoming", "open"])
      .order("opens_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (templateError) throw templateError;
  if (notificationError) throw notificationError;
  if (grantError) throw grantError;

  return {
    completedTemplates: completedTemplates ?? 0,
    unreadNotifications: unreadNotifications ?? 0,
    notifications: notifications ?? [],
    grantRound,
  };
}
