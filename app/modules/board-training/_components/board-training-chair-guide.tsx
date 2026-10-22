"use client";

import { ArrowLeft, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { getChairGuide, TrainingLanguage } from "@/lib/board-training/content";

type Guide = ReturnType<typeof getChairGuide>;

export function BoardTrainingChairGuide({ guide, language, selectedSession }: {
  guide: Guide; language: TrainingLanguage; selectedSession?: string;
}) {
  const [open, setOpen] = useState(selectedSession ?? guide.sessions[0]?.id);
  return <div className="mx-auto max-w-4xl space-y-6" data-testid="board-training-chair-guide" data-no-translate>
    <div className="flex flex-wrap items-center justify-between gap-2"><Button asChild variant="ghost" size="sm"><Link href="/modules/board-training"><ArrowLeft className="mr-2 size-4" />{language === "fr" ? "Formation du conseil" : "Board training"}</Link></Button><Button asChild variant="outline" size="sm"><Link href={`/modules/board-training/chair-guide?lang=${language === "fr" ? "en" : "fr"}`}>{language === "fr" ? "English" : "Français"}</Link></Button></div>
    <header className="space-y-2"><p className="text-xs font-semibold uppercase tracking-widest text-olea-green">{language === "fr" ? "Pour la présidence et les administrateurs" : "For Chairs and administrators"}</p><h1 className="text-3xl font-semibold tracking-tight text-teal-900">{guide.title}</h1><p className="text-slate-600">{guide.subtitle}</p></header>
    {guide.intro.map((paragraph, index) => <p key={index} className="leading-7 text-slate-700">{paragraph}</p>)}
    <Card><CardHeader><CardTitle className="text-lg">{guide.howTo.heading}</CardTitle></CardHeader><CardContent><ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">{guide.howTo.items.map((item, index) => <li key={index}>{item}</li>)}</ul></CardContent></Card>
    <div className="space-y-3">{guide.sessions.map((session) => <Card key={session.id} id={session.id}><CardHeader className="p-0"><Button variant="ghost" className="h-auto w-full justify-between whitespace-normal p-5 text-left" aria-expanded={open === session.id} onClick={() => setOpen(open === session.id ? "" : session.id)}><span><strong>{session.title}</strong><span className="ml-2 text-xs text-slate-500">{session.minutes} min</span></span><ChevronDown className={`size-4 shrink-0 transition-transform ${open === session.id ? "rotate-180" : ""}`} /></Button></CardHeader>{open === session.id && <CardContent className="space-y-4 border-t pt-5 text-sm leading-6"><p><strong>{language === "fr" ? "Quand" : "When"}: </strong>{session.when}</p><p><strong>{language === "fr" ? "Objectif" : "Purpose"}: </strong>{session.purpose}</p><p><strong>{language === "fr" ? "Ouverture" : "Opening"}: </strong>{session.opener}</p><div><strong>{language === "fr" ? "Questions" : "Questions"}</strong><ol className="mt-2 list-decimal space-y-2 pl-5">{session.questions.map((question, index) => <li key={index}>{question}</li>)}</ol></div><p className="rounded-lg bg-teal-50 p-3"><strong>{language === "fr" ? "Conseil" : "Chair’s tip"}: </strong>{session.tip}</p></CardContent>}</Card>)}</div>
    <Card><CardHeader><CardTitle className="text-lg">{guide.capture.heading}</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p>{guide.capture.intro}</p><ol className="list-decimal space-y-2 pl-5">{guide.capture.fields.map((item, index) => <li key={index}>{item}</li>)}</ol></CardContent></Card>
    <p className="text-xs text-slate-500">{guide.currentAsOf}</p>
  </div>;
}
