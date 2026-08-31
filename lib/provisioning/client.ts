import { apiRoutes } from "@/lib/api-routes";

export interface ProvisioningRetryResult {
  status?: string;
  error?: string;
  nextPath?: string;
}

export async function retryMembershipActivation() {
  const response = await fetch(apiRoutes.provisioningRetry, {
    method: "POST",
  });
  const contentType = response.headers.get("content-type");
  const result = contentType?.includes("application/json")
    ? ((await response.json()) as ProvisioningRetryResult)
    : {};

  return { response, result };
}
