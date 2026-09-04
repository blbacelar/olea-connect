import JSZip from "jszip";

import { createBoardPackageDocumentDownloadUrl } from "@/app/modules/board-calendar/actions";
import type {
  BoardPackageDocument,
  BoardPackageMeeting,
} from "@/lib/template-renderer/board-calendar-packages";
import type { BrandProfile } from "@/lib/types";

import { buildPackageIndexCss } from "./board-package-index-css";
import { escapeHtml, slugify } from "./export-html-utils";

type IncludedPackageFile = {
  document: BoardPackageDocument;
  path?: string;
  status: "included" | "linked" | "unavailable";
};

export async function downloadBoardPackageZip({
  brand,
  meeting,
  templateInstanceId,
}: {
  brand: BrandProfile;
  meeting: BoardPackageMeeting;
  templateInstanceId: string;
}) {
  const zip = new JSZip();
  const includedFiles = await collectPackageFiles({
    documentsFolder: zip.folder("documents"),
    meeting,
    templateInstanceId,
  });

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

async function collectPackageFiles({
  documentsFolder,
  meeting,
  templateInstanceId,
}: {
  documentsFolder: JSZip | null;
  meeting: BoardPackageMeeting;
  templateInstanceId: string;
}) {
  const includedFiles: IncludedPackageFile[] = [];

  for (const packageDocument of meeting.documents) {
    includedFiles.push(
      await resolvePackageFile({
        documentsFolder,
        meeting,
        packageDocument,
        templateInstanceId,
      }),
    );
  }

  return includedFiles;
}

async function resolvePackageFile({
  documentsFolder,
  meeting,
  packageDocument,
  templateInstanceId,
}: {
  documentsFolder: JSZip | null;
  meeting: BoardPackageMeeting;
  packageDocument: BoardPackageDocument;
  templateInstanceId: string;
}): Promise<IncludedPackageFile> {
  if (!packageDocument.storagePath) {
    return {
      document: packageDocument,
      status: packageDocument.url ? "linked" : "unavailable",
    };
  }

  return downloadPrivatePackageFile({
    documentsFolder,
    meeting,
    packageDocument,
    templateInstanceId,
  });
}

async function downloadPrivatePackageFile({
  documentsFolder,
  meeting,
  packageDocument,
  templateInstanceId,
}: {
  documentsFolder: JSZip | null;
  meeting: BoardPackageMeeting;
  packageDocument: BoardPackageDocument;
  templateInstanceId: string;
}): Promise<IncludedPackageFile> {
  const documentUrlResult = await createBoardPackageDocumentDownloadUrl({
    documentId: packageDocument.id,
    documentName: packageDocument.name,
    fileName: packageDocument.fileName || packageDocument.name,
    meetingId: meeting.id,
    meetingTitle: meeting.title,
    storagePath: packageDocument.storagePath,
    templateInstanceId,
  });

  if (!documentUrlResult.ok) return unavailablePackageFile(packageDocument);

  try {
    const response = await fetch(documentUrlResult.data.signedUrl);
    if (!response.ok) throw new Error("Download failed");

    const filePath = getPackageDocumentPath(packageDocument);
    documentsFolder?.file(filePath, await response.arrayBuffer());
    return {
      document: packageDocument,
      path: `documents/${filePath}`,
      status: "included",
    };
  } catch {
    return unavailablePackageFile(packageDocument);
  }
}

function unavailablePackageFile(
  packageDocument: BoardPackageDocument,
): IncludedPackageFile {
  return {
    document: packageDocument,
    status: "unavailable",
  };
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
  includedFiles: IncludedPackageFile[],
) {
  const view = buildPackageIndexView(brand, meeting, includedFiles);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(meeting.title)} board package</title>
  <style>${buildPackageIndexCss(view.primaryColor, view.secondaryColor)}</style>
</head>
<body>
  <main>
    <div class="accent"></div>
    <div class="page">
      ${buildPackageHeaderHtml(brand, view.logoMarkup)}
      <h1>${escapeHtml(meeting.title)}</h1>
      <p>${escapeHtml([meeting.date, meeting.time].filter(Boolean).join(" at "))}</p>
      ${buildPackageMetaHtml(view.generatedAt, includedFiles.length)}
      ${buildConfidentialWarningHtml(view.hasConfidentialDocuments)}
      <table>
        <thead>
          <tr>
            <th>Document</th>
            <th>Category</th>
            <th>Access</th>
            <th>File or link</th>
          </tr>
        </thead>
        <tbody>${view.rows}</tbody>
      </table>
      <footer>${view.footerText}</footer>
    </div>
  </main>
</body>
</html>`;
}

function buildPackageIndexView(
  brand: BrandProfile,
  meeting: BoardPackageMeeting,
  includedFiles: IncludedPackageFile[],
) {
  const contactItems = [
    brand.address,
    brand.phone,
    brand.contactEmail,
    brand.website,
  ].filter(Boolean);

  return {
    footerText: contactItems.length
      ? contactItems.map((item) => escapeHtml(item ?? "")).join(" · ")
      : escapeHtml(brand.organizationName),
    generatedAt: formatGeneratedAt(),
    hasConfidentialDocuments: includedFiles.some(
      ({ document: packageDocument }) => packageDocument.confidential,
    ),
    logoMarkup: buildLogoMarkup(brand),
    primaryColor: sanitizeCssColor(brand.primaryColor, "#2f6b4f"),
    rows: includedFiles.map(buildPackageDocumentRowHtml).join(""),
    secondaryColor: sanitizeCssColor(brand.secondaryColor, "#df7a54"),
    title: meeting.title,
  };
}

function buildLogoMarkup(brand: BrandProfile) {
  return brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.organizationName)} logo" />`
    : `<span>${escapeHtml(brand.logoInitials || getInitials(brand.organizationName))}</span>`;
}

function buildPackageDocumentRowHtml({
  document: packageDocument,
  path,
  status,
}: IncludedPackageFile) {
  return `<tr>
    <td>${escapeHtml(packageDocument.name)}</td>
    <td>${escapeHtml(packageDocument.category)}</td>
    <td>${packageDocument.confidential ? "Confidential" : "Standard"}</td>
    <td>${getPackageDocumentLocationHtml(packageDocument, path, status)}</td>
  </tr>`;
}

function getPackageDocumentLocationHtml(
  packageDocument: BoardPackageDocument,
  path: string | undefined,
  status: IncludedPackageFile["status"],
) {
  if (status === "included" && path) {
    return `<a href="${escapeHtml(path)}">${escapeHtml(path)}</a>`;
  }

  if (status === "linked" && packageDocument.url) {
    return `<a href="${escapeHtml(packageDocument.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(packageDocument.url)}</a>`;
  }

  return "Open Olea Connects™ to retry this private file.";
}

function buildPackageHeaderHtml(brand: BrandProfile, logoMarkup: string) {
  return `<header class="brand-header">
    <div class="logo">${logoMarkup}</div>
    <div>
      <p class="eyebrow">Board package</p>
      <p class="org-name">${escapeHtml(brand.organizationName)}</p>
    </div>
  </header>`;
}

function buildPackageMetaHtml(generatedAt: string, documentCount: number) {
  return `<section class="meta" aria-label="Package details">
    <div>
      <span>Generated</span>
      <strong>${escapeHtml(generatedAt)}</strong>
    </div>
    <div>
      <span>Documents</span>
      <strong>${documentCount}</strong>
    </div>
    <div>
      <span>Prepared by</span>
      <strong>Olea Connects™</strong>
    </div>
  </section>`;
}

function buildConfidentialWarningHtml(hasConfidentialDocuments: boolean) {
  return hasConfidentialDocuments
    ? `<div class="warning">
    This package contains confidential board materials. Store and share it only with authorized recipients.
  </div>`
    : "";
}

function formatGeneratedAt() {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
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

function sanitizeCssColor(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function getInitials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
