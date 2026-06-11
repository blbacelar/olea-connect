"use client";

import { PDFDownloadLink, PDFViewer, pdf } from "@react-pdf/renderer";
import { Download, Printer } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { BoardEvaluationPdf } from "@/lib/pdf-generator";
import type { Organization, TemplateSession } from "@/lib/types";

export default function PdfPanel({
  organization,
  session,
}: {
  organization: Organization;
  session: TemplateSession;
}) {
  const [isPrinting, setIsPrinting] = useState(false);
  const document = (
    <BoardEvaluationPdf organization={organization} session={session} />
  );

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const blob = await pdf(document).toBlob();
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank");
      printWindow?.addEventListener("load", () => printWindow.print(), {
        once: true,
      });
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
        <div>
          <p className="font-semibold">Your branded PDF is ready</p>
          <p className="text-sm text-slate-500">
            Review the document, then download or print it.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={isPrinting}>
            <Printer className="size-4" />
            {isPrinting ? "Preparing..." : "Print"}
          </Button>
          <PDFDownloadLink
            document={document}
            fileName="jp-centre-board-self-evaluation.pdf"
          >
            {({ loading }) => (
              <Button asChild>
                <span>
                  <Download className="size-4" />
                  {loading ? "Preparing..." : "Download PDF"}
                </span>
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      </div>
      <div className="h-[78vh] min-h-[640px] overflow-hidden rounded-xl border bg-slate-200 shadow-soft">
        <PDFViewer width="100%" height="100%" showToolbar={false}>
          {document}
        </PDFViewer>
      </div>
    </div>
  );
}
