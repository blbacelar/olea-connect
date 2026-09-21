const fallbackPath = "/dashboard";
const unsafePathCharacters = /[\u0000-\u001F\u007F\\]/;

export function getSafeNextPath(
  value: string | string[] | null | undefined,
  fallback = fallbackPath,
) {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (unsafePathCharacters.test(next)) return fallback;

  return next;
}
