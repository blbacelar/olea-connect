"use server";

import { createHash } from "node:crypto";

import { z } from "zod";

import { requireMemberContext } from "@/lib/data/member-context";
import { getEmailRecipient, getEmailSender, getReplyTo, getResend } from "@/lib/email/server";
import { boardCalendarDateDeliveryKey, getBoardCalendarDateNotices } from "@/lib/template-renderer/board-calendar-date-notices";
import { getBoardCalendarContacts } from "@/lib/template-renderer/board-calendar-contacts";
import type { TemplateFormData } from "@/lib/template-renderer/types";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const inputSchema = z.object({ templateInstanceId: z.string().uuid() });

async function loadCalendar(templateInstanceId: string) {
  const { member, organization } = await requireMemberContext();
  const supabase = await createClient();
  const { data: instance, error } = await supabase.from("template_instances")
    .select("form_data,resources!inner(slug)")
    .eq("id", templateInstanceId).eq("organization_id", organization.id)
    .eq("resources.slug", "board-calendar-operational-workflow").single();
  if (error || !instance) throw new Error("This board calendar is unavailable.");
  const recipients = getBoardCalendarContacts(instance.form_data as TemplateFormData)
    .filter((contact) => contact.receivesEmails)
    .map((contact) => ({ id: contact.id, name: contact.name, email: contact.email }));
  return { member, organization, data: instance.form_data as TemplateFormData, recipients };
}

async function deliveredKeys(templateInstanceId: string, organizationId: string) {
  const { data, error } = await createAdminClient().from("audit_logs")
    .select("metadata")
    .eq("organization_id", organizationId)
    .eq("action", "board_calendar.date_notice_sent")
    .contains("metadata", { template_instance_id: templateInstanceId })
    .limit(5000);
  if (error) throw error;
  return new Set((data ?? []).map((row) => {
    const metadata = row.metadata as Record<string, unknown> | null;
    return typeof metadata?.delivery_key === "string" ? metadata.delivery_key : "";
  }).filter(Boolean));
}

export async function getBoardCalendarNotificationQueue(input: { templateInstanceId: string }) {
  const parsed = inputSchema.parse(input);
  const { member, organization, data, recipients } = await loadCalendar(parsed.templateInstanceId);
  if (member.membershipRole === "member") throw new Error("Only administrators can review date notifications.");
  const sent = await deliveredKeys(parsed.templateInstanceId, organization.id);
  const notices = getBoardCalendarDateNotices(data).map((notice) => ({
    ...notice,
    delivered: recipients.length > 0 && recipients.every((recipient) =>
      sent.has(boardCalendarDateDeliveryKey(parsed.templateInstanceId, notice, recipient.id))),
  }));
  return { notices, recipients };
}

export async function sendBoardCalendarDateNotifications(input: {
  templateInstanceId: string;
  mode: "review" | "auto";
}) {
  const parsed = inputSchema.extend({ mode: z.enum(["review", "auto"]) }).parse(input);
  const { member, organization, data, recipients } = await loadCalendar(parsed.templateInstanceId);
  if (member.membershipRole === "member") throw new Error("Only administrators can send date notifications.");
  if (!recipients.length) throw new Error("Add board contacts who opt in to date emails before sending.");
  const sent = await deliveredKeys(parsed.templateInstanceId, organization.id);
  const notices = getBoardCalendarDateNotices(data)
    .filter((notice) => notice.mode === parsed.mode)
    .filter((notice) => recipients.some((recipient) =>
      !sent.has(boardCalendarDateDeliveryKey(parsed.templateInstanceId, notice, recipient.id))));
  let delivered = 0;
  const failed: string[] = [];
  for (const recipient of recipients) {
    const pending = notices.filter((notice) =>
      !sent.has(boardCalendarDateDeliveryKey(parsed.templateInstanceId, notice, recipient.id)));
    if (!pending.length) continue;
    const lines = pending.map((notice) =>
      `${notice.title} — ${notice.date}${notice.time ? `, ${notice.time}` : ""}${notice.location ? `, ${notice.location}` : ""}`);
    const text = `Hello ${recipient.name},\n\nHere are your board meeting dates:\n\n${lines.join("\n")}\n\nDates and locations may change; check your Olea Connects board calendar for the latest details.\n\nBonjour ${recipient.name},\n\nVoici les dates des réunions du conseil :\n\n${lines.join("\n")}\n\nLes dates et lieux peuvent changer; consultez le calendrier du conseil dans Olea Connects pour les informations à jour.`;
    // Resend's idempotency key protects a retry before an audit row is stored.
    const batchKey = createHash("sha256")
      .update(JSON.stringify([parsed.templateInstanceId, recipient.id, pending.map((notice) => notice.revision)]))
      .digest("hex");
    const { error } = await getResend().emails.send({
      from: getEmailSender(), to: getEmailRecipient(recipient.email), replyTo: getReplyTo(),
      subject: `${organization.name}: board meeting dates / dates des réunions du conseil`, text,
    }, { idempotencyKey: batchKey });
    if (error) { failed.push(recipient.email); continue; }
    for (const notice of pending) {
      const deliveryKey = boardCalendarDateDeliveryKey(parsed.templateInstanceId, notice, recipient.id);
      const { error: auditError } = await createAdminClient().from("audit_logs").insert({
        action: "board_calendar.date_notice_sent", actor_user_id: member.id,
        organization_id: organization.id, entity_type: "board_calendar",
        entity_id: parsed.templateInstanceId, changes: null,
        metadata: {
          template_instance_id: parsed.templateInstanceId,
          meeting_id: notice.id, meeting_title: notice.title,
          recipient_user_id: recipient.id, recipient_email: recipient.email,
          delivery_key: deliveryKey, revision: notice.revision,
        },
      });
      if (auditError) throw auditError;
      sent.add(deliveryKey);
      delivered++;
    }
  }
  return { delivered, failed };
}
