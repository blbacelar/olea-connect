import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type getIntegrationOperations } from "@/lib/data/integration-events";

import { ProviderEvents, WebhookEvents } from "./integration-event-lists";

type IntegrationOperations = Awaited<ReturnType<typeof getIntegrationOperations>>;

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
  return queryString
    ? `/settings/integrations?${queryString}`
    : "/settings/integrations";
}

export function IntegrationOperationsView({
  operations,
  provider,
  query,
  status,
}: {
  operations: IntegrationOperations;
  provider: string;
  query: string;
  status: string;
}) {
  return (
    <div>
      <PageHeader
        title="Integration operations"
        description="Search webhooks and provider outbox events without exposing secrets or member document contents."
      />
      <IntegrationFilters provider={provider} query={query} status={status} />
      <StatusCards counts={operations.counts} />
      <WebhookEvents events={operations.webhookEvents} />
      <ProviderEvents events={operations.events} />
    </div>
  );
}

function IntegrationFilters({
  provider,
  query,
  status,
}: {
  provider: string;
  query: string;
  status: string;
}) {
  return (
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

      <FilterGroup
        activeValue={provider}
        filters={providerFilters}
        label="Provider"
        getHref={(value) => filterHref({ provider: value, query, status })}
      />
      <FilterGroup
        activeValue={status}
        filters={statusFilters}
        label="Outbox status"
        getHref={(value) => filterHref({ provider, query, status: value })}
      />
    </section>
  );
}

function FilterGroup({
  activeValue,
  filters,
  getHref,
  label,
}: {
  activeValue: string;
  filters: Array<{ label: string; value: string }>;
  getHref: (value: string) => string;
  label: string;
}) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Button
            key={filter.value}
            asChild
            size="sm"
            variant={activeValue === filter.value ? "default" : "outline"}
            className={activeValue === filter.value ? "" : "bg-white"}
          >
            <Link href={getHref(filter.value)}>{filter.label}</Link>
          </Button>
        ))}
      </div>
    </div>
  );
}

function StatusCards({ counts }: { counts: IntegrationOperations["counts"] }) {
  const cards = [
    { count: counts.pending, label: "Pending", tone: "text-blue-700" },
    { count: counts.processing, label: "Processing", tone: "text-slate-700" },
    { count: counts.failed, label: "Failed", tone: "text-amber-700" },
    { count: counts.dead_letter, label: "Dead letter", tone: "text-red-700" },
    { count: counts.completed, label: "Completed", tone: "text-green-700" },
  ];

  return (
    <div className="mb-8 grid gap-3 md:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {card.label}
          </p>
          <p className={`mt-2 text-3xl font-bold ${card.tone}`}>
            {card.count}
          </p>
        </div>
      ))}
    </div>
  );
}
