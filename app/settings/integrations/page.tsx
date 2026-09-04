import { notFound } from "next/navigation";

import {
  getIntegrationOperations,
  type IntegrationEventStatus,
} from "@/lib/data/integration-events";

import { IntegrationOperationsView } from "./integration-operations-view";

function getParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function IntegrationOperationsPage({
  searchParams = {},
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const query = getParam(searchParams, "q")?.trim() ?? "";
  const provider = getParam(searchParams, "provider")?.trim() ?? "all";
  const status = getParam(searchParams, "status")?.trim() ?? "all";
  const operations = await loadIntegrationOperations({ provider, query, status });

  return (
    <IntegrationOperationsView
      operations={operations}
      provider={provider}
      query={query}
      status={status}
    />
  );
}

async function loadIntegrationOperations({
  provider,
  query,
  status,
}: {
  provider: string;
  query: string;
  status: string;
}) {
  try {
    return await getIntegrationOperations({
      provider,
      query,
      status: status as IntegrationEventStatus | "all",
    });
  } catch (error) {
    if (isForbiddenIntegrationError(error)) notFound();
    throw error;
  }
}

function isForbiddenIntegrationError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("Only platform administrators") ||
      error.message.includes("Sign in before viewing integration operations"))
  );
}
