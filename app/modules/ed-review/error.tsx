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
          This review is restricted
        </h1>
        <p className="mt-3 max-w-xl leading-7 text-slate-700">
          Only an explicitly assigned Board Chair or HR reviewer can access this
          confidential ED/CEO review. Ask the Board Chair to assign access if
          you need to participate in the review process.
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
