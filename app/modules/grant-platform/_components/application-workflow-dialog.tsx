"use client";

import { GitBranch, Send } from "lucide-react";
import { useState } from "react";

import { updateGrantPlatformApplicationStatus } from "@/app/modules/grant-platform/actions";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GrantPlatformWorkspaceData } from "@/lib/data/grant-platform";

function getWorkflowSelection(data: GrantPlatformWorkspaceData) {
  const selectedRound =
    data.rounds.find((round) => round.existingApplicationId) ??
    data.rounds.find((round) => round.status === "open") ??
    data.rounds[0] ??
    null;

  const activeApplication = selectedRound
    ? data.applications.find((application) => application.id === selectedRound.existingApplicationId) ??
      data.applications.find((application) => application.roundId === selectedRound.id) ??
      null
    : null;

  return {
    activeApplication,
    selectedRound,
  };
}

export function ApplicationWorkflowDialog({ data }: { data: GrantPlatformWorkspaceData }) {
  const [open, setOpen] = useState(false);
  const [draftMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusValue, setStatusValue] = useState("draft");
  const [noteValue, setNoteValue] = useState("");
  const { activeApplication, selectedRound } = getWorkflowSelection(data);

  const workflowStages = [
    {
      key: "draft",
      title: "Intake",
      description: "Draft and confirm the request details.",
      active: activeApplication?.status === "draft",
    },
    {
      key: "submitted",
      title: "Submitted",
      description: "The request is ready for review.",
      active: activeApplication?.status === "submitted",
    },
    {
      key: "in_review",
      title: "Under review",
      description: "Leadership and team review is underway.",
      active: activeApplication?.status === "in_review",
    },
    {
      key: "shortlisted",
      title: "Shortlisted",
      description: "The request is moving toward a decision.",
      active: activeApplication?.status === "shortlisted",
    },
    {
      key: "approved",
      title: "Approved",
      description: "Awarded and ready for follow-up.",
      active: activeApplication?.status === "approved",
    },
  ];

  async function handleStatusUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = await updateGrantPlatformApplicationStatus(formData);

    if (result.success) {
      setStatusValue(String(formData.get("status") ?? "draft"));
      setNoteValue(String(formData.get("collaborationNote") ?? ""));
    }

    setStatusMessage(result.message);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        className="gap-2 bg-slate-100 font-medium text-slate-800 hover:bg-slate-200"
        onClick={() => setOpen(true)}
      >
        <GitBranch className="size-4 text-olea-green" />
        Application Workflow
      </Button>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <GitBranch className="size-5 text-olea-green" />
            Application Workflow
          </DialogTitle>
          <DialogDescription>
            Track request stages, update workflow status, and submit grant applications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {workflowStages.map((stage) => (
              <div
                key={stage.key}
                className={`rounded-lg border p-3 ${
                  stage.active ? "border-olea-green bg-olea-light/50" : "border-slate-200 bg-white"
                }`}
              >
                <p className="font-semibold text-slate-900">{stage.title}</p>
                <p className="mt-1 text-xs text-slate-600">{stage.description}</p>
              </div>
            ))}
          </div>

          {!selectedRound ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No grant rounds are currently accepting applications.
            </div>
          ) : activeApplication ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{activeApplication.roundName}</p>
                  <p className="text-xs text-slate-600">{activeApplication.focusArea}</p>
                </div>
                <Badge className="bg-white text-slate-700">{activeApplication.status}</Badge>
              </div>
              <p className="mt-2 text-xs text-slate-600">{activeApplication.summary}</p>

              <form onSubmit={handleStatusUpdate} className="mt-4 space-y-3 border-t border-slate-200 pt-3">
                <input type="hidden" name="applicationId" value={activeApplication.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Workflow status
                    <input type="hidden" name="status" value={statusValue} />
                    <Select value={statusValue} onValueChange={setStatusValue}>
                      <SelectTrigger className="mt-1 h-9 text-xs">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft (Intake)</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="in_review">Under review</SelectItem>
                        <SelectItem value="shortlisted">Shortlisted</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Collaboration note
                    <Input
                      className="mt-1 h-9 text-xs"
                      name="collaborationNote"
                      placeholder="Add review notes..."
                      value={noteValue}
                      onChange={(e) => setNoteValue(e.target.value)}
                    />
                  </label>
                </div>

                {statusMessage ? <p className="text-xs text-olea-green">{statusMessage}</p> : null}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" name="intent" type="submit" value="draft" variant="outline">
                    Save draft
                  </Button>
                  <Button size="sm" name="intent" type="submit" value="submit" className="bg-olea-green text-white">
                    <Send className="mr-1.5 size-3.5" />
                    Submit application
                  </Button>
                </div>
              </form>
            </div>
          ) : null}
          {draftMessage ? <p className="text-xs text-olea-green">{draftMessage}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
