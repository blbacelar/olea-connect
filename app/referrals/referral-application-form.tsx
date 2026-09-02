"use client";

import { useFormState } from "react-dom";

import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { SubmitButton } from "@/components/ui/submit-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  applyToReferralProgram,
  type ReferralApplicationState,
} from "./actions";
import type { ReferralPageCopy } from "@/lib/i18n/referral-page-copy";

const initialState: ReferralApplicationState = {
  ok: false,
  message: "",
};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-2 text-sm font-semibold text-red-600">{errors[0]}</p>;
}

export function ReferralApplicationForm({
  copy,
}: {
  copy: ReferralPageCopy["form"];
}) {
  const { locale } = useLocaleContext();
  const [state, formAction] = useFormState(
    applyToReferralProgram,
    initialState,
  );
  const hasError = (field: keyof NonNullable<typeof state.fieldErrors>) =>
    Boolean(state.fieldErrors?.[field]?.length);
  const errorId = (field: string) => `referral-${field}-error`;
  const describedBy = (field: keyof NonNullable<typeof state.fieldErrors>) =>
    hasError(field) ? errorId(field) : undefined;

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-olea-green/20 bg-white p-6 shadow-soft"
    >
      <input type="hidden" name="locale" value={locale} />
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-olea-green">
          {copy.eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">{copy.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {copy.description}
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="fullName">{copy.fullName}</Label>
          <Input
            id="fullName"
            name="fullName"
            placeholder="Jordan Lee"
            required
            minLength={2}
            maxLength={160}
            className="mt-2"
            aria-invalid={hasError("fullName")}
            aria-describedby={describedBy("fullName")}
          />
          <div id={errorId("fullName")}>
            <FieldError errors={state.fieldErrors?.fullName} />
          </div>
        </div>
        <div>
          <Label htmlFor="email">{copy.email}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="jordan@example.ca"
            required
            maxLength={254}
            className="mt-2"
            aria-invalid={hasError("email")}
            aria-describedby={describedBy("email")}
          />
          <div id={errorId("email")}>
            <FieldError errors={state.fieldErrors?.email} />
          </div>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="organizationName">{copy.organizationName}</Label>
          <Input
            id="organizationName"
            name="organizationName"
            placeholder={copy.organizationPlaceholder}
            maxLength={180}
            className="mt-2"
            aria-invalid={hasError("organizationName")}
            aria-describedby={describedBy("organizationName")}
          />
          <div id={errorId("organizationName")}>
            <FieldError errors={state.fieldErrors?.organizationName} />
          </div>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="relationshipToOlea">{copy.relationshipToOlea}</Label>
          <Textarea
            id="relationshipToOlea"
            name="relationshipToOlea"
            placeholder={copy.relationshipPlaceholder}
            required
            minLength={3}
            maxLength={500}
            className="mt-2 min-h-28"
            aria-invalid={hasError("relationshipToOlea")}
            aria-describedby={describedBy("relationshipToOlea")}
          />
          <div id={errorId("relationshipToOlea")}>
            <FieldError errors={state.fieldErrors?.relationshipToOlea} />
          </div>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="payoutContact">{copy.payoutContact}</Label>
          <Textarea
            id="payoutContact"
            name="payoutContact"
            placeholder={copy.payoutPlaceholder}
            required
            minLength={3}
            maxLength={500}
            className="mt-2 min-h-24"
            aria-invalid={hasError("payoutContact")}
            aria-describedby={describedBy("payoutContact")}
          />
          <div id={errorId("payoutContact")}>
            <FieldError errors={state.fieldErrors?.payoutContact} />
          </div>
        </div>
      </div>

      <label className="mt-5 flex items-start gap-3 rounded-lg border bg-olea-light/40 p-4 text-sm text-slate-700">
        <Checkbox
          name="termsAccepted"
          className="mt-1"
          required
          aria-invalid={hasError("termsAccepted")}
          aria-describedby={describedBy("termsAccepted")}
        />
        <span>{copy.termsAccepted}</span>
      </label>
      <div id={errorId("termsAccepted")}>
        <FieldError errors={state.fieldErrors?.termsAccepted} />
      </div>

      {state.message ? (
        <div
          className={`mt-5 rounded-lg border p-4 text-sm font-semibold ${
            state.ok
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </div>
      ) : null}

      <SubmitButton className="mt-6 w-full" pendingText={copy.pending}>
        {copy.submit}
      </SubmitButton>
    </form>
  );
}
