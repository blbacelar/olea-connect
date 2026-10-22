export const apiRoutes = {
  attioProcess: "/api/v1/attio/process",
  circleProcess: "/api/v1/circle/process",
  circleSso: "/api/v1/circle-sso",
  emailProcess: "/api/v1/email/process",
  emailWebhook: "/api/v1/email/webhook",
  provisioningReconcile: "/api/v1/provisioning/reconcile",
  provisioningRetry: "/api/v1/provisioning/retry",
  quickBooksProcess: "/api/v1/quickbooks/process",
  stripeCheckout: "/api/v1/stripe/checkout",
  stripePortal: "/api/v1/stripe/portal",
  stripeWebhook: "/api/v1/stripe/webhook",
} as const;
