import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { PublicSiteCopy } from "@/lib/i18n/public-site-copy";

type FinalCtaCopy = PublicSiteCopy["finalCta"];

export function FinalCta({ copy }: { copy: FinalCtaCopy }) {
  return (
    <section className="px-4 pb-20">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-olea-dark px-6 py-14 text-center text-white md:px-12 md:py-20">
        <div className="absolute -right-20 -top-32 size-80 rounded-full border-[55px] border-white/5" />
        <div className="absolute -bottom-40 -left-20 size-80 rounded-full border-[55px] border-olea-orange/10" />
        <div className="relative mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">
            {copy.eyebrow}
          </p>
          <h2 className="mt-4 text-balance text-3xl font-extrabold tracking-[-0.03em] md:text-5xl">
            {copy.title}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/70 md:text-lg">
            {copy.description}
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 h-12 bg-olea-gold px-7 text-base text-olea-ink hover:bg-olea-gold/90"
          >
            <Link href="/signup">
              {copy.cta}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <p className="mt-4 text-xs text-white/70">
            {copy.pricingNote}
          </p>
        </div>
      </div>
    </section>
  );
}
