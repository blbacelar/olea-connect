# Input Validation Contract

Olea Connects validates user-entered data at both the browser and server boundaries. Client-side filtering improves feedback while typing, but server-side validation is the source of truth before any value reaches persistence.

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
- `components/ui/input.tsx` applies field-aware typing behavior for shared inputs.
- `components/ui/currency-input.tsx` provides a formatted CAD display while preserving a raw numeric form value.

## Implementation guidance

When adding a field:

1. Add the correct `type`, `inputMode`, `pattern`, and helper text in the form.
2. Use the shared component or validator rather than a local regular expression.
3. Validate and normalize the value again in the server action or API route.
4. Add unit coverage for valid, invalid, boundary, and hostile input.
5. Add an E2E scenario when the field is part of a user-facing flow.

Browser attributes are usability aids only. They must never be treated as authorization or persistence validation.
