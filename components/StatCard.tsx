import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <div className="rounded-xl border bg-white px-5 py-[18px] shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-400">
          {label}
        </span>
        <span className={`grid size-[30px] place-items-center rounded-lg ${tone}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-[30px] font-bold leading-none tracking-[-0.02em]">
        {value}
      </p>
      <p className="mt-1.5 text-[13px] text-slate-500">{detail}</p>
    </div>
  );
}
