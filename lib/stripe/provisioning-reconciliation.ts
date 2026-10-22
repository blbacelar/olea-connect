import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { recoverCheckoutSessionProvisioning } from "@/lib/stripe/provisioning";

export interface ProvisioningReconciliationSummary {
  checked: number;
  completed: number;
  pending: number;
  failed: number;
  errors: Array<{
    requestId: string;
    message: string;
  }>;
}

function emptySummary(checked: number): ProvisioningReconciliationSummary {
  return {
    checked,
    completed: 0,
    pending: 0,
    failed: 0,
    errors: [],
  };
}

function recordReconciliationResult(
  summary: ProvisioningReconciliationSummary,
  requestId: string,
  result: Awaited<ReturnType<typeof recoverCheckoutSessionProvisioning>>,
) {
  if (result.status === "completed") {
    summary.completed += 1;
    return;
  }

  if (
    result.status === "pending_payment" ||
    result.status === "pending_verification"
  ) {
    summary.pending += 1;
    return;
  }

  summary.failed += 1;
  summary.errors.push({
    requestId,
    message: result.error ?? `Provisioning ended as ${result.status}.`,
  });
}

async function recordReconciliationError(
  supabase: SupabaseClient,
  summary: ProvisioningReconciliationSummary,
  requestId: string,
  error: unknown,
) {
  const message =
    error instanceof Error ? error.message : "Unknown reconciliation error";
  summary.failed += 1;
  summary.errors.push({ requestId, message });
  await supabase
    .from("workspace_provisioning_requests")
    .update({ last_error: message })
    .eq("id", requestId);
}

export async function reconcilePendingCheckoutProvisioning(
  supabase: SupabaseClient,
  {
    limit = 10,
    staleAfterMinutes = 2,
  }: { limit?: number; staleAfterMinutes?: number } = {},
): Promise<ProvisioningReconciliationSummary> {
  const staleBefore = new Date(
    Date.now() - staleAfterMinutes * 60 * 1000,
  ).toISOString();
  const { data: requests, error } = await supabase
    .from("workspace_provisioning_requests")
    .select("id, checkout_session_id")
    .eq("status", "pending_payment")
    .not("checkout_session_id", "is", null)
    .lte("updated_at", staleBefore)
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const summary = emptySummary(requests?.length ?? 0);

  for (const request of requests ?? []) {
    if (!request.checkout_session_id) continue;

    try {
      const result = await recoverCheckoutSessionProvisioning(
        supabase,
        request.checkout_session_id,
      );
      recordReconciliationResult(summary, request.id, result);
    } catch (error) {
      await recordReconciliationError(supabase, summary, request.id, error);
    }
  }

  return summary;
}
