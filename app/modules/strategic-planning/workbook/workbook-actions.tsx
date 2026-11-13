"use client";

import { useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  actionCounts, actionInQuarterScope, actionRollup, actionSpentCents,
  effectiveActionStatus, quarterKeys, rolloverUnfinishedActions,
  type WorkbookAction,
} from "@/lib/strategic-planning/action-tracker";
import type { WorkbookValues } from "@/lib/strategic-planning/workbook";

export type ActionEditorProps = {
  actions: WorkbookAction[];
  setActions: (actions: WorkbookAction[]) => void;
  values: WorkbookValues;
  horizon: number;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

function quarterOptions(horizon: number) {
  return quarterKeys(horizon).map((key) => ({
    value: key,
    label: `Year ${key[1]}, Q${key[3]}`,
  }));
}

function CurrencyInput({ value, onChange, label }: {
  value: number;
  onChange: (cents: number) => void;
  label: string;
}) {
  const [draft, setDraft] = useState((value / 100).toFixed(2));
  const [error, setError] = useState("");
  function commit() {
    const amount = Number(draft);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000 ||
      !/^\d+(?:\.\d{1,2})?$/.test(draft)) {
      setError("Enter a CAD amount with up to two decimal places, such as 1250.00.");
      return;
    }
    setError("");
    const cents = Math.round(amount * 100);
    setDraft((cents / 100).toFixed(2));
    onChange(cents);
  }
  return <label className="block space-y-1 text-xs font-medium">{label} (CAD)
    <Input type="text" inputMode="decimal" value={draft} data-currency-field="true"
      onChange={(event) => { setDraft(event.target.value); setError(""); }}
      onBlur={commit} aria-invalid={Boolean(error)} placeholder="0.00" />
    {error ? <span role="alert" className="block text-xs text-red-700">{error}</span> : null}
  </label>;
}

export function WorkbookActions({ actions, setActions, values, horizon }: ActionEditorProps) {
  const goals = Array.from({ length: Number(values["m4.goals:rows"] || 4) }, (_, index) =>
    values[`m4.goals:${index}:0`]).filter(Boolean);
  const priorities = Array.from({ length: Number(values["m5.pri:rows"] || 10) }, (_, index) =>
    values[`m5.pri:${index}:1`]).filter(Boolean);
  function update(id: string, patch: Partial<WorkbookAction>) {
    setActions(actions.map((action) => action.id === id ? { ...action, ...patch } : action));
  }
  function add() {
    setActions([...actions, {
      id: crypto.randomUUID(), year: 1, goal: "", keyPriority: "", action: "New action",
      owner: "", dueQuarter: "", budgetCents: 0, fundingSource: "", fundingStatus: "",
      budgetLine: "",
      carriedFromYear: null, originId: null, updates: [],
    }]);
  }
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">Link each action to a goal and priority, assign an owner and due quarter, and estimate its cost.</p>
      <Button type="button" variant="outline" onClick={add}>Add an action</Button>
    </div>
    {actions.length ? actions.map((action, index) => <Card key={action.id}>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">Action {index + 1}{action.carriedFromYear ? ` · Carried from Year ${action.carriedFromYear}` : ""}</CardTitle>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => setActions(actions.filter((item) => item.id !== action.id))}>Remove</Button>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium">Plan year
          <FormSelect name={`action-year-${action.id}`} value={String(action.year)} ariaLabel="Plan year"
            onValueChange={(value) => update(action.id, { year: Number(value),
              dueQuarter: action.dueQuarter ? `y${value}q${action.dueQuarter[3]}` : "" })} placeholder="Choose year"
            options={Array.from({ length: horizon }, (_, i) => ({ value: String(i + 1), label: `Year ${i + 1}` }))} />
        </label>
        <label className="text-xs font-medium">Goal
          {goals.length ? <FormSelect name={`action-goal-${action.id}`} value={action.goal} ariaLabel="Goal"
            onValueChange={(value) => update(action.id, { goal: value })} placeholder="Choose goal"
            options={goals.map((goal) => ({ value: goal, label: goal }))} /> :
            <Input value={action.goal} maxLength={300} className="mt-2" placeholder="Add goals in Module 4"
              onChange={(event) => update(action.id, { goal: event.target.value })} />}
        </label>
        <label className="text-xs font-medium">Key priority
          {priorities.length ? <FormSelect name={`action-priority-${action.id}`} value={action.keyPriority}
            ariaLabel="Key priority" onValueChange={(value) => {
              const row = Array.from({ length: Number(values["m5.pri:rows"] || 10) }, (_, index) => index)
                .find((index) => values[`m5.pri:${index}:1`] === value);
              update(action.id, { keyPriority: value,
                goal: row === undefined ? action.goal : values[`m5.pri:${row}:0`] || action.goal });
            }}
            placeholder="Choose a priority from Module 5" options={priorities.map((priority) => ({
              value: priority, label: priority,
            }))} /> : <Input value={action.keyPriority} maxLength={300} className="mt-2"
            placeholder="Add priorities in Module 5 first"
            onChange={(event) => update(action.id, { keyPriority: event.target.value })} />}
        </label>
        <label className="text-xs font-medium">Owner
          <Input value={action.owner} maxLength={160} className="mt-2" placeholder="Person responsible"
            onChange={(event) => update(action.id, { owner: event.target.value })} />
        </label>
        <label className="text-xs font-medium sm:col-span-2">Action
          <Textarea value={action.action} minLength={3} maxLength={500} className="mt-2"
            placeholder="What will be done?" onChange={(event) => update(action.id, { action: event.target.value })} />
        </label>
        <label className="text-xs font-medium">Due quarter
          <FormSelect name={`action-due-${action.id}`} value={action.dueQuarter} ariaLabel="Due quarter"
            onValueChange={(value) => update(action.id, { dueQuarter: value,
              year: value ? Number(value[1]) : action.year })} placeholder="Choose quarter"
            options={quarterOptions(horizon)} />
        </label>
        <CurrencyInput key={`${action.id}:budget`} label="Action budget" value={action.budgetCents}
          onChange={(cents) => update(action.id, { budgetCents: cents })} />
        <label className="text-xs font-medium">Funding source
          <FormSelect name={`action-funding-source-${action.id}`} value={action.fundingSource}
            ariaLabel="Funding source" onValueChange={(value) => update(action.id, { fundingSource: value })}
            placeholder="Choose funding source" options={[
              "Operating budget", "Restricted grant", "Donations and fundraising",
              "Government contract", "Earned revenue", "In-kind", "To be determined",
              ...(action.fundingSource && ![
                "Operating budget", "Restricted grant", "Donations and fundraising",
                "Government contract", "Earned revenue", "In-kind", "To be determined",
              ].includes(action.fundingSource) ? [action.fundingSource] : []),
            ].map((value) => ({ value, label: value }))} />
        </label>
        <label className="text-xs font-medium">Funding status
          <FormSelect name={`action-funding-${action.id}`} value={action.fundingStatus} ariaLabel="Funding status"
            onValueChange={(value) => update(action.id, { fundingStatus: value as WorkbookAction["fundingStatus"] })} placeholder="Choose status"
            options={["Secured", "Pending", "To be raised"].map((value) => ({ value, label: value }))} />
        </label>
        <label className="text-xs font-medium">Budget line
          <Input value={action.budgetLine ?? ""} maxLength={160} className="mt-2"
            placeholder="For example, 5200 Programs"
            onChange={(event) => update(action.id, { budgetLine: event.target.value })} />
        </label>
      </CardContent>
    </Card>) : <p className="rounded-lg border border-dashed p-5 text-sm text-slate-500">No actions yet.</p>}
  </div>;
}

export function WorkbookBudget({ actions, horizon, values, setValue, setActions, canExport = false }:
  Pick<ActionEditorProps, "actions" | "horizon"> & { values?: WorkbookValues;
    setValue?: (key: string, value: string) => void; setActions?: ActionEditorProps["setActions"] } &
  { canExport?: boolean }) {
  const [year, setYear] = useState(1);
  const total = actions.reduce((sum, action) => sum + action.budgetCents, 0);
  const spent = actions.reduce((sum, action) => sum + actionSpentCents(action), 0);
  const selected = actions.filter((action) => action.year === year);
  const yearBudget = selected.reduce((sum, action) => sum + action.budgetCents, 0);
  const yearSpent = selected.reduce((sum, action) => sum + actionSpentCents(action), 0);
  const namedGoals = values ? Array.from({ length: Number(values["m4.goals:rows"] || 4) }, (_, index) =>
    values[`m4.goals:${index}:0`]).filter(Boolean) : [];
  const goals = [...new Set([...namedGoals, ...actions.map((action) => action.goal).filter(Boolean)])];
  if (actions.some((action) => !action.goal)) goals.push("Not linked to a goal");
  function changeAction(id: string, patch: Partial<WorkbookAction>) {
    setActions?.(actions.map((action) => action.id === id ? { ...action, ...patch } : action));
  }
  function changeSpent(id: string, quarter: string, spentCents: number) {
    setActions?.(actions.map((action) => {
      if (action.id !== id) return action;
      const existing = action.updates.find((item) => item.quarter === quarter) ??
        { quarter, status: "" as const, note: "", spentCents: 0 };
      return { ...action, updates: [
        ...action.updates.filter((item) => item.quarter !== quarter),
        { ...existing, spentCents },
      ] };
    }));
  }
  return <div className="space-y-4">
    {values && setValue ? <label className="block max-w-md text-sm font-medium">Finance lead
      <Input value={values["m6.finlead"] ?? ""} maxLength={160} className="mt-2"
        placeholder="Person who reviews the plan budget each quarter"
        onChange={(event) => setValue("m6.finlead", event.target.value)} />
      <span className="mt-1 block text-xs text-slate-500">Reviews budgets, funding status and spending each quarter.</span>
    </label> : null}
    {canExport ? <Button asChild variant="outline"><Link href="/api/strategic-planning/data-export?kind=budget"
      target="_blank" rel="noopener noreferrer"><Download className="size-4" />Download budget CSV</Link></Button> :
      <p className="text-xs text-slate-600">Save workbook changes to download the budget CSV.</p>}
    <div className="grid gap-3 sm:grid-cols-3">
      {[{ label: "Total plan budget", value: total }, { label: "Spent to date", value: spent },
        { label: "Remaining", value: total - spent }].map((item) => <Card key={item.label}>
        <CardContent className="p-4"><p className="text-xs text-slate-500">{item.label}</p>
          <p className="mt-1 text-xl font-semibold">{money(item.value)}</p></CardContent>
      </Card>)}
    </div>
    <section className="space-y-2"><h3 className="font-semibold">Budget by goal and year</h3>
      {!actions.some((action) => action.budgetCents) ? <p className="text-sm text-slate-600">No budgets entered yet. Add a budget to each action in Module 6A.</p> : null}
      <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow>
        <TableHead>Strategic goal</TableHead>{Array.from({ length: horizon }, (_, index) =>
          <TableHead key={index}>Year {index + 1}</TableHead>)}<TableHead>Total</TableHead>
      </TableRow></TableHeader><TableBody>{goals.map((goal) => <TableRow key={goal}>
        <TableCell>{goal}</TableCell>{Array.from({ length: horizon }, (_, index) => <TableCell key={index}>
          {money(actions.filter((action) => (goal === "Not linked to a goal" ? !action.goal : action.goal === goal) && action.year === index + 1)
            .reduce((sum, action) => sum + action.budgetCents, 0))}</TableCell>)}
        <TableCell>{money(actions.filter((action) => goal === "Not linked to a goal" ? !action.goal : action.goal === goal)
          .reduce((sum, action) => sum + action.budgetCents, 0))}</TableCell>
      </TableRow>)}<TableRow><TableCell className="font-semibold">Total</TableCell>
        {Array.from({ length: horizon }, (_, index) => <TableCell key={index}>
          {money(actions.filter((action) => action.year === index + 1)
            .reduce((sum, action) => sum + action.budgetCents, 0))}</TableCell>)}
        <TableCell>{money(total)}</TableCell></TableRow></TableBody></Table></div>
    </section>
    <section className="space-y-2"><h3 className="font-semibold">Funding status by year</h3>
      <p className="text-sm text-slate-600">How much of each year&apos;s budget is secured, pending, or still to be raised.</p>
      <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow>
        <TableHead>Funding status</TableHead>{Array.from({ length: horizon }, (_, index) =>
          <TableHead key={index}>Year {index + 1}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{["Secured", "Pending", "To be raised", "Not set"].map((status) => <TableRow key={status}>
          <TableCell>{status}</TableCell>{Array.from({ length: horizon }, (_, index) => <TableCell key={index}>
            {money(actions.filter((action) => action.year === index + 1 &&
              (status === "Not set" ? !action.fundingStatus : action.fundingStatus === status))
              .reduce((sum, action) => sum + action.budgetCents, 0))}</TableCell>)}
        </TableRow>)}</TableBody></Table></div>
    </section>
    {Array.from({ length: horizon }, (_, index) => {
      const yearActions = actions.filter((action) => action.year === index + 1);
      const yearBudget = yearActions.reduce((sum, action) => sum + action.budgetCents, 0);
      const yearSpent = yearActions.reduce((sum, action) => sum + actionSpentCents(action), 0);
      return <div key={index} className="flex flex-wrap justify-between gap-2 rounded-lg border bg-white p-4 text-sm">
        <strong>Year {index + 1}</strong><span>{yearActions.length} actions</span>
        <span>Budget {money(yearBudget)}</span><span>Spent {money(yearSpent)}</span>
      </div>;
    })}
    <div className="max-w-xs"><label className="text-sm font-medium">Plan budget year
      <FormSelect name="budget-year" value={String(year)} ariaLabel="Plan budget year"
        onValueChange={(next) => setYear(Number(next))} placeholder="Choose year"
        options={Array.from({ length: horizon }, (_, index) => ({ value: String(index + 1), label: `Year ${index + 1}` }))} />
    </label></div>
    <Card><CardContent className="grid gap-3 p-5 text-sm sm:grid-cols-3">
      <p><strong>Year {year} budget:</strong> {money(yearBudget)}</p>
      <p><strong>Spent:</strong> {money(yearSpent)}</p>
      <p><strong>Remaining:</strong> {money(yearBudget - yearSpent)}</p>
      {(["Secured", "Pending", "To be raised"] as const).map((status) => <p key={status}>
        <strong>{status}:</strong> {money(selected.filter((action) => action.fundingStatus === status)
          .reduce((sum, action) => sum + action.budgetCents, 0))}
      </p>)}
    </CardContent></Card>
    <section className="space-y-3"><h3 className="font-semibold">Year {year}: budget and spending by action</h3>
      {selected.length ? selected.map((action) => <Card key={action.id}><CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <strong>{action.action}</strong>
          <span>{action.goal || "No goal"} · {action.keyPriority || "No priority"} · {action.owner || "No owner"}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium">Budget line
            <Input value={action.budgetLine ?? ""} maxLength={160} className="mt-2" disabled={!setActions}
              placeholder="For example, 5200 Programs"
              onChange={(event) => changeAction(action.id, { budgetLine: event.target.value })} />
          </label>
          {setActions ? <CurrencyInput key={`${action.id}:budget-view`} label="Budget" value={action.budgetCents}
            onChange={(cents) => changeAction(action.id, { budgetCents: cents })} /> :
            <p className="text-xs"><strong>Budget:</strong> {money(action.budgetCents)}</p>}
          {Array.from({ length: 4 }, (_, quarterIndex) => {
            const quarter = `y${year}q${quarterIndex + 1}`;
            const quarterSpent = action.updates.find((item) => item.quarter === quarter)?.spentCents ?? 0;
            return setActions ? <CurrencyInput key={`${action.id}:${quarter}:budget-view`}
              label={`Spent in Year ${year} Q${quarterIndex + 1}`} value={quarterSpent}
              onChange={(cents) => changeSpent(action.id, quarter, cents)} /> :
              <p key={quarter} className="text-xs">Q{quarterIndex + 1} spent: {money(quarterSpent)}</p>;
          })}
        </div>
        <p className="text-xs text-slate-600">Funding: {action.fundingSource || "Not set"} · {action.fundingStatus || "Not set"} · Spent to date {money(actionSpentCents(action))} · Remaining {money(action.budgetCents - actionSpentCents(action))}</p>
        {actionSpentCents(action) > action.budgetCents ? <Badge variant="outline" className="border-red-300 text-red-700">
          {action.budgetCents ? `Over by ${money(actionSpentCents(action) - action.budgetCents)}` : "No budget set"}
        </Badge> : null}
      </CardContent></Card>) : <p className="rounded-lg border border-dashed p-5 text-sm text-slate-500">No Year {year} actions yet. Add actions in Module 6A.</p>}
    </section>
    {values && setValue ? <section className="space-y-3 rounded-lg border bg-white p-5">
      <h3 className="font-semibold">Finance review: Year {year}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">Reviewed by the finance committee on
          <Input type="date" className="mt-2" value={values[`m6.fin.y${year}.date`] || ""}
            onChange={(event) => setValue(`m6.fin.y${year}.date`, event.target.value)} />
        </label>
        <label className="text-sm font-medium">Year {year} actions included in the annual budget
          <FormSelect name={`m6.fin.y${year}.inbudget`} value={values[`m6.fin.y${year}.inbudget`] || ""}
            onValueChange={(value) => setValue(`m6.fin.y${year}.inbudget`, value)}
            placeholder="Choose status" options={["Yes", "Partly", "Not yet"].map((value) => ({ value, label: value }))} />
        </label>
      </div>
      <label className="block text-sm font-medium">Notes and decisions
        <Textarea className="mt-2" maxLength={3000} rows={3}
          value={values[`m6.fin.y${year}.notes`] || ""}
          placeholder="Record finance committee decisions and any budget changes"
          onChange={(event) => setValue(`m6.fin.y${year}.notes`, event.target.value)} />
      </label>
    </section> : null}
  </div>;
}

const statusOptions = [
  { value: "green", label: "Green: on track" }, { value: "yellow", label: "Yellow: at risk" },
  { value: "red", label: "Red: off track" }, { value: "done", label: "Complete" },
];

export function WorkbookTracker({ actions, setActions, horizon, canExport = false }: ActionEditorProps & { canExport?: boolean }) {
  const [quarter, setQuarter] = useState("y1q1");
  const [owner, setOwner] = useState("all");
  const [scope, setScope] = useState("year");
  const owners = [...new Set(actions.map((action) => action.owner).filter(Boolean))];
  const shown = actions.filter((action) => (owner === "all" || action.owner === owner) &&
    (scope === "all" || actionInQuarterScope(action, quarter)));
  const counts = actionCounts(shown, quarter);
  function update(id: string, patch: { status?: WorkbookAction["updates"][number]["status"];
    note?: string; spentCents?: number }) {
    setActions(actions.map((action) => {
      if (action.id !== id) return action;
      const existing = action.updates.find((item) => item.quarter === quarter) ??
        { quarter, status: "" as const, note: "", spentCents: 0 };
      return { ...action, updates: [
        ...action.updates.filter((item) => item.quarter !== quarter),
        { ...existing, ...patch },
      ] };
    }));
  }
  return <div className="space-y-5">
    {canExport ? <Button asChild variant="outline"><Link
      href={`/api/strategic-planning/data-export?kind=tracker&quarter=${quarter}`}
      target="_blank" rel="noopener noreferrer"><Download className="size-4" />Download tracker CSV</Link></Button> :
      <p className="text-xs text-slate-600">Save workbook changes to download the tracker CSV.</p>}
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="text-sm font-medium">Quarter
        <FormSelect name="tracker-quarter" value={quarter} ariaLabel="Quarter"
          onValueChange={setQuarter} placeholder="Choose quarter" options={quarterOptions(horizon)} />
      </label>
      <label className="text-sm font-medium">Show owner
        <FormSelect name="tracker-owner" value={owner} ariaLabel="Show owner"
          onValueChange={setOwner} placeholder="All owners"
          options={[{ value: "all", label: "All owners" }, ...owners.map((name) => ({ value: name, label: name }))]} />
      </label>
      <label className="text-sm font-medium">Actions
        <FormSelect name="tracker-scope" value={scope} ariaLabel="Actions"
          onValueChange={setScope} placeholder="Choose scope" options={[
            { value: "year", label: `Year ${quarter[1]} plus unfinished earlier work` },
            { value: "all", label: "All years" },
          ]} />
      </label>
    </div>
    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {Object.entries({ total: shown.length, ...counts }).map(([label, count]) => <Card key={label}>
        <CardContent className="p-3"><p className="text-xl font-semibold">{count}</p>
          <p className="text-xs capitalize text-slate-500">{label.replaceAll(/([A-Z])/g, " $1")}</p></CardContent>
      </Card>)}
    </div>
    {shown.length ? shown.map((action) => {
      const updateRow = action.updates.find((item) => item.quarter === quarter);
      const effective = effectiveActionStatus(action, quarter);
      return <Card key={action.id}>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{action.action}</CardTitle>
          <Badge variant="outline">{effective || "Not updated"}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-600">{action.goal || "No goal"} · {action.keyPriority || "No priority"} · {action.owner || "No owner"}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-medium">Status this quarter
              <FormSelect name={`status-${action.id}`} value={updateRow?.status ?? ""} ariaLabel="Status this quarter"
                onValueChange={(value) => update(action.id, { status: value as WorkbookAction["updates"][number]["status"] })}
                placeholder="Not updated" options={statusOptions} />
            </label>
            <CurrencyInput key={`${action.id}:${quarter}:spent`} label="Spent this quarter"
              value={updateRow?.spentCents ?? 0} onChange={(cents) => update(action.id, { spentCents: cents })} />
            <label className="text-xs font-medium">Update and next step
              <Textarea value={updateRow?.note ?? ""} maxLength={1000} className="mt-2"
                placeholder="Progress and next step" onChange={(event) => update(action.id, { note: event.target.value })} />
            </label>
          </div>
          <p className="text-xs text-slate-600">Budget {money(action.budgetCents)} · Spent to date {money(actionSpentCents(action))}</p>
        </CardContent>
      </Card>;
    }) : <p className="rounded-lg border border-dashed p-5 text-sm text-slate-500">No actions in this view. Add them in Module 6.</p>}
    <p className="text-sm text-slate-600">Overall status: {actionRollup(shown, quarter) || "Not updated"}</p>
  </div>;
}

export function WorkbookRollover({ actions, setActions, horizon }: ActionEditorProps) {
  const [year, setYear] = useState(1);
  return <div className="space-y-3">
    <p className="text-sm text-slate-600">Carry unfinished Year {year} actions into Year {year + 1}. Completed actions stay in their original year.</p>
    <FormSelect name="rollover-year" value={String(year)} ariaLabel="Year to carry forward"
      onValueChange={(value) => setYear(Number(value))} placeholder="Choose year"
      options={Array.from({ length: horizon - 1 }, (_, index) => ({ value: String(index + 1), label: `Year ${index + 1}` }))} />
    <Button type="button" variant="outline" onClick={() => setActions(rolloverUnfinishedActions(actions, year))}>
      Carry unfinished actions forward
    </Button>
  </div>;
}
