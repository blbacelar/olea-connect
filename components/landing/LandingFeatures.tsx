import {
  CalendarDays,
  FileText,
  Gift,
  MessageCircleMore,
  Palette,
  SearchCheck,
} from "lucide-react";

import { SectionIntro } from "@/components/landing/SectionIntro";
import { Card } from "@/components/ui/card";
import type { PublicSiteCopy } from "@/lib/i18n/public-site-copy";

type LandingFeaturesCopy = PublicSiteCopy["features"];

const featureIcons = [
  Palette,
  FileText,
  MessageCircleMore,
  SearchCheck,
  CalendarDays,
  Gift,
] as const;

export function LandingFeatures({ copy }: { copy: LandingFeaturesCopy }) {
  return (
    <section id="features" className="bg-slate-50 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
          centered
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {copy.items.map((feature, index) => {
            const Icon = featureIcons[index] ?? FileText;
            return (
              <Card
                key={feature.title}
                className="group p-6 shadow-none transition hover:-translate-y-1 hover:border-olea-green/30 hover:shadow-lg"
              >
                <span className="grid size-12 place-items-center rounded-xl bg-olea-light text-olea-dark transition group-hover:bg-olea-green group-hover:text-white">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-xl font-bold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {feature.text}
                </p>
                <p className="mt-5 border-t pt-4 text-sm font-semibold text-olea-dark">
                  {feature.outcome}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
