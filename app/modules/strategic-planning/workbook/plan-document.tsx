"use client";

import Link from "next/link";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { WorkbookAction } from "@/lib/strategic-planning/action-tracker";
import { buildStrategicPlan, type PlanBlock } from "@/lib/strategic-planning/workbook-plan";
import type { WorkbookValues } from "@/lib/strategic-planning/workbook";

function PlanContentBlock({ block }: { block: PlanBlock }) {
  return <div className="space-y-2">
    {block.label ? <h4 className="font-semibold">{block.label}</h4> : null}
    {block.kind === "text" ? <p className="whitespace-pre-wrap text-sm leading-6">{block.value}</p> :
      <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow>
        {block.headers.map((heading) => <TableHead key={heading}>{heading}</TableHead>)}
      </TableRow></TableHeader><TableBody>
        {block.rows.map((row, index) => <TableRow key={index}>{row.map((value, column) =>
          <TableCell key={column} className="whitespace-pre-wrap align-top">{value}</TableCell>)}</TableRow>)}
      </TableBody></Table></div>}
  </div>;
}

export function PlanDocument({ values, actions, canExport }: { values: WorkbookValues; actions: WorkbookAction[]; canExport: boolean }) {
  const plan = buildStrategicPlan(values, actions);
  return <div className="space-y-5">
    <style>{`@media print { body:has(#strategic-plan-document) * { visibility: hidden !important; } #strategic-plan-document, #strategic-plan-document * { visibility: visible !important; } #strategic-plan-document { position: absolute; left: 0; top: 0; width: 100%; border: 0; box-shadow: none; } .plan-todo { display: none !important; } }`}</style>
    <Card className="print:hidden"><CardContent className="space-y-4 p-5">
      <div><h2 className="text-lg font-semibold">Plan readiness: {plan.ready} of {plan.sections.length} sections ready</h2>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-olea-green"
          style={{ width: `${Math.round(plan.ready / plan.sections.length * 100)}%` }} /></div>
        <p className="mt-3 text-sm text-slate-600">Sections marked To complete show which module to work on next. Save workbook changes before downloading the branded PDF.</p></div>
      <div className="flex flex-wrap gap-2">
        {canExport ? <Button asChild><Link href="/api/strategic-planning/export?kind=plan" target="_blank" rel="noopener noreferrer">
          <Download className="size-4" />Download branded PDF</Link></Button> :
          <Button type="button" disabled><Download className="size-4" />Save to download PDF</Button>}
        {canExport ? <Button asChild variant="outline"><Link href="/api/strategic-planning/export?kind=plan&format=html"
          target="_blank" rel="noopener noreferrer"><Download className="size-4" />Download HTML</Link></Button> : null}
        {canExport ? <Button asChild variant="outline"><Link href="/api/strategic-planning/export?kind=summary"
          target="_blank" rel="noopener noreferrer"><Download className="size-4" />Download one-page summary</Link></Button> : null}
      </div>
    </CardContent></Card>
    <article id="strategic-plan-document" className="space-y-8 rounded-xl border bg-white p-5 shadow-sm md:p-8">
      <header className="border-b pb-6"><p className="text-xs font-semibold uppercase tracking-widest text-olea-green">Strategic plan</p>
        <h2 className="mt-2 text-3xl font-semibold">{plan.organization}</h2>
        <p className="mt-1 text-sm">{plan.horizon}-year strategic plan{plan.period ? ` · ${plan.period}` : ""}</p>
        {plan.approvedOn ? <p className="mt-2 text-sm">Approved by the Board of Directors on {plan.approvedOn}</p> : null}</header>
      <section className="space-y-4"><h3 className="text-xl font-semibold">At a glance</h3>
        <div className="grid gap-4 sm:grid-cols-2"><div><h4 className="font-semibold">Our mission</h4><p className="whitespace-pre-wrap text-sm">{plan.mission || "Add in Module 3B"}</p></div>
          <div><h4 className="font-semibold">Our vision</h4><p className="whitespace-pre-wrap text-sm">{plan.vision || "Add in Module 3B"}</p></div></div>
        <h4 className="font-semibold">Our strategic goals</h4>
        {plan.goals.length ? plan.goals.map((goal, index) => <div key={index} className="rounded-lg border p-3">
          <p className="text-xs font-semibold">Goal {index + 1}</p><p className="font-medium">{goal.title}</p>
          {goal.outcome ? <p className="mt-1 text-sm">{goal.outcome}</p> : null}
          {goal.priorities.length ? <ul className="mt-2 list-disc pl-5 text-sm">{goal.priorities.map((priority) => <li key={priority}>{priority}</li>)}</ul> :
            <p className="mt-1 text-xs text-slate-500 print:hidden">Add key priorities in Module 5A.</p>}
        </div>) : <p className="text-sm text-slate-500">Add your goals in Module 4B.</p>}
        <h4 className="font-semibold">Our values</h4>{plan.values.length ?
          <ul className="list-disc pl-5 text-sm">{plan.values.map((value) => <li key={value}>{value}</li>)}</ul> :
          <p className="text-sm text-slate-500">Add values in Module 3C.</p>}
      </section>
      {plan.sections.map((section) => <section key={section.title} className={`space-y-3 border-t pt-6 ${section.ready ? "" : "plan-todo"}`}>
        <h3 className="text-xl font-semibold">{section.title}{!section.ready ?
          <span className="ml-2 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">To complete</span> : null}</h3>
        {section.ready ? section.blocks.map((block, index) => <PlanContentBlock key={index} block={block} />) :
          <p className="text-sm text-slate-500">This section fills in from {section.source}.</p>}
      </section>)}
    </article>
  </div>;
}
