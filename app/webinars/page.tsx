import { CalendarDays, Lock, Play, Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyPanel } from "@/components/EmptyPanel";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";
import { getWebinars } from "@/lib/data/webinars";
import type { Webinar } from "@/lib/types";

import {
  cancelEventRegistration,
  registerForEvent,
} from "./actions";

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatEventType(type: Webinar["type"]) {
  return type
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPlanList(planIds: Webinar["allowedPlanIds"]) {
  return planIds.map((plan) => plan[0].toUpperCase() + plan.slice(1)).join(", ");
}

function formatTicketLabel(webinar: Webinar) {
  if (webinar.included) return "Included with your plan";
  if (webinar.complimentaryTicketLimit) {
    const remaining = Math.max(
      webinar.complimentaryTicketLimit - webinar.complimentaryTicketsUsed,
      0,
    );

    return `${remaining} of ${webinar.complimentaryTicketLimit} complimentary ticket${
      webinar.complimentaryTicketLimit === 1 ? "" : "s"
    } remaining`;
  }
  if (webinar.ticketPriceCents !== null) {
    return `${webinar.currency} ${(webinar.ticketPriceCents / 100).toFixed(2)}`;
  }
  return "Included";
}

function EventAction({ webinar }: { webinar: Webinar }) {
  const canJoin =
    webinar.registered &&
    Boolean(webinar.joinUrl) &&
    (webinar.status === "scheduled" ||
      webinar.status === "live" ||
      webinar.status === "rescheduled");

  if (!webinar.available) {
    return (
      <div className="text-right">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Lock className="size-4" />
          Upgrade required
        </span>
        <p className="mt-1 text-xs text-slate-400">
          Available for {formatPlanList(webinar.allowedPlanIds)}
        </p>
      </div>
    );
  }

  if (webinar.ticketPriceCents !== null && !webinar.included) {
    return (
      <div className="text-right">
        <Button disabled>Paid ticket coming soon</Button>
        <p className="mt-1 text-xs text-slate-400">{formatTicketLabel(webinar)}</p>
      </div>
    );
  }

  if (webinar.registered) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canJoin ? (
          <Button asChild>
            <a href={webinar.joinUrl!} target="_blank" rel="noreferrer">
              <Video className="size-4" />
              Join Zoom
            </a>
          </Button>
        ) : (
          <Badge variant="outline">Registered</Badge>
        )}
        <form action={cancelEventRegistration}>
          <input type="hidden" name="eventId" value={webinar.id} />
          <Button type="submit" variant="outline">
            Cancel
          </Button>
        </form>
      </div>
    );
  }

  if (
    !webinar.included &&
    webinar.complimentaryTicketLimit !== null &&
    webinar.complimentaryTicketsUsed >= webinar.complimentaryTicketLimit
  ) {
    return (
      <div className="text-right">
        <Button disabled>Complimentary limit reached</Button>
      </div>
    );
  }

  return (
    <form action={registerForEvent}>
      <input type="hidden" name="eventId" value={webinar.id} />
      <Button type="submit">Register →</Button>
    </form>
  );
}

export default async function WebinarsPage() {
  const webinars = await getWebinars();
  const now = Date.now();
  const upcoming = webinars.filter(
    (webinar) =>
      ["scheduled", "live", "rescheduled"].includes(webinar.status) &&
      new Date(webinar.startsAt).getTime() >= now,
  );
  const recordings = webinars.filter(
    (webinar) => webinar.status === "completed" && webinar.recordingAvailable,
  );
  const locked = webinars.filter((webinar) => !webinar.available);

  return (
    <div>
      <PageHeader
        title="Webinars"
        description="Live sessions and recordings on governance, fundraising, and nonprofit leadership."
      />

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
              {webinar.available ? (
                <Button asChild size="sm" variant="outline" className="text-olea-green">
                  <a href={`/api/v1/events/${webinar.id}/recording`}>
                    <Play className="size-3.5" />
                    Watch
                  </a>
                </Button>
              ) : (
                <Lock className="size-4 text-slate-400" />
              )}
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
    </div>
  );
}
