export function normalizeHookSecret(secret: string) {
  return secret.trim().replace(/^v1,/, "").replace(/^whsec_/, "");
}
