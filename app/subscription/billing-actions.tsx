"use client";

import {
  CreditCard,
  ExternalLink,
  LoaderCircle,
  Pause,
  Settings2,
  XCircle,
} from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type BillingAction =
  | "manage"
  | "payment_method"
  | "subscription_update"
  | "cancel"
  | "pause"
  | "resume";

type BillingManagementControlsProps = {
  canManage: boolean;
  disabled?: boolean;
  isPaused: boolean;
};

const portalActions: Array<{
  action: Extract<
    BillingAction,
    "payment_method" | "subscription_update" | "cancel"
  >;
  description: string;
  icon: typeof CreditCard;
  label: string;
}> = [
  {
    action: "payment_method",
    description: "Update card details in Stripe.",
    icon: CreditCard,
    label: "Payment method",
  },
  {
    action: "subscription_update",
    description: "Change plan or adjust $10/month seat add-ons.",
    icon: Settings2,
    label: "Plans & seats",
  },
  {
    action: "cancel",
    description: "Schedule cancellation without deleting history.",
    icon: XCircle,
    label: "Cancel membership",
  },
];

export function BillingManagementControls({
  canManage,
  disabled = false,
  isPaused,
}: BillingManagementControlsProps) {
  const [error, setError] = useState("");
  const [pauseDays, setPauseDays] = useState("30");
  const [isPending, startTransition] = useTransition();
  const unavailable = disabled || isPending || !canManage;

  const runBillingAction = (action: BillingAction) => {
    startTransition(async () => {
      setError("");
      try {
        const response = await fetch("/api/stripe/portal", {
          body: JSON.stringify({
            action,
            ...(action === "pause" ? { pauseDays: Number(pauseDays) } : {}),
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const result = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          url?: string;
          error?: string;
        };

        if (!response.ok) {
          setError(result.error ?? "Unable to update billing.");
          return;
        }

        if (result.url) {
          window.location.assign(result.url);
          return;
        }

        window.location.reload();
      } catch {
        setError("Unable to reach billing management. Please try again.");
      }
    });
  };

  return (
    <section className="rounded-[14px] border bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Admin billing actions
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Payment-sensitive changes open Stripe-hosted flows. Access changes
            are applied only after Stripe syncs the confirmed subscription
            state.
          </p>
        </div>
        <Button
          disabled={unavailable}
          onClick={() => runBillingAction("manage")}
          variant="outline"
        >
          {isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <ExternalLink className="size-4" />
          )}
          Open portal
        </Button>
      </div>

      {!canManage ? (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
          Only organization owners and admins can manage billing.
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {portalActions.map(({ action, description, icon: Icon, label }) => (
          <button
            key={action}
            className="rounded-xl border p-4 text-left transition hover:border-olea-green hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={unavailable}
            onClick={() => runBillingAction(action)}
            type="button"
          >
            <Icon className="size-5 text-olea-green" />
            <span className="mt-3 block text-sm font-bold text-slate-800">
              {label}
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              {description}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-amber-950">
              <Pause className="size-4" />
              {isPaused ? "Resume membership" : "Pause membership"}
            </h3>
            <p className="mt-1 max-w-xl text-xs leading-5 text-amber-900">
              Pauses are limited to 60 days. During a pause, platform access is
              restricted until Stripe confirms collection has resumed.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isPaused ? (
              <Input
                aria-label="Pause length in days"
                className="h-10 w-24 bg-white"
                max={60}
                min={1}
                onChange={(event) => setPauseDays(event.target.value)}
                type="number"
                value={pauseDays}
              />
            ) : null}
            <Button
              disabled={unavailable}
              onClick={() => runBillingAction(isPaused ? "resume" : "pause")}
              variant="outline"
            >
              {isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Pause className="size-4" />
              )}
              {isPaused ? "Resume now" : "Pause"}
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <p
          className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
