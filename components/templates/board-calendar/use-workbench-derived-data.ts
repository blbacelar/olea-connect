import { useMemo } from "react";

import { syncBoardCalendarGeneratedTasks } from "@/lib/template-renderer/board-calendar-editor";
import {
  buildCalendarEvents,
  buildCategoryColors,
  getTemplateMonthIndex,
  getTemplateYear,
  groupEventsByDate,
  isCalendarEventUpcoming,
  toDateKey,
} from "@/lib/template-renderer/calendar-view";
import type { TemplateFormData } from "@/lib/template-renderer/types";

export function useWorkbenchDerivedData({
  data,
  todayDate,
}: {
  data: TemplateFormData;
  todayDate: Date;
}) {
  const syncedData = useMemo(() => syncBoardCalendarGeneratedTasks(data), [data]);
  const events = useMemo(() => buildCalendarEvents(syncedData), [syncedData]);
  const categoryColors = useMemo(() => buildCategoryColors(syncedData), [syncedData]);
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const configuredYear = getTemplateYear(data);
  const configuredMonth = getTemplateMonthIndex(data);
  const todayKey = toDateKey(todayDate);
  const meetingEvents = events.filter((event) => event.source === "meeting");
  const upcomingMeetingEvents = meetingEvents.filter((event) =>
    isCalendarEventUpcoming(event, todayDate),
  );
  const nextEvent =
    events.find((event) => isCalendarEventUpcoming(event, todayDate)) ??
    events.find((event) => event.dateKey);
  const boardMeetings = upcomingMeetingEvents.filter(
    (event) => event.category === "Board Meeting",
  ).length;
  const upcomingEvents = events
    .filter((event) => isCalendarEventUpcoming(event, todayDate))
    .slice(0, 5);
  const hasDatedEvents = events.some((event) => Boolean(event.dateKey));
  const categories = Array.from(
    events.reduce<Map<string, string>>((items, event) => {
      if (!items.has(event.category)) items.set(event.category, event.color);
      return items;
    }, new Map()),
  ).slice(0, 8);

  return {
    boardMeetings,
    categories,
    categoryColors,
    configuredMonth,
    configuredYear,
    events,
    eventsByDate,
    hasDatedEvents,
    meetingEvents,
    nextEvent,
    todayKey,
    upcomingEvents,
    upcomingMeetingEvents,
  };
}
