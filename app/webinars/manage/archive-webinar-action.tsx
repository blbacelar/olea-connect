"use client";

import { Archive, AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import type { Webinar } from "@/lib/types";

import { archiveWebinarEvent } from "../actions";

function ArchiveSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit" variant="destructive">
      {pending ? "Archiving..." : "Archive webinar"}
    </Button>
  );
}

export function ArchiveWebinarAction({ webinar }: { webinar: Webinar }) {
  const [isOpen, setIsOpen] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = `archive-webinar-${webinar.id}-title`;
  const descriptionId = `archive-webinar-${webinar.id}-description`;

  useEffect(() => {
    if (!isOpen) return;

    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <Button
        size="sm"
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
      >
        <Archive className="size-3.5" />
        Archive
      </Button>

      {isOpen ? (
        <div
          aria-describedby={descriptionId}
          aria-labelledby={titleId}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-50 p-2 text-amber-700">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3
                  id={titleId}
                  className="text-lg font-semibold text-slate-950"
                >
                  Archive this webinar?
                </h3>
                <p
                  id={descriptionId}
                  className="mt-2 text-sm leading-6 text-slate-600"
                >
                  “{webinar.title}” will be hidden from members and removed from
                  the webinar catalog. You can still see it in the archived list.
                </p>
              </div>
            </div>
            <form action={archiveWebinarEvent} className="mt-6 space-y-4">
              <input type="hidden" name="eventId" value={webinar.id} />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  ref={cancelButtonRef}
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <ArchiveSubmitButton />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
