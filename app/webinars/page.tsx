import { CalendarDays, Play, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyPanel } from "@/components/EmptyPanel";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";
import { getWebinarCatalog } from "@/lib/data/webinars";
import {
  ArchiveWebinarAction,
  EventAction,
  RecordingAction,
  canArchiveWebinar,
  formatEventDate,
  formatEventType,
  formatTicketLabel,
  isUpcomingOrActiveEvent,
} from "./webinar-ui";

export default async function WebinarsPage() {
  const { canManageEvents, webinars } = await getWebinarCatalog();
  const now = Date.now();
  const upcoming = webinars.filter((webinar) =>
    isUpcomingOrActiveEvent(webinar, now),
  );
  const recordings = webinars.filter(
    (webinar) => webinar.status === "completed" && webinar.recordingAvailable,
  );
  const locked = webinars.filter((webinar) => !webinar.available);
  const archiveCandidates = canManageEvents
    ? webinars.filter((webinar) => canArchiveWebinar(webinar, now))
    : [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Webinars"
          description="Live sessions and recordings on governance, fundraising, and nonprofit leadership."
        />
        {canManageEvents ? (
          <Button asChild>
            <Link href="/webinars/new">
              <Plus className="size-4" />
              Create webinar
            </Link>
          </Button>
        ) : null}
      </div>

      <SectionHeading>Upcoming</SectionHeading>
      {upcoming.length ? (
        <div className="mb-7 space-y-4">
          {upcoming.map((webinar) => (
            <section
              key={webinar.id}
              data-testid="webinar-card"
              className="flex flex-wrap items-center gap-[22px] rounded-[14px] border bg-white p-6 shadow-soft"
            >
              <span className="grid size-16 shrink-0 place-items-center rounded-[14px] bg-olea-light text-olea-green">
                <CalendarDays className="size-7" />
              </span>
              <div className="min-w-[220px] flex-1">
                <h2 className="text-lg font-semibold">{webinar.title}</h2>
                <p className="mt-1.5 text-[13.5px] text-slate-500">
                  {formatEventType(webinar.type)} · {formatEventDate(webinar.startsAt)} ·{" "}
                  {webinar.timezone}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {webinar.summary}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-olea-green">
                  {formatTicketLabel(webinar)}
                </p>
              </div>
              <EventAction webinar={webinar} />
              <Button asChild variant="outline">
                <Link href={`/webinars/${webinar.slug}`}>View details</Link>
              </Button>
            </section>
          ))}
        </div>
      ) : (
        <div className="mb-7">
          <EmptyPanel
            title="No upcoming webinars"
            description="New live learning sessions will appear here when scheduled."
            icon={<CalendarDays className="size-5" />}
          />
        </div>
      )}

      <SectionHeading>Past recordings available to your tier</SectionHeading>
      {recordings.length ? (
        <div className="mb-6 overflow-hidden rounded-xl border bg-white shadow-soft">
          {recordings.map((webinar) => (
            <div
              key={webinar.id}
              data-testid="webinar-card"
              className="flex items-center justify-between gap-4 border-b border-slate-100 px-[22px] py-4 last:border-0"
            >
              <div>
                <h3 className="text-[15px] font-semibold">{webinar.title}</h3>
                <p className="mt-0.5 text-[13px] text-slate-400">
                  {formatEventType(webinar.type)} · {formatEventDate(webinar.startsAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <RecordingAction webinar={webinar} />
                <Button asChild size="sm" variant="outline">
                  <Link href={`/webinars/${webinar.slug}`}>View details</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyPanel
          title="No recordings available"
          description="Recordings included with your plan will appear here."
          icon={<Play className="size-5" />}
        />
      )}

      {locked.length ? (
        <p className="mt-5 text-sm text-slate-500">
          {locked.length} additional event{locked.length === 1 ? " is" : "s are"}{" "}
          available on higher membership tiers.
        </p>
      ) : null}

      {canManageEvents ? (
        <>
          <SectionHeading>Admin archive queue</SectionHeading>
          {archiveCandidates.length ? (
            <div className="overflow-hidden rounded-xl border bg-white shadow-soft">
              {archiveCandidates.map((webinar) => (
                <div
                  key={webinar.id}
                  data-testid="webinar-archive-row"
                  className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-[22px] py-4 last:border-0"
                >
                  <div>
                    <h3 className="text-[15px] font-semibold">{webinar.title}</h3>
                    <p className="mt-0.5 text-[13px] text-slate-400">
                      {formatEventType(webinar.type)} · Ended{" "}
                      {formatEventDate(webinar.endsAt)} · {webinar.status}
                    </p>
                  </div>
                  <ArchiveWebinarAction webinar={webinar} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel
              title="No old webinars to archive"
              description="Past webinars that are still visible will appear here for admins."
              icon={<CalendarDays className="size-5" />}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
