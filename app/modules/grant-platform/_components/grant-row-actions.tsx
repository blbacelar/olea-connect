"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteGrantPlatformGrant, updateGrantPlatformGrant } from "@/app/modules/grant-platform/actions";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GrantPlatformWorkspaceData } from "@/lib/data/grant-platform";

type Application = GrantPlatformWorkspaceData["applications"][number];

export function GrantRowActions({ application, canDelete }: { application: Application; canDelete: boolean }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("applicationId", application.id);
      const result = await updateGrantPlatformGrant(formData);
      if (!result.success) return setMessage(result.message);
      setEditOpen(false);
      router.refresh();
    } catch {
      setMessage("The grant could not be updated. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function submitDelete() {
    setPending(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("applicationId", application.id);
      const result = await deleteGrantPlatformGrant(formData);
      if (!result.success) return setMessage(result.message);
      setDeleteOpen(false);
      router.refresh();
    } catch {
      setMessage("The grant could not be deleted. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); setMessage(null); }}>
        <DialogTrigger asChild>
          <Button aria-label={`Edit ${application.roundName}`} size="icon" type="button" variant="ghost"><Pencil className="size-4" /></Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit grant</DialogTitle>
            <DialogDescription>Update this workspace draft. Submitted or shared grants cannot be changed here.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitEdit}>
            <div className="space-y-2">
              <Label htmlFor={`edit-grant-name-${application.id}`}>Grant name</Label>
              <Input id={`edit-grant-name-${application.id}`} defaultValue={application.roundName} maxLength={180} name="name" placeholder="e.g. Youth Leadership Fund 2027" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-funder-${application.id}`}>Funder</Label>
              <Input id={`edit-funder-${application.id}`} defaultValue={application.funderName === "Unassigned funder" ? "" : application.funderName} maxLength={180} name="funderName" placeholder="e.g. Community Foundation" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`edit-amount-${application.id}`}>Amount requested (CAD)</Label>
                <CurrencyInput defaultValue={(application.requestedAmountCents / 100).toFixed(2)} id={`edit-amount-${application.id}`} key={`${application.id}-${application.requestedAmountCents}`} min="1" name="requestedAmount" placeholder="$2,500.00" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`edit-deadline-${application.id}`}>Application deadline</Label>
                <Input id={`edit-deadline-${application.id}`} defaultValue={application.deadlineAt?.slice(0, 10)} name="deadline" type="date" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-notes-${application.id}`}>Notes</Label>
              <Textarea defaultValue={application.notes} id={`edit-notes-${application.id}`} maxLength={2000} name="notes" placeholder="Add context about this grant" rows={3} />
            </div>
            {message ? <p role="alert" className="text-sm text-red-700">{message}</p> : null}
            <DialogFooter>
              <Button disabled={pending} onClick={() => setEditOpen(false)} type="button" variant="outline">Cancel</Button>
              <Button disabled={pending} type="submit">{pending ? "Saving..." : "Save grant"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {canDelete ? (
        <Dialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); setMessage(null); }}>
          <DialogTrigger asChild>
            <Button aria-label={`Delete ${application.roundName}`} size="icon" type="button" variant="ghost"><Trash2 className="size-4" /></Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete grant draft?</DialogTitle>
              <DialogDescription>Delete {application.roundName} and its draft data permanently? This cannot be undone.</DialogDescription>
            </DialogHeader>
            {message ? <p role="alert" className="text-sm text-red-700">{message}</p> : null}
            <DialogFooter>
              <Button disabled={pending} onClick={() => setDeleteOpen(false)} type="button" variant="outline">Cancel</Button>
              <Button disabled={pending} onClick={submitDelete} type="button" variant="destructive">{pending ? "Deleting..." : "Delete grant"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
