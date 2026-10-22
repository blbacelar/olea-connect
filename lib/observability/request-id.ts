const requestIdPattern = /^[A-Za-z0-9._:-]{8,128}$/;

export const REQUEST_ID_HEADER = "x-request-id";

export function createRequestId() {
  return crypto.randomUUID();
}

export function normalizeRequestId(value: string | null | undefined) {
  const candidate = value?.trim();
  return candidate && requestIdPattern.test(candidate) ? candidate : null;
}

export function getOrCreateRequestId(headers: Headers) {
  return normalizeRequestId(headers.get(REQUEST_ID_HEADER)) ?? createRequestId();
}
