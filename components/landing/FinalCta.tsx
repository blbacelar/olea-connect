import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="px-4 pb-20">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#183D2A] px-6 py-14 text-center text-white md:px-12 md:py-20">
        <div className="absolute -right-20 -top-32 size-80 rounded-full border-[55px] border-white/5" />
        <div className="absolute -bottom-40 -left-20 size-80 rounded-full border-[55px] border-olea-orange/10" />
        <div className="relative mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">
            You belong here
          </p>
          <h2 className="mt-4 text-balance text-3xl font-extrabold tracking-[-0.03em] md:text-5xl">
            Give your nonprofit a stronger place to grow.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/70 md:text-lg">
            Start with the plan that fits now. Your tools, brand profile,
            history, and community connections can grow with you.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 h-12 bg-white px-7 text-base text-[#183D2A] hover:bg-white/90"
          >
            <Link href="/signup">
              Join Olea Connects
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <p className="mt-4 text-xs text-white/50">
            Memberships start at $44 CAD per month.
          </p>
        </div>
      </div>
    </section>
  );
}
