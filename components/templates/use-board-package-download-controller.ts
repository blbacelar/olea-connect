"use client";

import { useState } from "react";

import {
  appendBoardPackageAccessLog,
  type BoardPackageMeeting,
} from "@/lib/template-renderer/board-calendar-packages";
import type { TemplateFormData } from "@/lib/template-renderer/types";
import type { BrandProfile } from "@/lib/types";

import { downloadBoardPackageZip } from "./board-package-download";
import { recordBoardPackageDownload } from "./board-package-operations";

type DataChangeHandler = (
  updater: (currentData: TemplateFormData) => TemplateFormData,
) => void;

export function useBoardPackageDownloadController({
  brand,
  onDataChange,
  setOperationError,
  templateInstanceId,
}: {
  brand: BrandProfile;
  onDataChange: DataChangeHandler;
  setOperationError: (message: string) => void;
  templateInstanceId: string;
}) {
  const [packageTarget, setPackageTarget] =
    useState<BoardPackageMeeting | null>(null);
  const [isPackaging, setIsPackaging] = useState(false);
  const [packageAcknowledged, setPackageAcknowledged] = useState(false);
  const packageIncludesConfidentialDocuments = Boolean(
    packageTarget?.documents.some((document) => document.confidential),
  );

  async function confirmPackageDownload() {
    const downloadablePackage = getDownloadablePackage();
    if (!downloadablePackage) return;

    setIsPackaging(true);
    try {
      await recordBoardPackageDownload({
        meeting: downloadablePackage,
        templateInstanceId,
      });
      await downloadBoardPackageZip({
        brand,
        meeting: downloadablePackage,
        templateInstanceId,
      });
      logPackageDownload(downloadablePackage);
      clearPackageTarget();
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

  function closePackageDialog(open: boolean) {
    if (open || isPackaging) return;
    clearPackageTarget();
  }

  function getDownloadablePackage() {
    if (!packageTarget) return null;
    if (packageIncludesConfidentialDocuments && !packageAcknowledged) return null;
    return packageTarget;
  }

  function clearPackageTarget() {
    setPackageTarget(null);
    setPackageAcknowledged(false);
  }

  function logPackageDownload(meeting: BoardPackageMeeting) {
    onDataChange((currentData) =>
      appendBoardPackageAccessLog(currentData, {
        action: "package_downloaded",
        meetingId: meeting.id,
        meetingTitle: meeting.title,
      }),
    );
  }

  return {
    closePackageDialog,
    confirmPackageDownload,
    isPackaging,
    packageAcknowledged,
    packageIncludesConfidentialDocuments,
    packageTarget,
    setPackageAcknowledged,
    setPackageTarget,
  };
}
