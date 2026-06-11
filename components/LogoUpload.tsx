"use client";

import { ImageUp, Trash2 } from "lucide-react";

import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { useLogoUpload } from "@/hooks/use-logo-upload";
import { cn } from "@/lib/utils";

export function LogoUpload({
  value,
  onChange,
  initials,
  color,
}: {
  value?: string;
  onChange: (value?: string) => void;
  initials: string;
  color: string;
}) {
  const upload = useLogoUpload({ value, onChange });

  return (
    <div>
      <input
        ref={upload.inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
        onChange={upload.handleInputChange}
        className="sr-only"
        aria-label="Upload organization logo"
      />

      {value ? (
        <div className="flex items-center gap-4 rounded-[10px] border p-3.5">
          <BrandMark
            logoUrl={value}
            initials={initials}
            color={color}
            className="size-16 text-lg"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold">Logo uploaded</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Ready to use on your documents
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={upload.openPicker}>
              Change
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={upload.remove}
              aria-label="Remove logo"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={(event) => {
            event.preventDefault();
            upload.setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              upload.setIsDragging(false);
            }
          }}
          onDrop={upload.handleDrop}
          className={cn(
            "rounded-[10px] border-2 border-dashed px-6 py-8 text-center transition-colors",
            upload.isDragging
              ? "border-olea-green bg-olea-light/50"
              : "border-slate-300 hover:border-olea-green",
          )}
        >
          <button
            type="button"
            onClick={upload.openPicker}
            className="mx-auto flex w-full flex-col items-center justify-center"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-olea-light text-olea-green">
              <ImageUp className="size-5" />
            </span>
            <span className="mt-3 text-sm font-semibold">
              Drop your logo here or browse
            </span>
            <span className="mt-1 text-xs text-slate-400">
              PNG, JPG, or SVG · max 2 MB
            </span>
          </button>
        </div>
      )}

      {upload.error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          {upload.error}
        </p>
      ) : null}
    </div>
  );
}
