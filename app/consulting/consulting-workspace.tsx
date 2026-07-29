"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  CalendarClock,
  Clock3,
  FileText,
  Paperclip,
  Send,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  ConsultingHourSummary,
  ConsultingRequest,
  ConsultingRequestStatus,
  ConsultingRequestType,
  ConsultingRequestUrgency,
} from "@/lib/types";
import { cn } from "@/lib/utils";

import {
  createConsultingRequest,
  recordConsultingTime,
  updateConsultingRequest,
  type ConsultingActionState,
} from "./actions";

const initialState: ConsultingActionState = { message: "", status: "idle" };

const requestTypeOptions: Array<{
  value: ConsultingRequestType;
  label: string;
}> = [
  { value: "board_package", label: "Board package" },
  { value: "committee_minutes", label: "Committee minutes" },
  { value: "governance_support", label: "Governance support" },
  { value: "strategy_call", label: "Strategy call" },
  { value: "other", label: "Other" },
];

const urgencyOptions: Array<{ value: ConsultingRequestUrgency; label: string }> = [
  { value: "low", label: "Low" },
  { value: "standard", label: "Standard" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const statusOptions: Array<{ value: ConsultingRequestStatus; label: string }> = [
  { value: "submitted", label: "Submitted" },
  { value: "accepted", label: "Accepted" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateOnly(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function formatHours(minutes: number) {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

function statusBadgeClass(status: ConsultingRequestStatus) {
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "blocked") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "canceled") return "border-slate-200 bg-slate-100 text-slate-500";
  return "border-olea-green/20 bg-olea-light text-olea-green";
}

function SubmitButton({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit">
      {icon}
      {pending ? "Saving..." : children}
    </Button>
  );
}

function ActionMessage({ state }: { state: ConsultingActionState }) {
  if (!state.message) return null;
  return (
    <p
      role="status"
      className={cn(
        "mt-4 rounded-lg p-3 text-sm font-semibold",
        state.status === "success"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-700",
      )}
    >
      {state.message}
    </p>
  );
}

function HourCard({
  label,
  total,
  used,
}: {
  label: string;
  total: number;
  used: number;
}) {
  const remaining = Math.max(total - used, 0);
  const percent = total > 0 ? Math.min((used / total) * 100, 100) : 0;

  return (
    <div className="rounded-xl border bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-900">
        {formatHours(remaining)} remaining
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-olea-green"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {formatHours(used)} used of {formatHours(total)}
      </p>
    </div>
  );
}

function RequestForm() {
  const [state, formAction] = useFormState(createConsultingRequest, initialState);
  const [type, setType] = useState<ConsultingRequestType>("governance_support");
  const [urgency, setUrgency] =
    useState<ConsultingRequestUrgency>("standard");

  return (
    <form
      action={formAction}
      className="rounded-[14px] border bg-white p-5 shadow-soft"
      data-testid="consulting-request-form"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-olea-light text-olea-green">
          <Send className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Request Harvest consulting support
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Share what you need, attach helpful context, and Olea staff will
            triage the next step.
          </p>
        </div>
      </div>

      <input name="type" type="hidden" value={type} />
      <input name="urgency" type="hidden" value={urgency} />

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <Label>Category</Label>
          <Select value={type} onValueChange={(value) => setType(value as ConsultingRequestType)}>
            <SelectTrigger className="mt-2 h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {requestTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Urgency</Label>
          <Select
            value={urgency}
            onValueChange={(value) => setUrgency(value as ConsultingRequestUrgency)}
          >
            <SelectTrigger className="mt-2 h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {urgencyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor="consulting-title">Title</Label>
        <Input
          id="consulting-title"
          name="title"
          placeholder="Board package review, committee minutes, policy question..."
          required
        />
      </div>
      <div className="mt-4">
        <Label htmlFor="consulting-description">Description</Label>
        <Textarea
          id="consulting-description"
          name="description"
          placeholder="Describe the outcome you need, context, deadlines, and any links staff should review."
          required
        />
      </div>
      <div className="mt-4">
        <Label htmlFor="consulting-attachments">Attachments</Label>
        <Input
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg,text/plain"
          id="consulting-attachments"
          multiple
          name="attachments"
          type="file"
        />
        <p className="mt-2 text-xs text-slate-500">
          PDF, Word, Excel, image, or plain text files up to 10 MB each. HTML
          files are not accepted.
        </p>
      </div>
      <div className="mt-5">
        <SubmitButton icon={<Send className="size-4" />}>Submit request</SubmitButton>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

function RequestCard({ request }: { request: ConsultingRequest }) {
  const totalMinutes = request.timeEntries.reduce(
    (total, entry) => total + entry.minutes,
    0,
  );

  return (
    <article className="rounded-[14px] border bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={statusBadgeClass(request.status)}>
              {request.status.replaceAll("_", " ")}
            </Badge>
            <Badge variant="outline">{request.urgency}</Badge>
            <span className="text-xs text-slate-400">
              Updated {formatDate(request.updatedAt)}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-bold text-slate-900">{request.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {request.description}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Scheduled
          </dt>
          <dd className="mt-1 font-semibold text-slate-700">
            {formatDate(request.scheduledAt)}
          </dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Consultant
          </dt>
          <dd className="mt-1 font-semibold text-slate-700">
            {request.assignedToName ?? "Not assigned"}
          </dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Time recorded
          </dt>
          <dd className="mt-1 font-semibold text-slate-700">
            {formatHours(totalMinutes)}
          </dd>
        </div>
      </dl>

      {request.memberNotes ? (
        <p className="mt-4 rounded-lg border border-olea-green/20 bg-olea-light/70 p-3 text-sm text-olea-dark">
          {request.memberNotes}
        </p>
      ) : null}

      {request.attachments.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {request.attachments.map((attachment) =>
            attachment.downloadUrl ? (
              <a
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold text-slate-500 transition-colors hover:border-olea-green hover:text-olea-green"
                href={attachment.downloadUrl}
                key={attachment.id}
                rel="noreferrer"
                target="_blank"
              >
                <Paperclip className="size-3" />
                {attachment.fileName}
              </a>
            ) : (
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold text-slate-400"
                key={attachment.id}
              >
                <Paperclip className="size-3" />
                {attachment.fileName}
              </span>
            ),
          )}
        </div>
      ) : null}

      <div className="mt-4 border-t pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
          Activity history
        </p>
        <ol className="mt-3 space-y-2 text-sm text-slate-600">
          {request.activity.slice(0, 4).map((activity) => (
            <li key={activity.id} className="flex gap-2">
              <span className="mt-1 size-2 rounded-full bg-olea-green" />
              <span>
                {activity.message ?? activity.eventType}{" "}
                <span className="text-slate-400">
                  {formatDate(activity.createdAt)}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}

function RequestsList({ requests }: { requests: ConsultingRequest[] }) {
  if (!requests.length) {
    return (
      <div className="rounded-[14px] border bg-white p-8 text-center shadow-soft">
        <FileText className="mx-auto size-8 text-olea-green" />
        <h2 className="mt-3 text-lg font-bold text-slate-900">
          No consulting requests yet
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Once you submit a request, status updates and time history will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <RequestCard key={request.id} request={request} />
      ))}
    </div>
  );
}

function StaffUpdateForm({
  request,
  staffUsers,
}: {
  request: ConsultingRequest;
  staffUsers: Array<{ id: string; name: string }>;
}) {
  const [state, formAction] = useFormState(updateConsultingRequest, initialState);
  const [status, setStatus] = useState<ConsultingRequestStatus>(request.status);
  const [assignedTo, setAssignedTo] = useState(request.assignedTo ?? "unassigned");

  return (
    <form action={formAction} className="space-y-3 rounded-lg border bg-slate-50 p-4">
      <input name="requestId" type="hidden" value={request.id} />
      <input name="status" type="hidden" value={status} />
      <input
        name="assignedTo"
        type="hidden"
        value={assignedTo === "unassigned" ? "" : assignedTo}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as ConsultingRequestStatus)}
          >
            <SelectTrigger className="mt-2 h-10 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Assigned consultant</Label>
          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger className="mt-2 h-10 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {staffUsers.map((staffUser) => (
                <SelectItem key={staffUser.id} value={staffUser.id}>
                  {staffUser.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={`due-${request.id}`}>Due date</Label>
          <Input
            defaultValue={formatDateTimeInput(request.dueAt)}
            id={`due-${request.id}`}
            name="dueAt"
            type="datetime-local"
          />
        </div>
        <div>
          <Label htmlFor={`scheduled-${request.id}`}>Scheduled call</Label>
          <Input
            defaultValue={formatDateTimeInput(request.scheduledAt)}
            id={`scheduled-${request.id}`}
            name="scheduledAt"
            type="datetime-local"
          />
        </div>
      </div>
      <Label htmlFor={`member-notes-${request.id}`}>Member-facing update</Label>
      <Textarea
        defaultValue={request.memberNotes ?? ""}
        id={`member-notes-${request.id}`}
        name="memberNotes"
        placeholder="What should the member know?"
      />
      <Label htmlFor={`internal-notes-${request.id}`}>Internal notes</Label>
      <Textarea
        defaultValue={request.internalNotes ?? ""}
        id={`internal-notes-${request.id}`}
        name="internalNotes"
        placeholder="Private staff notes"
      />
      <SubmitButton>Update request</SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}

function TimeEntryForm({ requestId }: { requestId: string }) {
  const [state, formAction] = useFormState(recordConsultingTime, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border bg-slate-50 p-4">
      <input name="requestId" type="hidden" value={requestId} />
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <Label htmlFor={`work-date-${requestId}`}>Work date</Label>
          <Input
            defaultValue={new Date().toISOString().slice(0, 10)}
            id={`work-date-${requestId}`}
            name="workDate"
            type="date"
          />
        </div>
        <div>
          <Label htmlFor={`minutes-${requestId}`}>Minutes</Label>
          <Input
            id={`minutes-${requestId}`}
            min={1}
            name="minutes"
            step={1}
            type="number"
          />
        </div>
        <div>
          <Label htmlFor={`in-kind-${requestId}`}>Time type</Label>
          <label
            htmlFor={`in-kind-${requestId}`}
            className="flex h-11 items-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold text-slate-600"
          >
            <input id={`in-kind-${requestId}`} name="isInKind" type="checkbox" />
            In-kind time
          </label>
        </div>
      </div>
      <Label htmlFor={`time-description-${requestId}`}>Work completed</Label>
      <Textarea
        id={`time-description-${requestId}`}
        name="description"
        placeholder="Summarize the work completed for the audit trail."
        required
      />
      <SubmitButton icon={<Clock3 className="size-4" />}>Record time</SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}

function StaffRequestPanel({
  request,
  staffUsers,
}: {
  request: ConsultingRequest;
  staffUsers: Array<{ id: string; name: string }>;
}) {
  return (
    <article className="rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            {request.organizationName} · {request.requestedByName}
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">
            {request.title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {request.description}
          </p>
        </div>
        <Badge variant="outline" className={statusBadgeClass(request.status)}>
          {request.status.replaceAll("_", " ")}
        </Badge>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <StaffUpdateForm request={request} staffUsers={staffUsers} />
        <TimeEntryForm requestId={request.id} />
      </div>
    </article>
  );
}

function StaffQueue({
  requests,
  staffUsers,
}: {
  requests: ConsultingRequest[];
  staffUsers: Array<{ id: string; name: string }>;
}) {
  const openRequests = useMemo(
    () =>
      requests.filter(
        (request) => !["completed", "canceled"].includes(request.status),
      ),
    [requests],
  );

  if (!openRequests.length) {
    return (
      <p className="rounded-lg bg-slate-50 p-5 text-sm text-slate-500">
        No open consulting requests need staff action.
      </p>
    );
  }

  if (openRequests.length === 1) {
    return (
      <StaffRequestPanel request={openRequests[0]} staffUsers={staffUsers} />
    );
  }

  return (
    <Tabs defaultValue={openRequests[0].id} className="space-y-4">
      <div className="overflow-x-auto pb-1">
        <TabsList className="h-auto min-w-max justify-start gap-1 bg-slate-100 p-1">
          {openRequests.map((request, index) => (
            <TabsTrigger
              key={request.id}
              value={request.id}
              className="max-w-[220px] justify-start gap-2 px-3 py-2 text-left"
              title={request.title}
            >
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-slate-500">
                {index + 1}
              </span>
              <span className="truncate">{request.title}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {openRequests.map((request) => (
        <TabsContent key={request.id} value={request.id} className="mt-0">
          <StaffRequestPanel request={request} staffUsers={staffUsers} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function StaffWorkspaceToggle({
  requests,
  staffUsers,
}: {
  requests: ConsultingRequest[];
  staffUsers: Array<{ id: string; name: string }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const openCount = requests.filter(
    (request) => !["completed", "canceled"].includes(request.status),
  ).length;

  return (
    <section className="rounded-[14px] border bg-white p-5 shadow-soft">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-olea-green">
              <ShieldCheck className="size-4" />
              Admin tools
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Consulting staff workspace
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {openCount
                ? `${openCount} open request${openCount === 1 ? "" : "s"} need staff action.`
                : "No open consulting requests need staff action."}
            </p>
          </div>
          <DialogTrigger asChild>
            <Button type="button">Open staff workspace</Button>
          </DialogTrigger>
        </div>
        <DialogContent className="max-w-[min(1120px,calc(100vw-2rem))] p-0">
          <DialogHeader className="border-b bg-slate-50 px-6 py-5 pr-12">
            <p className="flex items-center gap-2 text-sm font-semibold text-olea-green">
              <ShieldCheck className="size-4" />
              Admin tools
            </p>
            <DialogTitle>Consulting staff workspace</DialogTitle>
            <DialogDescription>
              Assign requests, schedule next steps, and record auditable time
              entries without mixing staff triage into the member request page.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(100svh-12rem)] overflow-y-auto p-6">
            <StaffQueue requests={requests} staffUsers={staffUsers} />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function ConsultingWorkspace({
  canManageConsulting,
  hourSummary,
  isHarvestEntitled,
  memberRequests,
  organizationName,
  staffRequests,
  staffUsers,
}: {
  canManageConsulting: boolean;
  hourSummary: ConsultingHourSummary;
  isHarvestEntitled: boolean;
  memberRequests: ConsultingRequest[];
  organizationName: string;
  staffRequests: ConsultingRequest[];
  staffUsers: Array<{ id: string; name: string }>;
}) {
  const purchasedAndIncluded =
    hourSummary.includedMinutes + hourSummary.purchasedMinutes;

  return (
    <div className="space-y-7">
      {isHarvestEntitled ? (
        <>
          <section className="rounded-[14px] border bg-[linear-gradient(120deg,#173F2A_0%,#446B52_100%)] p-6 text-white shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-100">
              Harvest consulting
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              Hands-on support for {organizationName}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50">
              Track included monthly consulting hours, requests, assignments, and
              auditable time history in one place.
            </p>
            <p className="mt-4 flex items-center gap-2 text-sm text-emerald-50">
              <CalendarClock className="size-4" />
              Current period: {formatDateOnly(hourSummary.periodStart)} to{" "}
              {formatDateOnly(hourSummary.periodEnd)}
            </p>
          </section>

          {canManageConsulting ? (
            <StaffWorkspaceToggle requests={staffRequests} staffUsers={staffUsers} />
          ) : null}

          <section className="grid gap-4 md:grid-cols-3">
            <HourCard
              label="Included support"
              total={purchasedAndIncluded}
              used={hourSummary.usedIncludedMinutes}
            />
            <HourCard
              label="In-kind support"
              total={hourSummary.inKindMinutes}
              used={hourSummary.usedInKindMinutes}
            />
            <div className="rounded-xl border bg-white p-4 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                Purchased hours
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatHours(hourSummary.purchasedMinutes)}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Add-on hours are included in the same monthly consumption guard.
              </p>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <RequestForm />
            <section>
              <h2 className="mb-3 text-lg font-bold text-slate-900">
                Your requests
              </h2>
              <RequestsList requests={memberRequests} />
            </section>
          </div>
        </>
      ) : (
        <section className="rounded-[14px] border bg-white p-8 shadow-soft">
          <h2 className="text-xl font-bold text-slate-900">
            Harvest consulting is not included with this membership
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Consulting requests are available to active Harvest organizations.
            Upgrade to Harvest when you are ready for included advisory support,
            purchased consulting hours, and auditable request history.
          </p>
        </section>
      )}
    </div>
  );
}
