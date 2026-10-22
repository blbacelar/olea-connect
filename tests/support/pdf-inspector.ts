import { getDocument, type PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

export type PdfInspection = {
  metadata: {
    author?: string;
    creator?: string;
    keywords?: string;
    producer?: string;
    subject?: string;
    title?: string;
  };
  pageCount: number;
  text: string;
};

export async function inspectPdf(buffer: Buffer): Promise<PdfInspection> {
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    useSystemFonts: true,
  });
  const document = await loadingTask.promise;

  try {
    const [metadata, text] = await Promise.all([
      readMetadata(document),
      extractText(document),
    ]);

    return {
      metadata,
      pageCount: document.numPages,
      text,
    };
  } finally {
    await loadingTask.destroy();
  }
}

async function readMetadata(document: PDFDocumentProxy) {
  const { info, metadata } = await document.getMetadata();
  const infoRecord = info as Record<string, unknown>;

  return {
    author: stringValue(infoRecord.Author),
    creator: stringValue(infoRecord.Creator),
    keywords:
      stringValue(infoRecord.Keywords) ?? stringValue(metadata?.get("Keywords")),
    producer: stringValue(infoRecord.Producer),
    subject: stringValue(infoRecord.Subject) ?? stringValue(metadata?.get("Subject")),
    title: stringValue(infoRecord.Title) ?? stringValue(metadata?.get("Title")),
  };
}

async function extractText(document: PDFDocumentProxy) {
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" "),
    );
    page.cleanup();
  }

  return pages.join("\n").replace(/\s+/g, " ").trim();
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
