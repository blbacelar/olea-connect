"use client";

import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { getErrorBoundaryCopy } from "@/lib/i18n/error-boundary-copy";

export default function AppLoading() {
  const { locale } = useLocaleContext();
  const loading = getErrorBoundaryCopy(locale).loading;

  return (
    <div
      className="space-y-5"
      role="status"
      aria-label={loading}
    >
      <div className="h-9 w-64 animate-pulse rounded-lg bg-slate-200 motion-reduce:animate-none" />
      <div className="h-5 w-96 max-w-full animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
      <div className="grid gap-4 pt-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-48 animate-pulse rounded-xl border bg-white shadow-soft motion-reduce:animate-none"
          />
        ))}
      </div>
      <span className="sr-only">{loading}</span>
    </div>
  );
}
