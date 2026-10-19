import { SectionIntro } from "@/components/landing/SectionIntro";
import type { PublicSiteCopy } from "@/lib/i18n/public-site-copy";

type LandingDemoCopy = PublicSiteCopy["demo"];

export function LandingDemo({ copy }: { copy: LandingDemoCopy }) {
  return (
    <section id="demo" className="scroll-mt-28 bg-white px-4 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <SectionIntro
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
          centered
        />
        <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-xl shadow-slate-900/10">
          <video
            aria-label={copy.videoLabel}
            className="aspect-video w-full"
            controls
            playsInline
            preload="metadata"
            poster="/videos/grant-platform-demo-poster.jpg"
          >
            <source src="/videos/grant-platform-demo.mp4" type="video/mp4" />
            {copy.videoFallback}
          </video>
        </div>
        <p className="mt-4 text-center text-sm text-slate-600">
          {copy.caption}
        </p>
      </div>
    </section>
  );
}
