"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createGrantPlatformGrant } from "@/app/modules/grant-platform/actions";

export function AddGrantDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState("planning");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const result = await createGrantPlatformGrant(formData);

    setPending(false);
    setMessage(result.message);

    if (result.success) {
      setOpen(false);
      event.currentTarget.reset();
      setStatus("planning");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            Capture the core details for a new opportunity and start the workflow from planning.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input type="hidden" name="status" value={status} />
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
              <Input id="amount-requested" min="1" name="requestedAmount" type="number" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Application deadline</Label>
              <Input id="deadline" name="deadline" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Current status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
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
