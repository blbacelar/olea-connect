import { Handshake } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { getReferralAdminData } from "@/lib/data/referrals";
import { getRequestLocale } from "@/lib/i18n/server";

type ReferralSettings = Awaited<
  ReturnType<typeof getReferralAdminData>
>["settings"];

export function ReferralProgramSettings({
  saveReferralProgramSettings,
  settings,
}: {
  saveReferralProgramSettings: (formData: FormData) => Promise<void>;
  settings: ReferralSettings;
}) {
  const isFrench = getRequestLocale() === "fr-CA";
  return (
    <section className="rounded-xl border bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <Handshake className="size-5 text-olea-green" />
        <h2 className="text-xl font-bold text-slate-900">Program settings</h2>
      </div>
      <form
        action={saveReferralProgramSettings}
        className="mt-5 grid gap-4 md:grid-cols-2"
      >
        <ProgramEnabledField enabled={settings.programEnabled} />
        <p className="text-sm text-slate-600 md:col-span-2">
          {isFrench
            ? "Une seule commission par organisme référé : 10 % de son premier paiement d'adhésion trimestriel ou annuel réussi, jusqu'à concurrence de 500 $ CA. Une présentation ou une démonstration seule ne donne droit à aucune récompense. Les versements sont soumis à une vérification."
            : "One commission per referred organization: 10% of its first successful quarterly or annual membership payment, capped at CAD $500. No reward is earned for an introduction or demo alone. Payouts require review."}
        </p>
        <label className="text-sm font-semibold text-slate-700">
          Program contact email
          <Input
            name="contactEmail"
            type="email"
            defaultValue={settings.contactEmail}
            placeholder="referrals@olivesocialimpact.com"
            required
            className="mt-2"
          />
        </label>
        <label className="text-sm font-semibold text-slate-700 md:col-span-2">
          Terms URL
          <Input
            name="termsUrl"
            type="url"
            defaultValue={settings.termsUrl ?? ""}
            placeholder="https://oleaconnects.com/legal/referral-terms"
            className="mt-2"
          />
        </label>
        <div className="md:col-span-2">
          <SubmitButton pendingText="Saving settings...">
            Save referral settings
          </SubmitButton>
        </div>
      </form>
    </section>
  );
}

function ProgramEnabledField({ enabled }: { enabled: boolean }) {
  return (
    <label className="flex items-start gap-3 rounded-lg border bg-olea-light/40 p-4 text-sm text-slate-700 md:col-span-2">
      <input type="hidden" name="programEnabled" value="false" />
      <input
        type="checkbox"
        name="programEnabled"
        defaultChecked={enabled}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-olea-green"
      />
      <span>
        <span className="block font-semibold text-slate-900">
          Accept referral applications
        </span>
        <span className="mt-1 block text-slate-600">
          Turn this off to pause public applications without disabling existing
          referral links or existing commission records.
        </span>
      </span>
    </label>
  );
}
