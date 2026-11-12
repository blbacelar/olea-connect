import type { Metadata } from "next";

import { PublicHeader } from "@/components/auth/PublicHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { getRequestLocale } from "@/lib/i18n/server";

const content = {
  "en-CA": {
    title: "Accessibility at Olea Connects",
    description: "How we work to make Olea Connects usable for everyone and how to report an accessibility barrier.",
    intro: "We work to make Olea Connects usable with a keyboard, assistive technology, and different screen sizes. Accessibility is part of our ongoing product reviews.",
    feedbackTitle: "Tell us about a barrier",
    feedback: "If a page, form, video, or document is difficult to use, email us. Include the page address, what you were trying to do, and the device or assistive technology you used if you are comfortable sharing it. We will work with you on an accessible alternative.",
    email: "Email accessibility feedback",
  },
  "fr-CA": {
    title: "L'accessibilité chez Olea Connects",
    description: "Notre démarche pour rendre Olea Connects accessible à tous et la façon de signaler un obstacle.",
    intro: "Nous travaillons pour rendre Olea Connects utilisable au clavier, avec les technologies d'assistance et sur différents écrans. L'accessibilité fait partie de nos examens continus du produit.",
    feedbackTitle: "Signalez un obstacle",
    feedback: "Si une page, un formulaire, une vidéo ou un document est difficile à utiliser, écrivez-nous. Indiquez l'adresse de la page, ce que vous essayiez de faire et, si vous le souhaitez, l'appareil ou la technologie d'assistance utilisé. Nous chercherons avec vous une solution accessible.",
    email: "Envoyer des commentaires sur l'accessibilité",
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const copy = content[await getRequestLocale()];
  return { title: copy.title, description: copy.description, alternates: { canonical: "/accessibility" } };
}

export default async function AccessibilityPage() {
  const copy = content[await getRequestLocale()];
  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <h1 className="text-4xl font-bold tracking-tight text-olea-dark">{copy.title}</h1>
        <p className="mt-6 text-lg leading-8 text-slate-700">{copy.intro}</p>
        <section className="mt-12 rounded-2xl border bg-slate-50 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-olea-dark">{copy.feedbackTitle}</h2>
          <p className="mt-3 leading-7 text-slate-700">{copy.feedback}</p>
          <a className="mt-5 inline-block font-semibold text-olea-green underline underline-offset-4" href="mailto:hello@olivesocialimpact.com?subject=Olea%20Connects%20accessibility">{copy.email}</a>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
