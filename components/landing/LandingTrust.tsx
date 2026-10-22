import { Accessibility, BadgeCheck, Globe2, HandHeart } from "lucide-react";

import type { PublicSiteCopy } from "@/lib/i18n/public-site-copy";

type LandingTrustCopy = PublicSiteCopy["trust"];

const signalIcons = [BadgeCheck, HandHeart, Globe2, Accessibility] as const;

export function LandingTrust({ copy }: { copy: LandingTrustCopy }) {
  return (
    <section className="border-y bg-white px-4 py-16">
      <div className="mx-auto max-w-7xl">
        <p className="text-center text-sm font-semibold text-slate-500">
          {copy.intro}
        </p>
        <div className="mt-9 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {copy.signals.map((signal, index) => {
            const Icon = signalIcons[index] ?? BadgeCheck;
            return (
              <div key={signal.value} className="text-center">
                <Icon className="mx-auto size-5 text-olea-green" />
                <p className="mt-3 text-2xl font-extrabold text-slate-900">
                  {signal.value}
                </p>
                <p className="mt-1 text-sm text-slate-500">{signal.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
