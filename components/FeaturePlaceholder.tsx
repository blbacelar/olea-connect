import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";

export function FeaturePlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="grid min-h-[420px] place-items-center rounded-xl border bg-white p-8 text-center shadow-soft">
        <div>
          <span className="mx-auto grid size-14 place-items-center rounded-xl bg-olea-light text-olea-green">
            <Icon className="size-7" />
          </span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.08em] text-olea-green">
            Coming soon
          </p>
          <h2 className="mt-2 text-xl font-semibold">{title}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            This area is part of the Olea Connects roadmap and will be added to
            the workspace soon.
          </p>
        </div>
      </div>
    </div>
  );
}
