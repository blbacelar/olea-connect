export type BoardCalendarEntryType =
  | "Annual calendar note"
  | "Operational task"
  | "AGM milestone"
  | "Meeting or event";

export type MeetingEntry = {
  title: string;
  category?: string;
  color?: string;
  time?: string;
  location?: string;
  virtualLink?: string;
  leadContact?: string;
  confirmed?: "Yes" | "No" | "TBC";
  notes?: string;
};

export type AnnualNoteEntry = {
  title: string;
  category?: string;
  color?: string;
  notes?: string;
};

export type OperationalTaskEntry = {
  title: string;
  status?: string;
  relatedMeeting?: string;
  responsible?: string;
  done?: boolean;
  notes?: string;
};

export type AgmMilestoneEntry = {
  title: string;
  track?: string;
  status?: string;
  daysBeforeAgm?: string;
  responsible?: string;
  notes?: string;
};

