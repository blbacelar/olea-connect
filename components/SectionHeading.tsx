import type { ReactNode } from "react";

export function SectionHeading({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">
        {children}
      </h2>
      {action}
    </div>
  );
}
