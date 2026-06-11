import type { ReactNode } from "react";

export function EmptyPanel({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white px-6 py-12 text-center shadow-soft">
      {icon ? (
        <span className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-olea-light text-olea-green">
          {icon}
        </span>
      ) : null}
      <p className="text-[15px] font-semibold text-slate-700">{title}</p>
      <p className="mt-2 text-[13.5px] text-slate-400">{description}</p>
    </div>
  );
}
