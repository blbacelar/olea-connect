import "server-only";

export interface AttioConfig {
  apiBaseUrl: string;
  apiToken: string;
}

export function getAttioConfig(): AttioConfig {
  const apiToken = process.env.ATTIO_API_TOKEN?.trim();
  if (!apiToken) {
    throw new Error("ATTIO_API_TOKEN is not configured.");
  }

  return {
    apiBaseUrl:
      process.env.ATTIO_API_BASE_URL?.trim().replace(/\/$/, "") ??
      "https://api.attio.com",
    apiToken,
  };
}
