"use client";

import { useState } from "react";

import { type BoardPackageMeeting } from "@/lib/template-renderer/board-calendar-packages";
import type { BrandProfile } from "@/lib/types";

import { downloadBoardPackageZip } from "./board-package-download";
import { recordBoardPackageDownload } from "./board-package-operations";

export function useBoardPackageDownloadController({
  brand,
  requireAck,
  setOperationError,
  templateInstanceId,
}: {
  brand: BrandProfile;
  requireAck: boolean;
  setOperationError: (message: string) => void;
  templateInstanceId: string;
}) {
  const [packageTarget, setPackageTarget] =
    useState<BoardPackageMeeting | null>(null);
  const [isPackaging, setIsPackaging] = useState(false);
  const [packageAcknowledged, setPackageAcknowledged] = useState(false);
  const packageIncludesConfidentialDocuments = Boolean(
    requireAck && packageTarget?.documents.some((document) => document.confidential),
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
        acknowledged: packageAcknowledged,
        brand,
        meeting: downloadablePackage,
        templateInstanceId,
      });
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
