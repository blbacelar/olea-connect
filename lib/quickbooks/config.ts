import "server-only";

export interface QuickBooksConfig {
  apiBaseUrl: string;
  accessToken: string;
  realmId: string;
}

export function getQuickBooksConfig(): QuickBooksConfig {
  const accessToken = process.env.QUICKBOOKS_ACCESS_TOKEN?.trim();
  const realmId = process.env.QUICKBOOKS_REALM_ID?.trim();

  if (!accessToken) {
    throw new Error("QUICKBOOKS_ACCESS_TOKEN is not configured.");
  }

  if (!realmId) {
    throw new Error("QUICKBOOKS_REALM_ID is not configured.");
  }

  return {
    apiBaseUrl:
      process.env.QUICKBOOKS_API_BASE_URL?.trim().replace(/\/$/, "") ??
      "https://quickbooks.api.intuit.com",
    accessToken,
    realmId,
  };
}
