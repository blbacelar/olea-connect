import { CalendarDays, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CalendarViewEvent } from "@/lib/template-renderer/calendar-view";

export function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-olea-light p-2 text-olea-dark">
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export function MeetingsTablePanel({
  meetings,
  upcomingMeetingCount,
  onEditEvent,
}: {
  meetings: CalendarViewEvent[];
  upcomingMeetingCount: number;
  onEditEvent: (event: CalendarViewEvent) => void;
}) {
  return (
    <section
      className="rounded-xl border bg-white p-5 shadow-sm"
      aria-labelledby="board-calendar-meetings-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="board-calendar-meetings-heading"
            className="text-xl font-semibold text-slate-950"
          >
            Meetings
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Only entries created as Meeting or Event appear here.
          </p>
        </div>
        {upcomingMeetingCount ? (
          <Badge variant="outline">{upcomingMeetingCount} upcoming</Badge>
        ) : null}
      </div>

      {meetings.length ? (
        <div className="mt-5 overflow-hidden rounded-xl border">
          <div className="hidden grid-cols-[1.2fr_0.9fr_0.8fr_1fr_1fr_auto] gap-3 border-b bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 lg:grid">
            <span>Meeting</span>
            <span>Date</span>
            <span>Time</span>
            <span>Location</span>
            <span>Lead contact</span>
            <span className="text-right">Action</span>
          </div>
          <div className="divide-y">
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[1.2fr_0.9fr_0.8fr_1fr_1fr_auto] lg:items-center"
              >
                <div>
                  <p className="font-semibold text-slate-950">{meeting.title}</p>
                  <p className="text-xs text-slate-500">{meeting.category}</p>
                </div>
                <MeetingTableField label="Date" value={meeting.dateKey ?? "No date"} />
                <MeetingTableField label="Time" value={meeting.time || "No time"} />
                <MeetingTableField
                  label="Location"
                  value={meeting.location || "No location"}
                />
                <MeetingTableField
                  label="Lead contact"
                  value={meeting.leadContact || "No lead contact"}
                />
                <div className="lg:text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Edit meeting ${meeting.title}`}
                    onClick={() => onEditEvent(meeting)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-5 rounded-lg border border-dashed p-4 text-sm text-slate-500">
          No meetings yet. Use Add meeting to create the first meeting or event.
        </p>
      )}
    </section>
  );
}

function MeetingTableField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 lg:hidden">
        {label}
      </p>
      <p className="text-slate-700">{value}</p>
    </div>
  );
}
