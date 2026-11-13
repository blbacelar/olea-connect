"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type {
  WorkbookChoice, WorkbookColumn, WorkbookField, WorkbookTemplateSection, WorkbookValues,
} from "@/lib/strategic-planning/workbook";
import { workbookCalendarRows } from "@/lib/strategic-planning/workbook";

type EditorProps = {
  values: WorkbookValues;
  setValue: (key: string, value: string) => void;
  horizon: number;
};

function choiceOptions(options: WorkbookChoice[] | "__years__" = [], horizon = 3) {
  if (options === "__years__") return Array.from({ length: horizon }, (_, index) => ({
    value: `year-${index + 1}`, label: `Year ${index + 1}${horizon === 5 && index === 2 ? " (mid-point)" : ""}`,
  }));
  return options.filter((option) => typeof option === "string" ? option !== "" : option.v !== "")
    .map((option) => typeof option === "string"
    ? { value: option, label: option } : { value: option.v, label: option.l });
}

function Field({ field, values, setValue, horizon }: EditorProps & { field: WorkbookField }) {
  const value = values[field.id] ?? "";
  const isCadAmount = field.id === "org.budget" || field.id === "m1.budget";
  return <div className={`space-y-2 ${field.half ? "" : "md:col-span-2"}`}>
    <label className="block text-sm font-semibold" htmlFor={`workbook-${field.id}`}>{field.label}</label>
    {field.kind === "textarea" ? <Textarea id={`workbook-${field.id}`} value={value}
      maxLength={field.id === "m2.heard" ? 30000 : 3000}
      placeholder={field.hint ?? (field.id === "m2.heard" ? "Summarize stakeholder themes here" :
        "Write your answer here (up to 3,000 characters)")}
      onChange={(event) => setValue(field.id, event.target.value)} />
      : field.kind === "choice" ? <FormSelect name={field.id} value={value}
        id={`workbook-${field.id}`} ariaLabel={field.label}
        onValueChange={(next) => setValue(field.id, next)} placeholder="Choose an option"
        options={choiceOptions(field.options, horizon)} />
      : field.kind === "checks" ? <div className="grid gap-2 sm:grid-cols-2">
        {choiceOptions(field.options, horizon).map((option) => {
          const checked = value.split("|").includes(option.value);
          return <label key={option.value} className="flex items-start gap-2 text-sm">
            <Checkbox checked={checked} onChange={(event) => {
              const next = new Set(value ? value.split("|") : []);
              if (event.target.checked) next.add(option.value); else next.delete(option.value);
              setValue(field.id, [...next].join("|"));
            }} />
            <span>{option.label}</span>
          </label>;
        })}
      </div>
      : <Input id={`workbook-${field.id}`} type={field.kind === "date" ? "date" : "text"}
        value={value} maxLength={field.kind === "date" ? undefined : 500}
        inputMode={isCadAmount ? "decimal" : undefined}
        placeholder={isCadAmount ? "CAD amount, e.g. 500,000 or 500K" :
          field.hint ?? (field.kind === "date" ? undefined : "Enter a short answer")}
        onChange={(event) => setValue(field.id, event.target.value)} />}
    {field.hint ? <p className="text-xs text-slate-500">{field.hint}</p> : null}
    {isCadAmount ? <p className="text-xs text-slate-500">Enter an approximate Canadian dollar amount, such as 500,000 or 500K.</p> : null}
  </div>;
}

function Checklist({ section, values, setValue }: EditorProps & { section: WorkbookTemplateSection }) {
  const checklist = section.checklist!;
  return <div className="space-y-3">
    {checklist.items.map((item, index) => <div key={item} className="space-y-2 border-b pb-3 text-sm">
      <span className="block font-medium">{item}</span>
      <div className="flex flex-wrap gap-2">
        {[{ value: "yes", label: "Yes" }, { value: "no", label: "Not yet" }].map((option) =>
          <Button key={option.value} type="button" size="sm"
            variant={values[`${checklist.id}:${index}`] === option.value ? "default" : "outline"}
            aria-pressed={values[`${checklist.id}:${index}`] === option.value}
            onClick={() => setValue(`${checklist.id}:${index}`, option.value)}>{option.label}</Button>)}
      </div>
      <Input aria-label={`Notes for ${item}`} value={values[`${checklist.id}:${index}:note`] || ""}
        maxLength={500} placeholder="Notes (optional)"
        onChange={(event) => setValue(`${checklist.id}:${index}:note`, event.target.value)} />
    </div>)}
  </div>;
}

function tableColumns(cols: Array<WorkbookColumn | string>, horizon: number): WorkbookColumn[] {
  return cols.flatMap((column) => column === "{years}"
    ? Array.from({ length: horizon }, (_, index) => ({ h: `Year ${index + 1} target` }))
    : [column as WorkbookColumn]);
}

function TableCellEditor({
  spec, cellKey, value, setValue, goals,
}: {
  spec: WorkbookColumn;
  cellKey: string;
  value: string;
  setValue: EditorProps["setValue"];
  goals: string[];
}) {
  if (spec.type === "check") return <Checkbox aria-label={spec.h ?? "Completed"} checked={value === "true"}
    onChange={(event) => setValue(cellKey, event.target.checked ? "true" : "false")} />;
  if (spec.type === "select" || spec.type === "goal") return <FormSelect name={cellKey} value={value}
    onValueChange={(next) => setValue(cellKey, next)} placeholder="Choose"
    options={spec.type === "goal" ? goals.map((goal) => ({ value: goal, label: goal })) : choiceOptions(spec.options)} />;
  return <Input aria-label={spec.h ?? "Workbook value"} value={value}
    type={spec.type === "date" ? "date" : spec.type === "number" ? "number" : "text"}
    min={spec.type === "number" ? 1 : undefined} max={spec.type === "number" ? 5 : undefined}
    step={spec.type === "number" ? 1 : undefined}
    maxLength={spec.type === "date" || spec.type === "number" ? undefined : 1000}
    onChange={(event) => setValue(cellKey, event.target.value)} />;
}

function WorkbookTable({ section, values, setValue, horizon }: EditorProps & {
  section: WorkbookTemplateSection;
}) {
  const spec = section.table!;
  const columns = tableColumns(spec.cols, horizon);
  const calendar = spec.prefill === "__calendar__" ? workbookCalendarRows(horizon) : null;
  const minimum = spec.rows ?? (calendar?.length ?? (Array.isArray(spec.prefill) ? spec.prefill.length : 4));
  const rows = Math.max(minimum, Number(values[`${spec.id}:rows`] || minimum));
  const goals = Array.from({ length: Number(values["m4.goals:rows"] || 4) }, (_, index) =>
    values[`m4.goals:${index}:0`]).filter(Boolean);
  return <div className="space-y-3">
    <div className="overflow-x-auto rounded-lg border">
      <Table className="min-w-[740px]">
        <TableHeader><TableRow>{columns.map((column, index) =>
          <TableHead key={index}>{column.h || `Year ${index - 3} target`}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{Array.from({ length: Math.min(rows, 100) }, (_, row) => <TableRow key={row}>
          {columns.map((column, col) => {
            const key = `${spec.id}:${row}:${col}`;
            const prefill = calendar?.[row]?.[col] ??
              (Array.isArray(spec.prefill) && col === 0 ? spec.prefill[row] : undefined);
            const value = values[key] ?? prefill ?? "";
            const total = columns.slice(1, 6).reduce((sum, _item, index) =>
              sum + Number(values[`${spec.id}:${row}:${index + 1}`] || 0), 0);
            return <TableCell key={key} className="min-w-32 align-top">
              {column.type === "sum" ? <span className="font-semibold">{total}</span> :
                <TableCellEditor spec={column} cellKey={key} value={value} setValue={setValue} goals={goals} />}
            </TableCell>;
          })}
        </TableRow>)}</TableBody>
      </Table>
    </div>
    {spec.add !== false ? <Button type="button" variant="outline" size="sm" disabled={rows >= 100}
      onClick={() => setValue(`${spec.id}:rows`, String(rows + 1))}>Add row</Button> : null}
  </div>;
}

function Swot({ section, values, setValue }: EditorProps & { section: WorkbookTemplateSection }) {
  const quadrants = [
    { id: "s", label: "Strengths" }, { id: "w", label: "Weaknesses" },
    { id: "o", label: "Opportunities" }, { id: "t", label: "Threats" },
  ];
  return <div className="grid gap-4 md:grid-cols-2">
    {quadrants.map((quadrant) => <div key={quadrant.id} className="space-y-3 rounded-lg border p-4">
      <h4 className="font-semibold">{quadrant.label}</h4>
      <Textarea aria-label={quadrant.label} value={values[`${section.swot}:${quadrant.id}`] ?? ""}
        maxLength={3000} rows={4} placeholder={`Describe ${quadrant.label.toLowerCase()}`}
        onChange={(event) => setValue(`${section.swot}:${quadrant.id}`, event.target.value)} />
    </div>)}
  </div>;
}

export function WorkbookSectionEditor({ section, values, setValue, horizon }: EditorProps & {
  section: WorkbookTemplateSection;
}) {
  return <section className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
    <div><h3 className="text-lg font-semibold">{section.title}</h3>
      {section.hint ? <p className="mt-1 text-sm text-slate-500">{section.hint}</p> : null}</div>
    {section.fields ? <div className="grid gap-4 md:grid-cols-2">{section.fields.map((field) =>
      <Field key={field.id} field={field} values={values} setValue={setValue} horizon={horizon} />)}</div> : null}
    {section.checklist ? <Checklist section={section} values={values} setValue={setValue} horizon={horizon} /> : null}
    {section.table ? <WorkbookTable section={section} values={values} setValue={setValue} horizon={horizon} /> : null}
    {section.swot ? <Swot section={section} values={values} setValue={setValue} horizon={horizon} /> : null}
  </section>;
}
