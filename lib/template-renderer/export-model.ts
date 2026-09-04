import {
  fieldLabel,
  getValue,
  isVisible,
  normalizeOptions,
} from "./schema";
import type {
  TemplateField,
  TemplateFieldSchema,
  TemplateFormData,
  TemplateValue,
} from "./types";

export interface ExportField {
  id: string;
  label: string;
  value: string;
  type: TemplateField["type"];
  depth: number;
}

export interface ExportSection {
  id: string;
  title: string;
  description?: string;
  fields: ExportField[];
}

export interface TemplateExportModel {
  headerFields: ExportField[];
  sections: ExportSection[];
}

export function buildTemplateExportModel({
  schema,
  formData,
}: {
  schema: TemplateFieldSchema;
  formData: TemplateFormData;
}): TemplateExportModel {
  return {
    headerFields: renderFields(schema.header_fields ?? [], formData, 0),
    sections: schema.sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      fields: renderFields(section.questions, formData, 0),
    })),
  };
}

function renderFields(
  fields: TemplateField[],
  data: TemplateFormData | Record<string, unknown>,
  depth: number,
): ExportField[] {
  return fields.flatMap((field) => renderField(field, data, depth));
}

function renderField(
  field: TemplateField,
  data: TemplateFormData | Record<string, unknown>,
  depth: number,
): ExportField[] {
  if (!isVisible(field, data)) return [];

  if (field.type === "heading") {
    return [buildExportField(field, field.text ?? fieldLabel(field), "", depth)];
  }

  if (field.type === "paragraph") {
    return [buildExportField(field, "", field.text ?? field.description ?? "", depth)];
  }

  const value = getValue(data, [field.id]);
  if (field.type === "repeatable") {
    return renderRepeatableField(field, value, depth);
  }

  return [buildExportField(field, fieldLabel(field), formatValue(field, value), depth)];
}

function buildExportField(
  field: TemplateField,
  label: string,
  value: string,
  depth: number,
): ExportField {
  return {
    id: field.id,
    label,
    value,
    type: field.type,
    depth,
  };
}

function renderRepeatableField(
  field: TemplateField,
  value: TemplateValue,
  depth: number,
): ExportField[] {
  const rows = getRepeatableRows(value);

  if (rows.length === 0) {
    return [buildExportField(field, fieldLabel(field), "No rows added.", depth)];
  }

  return rows.flatMap((row, index) => [
    buildExportField(field, `${fieldLabel(field)} ${index + 1}`, "", depth),
    ...renderFields(field.subfields ?? [], row, depth + 1),
  ]);
}

function getRepeatableRows(value: TemplateValue): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];

  const rows: Array<Record<string, unknown>> = [];

  for (const row of value) {
    if (Boolean(row) && typeof row === "object" && !Array.isArray(row)) {
      rows.push(row);
    }
  }

  return rows;
}

function formatValue(field: TemplateField, value: TemplateValue) {
  if (isBlankValue(value)) return "—";

  switch (field.type) {
    case "checkbox":
      return value ? "Yes" : "No";
    case "multiselect":
      return Array.isArray(value) ? value.map(String).join(", ") || "—" : String(value);
    case "rating":
    case "select":
      return formatOptionValue(field, value);
    case "currency":
      return formatCurrencyValue(value);
    default:
      return formatScalarValue(value);
  }
}

function isBlankValue(value: TemplateValue) {
  return value === undefined || value === null || value === "";
}

function formatOptionValue(field: TemplateField, value: TemplateValue) {
  const option = normalizeOptions(field.options).find(
    (item) => item.value === String(value),
  );
  return option?.label ?? String(value);
}

function formatCurrencyValue(value: TemplateValue) {
  if (typeof value !== "number") return String(value);

  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);
}

function formatScalarValue(value: TemplateValue) {
  if (value !== null && typeof value === "object") {
    return formatObjectValue(value);
  }

  return String(value);
}

function formatObjectValue(value: object) {
  if ("name" in value && typeof value.name === "string") {
    return value.name;
  }

  return JSON.stringify(value);
}
