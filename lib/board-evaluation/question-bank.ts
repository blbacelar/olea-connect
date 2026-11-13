import {
  questionBankCategories,
  questionBankMeeting,
  questionBankMeetingOpen,
  questionBankOpen,
} from "./prototype-content";

export const ratedBank = questionBankCategories.flatMap((category) =>
  category.qs.map(([number, text]) => ({
    id: `b${number}`,
    number,
    text,
    category: category.name,
    prompt: category.prompt,
  })),
);

export const openBank = questionBankOpen.map(([number, text]) => ({ id: `o${number}`, number, text }));

export const meetingBank = questionBankMeeting.flatMap((category) =>
  category.qs.map(([id, text, scale]) => ({ id, text, scale, category: category.name })),
);

export const meetingOpenBank = questionBankMeetingOpen.map(([number, text]) => ({ id: `mo${number}`, number, text }));

export type QuestionSelection = { rated: string[]; open: string[]; meeting: string[]; meetingOpen: string[] };

export function parseQuestionSelection(value: unknown): QuestionSelection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const selection = value as Record<string, unknown>;
  if (!Array.isArray(selection.rated)) return null;
  const valid = (items: unknown, allowed: string[]) => {
    if (!Array.isArray(items)) return [];
    const known = new Set(allowed);
    return [...new Set(items.filter((id): id is string => typeof id === "string" && known.has(id)))];
  };
  return {
    rated: valid(selection.rated, ratedBank.map((question) => question.id)),
    open: valid(selection.open, openBank.map((question) => question.id)),
    meeting: valid(selection.meeting, meetingBank.map((question) => question.id)),
    meetingOpen: valid(selection.meetingOpen, meetingOpenBank.map((question) => question.id)).slice(0, 1),
  };
}

export function questionSelectionStatus(count: number, min: number, max: number) {
  return count < min ? "below" : count > max ? "above" : "on_target";
}
