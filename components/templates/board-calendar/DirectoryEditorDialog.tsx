"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WorkspaceMemberOption } from "@/lib/template-renderer/types";

import {
  Field,
  getString,
  WorkspaceMemberSelect,
  type TemplateRecord,
} from "./workflow-utils";

export function DirectoryEditorDialog({
  committeeDraft,
  editingCommittee,
  editingCommitteeIndex,
  workspaceMembers,
  onAssignChair,
  onClose,
  onSave,
  onUpdateDraft,
}: {
  committeeDraft: TemplateRecord | null;
  editingCommittee: TemplateRecord | null;
  editingCommitteeIndex: number | null;
  workspaceMembers: WorkspaceMemberOption[];
  onAssignChair: (member: WorkspaceMemberOption | null) => void;
  onClose: () => void;
  onSave: () => void;
  onUpdateDraft: (field: string, value: unknown) => void;
}) {
  return (
    <Dialog
      open={editingCommitteeIndex !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingCommittee ? "Edit directory entry" : "Add directory entry"}
          </DialogTitle>
          <DialogDescription>
            {editingCommittee
              ? "Update the committee name, chair, and internal notes."
              : "Create a committee directory entry with an assigned workspace member."}
          </DialogDescription>
        </DialogHeader>
        {committeeDraft ? (
          <div className="space-y-4">
            <Field label="Committee name">
              <Input
                aria-label={`Committee ${(editingCommitteeIndex ?? 0) + 1} name`}
                value={getString(committeeDraft, "name")}
                onChange={(event) => onUpdateDraft("name", event.target.value)}
              />
            </Field>
            <Field label="Chair">
              <WorkspaceMemberSelect
                ariaLabel={`Committee ${(editingCommitteeIndex ?? 0) + 1} chair`}
                memberId={getString(committeeDraft, "chair_user_id")}
                members={workspaceMembers}
                savedMemberName={getString(committeeDraft, "chair")}
                onMemberChange={onAssignChair}
              />
            </Field>
            <Field label="Notes">
              <Textarea
                aria-label={`Committee ${(editingCommitteeIndex ?? 0) + 1} notes`}
                value={getString(committeeDraft, "notes")}
                placeholder="Add context, meeting cadence, or contact details."
                onChange={(event) => onUpdateDraft("notes", event.target.value)}
              />
            </Field>
          </div>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={onSave}>
            Save directory entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
