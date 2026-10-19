"use client";

import Link from "next/link";
import { Target } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { StrategicGoal, StrategicPlan } from "@/lib/data/strategic-planning";

import { saveStrategicGoal, saveStrategicPlan, type PlanningActionState } from "./actions";

type Data = {
  hasAccess: boolean;
  canManage: boolean;
  plan: StrategicPlan | null;
  goals: StrategicGoal[];
};

const idle: PlanningActionState = { status: "idle", message: "" };
const goalStatuses = [
  { label: "Planned", value: "planned" },
  { label: "On track", value: "on_track" },
  { label: "At risk", value: "at_risk" },
  { label: "Completed", value: "completed" },
];

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Saving..." : label}</Button>;
}

function Notice({ state }: { state: PlanningActionState }) {
  if (!state.message) return null;
  return (
    <p role="status" className={`rounded-lg border p-3 text-sm ${
      state.status === "error"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-green-200 bg-green-50 text-green-800"
    }`}>{state.message}</p>
  );
}

function PlanForm({ plan }: { plan: StrategicPlan | null }) {
  const [state, action] = useFormState(saveStrategicPlan, idle);
  const year = new Date().getUTCFullYear();
  return (
    <form action={action} className="space-y-4">
      <Notice state={state} />
      <label className="block text-sm font-semibold text-slate-700">
        Plan title
        <Input name="title" required minLength={3} maxLength={160}
          defaultValue={plan?.title ?? `${year}–${year + 3} strategic plan`}
          placeholder="2026–2029 strategic plan" className="mt-2" />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Mission
          <Textarea name="mission" maxLength={2000} defaultValue={plan?.mission ?? ""}
            placeholder="What your organization exists to do" className="mt-2 min-h-28" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Vision
          <Textarea name="vision" maxLength={2000} defaultValue={plan?.vision ?? ""}
            placeholder="The change you want to see" className="mt-2 min-h-28" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm font-semibold text-slate-700">
          Starts on
          <Input name="startsOn" type="date" required defaultValue={plan?.startsOn ?? `${year}-01-01`} className="mt-2" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Ends on
          <Input name="endsOn" type="date" required defaultValue={plan?.endsOn ?? `${year + 3}-12-31`} className="mt-2" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Status
          <FormSelect name="status" defaultValue={plan?.status ?? "draft"}
            placeholder="Choose status" options={[
              { label: "Draft", value: "draft" },
              { label: "Board approved", value: "active" },
              { label: "Completed", value: "completed" },
            ]} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Board approval date
          <Input name="approvedOn" type="date" defaultValue={plan?.approvedOn ?? ""} className="mt-2" />
        </label>
      </div>
      <p className="text-xs text-slate-500">Use a planning period of up to five years. Add the board approval date before changing status to Board approved or Completed.</p>
      <SaveButton label={plan ? "Save plan" : "Create plan"} />
    </form>
  );
}

function GoalForm({ goal, plan }: { goal?: StrategicGoal; plan: StrategicPlan }) {
  const [state, action] = useFormState(saveStrategicGoal, idle);
  return (
    <form action={action} className="space-y-4">
      <Input name="goalId" type="hidden" value={goal?.id ?? ""} readOnly />
      <Notice state={state} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-semibold text-slate-700">
          Priority or goal
          <Input name="title" required minLength={3} maxLength={160}
            defaultValue={goal?.title ?? ""} placeholder="Strengthen board succession" className="mt-2" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          How progress will be measured
          <Input name="measure" maxLength={240} defaultValue={goal?.measure ?? ""}
            placeholder="Example: vacancies filled within 90 days" className="mt-2" />
        </label>
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        Intended outcome
        <Textarea name="intendedOutcome" required minLength={3} maxLength={1000}
          defaultValue={goal?.intendedOutcome ?? ""}
          placeholder="Describe the result, not just the activity" className="mt-2" />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-semibold text-slate-700">
          Owner
          <Input name="ownerName" maxLength={160} defaultValue={goal?.ownerName ?? ""}
            placeholder="Board committee or lead" className="mt-2" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Due date
          <Input name="dueOn" type="date" min={plan.startsOn} max={plan.endsOn}
            defaultValue={goal?.dueOn ?? ""} className="mt-2" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Progress
          <FormSelect name="status" defaultValue={goal?.status ?? "planned"}
            placeholder="Choose progress" options={goalStatuses} />
        </label>
      </div>
      <label className="block text-sm font-semibold text-slate-700">
        Progress note
        <Textarea name="progressNote" maxLength={2000}
          defaultValue={goal?.progressNote ?? ""}
          placeholder="Record evidence, blockers, or the next step" className="mt-2" />
      </label>
      <SaveButton label={goal ? "Save goal" : "Add goal"} />
    </form>
  );
}

function GoalEditor({ goal, plan }: { goal?: StrategicGoal; plan: StrategicPlan }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant={goal ? "outline" : "default"} size="sm">
          {goal ? "Edit goal" : "Add goal"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal ? "Edit strategic goal" : "Add a strategic goal"}</DialogTitle>
          <DialogDescription>Describe the outcome, how you will measure it, and who will follow up.</DialogDescription>
        </DialogHeader>
        <GoalForm goal={goal} plan={plan} />
      </DialogContent>
    </Dialog>
  );
}

export function StrategicPlanningWorkspace({ data }: { data: Data }) {
  if (!data.hasAccess) {
    return (
      <div className="space-y-6">
        <PageHeader title="Strategic Planning" description="Turn board priorities into owned, measurable goals." />
        <Card><CardContent className="flex flex-col items-start gap-4 p-6">
          <Target className="size-8 text-olea-green" />
          <p className="text-slate-700">Strategic Planning is included with Canopy or an active add-on.</p>
          <Button asChild><Link href="/subscription">View membership</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Strategic Planning" description="Agree on direction, assign ownership, and review progress in one board-ready place." />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Plan direction</CardTitle>
          {data.plan ? <Badge variant="outline">{data.plan.status.replaceAll("_", " ")}</Badge> : null}
        </CardHeader>
        <CardContent>
          {data.canManage ? <PlanForm plan={data.plan} /> : data.plan ? (
            <div className="space-y-3 text-sm leading-6 text-slate-700">
              <p className="text-lg font-semibold text-slate-900">{data.plan.title}</p>
              <p><strong>Mission:</strong> {data.plan.mission || "Not set"}</p>
              <p><strong>Vision:</strong> {data.plan.vision || "Not set"}</p>
              <p>{data.plan.startsOn} to {data.plan.endsOn}</p>
            </div>
          ) : <p className="text-sm text-slate-600">Your board has not created a strategic plan yet.</p>}
        </CardContent>
      </Card>
      {data.plan ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
            <h2 className="text-xl font-bold text-slate-900">Strategic goals</h2>
            <p className="mt-1 text-sm text-slate-600">Each goal has an outcome, a measure, an owner, and a progress update.</p>
            </div>
            {data.canManage ? <GoalEditor plan={data.plan} /> : null}
          </div>
          {data.goals.length === 0 ? (
            <p className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-600">
              {data.canManage
                ? "No strategic goals yet. Add the first goal to begin tracking progress."
                : "No strategic goals have been added yet."}
            </p>
          ) : null}
          {data.goals.map((goal) => (
            <Card key={goal.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-base">{goal.title}</CardTitle>
                <Badge variant="outline">{goal.status.replaceAll("_", " ")}</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-slate-700">
                  <p>{goal.intendedOutcome}</p>
                  <p><strong>Measure:</strong> {goal.measure || "Not set"}</p>
                  <p><strong>Owner:</strong> {goal.ownerName || "Not set"}</p>
                  <p><strong>Due:</strong> {goal.dueOn || "Not set"}</p>
                  {goal.progressNote ? <p>{goal.progressNote}</p> : null}
                  {data.canManage ? <div className="pt-2"><GoalEditor goal={goal} plan={data.plan!} /></div> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}
    </div>
  );
}
