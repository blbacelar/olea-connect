import { Download, Eye, FileText, FolderArchive, LinkIcon, PackageOpen, Plus, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getBoardPackageAuditEvents } from "@/app/modules/board-calendar/board-package-distribution-actions";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getBoardPackageAccessLogs,
  type BoardPackageDocument,
  type BoardPackageMeeting,
} from "@/lib/template-renderer/board-calendar-packages";
import type { TemplateFormData } from "@/lib/template-renderer/types";
import { cn } from "@/lib/utils";

export function BoardPackageAuditLogPanel({
  data,
  templateInstanceId,
}: {
  data: TemplateFormData;
  templateInstanceId: string;
}) {
  const localLogs = useMemo(() => getBoardPackageAccessLogs(data), [data]);
  const [remoteLogs, setRemoteLogs] = useState<Awaited<ReturnType<typeof getBoardPackageAuditEvents>> | null>(null);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    if (!templateInstanceId) return;
    let active = true;
    getBoardPackageAuditEvents(templateInstanceId).then((events) => {
      if (active) setRemoteLogs(events);
    }).catch(() => {
      if (active) setLoadError("Could not load the package audit log.");
    });
    return () => { active = false; };
  }, [templateInstanceId]);
  const logs = remoteLogs ?? localLogs;

  return (
    <section
      className="rounded-xl border bg-white p-5 shadow-sm"
      data-testid="board-calendar-audit-log-panel"
    >
      <div>
        <h3 className="text-xl font-semibold text-slate-950">Audit log</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Tracks who opened, received, and downloaded board packages and documents for governance
          review.
        </p>
      </div>
      {loadError ? <p role="alert" className="mt-3 text-sm text-red-700">{loadError}</p> : null}
      {logs.length ? (
        <div className="mt-5 overflow-x-auto rounded-xl border">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Person</TableHead>
                <TableHead>Recipient</TableHead>
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
                  <TableCell>{"actor" in log ? log.actor : "Not recorded"}</TableCell>
                  <TableCell>{"recipientEmail" in log ? log.recipientEmail || "—" : "—"}</TableCell>
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

export function BoardPackageMeetingCard({
  meeting,
  onAddFile,
  onDeleteDocument,
  onDownloadDocument,
  onDownloadPackage,
  onSendPackage,
  onViewFiles,
  isOpen,
  isReady,
}: {
  meeting: BoardPackageMeeting;
  onAddFile: () => void;
  onDeleteDocument: (document: BoardPackageDocument) => void;
  onDownloadDocument: (document: BoardPackageDocument) => void;
  onDownloadPackage: () => void;
  onSendPackage?: () => void;
  onViewFiles: () => void;
  isOpen: boolean;
  isReady: boolean;
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
          {onSendPackage ? <Button type="button" variant="outline" onClick={onSendPackage} disabled={!meeting.documents.length}><Send className="mr-2 size-4" />Send package</Button> : null}
          <Button type="button" variant="outline" onClick={onAddFile}>
            <Plus className="mr-2 size-4" />
            Add file
          </Button>
          <Button type="button" variant="outline" onClick={onViewFiles} aria-expanded={isOpen} disabled={!isReady}>
            <Eye className="mr-2 size-4" />{isOpen ? "Hide files" : "View files"}
          </Button>
          <Button
            type="button"
            onClick={onDownloadPackage}
            disabled={!meeting.documents.length || !isReady}
          >
            <Download className="mr-2 size-4" />
            Download package
          </Button>
        </div>
      </div>
      {isOpen ? <DocumentList
        documents={meeting.documents}
        emptyLabel="No files attached to this package yet."
        meeting={meeting}
        onDeleteDocument={onDeleteDocument}
        onDownloadDocument={onDownloadDocument}
      /> : null}
    </section>
  );
}

export function DocumentList({
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
            <DocumentRow
              document={document}
              key={document.id}
              onDeleteDocument={onDeleteDocument}
              onDownloadDocument={onDownloadDocument}
            />
          ))}
        </TableBody>
      </Table>
      {meeting ? (
        <span className="sr-only">Documents for {meeting.title}</span>
      ) : null}
    </div>
  );
}

export function EmptyPackageState({
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

export function formatDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function DocumentRow({
  document,
  onDeleteDocument,
  onDownloadDocument,
}: {
  document: BoardPackageDocument;
  onDeleteDocument: (document: BoardPackageDocument) => void;
  onDownloadDocument: (document: BoardPackageDocument) => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-olea-soft p-2 text-olea-green">
            <FileText className="size-4" />
          </span>
          <div>
            <p className="font-semibold text-slate-950">{document.name}</p>
            <p className="text-xs text-slate-500">
              {[
                formatDateTime(document.uploadedAt),
                document.sizeLabel,
                document.generatedKind ? "Generated PDF" : document.storagePath ? "Private file" : "External link",
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
            {document.storagePath || document.generatedKind ? (
              <Download className="size-4" />
            ) : (
              <LinkIcon className="size-4" />
            )}
          </Button>
          {!document.generatedKind ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Delete ${document.name}`}
              onClick={() => onDeleteDocument(document)}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

function formatAction(action: string) {
  return action.replace(/^board_package\./, "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
