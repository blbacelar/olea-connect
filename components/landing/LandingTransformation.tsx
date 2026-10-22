import { ArrowRight, Clock3, FolderSearch, Palette } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { PublicSiteCopy } from "@/lib/i18n/public-site-copy";

type LandingTransformationCopy = PublicSiteCopy["transformation"];

const problemIcons = [Clock3, FolderSearch, Palette] as const;

export function LandingTransformation({
  copy,
}: {
  copy: LandingTransformationCopy;
}) {
  return (
    <section className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-olea-green">
              {copy.eyebrow}
            </p>
            <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-[-0.03em] text-slate-900 md:text-4xl">
              {copy.title}
            </h2>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            {copy.description}
          </p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
          {copy.problems.map((problem, index) => {
            const Icon = problemIcons[index] ?? Clock3;
            return (
              <div key={problem.title} className="contents">
                <Card className="h-full p-6 shadow-none">
                  <span className="grid size-11 place-items-center rounded-xl bg-red-50 text-red-500">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold">{problem.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {problem.text}
                  </p>
                </Card>
                {index < copy.problems.length - 1 ? (
                  <ArrowRight className="mx-auto hidden size-5 text-slate-300 lg:block" />
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="mt-6 rounded-2xl bg-olea-dark px-6 py-7 text-white md:flex md:items-center md:justify-between md:px-9">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">
              {copy.afterEyebrow}
            </p>
            <p className="mt-2 text-xl font-bold">
              {copy.afterTitle}
            </p>
          </div>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/70 md:mt-0">
            {copy.afterDescription}
          </p>
        </div>
      </div>
    </section>
  );
}
