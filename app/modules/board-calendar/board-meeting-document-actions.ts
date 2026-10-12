"use server";

import { z } from "zod";

import { requireMemberContext } from "@/lib/data/member-context";
import { buildMeetingDocumentHtml } from "@/lib/template-renderer/board-calendar-meeting-document-html";
import { getMeetingDocuments } from "@/lib/template-renderer/board-calendar-meeting-documents";
import { renderHtmlToPdfBuffer } from "@/lib/template-renderer/html-pdf-export";
import type { TemplateFormData } from "@/lib/template-renderer/types";
import { createClient } from "@/utils/supabase/server";

import { writeBoardPackageAuditLog } from "./board-calendar-action-support";
import { getBoardPackageActionError } from "./board-package-action-utils";
import type { BoardPackageActionResult } from "./actions";

const meetingPdfInputSchema = z.object({
  templateInstanceId: z.string().uuid(),
  meetingId: z.string().min(1).max(200),
  kind: z.enum(["consent_agenda", "board_minutes"]),
});

export async function generateBoardMeetingDocumentPdf(
  input: z.infer<typeof meetingPdfInputSchema>,
): Promise<BoardPackageActionResult<{ base64: string; fileName: string }>> {
  try {
    const parsed = meetingPdfInputSchema.parse(input);
    const { member, organization } = await requireMemberContext();
    const supabase = await createClient();
    const { data: instance, error } = await supabase.from("template_instances")
      .select("form_data").eq("id", parsed.templateInstanceId)
      .eq("organization_id", organization.id).single();
    if (error || !instance) throw new Error("This board calendar is not available to your workspace.");

    const formData = instance.form_data as TemplateFormData;
    const document = getMeetingDocuments(formData).find((item) =>
      item.meetingId === parsed.meetingId && item.kind === parsed.kind,
    );
    const rows = Array.isArray(formData.meetings) ? formData.meetings : [];
    const meeting = rows.find((row, index) =>
      row && typeof row === "object" &&
      ("id" in row && typeof row.id === "string" ? row.id : `meeting-${index}`) === parsed.meetingId,
    );
    if (!document || !meeting || typeof meeting !== "object") {
      throw new Error("This meeting document is not available.");
    }

    const { data: members, error: membersError } = await supabase.rpc("get_team_directory", {
      target_organization_id: organization.id,
    });
    if (membersError) throw membersError;
    const memberNames = new Map<string, string>(
      (members ?? []).map((row: { user_id: string; full_name: string; email: string }) =>
        [row.user_id, row.full_name || row.email]),
    );
    const title = String(
      ("committee" in meeting && meeting.committee) ||
      ("title" in meeting && meeting.title) ||
      ("type" in meeting && meeting.type) ||
      "Meeting",
    );
    const html = buildMeetingDocumentHtml({
      document,
      meeting: {
        title,
        date: String("date" in meeting ? meeting.date || "" : ""),
        time: String("time" in meeting ? meeting.time || "" : ""),
        location: String("location" in meeting ? meeting.location || "" : ""),
      },
      memberNames,
      organizationName: organization.name,
    });
    const pdf = await renderHtmlToPdfBuffer(html);
    await writeBoardPackageAuditLog({
      action: "document_downloaded",
      documentId: `${parsed.meetingId}:${parsed.kind}`,
      documentName: parsed.kind === "consent_agenda" ? "Consent agenda" : "Board minutes",
      meetingId: parsed.meetingId,
      meetingTitle: title,
      memberId: member.id,
      organizationId: organization.id,
      templateInstanceId: parsed.templateInstanceId,
    });
    return {
      ok: true,
      data: {
        base64: pdf.toString("base64"),
        fileName: `${parsed.kind.replace(/_/g, "-")}.pdf`,
      },
    };
  } catch (error) {
    return { ok: false, error: getBoardPackageActionError(error) };
  }
}
