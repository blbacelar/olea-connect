import { CalendarDays, Lock, Play } from "lucide-react";

import { DemoActionButton } from "@/components/DemoActionButton";
import { EmptyPanel } from "@/components/EmptyPanel";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";
import { getWebinars } from "@/lib/data/webinars";

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function WebinarsPage() {
  const webinars = await getWebinars();
  const now = Date.now();
  const upcoming = webinars.filter(
    (webinar) =>
      webinar.status === "scheduled" &&
      new Date(webinar.startsAt).getTime() >= now,
  );
  const recordings = webinars.filter(
    (webinar) => webinar.status === "completed" && webinar.recordingUrl,
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
              className="flex flex-wrap items-center gap-[22px] rounded-[14px] border bg-white p-6 shadow-soft"
            >
              <span className="grid size-16 shrink-0 place-items-center rounded-[14px] bg-olea-light text-olea-green">
                <CalendarDays className="size-7" />
              </span>
              <div className="min-w-[220px] flex-1">
                <h2 className="text-lg font-semibold">{webinar.title}</h2>
                <p className="mt-1.5 text-[13.5px] text-slate-500">
                  {formatEventDate(webinar.startsAt)} · {webinar.timezone}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {webinar.summary}
                </p>
              </div>
              {webinar.available ? (
                <DemoActionButton
                  message={
                    webinar.registered
                      ? "You are already registered."
                      : "Registration will be available shortly."
                  }
                >
                  {webinar.registered ? "Registered" : "Register →"}
                </DemoActionButton>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <Lock className="size-4" />
                  Upgrade required
                </span>
              )}
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
              className="flex items-center justify-between gap-4 border-b border-slate-100 px-[22px] py-4 last:border-0"
            >
              <div>
                <p className="text-[15px] font-semibold">{webinar.title}</p>
                <p className="mt-0.5 text-[13px] text-slate-400">
                  {formatEventDate(webinar.startsAt)}
                </p>
              </div>
              {webinar.available ? (
                <DemoActionButton
                  size="sm"
                  variant="outline"
                  className="text-olea-green"
                  message={`Opening "${webinar.title}" recording.`}
                >
                  <Play className="size-3.5" />
                  Watch
                </DemoActionButton>
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
