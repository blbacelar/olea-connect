"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

import { clearReferralCapture } from "@/lib/referral-capture";

export function ReferralInvalidNotice({ isFrench }: { isFrench: boolean }) {
  useEffect(() => {
    clearReferralCapture();
  }, []);

  return (
    <div className="mx-auto mt-6 flex max-w-7xl items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="alert">
      <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <p>
        {isFrench
          ? "Ce lien de référence est invalide ou n'est plus actif. Demandez un nouveau lien à la personne qui vous a invité."
          : "This referral link is invalid or no longer active. Ask the person who invited you for a new link."}
      </p>
    </div>
  );
}
