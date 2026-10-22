import { EmptyPanel } from "@/components/EmptyPanel";
import { SectionHeading } from "@/components/SectionHeading";
import { Badge } from "@/components/ui/badge";
import {
  type IntegrationEventStatus,
  type getIntegrationOperations,
} from "@/lib/data/integration-events";

import { ReplayIntegrationEventForm } from "./replay-integration-event-form";

type IntegrationOperations = Awaited<ReturnType<typeof getIntegrationOperations>>;

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

export function WebhookEvents({
  events,
}: {
  events: IntegrationOperations["webhookEvents"];
}) {
  return (
    <>
      <SectionHeading>Recent webhooks</SectionHeading>
      {events.length ? (
        <div className="mb-8 space-y-4">
          {events.map((event) => (
            <article key={event.id} className="rounded-xl border bg-white p-5 shadow-soft">
              <EventHeading
                badges={[
                  { label: event.provider, style: "capitalize" },
                  getWebhookStatusBadge(event),
                ]}
                title={event.eventType}
              />
              <p className="mt-2 break-all text-sm text-slate-500">
                Provider event ID: {event.providerEventId}
              </p>
              <EventMetadata
                items={[
                  { label: "Attempts", value: String(event.attempts) },
                  { label: "Received", value: formatDateTime(event.receivedAt) },
                  { label: "Processed", value: formatDateTime(event.processedAt) },
                ]}
              />
              {event.processingError ? (
                <EventError message={event.processingError} />
              ) : null}
              <PayloadPreview label="Redacted webhook payload preview" payload={event.payloadPreview} />
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
    </>
  );
}

export function ProviderEvents({
  events,
}: {
  events: IntegrationOperations["events"];
}) {
  return (
    <>
      <SectionHeading>Recent provider events</SectionHeading>
      {events.length ? (
        <div className="space-y-4">
          {events.map((event) => (
            <article key={event.id} className="rounded-xl border bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <EventHeading
                    badges={[
                      {
                        label: event.status.replace("_", " "),
                        style: statusStyles[event.status],
                      },
                      { label: event.provider, style: "capitalize" },
                    ]}
                    title={event.eventType}
                  />
                  <p className="mt-2 text-sm text-slate-500">
                    {event.aggregateType} · {event.aggregateId}
                  </p>
                </div>
                {["failed", "dead_letter"].includes(event.status) ? (
                  <ReplayIntegrationEventForm eventId={event.id} />
                ) : null}
              </div>
              <EventMetadata
                items={[
                  { label: "Attempts", value: String(event.attempts) },
                  { label: "Available", value: formatDateTime(event.availableAt) },
                  { label: "Completed", value: formatDateTime(event.completedAt) },
                ]}
              />
              {event.lastError ? <EventError message={event.lastError} /> : null}
              <PayloadPreview label="Redacted payload preview" payload={event.payloadPreview} />
            </article>
          ))}
        </div>
      ) : (
        <EmptyPanel
          title="No integration events yet"
          description="Resend, Attio, and QuickBooks events will appear here after they are queued."
        />
      )}
    </>
  );
}

function EventHeading({
  badges,
  title,
}: {
  badges: Array<{ label: string; style: string }>;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {badges.map((badge) => (
        <Badge key={`${title}-${badge.label}`} variant="outline" className={badge.style}>
          {badge.label}
        </Badge>
      ))}
    </div>
  );
}

function EventMetadata({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="font-semibold text-slate-500">{item.label}</dt>
          <dd className="text-slate-800">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function EventError({ message }: { message: string }) {
  return (
    <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
      {message}
    </p>
  );
}

function PayloadPreview({ label, payload }: { label: string; payload: unknown }) {
  return (
    <details className="mt-4 rounded-lg bg-slate-50 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
        {label}
      </summary>
      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-slate-600">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </details>
  );
}

function getWebhookStatusBadge(
  event: IntegrationOperations["webhookEvents"][number],
) {
  if (event.processingError) {
    return { label: "failed", style: "border-red-200 bg-red-50 text-red-700" };
  }
  if (event.processedAt) {
    return {
      label: "processed",
      style: "border-green-200 bg-green-50 text-green-700",
    };
  }
  return {
    label: "unprocessed",
    style: "border-amber-200 bg-amber-50 text-amber-700",
  };
}
