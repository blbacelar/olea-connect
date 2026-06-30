"use client";

import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  LoaderCircle,
  Pause,
  Plus,
  TrendingUp,
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
import { apiRoutes } from "@/lib/api-routes";
import { membershipPlans } from "@/lib/plans";
import type { MembershipTier } from "@/lib/types";

type BillingAction =
  | "manage"
  | "payment_method"
  | "cancel"
  | "pause"
  | "resume"
  | "add_seat"
  | "change_plan";

type BillingManagementControlsProps = {
  canManage: boolean;
  disabled?: boolean;
  isPaused: boolean;
};

const portalActions: Array<{
  action: Extract<BillingAction, "payment_method" | "cancel">;
  description: string;
  icon: typeof CreditCard;
  label: string;
}> = [
  {
    action: "payment_method",
    description: "Update card details securely.",
    icon: CreditCard,
    label: "Payment method",
  },
  {
    action: "cancel",
    description: "Schedule cancellation without deleting history.",
    icon: XCircle,
    label: "Cancel membership",
  },
];

const planOrder: Record<MembershipTier, number> = {
  seedling: 0,
  roots: 1,
  canopy: 2,
  harvest: 3,
};

function createBillingUpdateIdempotencyKey(prefix: "plan" | "seat") {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID().replaceAll("-", "")}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 18)}`;
}

type PlanUpgradeControlsProps = {
  billingInterval: "month" | "year";
  canManage: boolean;
  currentPlanId: MembershipTier;
  disabled?: boolean;
  initialSuccessMessage?: string;
};

function getPlanPriceLabel(planId: MembershipTier, interval: "month" | "year") {
  const plan = membershipPlans.find((item) => item.id === planId);
  if (!plan) return "";

  const amount = interval === "year" ? plan.annualPrice : plan.monthlyPrice;
  return new Intl.NumberFormat("en-CA", {
    currency: "CAD",
    style: "currency",
  }).format(amount);
}

export function PlanUpgradeControls({
  billingInterval,
  canManage,
  currentPlanId,
  disabled = false,
  initialSuccessMessage = "",
}: PlanUpgradeControlsProps) {
  const upgradeOptions = membershipPlans.filter(
    (plan) => planOrder[plan.id] > planOrder[currentPlanId],
  );
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(initialSuccessMessage);
  const [targetPlanId, setTargetPlanId] = useState<MembershipTier>(
    upgradeOptions[0]?.id ?? currentPlanId,
  );
  const [isPending, startTransition] = useTransition();
  const unavailable =
    disabled || isPending || !canManage || upgradeOptions.length === 0;
  const selectedPlan = membershipPlans.find((plan) => plan.id === targetPlanId);

  const upgradePlan = () => {
    startTransition(async () => {
      setError("");
      setSuccessMessage("");
      try {
        const response = await fetch(apiRoutes.stripePortal, {
          body: JSON.stringify({
            action: "change_plan",
            idempotencyKey: createBillingUpdateIdempotencyKey("plan"),
            targetPlanId,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
          planId?: MembershipTier;
        };

        if (response.status === 202) {
          setSuccessMessage(
            result.message ??
              "Your plan upgrade was confirmed. Platform access is still syncing and should update shortly.",
          );
          return;
        }

        if (!response.ok) {
          setError(result.error ?? "Unable to upgrade your plan.");
          return;
        }

        window.location.assign(`/subscription?plan=upgraded&tier=${targetPlanId}`);
      } catch {
        setError("Unable to reach billing management. Please try again.");
      }
    });
  };

  return (
    <section className="rounded-[14px] border bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-olea-green">
            <TrendingUp className="size-5" />
          </div>
          <h2 className="mt-4 text-base font-bold text-slate-800">
            Upgrade your plan
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Move to a higher tier without starting checkout again. The prorated
            difference is billed immediately, and Olea unlocks the new access
            after the subscription sync completes.
          </p>
        </div>

        {upgradeOptions.length > 0 ? (
          <div className="grid gap-3 sm:min-w-[360px] sm:grid-cols-[1fr_auto]">
            <Select
              disabled={unavailable}
              onValueChange={(value) => setTargetPlanId(value as MembershipTier)}
              value={targetPlanId}
            >
              <SelectTrigger aria-label="Choose plan to upgrade to">
                <SelectValue placeholder="Choose a plan" />
              </SelectTrigger>
              <SelectContent>
                {upgradeOptions.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} - {getPlanPriceLabel(plan.id, billingInterval)} /{" "}
                    {billingInterval}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={unavailable} onClick={upgradePlan} type="button">
              {isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <TrendingUp className="size-4" />
              )}
              Upgrade
            </Button>
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            You are already on the highest plan.
          </p>
        )}
      </div>

      {selectedPlan && upgradeOptions.length > 0 ? (
        <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
          Upgrade to <strong>{selectedPlan.name}</strong> for{" "}
          {getPlanPriceLabel(selectedPlan.id, billingInterval)} /{" "}
          {billingInterval}. Downgrades are handled by support so access changes
          stay clean.
        </p>
      ) : null}

      {!canManage ? (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
          Only organization owners and admins can upgrade the membership.
        </p>
      ) : null}

      {error ? (
        <p
          className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {successMessage ? (
        <p
          role="status"
          className="mt-3 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>{successMessage}</span>
        </p>
      ) : null}
    </section>
  );
}

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
        const response = await fetch(apiRoutes.stripePortal, {
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
            Payment-sensitive changes open secure hosted billing flows. Access
            changes are applied only after the confirmed subscription state
            syncs.
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
              restricted until billing confirms collection has resumed.
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
  const seatUpdateIdempotencyKeyRef = useRef<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const unavailable = disabled || isPending || !canManage;

  const openConfirmation = () => {
    seatUpdateIdempotencyKeyRef.current =
      createBillingUpdateIdempotencyKey("seat");
    setConfirmOpen(true);
  };

  const closeConfirmation = () => {
    if (!isPending) {
      seatUpdateIdempotencyKeyRef.current = null;
      setConfirmOpen(false);
    }
  };

  useEffect(() => {
    if (!confirmOpen) return;
    confirmButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        seatUpdateIdempotencyKeyRef.current = null;
        setConfirmOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirmOpen, isPending]);

  const addSeat = () => {
    startTransition(async () => {
      setError("");
      setSuccessMessage("");
      try {
        const response = await fetch(apiRoutes.stripePortal, {
          body: JSON.stringify({
            action: "add_seat",
            idempotencyKey:
              seatUpdateIdempotencyKeyRef.current ??
              createBillingUpdateIdempotencyKey("seat"),
            seatQuantity: Number(seatQuantity),
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };

        if (response.status === 202) {
          setSuccessMessage(
            result.message ??
              "Your seat update was confirmed. Team access is still syncing and should be available shortly.",
          );
          seatUpdateIdempotencyKeyRef.current = null;
          setConfirmOpen(false);
          return;
        }

        if (!response.ok) {
          setError(result.error ?? "Unable to add a seat.");
          seatUpdateIdempotencyKeyRef.current = null;
          setConfirmOpen(false);
          return;
        }

        window.location.assign(
          `/subscription?seat=added&quantity=${seatQuantity}`,
        );
      } catch {
        setError("Unable to reach billing management. Please try again.");
        seatUpdateIdempotencyKeyRef.current = null;
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
            Add one paid seat for {seatPriceLabel}. After the update is
            confirmed, invite the teammate from Team.
          </p>
          {!canManage ? (
            <p className="mt-2 text-xs font-semibold text-emerald-900">
              Only organization owners and admins can add seats.
            </p>
          ) : null}
        </div>
        <Button
          disabled={unavailable}
          onClick={openConfirmation}
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
              The prorated amount is billed now, then you can invite the
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
                onClick={closeConfirmation}
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
