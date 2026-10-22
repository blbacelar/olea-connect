import { generateBoardMeetingDocumentPdf } from "@/app/modules/board-calendar/board-meeting-document-actions";
import type { MeetingDocumentKind } from "@/lib/template-renderer/board-calendar-meeting-documents";

export async function fetchMeetingDocumentPdf({
  kind,
  meetingId,
  templateInstanceId,
}: {
  kind: MeetingDocumentKind;
  meetingId: string;
  templateInstanceId: string;
}) {
  const result = await generateBoardMeetingDocumentPdf({ kind, meetingId, templateInstanceId });
  if (!result.ok) throw new Error(result.error);
  const bytes = Uint8Array.from(atob(result.data.base64), (character) => character.charCodeAt(0));
  return { bytes, fileName: result.data.fileName };
}

export function downloadMeetingDocumentPdf(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(new Blob([bytes.slice().buffer], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
