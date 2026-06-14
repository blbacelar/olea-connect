import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { TestInfo } from "@playwright/test";

import {
  test as testWithData,
  expect,
  type CreatedOrganizationOwner,
} from "./test-data.fixture";
import { getTestSupabaseEnvironment } from "../support/test-environment";

type StoredCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

function toPlaywrightSameSite(value: CookieOptions["sameSite"]) {
  if (value === true || value === "strict") return "Strict" as const;
  if (value === "none") return "None" as const;
  return "Lax" as const;
}

async function createAuthenticatedStorageState(
  email: string,
  password: string,
  baseURL: string,
) {
  const { url, publishableKey } = getTestSupabaseEnvironment({
    requirePublishableKey: true,
  });
  const cookies: StoredCookie[] = [];
  const supabase = createServerClient(url, publishableKey!, {
    cookies: {
      getAll() {
        return cookies;
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          const existingIndex = cookies.findIndex(
            ({ name }) => name === cookie.name,
          );
          if (!cookie.value || cookie.options.maxAge === 0) {
            if (existingIndex >= 0) cookies.splice(existingIndex, 1);
          } else if (existingIndex >= 0) {
            cookies[existingIndex] = cookie;
          } else {
            cookies.push(cookie);
          }
        }
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const appUrl = new URL(baseURL);

  return {
    cookies: cookies.map(({ name, value, options }) => ({
      name,
      value,
      domain: appUrl.hostname,
      path: options.path ?? "/",
      httpOnly: options.httpOnly ?? false,
      secure: options.secure ?? baseURL.startsWith("https://"),
      sameSite: toPlaywrightSameSite(options.sameSite),
      expires:
        typeof options.maxAge === "number"
          ? Math.floor(Date.now() / 1000) + options.maxAge
          : -1,
    })),
    origins: [],
  };
}

export const test = testWithData.extend<{
  authenticatedMember: CreatedOrganizationOwner;
}>({
  authenticatedMember: async ({ testData }, use) => {
    const member = await testData.createOrganizationOwner({
      activeSubscription: true,
    });
    await use(member);
  },
  storageState: async ({ authenticatedMember, baseURL }, use) => {
    if (!baseURL) {
      throw new Error("Playwright baseURL is required for authenticated tests.");
    }

    await use(
      await createAuthenticatedStorageState(
        authenticatedMember.email,
        authenticatedMember.password,
        baseURL,
      ),
    );
  },
});

export { expect };
