export type ComplimentaryAccessKind = "sponsorship" | "developer";

export function getComplimentaryAccessKind(
  provider: string,
  metadata: unknown,
): ComplimentaryAccessKind | null {
  if (provider !== "manual" || !metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const source = (metadata as Record<string, unknown>).funding_source;
  return source === "sponsorship" || source === "developer" ? source : null;
}
