type TestSupabaseEnvironmentOptions = {
  requirePublishableKey?: boolean;
};

export function getTestSupabaseEnvironment(
  options: TestSupabaseEnvironmentOptions = {},
) {
  if (process.env.PLAYWRIGHT_TEST_DATA_ENABLED !== "true") {
    throw new Error(
      "Test-data mutation is disabled. Set PLAYWRIGHT_TEST_DATA_ENABLED=true.",
    );
  }

  const environment = process.env.PLAYWRIGHT_TEST_ENV;
  if (!environment || !["local", "preview", "staging"].includes(environment)) {
    throw new Error(
      "PLAYWRIGHT_TEST_ENV must explicitly be local, preview, or staging.",
    );
  }

  const url = process.env.TEST_SUPABASE_URL;
  const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey =
    process.env.TEST_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  if (options.requirePublishableKey && !publishableKey) {
    throw new Error(
      "TEST_SUPABASE_PUBLISHABLE_KEY is required for authenticated tests.",
    );
  }

  const hostname = new URL(url).hostname;
  if (
    environment === "local" &&
    hostname !== "127.0.0.1" &&
    hostname !== "localhost"
  ) {
    throw new Error("Local test data may only target localhost Supabase.");
  }

  return { url, serviceRoleKey, publishableKey };
}
