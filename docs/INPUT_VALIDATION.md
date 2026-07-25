# Input Validation Contract

Olea Connects validates user-entered data at both the browser and server boundaries. Client-side filtering improves feedback while typing, but server-side validation is the source of truth before any value reaches persistence.

Zod is the schema authority for shared primitive and payload validation. Schemas are strict at trust boundaries, use `safeParse` when converting untrusted input into an application result, and avoid coercion that could silently turn malformed text into a valid value.

## Shared rules

- Phone fields accept digits and common phone punctuation only. Letters, extensions, and unsupported characters are rejected server-side.
- Integer fields accept digits only and are parsed with `parseStrictInteger`.
- Decimal and currency fields accept digits with up to two decimal places. Currency values are submitted as an unformatted numeric string and displayed as CAD currency with `CurrencyInput`.
- Email fields are normalized to lowercase and validated against the shared email validator.
- URLs must be valid `http` or `https` URLs. Sensitive links such as Zoom meeting URLs require `https`.
- Dates are parsed and validated before persistence. Related date ranges also validate their ordering.
- Boolean fields use explicit `true`/`false` values. Native checkbox submissions are normalized from `on` to `true` at the server boundary.
- User-entered text is trimmed and checked for required values and maximum lengths.

## Shared utilities

- `lib/input-validation.ts` contains sanitizers, formatters, normalizers, and strict parsers.
- `lib/validation/schemas.ts` contains the reusable Zod schemas for phone, email, numeric strings, dates, URLs, booleans, and bounded text.
- `lib/signup-flow.ts` uses a strict Zod object schema for the complete signup payload, including an explicit consent object.
- `components/ui/input.tsx` applies field-aware typing behavior for shared inputs.
- `components/ui/currency-input.tsx` provides a formatted CAD display while preserving a raw numeric form value.

## Implementation guidance

When adding a field:

1. Add the correct `type`, `inputMode`, `pattern`, and helper text in the form.
2. Use the shared component or validator rather than a local regular expression.
3. Add or reuse a Zod schema in `lib/validation/schemas.ts`; do not use `z.coerce` for user text or numbers unless the coercion rules are explicitly part of the contract.
4. Validate and normalize the value again in the server action or API route.
5. Add unit coverage for valid, invalid, boundary, and hostile input.
6. Add an E2E scenario when the field is part of a user-facing flow.

Browser attributes are usability aids only. They must never be treated as authorization or persistence validation.
