import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { ProductPreview } from "@/components/landing/ProductPreview";
import { Button } from "@/components/ui/button";

const assurances = [
  "Join in about 5 minutes",
  "Plans from $800/year",
  "Quarterly billing available",
];

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(145deg,#F0F7F2_0%,#FFFFFF_55%,#FFF8F2_100%)] px-4 pb-24 pt-16 md:pb-32 md:pt-24">
      <div className="absolute left-[-8rem] top-20 size-72 rounded-full bg-olea-light/80 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[.95fr_1.05fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-olea-green/20 bg-white/80 px-3.5 py-2 text-xs font-bold text-olea-dark shadow-sm">
            <span className="size-2 rounded-full bg-olea-orange" />
            Built for nonprofit organizations
          </span>
          <h1 className="mt-6 max-w-2xl text-balance text-4xl font-extrabold leading-[1.05] tracking-[-0.045em] text-slate-900 sm:text-5xl md:text-6xl">
            The tools, community, and funding connections your nonprofit needs
            to grow.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Create board-ready documents in your own brand, learn from sector
            experts, find grant opportunities, and connect with nonprofit
            leaders who understand the work.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 px-7 text-base">
              <Link href="/signup">
                Join Olea Connects™
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 bg-white px-7 text-base"
            >
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            {assurances.map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-olea-green" />
                {item}
              </span>
            ))}
          </div>
          <div className="mt-8 border-t border-slate-200 pt-5">
            <p className="max-w-lg text-sm italic leading-6 text-slate-500">
              “Whatever stage your organization is at, there is a place for you
              here.”
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-600">
              The Olea Connects™ promise
            </p>
          </div>
        </div>
        <ProductPreview />
      </div>
    </section>
  );
}
