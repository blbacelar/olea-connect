"use client";

import { CheckCircle2, LoaderCircle, TrendingUp } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MembershipTier } from "@/lib/types";

import {
  type BillingInterval,
  type MembershipPlanOption,
  getBillingIntervalLabel,
  getMembershipPlan,
  getPlanPriceLabel,
  getUpgradeOptions,
  submitPlanUpgrade,
} from "./plan-upgrade-helpers";

type PlanUpgradeControlsProps = {
  billingInterval: BillingInterval;
  canManage: boolean;
  currentPlanId: MembershipTier;
  disabled?: boolean;
  initialSuccessMessage?: string;
};

export function PlanUpgradeControls({
  billingInterval,
  canManage,
  currentPlanId,
  disabled = false,
  initialSuccessMessage = "",
}: PlanUpgradeControlsProps) {
  const upgradeOptions = getUpgradeOptions(currentPlanId);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(initialSuccessMessage);
  const [targetPlanId, setTargetPlanId] = useState<MembershipTier>(
    upgradeOptions[0]?.id ?? currentPlanId,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const unavailable = disabled || isPending || !canManage || !upgradeOptions.length;
  const selectedPlan = getMembershipPlan(targetPlanId);
  const selectedPlanPriceLabel = selectedPlan
    ? getPlanPriceLabel(selectedPlan.id, billingInterval)
    : "";

  function openUpgradeConfirmation() {
    setError("");
    setSuccessMessage("");
    setConfirmOpen(true);
  }

  function upgradePlan() {
    startTransition(async () => {
      await submitPlanUpgrade({
        onError: setError,
        onPendingSync: (message) => {
          setSuccessMessage(message);
          setConfirmOpen(false);
        },
        targetPlanId,
      });
    });
  }

  return (
    <section className="rounded-[14px] border bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <PlanUpgradeSummary />
        {upgradeOptions.length > 0 ? (
          <PlanUpgradeSelector
            billingInterval={billingInterval}
            disabled={unavailable}
            isPending={isPending}
            onConfirm={openUpgradeConfirmation}
            onPlanChange={setTargetPlanId}
            options={upgradeOptions}
            value={targetPlanId}
          />
        ) : (
          <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            You are already on the highest plan.
          </p>
        )}
      </div>

      <SelectedPlanNotice
        billingInterval={billingInterval}
        plan={selectedPlan}
        priceLabel={selectedPlanPriceLabel}
        visible={upgradeOptions.length > 0}
      />

      <PlanUpgradeDialog
        billingInterval={billingInterval}
        error={error}
        isPending={isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={upgradePlan}
        open={confirmOpen}
        plan={selectedPlan}
        priceLabel={selectedPlanPriceLabel}
        setOpen={setConfirmOpen}
      />

      {!canManage ? (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
          Only organization owners and admins can upgrade the membership.
        </p>
      ) : null}
      <FeedbackMessages error={error} successMessage={successMessage} />
    </section>
  );
}

function PlanUpgradeSummary() {
  return (
    <div>
      <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-olea-green">
        <TrendingUp className="size-5" />
      </div>
      <h2 className="mt-4 text-base font-bold text-slate-800">Upgrade your plan</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
        Move to a higher tier without starting checkout again. The prorated
        difference is billed immediately, and Olea unlocks the new access after
        the subscription sync completes.
      </p>
    </div>
  );
}

function PlanUpgradeSelector({
  billingInterval,
  disabled,
  isPending,
  onConfirm,
  onPlanChange,
  options,
  value,
}: {
  billingInterval: BillingInterval;
  disabled: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onPlanChange: (value: MembershipTier) => void;
  options: MembershipPlanOption[];
  value: MembershipTier;
}) {
  return (
    <div className="grid gap-3 sm:min-w-[360px] sm:grid-cols-[1fr_auto]">
      <Select
        disabled={disabled}
        onValueChange={(planId) => onPlanChange(planId as MembershipTier)}
        value={value}
      >
        <SelectTrigger aria-label="Choose plan to upgrade to">
          <SelectValue placeholder="Choose a plan" />
        </SelectTrigger>
        <SelectContent>
          {options.map((plan) => (
            <SelectItem key={plan.id} value={plan.id}>
              {plan.name} - {getPlanPriceLabel(plan.id, billingInterval)} /{" "}
              {getBillingIntervalLabel(billingInterval)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button disabled={disabled} onClick={onConfirm} type="button">
        {isPending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <TrendingUp className="size-4" />
        )}
        Review upgrade
      </Button>
    </div>
  );
}

function SelectedPlanNotice({
  billingInterval,
  plan,
  priceLabel,
  visible,
}: {
  billingInterval: BillingInterval;
  plan: MembershipPlanOption | undefined;
  priceLabel: string;
  visible: boolean;
}) {
  if (!plan || !visible) return null;

  return (
    <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
      Upgrade to <strong>{plan.name}</strong> for {priceLabel} /{" "}
      {getBillingIntervalLabel(billingInterval)}. Downgrades are handled by
      support so access changes stay clean.
    </p>
  );
}

function PlanUpgradeDialog({
  billingInterval,
  error,
  isPending,
  onCancel,
  onConfirm,
  open,
  plan,
  priceLabel,
  setOpen,
}: {
  billingInterval: BillingInterval;
  error: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  plan: MembershipPlanOption | undefined;
  priceLabel: string;
  setOpen: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isPending && setOpen(nextOpen)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <TrendingUp className="size-5" />
          </div>
          <DialogTitle>Confirm plan upgrade</DialogTitle>
          <DialogDescription>
            Review this billing change before we update your membership.
          </DialogDescription>
        </DialogHeader>
        <PlanUpgradeDialogBody
          billingInterval={billingInterval}
          plan={plan}
          priceLabel={priceLabel}
        />
        {error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button disabled={isPending} onClick={onCancel} type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={isPending || !plan} onClick={onConfirm} type="button">
            {isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <TrendingUp className="size-4" />
            )}
            Confirm upgrade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanUpgradeDialogBody({
  billingInterval,
  plan,
  priceLabel,
}: {
  billingInterval: BillingInterval;
  plan: MembershipPlanOption | undefined;
  priceLabel: string;
}) {
  if (!plan) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
          New plan
        </p>
        <p className="mt-2 text-lg font-bold text-slate-900">{plan.name}</p>
        <p className="mt-1 text-sm text-slate-600">
          {priceLabel} / {billingInterval}
        </p>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        The prorated difference may be billed immediately. Your access will
        update after the billing provider confirms the subscription change.
      </div>
      <p className="text-sm leading-6 text-slate-500">
        This action can increase the organization&apos;s recurring membership
        cost. Downgrades are handled by support to avoid accidentally removing
        access.
      </p>
    </div>
  );
}

function FeedbackMessages({
  error,
  successMessage,
}: {
  error: string;
  successMessage: string;
}) {
  return (
    <>
      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
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
    </>
  );
}
