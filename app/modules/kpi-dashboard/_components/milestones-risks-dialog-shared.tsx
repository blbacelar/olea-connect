"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormStatus } from "react-dom";

import type { KpiDialogActionState } from "@/app/modules/kpi-dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const initialState: KpiDialogActionState = {
  message: "",
  status: "idle",
};

export function HiddenDashboard({ dashboardId }: { dashboardId: string }) {
  return <input type="hidden" name="dashboardId" value={dashboardId} />;
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs font-medium text-slate-500">{children}</p>;
}

export function ModalSubmitButton({
  children,
  pendingText,
  variant = "default",
}: {
  children: string;
  pendingText: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit" variant={variant}>
      {pending ? pendingText : children}
    </Button>
  );
}

export function SelectField({
  ariaLabel,
  defaultValue,
  name,
  options,
}: {
  ariaLabel: string;
  defaultValue: string;
  name: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <Select defaultValue={defaultValue} name={name}>
      <SelectTrigger aria-label={ariaLabel} className="h-11 bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ActionStateMessage({ state }: { state: KpiDialogActionState }) {
  if (state.status !== "error") return null;

  return (
    <p
      role="alert"
      className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700"
    >
      {state.message}
    </p>
  );
}

export function useCloseOnSuccess(
  state: KpiDialogActionState,
  setOpen: (open: boolean) => void,
) {
  const router = useRouter();

  useEffect(() => {
    if (state.status !== "success") return;

    setOpen(false);
    router.refresh();
  }, [router, setOpen, state.status]);
}
