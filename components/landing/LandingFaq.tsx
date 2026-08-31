import { ChevronDown } from "lucide-react";

import { SectionIntro } from "@/components/landing/SectionIntro";
import type { PublicSiteCopy } from "@/lib/i18n/public-site-copy";

type LandingFaqCopy = PublicSiteCopy["faq"];

export function LandingFaq({ copy }: { copy: LandingFaqCopy }) {
  return (
    <section id="faq" className="px-4 py-20 md:py-28">
      <div className="mx-auto max-w-3xl">
        <SectionIntro
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
          centered
        />
        <div className="mt-10 divide-y rounded-2xl border bg-white px-5 md:px-7">
          {copy.items.map((faq) => (
            <details key={faq.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-bold">
                {faq.question}
                <ChevronDown className="size-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <p className="max-w-2xl pt-3 text-sm leading-7 text-slate-500">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
