"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { uploadBrandLogo } from "@/app/settings/brand/actions";

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

export function useLogoUpload({
  onChange,
  onUploadingChange,
}: {
  onChange: (value?: { path: string; signedUrl?: string }) => void;
  onUploadingChange?: (isUploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const processFile = async (file?: File) => {
    if (!file) return;

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setError("Choose a PNG, JPG, or SVG file.");
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      setError("Logo must be smaller than 2 MB.");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    setIsUploading(true);
    onUploadingChange?.(true);
    try {
      const uploaded = await uploadBrandLogo(formData);
      onChange({
        path: uploaded.path,
        signedUrl: uploaded.signedUrl,
      });
      setError("");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "We couldn't upload that file. Please try again.",
      );
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    void processFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void processFile(event.dataTransfer.files?.[0]);
  };

  const remove = () => {
    onChange(undefined);
    setError("");
  };

  return {
    error,
    inputRef,
    isDragging,
    isUploading,
    handleDrop,
    handleInputChange,
    openPicker: () => inputRef.current?.click(),
    remove,
    setIsDragging,
  };
}
