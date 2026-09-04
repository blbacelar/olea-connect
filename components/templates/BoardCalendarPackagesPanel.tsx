"use client";

import { useMemo } from "react";

import { AlertTriangle, PackageOpen, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  BoardPackageUploadDialog,
  ConfidentialDownloadDialog,
  DeleteBoardPackageDocumentDialog,
  PackageDownloadDialog,
  PackageMessageDialog,
} from "@/components/templates/board-package-dialogs";
import {
  BoardPackageMeetingCard,
  DocumentList,
  EmptyPackageState,
} from "@/components/templates/board-package-lists";
import { useBoardPackageDocumentActions } from "@/components/templates/use-board-package-document-actions";
import { useBoardPackageDownloadController } from "@/components/templates/use-board-package-download-controller";
import { useBoardPackageUploadController } from "@/components/templates/use-board-package-upload-controller";
import {
  buildBoardPackageMeetings,
  getGeneralBoardPackageDocuments,
} from "@/lib/template-renderer/board-calendar-packages";
import type { TemplateFormData } from "@/lib/template-renderer/types";
import type { BrandProfile } from "@/lib/types";

export { BoardPackageAuditLogPanel } from "@/components/templates/board-package-lists";

export function BoardPackagesPanel({
  brand,
  data,
  onDataChange,
  templateInstanceId,
}: {
  brand: BrandProfile;
  data: TemplateFormData;
  onDataChange: (
    updater: (currentData: TemplateFormData) => TemplateFormData,
  ) => void;
  templateInstanceId: string;
}) {
  const meetings = useMemo(() => buildBoardPackageMeetings(data), [data]);
  const generalDocuments = useMemo(
    () => getGeneralBoardPackageDocuments(data),
    [data],
  );
  const upload = useBoardPackageUploadController({
    onDataChange,
    templateInstanceId,
  });
  const documents = useBoardPackageDocumentActions({
    meetings,
    onDataChange,
    templateInstanceId,
  });
  const packages = useBoardPackageDownloadController({
    brand,
    onDataChange,
    setOperationError: documents.setOperationError,
    templateInstanceId,
  });

  return (
    <section
      className="space-y-5"
      data-testid="board-calendar-packages-panel"
    >
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <p>
            Board packages can include confidential governance documents. Members
            must acknowledge confidentiality before opening restricted files, and
            downloads are recorded in the audit log.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {meetings.length ? (
          meetings.map((meeting) => (
            <BoardPackageMeetingCard
              key={meeting.id}
              meeting={meeting}
              onAddFile={() => upload.openMeetingUpload(meeting)}
              onDeleteDocument={documents.setDeleteTarget}
              onDownloadDocument={(document) =>
                documents.requestDocumentDownload(document, meeting)
              }
              onDownloadPackage={() => packages.setPackageTarget(meeting)}
            />
          ))
        ) : (
          <EmptyPackageState
            icon={PackageOpen}
            title="No meeting packages yet"
            description="Add meetings from the calendar tab first. Each meeting automatically becomes a board package workspace."
          />
        )}
      </div>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">
              General board documents
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Store standing policies, reference files, and documents that are
              not tied to one meeting.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={upload.openGeneralUpload}>
            <Plus className="mr-2 size-4" />
            Add file
          </Button>
        </div>

        <DocumentList
          documents={generalDocuments}
          emptyLabel="No general documents yet."
          onDeleteDocument={documents.setDeleteTarget}
          onDownloadDocument={documents.requestDocumentDownload}
        />
      </section>

      <BoardPackageUploadDialog
        form={upload.form}
        formError={upload.formError}
        isOpen={upload.isUploadOpen}
        isUploading={upload.isUploading}
        onClose={upload.closeUpload}
        onFileChange={upload.setSelectedFile}
        onSubmit={upload.submitUpload}
        onUpdateForm={upload.updateForm}
        title={upload.uploadTitle}
      />
      <ConfidentialDownloadDialog
        downloadError={documents.downloadError}
        downloadTarget={documents.downloadTarget}
        onConfirm={documents.confirmConfidentialDownload}
        onDownloadErrorChange={documents.setDownloadError}
        onDownloadTargetChange={documents.setDownloadTarget}
      />
      <PackageMessageDialog
        description={documents.operationError}
        onOpenChange={(open) => !open && documents.setOperationError("")}
        open={Boolean(documents.operationError)}
        title="Package action failed"
      />
      <PackageDownloadDialog
        acknowledged={packages.packageAcknowledged}
        includesConfidentialDocuments={packages.packageIncludesConfidentialDocuments}
        isPackaging={packages.isPackaging}
        onAcknowledgedChange={packages.setPackageAcknowledged}
        onConfirm={() => void packages.confirmPackageDownload()}
        onOpenChange={packages.closePackageDialog}
        packageTarget={packages.packageTarget}
      />
      <DeleteBoardPackageDocumentDialog
        deleteTarget={documents.deleteTarget}
        onConfirm={() => void documents.confirmDelete()}
        onOpenChange={(open) => !open && documents.setDeleteTarget(null)}
      />
    </section>
  );
}
