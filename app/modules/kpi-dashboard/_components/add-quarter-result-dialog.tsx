"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useFormState } from "react-dom";

import {
  createKpiTrackerEntryDialog,
  type KpiDialogActionState,
} from "@/app/modules/kpi-dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: KpiDialogActionState = {
  message: "",
  status: "idle",
};

export function AddQuarterResultDialog({
  children,
  quarter,
}: {
  children: ReactNode;
  quarter: 1 | 2 | 3 | 4;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(
    createKpiTrackerEntryDialog,
    initialState,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.status !== "success") return;

    setOpen(false);
    router.refresh();
  }, [router, state.status]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add KPI to Q{quarter}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add KPI to Q{quarter}</DialogTitle>
          <DialogDescription>
            Define the KPI and enter the staff-reported result for this quarter.
            The KPI will then appear in every tracker tab.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-5">
          {children}
          <div aria-live="polite" className="text-sm">
            {state.status === "error" && (
              <p className="text-red-600">{state.message}</p>
            )}
          </div>
          <SubmitButton pendingText="Adding KPI...">Add KPI</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
