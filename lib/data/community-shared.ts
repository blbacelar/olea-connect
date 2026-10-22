import type { MembershipTier } from "@/lib/types";

export const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

export type ActiveSubscriptionRow = {
  organization_id: string;
  plan_id: MembershipTier;
};

export type DataError = {
  code?: string;
  message?: string;
};

export function emptyQueryResult<T>() {
  return { data: [] as T[], error: null };
}

export function isMissingCommunitySchema(error: DataError | null | unknown) {
  if (!isDataError(error)) return false;

  return (
    error.code === "PGRST205" ||
    error.message?.includes("Could not find the table")
  );
}

export function safeHttpsUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isDataError(error: unknown): error is DataError {
  return typeof error === "object" && error !== null;
}
