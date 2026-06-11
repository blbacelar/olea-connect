"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

export function useLogoUpload({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value?: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file?: File) => {
    if (!file) return;

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setError("Choose a PNG, JPG, or SVG file.");
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      setError("Logo must be smaller than 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
        setError("");
      }
    };
    reader.onerror = () => setError("We couldn't read that file. Please try again.");
    reader.readAsDataURL(file);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    processFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    processFile(event.dataTransfer.files?.[0]);
  };

  const remove = () => {
    onChange(undefined);
    setError("");
  };

  return {
    error,
    inputRef,
    isDragging,
    value,
    handleDrop,
    handleInputChange,
    openPicker: () => inputRef.current?.click(),
    remove,
    setIsDragging,
  };
}
