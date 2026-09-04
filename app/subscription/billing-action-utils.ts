export type BillingAction =
  | "manage"
  | "payment_method"
  | "cancel"
  | "pause"
  | "resume"
  | "add_seat"
  | "change_plan";

export function createBillingUpdateIdempotencyKey(prefix: "plan" | "seat") {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID().replaceAll("-", "")}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 18)}`;
}
