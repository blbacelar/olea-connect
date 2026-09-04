import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  PackageOpen,
  ScrollText,
  Settings,
  Users,
  Workflow,
} from "lucide-react";

import type { BoardCalendarEntryType } from "@/lib/template-renderer/board-calendar-editor";

export type CalendarMode = "month" | "week" | "year";

export type BoardCalendarModuleTab =
  | "dashboard"
  | "calendar"
  | "meetings"
  | "workflows"
  | "packages"
  | "directory"
  | "audit_log"
  | "settings";

export const viewOptions: Array<{ label: string; value: CalendarMode }> = [
  { label: "Month", value: "month" },
  { label: "Week", value: "week" },
  { label: "Annual", value: "year" },
];

export const moduleTabs: Array<{
  icon: typeof CalendarDays;
  label: string;
  value: BoardCalendarModuleTab;
}> = [
  { icon: LayoutDashboard, label: "Dashboard", value: "dashboard" },
  { icon: CalendarDays, label: "Calendar", value: "calendar" },
  { icon: FileText, label: "Meetings", value: "meetings" },
  { icon: Workflow, label: "Workflows", value: "workflows" },
  { icon: PackageOpen, label: "Board Packages", value: "packages" },
  { icon: Users, label: "Directory", value: "directory" },
  { icon: ScrollText, label: "Audit Log", value: "audit_log" },
  { icon: Settings, label: "Settings", value: "settings" },
];

export const entryTypes: Array<{
  label: string;
  value: BoardCalendarEntryType;
}> = [
  { label: "Meeting or event", value: "meeting" },
  { label: "Annual calendar note", value: "annual_highlight" },
  { label: "Operational task", value: "staff_task" },
  { label: "AGM milestone", value: "agm_milestone" },
];

export const confirmedOptions = ["Yes", "TBC", "No"];
export const statusOptions = ["Not Started", "In Progress", "Complete"];

export const meetingCategoryOptions = [
  "Board Meeting",
  "Committee Meeting",
  "AGM / Annual Meeting",
  "Key Deadline",
  "Other / General",
];

export const annualHighlightCategoryOptions = [
  "Key Deadline",
  "Board Meeting",
  "Committee Meeting",
  "AGM / Annual Meeting",
  "Other / General",
];

export const agmTrackOptions = [
  "Governance",
  "Event",
  "Finance",
  "Compliance",
  "Other / General",
];

export function isBoardCalendarModuleTab(
  value: string,
): value is BoardCalendarModuleTab {
  return moduleTabs.some((tab) => tab.value === value);
}
