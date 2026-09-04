"use client";

import { useState } from "react";

import {
  appendBoardPackageDocument,
  type BoardPackageMeeting,
} from "@/lib/template-renderer/board-calendar-packages";
import type { TemplateFormData } from "@/lib/template-renderer/types";

import {
  uploadSelectedBoardPackageFile,
  validateBoardPackageDocumentForm,
} from "./board-package-operations";
import {
  emptyUploadForm,
  type UploadFormState,
} from "./board-package-upload-state";

type DataChangeHandler = (
  updater: (currentData: TemplateFormData) => TemplateFormData,
) => void;

export function useBoardPackageUploadController({
  onDataChange,
  templateInstanceId,
}: {
  onDataChange: DataChangeHandler;
  templateInstanceId: string;
}) {
  const [uploadMeeting, setUploadMeeting] =
    useState<BoardPackageMeeting | null>(null);
  const [isGeneralUploadOpen, setIsGeneralUploadOpen] = useState(false);
  const [form, setForm] = useState<UploadFormState>(emptyUploadForm);
  const [formError, setFormError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const isUploadOpen = Boolean(uploadMeeting) || isGeneralUploadOpen;
  const uploadTitle = uploadMeeting
    ? `Add file to ${uploadMeeting.title}`
    : "Add general board document";

  function openMeetingUpload(meeting: BoardPackageMeeting) {
    setUploadMeeting(meeting);
    setIsGeneralUploadOpen(false);
    resetUploadForm();
  }

  function openGeneralUpload() {
    setUploadMeeting(null);
    setIsGeneralUploadOpen(true);
    resetUploadForm();
  }

  function closeUpload() {
    setUploadMeeting(null);
    setIsGeneralUploadOpen(false);
    resetUploadForm();
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
    const validationError = validateBoardPackageDocumentForm({
      file: selectedFile,
      name: trimmedName,
      templateInstanceId,
      url: trimmedUrl,
    });

    if (validationError) {
      setFormError(validationError);
      return;
    }

    await persistUpload({ trimmedName, trimmedUrl });
  }

  async function persistUpload({
    trimmedName,
    trimmedUrl,
  }: {
    trimmedName: string;
    trimmedUrl: string;
  }) {
    setIsUploading(true);
    setFormError("");

    try {
      const uploadedDocument = await uploadSelectedFileIfNeeded();
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

  async function uploadSelectedFileIfNeeded() {
    if (!selectedFile) return null;

    const uploadedDocumentResult = await uploadSelectedBoardPackageFile({
      file: selectedFile,
      meetingId: uploadMeeting?.id,
      templateInstanceId,
    });

    if (!uploadedDocumentResult.ok) throw new Error(uploadedDocumentResult.error);

    return uploadedDocumentResult.data;
  }

  function resetUploadForm() {
    setForm(emptyUploadForm);
    setFormError("");
    setSelectedFile(null);
  }

  return {
    closeUpload,
    form,
    formError,
    isUploadOpen,
    isUploading,
    openGeneralUpload,
    openMeetingUpload,
    setSelectedFile,
    submitUpload,
    updateForm,
    uploadTitle,
  };
}
