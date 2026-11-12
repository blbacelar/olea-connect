"use client";

import { Button } from "@/components/ui/button";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { getErrorBoundaryCopy } from "@/lib/i18n/error-boundary-copy";

export default function EdReviewError({ reset }: { reset: () => void }) {
  const { locale } = useLocaleContext();
  const copy = getErrorBoundaryCopy(locale);

  return (
    <main className="mx-auto max-w-3xl p-6 md:p-10">
      <section role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-800">
          {copy.edReview.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          {copy.edReview.title}
        </h1>
        <p className="mt-3 max-w-xl leading-7 text-slate-700">
          {copy.edReview.description}
        </p>
        <Button
          className="mt-5"
          type="button"
          variant="outline"
          onClick={reset}
        >
          {copy.retry}
        </Button>
      </section>
    </main>
  );
}
