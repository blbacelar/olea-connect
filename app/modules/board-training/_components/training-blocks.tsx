"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TrainingBlock, TrainingLanguage } from "@/lib/board-training/content";

export function TrainingText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  })}</>;
}

function TrainingScenario({ block, language }: { block: Extract<TrainingBlock, { type: "scenario" }>; language: TrainingLanguage }) {
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const choice = block.choices.find((item) => item.id === choiceId);
  return <Card className="border-amber-200 bg-amber-50/50"><CardContent className="space-y-4 pt-6">
    <div><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber-700">{block.title}</p><p>{block.situation}</p></div>
    <p className="font-semibold">{block.question}</p>
    <div className="grid gap-2">{block.choices.map((option) => <Button key={option.id} type="button" variant={choiceId === option.id ? "default" : "outline"} className="h-auto justify-start whitespace-normal py-3 text-left" aria-pressed={choiceId === option.id} onClick={() => setChoiceId(option.id)}>{option.text}</Button>)}</div>
    {choice && <div role="status" className="rounded-lg border border-slate-200 bg-white p-4 text-sm"><p className="font-semibold">{choice.best ? language === "fr" ? "Meilleur choix" : "Strongest choice" : language === "fr" ? "À reconsidérer" : "Worth reconsidering"}</p><p className="mt-1">{choice.outcome}</p><p className="mt-3 text-slate-600">{block.debrief}</p></div>}
  </CardContent></Card>;
}

export function TrainingBlocks({ blocks, jurisdiction, language }: { blocks: TrainingBlock[]; jurisdiction: string; language: TrainingLanguage }) {
  return <div className="space-y-5 text-[15px] leading-7 text-slate-700">
    {blocks.map((block, index) => {
      if (block.type === "text") return <p key={index}><TrainingText text={block.body} /></p>;
      if (block.type === "keypoints" || block.type === "questions") return <section key={index} className="space-y-2"><h3 className="font-semibold text-slate-900">{block.title}</h3><ul className="list-disc space-y-2 pl-5">{block.items.map((item, itemIndex) => <li key={itemIndex}><TrainingText text={item} /></li>)}</ul></section>;
      if (block.type === "callout") return <aside key={index} className="rounded-xl bg-teal-50 p-4"><h3 className="font-semibold text-teal-900">{block.title}</h3><p><TrainingText text={block.body} /></p></aside>;
      if (block.type === "takeaway") return <aside key={index} className="border-l-4 border-amber-500 py-1 pl-4"><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber-700">{language === "fr" ? "À retenir" : "Key takeaway"}</p><p className="font-medium text-slate-900"><TrainingText text={block.body} /></p></aside>;
      if (block.type === "jurisdiction") return <aside key={index} className="rounded-xl border border-teal-200 bg-white p-5"><h3 className="mb-2 font-semibold text-teal-900">{block.title}</h3><div className="space-y-2">{(block.variants[jurisdiction] ?? block.variants.other ?? []).map((item, itemIndex) => <p key={itemIndex}><TrainingText text={item} /></p>)}</div></aside>;
      if (block.type === "scenario") return <TrainingScenario key={index} block={block} language={language} />;
      return null;
    })}
  </div>;
}
