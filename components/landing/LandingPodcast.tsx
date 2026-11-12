"use client";

import { ExternalLink, Play } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/locales";

const copy = {
  "en-CA": {
    eyebrow: "From our community",
    title: "Olive in Good Company",
    description: "Conversations with people helping purpose-driven organizations grow. Watch a recent episode with Nicole Richard on gratitude and community.",
    video: "Olive in Good Company episode 2: How Gratitude Builds Community with Nicole Richard",
    link: "Explore the podcast on YouTube",
    play: "Play podcast episode",
  },
  "fr-CA": {
    eyebrow: "De notre communauté",
    title: "Olive in Good Company",
    description: "Des conversations avec des personnes qui aident les organismes à grandir. Regardez un épisode récent, en anglais, avec Nicole Richard sur la gratitude et la communauté.",
    video: "Olive in Good Company, épisode 2 : How Gratitude Builds Community avec Nicole Richard (en anglais)",
    link: "Découvrir le balado sur YouTube",
    play: "Lire l'épisode du balado",
  },
} as const;

export function LandingPodcast({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const [playing, setPlaying] = useState(false);
  return (
    <section id="podcast" className="bg-slate-50 px-4 py-20 md:py-28" aria-labelledby="podcast-title">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-olea-green">{text.eyebrow}</p>
          <h2 id="podcast-title" className="mt-3 text-3xl font-bold tracking-tight text-olea-dark sm:text-4xl">{text.title}</h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">{text.description}</p>
          <Button asChild variant="outline" className="mt-7">
            <a href="https://www.youtube.com/@OliveinGoodCompany" target="_blank" rel="noopener noreferrer">{text.link}<ExternalLink aria-hidden="true" className="size-4" /></a>
          </Button>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-slate-950 shadow-lg">
          {playing ? (
            <iframe
              className="aspect-video w-full"
              src="https://www.youtube-nocookie.com/embed/puuW6y1mSAQ?autoplay=1"
              title={text.video}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-5 p-6 text-center text-white">
              <p className="max-w-sm text-lg font-semibold leading-7">{text.video}</p>
              <Button type="button" variant="secondary" onClick={() => setPlaying(true)}>
                <Play aria-hidden="true" className="size-4" />{text.play}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
