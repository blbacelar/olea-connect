"use client";

import { ExternalLink, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

export function BillingPortalButton({
  label = "Manage billing",
  disabled = false,
}: {
  label?: string;
  disabled?: boolean;
}) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const openPortal = () => {
    startTransition(async () => {
      setError("");
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const result = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !result.url) {
        setError(result.error ?? "Unable to open billing management.");
        return;
      }

      window.location.assign(result.url);
    });
  };

  return (
    <div>
      <Button disabled={disabled || isPending} onClick={openPortal}>
        {isPending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <ExternalLink className="size-4" />
        )}
        {isPending ? "Opening Stripe..." : label}
      </Button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
