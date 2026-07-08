import { notFound } from "next/navigation";

import { EmptyPanel } from "@/components/EmptyPanel";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";
import { Badge } from "@/components/ui/badge";
import {
  getIntegrationOperations,
  type IntegrationEventStatus,
} from "@/lib/data/integration-events";

import { ReplayIntegrationEventForm } from "./replay-integration-event-form";

const statusStyles: Record<IntegrationEventStatus, string> = {
  completed: "border-green-200 bg-green-50 text-green-700",
  dead_letter: "border-red-200 bg-red-50 text-red-700",
  failed: "border-amber-200 bg-amber-50 text-amber-700",
  pending: "border-blue-200 bg-blue-50 text-blue-700",
  processing: "border-slate-200 bg-slate-50 text-slate-700",
};

function formatDateTime(value: string | null) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function StatusCard({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${tone}`}>{count}</p>
    </div>
  );
}

export default async function IntegrationOperationsPage() {
  let operations: Awaited<ReturnType<typeof getIntegrationOperations>>;

  try {
    operations = await getIntegrationOperations();
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Only platform administrators") ||
        error.message.includes("Sign in before viewing integration operations"))
    ) {
      notFound();
    }

    throw error;
  }

  return (
    <div>
      <PageHeader
        title="Integration operations"
        description="Inspect Resend, Attio, and QuickBooks outbox events without blocking member-facing flows."
      />

      <div className="mb-8 grid gap-3 md:grid-cols-5">
        <StatusCard
          count={operations.counts.pending}
          label="Pending"
          tone="text-blue-700"
        />
        <StatusCard
          count={operations.counts.processing}
          label="Processing"
          tone="text-slate-700"
        />
        <StatusCard
          count={operations.counts.failed}
          label="Failed"
          tone="text-amber-700"
        />
        <StatusCard
          count={operations.counts.dead_letter}
          label="Dead letter"
          tone="text-red-700"
        />
        <StatusCard
          count={operations.counts.completed}
          label="Completed"
          tone="text-green-700"
        />
      </div>

      <SectionHeading>Recent provider events</SectionHeading>
      {operations.events.length ? (
        <div className="space-y-4">
          {operations.events.map((event) => (
            <article
              key={event.id}
              className="rounded-xl border bg-white p-5 shadow-soft"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-900">
                      {event.eventType}
                    </h2>
                    <Badge
                      variant="outline"
                      className={statusStyles[event.status]}
                    >
                      {event.status.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {event.provider}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {event.aggregateType} · {event.aggregateId}
                  </p>
                </div>
                {["failed", "dead_letter"].includes(event.status) ? (
                  <ReplayIntegrationEventForm eventId={event.id} />
                ) : null}
              </div>

              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <div>
                  <dt className="font-semibold text-slate-500">Attempts</dt>
                  <dd className="text-slate-800">{event.attempts}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Available</dt>
                  <dd className="text-slate-800">
                    {formatDateTime(event.availableAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Completed</dt>
                  <dd className="text-slate-800">
                    {formatDateTime(event.completedAt)}
                  </dd>
                </div>
              </dl>

              {event.lastError ? (
                <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
                  {event.lastError}
                </p>
              ) : null}

              <details className="mt-4 rounded-lg bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  Redacted payload preview
                </summary>
                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-slate-600">
                  {JSON.stringify(event.payloadPreview, null, 2)}
                </pre>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <EmptyPanel
          title="No integration events yet"
          description="Resend, Attio, and QuickBooks events will appear here after they are queued."
        />
      )}
    </div>
  );
}
