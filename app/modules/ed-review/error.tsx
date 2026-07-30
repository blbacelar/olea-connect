"use client";

import { Button } from "@/components/ui/button";

export default function EdReviewError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl p-6 md:p-10">
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-800">
          Confidential review
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          We could not load this confidential review
        </h1>
        <p className="mt-3 max-w-xl leading-7 text-slate-700">
          The review could not be loaded right now. Your access and confidential
          feedback remain protected. Please try again, or contact support if the
          problem continues.
        </p>
        <Button
          className="mt-5"
          type="button"
          variant="outline"
          onClick={reset}
        >
          Try again
        </Button>
      </section>
    </main>
  );
}
