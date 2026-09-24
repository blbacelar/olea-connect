"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createGrantPlatformGrant } from "@/app/modules/grant-platform/actions";

export function AddGrantDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setMessage(null);

    try {
      const result = await createGrantPlatformGrant(new FormData(form));
      setMessage(result.message);
      if (result.success) {
        form.reset();
        setOpen(false);
        router.refresh();
      }
    } catch {
      setMessage("The grant could not be created right now. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (nextOpen) setMessage(null);
    }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <Plus className="size-4" />
          Add Grant
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add new grant</DialogTitle>
          <DialogDescription>
            Capture the core details for a new opportunity. New grants start as drafts.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="grant-name">Grant name</Label>
              <Input id="grant-name" name="name" placeholder="e.g. Youth Leadership Fund 2026" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="funder-name">Funder</Label>
              <Input id="funder-name" name="funderName" placeholder="e.g. Province of BC" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount-requested">Amount requested (CAD)</Label>
              <CurrencyInput
                id="amount-requested"
                min="1"
                name="requestedAmount"
                placeholder="$25,000.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Application deadline</Label>
              <Input id="deadline" name="deadline" type="date" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" placeholder="Any additional notes..." rows={3} />
            </div>
          </div>
          {message ? <p className={message.includes("success") ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{message}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={pending} type="submit">
              {pending ? "Creating..." : "Create Grant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
