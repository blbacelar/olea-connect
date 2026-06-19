"use client";

import { Download, FileText, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type {
  TemplateExportFormat,
  TemplateExportRecord,
} from "@/lib/template-renderer/types";

export function TemplateExportPanel({
  templateInstanceId,
  supportsPdf,
  supportsDocx,
  initialExports,
  generateExport,
  createDownloadUrl,
}: {
  templateInstanceId: string;
  supportsPdf: boolean;
  supportsDocx: boolean;
  initialExports: TemplateExportRecord[];
  generateExport: (input: {
    templateInstanceId: string;
    format: TemplateExportFormat;
  }) => Promise<TemplateExportRecord>;
  createDownloadUrl: (exportId: string) => Promise<string>;
}) {
  const [exports, setExports] = useState(initialExports);
  const [error, setError] = useState("");
  const [activeFormat, setActiveFormat] = useState<TemplateExportFormat | null>(
    null,
  );
  const [downloadingId, setDownloadingId] = useState("");
  const [isPending, startTransition] = useTransition();

  const onGenerate = (format: TemplateExportFormat) => {
    setActiveFormat(format);
    startTransition(async () => {
      try {
        const generated = await generateExport({ templateInstanceId, format });
        setExports((current) => [generated, ...current]);
        setError("");
      } catch (exportError) {
        setError(
          exportError instanceof Error
            ? exportError.message
            : "Unable to generate this document.",
        );
      } finally {
        setActiveFormat(null);
      }
    });
  };

  const onDownload = (exportId: string) => {
    setDownloadingId(exportId);
    startTransition(async () => {
      try {
        const signedUrl = await createDownloadUrl(exportId);
        window.location.assign(signedUrl);
        setError("");
      } catch (downloadError) {
        setError(
          downloadError instanceof Error
            ? downloadError.message
            : "Unable to prepare this download.",
        );
      } finally {
        setDownloadingId("");
      }
    });
  };

  return (
    <section className="rounded-xl border bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Exports</h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-600">
            Generate board-ready files from this saved template session.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!templateInstanceId || !supportsPdf || isPending}
            onClick={() => onGenerate("pdf")}
          >
            {activeFormat === "pdf" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            Generate PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!templateInstanceId || !supportsDocx || isPending}
            onClick={() => onGenerate("docx")}
          >
            {activeFormat === "docx" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            Generate DOCX
          </Button>
        </div>
      </div>

      {!templateInstanceId ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Save this template before generating document exports.
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-5 divide-y rounded-lg border">
        {exports.length > 0 ? (
          exports.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="font-medium text-slate-900">{item.fileName}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {item.format.toUpperCase()} ·{" "}
                  {new Intl.DateTimeFormat("en-CA", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(item.generatedAt))}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => onDownload(item.id)}
                disabled={downloadingId === item.id}
              >
                {downloadingId === item.id ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                Download
              </Button>
            </div>
          ))
        ) : (
          <p className="px-4 py-6 text-center text-sm text-slate-600">
            No exports generated yet.
          </p>
        )}
      </div>
    </section>
  );
}
