import { CalendarDays, Lock, Play } from "lucide-react";

import { DemoActionButton } from "@/components/DemoActionButton";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";

const recordings = [
  ["Board Composition 101", "June 10, 2026"],
  ["Running Effective AGMs", "May 14, 2026"],
  ["Conflict of Interest Policies", "April 9, 2026"],
];

export default function WebinarsPage() {
  return (
    <div>
      <PageHeader
        title="Webinars"
        description="Live sessions and recordings on governance, fundraising, and nonprofit leadership."
      />

      <SectionHeading>Upcoming</SectionHeading>
      <section className="mb-7 flex flex-wrap items-center gap-[22px] rounded-[14px] border bg-white p-6 shadow-soft">
        <span className="grid size-16 shrink-0 place-items-center rounded-[14px] bg-olea-light text-olea-green">
          <CalendarDays className="size-7" />
        </span>
        <div className="min-w-[220px] flex-1">
          <h2 className="text-lg font-semibold">
            Governance Best Practices for Small Nonprofits
          </h2>
          <p className="mt-1.5 text-[13.5px] text-slate-500">
            July 15, 2026 · 2:00–3:00 PM ET · Hosted by Rosalyn Walls, CEO
          </p>
          <div className="mt-2.5 flex gap-1.5">
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11.5px] font-semibold text-green-800">
              🌿 Roots
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-800">
              🌳 Canopy
            </span>
          </div>
        </div>
        <div className="text-right">
          <DemoActionButton message="You're registered for the webinar.">
            Register →
          </DemoActionButton>
          <p className="mt-2 text-xs text-slate-400">12 seats remaining</p>
        </div>
      </section>

      <SectionHeading>Past recordings — available to your tier</SectionHeading>
      <div className="mb-6 overflow-hidden rounded-xl border bg-white shadow-soft">
        {recordings.map(([title, date]) => (
          <div
            key={title}
            className="flex items-center justify-between gap-4 border-b border-slate-100 px-[22px] py-4 last:border-0"
          >
            <div>
              <p className="text-[15px] font-semibold">{title}</p>
              <p className="mt-0.5 text-[13px] text-slate-400">{date}</p>
            </div>
            <DemoActionButton
              message={`Opening “${title}” recording.`}
              size="sm"
              variant="outline"
              className="text-olea-green"
            >
              <Play className="size-3.5" />
              Watch
            </DemoActionButton>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-slate-50 px-6 py-5">
        <div className="flex items-center gap-3">
          <Lock className="size-5 text-slate-400" />
          <div>
            <p className="text-[15px] font-semibold text-slate-500">
              Funder AMA — July 22
            </p>
            <p className="mt-0.5 text-[13px] text-slate-400">
              Available to Canopy & Harvest members.
            </p>
          </div>
        </div>
        <DemoActionButton
          message="Upgrade options are ready to review."
          variant="outline"
          className="border-olea-green text-olea-green"
        >
          Upgrade to attend
        </DemoActionButton>
      </div>
    </div>
  );
}
