"use client";

import { useState } from "react";
import { LoaderCircle, Send } from "lucide-react";

import { sendBoardPackage } from "@/app/modules/board-calendar/board-package-distribution-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BoardPackageMeeting } from "@/lib/template-renderer/board-calendar-packages";
import type { WorkspaceMemberOption } from "@/lib/template-renderer/types";

export function BoardPackageSendDialog({
  meeting,
  members,
  onClose,
  templateInstanceId,
}: {
  meeting: BoardPackageMeeting;
  members: WorkspaceMemberOption[];
  onClose: () => void;
  templateInstanceId: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");

  async function send() {
    setIsSending(true);
    setMessage("");
    try {
      const result = await sendBoardPackage({
        templateInstanceId,
        meetingId: meeting.id,
        recipientIds: selected,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(`${result.data.sent} package invitation${result.data.sent === 1 ? "" : "s"} sent${result.data.failed ? `; ${result.data.failed} failed` : ""}. Recipients must sign in to view the package.`);
      setSelected(result.data.failedRecipientIds);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isSending && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send board package</DialogTitle>
          <DialogDescription>Choose active workspace members to notify about {meeting.title}. The email links to the authenticated package; it does not attach confidential files.</DialogDescription>
        </DialogHeader>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {members.length ? members.map((member) => (
            <label key={member.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3">
              <Checkbox checked={selected.includes(member.id)} disabled={isSending} onChange={(event) => setSelected((current) => event.target.checked ? [...current, member.id] : current.filter((id) => id !== member.id))} />
              <span className="min-w-0 text-sm"><span className="block font-medium">{member.name || member.email}</span><span className="block truncate text-slate-500">{member.email}</span></span>
            </label>
          )) : <p className="text-sm text-slate-500">No active workspace members are available.</p>}
        </div>
        {message ? <p role="status" className="text-sm">{message}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isSending} onClick={onClose}>Close</Button>
          <Button type="button" disabled={!selected.length || isSending} onClick={() => void send()}>
            {isSending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />} Send to {selected.length || "selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
