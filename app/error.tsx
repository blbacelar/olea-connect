"use client";

import { AlertTriangle } from "lucide-react";

import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import { getErrorBoundaryCopy } from "@/lib/i18n/error-boundary-copy";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale } = useLocaleContext();
  const copy = getErrorBoundaryCopy(locale);

  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-white p-8 shadow-soft">
      <AlertTriangle className="size-8 text-red-600" />
      <h1 className="mt-4 text-xl font-bold text-slate-800">
        {copy.workspace.title}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
        {copy.workspace.description}
      </p>
      <Button className="mt-5" onClick={reset} type="button">
        {copy.retry}
      </Button>
    </div>
  );
}
