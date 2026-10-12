"use server";

import { createHash } from "node:crypto";

import { z } from "zod";

import { requireMemberContext } from "@/lib/data/member-context";
import { getAppUrl, getEmailRecipient, getEmailSender, getReplyTo, getResend } from "@/lib/email/server";
import { buildBoardPackageMeetings } from "@/lib/template-renderer/board-calendar-packages";
import type { TemplateFormData } from "@/lib/template-renderer/types";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

import { assertTemplateInstanceAccess, writeBoardPackageAuditLog } from "./board-calendar-action-support";
import { getBoardPackageActionError } from "./board-package-action-utils";
import type { BoardPackageActionResult } from "./actions";

const sendPackageInputSchema = z.object({
  templateInstanceId: z.string().uuid(),
  meetingId: z.string().min(1).max(200),
  recipientIds: z.array(z.string().uuid()).min(1).max(100),
});

export async function sendBoardPackage(
  input: z.infer<typeof sendPackageInputSchema>,
): Promise<BoardPackageActionResult<{ sent: number; failed: number; failedRecipientIds: string[] }>> {
  try {
    const parsed = sendPackageInputSchema.parse(input);
    const { member, organization } = await requireMemberContext();
    if (member.membershipRole === "member") {
      throw new Error("Only an organization administrator can send board packages.");
    }
    const supabase = await createClient();
    const { data: instance, error: instanceError } = await supabase.from("template_instances")
      .select("form_data").eq("id", parsed.templateInstanceId)
      .eq("organization_id", organization.id).single();
    if (instanceError || !instance) throw new Error("This board calendar is not available to your workspace.");
    const meeting = buildBoardPackageMeetings(instance.form_data as TemplateFormData)
      .find((item) => item.id === parsed.meetingId);
    if (!meeting || !meeting.documents.length) throw new Error("Add documents before sending this package.");

    const { data: directory, error: directoryError } = await supabase.rpc("get_team_directory", {
      target_organization_id: organization.id,
    });
    if (directoryError) throw directoryError;
    const active = new Map<string, string>(
      (directory ?? []).filter((row: { status: string }) => row.status === "active")
        .map((row: { user_id: string; email: string }) => [row.user_id, row.email] as const),
    );
    const recipients = [...new Set(parsed.recipientIds)].map((id) => ({ id, email: active.get(id) }));
    if (recipients.some((recipient) => !recipient.email)) {
      throw new Error("Every recipient must be an active member of this workspace.");
    }

    const link = new URL("/modules/board-calendar", getAppUrl());
    link.searchParams.set("session", parsed.templateInstanceId);
    link.searchParams.set("tab", "packages");
    link.searchParams.set("meeting", meeting.id);
    const packageRevision = createHash("sha256")
      .update(JSON.stringify(meeting.documents.map((document) => [document.id, document.uploadedAt])))
      .digest("hex").slice(0, 24);
    let sent = 0;
    const failedRecipientIds: string[] = [];
    for (const recipient of recipients) {
      const deliveryKey = createHash("sha256")
        .update(JSON.stringify([parsed.templateInstanceId, meeting.id, recipient.id, packageRevision]))
        .digest("hex");
      const { error } = await getResend().emails.send({
        from: getEmailSender(),
        to: getEmailRecipient(recipient.email!),
        replyTo: getReplyTo(),
        subject: `${organization.name}: ${meeting.title} board package`,
        text: `${member.name} shared the ${meeting.title} board package with you. Sign in to your Olea Connects workspace to view it: ${link.toString()}\n\nDocuments may be confidential. Do not forward this link.`,
      }, { idempotencyKey: deliveryKey });
      if (error) {
        failedRecipientIds.push(recipient.id);
        continue;
      }
      sent++;
      await writeBoardPackageAuditLog({
        action: "package_sent",
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        memberId: member.id,
        organizationId: organization.id,
        templateInstanceId: parsed.templateInstanceId,
        recipientUserId: recipient.id,
        recipientEmail: recipient.email,
        deliveryKey,
      });
    }
    return { ok: true, data: { sent, failed: failedRecipientIds.length, failedRecipientIds } };
  } catch (error) {
    return { ok: false, error: getBoardPackageActionError(error) };
  }
}

export async function getBoardPackageAuditEvents(templateInstanceId: string) {
  const { organization } = await requireMemberContext();
  if (!z.string().uuid().safeParse(templateInstanceId).success) return [];
  await assertTemplateInstanceAccess(templateInstanceId, organization.id);
  const admin = createAdminClient();
  const { data: logs, error } = await admin.from("audit_logs")
    .select("id,action,actor_user_id,occurred_at,metadata")
    .eq("organization_id", organization.id)
    .contains("metadata", { template_instance_id: templateInstanceId })
    .order("occurred_at", { ascending: false }).limit(200);
  if (error) throw error;
  const ids = [...new Set((logs ?? []).map((log) => log.actor_user_id).filter(Boolean))];
  const { data: profiles, error: profileError } = ids.length
    ? await admin.from("profiles").select("id,full_name").in("id", ids)
    : { data: [], error: null };
  if (profileError) throw profileError;
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
  return (logs ?? []).map((log) => {
    const metadata = log.metadata && typeof log.metadata === "object" ? log.metadata as Record<string, unknown> : {};
    return {
      id: String(log.id),
      action: log.action as string,
      actor: names.get(log.actor_user_id) || "Former member",
      createdAt: log.occurred_at as string,
      documentName: typeof metadata.document_name === "string" ? metadata.document_name : "",
      meetingTitle: typeof metadata.meeting_title === "string" ? metadata.meeting_title : "",
      recipientEmail: typeof metadata.recipient_email === "string" ? metadata.recipient_email : "",
    };
  });
}
