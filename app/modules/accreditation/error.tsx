"use client";

import { AlertTriangle } from "lucide-react";

import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import { getErrorBoundaryCopy } from "@/lib/i18n/error-boundary-copy";

export default function AccreditationError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale } = useLocaleContext();
  const copy = getErrorBoundaryCopy(locale);

  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-white p-8 shadow-soft">
      <AlertTriangle className="size-10 text-red-600" />
      <h2 className="mt-5 text-2xl font-bold text-slate-900">
        {copy.accreditation.title}
      </h2>
      <p className="mt-3 max-w-2xl text-slate-600">
        {copy.accreditation.description}
      </p>
      <Button className="mt-6" onClick={reset} type="button">
        {copy.retry}
      </Button>
    </div>
  );
}
