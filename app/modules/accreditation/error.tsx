"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AccreditationError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-white p-8 shadow-soft">
      <AlertTriangle className="size-10 text-red-600" />
      <h2 className="mt-5 text-2xl font-bold text-slate-900">
        We could not load the accreditation workspace
      </h2>
      <p className="mt-3 max-w-2xl text-slate-600">
        The workspace request failed. Try again, and if it keeps happening,
        contact support so we can check your organization configuration.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
