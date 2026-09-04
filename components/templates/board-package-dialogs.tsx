import { LoaderCircle } from "lucide-react";

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
import type {
  BoardPackageDocument,
  BoardPackageMeeting,
} from "@/lib/template-renderer/board-calendar-packages";

import { BoardPackageUploadFields } from "./board-package-upload-fields";
import type { UploadFormState } from "./board-package-upload-state";

export function BoardPackageUploadDialog({
  form,
  formError,
  isOpen,
  isUploading,
  onClose,
  onFileChange,
  onSubmit,
  onUpdateForm,
  title,
}: {
  form: UploadFormState;
  formError: string;
  isOpen: boolean;
  isUploading: boolean;
  onClose: () => void;
  onFileChange: (file: File | null) => void;
  onSubmit: () => void;
  onUpdateForm: <Key extends keyof UploadFormState>(
    key: Key,
    value: UploadFormState[Key],
  ) => void;
  title: string;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Upload a private board document or attach a secure external
            reference link. Private files are opened through short-lived signed
            download links.
          </DialogDescription>
        </DialogHeader>
        <BoardPackageUploadFields
          form={form}
          onFileChange={onFileChange}
          onUpdateForm={onUpdateForm}
        />
        {formError ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" disabled={isUploading} onClick={onSubmit}>
            {isUploading ? "Adding file..." : "Add file"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConfidentialDownloadDialog({
  downloadError,
  downloadTarget,
  onConfirm,
  onDownloadErrorChange,
  onDownloadTargetChange,
}: {
  downloadError: string;
  downloadTarget: BoardPackageDocument | null;
  onConfirm: () => void;
  onDownloadErrorChange: (message: string) => void;
  onDownloadTargetChange: (document: BoardPackageDocument | null) => void;
}) {
  return (
    <>
      <Dialog
        open={Boolean(downloadTarget)}
        onOpenChange={(open) => {
          if (!open) {
            onDownloadTargetChange(null);
            onDownloadErrorChange("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open confidential document?</DialogTitle>
            <DialogDescription>
              “{downloadTarget?.name}” may contain private board information.
              Only open it in a secure environment and do not share it outside
              approved board package access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={onConfirm}>
              I understand, open document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PackageMessageDialog
        description={downloadError}
        onOpenChange={(open) => !open && onDownloadErrorChange("")}
        open={Boolean(downloadError)}
        title="Document unavailable"
      />
    </>
  );
}

export function PackageDownloadDialog({
  acknowledged,
  includesConfidentialDocuments,
  isPackaging,
  onAcknowledgedChange,
  onConfirm,
  onOpenChange,
  packageTarget,
}: {
  acknowledged: boolean;
  includesConfidentialDocuments: boolean;
  isPackaging: boolean;
  onAcknowledgedChange: (acknowledged: boolean) => void;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  packageTarget: BoardPackageMeeting | null;
}) {
  return (
    <Dialog open={Boolean(packageTarget)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download board package?</DialogTitle>
          <DialogDescription>
            “{packageTarget?.title}” includes {packageTarget?.documentCount ?? 0}{" "}
            document(s). This will download a zip package with uploaded files
            and a package index. Access is recorded in the audit log.
          </DialogDescription>
        </DialogHeader>
        {includesConfidentialDocuments ? (
          <ConfidentialPackageAcknowledgement
            acknowledged={acknowledged}
            disabled={isPackaging}
            onChange={onAcknowledgedChange}
          />
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPackaging}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={isPackaging || (includesConfidentialDocuments && !acknowledged)}
            onClick={onConfirm}
          >
            {isPackaging ? (
              <>
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Preparing package
              </>
            ) : (
              "Download package"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteBoardPackageDocumentDialog({
  deleteTarget,
  onConfirm,
  onOpenChange,
}: {
  deleteTarget: BoardPackageDocument | null;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(deleteTarget)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this board document?</DialogTitle>
          <DialogDescription>
            “{deleteTarget?.name}” will be removed from this package. This
            action is recorded in the audit log.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Delete document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PackageMessageDialog({
  description,
  onOpenChange,
  open,
  title,
}: {
  description: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfidentialPackageAcknowledgement({
  acknowledged,
  disabled,
  onChange,
}: {
  acknowledged: boolean;
  disabled: boolean;
  onChange: (acknowledged: boolean) => void;
}) {
  return (
    <label className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
      <input
        type="checkbox"
        className="mt-1 size-4 shrink-0 accent-olea-green"
        checked={acknowledged}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <strong className="block font-semibold">
          Confidentiality acknowledgement required
        </strong>
        I acknowledge this board package includes confidential materials and will
        only share them with authorized board package recipients.
      </span>
    </label>
  );
}
