import { notFound } from "next/navigation";
import Link from "next/link";

import { EmptyPanel } from "@/components/EmptyPanel";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const providerFilters = [
  { label: "All", value: "all" },
  { label: "Email", value: "email" },
  { label: "Attio", value: "attio" },
  { label: "QuickBooks", value: "quickbooks" },
  { label: "Stripe webhooks", value: "stripe" },
];

const statusFilters = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Processing", value: "processing" },
  { label: "Failed", value: "failed" },
  { label: "Dead letter", value: "dead_letter" },
  { label: "Completed", value: "completed" },
];

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

function getParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function filterHref({
  provider,
  query,
  status,
}: {
  provider: string;
  query: string;
  status: string;
}) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (provider !== "all") params.set("provider", provider);
  if (status !== "all") params.set("status", status);
  const queryString = params.toString();
  return queryString ? `/settings/integrations?${queryString}` : "/settings/integrations";
}

function FilterChip({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Button
      asChild
      size="sm"
      variant={active ? "default" : "outline"}
      className={active ? "" : "bg-white"}
    >
      <Link href={href}>{label}</Link>
    </Button>
  );
}

export default async function IntegrationOperationsPage({
  searchParams = {},
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  let operations: Awaited<ReturnType<typeof getIntegrationOperations>>;
  const query = getParam(searchParams, "q")?.trim() ?? "";
  const provider = getParam(searchParams, "provider")?.trim() ?? "all";
  const status = getParam(searchParams, "status")?.trim() ?? "all";

  try {
    operations = await getIntegrationOperations({
      provider,
      query,
      status: status as IntegrationEventStatus | "all",
    });
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
        description="Search webhooks and provider outbox events without exposing secrets or member document contents."
      />

      <section className="mb-8 rounded-xl border bg-white p-4 shadow-soft">
        <form className="flex flex-col gap-3 md:flex-row" action="/settings/integrations">
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search by event ID, provider message ID, aggregate ID, idempotency key, or error"
            className="md:flex-1"
          />
          {provider !== "all" ? (
            <input type="hidden" name="provider" value={provider} />
          ) : null}
          {status !== "all" ? (
            <input type="hidden" name="status" value={status} />
          ) : null}
          <Button type="submit">Search</Button>
          {query || provider !== "all" || status !== "all" ? (
            <Button asChild variant="outline">
              <Link href="/settings/integrations">Clear</Link>
            </Button>
          ) : null}
        </form>

        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Provider
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {providerFilters.map((filter) => (
                <FilterChip
                  key={filter.value}
                  active={provider === filter.value}
                  label={filter.label}
                  href={filterHref({
                    provider: filter.value,
                    query,
                    status,
                  })}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Outbox status
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {statusFilters.map((filter) => (
                <FilterChip
                  key={filter.value}
                  active={status === filter.value}
                  label={filter.label}
                  href={filterHref({
                    provider,
                    query,
                    status: filter.value,
                  })}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

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

      <SectionHeading>Recent webhooks</SectionHeading>
      {operations.webhookEvents.length ? (
        <div className="mb-8 space-y-4">
          {operations.webhookEvents.map((event) => (
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
                    <Badge variant="outline" className="capitalize">
                      {event.provider}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        event.processingError
                          ? "border-red-200 bg-red-50 text-red-700"
                          : event.processedAt
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                      }
                    >
                      {event.processingError
                        ? "failed"
                        : event.processedAt
                          ? "processed"
                          : "unprocessed"}
                    </Badge>
                  </div>
                  <p className="mt-2 break-all text-sm text-slate-500">
                    Provider event ID: {event.providerEventId}
                  </p>
                </div>
              </div>

              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <div>
                  <dt className="font-semibold text-slate-500">Attempts</dt>
                  <dd className="text-slate-800">{event.attempts}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Received</dt>
                  <dd className="text-slate-800">
                    {formatDateTime(event.receivedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Processed</dt>
                  <dd className="text-slate-800">
                    {formatDateTime(event.processedAt)}
                  </dd>
                </div>
              </dl>

              {event.processingError ? (
                <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
                  {event.processingError}
                </p>
              ) : null}

              <details className="mt-4 rounded-lg bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  Redacted webhook payload preview
                </summary>
                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-slate-600">
                  {JSON.stringify(event.payloadPreview, null, 2)}
                </pre>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <div className="mb-8">
          <EmptyPanel
            title="No matching webhooks"
            description="Stripe webhook records appear here after Stripe sends checkout, invoice, or subscription events."
          />
        </div>
      )}

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
