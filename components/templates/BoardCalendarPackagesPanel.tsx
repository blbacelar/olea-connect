"use client";

import { useMemo, useState } from "react";

import {
  AlertTriangle,
  Download,
  FileText,
  FolderArchive,
  LinkIcon,
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
  data,
  onDataChange,
}: {
  data: TemplateFormData;
  onDataChange: (
    updater: (currentData: TemplateFormData) => TemplateFormData,
  ) => void;
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

  const isUploadOpen = Boolean(uploadMeeting) || isGeneralUploadOpen;
  const uploadTitle = uploadMeeting
    ? `Add file to ${uploadMeeting.title}`
    : "Add general board document";

  function openMeetingUpload(meeting: BoardPackageMeeting) {
    setUploadMeeting(meeting);
    setIsGeneralUploadOpen(false);
    setForm(emptyUploadForm);
    setFormError("");
  }

  function openGeneralUpload() {
    setUploadMeeting(null);
    setIsGeneralUploadOpen(true);
    setForm(emptyUploadForm);
    setFormError("");
  }

  function closeUpload() {
    setUploadMeeting(null);
    setIsGeneralUploadOpen(false);
    setForm(emptyUploadForm);
    setFormError("");
  }

  function updateForm<Key extends keyof UploadFormState>(
    key: Key,
    value: UploadFormState[Key],
  ) {
    setForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  function submitUpload() {
    const trimmedName = form.name.trim();
    const trimmedUrl = form.url.trim();
    const validationError = validateDocumentForm(trimmedName, trimmedUrl);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    onDataChange((currentData) =>
      appendBoardPackageDocument(currentData, {
        ...form,
        meetingId: uploadMeeting?.id,
        name: trimmedName,
        url: trimmedUrl,
      }),
    );
    closeUpload();
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

  function openDocument(
    document: BoardPackageDocument,
    meeting?: BoardPackageMeeting,
  ) {
    logDownload(document, meeting);
    if (document.url) {
      window.open(document.url, "_blank", "noopener,noreferrer");
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

    openDocument(document, meeting);
  }

  function confirmConfidentialDownload() {
    if (!downloadTarget) return;
    const meeting = meetings.find((item) => item.id === downloadTarget.meetingId);
    openDocument(downloadTarget, meeting);
    setDownloadTarget(null);
  }

  function confirmPackageDownload() {
    if (!packageTarget) return;

    downloadPackageManifest(packageTarget);
    onDataChange((currentData) =>
      appendBoardPackageAccessLog(currentData, {
        action: "package_downloaded",
        meetingId: packageTarget.id,
        meetingTitle: packageTarget.title,
      }),
    );
    setPackageTarget(null);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const meeting = meetings.find((item) => item.id === deleteTarget.meetingId);

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
              Add a secure document link for phase 1. Private file storage can
              later replace this field without changing the package workflow.
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
              <Label htmlFor="board-package-document-url">
                Secure document link
              </Label>
              <Input
                id="board-package-document-url"
                type="url"
                value={form.url}
                onChange={(event) => updateForm("url", event.target.value)}
                placeholder="https://..."
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
            <Button type="button" onClick={submitUpload}>
              Add file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(downloadTarget)}
        onOpenChange={(open) => !open && setDownloadTarget(null)}
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
        open={Boolean(packageTarget)}
        onOpenChange={(open) => !open && setPackageTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download board package?</DialogTitle>
            <DialogDescription>
              “{packageTarget?.title}” includes {packageTarget?.documentCount ?? 0}
              {" "}document(s). This will download a package manifest with secure
              document links and record the access in the audit log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={confirmPackageDownload}>
              Download package
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
            <Button type="button" variant="destructive" onClick={confirmDelete}>
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
                      {[formatDateTime(document.uploadedAt), document.sizeLabel]
                        .filter(Boolean)
                        .join(" · ") || "No upload details"}
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
                    <LinkIcon className="size-4" />
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

function validateDocumentForm(name: string, url: string) {
  if (!name) return "Document name is required.";
  if (!url) return "Secure document link is required.";

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

function downloadPackageManifest(meeting: BoardPackageMeeting) {
  const lines = [
    meeting.title,
    [meeting.date, meeting.time].filter(Boolean).join(" at "),
    "",
    "Documents",
    ...meeting.documents.map((document, index) =>
      [
        `${index + 1}. ${document.name}`,
        `Category: ${document.category}`,
        `Access: ${document.confidential ? "Confidential" : "Standard"}`,
        `Link: ${document.url}`,
      ].join("\n"),
    ),
  ].filter(Boolean);
  const blob = new Blob([lines.join("\n\n")], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${slugify(meeting.title)}-board-package.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
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
