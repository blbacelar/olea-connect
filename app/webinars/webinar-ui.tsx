import { Lock, Play, Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Webinar } from "@/lib/types";

import {
  archiveWebinarEvent,
  cancelEventRegistration,
  registerForEvent,
} from "./actions";

export function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatEventType(type: Webinar["type"]) {
  return type
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatPlanList(planIds: Webinar["allowedPlanIds"]) {
  if (!planIds.length) return "selected membership tiers";
  return planIds.map((plan) => plan[0].toUpperCase() + plan.slice(1)).join(", ");
}

export function formatTicketLabel(webinar: Webinar) {
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

export function isUpcomingOrActiveEvent(webinar: Webinar, now: number) {
  if (!["scheduled", "live", "rescheduled"].includes(webinar.status)) {
    return false;
  }

  if (new Date(webinar.endsAt).getTime() < now) return false;

  const hasStarted = new Date(webinar.startsAt).getTime() <= now;
  return !hasStarted || webinar.registered;
}

export function canArchiveWebinar(webinar: Webinar, now: number) {
  return webinar.status !== "archived" && new Date(webinar.endsAt).getTime() < now;
}

export function ArchiveWebinarAction({ webinar }: { webinar: Webinar }) {
  return (
    <form action={archiveWebinarEvent}>
      <input type="hidden" name="eventId" value={webinar.id} />
      <Button type="submit" size="sm" variant="outline">
        Archive webinar
      </Button>
    </form>
  );
}

export function EventAction({ webinar }: { webinar: Webinar }) {
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

export function RecordingAction({ webinar }: { webinar: Webinar }) {
  if (!webinar.recordingAvailable) {
    return <Badge variant="outline">Recording coming soon</Badge>;
  }

  if (!webinar.available) {
    return (
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
        <Lock className="size-4" />
        Upgrade required
      </span>
    );
  }

  return (
    <Button asChild size="sm" variant="outline" className="text-olea-green">
      <a href={`/api/v1/events/${webinar.id}/recording`}>
        <Play className="size-3.5" />
        Watch
      </a>
    </Button>
  );
}
