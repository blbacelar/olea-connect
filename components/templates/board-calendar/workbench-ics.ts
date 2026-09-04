import type { CalendarViewEvent } from "@/lib/template-renderer/calendar-view";

export function parseCalendarDateKey(dateKey: string) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatIcsDate(dateKey: string, time?: string, minutesToAdd = 0) {
  const date = parseCalendarDateKey(dateKey) ?? new Date();
  const timeMatch = time?.match(/^(\d{1,2}):(\d{2})$/);
  const hours = timeMatch ? Number(timeMatch[1]) : 9;
  const minutes = timeMatch ? Number(timeMatch[2]) : 0;
  const eventDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes + minutesToAdd,
  );

  return [
    eventDate.getFullYear(),
    String(eventDate.getMonth() + 1).padStart(2, "0"),
    String(eventDate.getDate()).padStart(2, "0"),
    "T",
    String(eventDate.getHours()).padStart(2, "0"),
    String(eventDate.getMinutes()).padStart(2, "0"),
    "00",
  ].join("");
}

export function downloadBoardCalendarIcs({
  events,
  organizationName,
}: {
  events: CalendarViewEvent[];
  organizationName: string;
}) {
  const datedEvents = events.filter(
    (event): event is CalendarViewEvent & { dateKey: string } =>
      Boolean(event.dateKey),
  );
  if (!datedEvents.length) return;

  const calendarLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Olea Connects™//Board Calendar//EN",
    `X-WR-CALNAME:${escapeIcsText(organizationName)} Board Calendar`,
  ];

  datedEvents.forEach((event) => {
    const startsAt = formatIcsDate(event.dateKey, event.time);
    const endsAt = formatIcsDate(event.dateKey, event.time, 60);
    calendarLines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@olea-connects`,
      `DTSTART:${startsAt}`,
      `DTEND:${endsAt}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `DESCRIPTION:${escapeIcsText(event.notes ?? event.category)}`,
      "END:VEVENT",
    );
  });
  calendarLines.push("END:VCALENDAR");

  const blob = new Blob([calendarLines.join("\r\n")], {
    type: "text/calendar;charset=utf-8",
  });
  const link = document.createElement("a");
  const calendarUrl = URL.createObjectURL(blob);
  link.href = calendarUrl;
  link.download = `${organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "board-calendar"}.ics`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(calendarUrl), 0);
}
