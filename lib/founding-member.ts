const foundingMemberCodePattern = /^[A-Z0-9-]{4,32}$/;

export function normalizeFoundingMemberCode(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!normalized) return "";
  return foundingMemberCodePattern.test(normalized) ? normalized : null;
}

export function isWellFormedFoundingMemberCode(value: string) {
  return normalizeFoundingMemberCode(value) !== null;
}
