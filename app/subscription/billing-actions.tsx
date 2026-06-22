"use client";

import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  LoaderCircle,
  Pause,
  Plus,
  Settings2,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BillingAction =
  | "manage"
  | "payment_method"
  | "subscription_update"
  | "cancel"
  | "pause"
  | "resume"
  | "add_seat";

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

type SeatManagementControlsProps = {
  canManage: boolean;
  disabled?: boolean;
  initialSuccessMessage?: string;
  seatPriceLabel: string;
};

export function SeatManagementControls({
  canManage,
  disabled = false,
  initialSuccessMessage = "",
  seatPriceLabel,
}: SeatManagementControlsProps) {
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(initialSuccessMessage);
  const [seatQuantity, setSeatQuantity] = useState("1");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const [isPending, startTransition] = useTransition();
  const unavailable = disabled || isPending || !canManage;

  useEffect(() => {
    if (!confirmOpen) return;
    confirmButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirmOpen]);

  const addSeat = () => {
    startTransition(async () => {
      setError("");
      setSuccessMessage("");
      try {
        const response = await fetch("/api/stripe/portal", {
          body: JSON.stringify({
            action: "add_seat",
            seatQuantity: Number(seatQuantity),
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!response.ok) {
          setError(result.error ?? "Unable to add a seat.");
          setConfirmOpen(false);
          return;
        }

        window.location.assign(`/subscription?seat=added&quantity=${seatQuantity}`);
      } catch {
        setError("Unable to reach billing management. Please try again.");
        setConfirmOpen(false);
      }
    });
  };

  return (
    <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-emerald-950">
            Need another teammate?
          </h3>
          <p className="mt-1 text-xs leading-5 text-emerald-900">
            Add one paid seat for {seatPriceLabel}. After Stripe confirms it,
            invite the teammate from Team.
          </p>
          {!canManage ? (
            <p className="mt-2 text-xs font-semibold text-emerald-900">
              Only organization owners and admins can add seats.
            </p>
          ) : null}
        </div>
        <Button
          disabled={unavailable}
          onClick={() => setConfirmOpen(true)}
          type="button"
        >
          {isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Add paid seat
        </Button>
      </div>
      {confirmOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4">
          <div
            aria-describedby="add-seat-dialog-description"
            aria-labelledby="add-seat-dialog-title"
            aria-modal="true"
            className="w-full max-w-md rounded-[14px] border bg-white p-6 shadow-elevated"
            role="dialog"
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-olea-green">
              <Plus className="size-5" />
            </div>
            <h3
              id="add-seat-dialog-title"
              className="mt-4 text-lg font-bold text-slate-900"
            >
              Add paid seats?
            </h3>
            <p
              id="add-seat-dialog-description"
              className="mt-2 text-sm leading-6 text-slate-600"
            >
              Select how many teammate seats to add for {seatPriceLabel} each.
              Stripe will bill the prorated amount now, then you can invite the
              teammate from Team.
            </p>
            <div className="mt-5 space-y-2">
              <label
                className="text-sm font-semibold text-slate-800"
                htmlFor="seat-quantity"
              >
                Seats to add
              </label>
              <Select
                disabled={isPending}
                onValueChange={setSeatQuantity}
                value={seatQuantity}
              >
                <SelectTrigger id="seat-quantity">
                  <SelectValue placeholder="Choose quantity" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3].map((quantity) => (
                    <SelectItem key={quantity} value={String(quantity)}>
                      {quantity} seat{quantity === 1 ? "" : "s"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                disabled={isPending}
                onClick={() => setConfirmOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={isPending}
                onClick={addSeat}
                ref={confirmButtonRef}
                type="button"
              >
                {isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Add {seatQuantity} seat{seatQuantity === "1" ? "" : "s"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      {successMessage ? (
        <p
          role="status"
          className="mt-3 flex gap-2 rounded-lg border border-emerald-200 bg-white p-3 text-sm font-medium text-emerald-800"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>{successMessage}</span>
        </p>
      ) : null}
    </div>
  );
}
