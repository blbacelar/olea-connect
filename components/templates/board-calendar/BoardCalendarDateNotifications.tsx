"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, Send } from "lucide-react";

import {
  getBoardCalendarNotificationQueue,
  sendBoardCalendarDateNotifications,
} from "@/app/modules/board-calendar/board-date-notification-actions";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TemplateFormData } from "@/lib/template-renderer/types";

type Queue = Awaited<ReturnType<typeof getBoardCalendarNotificationQueue>>;

export function BoardCalendarDateNotifications({
  data, templateInstanceId, canSend, saveState,
}: {
  data: TemplateFormData;
  templateInstanceId?: string;
  canSend: boolean;
  saveState: "saved" | "saving" | "unsaved" | "error";
}) {
  const french = useLocaleContext().locale === "fr-CA";
  const [queue, setQueue] = useState<Queue | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const processedAutoKey = useRef("");
  const meetingsKey = JSON.stringify(data.meetings ?? []);

  useEffect(() => {
    if (!templateInstanceId || !canSend || saveState !== "saved") return;
    let cancelled = false;
    void getBoardCalendarNotificationQueue({ templateInstanceId }).then(async (next) => {
      if (cancelled) return;
      setQueue(next);
      const pendingAuto = next.notices.filter((notice) => notice.mode === "auto" && !notice.delivered);
      if (!pendingAuto.length || !next.recipients.length) return;
      const key = JSON.stringify(pendingAuto.map((notice) => [notice.id, notice.revision]));
      if (processedAutoKey.current === key) return;
      processedAutoKey.current = key;
      try {
        const result = await sendBoardCalendarDateNotifications({ templateInstanceId, mode: "auto" });
        if (cancelled) return;
        const refreshed = await getBoardCalendarNotificationQueue({ templateInstanceId });
        if (cancelled) return;
        setQueue(refreshed);
        if (result.failed.length) setError(french
          ? `L’envoi automatique a échoué pour ${result.failed.length} destinataire(s). Réessayez après vérification.`
          : `Automatic delivery failed for ${result.failed.length} recipient(s). Please retry after checking the configuration.`);
        else if (result.delivered) setMessage(french ? "Dates envoyées aux contacts inscrits." : "Dates sent to opted-in contacts.");
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Date email delivery failed.");
      }
    }).catch((cause) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load date emails.");
    });
    return () => { cancelled = true; };
  }, [templateInstanceId, canSend, saveState, meetingsKey, french]);

  if (!canSend) return null;
  const pending = queue?.notices.filter((notice) => notice.mode === "review" && !notice.delivered) ?? [];

  async function sendReviewed() {
    if (!templateInstanceId || busy || !pending.length) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await sendBoardCalendarDateNotifications({ templateInstanceId, mode: "review" });
      setQueue(await getBoardCalendarNotificationQueue({ templateInstanceId }));
      if (result.failed.length) setError(french
        ? `Échec pour ${result.failed.length} destinataire(s). Les autres envois sont enregistrés; réessayez.`
        : `Delivery failed for ${result.failed.length} recipient(s). Other deliveries were recorded; please retry.`);
      else { setMessage(french ? "Dates envoyées et enregistrées." : "Dates sent and recorded."); setOpen(false); }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Date email delivery failed.");
    } finally { setBusy(false); }
  }

  return <section className="rounded-xl border bg-white p-4 shadow-sm" aria-label={french ? "Avis des réunions" : "Meeting date notices"}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><Mail className="size-5 text-olea-green" aria-hidden="true" />
        <div><h3 className="font-semibold text-slate-950">{french ? "Avis des dates de réunion" : "Meeting date emails"}</h3>
          <p className="text-sm text-slate-600">{french ? "Seuls les dates, heures et lieux sont envoyés aux contacts du conseil inscrits aux avis." : "Only dates, times, and locations go to board contacts opted in to emails."}</p>
        </div></div>
      <div className="flex items-center gap-2"><Badge variant="outline">{pending.length} {french ? "à examiner" : "to review"}</Badge>
        <Button type="button" size="sm" variant="outline" disabled={!pending.length || saveState !== "saved"} onClick={() => setOpen(true)}>
          {french ? "Examiner et envoyer" : "Review and send"}</Button></div>
    </div>
    {!templateInstanceId ? <p className="mt-3 text-sm text-slate-600">{french ? "Enregistrez le calendrier pour préparer les avis." : "Save the calendar to prepare date emails."}</p> : null}
    {queue && !queue.recipients.length && queue.notices.length ? <p className="mt-3 text-sm text-amber-800" role="status">{french ? "Ajoutez des contacts du conseil qui acceptent les avis par courriel." : "Add board contacts who opt in to date emails."}</p> : null}
    {message ? <p className="mt-3 text-sm text-green-800" role="status">{message}</p> : null}
    {error ? <p className="mt-3 text-sm text-red-800" role="alert">{error}</p> : null}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-xl"><DialogHeader>
      <DialogTitle>{french ? "Examiner les avis" : "Review date emails"}</DialogTitle>
      <DialogDescription>{french ? "Vérifiez les dates et les destinataires avant l’envoi." : "Check the dates and recipients before sending."}</DialogDescription>
    </DialogHeader>
      <div className="max-h-80 space-y-2 overflow-y-auto text-sm">{pending.map((notice) => <div key={notice.id} className="rounded-lg border p-3">
        <strong>{notice.title}</strong><p>{notice.date}{notice.time ? ` · ${notice.time}` : ""}{notice.location ? ` · ${notice.location}` : ""}</p>
      </div>)}</div>
      <p className="text-sm text-slate-600">{queue?.recipients.length ?? 0} {french
        ? queue?.recipients.length === 1 ? "contact du conseil recevra les dates." : "contacts du conseil recevront les dates."
        : queue?.recipients.length === 1 ? "board contact will receive the dates." : "board contacts will receive the dates."}</p>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{french ? "Annuler" : "Cancel"}</Button>
        <Button type="button" disabled={busy || !queue?.recipients.length} onClick={() => void sendReviewed()}><Send className="size-4" />{busy ? (french ? "Envoi..." : "Sending...") : (french ? "Envoyer les dates" : "Send dates")}</Button></div>
    </DialogContent></Dialog>
  </section>;
}
