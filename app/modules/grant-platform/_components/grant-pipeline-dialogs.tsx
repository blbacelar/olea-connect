"use client";

import { CheckCircle2, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function GrantPortalDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="size-5 text-orange-600" />
            Open Funder Portal
          </DialogTitle>
          <DialogDescription>
            You are launching the official BC Community Gaming Grant Application
            Portal.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-xs text-slate-700">
          <p className="font-semibold text-slate-900">Submission Steps:</p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>Log in to your funder portal account</li>
            <li>Select &quot;BC Community Gaming Grant&quot;</li>
            <li>Upload your finalized Problem Statement & Budget</li>
            <li>Submit application and copy your confirmation number</li>
            <li>Return to Olea and click &quot;Mark as Submitted&quot;</li>
          </ol>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-orange-600 text-white hover:bg-orange-700"
            onClick={() => {
              window.open("https://grants.bc.ca/gaming", "_blank");
              onOpenChange(false);
            }}
          >
            Launch Portal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GrantSubmissionDialog({
  activeGrantForSubmission,
  confirmationNumber,
  open,
  submissionSuccessMsg,
  onConfirmationNumberChange,
  onOpenChange,
  onSubmit,
}: {
  activeGrantForSubmission: string | null;
  confirmationNumber: string;
  open: boolean;
  submissionSuccessMsg: string | null;
  onConfirmationNumberChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-olea-green" />
            Mark Grant as Submitted
          </DialogTitle>
          <DialogDescription>
            Record your official funder submission confirmation for{" "}
            {activeGrantForSubmission}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">
              Funder Confirmation Number
            </label>
            <Input
              placeholder="e.g. BC-GAMING-2026-12345"
              value={confirmationNumber}
              onChange={(event) =>
                onConfirmationNumberChange(event.target.value)
              }
              required
            />
          </div>
          {submissionSuccessMsg ? (
            <p className="text-xs font-semibold text-olea-green">
              {submissionSuccessMsg}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-olea-green text-white hover:bg-olea-green/90"
            >
              Confirm Submission
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
