"use client";

import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";

import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const copy = {
  "en-CA": {
    title: "Help",
    description: "Find your next step or contact our team for help with your workspace.",
    contact: "Email our team",
    contactDetail: "Tell us what you were trying to do and which page you were on.",
    questions: "Common questions",
    items: [
      { question: "How do I invite a teammate?", answer: "Open Team to invite people and manage your workspace seats.", href: "/team", link: "Open Team" },
      { question: "Where can I review my membership?", answer: "Subscription shows your current plan and billing options.", href: "/subscription", link: "Open Subscription" },
      { question: "Where do I find board tools?", answer: "Use the module links in the side menu to open Board Calendar, KPI Dashboard, and other tools included in your plan.", href: "/dashboard", link: "Open Dashboard" },
    ],
  },
  "fr-CA": {
    title: "Aide",
    description: "Trouvez la prochaine étape ou contactez notre équipe pour obtenir de l'aide avec votre espace de travail.",
    contact: "Écrire à notre équipe",
    contactDetail: "Indiquez-nous ce que vous essayiez de faire et la page où vous étiez.",
    questions: "Questions fréquentes",
    items: [
      { question: "Comment inviter un collègue?", answer: "Ouvrez Équipe pour inviter des personnes et gérer les places de votre espace de travail.", href: "/team", link: "Ouvrir Équipe" },
      { question: "Où consulter mon adhésion?", answer: "La page Abonnement présente votre forfait et vos options de facturation.", href: "/subscription", link: "Ouvrir Abonnement" },
      { question: "Où trouver les outils du conseil?", answer: "Utilisez le menu latéral pour ouvrir le calendrier du conseil, le tableau de bord des indicateurs et les autres outils inclus dans votre forfait.", href: "/dashboard", link: "Ouvrir le tableau de bord" },
    ],
  },
} as const;

export default function HelpPage() {
  const { locale } = useLocaleContext();
  const content = copy[locale];

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">{content.title}</h1>
        <p className="mt-2 text-slate-600">{content.description}</p>
      </header>
      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-xl font-semibold text-slate-900">{content.contact}</h2>
          <p className="text-sm text-slate-600">{content.contactDetail}</p>
          <Button asChild>
            <a href="mailto:hello@olivesocialimpact.com?subject=Olea%20Connects%20support">
              <Mail className="size-4" />
              hello@olivesocialimpact.com
            </a>
          </Button>
        </CardContent>
      </Card>
      <section aria-labelledby="help-questions" className="space-y-3">
        <h2 id="help-questions" className="text-xl font-semibold text-slate-900">
          {content.questions}
        </h2>
        {content.items.map((item) => (
          <Card key={item.question}>
            <CardContent className="space-y-2 p-5">
              <h3 className="font-semibold text-slate-900">{item.question}</h3>
              <p className="text-sm leading-6 text-slate-600">{item.answer}</p>
              <Button asChild variant="link" className="h-auto p-0">
                <Link href={item.href}>{item.link}<ArrowRight className="size-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
