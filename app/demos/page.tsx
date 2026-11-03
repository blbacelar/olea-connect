import type { Metadata } from "next";

import { PublicHeader } from "@/components/auth/PublicHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { getDemoPageCopy } from "@/lib/i18n/demo-page-copy";
import { getRequestLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = getDemoPageCopy(locale);

  return {
    title: `${copy.eyebrow} | Olea Connects`,
    description: copy.description,
    alternates: { canonical: "/demos" },
  };
}

export default async function DemosPage() {
  const locale = await getRequestLocale();
  const copy = getDemoPageCopy(locale);
  const videos = [
    {
      id: "board-calendar",
      src: "/videos/board-calendar-demo.mp4",
      poster: "/videos/board-calendar-demo-poster.jpg",
      ...copy.videos.boardCalendar,
    },
    {
      id: "grant-platform",
      src: "/videos/grant-platform-demo.mp4",
      poster: "/videos/grant-platform-demo-poster.jpg",
      ...copy.videos.grantPlatform,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f3ee]">
      <PublicHeader />
      <main className="px-4 pb-20 pt-12 sm:px-8 sm:pt-16">
        <div className="mx-auto max-w-4xl">
          <header className="mb-12 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-olea-green">
              {copy.eyebrow}
            </p>
            <h1 className="mt-4 text-balance text-4xl font-extrabold tracking-[-0.04em] text-slate-900 sm:text-5xl">
              {copy.title}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {copy.description}
            </p>
          </header>

          <div className="space-y-10">
            {videos.map((video) => (
              <section
                key={video.id}
                id={video.id}
                aria-labelledby={`${video.id}-title`}
                className="scroll-mt-28 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="p-5 sm:p-8">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h2 id={`${video.id}-title`} className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                      {video.title}
                    </h2>
                    <span className="text-sm font-medium text-slate-500">{video.duration}</span>
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                    {video.description}
                  </p>
                </div>
                <video
                  aria-label={video.videoLabel}
                  className="aspect-video w-full bg-slate-950"
                  controls
                  playsInline
                  preload="metadata"
                  poster={video.poster}
                >
                  <source src={video.src} type="video/mp4" />
                  {copy.videoFallback}
                </video>
                <p className="px-5 py-4 text-sm text-slate-600 sm:px-8">
                  {copy.languageNote}
                </p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
