const twelveHourTimePattern = /^(\d{1,2})(?::(\d{2}))?\s*([ap]m)$/i;
const twentyFourHourTimePattern = /^(\d{1,2}):(\d{2})$/;

export function parseCalendarTimeToMinutes(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;

  const twentyFourHourMatch = normalized.match(twentyFourHourTimePattern);
  if (twentyFourHourMatch) {
    const hours = Number(twentyFourHourMatch[1]);
    const minutes = Number(twentyFourHourMatch[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  const twelveHourMatch = normalized.match(twelveHourTimePattern);
  if (!twelveHourMatch) return null;

  const hour = Number(twelveHourMatch[1]);
  const minutes = Number(twelveHourMatch[2] ?? "0");
  const meridiem = twelveHourMatch[3].toLowerCase();
  if (hour < 1 || hour > 12 || minutes > 59) return null;

  const normalizedHour = hour === 12 ? 0 : hour;
  const twentyFourHour = meridiem === "pm" ? normalizedHour + 12 : normalizedHour;
  return twentyFourHour * 60 + minutes;
}

export function toCalendarTimeInputValue(value: unknown) {
  const minutes = parseCalendarTimeToMinutes(value);
  if (minutes === null) return "";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}`;
}

export function formatCalendarTime(value: unknown) {
  const minutes = parseCalendarTimeToMinutes(value);
  if (minutes === null) return typeof value === "string" ? value.trim() : "";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const displayHour = hours % 12 || 12;
  const meridiem = hours >= 12 ? "PM" : "AM";
  return `${displayHour}:${String(remainingMinutes).padStart(2, "0")} ${meridiem}`;
}
