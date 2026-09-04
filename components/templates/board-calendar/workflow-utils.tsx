"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getWorkspaceMemberDisplayName } from "@/lib/template-renderer/board-calendar-chairs";
import type {
  TemplateFormData,
  WorkspaceMemberOption,
} from "@/lib/template-renderer/types";

export type TemplateRecord = Record<string, unknown>;

export const workflowStatusOptions = [
  "Not Started",
  "In Progress",
  "Complete",
  "Blocked",
];
export const agmTrackOptions = [
  "Governance",
  "Finance",
  "Communications",
  "Operations",
  "Other",
];
export const noteFilterOptions = [
  { label: "All notes", value: "all" },
  { label: "Has notes", value: "with_notes" },
  { label: "No notes", value: "without_notes" },
];

export function isRecord(value: unknown): value is TemplateRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function getRows(data: TemplateFormData, key: string): TemplateRecord[] {
  const value = data[key];
  if (!Array.isArray(value)) return [];
  return (value as unknown[]).filter(isRecord);
}

export function getString(record: TemplateRecord, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

export function getNumber(record: TemplateRecord, key: string) {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function getTopLevelString(data: TemplateFormData, key: string) {
  const value = data[key];
  return typeof value === "string" ? value : "";
}

function normalizeFilterValue(value: string) {
  return value.trim().toLowerCase();
}

export function includesFilterValue(value: string, filter: string) {
  const normalizedFilter = normalizeFilterValue(filter);
  return !normalizedFilter || value.toLowerCase().includes(normalizedFilter);
}

export function matchesNoteFilter(notes: string, filter: string) {
  if (filter === "with_notes") return Boolean(notes.trim());
  if (filter === "without_notes") return !notes.trim();
  return true;
}

export function updateRow(
  rows: TemplateRecord[],
  index: number,
  field: string,
  value: unknown,
) {
  return rows.map((row, rowIndex) =>
    rowIndex === index ? { ...row, [field]: value } : row,
  );
}

export function removeRow(rows: TemplateRecord[], index: number) {
  return rows.filter((_, rowIndex) => rowIndex !== index);
}

export function getCommitteeRowKey(committee: TemplateRecord, index: number) {
  const name = getString(committee, "name").trim();
  const chair = getString(committee, "chair").trim();
  const notes = getString(committee, "notes").trim();
  return [name, chair, notes].some(Boolean)
    ? `committee-${name}-${chair}-${notes}`
    : `committee-empty-${index}`;
}

export function getAgmMilestoneRowKey(
  milestone: TemplateRecord,
  index: number,
) {
  const task = getString(milestone, "task").trim();
  const targetDate = getString(milestone, "calculated_date").trim();
  const track = getString(milestone, "track").trim();
  return [task, targetDate, track].some(Boolean)
    ? `agm-${task}-${targetDate}-${track}-${index}`
    : `agm-empty-${index}`;
}

export function WorkspaceMemberSelect({
  ariaLabel,
  emptyOptionLabel = "No member assigned",
  memberId,
  members,
  onMemberChange,
  savedMemberEmail,
  savedMemberName,
}: {
  ariaLabel: string;
  emptyOptionLabel?: string;
  memberId: string;
  members: WorkspaceMemberOption[];
  onMemberChange: (member: WorkspaceMemberOption | null) => void;
  savedMemberEmail?: string;
  savedMemberName: string;
}) {
  const normalizedSavedMemberName = savedMemberName.trim().toLocaleLowerCase();
  const normalizedSavedMemberEmail = savedMemberEmail?.trim().toLocaleLowerCase();
  const matchingSavedMember = members.find((member) => {
    const displayName = getWorkspaceMemberDisplayName(member).toLocaleLowerCase();
    return (
      displayName === normalizedSavedMemberName ||
      member.email.toLocaleLowerCase() === normalizedSavedMemberName ||
      member.email.toLocaleLowerCase() === normalizedSavedMemberEmail
    );
  });
  const selectedMemberId = memberId || matchingSavedMember?.id || "unassigned";
  const hasUnlinkedSavedMember = Boolean(
    savedMemberName && !memberId && !matchingSavedMember,
  );

  return (
    <div className="space-y-1.5">
      <Select
        value={selectedMemberId}
        onValueChange={(value) => {
          onMemberChange(
            value === "unassigned"
              ? null
              : members.find((member) => member.id === value) ?? null,
          );
        }}
      >
        <SelectTrigger aria-label={ariaLabel}>
          <SelectValue placeholder="Choose a workspace member" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">{emptyOptionLabel}</SelectItem>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {getWorkspaceMemberDisplayName(member)} ({member.email})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasUnlinkedSavedMember ? (
        <p className="text-xs leading-5 text-amber-700">
          Previously saved as {savedMemberName}. Select an active workspace
          member before saving changes.
        </p>
      ) : null}
    </div>
  );
}

export function ResponsibleSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedValue = value || "Administrator";
  const normalizedOptions = options.includes(selectedValue)
    ? options
    : [selectedValue, ...options];

  return (
    <Select value={selectedValue} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {normalizedOptions.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status || "Not Started";
  const statusClassName =
    {
      "Not Started": "border-slate-200 bg-slate-50 text-slate-600",
      "In Progress": "border-amber-200 bg-amber-50 text-amber-800",
      Complete: "border-green-200 bg-green-50 text-green-800",
      Blocked: "border-red-200 bg-red-50 text-red-800",
    }[normalizedStatus] ?? "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <Badge variant="outline" className={statusClassName}>
      {normalizedStatus}
    </Badge>
  );
}

export function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
