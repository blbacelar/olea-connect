import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { BoardTrainingLocked } from "@/app/modules/board-training/_components/board-training-locked";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getChairGuide } from "@/lib/board-training/content";
import { getTrainingReport, hasTrainingAccess } from "@/lib/data/board-training";
import { getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function BoardTrainingReportPage() {
  const french = (await getRequestLocale()) === "fr-CA";
  if (!(await hasTrainingAccess())) return <BoardTrainingLocked language={french ? "fr" : "en"} />;
  const { report, completedCount, topics } = await getTrainingReport(french ? "fr" : "en");
  const chairSessions = getChairGuide(french ? "fr" : "en").sessions;
  const chairSessionByTopic: Record<string, string> = { l1: "s0", l2: "s3", l3: "s3", l4: "s2", l5: "s2", l6: "s3", l7: "s5", l8: "s4" };
  const rows = report?.topics.map((topic) => ({ ...topic, label: topics.find((item) => item.id === topic.id)?.label ?? topic.id })) ?? [];
  const ranked = [...rows].sort((a, b) => ((a.after ?? 0) / 5 * 50 + (a.assessmentPercent ?? 0) / 2) - ((b.after ?? 0) / 5 * 50 + (b.assessmentPercent ?? 0) / 2));
  return <div className="mx-auto max-w-4xl space-y-6" data-testid="board-training-report" data-no-translate>
    <Button asChild variant="ghost" size="sm"><Link href="/modules/board-training"><ArrowLeft className="mr-2 size-4" />{french ? "Formation du conseil" : "Board training"}</Link></Button>
    <header><p className="text-xs font-semibold uppercase tracking-widest text-olea-green">Olea Connects</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-teal-900">{french ? "Rapport de préparation du conseil" : "Board readiness report"}</h1><p className="mt-2 text-slate-600">{french ? "Résultats regroupés et anonymes. Les réponses individuelles ne sont pas affichées." : "Anonymous combined results. Individual answers are never shown."}</p></header>
    {!report ? <Card><CardContent className="py-8"><p>{french ? `Le rapport apparaît après trois membres ayant terminé la formation. À ce jour : ${completedCount}.` : `The report appears after three directors complete the course. So far: ${completedCount}.`}</p></CardContent></Card> : <>
      <p className="text-sm text-slate-600">{french ? `Selon ${report.respondents} membres` : `Based on ${report.respondents} directors`}</p>
      <Card><CardHeader><CardTitle className="text-lg">{french ? "Aisance et évaluation" : "Confidence and assessment"}</CardTitle></CardHeader><CardContent className="space-y-4">{rows.map((row) => <div key={row.id} className="grid gap-1 border-b pb-3 text-sm sm:grid-cols-[1fr_auto]"><p className="font-medium">{row.label}</p><p className="font-semibold tabular-nums">{row.assessmentPercent ?? "—"}%</p><p className="text-slate-600 sm:col-span-2">{french ? "Avant" : "Before"}: {row.before?.toFixed(1) ?? "—"} / 5 · {french ? "Après" : "After"}: {row.after?.toFixed(1) ?? "—"} / 5</p></div>)}</CardContent></Card>
      <div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle className="text-lg">{french ? "Forces" : "Strengths"}</CardTitle></CardHeader><CardContent><ul className="list-disc space-y-2 pl-5">{ranked.slice(-2).reverse().map((row) => <li key={row.id}>{row.label}</li>)}</ul></CardContent></Card><Card><CardHeader><CardTitle className="text-lg">{french ? "Où concentrer vos efforts" : "Where to focus next"}</CardTitle></CardHeader><CardContent><ul className="list-disc space-y-3 pl-5">{ranked.slice(0, 2).map((row) => { const sessionId = chairSessionByTopic[row.id] ?? "s0"; const session = chairSessions.find((item) => item.id === sessionId); return <li key={row.id}>{row.label}<p><Link className="text-sm font-medium text-teal-800 underline" href={`/modules/board-training/chair-guide?session=${sessionId}`}>{french ? "Séance suggérée" : "Suggested discussion"}: {session?.title}</Link></p></li>; })}</ul></CardContent></Card></div>
      <Card><CardHeader><CardTitle className="text-lg">{french ? "Engagements communs" : "Common commitments"}</CardTitle></CardHeader><CardContent>{report.commitments.length ? <ul className="list-disc space-y-2 pl-5">{report.commitments.map(([commitment, count]) => <li key={commitment}>{commitment} · {count}</li>)}</ul> : <p className="text-sm text-slate-600">{french ? "Aucun engagement partagé par trois membres ou plus." : "No commitment shared by three or more directors."}</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-lg">{french ? "Suivi des actions de l’an dernier" : "Follow-through from last year"}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{(["done", "partly", "not_yet"] as const).map((status) => { const count = report.followUp[status]; const label = status === "done" ? french ? "Fait" : "Done" : status === "partly" ? french ? "En partie" : "Partly" : french ? "Pas encore" : "Not yet"; return <p key={status}>{label}: {count === null ? french ? "masqué (moins de trois réponses)" : "hidden (fewer than three responses)" : count}</p>; })}</CardContent></Card>
    </>}
  </div>;
}
