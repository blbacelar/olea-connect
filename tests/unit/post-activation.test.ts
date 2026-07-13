import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  BRAND_SETUP_PATH,
  DASHBOARD_PATH,
  getPostActivationPath,
  TEMPLATE_SELECTION_PATH,
} from "@/lib/onboarding/post-activation";

type QueryResult = { data?: unknown; count?: number | null; error?: unknown };

function makeQuery(result: QueryResult) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    or: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    then: (
      resolve: (value: QueryResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };

  return query;
}

function makeSupabase(resultsByTable: Record<string, QueryResult>) {
  return {
    from: vi.fn((table: string) => makeQuery(resultsByTable[table] ?? {})),
  } as unknown as SupabaseClient;
}

describe("post-activation routing", () => {
  it("sends organizations without a completed brand profile to brand setup", async () => {
    const supabase = makeSupabase({
      organization_brand_profiles: {
        data: { brand_completed_at: null },
        error: null,
      },
    });

    await expect(getPostActivationPath(supabase, "org_123")).resolves.toBe(
      BRAND_SETUP_PATH,
    );
  });

  it("sends completed non-Seedling organizations to the dashboard", async () => {
    const supabase = makeSupabase({
      organization_brand_profiles: {
        data: { brand_completed_at: "2026-07-13T12:00:00.000Z" },
        error: null,
      },
      subscriptions: {
        data: {
          plan_id: "roots",
          membership_plans: { template_selection_limit: null },
        },
        error: null,
      },
    });

    await expect(getPostActivationPath(supabase, "org_123")).resolves.toBe(
      DASHBOARD_PATH,
    );
  });

  it("sends Seedling organizations with missing template selections to template selection", async () => {
    const supabase = makeSupabase({
      organization_brand_profiles: {
        data: { brand_completed_at: "2026-07-13T12:00:00.000Z" },
        error: null,
      },
      subscriptions: {
        data: {
          plan_id: "seedling",
          membership_plans: { template_selection_limit: 3 },
        },
        error: null,
      },
      resources: { count: 2, error: null },
      organization_resource_access: { count: 1, error: null },
    });

    await expect(getPostActivationPath(supabase, "org_123")).resolves.toBe(
      TEMPLATE_SELECTION_PATH,
    );
  });
});
