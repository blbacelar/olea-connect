"use client";

import Link from "next/link";

import { useLocaleContext } from "@/components/i18n/LocaleProvider";

const labels = {
  "en-CA": {
    links: "Legal and contact links",
    privacy: "Privacy Policy",
    terms: "Terms of Use",
    accessibility: "Accessibility",
    contact: "Contact",
    book: "Book a call",
    relationship: "Olea Connects™ is a social enterprise of",
    location: "Kelowna, BC, Canada",
  },
  "fr-CA": {
    links: "Liens juridiques et coordonnées",
    privacy: "Politique de confidentialité",
    terms: "Conditions d'utilisation",
    accessibility: "Accessibilité",
    contact: "Nous joindre",
    book: "Réserver un appel",
    relationship: "Olea Connects™ est une entreprise sociale de",
    location: "Kelowna (C.-B.), Canada",
  },
} as const;

export function PublicLegalLinks({ compact = false }: { compact?: boolean }) {
  const { locale } = useLocaleContext();
  const copy = labels[locale];

  return (
    <div className={compact ? "mx-auto max-w-3xl text-center" : "w-full"}>
      <nav aria-label={copy.links} className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
        <Link href="/legal/privacy" className="hover:text-olea-green hover:underline">{copy.privacy}</Link>
        <Link href="/legal/terms" className="hover:text-olea-green hover:underline">{copy.terms}</Link>
        <Link href="/accessibility" className="hover:text-olea-green hover:underline">{copy.accessibility}</Link>
        <a href="mailto:hello@olivesocialimpact.com" className="hover:text-olea-green hover:underline">{copy.contact}</a>
        <a href="https://www.olivesocialimpact.com/?utm_source=oleaconnects&utm_medium=website&utm_campaign=book_a_call#discovery" className="hover:text-olea-green hover:underline">{copy.book}</a>
      </nav>
      <p className="mt-3 text-center text-xs leading-5 text-slate-700">
        {copy.relationship}{" "}
        <a href="https://www.olivesocialimpact.com/?utm_source=oleaconnects&utm_medium=website&utm_campaign=brand_relationship" className="font-semibold underline underline-offset-2 hover:text-olea-green">Olive Social Impact</a> · {copy.location}
      </p>
    </div>
  );
}
