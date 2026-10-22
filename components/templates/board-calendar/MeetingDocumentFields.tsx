import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createTemplateRecordId } from "@/lib/template-renderer/create-id";
import {
  meetingDocumentSections,
  type MeetingDocument,
} from "@/lib/template-renderer/board-calendar-meeting-documents";
import type { WorkspaceMemberOption } from "@/lib/template-renderer/types";

type ChangeHandler = (document: MeetingDocument) => void;

export function MeetingDocumentFields({
  document,
  members,
  onChange,
}: {
  document: MeetingDocument;
  members: WorkspaceMemberOption[];
  onChange: ChangeHandler;
}) {
  const nameById = new Map(members.map((member) => [member.id, member.name || member.email]));

  function updateSection(id: string, value: string) {
    onChange({ ...document, sections: { ...document.sections, [id]: value } });
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-950">
          {document.kind === "board_minutes" ? "Attendance" : "Roll call and quorum"}
        </h3>
        <p className="text-sm text-slate-500">Choose each member&apos;s attendance for this meeting.</p>
        {members.length ? members.map((member) => {
          const current = document.attendance.find((entry) => entry.memberId === member.id);
          return (
            <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
              <span className="min-w-0 truncate text-sm">{member.name || member.email}</span>
              <Select
                value={current?.status ?? "not_recorded"}
                onValueChange={(status: MeetingDocument["attendance"][number]["status"]) =>
                  onChange({
                    ...document,
                    attendance: [
                      ...document.attendance.filter((entry) => entry.memberId !== member.id),
                      { memberId: member.id, status },
                    ],
                  })
                }
              >
                <SelectTrigger aria-label={`Attendance for ${member.name || member.email}`} className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_recorded">Not recorded</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        }) : <p className="text-sm text-slate-500">Invite workspace members to record attendance.</p>}
      </section>

      {meetingDocumentSections[document.kind].map((section) => (
        <div key={section.id} className="space-y-2">
          <Label htmlFor={`meeting-document-${section.id}`}>{section.label}</Label>
          <Textarea
            id={`meeting-document-${section.id}`}
            maxLength={4000}
            placeholder={section.placeholder}
            value={document.sections[section.id] ?? ""}
            onChange={(event) => updateSection(section.id, event.target.value)}
            rows={4}
          />
        </div>
      ))}

      {document.kind === "board_minutes" ? (
        <>
          <MotionsEditor document={document} members={members} nameById={nameById} onChange={onChange} />
          <ActionsEditor document={document} members={members} onChange={onChange} />
        </>
      ) : null}
    </div>
  );
}

function MemberSelect({
  label,
  members,
  value,
  onChange,
}: {
  label: string;
  members: WorkspaceMemberOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value || "none"} onValueChange={(selected) => onChange(selected === "none" ? "" : selected)}>
        <SelectTrigger aria-label={label}><SelectValue placeholder="Choose a member" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Not selected</SelectItem>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>{member.name || member.email}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MotionsEditor({
  document, members, nameById, onChange,
}: {
  document: MeetingDocument;
  members: WorkspaceMemberOption[];
  nameById: Map<string, string>;
  onChange: ChangeHandler;
}) {
  function update(index: number, patch: Partial<MeetingDocument["motions"][number]>) {
    onChange({ ...document, motions: document.motions.map((motion, position) =>
      position === index ? { ...motion, ...patch } : motion) });
  }
  return (
    <section className="space-y-3 border-t pt-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Decisions and motions</h3>
          <p className="text-xs text-slate-500">Record mover, seconder, vote counts, and outcome.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange({
          ...document,
          motions: [...document.motions, { id: createTemplateRecordId("motion"), text: "", movedBy: "", secondedBy: "", votesFor: 0, votesAgainst: 0, abstentions: 0, outcome: "pending" }],
        })}><Plus className="size-4" /> Add motion</Button>
      </div>
      {document.motions.map((motion, index) => (
        <div key={motion.id} className="space-y-3 rounded-lg border p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor={`motion-${motion.id}`}>Motion {index + 1}</Label>
              <Textarea id={`motion-${motion.id}`} value={motion.text} maxLength={2000} placeholder="The board resolves to..." onChange={(event) => update(index, { text: event.target.value })} />
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove motion ${index + 1}`} onClick={() => onChange({ ...document, motions: document.motions.filter((_, position) => position !== index) })}><Trash2 className="size-4" /></Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MemberSelect label={`Moved by for motion ${index + 1}`} members={members} value={motion.movedBy} onChange={(value) => update(index, { movedBy: value })} />
            <MemberSelect label={`Seconded by for motion ${index + 1}`} members={members} value={motion.secondedBy} onChange={(value) => update(index, { secondedBy: value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {(["votesFor", "votesAgainst", "abstentions"] as const).map((field) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={`${field}-${motion.id}`}>{field === "votesFor" ? "For" : field === "votesAgainst" ? "Against" : "Abstain"}</Label>
                <Input id={`${field}-${motion.id}`} type="number" inputMode="numeric" min={0} max={10000} step={1} value={motion[field]} onChange={(event) => update(index, { [field]: Math.max(0, Number.parseInt(event.target.value, 10) || 0) })} />
              </div>
            ))}
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select value={motion.outcome} onValueChange={(outcome: typeof motion.outcome) => update(index, { outcome })}>
                <SelectTrigger aria-label={`Outcome for motion ${index + 1}`}><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="carried">Carried</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          {motion.movedBy && !nameById.has(motion.movedBy) ? <p className="text-xs text-amber-700">The mover is no longer a workspace member.</p> : null}
        </div>
      ))}
    </section>
  );
}

function ActionsEditor({ document, members, onChange }: { document: MeetingDocument; members: WorkspaceMemberOption[]; onChange: ChangeHandler }) {
  function update(index: number, patch: Partial<MeetingDocument["actions"][number]>) {
    onChange({ ...document, actions: document.actions.map((action, position) => position === index ? { ...action, ...patch } : action) });
  }
  return (
    <section className="space-y-3 border-t pt-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-950">Action items</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange({
          ...document, actions: [...document.actions, { id: createTemplateRecordId("action"), description: "", ownerId: "", dueDate: "", done: false }],
        })}><Plus className="size-4" /> Add action</Button>
      </div>
      {document.actions.map((action, index) => (
        <div key={action.id} className="space-y-3 rounded-lg border p-3">
          <div className="flex gap-2">
            <div className="flex-1 space-y-2"><Label htmlFor={`action-${action.id}`}>Action {index + 1}</Label><Input id={`action-${action.id}`} maxLength={2000} value={action.description} placeholder="Describe the follow-up" onChange={(event) => update(index, { description: event.target.value })} /></div>
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove action ${index + 1}`} onClick={() => onChange({ ...document, actions: document.actions.filter((_, position) => position !== index) })}><Trash2 className="size-4" /></Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MemberSelect label={`Owner for action ${index + 1}`} members={members} value={action.ownerId} onChange={(value) => update(index, { ownerId: value })} />
            <div className="space-y-2"><Label htmlFor={`due-${action.id}`}>Due date</Label><Input id={`due-${action.id}`} type="date" value={action.dueDate} onChange={(event) => update(index, { dueDate: event.target.value })} /></div>
          </div>
        </div>
      ))}
    </section>
  );
}
