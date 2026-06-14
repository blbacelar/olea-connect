"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-white p-8 shadow-soft">
      <AlertTriangle className="size-8 text-red-600" />
      <h1 className="mt-4 text-xl font-bold text-slate-800">
        We could not load this workspace
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
        The data request failed or your account no longer has access. Try the
        request again. If the problem continues, sign out and contact support.
      </p>
      <Button className="mt-5" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
