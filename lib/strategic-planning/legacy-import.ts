import { parseWorkbookActions, type WorkbookAction } from "./action-tracker";
import { parseWorkbookValues, workbookDefaultValues, workbookModules, type WorkbookColumn,
  type WorkbookValues } from "./workbook";

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sourceValue = (data: Record<string, unknown>, key: string) => {
  const value = data[key];
  return typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : "";
};
const moneyCents = (value: string) => {
  const clean = value.replace(/[$,\s]/g, "");
  const number = clean ? Number(clean) : 0;
  if (!Number.isFinite(number) || number < 0) throw new Error("The source workbook contains an invalid CAD amount.");
  return Math.round(number * 100);
};

export function convertLegacyStrategicWorkbook(input: unknown): {
  values: WorkbookValues; actions: WorkbookAction[]; skippedKeys: string[];
} {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Choose a valid source workbook JSON file.");
  const data = input as Record<string, unknown>;
  const values = workbookDefaultValues();
  const consumed = new Set<string>();
  const copy = (source: string, target = source) => {
    if (!(source in data)) return;
    const value = sourceValue(data, source);
    if (value) values[target] = value;
    consumed.add(source);
  };

  for (const module of workbookModules) for (const section of module.template) {
    for (const field of section.fields ?? []) {
      if (field.kind !== "checks") { copy(field.id); continue; }
      const options = field.options === "__years__" ? [] : field.options || [];
      const selected = options.map((item) => typeof item === "string" ? item : item.v)
        .filter((option) => {
          const key = `${field.id}.${option}`;
          if (!(key in data)) return false;
          consumed.add(key);
          return sourceValue(data, key) === "true";
        });
      if (selected.length) values[field.id] = selected.join("|");
    }
    if (section.checklist) section.checklist.items.forEach((_item, index) => {
      copy(`${section.checklist!.id}.${index}.ans`, `${section.checklist!.id}:${index}`);
      copy(`${section.checklist!.id}.${index}.note`, `${section.checklist!.id}:${index}:note`);
    });
    if (section.swot) for (const quadrant of ["s", "w", "o", "t"]) {
      copy(`${section.swot}.${quadrant}`, `${section.swot}:${quadrant}`);
    }
    if (!section.table) continue;
    const table = section.table;
    const extraKey = `${table.id}.__rows`;
    const extra = Math.max(0, Math.min(96, Number(sourceValue(data, extraKey)) || 0));
    if (extraKey in data) consumed.add(extraKey);
    const minimum = table.rows ?? (Array.isArray(table.prefill) ? table.prefill.length : 4);
    if (extra) values[`${table.id}:rows`] = String(minimum + extra);
    const columns: Array<WorkbookColumn & { k?: string }> = [];
    for (const column of table.cols) {
      if (column === "{years}") columns.push(...Array.from({ length: 5 }, (_, index) =>
        ({ h: `Year ${index + 1}`, k: `year-${index + 1}` })));
      else columns.push(column as WorkbookColumn & { k?: string });
    }
    for (let row = 0; row < minimum + extra; row++) columns.forEach((column, index) => {
      const key = `${table.id}.${row}.${column.k || slug(column.h || "")}`;
      if (column.type !== "sum") copy(key, `${table.id}:${row}:${index}`);
    });
  }
  copy("m6.finlead");
  for (let year = 1; year <= 5; year++) for (const field of ["date", "inbudget", "notes"]) {
    copy(`m6.fin.y${year}.${field}`);
  }
  for (const [key] of Object.entries(data)) {
    if (/^m2\.sv\.(resp\.(?:board|staff|volunteers|clients|partners|funders|community|everyone|paper)|res\.[a-z_0-9]{1,40}\.(?:n|result|themes))$/.test(key)) copy(key);
  }
  const actions: WorkbookAction[] = [];
  const actionRows = new Set<number>();
  for (const key of Object.keys(data)) {
    const match = /^m6\.actions\.(\d+)\./.exec(key);
    if (match) actionRows.add(Number(match[1]));
  }
  if ("m6.actions.__rows" in data) consumed.add("m6.actions.__rows");
  for (const row of [...actionRows].sort((a, b) => a - b)) {
    const prefix = `m6.actions.${row}.`;
    const action = sourceValue(data, `${prefix}action`).trim();
    if (!action) continue;
    const dueQuarter = sourceValue(data, `${prefix}due`);
    const year = Number(dueQuarter[1] || sourceValue(data, `${prefix}year`) || 1);
    const keyPriority = sourceValue(data, `${prefix}key-priority`);
    const priorityIndex = Array.from({ length: Number(values["m5.pri:rows"] || 10) }, (_, index) => index)
      .find((index) => values[`m5.pri:${index}:1`]?.toLowerCase() === keyPriority.toLowerCase());
    const updates = Array.from({ length: 20 }, (_, index) => `y${Math.floor(index / 4) + 1}q${index % 4 + 1}`)
      .flatMap((quarter) => {
        const base = `trk.a.${row}.${quarter}.`;
        const status = sourceValue(data, `${base}s`);
        const note = sourceValue(data, `${base}note`);
        const spent = sourceValue(data, `${base}spent`);
        ["s", "note", "spent", "u"].forEach((suffix) => { if (`${base}${suffix}` in data) consumed.add(`${base}${suffix}`); });
        return status || note || spent ? [{ quarter, status: status as WorkbookAction["updates"][number]["status"],
          note, spentCents: moneyCents(spent) }] : [];
      });
    const sourceFields = ["action", "due", "year", "key-priority", "owner", "cost", "funding-source",
      "funding-status", "budget-line", "carried"];
    sourceFields.forEach((field) => { if (`${prefix}${field}` in data) consumed.add(`${prefix}${field}`); });
    actions.push({ id: crypto.randomUUID(), year, goal: priorityIndex === undefined ? "" :
      values[`m5.pri:${priorityIndex}:0`] || "", keyPriority, action,
    owner: sourceValue(data, `${prefix}owner`), dueQuarter,
    budgetCents: moneyCents(sourceValue(data, `${prefix}cost`)),
    fundingSource: sourceValue(data, `${prefix}funding-source`),
    fundingStatus: sourceValue(data, `${prefix}funding-status`) as WorkbookAction["fundingStatus"],
    budgetLine: sourceValue(data, `${prefix}budget-line`),
    carriedFromYear: sourceValue(data, `${prefix}carried`) ? Number(sourceValue(data, `${prefix}carried`)) : null,
    originId: null, updates });
  }
  const skippedKeys = Object.keys(data).filter((key) => !consumed.has(key) && sourceValue(data, key));
  for (const key of skippedKeys) values[`legacy:${key}`] = sourceValue(data, key);
  return { values: parseWorkbookValues(values), actions: parseWorkbookActions(actions), skippedKeys };
}
