import { Download, Palette, UserPlus } from "lucide-react";

import { SectionIntro } from "@/components/landing/SectionIntro";
import type { PublicSiteCopy } from "@/lib/i18n/public-site-copy";

type LandingWorkflowCopy = PublicSiteCopy["workflow"];

const stepIcons = [UserPlus, Palette, Download] as const;

export function LandingWorkflow({ copy }: { copy: LandingWorkflowCopy }) {
  return (
    <section id="how-it-works" className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionIntro
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
          centered
        />
        <div className="relative mt-14 grid gap-8 md:grid-cols-3">
          <div className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-olea-green/20 md:block" />
          {copy.steps.map((step, index) => {
            const Icon = stepIcons[index] ?? UserPlus;
            return (
              <div key={step.number} className="relative text-center">
                <span className="relative z-10 mx-auto grid size-14 place-items-center rounded-full border-4 border-white bg-olea-green text-sm font-bold text-white shadow-lg">
                  {step.number}
                </span>
                <Icon className="mx-auto mt-7 size-6 text-olea-orange" />
                <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
                  {step.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
