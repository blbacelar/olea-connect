"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { stakeholderAudiences, stakeholderQuestionBank, type StakeholderQuestion } from "@/lib/strategic-planning/stakeholder-survey";
import type { WorkbookValues } from "@/lib/strategic-planning/workbook";
import { mergeStakeholderSummary } from "@/lib/strategic-planning/stakeholder-results";

type Props = { values: WorkbookValues; setValue: (key: string, value: string) => void;
  surveyQuestions: StakeholderQuestion[]; onlineResponseCounts: Record<string, number> };
const responseGroups = [...stakeholderAudiences.map((audience) => ({ id: audience.v, label: audience.l })),
  { id: "everyone", label: "General survey" }, { id: "paper", label: "Paper or other responses" }];

export function WorkbookSurveyResults({ values, setValue, surveyQuestions, onlineResponseCounts }: Props) {
  const [notice, setNotice] = useState("");
  const questions = surveyQuestions.length ? surveyQuestions : stakeholderQuestionBank
    .filter((question) => question.on && (!question.eq || values["set.equity"] !== "off"))
    .map((question) => ({ id: question.id, text: question.q.replaceAll("{org}", values["org.name"] || "your organization") }));
  const total = responseGroups.reduce((sum, group) => sum + (group.id in onlineResponseCounts ?
    onlineResponseCounts[group.id] : Number(values[`m2.sv.resp.${group.id}`] || 0)), 0);
  function addToHeard() {
    const lines = questions.flatMap((question) => {
      const prefix = `m2.sv.res.${question.id}`;
      const result = values[`${prefix}.result`]?.trim();
      const themes = values[`${prefix}.themes`]?.trim();
      return result || themes ? [`${question.text}: ${[result, themes].filter(Boolean).join(" — ")}`] : [];
    });
    if (!lines.length) { setNotice("Enter at least one result or theme first."); return; }
    const current = values["m2.heard"]?.trim() || "";
    const summary = `From our stakeholder survey (${total} responses)\n${lines.join("\n")}`;
    const next = mergeStakeholderSummary(current, summary);
    if (next.length > 30000) {
      setNotice("The Module 2D summary is too long. Shorten the results before adding them."); return;
    }
    setValue("m2.heard", next);
    setNotice("Results added to What we heard (2D). Save the workbook to keep them.");
  }
  return <Card><CardHeader><CardTitle>6. Review your stakeholder survey results</CardTitle></CardHeader>
    <CardContent className="space-y-5">
      <p className="text-sm text-slate-600">Record online, paper, or externally collected responses. Add the result and key themes for each question, then bring your summary into Module 2D.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {responseGroups.map((group) => <label key={group.id} className="text-sm font-medium">{group.label}
          {group.id in onlineResponseCounts ? <span className="ml-1 text-xs text-slate-500">(online)</span> : null}
          <Input className="mt-1" type="number" inputMode="numeric" min={0} max={1000000} step={1}
            value={group.id in onlineResponseCounts ? onlineResponseCounts[group.id] : values[`m2.sv.resp.${group.id}`] || ""}
            disabled={group.id in onlineResponseCounts} placeholder="0 responses"
            onChange={(event) => setValue(`m2.sv.resp.${group.id}`, event.target.value)} />
        </label>)}
      </div>
      <p className="font-semibold">Total responses: {total}</p>
      <div className="space-y-3">
        {questions.map((question) => {
          const prefix = `m2.sv.res.${question.id}`;
          return <div key={question.id} className="rounded-lg border p-3">
            <h3 className="text-sm font-medium">{question.text}</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-[8rem_1fr_1fr]">
              <label className="text-xs font-medium">Responses
                <Input className="mt-1" type="number" inputMode="numeric" min={0} max={1000000} step={1}
                  value={values[`${prefix}.n`] || ""} placeholder="0"
                  onChange={(event) => setValue(`${prefix}.n`, event.target.value)} />
              </label>
              <label className="text-xs font-medium">Result
                <Textarea className="mt-1" rows={2} maxLength={2000}
                  value={values[`${prefix}.result`] || ""} placeholder="For example: 78% agree"
                  onChange={(event) => setValue(`${prefix}.result`, event.target.value)} />
              </label>
              <label className="text-xs font-medium">Key themes
                <Textarea className="mt-1" rows={2} maxLength={2000}
                  value={values[`${prefix}.themes`] || ""} placeholder="Two or three themes you heard most"
                  onChange={(event) => setValue(`${prefix}.themes`, event.target.value)} />
              </label>
            </div>
          </div>;
        })}
      </div>
      {notice ? <p role="status" className="rounded-lg border p-3 text-sm">{notice}</p> : null}
      <Button type="button" onClick={addToHeard}>Add these results to What we heard (2D)<ArrowRight className="size-4" /></Button>
    </CardContent></Card>;
}
