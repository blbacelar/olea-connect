"use client";

import { useMemo, useState } from "react";

import JSZip from "jszip";
import {
  AlertTriangle,
  Download,
  FileText,
  FolderArchive,
  LinkIcon,
  LoaderCircle,
  PackageOpen,
  Plus,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createBoardPackageDocumentDownloadUrl,
  deleteBoardPackageDocumentFile,
  recordBoardPackageAuditEvent,
  uploadBoardPackageDocument,
} from "@/app/modules/board-calendar/actions";
import {
  appendBoardPackageAccessLog,
  appendBoardPackageDocument,
  buildBoardPackageMeetings,
  deleteBoardPackageDocument,
  getBoardPackageAccessLogs,
  getGeneralBoardPackageDocuments,
  type BoardPackageDocument,
  type BoardPackageMeeting,
} from "@/lib/template-renderer/board-calendar-packages";
import type { TemplateFormData } from "@/lib/template-renderer/types";
import type { BrandProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

const documentCategories = [
  "Agenda",
  "Minutes",
  "Financial report",
  "Board report",
  "Policy",
  "Supporting document",
  "Other",
];

const emptyUploadForm = {
  category: "Agenda",
  confidential: true,
  name: "",
  sizeLabel: "",
  url: "",
};

type UploadFormState = typeof emptyUploadForm;

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
  const [uploadMeeting, setUploadMeeting] =
    useState<BoardPackageMeeting | null>(null);
  const [isGeneralUploadOpen, setIsGeneralUploadOpen] = useState(false);
  const [downloadTarget, setDownloadTarget] =
    useState<BoardPackageDocument | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<BoardPackageDocument | null>(null);
  const [packageTarget, setPackageTarget] =
    useState<BoardPackageMeeting | null>(null);
  const [form, setForm] = useState<UploadFormState>(emptyUploadForm);
  const [formError, setFormError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPackaging, setIsPackaging] = useState(false);
  const [packageAcknowledged, setPackageAcknowledged] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [operationError, setOperationError] = useState("");

  const packageIncludesConfidentialDocuments = Boolean(
    packageTarget?.documents.some((document) => document.confidential),
  );

  const isUploadOpen = Boolean(uploadMeeting) || isGeneralUploadOpen;
  const uploadTitle = uploadMeeting
    ? `Add file to ${uploadMeeting.title}`
    : "Add general board document";

  function openMeetingUpload(meeting: BoardPackageMeeting) {
    setUploadMeeting(meeting);
    setIsGeneralUploadOpen(false);
    setForm(emptyUploadForm);
    setFormError("");
    setSelectedFile(null);
  }

  function openGeneralUpload() {
    setUploadMeeting(null);
    setIsGeneralUploadOpen(true);
    setForm(emptyUploadForm);
    setFormError("");
    setSelectedFile(null);
  }

  function closeUpload() {
    setUploadMeeting(null);
    setIsGeneralUploadOpen(false);
    setForm(emptyUploadForm);
    setFormError("");
    setSelectedFile(null);
    setIsUploading(false);
  }

  function updateForm<Key extends keyof UploadFormState>(
    key: Key,
    value: UploadFormState[Key],
  ) {
    setForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  async function submitUpload() {
    const trimmedName = form.name.trim();
    const trimmedUrl = form.url.trim();
    const validationError = validateDocumentForm({
      file: selectedFile,
      name: trimmedName,
      templateInstanceId,
      url: trimmedUrl,
    });

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsUploading(true);
    setFormError("");

    try {
      const uploadedDocumentResult = selectedFile
        ? await uploadSelectedFile({
            file: selectedFile,
            meetingId: uploadMeeting?.id,
            templateInstanceId,
          })
        : null;

      if (uploadedDocumentResult && !uploadedDocumentResult.ok) {
        throw new Error(uploadedDocumentResult.error);
      }

      const uploadedDocument = uploadedDocumentResult?.data ?? null;

      onDataChange((currentData) =>
        appendBoardPackageDocument(currentData, {
          ...form,
          contentType: uploadedDocument?.contentType,
          fileName: uploadedDocument?.fileName,
          meetingId: uploadMeeting?.id,
          name: trimmedName,
          size: uploadedDocument?.size,
          sizeLabel: uploadedDocument?.sizeLabel ?? form.sizeLabel,
          storagePath: uploadedDocument?.storagePath,
          url: trimmedUrl,
        }),
      );
      closeUpload();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to upload this board package document.",
      );
      setIsUploading(false);
    }
  }

  function logDownload(
    document: BoardPackageDocument,
    meeting?: BoardPackageMeeting,
  ) {
    onDataChange((currentData) =>
      appendBoardPackageAccessLog(currentData, {
        action: "document_downloaded",
        documentId: document.id,
        documentName: document.name,
        meetingId: meeting?.id ?? document.meetingId,
        meetingTitle: meeting?.title ?? "",
      }),
    );
  }

  async function openDocument(
    document: BoardPackageDocument,
    meeting?: BoardPackageMeeting,
  ) {
    setDownloadError("");

    try {
      let documentUrl = document.url;

      if (document.storagePath) {
        const documentUrlResult = await createBoardPackageDocumentDownloadUrl({
          documentId: document.id,
          documentName: document.name,
          fileName: document.fileName || document.name,
          meetingId: meeting?.id ?? document.meetingId,
          meetingTitle: meeting?.title ?? "",
          storagePath: document.storagePath,
          templateInstanceId,
        });

        if (!documentUrlResult.ok) {
          throw new Error(documentUrlResult.error);
        }

        documentUrl = documentUrlResult.data.signedUrl;
      }

      if (!documentUrl) {
        throw new Error("This document does not have a downloadable file.");
      }

      if (!document.storagePath && templateInstanceId) {
        const auditResult = await recordBoardPackageAuditEvent({
          action: "document_downloaded",
          documentId: document.id,
          documentName: document.name,
          meetingId: meeting?.id ?? document.meetingId,
          meetingTitle: meeting?.title ?? "",
          templateInstanceId,
        });
        if (!auditResult.ok) throw new Error(auditResult.error);
      }

      logDownload(document, meeting);
      window.open(documentUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : "Unable to open this board package document.",
      );
    }
  }

  function requestDocumentDownload(
    document: BoardPackageDocument,
    meeting?: BoardPackageMeeting,
  ) {
    if (document.confidential) {
      setDownloadTarget(document);
      return;
    }

    void openDocument(document, meeting);
  }

  function confirmConfidentialDownload() {
    if (!downloadTarget) return;
    const meeting = meetings.find((item) => item.id === downloadTarget.meetingId);
    void openDocument(downloadTarget, meeting);
    setDownloadTarget(null);
  }

  async function confirmPackageDownload() {
    if (!packageTarget) return;
    if (packageIncludesConfidentialDocuments && !packageAcknowledged) return;

    setIsPackaging(true);
    try {
      if (templateInstanceId) {
        const auditResult = await recordBoardPackageAuditEvent({
          action: "package_downloaded",
          meetingId: packageTarget.id,
          meetingTitle: packageTarget.title,
          templateInstanceId,
        });
        if (!auditResult.ok) throw new Error(auditResult.error);
      }

      await downloadBoardPackageZip({
        brand,
        meeting: packageTarget,
        templateInstanceId,
      });

      onDataChange((currentData) =>
        appendBoardPackageAccessLog(currentData, {
          action: "package_downloaded",
          meetingId: packageTarget.id,
          meetingTitle: packageTarget.title,
        }),
      );
      setPackageTarget(null);
      setPackageAcknowledged(false);
    } catch (error) {
      setOperationError(
        error instanceof Error
          ? error.message
          : "Unable to prepare this board package download.",
      );
    } finally {
      setIsPackaging(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const meeting = meetings.find((item) => item.id === deleteTarget.meetingId);

    try {
      if (deleteTarget.storagePath) {
        const deleteResult = await deleteBoardPackageDocumentFile({
          documentId: deleteTarget.id,
          documentName: deleteTarget.name,
          meetingId: meeting?.id ?? deleteTarget.meetingId,
          meetingTitle: meeting?.title ?? "",
          storagePath: deleteTarget.storagePath,
          templateInstanceId,
        });
        if (!deleteResult.ok) throw new Error(deleteResult.error);
      } else if (templateInstanceId) {
        const auditResult = await recordBoardPackageAuditEvent({
          action: "document_deleted",
          documentId: deleteTarget.id,
          documentName: deleteTarget.name,
          meetingId: meeting?.id ?? deleteTarget.meetingId,
          meetingTitle: meeting?.title ?? "",
          templateInstanceId,
        });
        if (!auditResult.ok) throw new Error(auditResult.error);
      }

      onDataChange((currentData) =>
        appendBoardPackageAccessLog(
          deleteBoardPackageDocument(currentData, deleteTarget.id),
          {
            action: "document_deleted",
            documentId: deleteTarget.id,
            documentName: deleteTarget.name,
            meetingId: meeting?.id ?? deleteTarget.meetingId,
            meetingTitle: meeting?.title ?? "",
          },
        ),
      );
      setDeleteTarget(null);
    } catch (error) {
      setDeleteTarget(null);
      setOperationError(
        error instanceof Error
          ? error.message
          : "Unable to delete this board package document.",
      );
    }
  }

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
              onAddFile={() => openMeetingUpload(meeting)}
              onDeleteDocument={setDeleteTarget}
              onDownloadDocument={(document) =>
                requestDocumentDownload(document, meeting)
              }
              onDownloadPackage={() => setPackageTarget(meeting)}
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
          <Button type="button" variant="outline" onClick={openGeneralUpload}>
            <Plus className="mr-2 size-4" />
            Add file
          </Button>
        </div>

        <DocumentList
          documents={generalDocuments}
          emptyLabel="No general documents yet."
          onDeleteDocument={setDeleteTarget}
          onDownloadDocument={requestDocumentDownload}
        />
      </section>

      <Dialog open={isUploadOpen} onOpenChange={(open) => !open && closeUpload()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{uploadTitle}</DialogTitle>
            <DialogDescription>
              Upload a private board document or attach a secure external
              reference link. Private files are opened through short-lived
              signed download links.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="board-package-document-name">Document name</Label>
              <Input
                id="board-package-document-name"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="Board agenda, finance report, approved minutes..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="board-package-document-category">
                Document category
              </Label>
              <Select
                value={form.category}
                onValueChange={(value) => updateForm("category", value)}
              >
                <SelectTrigger
                  id="board-package-document-category"
                  aria-label="Document category"
                >
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent>
                  {documentCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="board-package-document-size">
                Size or version label
              </Label>
              <Input
                id="board-package-document-size"
                value={form.sizeLabel}
                onChange={(event) => updateForm("sizeLabel", event.target.value)}
                placeholder="2.4 MB, v1, approved"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="board-package-document-file">
                Private file upload
              </Label>
              <Input
                id="board-package-document-file"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/png,image/jpeg,image/webp"
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] ?? null)
                }
              />
              <p className="text-xs leading-5 text-slate-500">
                PDF, Word, Excel, text, PNG, JPG, or WebP up to 25 MB.
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="board-package-document-url">
                External document link
                <span className="ml-1 text-slate-400">(optional)</span>
              </Label>
              <Input
                id="board-package-document-url"
                type="url"
                value={form.url}
                onChange={(event) => updateForm("url", event.target.value)}
                placeholder="https://... only when the file is stored outside Olea Connects"
              />
            </div>

            <label className="flex items-center gap-3 rounded-lg border bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.confidential}
                onChange={(event) =>
                  updateForm("confidential", event.target.checked)
                }
                className="size-4 rounded border-slate-300"
              />
              Require confidentiality acknowledgement before opening
            </label>
          </div>

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
            <Button type="button" disabled={isUploading} onClick={submitUpload}>
              {isUploading ? "Adding file..." : "Add file"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(downloadTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDownloadTarget(null);
            setDownloadError("");
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
            <Button type="button" onClick={confirmConfidentialDownload}>
              I understand, open document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(downloadError)}
        onOpenChange={(open) => !open && setDownloadError("")}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document unavailable</DialogTitle>
            <DialogDescription>{downloadError}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(operationError)}
        onOpenChange={(open) => !open && setOperationError("")}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Package action failed</DialogTitle>
            <DialogDescription>{operationError}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(packageTarget)}
        onOpenChange={(open) => {
          if (!open && !isPackaging) {
            setPackageTarget(null);
            setPackageAcknowledged(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download board package?</DialogTitle>
            <DialogDescription>
              “{packageTarget?.title}” includes {packageTarget?.documentCount ?? 0}
              {" "}document(s). This will download a zip package with uploaded
              files and a package index. Access is recorded in the audit log.
            </DialogDescription>
          </DialogHeader>
          {packageIncludesConfidentialDocuments ? (
            <label className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-olea-green"
                checked={packageAcknowledged}
                disabled={isPackaging}
                onChange={(event) =>
                  setPackageAcknowledged(event.target.checked)
                }
              />
              <span>
                <strong className="block font-semibold">
                  Confidentiality acknowledgement required
                </strong>
                I acknowledge this board package includes confidential materials
                and will only share them with authorized board package
                recipients.
              </span>
            </label>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPackaging}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={
                isPackaging ||
                (packageIncludesConfidentialDocuments && !packageAcknowledged)
              }
              onClick={() => void confirmPackageDownload()}
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

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
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
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
            >
              Delete document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function BoardPackageAuditLogPanel({
  data,
}: {
  data: TemplateFormData;
}) {
  const logs = useMemo(() => getBoardPackageAccessLogs(data), [data]);

  return (
    <section
      className="rounded-xl border bg-white p-5 shadow-sm"
      data-testid="board-calendar-audit-log-panel"
    >
      <div>
        <h3 className="text-xl font-semibold text-slate-950">Audit log</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Tracks board package downloads and document changes for governance
          review.
        </p>
      </div>

      {logs.length ? (
        <div className="mt-5 overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Meeting</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-semibold text-slate-900">
                    {formatAction(log.action)}
                  </TableCell>
                  <TableCell>{log.documentName || "—"}</TableCell>
                  <TableCell>{log.meetingTitle || "General documents"}</TableCell>
                  <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyPackageState
          className="mt-5"
          icon={FolderArchive}
          title="No package activity yet"
          description="Downloads and document removals will appear here once members use board packages."
        />
      )}
    </section>
  );
}

function BoardPackageMeetingCard({
  meeting,
  onAddFile,
  onDeleteDocument,
  onDownloadDocument,
  onDownloadPackage,
}: {
  meeting: BoardPackageMeeting;
  onAddFile: () => void;
  onDeleteDocument: (document: BoardPackageDocument) => void;
  onDownloadDocument: (document: BoardPackageDocument) => void;
  onDownloadPackage: () => void;
}) {
  return (
    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-950">
              {meeting.title}
            </h3>
            <Badge variant="outline">{meeting.type || "Meeting"}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {[meeting.date, meeting.time].filter(Boolean).join(" at ") ||
              "Date not set"}{" "}
            · {meeting.documentCount} document
            {meeting.documentCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onAddFile}>
            <Plus className="mr-2 size-4" />
            Add file
          </Button>
          <Button
            type="button"
            onClick={onDownloadPackage}
            disabled={!meeting.documents.length}
          >
            <Download className="mr-2 size-4" />
            Download package
          </Button>
        </div>
      </div>

      <DocumentList
        documents={meeting.documents}
        emptyLabel="No files attached to this package yet."
        meeting={meeting}
        onDeleteDocument={onDeleteDocument}
        onDownloadDocument={onDownloadDocument}
      />
    </section>
  );
}

function DocumentList({
  documents,
  emptyLabel,
  meeting,
  onDeleteDocument,
  onDownloadDocument,
}: {
  documents: BoardPackageDocument[];
  emptyLabel: string;
  meeting?: BoardPackageMeeting;
  onDeleteDocument: (document: BoardPackageDocument) => void;
  onDownloadDocument: (document: BoardPackageDocument) => void;
}) {
  if (!documents.length) {
    return (
      <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Access</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => (
            <TableRow key={document.id}>
              <TableCell>
                <div className="flex items-start gap-3">
                  <span className="rounded-lg bg-olea-soft p-2 text-olea-green">
                    <FileText className="size-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-950">
                      {document.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[
                        formatDateTime(document.uploadedAt),
                        document.sizeLabel,
                        document.storagePath ? "Private file" : "External link",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{document.category}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    document.confidential
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800",
                  )}
                >
                  {document.confidential ? "Confidential" : "Standard"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Open ${document.name}`}
                    onClick={() => onDownloadDocument(document)}
                  >
                    {document.storagePath ? (
                      <Download className="size-4" />
                    ) : (
                      <LinkIcon className="size-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Delete ${document.name}`}
                    onClick={() => onDeleteDocument(document)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {meeting ? (
        <span className="sr-only">Documents for {meeting.title}</span>
      ) : null}
    </div>
  );
}

function EmptyPackageState({
  className,
  description,
  icon: Icon,
  title,
}: {
  className?: string;
  description: string;
  icon: typeof PackageOpen;
  title: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border bg-white px-6 py-12 text-center shadow-sm",
        className,
      )}
    >
      <span className="rounded-2xl bg-olea-soft p-4 text-olea-green">
        <Icon className="size-6" />
      </span>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

async function uploadSelectedFile({
  file,
  meetingId,
  templateInstanceId,
}: {
  file: File;
  meetingId?: string;
  templateInstanceId: string;
}) {
  const formData = new FormData();
  formData.set("templateInstanceId", templateInstanceId);
  if (meetingId) formData.set("meetingId", meetingId);
  formData.set("file", file);

  return uploadBoardPackageDocument(formData);
}

function validateDocumentForm({
  file,
  name,
  templateInstanceId,
  url,
}: {
  file: File | null;
  name: string;
  templateInstanceId: string;
  url: string;
}) {
  if (!name) return "Document name is required.";
  if (!file && !url) return "Upload a private file or add an external document link.";
  if (file && !templateInstanceId) {
    return "Save this board calendar before uploading private files.";
  }

  if (!url) return "";

  try {
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return "Use an http or https document link.";
    }
  } catch {
    return "Enter a valid document URL.";
  }

  return "";
}

async function downloadBoardPackageZip({
  brand,
  meeting,
  templateInstanceId,
}: {
  brand: BrandProfile;
  meeting: BoardPackageMeeting;
  templateInstanceId: string;
}) {
  const zip = new JSZip();
  const includedFiles: Array<{
    document: BoardPackageDocument;
    path?: string;
    status: "included" | "linked" | "unavailable";
  }> = [];
  const documentsFolder = zip.folder("documents");

  for (const packageDocument of meeting.documents) {
    if (packageDocument.storagePath) {
      const documentUrlResult = await createBoardPackageDocumentDownloadUrl({
        documentId: packageDocument.id,
        documentName: packageDocument.name,
        fileName: packageDocument.fileName || packageDocument.name,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        storagePath: packageDocument.storagePath,
        templateInstanceId,
      });

      if (!documentUrlResult.ok) {
        includedFiles.push({
          document: packageDocument,
          status: "unavailable",
        });
        continue;
      }

      try {
        const response = await fetch(documentUrlResult.data.signedUrl);
        if (!response.ok) throw new Error("Download failed");
        const fileBuffer = await response.arrayBuffer();
        const filePath = getPackageDocumentPath(packageDocument);
        documentsFolder?.file(filePath, fileBuffer);
        includedFiles.push({
          document: packageDocument,
          path: `documents/${filePath}`,
          status: "included",
        });
      } catch {
        includedFiles.push({
          document: packageDocument,
          status: "unavailable",
        });
      }
      continue;
    }

    includedFiles.push({
      document: packageDocument,
      status: packageDocument.url ? "linked" : "unavailable",
    });
  }

  zip.file(
    "package-index.html",
    buildBoardPackageIndexHtml(brand, meeting, includedFiles),
  );
  zip.file("README.txt", buildBoardPackageReadme(meeting));

  const packageBlob = await zip.generateAsync({
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    type: "blob",
  });

  downloadBlob(packageBlob, `${slugify(meeting.title)}-board-package.zip`);
}

function getPackageDocumentPath(packageDocument: BoardPackageDocument) {
  const sourceName = packageDocument.fileName || packageDocument.name;
  const extensionMatch = sourceName.match(/\.[a-z0-9]{1,12}$/i);
  const extension = extensionMatch?.[0] ?? "";
  const baseName = extension
    ? sourceName.slice(0, -extension.length)
    : sourceName;

  return `${slugify(packageDocument.category)}/${slugify(baseName)}${extension.toLowerCase()}`;
}

function buildBoardPackageIndexHtml(
  brand: BrandProfile,
  meeting: BoardPackageMeeting,
  includedFiles: Array<{
    document: BoardPackageDocument;
    path?: string;
    status: "included" | "linked" | "unavailable";
  }>,
) {
  const hasConfidentialDocuments = includedFiles.some(
    ({ document: packageDocument }) => packageDocument.confidential,
  );
  const generatedAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  const primaryColor = sanitizeCssColor(brand.primaryColor, "#2f6b4f");
  const secondaryColor = sanitizeCssColor(brand.secondaryColor, "#df7a54");
  const logoMarkup = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.organizationName)} logo" />`
    : `<span>${escapeHtml(brand.logoInitials || getInitials(brand.organizationName))}</span>`;
  const contactItems = [
    brand.address,
    brand.phone,
    brand.contactEmail,
    brand.website,
  ].filter(Boolean);
  const footerText = contactItems.length
    ? contactItems.map((item) => escapeHtml(item ?? "")).join(" · ")
    : escapeHtml(brand.organizationName);

  const rows = includedFiles
    .map(({ document: packageDocument, path, status }) => {
      const location =
        status === "included" && path
          ? `<a href="${escapeHtml(path)}">${escapeHtml(path)}</a>`
          : status === "linked" && packageDocument.url
            ? `<a href="${escapeHtml(packageDocument.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(packageDocument.url)}</a>`
            : "Open Olea Connects to retry this private file.";

      return `<tr>
        <td>${escapeHtml(packageDocument.name)}</td>
        <td>${escapeHtml(packageDocument.category)}</td>
        <td>${packageDocument.confidential ? "Confidential" : "Standard"}</td>
        <td>${location}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(meeting.title)} board package</title>
  <style>
    :root {
      --brand-primary: ${primaryColor};
      --brand-secondary: ${secondaryColor};
      --ink: #1f2937;
      --muted: #52637a;
      --line: #d8dee8;
      --soft: #f5f8f6;
    }
    * { box-sizing: border-box; }
    body {
      background: #f3f6f8;
      color: var(--ink);
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 40px;
    }
    main {
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.10);
      overflow: hidden;
    }
    .accent { background: var(--brand-secondary); height: 12px; }
    .page { padding: 40px; }
    .brand-header {
      align-items: center;
      border-bottom: 1px solid var(--line);
      display: flex;
      gap: 16px;
      padding-bottom: 24px;
    }
    .logo {
      align-items: center;
      background: var(--brand-primary);
      border-radius: 999px;
      color: #fff;
      display: flex;
      font-weight: 800;
      height: 56px;
      justify-content: center;
      letter-spacing: 0.08em;
      overflow: hidden;
      width: 56px;
    }
    .logo img { height: 100%; object-fit: cover; width: 100%; }
    .eyebrow {
      color: var(--brand-primary);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.14em;
      margin: 0 0 4px;
      text-transform: uppercase;
    }
    .org-name {
      color: #10233f;
      font-size: 20px;
      font-weight: 800;
      margin: 0;
    }
    h1 { color: #10233f; font-size: 34px; line-height: 1.1; margin: 32px 0 8px; }
    p { color: var(--muted); line-height: 1.5; }
    .meta {
      background: var(--soft);
      border: 1px solid var(--line);
      border-radius: 14px;
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      margin-top: 24px;
      padding: 16px;
    }
    .meta span {
      color: #74839a;
      display: block;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .meta strong {
      color: #10233f;
      display: block;
      margin-top: 4px;
    }
    table { border-collapse: collapse; margin-top: 24px; width: 100%; }
    th, td { border: 1px solid #d8dee8; padding: 12px; text-align: left; vertical-align: top; }
    th { background: var(--soft); color: var(--brand-primary); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; }
    .warning { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; color: #7c2d12; margin-top: 24px; padding: 16px; }
    footer {
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
      margin-top: 32px;
      padding-top: 16px;
      text-align: center;
    }
    a { color: var(--brand-primary); }
  </style>
</head>
<body>
  <main>
    <div class="accent"></div>
    <div class="page">
      <header class="brand-header">
        <div class="logo">${logoMarkup}</div>
        <div>
          <p class="eyebrow">Board package</p>
          <p class="org-name">${escapeHtml(brand.organizationName)}</p>
        </div>
      </header>
      <h1>${escapeHtml(meeting.title)}</h1>
      <p>${escapeHtml([meeting.date, meeting.time].filter(Boolean).join(" at "))}</p>
      <section class="meta" aria-label="Package details">
        <div>
          <span>Generated</span>
          <strong>${escapeHtml(generatedAt)}</strong>
        </div>
        <div>
          <span>Documents</span>
          <strong>${includedFiles.length}</strong>
        </div>
        <div>
          <span>Prepared by</span>
          <strong>Olea Connects</strong>
        </div>
      </section>
      ${
        hasConfidentialDocuments
          ? `<div class="warning">
        This package contains confidential board materials. Store and share it only with authorized recipients.
      </div>`
          : ""
      }
      <table>
        <thead>
          <tr>
            <th>Document</th>
            <th>Category</th>
            <th>Access</th>
            <th>File or link</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <footer>${footerText}</footer>
    </div>
  </main>
</body>
</html>`;
}

function sanitizeCssColor(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function buildBoardPackageReadme(meeting: BoardPackageMeeting) {
  return [
    `${meeting.title} board package`,
    [meeting.date, meeting.time].filter(Boolean).join(" at "),
    "",
    "Open package-index.html for the document list.",
    "Private files are included in the documents folder when available.",
    "External links are listed in the package index.",
    "",
    "Confidentiality: only share this package with authorized board package recipients.",
  ]
    .filter(Boolean)
    .join("\n");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "board-package"
  );
}

function formatAction(action: string) {
  return action
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
