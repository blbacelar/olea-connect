import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

export async function getFoundingAvailability() {
  const { count, error } = await createAdminClient()
    .from("founding_member_claims")
    .select("claim_number", { count: "exact", head: true })
    .eq("status", "paid");
  if (error) throw error;
  const left = Math.max(0, 50 - (count ?? 0));
  return { left, showCount: left <= 40, foundingAvailable: left > 0 };
}
