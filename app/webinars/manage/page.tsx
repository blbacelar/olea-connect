import { ArrowLeft, CalendarDays, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyPanel } from "@/components/EmptyPanel";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canCurrentUserManageEvents, getWebinarCatalog } from "@/lib/data/webinars";
import type { Webinar } from "@/lib/types";

import {
  canArchiveWebinar,
  formatEventDate,
  formatEventType,
  formatPlanList,
} from "../webinar-ui";
import { ArchiveWebinarAction } from "./archive-webinar-action";

function WebinarStatusBadge({ status }: { status: Webinar["status"] }) {
  const isArchived = status === "archived";

  return (
    <Badge
      variant="outline"
      className={isArchived ? "border-slate-300 bg-slate-100 text-slate-600" : "capitalize"}
    >
      {status}
    </Badge>
  );
}

function WebinarAdminRow({
  now,
  webinar,
}: {
  now: number;
  webinar: Webinar;
}) {
  const canArchive = canArchiveWebinar(webinar, now);

  return (
    <div
      data-testid="webinar-manage-row"
      className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-[22px] py-4 last:border-0"
    >
      <div className="min-w-[240px] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-semibold text-slate-900">
            {webinar.title}
          </h3>
          <WebinarStatusBadge status={webinar.status} />
        </div>
        <p className="mt-1 text-[13px] text-slate-500">
          {formatEventType(webinar.type)} · {formatEventDate(webinar.startsAt)} to{" "}
          {formatEventDate(webinar.endsAt)}
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Plans: {formatPlanList(webinar.allowedPlanIds)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {webinar.status !== "archived" ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/webinars/${webinar.slug}`}>View</Link>
          </Button>
        ) : (
          <span className="text-sm text-slate-400">Hidden from members</span>
        )}
        {canArchive ? <ArchiveWebinarAction webinar={webinar} /> : null}
      </div>
    </div>
  );
}

function WebinarAdminSection({
  emptyDescription,
  emptyTitle,
  now,
  title,
  webinars,
}: {
  emptyDescription: string;
  emptyTitle: string;
  now: number;
  title: string;
  webinars: Webinar[];
}) {
  return (
    <section>
      <SectionHeading>{title}</SectionHeading>
      {webinars.length ? (
        <div className="overflow-hidden rounded-xl border bg-white shadow-soft">
          {webinars.map((webinar) => (
            <WebinarAdminRow key={webinar.id} now={now} webinar={webinar} />
          ))}
        </div>
      ) : (
        <EmptyPanel
          title={emptyTitle}
          description={emptyDescription}
          icon={<CalendarDays className="size-5" />}
        />
      )}
    </section>
  );
}

export default async function ManageWebinarsPage() {
  const canManageEvents = await canCurrentUserManageEvents();

  if (!canManageEvents) notFound();

  const { webinars } = await getWebinarCatalog({
    includeArchived: true,
  });

  const now = Date.now();
  const upcoming = webinars.filter(
    (webinar) =>
      webinar.status !== "archived" &&
      webinar.status !== "canceled" &&
      new Date(webinar.endsAt).getTime() >= now,
  );
  const past = webinars.filter(
    (webinar) =>
      webinar.status !== "archived" &&
      (webinar.status === "canceled" ||
        new Date(webinar.endsAt).getTime() < now),
  );
  const archived = webinars.filter((webinar) => webinar.status === "archived");

  return (
    <div>
      <Button asChild className="mb-5" variant="outline">
        <Link href="/webinars">
          <ArrowLeft className="size-4" />
          Back to webinars
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Manage webinars"
          description="Review webinar operations, open public details, and archive webinars that should no longer appear to members."
        />
        <Button asChild>
          <Link href="/webinars/new">
            <Plus className="size-4" />
            Create webinar
          </Link>
        </Button>
      </div>

      <div className="grid gap-7">
        <WebinarAdminSection
          title="Upcoming and active"
          webinars={upcoming}
          now={now}
          emptyTitle="No upcoming webinars"
          emptyDescription="Create a webinar to make it available to members."
        />
        <WebinarAdminSection
          title="Past and canceled webinars"
          webinars={past}
          now={now}
          emptyTitle="No past or canceled webinars"
          emptyDescription="Old or canceled webinars will appear here."
        />
        <WebinarAdminSection
          title="Archived"
          webinars={archived}
          now={now}
          emptyTitle="No archived webinars"
          emptyDescription="Archived webinars are hidden from member-facing pages."
        />
      </div>
    </div>
  );
}
