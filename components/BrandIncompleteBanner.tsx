"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";

export function BrandIncompleteBanner() {
  const session = useSession();

  if (!session || session.organization.brandComplete) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="size-5 text-amber-600" />
        <div>
          <p className="font-semibold text-amber-900">
            Your brand profile is incomplete.
          </p>
          <p className="text-sm text-amber-700">
            Complete it to enable fully branded PDF downloads.
          </p>
        </div>
      </div>
      <Button asChild size="sm">
        <Link href="/onboarding/brand-setup">Set up now</Link>
      </Button>
    </div>
  );
}
