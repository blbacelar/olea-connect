import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

import type { BoardPackageAuditPayload } from "./actions";

export async function assertTemplateInstanceAccess(
  templateInstanceId: string,
  organizationId: string,
) {
  const { error } = await createAdminClient()
    .from("template_instances")
    .select("id,resources!inner(slug)")
    .eq("id", templateInstanceId)
    .eq("organization_id", organizationId)
    .eq("resources.slug", "board-calendar-operational-workflow")
    .single();

  if (error) throw new Error("This board calendar is not available to your workspace.");
}

export async function writeBoardPackageAuditLog({
  action,
  documentId,
  documentName,
  meetingId,
  meetingTitle,
  memberId,
  organizationId,
  templateInstanceId,
  recipientUserId,
  recipientEmail,
  deliveryKey,
}: BoardPackageAuditPayload & { memberId: string; organizationId: string }) {
  const entityType = ["package_downloaded", "package_opened", "package_sent"].includes(action)
    ? "board_package"
    : "board_package_document";
  const { error } = await createAdminClient().from("audit_logs").insert({
    action: `board_package.${action}`,
    actor_user_id: memberId,
    changes: null,
    entity_id: documentId || meetingId || templateInstanceId,
    entity_type: entityType,
    metadata: {
      document_id: documentId ?? null,
      document_name: documentName ?? null,
      meeting_id: meetingId ?? null,
      meeting_title: meetingTitle ?? null,
      template_instance_id: templateInstanceId,
      recipient_user_id: recipientUserId ?? null,
      recipient_email: recipientEmail ?? null,
      delivery_key: deliveryKey ?? null,
    },
    organization_id: organizationId,
  });
  if (error) throw error;
}
