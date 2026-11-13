import { ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/locales";

const copy = {
  "en-CA": {
    eyebrow: "Olea Learning",
    title: "Board training is included in every plan.",
    body: "Start with Governance Essentials, return for the annual refresher, and track certificates for your board. Your membership includes both courses.",
    learning: "Explore Olea Learning",
    olive: "Learn about us at Olive Social Impact",
  },
  "fr-CA": {
    eyebrow: "Formation Olea",
    title: "La formation du conseil est incluse dans chaque forfait.",
    body: "Commencez par les fondements de la gouvernance, revenez pour la mise à jour annuelle et suivez les certificats de votre conseil. Les deux cours sont inclus dans votre abonnement.",
    learning: "Découvrir la Formation Olea",
    olive: "En savoir plus sur Olive Social Impact",
  },
} as const;

export function LandingLearning({ locale }: { locale: Locale }) {
  const text = copy[locale];
  return (
    <section className="px-4 py-20 md:py-24" aria-labelledby="landing-learning-title">
      <div className="mx-auto grid max-w-7xl gap-8 rounded-3xl border border-olea-green/20 bg-olea-light/30 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="max-w-3xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-olea-green"><BookOpen className="size-4" aria-hidden="true" />{text.eyebrow}</p>
          <h2 id="landing-learning-title" className="mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{text.title}</h2>
          <p className="mt-4 leading-7 text-slate-600">{text.body}</p>
        </div>
        <div className="flex flex-col items-start gap-3">
          <Button asChild size="lg"><Link href="/learning">{text.learning}<ArrowRight className="ml-2 size-4" aria-hidden="true" /></Link></Button>
          <a className="inline-flex items-center gap-2 text-sm font-semibold text-olea-green underline underline-offset-4" href={locale === "fr-CA" ? "https://www.olivesocialimpact.com/fr/about/" : "https://www.olivesocialimpact.com/about/"} target="_blank" rel="noopener noreferrer">{text.olive}<ExternalLink className="size-4" aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  );
}
