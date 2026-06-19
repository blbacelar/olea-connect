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
  return fields.flatMap((field) => {
    if (!isVisible(field, data)) return [];

    if (field.type === "heading") {
      return [
        {
          id: field.id,
          label: field.text ?? fieldLabel(field),
          value: "",
          type: field.type,
          depth,
        },
      ];
    }

    if (field.type === "paragraph") {
      return [
        {
          id: field.id,
          label: "",
          value: field.text ?? field.description ?? "",
          type: field.type,
          depth,
        },
      ];
    }

    const value = getValue(data, [field.id]);

    if (field.type !== "repeatable") {
      return [
        {
          id: field.id,
          label: fieldLabel(field),
          value: formatValue(field, value),
          type: field.type,
          depth,
        },
      ];
    }

    const rows: Array<Record<string, unknown>> = [];
    if (Array.isArray(value)) {
      for (const row of value) {
        if (Boolean(row) && typeof row === "object" && !Array.isArray(row)) {
          rows.push(row);
        }
      }
    }

    if (rows.length === 0) {
      return [
        {
          id: field.id,
          label: fieldLabel(field),
          value: "No rows added.",
          type: field.type,
          depth,
        },
      ];
    }

    return rows.flatMap((row, index) => [
      {
        id: `${field.id}.${index}`,
        label: `${fieldLabel(field)} ${index + 1}`,
        value: "",
        type: field.type,
        depth,
      },
      ...renderFields(field.subfields ?? [], row, depth + 1),
    ]);
  });
}

function formatValue(field: TemplateField, value: TemplateValue) {
  if (value === undefined || value === null || value === "") return "—";

  if (field.type === "checkbox") {
    return value ? "Yes" : "No";
  }

  if (field.type === "multiselect" && Array.isArray(value)) {
    return value.map(String).join(", ") || "—";
  }

  if (field.type === "rating") {
    const option = normalizeOptions(field.options).find(
      (item) => item.value === String(value),
    );
    return option?.label ?? String(value);
  }

  if (field.type === "select") {
    const option = normalizeOptions(field.options).find(
      (item) => item.value === String(value),
    );
    return option?.label ?? String(value);
  }

  if (field.type === "currency" && typeof value === "number") {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(value);
  }

  if (typeof value === "object") {
    if ("name" in value && typeof value.name === "string") {
      return value.name;
    }
    return JSON.stringify(value);
  }

  return String(value);
}
