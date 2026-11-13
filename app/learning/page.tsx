import type { Metadata } from "next";
import { ArrowRight, BookOpen, Clock3, GraduationCap } from "lucide-react";
import Link from "next/link";

import { PublicHeader } from "@/components/auth/PublicHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTrainingCourse } from "@/lib/board-training/content";
import { getRequestLocale } from "@/lib/i18n/server";

const copy = {
  "en-CA": {
    eyebrow: "Olea Learning",
    title: "Board training for every member organization",
    description: "Practical governance learning is included with Seedling, Roots, and Canopy. Your team can work through the lessons, check its understanding, and earn certificates inside Olea Connects.",
    included: "Included with every active membership",
    courses: "Available courses",
    minutes: "minutes",
    lessons: "lessons",
    certificate: "Certificate available after completion",
    open: "Open board training",
    join: "Choose a membership",
    olive: "Learn about Olive Social Impact",
  },
  "fr-CA": {
    eyebrow: "Formation Olea",
    title: "La formation du conseil pour chaque organisme membre",
    description: "Une formation pratique en gouvernance est incluse dans Seedling, Roots et Canopy. Votre équipe peut suivre les leçons, vérifier ses connaissances et obtenir des certificats dans Olea Connects.",
    included: "Inclus avec chaque abonnement actif",
    courses: "Cours disponibles",
    minutes: "minutes",
    lessons: "leçons",
    certificate: "Certificat disponible après la formation",
    open: "Ouvrir la formation du conseil",
    join: "Choisir un abonnement",
    olive: "Découvrir Olive Social Impact",
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: copy[locale].eyebrow,
    description: copy[locale].description,
    alternates: { canonical: "/learning" },
  };
}

export default async function LearningPage() {
  const locale = await getRequestLocale();
  const language = locale === "fr-CA" ? "fr" : "en";
  const text = copy[locale];
  const courses = [getTrainingCourse("essentials", language), getTrainingCourse("refresher", language)];

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />
      <main className="px-4 pb-20 pt-12 sm:px-8 sm:pt-16">
        <div className="mx-auto max-w-5xl space-y-10">
          <header className="max-w-3xl space-y-5">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-olea-green"><BookOpen className="size-4" aria-hidden="true" />{text.eyebrow}</p>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">{text.title}</h1>
            <p className="text-lg leading-8 text-slate-600">{text.description}</p>
            <p className="font-semibold text-teal-900">{text.included}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild><Link href="/modules/board-training">{text.open}<ArrowRight className="ml-2 size-4" aria-hidden="true" /></Link></Button>
              <Button asChild variant="outline"><Link href="/signup">{text.join}</Link></Button>
            </div>
          </header>
          <section aria-labelledby="courses-title" className="space-y-5">
            <h2 id="courses-title" className="text-2xl font-semibold text-slate-900">{text.courses}</h2>
            <div className="grid gap-5 md:grid-cols-2">
              {courses.map((course) => (
                <Card key={course.id} className="bg-white">
                  <CardHeader><CardTitle>{course.title}</CardTitle></CardHeader>
                  <CardContent className="space-y-4 text-sm leading-6 text-slate-600">
                    <p>{course.subtitle}</p>
                    <p className="flex flex-wrap gap-x-5 gap-y-2"><span className="inline-flex items-center gap-2"><Clock3 className="size-4" aria-hidden="true" />{course.estimatedMinutes} {text.minutes}</span><span>{course.lessons.length} {text.lessons}</span></p>
                    <p className="inline-flex items-center gap-2"><GraduationCap className="size-4" aria-hidden="true" />{text.certificate}</p>
                    <Button asChild variant="outline"><Link href="/modules/board-training">{text.open}</Link></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
          <div className="space-y-3 border-t pt-6 text-sm text-slate-600">
            <a className="font-semibold text-olea-green underline underline-offset-4" href={locale === "fr-CA" ? "https://www.olivesocialimpact.com/fr/about/" : "https://www.olivesocialimpact.com/about/"} target="_blank" rel="noopener noreferrer">{text.olive}</a>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
