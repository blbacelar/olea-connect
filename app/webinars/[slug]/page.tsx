import { ArrowLeft, CalendarDays, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getWebinarBySlug } from "@/lib/data/webinars";

import {
  EventAction,
  RecordingAction,
  formatEventDate,
  formatEventType,
  formatPlanList,
  formatTicketLabel,
} from "../webinar-ui";

export default async function WebinarDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const webinar = await getWebinarBySlug(params.slug);

  if (!webinar) notFound();

  const isCompleted = webinar.status === "completed";

  return (
    <div>
      <Button asChild className="mb-5" variant="outline">
        <Link href="/webinars">
          <ArrowLeft className="size-4" />
          Back to webinars
        </Link>
      </Button>

      <section className="rounded-[18px] border bg-white p-7 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{formatEventType(webinar.type)}</Badge>
              <Badge variant="outline" className="capitalize">
                {webinar.status}
              </Badge>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-[-0.02em] text-slate-900">
              {webinar.title}
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              {webinar.summary}
            </p>
          </div>
          <span className="grid size-16 shrink-0 place-items-center rounded-[14px] bg-olea-light text-olea-green">
            <CalendarDays className="size-7" />
          </span>
        </div>

        <div className="mt-7 grid gap-4 border-y border-slate-100 py-5 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Starts
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatEventDate(webinar.startsAt)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Ends
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatEventDate(webinar.endsAt)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Timezone
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {webinar.timezone}
            </p>
          </div>
        </div>

        {webinar.description ? (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-slate-900">Details</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
              {webinar.description}
            </p>
          </div>
        ) : null}

        <div className="mt-7 rounded-xl bg-slate-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {formatTicketLabel(webinar)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Available for {formatPlanList(webinar.allowedPlanIds)}
              </p>
            </div>
            {isCompleted ? (
              <RecordingAction webinar={webinar} />
            ) : (
              <EventAction webinar={webinar} />
            )}
          </div>
          {!webinar.available ? (
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-500">
              <Lock className="size-4" />
              Your current plan does not include this event.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
