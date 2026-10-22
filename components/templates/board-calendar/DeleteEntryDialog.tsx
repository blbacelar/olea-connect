import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CalendarViewEvent } from "@/lib/template-renderer/calendar-view";

export function DeleteEntryDialog({
  event,
  onCancel,
  onConfirm,
}: {
  event: CalendarViewEvent | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={Boolean(event)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-red-50 p-2 text-red-700">
              <Trash2 className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                Delete this calendar entry?
              </DialogTitle>
              <DialogDescription className="mt-2">
                This will remove “{event?.title}” from this workbook calendar.
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Delete entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
