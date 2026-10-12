"use client";

import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

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
  const [state, setState] = useState<KpiDialogActionState>(initialState);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setState(initialState);
    try {
      const result = await createKpiTrackerEntryDialog(initialState, formData);
      setState(result);
      if (result.status === "success") {
        setOpen(false);
        router.refresh();
      }
    } catch {
      setState({ message: "The KPI could not be added. Try again.", status: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (nextOpen) setState(initialState);
    }}>
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
            The KPI will appear in this quarter. Add it from another quarter when
            you are ready to start tracking that quarter as well. Existing KPI
            definitions are reused and remain unchanged; use the same shared
            definition values, or edit the existing KPI row to change them.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {children}
          <div aria-live="polite" className="text-sm">
            {state.status === "error" && (
              <p className="text-red-600">{state.message}</p>
            )}
          </div>
          <Button disabled={pending} type="submit">
            {pending ? <><Loader2 aria-hidden="true" className="size-4 animate-spin" />Adding KPI...</> : "Add KPI"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
