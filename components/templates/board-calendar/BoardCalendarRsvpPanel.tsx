"use client";

import { useEffect, useState } from "react";
import { Check, CircleHelp, X } from "lucide-react";

import { getBoardCalendarRsvps, saveBoardCalendarRsvp } from "@/app/modules/board-calendar/board-rsvp-actions";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TemplateFormData } from "@/lib/template-renderer/types";

type Rsvps = Awaited<ReturnType<typeof getBoardCalendarRsvps>>;
type Response = "attending" | "not_attending" | "maybe";

export function BoardCalendarRsvpPanel({
  data, templateInstanceId, saveState,
}: {
  data: TemplateFormData;
  templateInstanceId?: string;
  saveState: "saved" | "saving" | "unsaved" | "error";
}) {
  const french = useLocaleContext().locale === "fr-CA";
  const [meetings, setMeetings] = useState<Rsvps>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const meetingsKey = JSON.stringify(data.meetings ?? []);

  useEffect(() => {
    if (!templateInstanceId || saveState !== "saved") return;
    let cancelled = false;
    void getBoardCalendarRsvps(templateInstanceId).then((rows) => {
      if (!cancelled) setMeetings(rows);
    }).catch((cause) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load RSVPs.");
    });
    return () => { cancelled = true; };
  }, [templateInstanceId, saveState, meetingsKey]);

  const upcoming = meetings.filter((meeting) => meeting.date >= new Date().toISOString().slice(0, 10))
    .sort((left, right) => left.date.localeCompare(right.date));
  const visible = showAll ? upcoming : upcoming.slice(0, 3);
  if (!templateInstanceId || (!upcoming.length && !error)) return null;

  async function respond(meetingId: string, response: Response) {
    if (!templateInstanceId) return;
    setBusy(meetingId); setError("");
    try {
      setMeetings(await saveBoardCalendarRsvp({ templateInstanceId, meetingId, response }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save RSVP.");
    } finally { setBusy(""); }
  }

  return <section className="space-y-3 rounded-xl border bg-white p-4 shadow-sm" aria-label={french ? "Confirmations de présence" : "Meeting RSVPs"}>
    <div><h3 className="font-semibold text-slate-950">{french ? "Votre présence aux prochaines réunions" : "Your upcoming meeting RSVPs"}</h3>
      <p className="text-sm text-slate-600">{french ? "Choisissez une réponse pour chaque réunion. Vous pouvez la modifier plus tard." : "Choose a response for each meeting. You can change it later."}</p></div>
    {visible.map((meeting) => <div key={meeting.meetingId} className="space-y-3 rounded-lg border p-3 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:space-y-0">
      <div><strong className="text-sm">{meeting.title}</strong><p className="text-sm text-slate-600">{meeting.date}{meeting.time ? ` · ${meeting.time}` : ""}</p>
        <div className="mt-1 flex flex-wrap gap-1"><Badge variant="outline">{meeting.attending} {french ? "présents" : "attending"}</Badge><Badge variant="outline">{meeting.maybe} {french ? "peut-être" : "maybe"}</Badge></div></div>
      <div className="flex flex-wrap gap-1" role="group" aria-label={french ? `Réponse pour ${meeting.title}` : `RSVP for ${meeting.title}`}>
        <Button type="button" size="sm" variant={meeting.mine === "attending" ? "default" : "outline"} aria-pressed={meeting.mine === "attending"} disabled={busy === meeting.meetingId} onClick={() => void respond(meeting.meetingId, "attending")}><Check className="size-4" />{french ? "Présent" : "Attending"}</Button>
        <Button type="button" size="sm" variant={meeting.mine === "maybe" ? "default" : "outline"} aria-pressed={meeting.mine === "maybe"} disabled={busy === meeting.meetingId} onClick={() => void respond(meeting.meetingId, "maybe")}><CircleHelp className="size-4" />{french ? "Peut-être" : "Maybe"}</Button>
        <Button type="button" size="sm" variant={meeting.mine === "not_attending" ? "default" : "outline"} aria-pressed={meeting.mine === "not_attending"} disabled={busy === meeting.meetingId} onClick={() => void respond(meeting.meetingId, "not_attending")}><X className="size-4" />{french ? "Absent" : "Not attending"}</Button>
      </div>
    </div>)}
    {upcoming.length > 3 ? <Button type="button" variant="outline" size="sm" onClick={() => setShowAll((current) => !current)}>{showAll ? (french ? "Afficher les prochaines seulement" : "Show next three") : (french ? `Afficher les ${upcoming.length} réunions` : `Show all ${upcoming.length} meetings`)}</Button> : null}
    {error ? <p role="alert" className="text-sm text-red-800">{error}</p> : null}
  </section>;
}
