"use client";

import { createClient } from "@/utils/supabase/client";

export type NotificationRealtimePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: unknown;
  old: unknown;
};

export function subscribeToMemberNotifications(
  userId: string,
  onPayload: (payload: NotificationRealtimePayload) => void,
) {
  const supabase = createClient();
  const channel = supabase
    .channel(`member-notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onPayload(payload as NotificationRealtimePayload);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
