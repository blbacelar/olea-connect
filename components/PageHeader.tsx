import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-slate-800">
          {title}
        </h1>
        <p className="mt-1.5 text-[14.5px] text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}
