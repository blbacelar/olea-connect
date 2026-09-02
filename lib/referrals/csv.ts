export function csvCell(value: string | number | null | undefined) {
  const raw = String(value ?? "");
  const normalized = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${normalized.replace(/"/g, '""')}"`;
}
