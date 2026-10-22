const localDateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;

/**
 * `datetime-local` intentionally has no offset. Convert it in the browser,
 * where the reviewer's local timezone is known, before submitting it to the
 * server so campaign windows do not depend on the deployment timezone.
 */
export function localDateTimeToIso(value: string) {
  if (!localDateTimePattern.test(value)) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}
