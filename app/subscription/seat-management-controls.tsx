"use client";

import { CheckCircle2, LoaderCircle, Plus } from "lucide-react";
import type { MutableRefObject } from "react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRoutes } from "@/lib/api-routes";

import { createBillingUpdateIdempotencyKey } from "./billing-action-utils";

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
  const [confirmButton, setConfirmButton] = useState<HTMLButtonElement | null>(null);
  const seatUpdateIdempotencyKeyRef = useRef<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const unavailable = disabled || isPending || !canManage;

  function openConfirmation() {
    seatUpdateIdempotencyKeyRef.current = createBillingUpdateIdempotencyKey("seat");
    setConfirmOpen(true);
  }

  function closeConfirmation() {
    if (!isPending) forceCloseConfirmation();
  }

  function forceCloseConfirmation() {
    closeSeatDialog(seatUpdateIdempotencyKeyRef, setConfirmOpen);
  }

  useSeatDialogEscape({
    confirmButton,
    confirmOpen,
    isPending,
    onClose: closeConfirmation,
  });

  function addSeat() {
    startTransition(async () => {
      await submitSeatPurchase({
        idempotencyKey:
          seatUpdateIdempotencyKeyRef.current ??
          createBillingUpdateIdempotencyKey("seat"),
        onDialogClose: forceCloseConfirmation,
        onError: setError,
        onPendingSync: setSuccessMessage,
        seatQuantity,
      });
    });
  }

  return (
    <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SeatPurchaseSummary canManage={canManage} seatPriceLabel={seatPriceLabel} />
        <Button disabled={unavailable} onClick={openConfirmation} type="button">
          {isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Add paid seat
        </Button>
      </div>
      <SeatPurchaseDialog
        isPending={isPending}
        onCancel={closeConfirmation}
        onConfirm={addSeat}
        onQuantityChange={setSeatQuantity}
        onConfirmButtonReady={setConfirmButton}
        open={confirmOpen}
        quantity={seatQuantity}
        seatPriceLabel={seatPriceLabel}
      />
      <SeatFeedback error={error} successMessage={successMessage} />
    </div>
  );
}

function SeatPurchaseSummary({
  canManage,
  seatPriceLabel,
}: {
  canManage: boolean;
  seatPriceLabel: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-bold text-emerald-950">Need another teammate?</h3>
      <p className="mt-1 text-xs leading-5 text-emerald-900">
        Add one paid seat for {seatPriceLabel}. After payment is confirmed,
        invite the teammate from Team.
      </p>
      {!canManage ? (
        <p className="mt-2 text-xs font-semibold text-emerald-900">
          Only organization owners and admins can add seats.
        </p>
      ) : null}
    </div>
  );
}

function SeatPurchaseDialog({
  isPending,
  onCancel,
  onConfirm,
  onConfirmButtonReady,
  onQuantityChange,
  open,
  quantity,
  seatPriceLabel,
}: {
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onConfirmButtonReady: (button: HTMLButtonElement | null) => void;
  onQuantityChange: (value: string) => void;
  open: boolean;
  quantity: string;
  seatPriceLabel: string;
}) {
  if (!open) return null;

  return (
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
        <h3 id="add-seat-dialog-title" className="mt-4 text-lg font-bold text-slate-900">
          Add paid seats?
        </h3>
        <p id="add-seat-dialog-description" className="mt-2 text-sm leading-6 text-slate-600">
          Select how many teammate seats to add for {seatPriceLabel} each. This
          is a one-time payment. The seats remain available for your
          organization after payment is confirmed.
        </p>
        <SeatQuantitySelect
          disabled={isPending}
          onQuantityChange={onQuantityChange}
          quantity={quantity}
        />
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button disabled={isPending} onClick={onCancel} type="button" variant="outline">
            Cancel
          </Button>
          <Button
            disabled={isPending}
            onClick={onConfirm}
            ref={onConfirmButtonReady}
            type="button"
          >
            {isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Continue to payment
          </Button>
        </div>
      </div>
    </div>
  );
}

function SeatQuantitySelect({
  disabled,
  onQuantityChange,
  quantity,
}: {
  disabled: boolean;
  onQuantityChange: (value: string) => void;
  quantity: string;
}) {
  return (
    <div className="mt-5 space-y-2">
      <label className="text-sm font-semibold text-slate-800" htmlFor="seat-quantity">
        Seats to add
      </label>
      <Select disabled={disabled} onValueChange={onQuantityChange} value={quantity}>
        <SelectTrigger id="seat-quantity">
          <SelectValue placeholder="Choose quantity" />
        </SelectTrigger>
        <SelectContent>
          {[1, 2, 3].map((option) => (
            <SelectItem key={option} value={String(option)}>
              {option} seat{option === 1 ? "" : "s"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SeatFeedback({
  error,
  successMessage,
}: {
  error: string;
  successMessage: string;
}) {
  return (
    <>
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
    </>
  );
}

function useSeatDialogEscape({
  confirmButton,
  confirmOpen,
  isPending,
  onClose,
}: {
  confirmButton: HTMLButtonElement | null;
  confirmOpen: boolean;
  isPending: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!confirmOpen) return;
    confirmButton?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onClose();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirmButton, confirmOpen, isPending, onClose]);
}

async function submitSeatPurchase({
  idempotencyKey,
  onDialogClose,
  onError,
  onPendingSync,
  seatQuantity,
}: {
  idempotencyKey: string;
  onDialogClose: () => void;
  onError: (message: string) => void;
  onPendingSync: (message: string) => void;
  seatQuantity: string;
}) {
  onError("");
  try {
    const response = await fetch(apiRoutes.stripePortal, {
      body: JSON.stringify({
        action: "add_seat",
        idempotencyKey,
        seatQuantity: Number(seatQuantity),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      url?: string;
    };

    handleSeatPurchaseResponse(response, result, { onDialogClose, onError, onPendingSync });
  } catch {
    onError("Unable to reach billing management. Please try again.");
    onDialogClose();
  }
}

function handleSeatPurchaseResponse(
  response: Response,
  result: { error?: string; message?: string; url?: string },
  handlers: {
    onDialogClose: () => void;
    onError: (message: string) => void;
    onPendingSync: (message: string) => void;
  },
) {
  if (response.status === 202) {
    handlers.onPendingSync(
      result.message ??
        "Your seat update was confirmed. Team access is still syncing and should be available shortly.",
    );
    handlers.onDialogClose();
    return;
  }

  if (!response.ok || !result.url) {
    handlers.onError(result.error ?? "Unable to start the seat payment.");
    handlers.onDialogClose();
    return;
  }

  window.location.assign(result.url);
}

function closeSeatDialog(
  idempotencyKeyRef: MutableRefObject<string | null>,
  setConfirmOpen: (open: boolean) => void,
) {
  idempotencyKeyRef.current = null;
  setConfirmOpen(false);
}
