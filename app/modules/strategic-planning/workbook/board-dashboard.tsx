"use client";

import { useState } from "react";
import Link from "next/link";
import { Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelect } from "@/components/ui/form-select";
import { Textarea } from "@/components/ui/textarea";
import { quarterKeys, type WorkbookAction } from "@/lib/strategic-planning/action-tracker";
import { buildBoardSnapshot, type BoardNarrative } from "@/lib/strategic-planning/board-snapshot";
import type { WorkbookValues } from "@/lib/strategic-planning/workbook";

import { shareStrategicBoardSnapshot } from "./board-actions";

type Snapshot = ReturnType<typeof buildBoardSnapshot>;
const money = (cents: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);

export function BoardSnapshotView({ snapshot }: { snapshot: Snapshot }) {
  return <article className="space-y-5 rounded-xl border bg-white p-5 shadow-sm md:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-olea-green">Strategic plan progress report</p>
        <h2 className="mt-1 text-2xl font-semibold">{snapshot.title}</h2>
        <p className="text-sm text-slate-600">Year {snapshot.year}, Q{snapshot.quarter[3]}
          {snapshot.period ? ` · ${snapshot.period} plan` : ""}
          {snapshot.preparedBy ? ` · Prepared by ${snapshot.preparedBy}` : ""}</p></div>
      <p className="text-lg font-semibold">{snapshot.onTrackPercent}% on track or complete</p>
    </header>
    {!snapshot.actionCount ? <p className="text-sm text-slate-600">No actions yet. Add goals, priorities and actions in Modules 4 to 6, then update the tracker.</p> : <>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries({ Actions: snapshot.actionCount, Green: snapshot.counts.green,
          Yellow: snapshot.counts.yellow, Red: snapshot.counts.red,
          Complete: snapshot.counts.done, "Not updated": snapshot.counts.notUpdated })
          .map(([label, count]) => <Card key={label}><CardContent className="p-3">
            <p className="text-xl font-semibold">{count}</p><p className="text-xs text-slate-500">{label}</p>
          </CardContent></Card>)}
      </div>
      <section><h3 className="font-semibold">Executive summary</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm">{snapshot.executiveSummary || "None this quarter."}</p></section>
      <section className="space-y-2"><h3 className="font-semibold">Progress on our strategic goals</h3>
        {snapshot.goals.map((goal) => <div key={goal.name} className="rounded-lg border p-3 text-sm">
          <strong>{goal.name}</strong><p className="mt-1 text-slate-600">{goal.actionCount} actions · {goal.counts.green} green · {goal.counts.yellow} yellow · {goal.counts.red} red · {goal.counts.done} complete</p>
        </div>)}</section>
      <section><h3 className="font-semibold">Needs board attention</h3>
        {snapshot.attention.length ? <ul className="mt-2 space-y-2">
          {snapshot.attention.map((item, index) => <li key={index} className="rounded-lg border p-3 text-sm">
            <strong>{item.action}</strong> · {item.status} · {item.owner || "No owner"}
            {item.note ? <p className="mt-1">{item.note}</p> : null}
          </li>)}</ul> : <p className="mt-2 text-sm">Nothing is red or yellow this quarter.</p>}
      </section>
      {snapshot.budget.budgetCents ? <section><h3 className="font-semibold">Plan budget: Year {snapshot.year}</h3>
        <div className="mt-2 grid gap-3 text-sm sm:grid-cols-4">
          <p>Budget<br /><strong>{money(snapshot.budget.budgetCents)}</strong></p>
          <p>Spent<br /><strong>{money(snapshot.budget.spentCents)}</strong></p>
          <p>Secured<br /><strong>{money(snapshot.budget.securedCents)}</strong></p>
          <p>To be raised<br /><strong>{money(snapshot.budget.toRaiseCents)}</strong></p>
        </div></section> : null}
      <section><h3 className="font-semibold">Decisions or support needed from the board</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm">{snapshot.decisions || "None this quarter."}</p></section>
      <div className="grid gap-4 sm:grid-cols-2">
        <section><h3 className="font-semibold">Completed this quarter</h3><ul className="mt-2 list-disc pl-5 text-sm">
          {snapshot.wins.map((item, index) => <li key={index}>{item.action} ({item.owner || "no owner"})</li>)}</ul></section>
        <section><h3 className="font-semibold">Coming up {snapshot.nextQuarter || "next"}</h3>
          <ul className="mt-2 list-disc pl-5 text-sm">{snapshot.upcoming.map((item, index) =>
            <li key={index}>{item.action} ({item.owner || "no owner"})</li>)}</ul></section>
      </div>
    </>}
  </article>;
}

export function BoardDashboardEditor({ values, actions, horizon, dirty }: {
  values: WorkbookValues; actions: WorkbookAction[]; horizon: number; dirty: boolean;
}) {
  const [quarter, setQuarter] = useState("y1q1");
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [decisions, setDecisions] = useState("");
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  const narrative: BoardNarrative = { quarter, executiveSummary, decisions };
  const snapshot = buildBoardSnapshot(values, actions, narrative);
  return <div className="space-y-5">
    <Card><CardHeader><CardTitle>Prepare the board dashboard</CardTitle></CardHeader>
      <CardContent className="space-y-4"><p className="text-sm text-slate-600">Choose the quarter, review the progress report, and share a fixed snapshot. Members see the last shared version until you share again.</p>
        <FormSelect name="board-quarter" value={quarter} onValueChange={setQuarter} ariaLabel="Board dashboard quarter"
          placeholder="Choose quarter" options={quarterKeys(horizon).map((key) => ({ value: key,
            label: `Year ${key[1]}, Q${key[3]}` }))} />
        <label className="block text-sm font-medium">Executive summary
          <Textarea value={executiveSummary} maxLength={3000} className="mt-2"
            placeholder="Overall progress this quarter, highlights and concerns."
            onChange={(event) => setExecutiveSummary(event.target.value)} /></label>
        <label className="block text-sm font-medium">Decisions or support needed from the board
          <Textarea value={decisions} maxLength={3000} className="mt-2"
            placeholder="What should the board decide or support?"
            onChange={(event) => setDecisions(event.target.value)} /></label>
        {message ? <p role="status" className="rounded-lg border p-3 text-sm">{message}</p> : null}
        <div className="flex flex-wrap gap-2"><Button type="button" disabled={sharing || dirty}
          onClick={async () => { setSharing(true); setMessage("");
            try { const result = await shareStrategicBoardSnapshot(narrative); setMessage(result.message); }
            catch (error) { setMessage(error instanceof Error ? error.message : "Could not share the dashboard."); }
            finally { setSharing(false); }
          }}><Share2 className="size-4" />{sharing ? "Sharing..." : "Share with board"}</Button>
          <Button asChild type="button" variant="outline"><Link href="/modules/strategic-planning/board">Board view</Link></Button>
          <p className="text-xs text-slate-600">Share this snapshot, then download its branded PDF from Board view.</p></div>
        {dirty ? <p className="text-xs text-slate-600">Save workbook changes before sharing this snapshot.</p> : null}
      </CardContent></Card>
    <BoardSnapshotView snapshot={snapshot} />
  </div>;
}
