import { ArrowRight, FileText, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { boardCalendarModule, getResourceHref } from "@/lib/modules";
import type { Template } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TemplateCard({
  template,
  variant = "library",
}: {
  template: Template;
  variant?: "dashboard" | "library";
}) {
  const locked = !template.available;
  const href = getResourceHref(template.slug);
  const opensModule = template.slug === boardCalendarModule.resourceSlug;

  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border p-5 shadow-soft",
        locked ? "border-slate-200 bg-slate-50" : "bg-white",
        variant === "dashboard" && "p-[22px]",
      )}
    >
      <div className="flex items-start gap-3.5">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-[10px]",
            locked
              ? "bg-slate-200 text-slate-400"
              : "bg-olea-light text-olea-green",
          )}
        >
          {locked ? (
            <LockKeyhole className="size-5" strokeWidth={1.8} />
          ) : (
            <FileText className="size-5" strokeWidth={1.8} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={cn(
                "text-base font-semibold leading-5",
                locked ? "text-slate-500" : "text-slate-800",
              )}
            >
              {template.name}
            </h3>
            {template.isNew ? (
              <span className="rounded bg-olea-orange px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                New
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {template.category} · {template.estimatedTime}
          </p>
        </div>
      </div>

      {variant === "library" ? (
        <p className="mt-4 flex-1 text-[13px] leading-5 text-slate-500">
          {template.description}
        </p>
      ) : (
        <div className="flex-1" />
      )}

      <div className="mt-[18px] flex items-center justify-between gap-3">
        {locked ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-2.5 py-1 text-xs font-semibold capitalize text-slate-500">
              🔒 {template.requiredTier} & above
            </span>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-olea-green text-olea-green hover:bg-olea-light"
            >
              <Link
                href={`/subscription?upgrade=${template.requiredTier}&resource=${template.slug}`}
              >
                Upgrade{variant === "dashboard" ? " to unlock" : ""}
              </Link>
            </Button>
          </>
        ) : (
          <>
            <span className="text-[12.5px] text-slate-500">
              {template.status}
            </span>
            <Button asChild size="sm">
              <Link href={href}>
                {variant === "dashboard"
                  ? opensModule
                    ? "Open module"
                    : "Open template"
                  : "Open"}
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
